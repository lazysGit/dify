"""Unit tests for ModelPermissionService (whitelist CRUD + filtering).

Mock strategy follows tests/unit_tests/services/test_department_service.py:
MagicMock factories, patched ``db.session`` query chains, and a patched
``ModelProviderService`` supplying the "system models" catalogue. Real Pydantic
entities are built via ``model_construct`` so whitelist filtering is exercised
against the actual ``ProviderWithModelsResponse`` shapes the frontend renders.
"""

from unittest.mock import MagicMock, patch

import pytest

from core.entities.model_entities import ModelStatus, ProviderModelWithStatusEntity
from dify_graph.model_runtime.entities.common_entities import I18nObject
from dify_graph.model_runtime.entities.model_entities import ModelType
from models.model_permission import AccountModelWhitelist
from services.entities.model_provider_entities import CustomConfigurationStatus, ProviderWithModelsResponse
from services.errors.model_permission import InvalidModelError, ModelPermissionDeniedError
from services.model_permission_service import ModelPermissionService


def _make_whitelist_row(provider_name="openai", model_name="gpt-4", model_type="llm"):
    row = MagicMock(spec=AccountModelWhitelist)
    row.tenant_id = "t1"
    row.account_id = "u2"
    row.provider_name = provider_name
    row.model_name = model_name
    row.model_type = model_type
    row.created_by = "u1"
    return row


def _make_user(user_id="u1", is_admin_or_owner=False):
    user = MagicMock()
    user.id = user_id
    user.is_admin_or_owner = is_admin_or_owner
    return user


def _make_model_entity(model="gpt-4", model_type="llm"):
    """Mimic the real shape returned by get_models_by_model_type.

    The catalogue items are ``ProviderModelWithStatusEntity`` instances which
    carry NO ``provider`` attribute (it lives on the wrapping
    ``ProviderWithModelsResponse``). Building them with the wrong class once
    let a ``model.provider.provider`` filter bug pass silently.
    """
    return ProviderModelWithStatusEntity.model_construct(
        model=model,
        label=I18nObject(en_US=model),
        model_type=ModelType(model_type),
        status=ModelStatus.ACTIVE,
    )


def _make_provider_response(tenant_id="t1", provider="openai", models=None):
    return ProviderWithModelsResponse.model_construct(
        tenant_id=tenant_id,
        provider=provider,
        label=I18nObject(en_US=provider),
        status=CustomConfigurationStatus.ACTIVE,
        models=models if models is not None else [],
    )


def _mock_query_chain(mock_session, first_return=None, all_return=None):
    mock_query = MagicMock()
    mock_filter = MagicMock()
    mock_filter.first.return_value = first_return
    mock_filter.all.return_value = all_return if all_return is not None else []
    mock_query.filter.return_value = mock_filter
    mock_session.query.return_value = mock_query
    return mock_filter


# (provider, entity) pairs: provider lives outside the entity now, mirroring
# ProviderWithModelsResponse.provider wrapping ProviderModelWithStatusEntity.
SYSTEM_MODELS = [
    ("openai", _make_model_entity(model="gpt-4", model_type="llm")),
    ("openai", _make_model_entity(model="gpt-4o", model_type="llm")),
    ("openai", _make_model_entity(model="text-embedding-3-small", model_type="text-embedding")),
]


def _patch_system_models(mock_svc_cls):
    svc_instance = mock_svc_cls.return_value

    def get_models_by_model_type(tenant_id, model_type):
        by_provider: dict[str, list] = {}
        for provider, model in SYSTEM_MODELS:
            if str(model.model_type) == model_type:
                by_provider.setdefault(provider, []).append(model)
        return [
            _make_provider_response(provider=p, models=ms)
            for p, ms in sorted(by_provider.items())
        ]

    svc_instance.get_models_by_model_type.side_effect = get_models_by_model_type
    return svc_instance


class TestGetWhitelist:
    @patch("services.model_permission_service.db")
    def test_get_whitelist_empty_returns_empty_list(self, mock_db):
        _mock_query_chain(mock_db.session, first_return=None, all_return=[])
        assert ModelPermissionService.get_whitelist("u2", "t1") == []

    @patch("services.model_permission_service.db")
    def test_get_whitelist_returns_entries(self, mock_db):
        rows = [
            _make_whitelist_row(provider_name="openai", model_name="gpt-4", model_type="llm"),
            _make_whitelist_row(
                provider_name="openai", model_name="text-embedding-3-small", model_type="text-embedding"
            ),
        ]
        _mock_query_chain(mock_db.session, all_return=rows)
        result = ModelPermissionService.get_whitelist("u2", "t1")
        assert result == [
            {"provider_name": "openai", "model_name": "gpt-4", "model_type": "llm"},
            {"provider_name": "openai", "model_name": "text-embedding-3-small", "model_type": "text-embedding"},
        ]


class TestSetWhitelist:
    @patch("services.model_permission_service.DepartmentAuditLog")
    @patch("services.model_permission_service.db")
    def test_set_whitelist_empty_deletes_all(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session
        _mock_query_chain(mock_session)

        result = ModelPermissionService.set_whitelist("t1", "u2", [], created_by="u1", operator_ip="127.0.0.1")

        assert result == {"is_restricted": False, "whitelist_count": 0}
        assert mock_session.query.return_value.filter.return_value.delete.called
        mock_session.add.assert_not_called()
        mock_audit.log.assert_called_once_with(
            "t1", "u1", "127.0.0.1", "remove_model_whitelist", {"account_id": "u2", "count": 0}
        )

    @patch("services.model_permission_service.DepartmentAuditLog")
    @patch("services.model_permission_service.ModelProviderService")
    @patch("services.model_permission_service.db")
    def test_set_whitelist_non_empty_replaces(self, mock_db, mock_svc_cls, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session
        _mock_query_chain(mock_session)
        _patch_system_models(mock_svc_cls)

        models = [
            {"provider_name": "openai", "model_name": "gpt-4", "model_type": "llm"},
            {"provider_name": "openai", "model_name": "gpt-4o", "model_type": "llm"},
        ]
        result = ModelPermissionService.set_whitelist("t1", "u2", models, created_by="u1")

        assert result == {"is_restricted": True, "whitelist_count": 2}
        assert mock_session.query.return_value.filter.return_value.delete.called
        assert mock_session.add.call_count == 2
        # 插入行必须带当前租户，否则跨租户串扰会在写入侧复活
        assert mock_session.add.call_args.args[0].tenant_id == "t1"
        mock_audit.log.assert_called_once_with(
            "t1", "u1", None, "set_model_whitelist", {"account_id": "u2", "count": 2}
        )

    @patch("services.model_permission_service.ModelProviderService")
    @patch("services.model_permission_service.db")
    def test_set_whitelist_invalid_model_raises_error(self, mock_db, mock_svc_cls):
        mock_session = MagicMock()
        mock_db.session = mock_session
        _mock_query_chain(mock_session)
        _patch_system_models(mock_svc_cls)

        models = [{"provider_name": "openai", "model_name": "claude-3", "model_type": "llm"}]
        with pytest.raises(InvalidModelError, match="claude-3"):
            ModelPermissionService.set_whitelist("t1", "u2", models, created_by="u1")

        assert not mock_session.query.return_value.filter.return_value.delete.called
        mock_session.add.assert_not_called()

    @patch("services.model_permission_service.DepartmentAuditLog")
    @patch("services.model_permission_service.ModelProviderService")
    @patch("services.model_permission_service.db")
    def test_audit_log_written_on_set_and_remove(self, mock_db, mock_svc_cls, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session
        _mock_query_chain(mock_session)
        _patch_system_models(mock_svc_cls)

        ModelPermissionService.set_whitelist(
            "t1",
            "u2",
            [{"provider_name": "openai", "model_name": "gpt-4", "model_type": "llm"}],
            created_by="u1",
            operator_ip="10.0.0.1",
        )
        set_call = mock_audit.log.call_args
        assert set_call.args[:4] == ("t1", "u1", "10.0.0.1", "set_model_whitelist")

        ModelPermissionService.set_whitelist("t1", "u2", [], created_by="u1", operator_ip="10.0.0.1")
        remove_call = mock_audit.log.call_args
        assert remove_call.args[:4] == ("t1", "u1", "10.0.0.1", "remove_model_whitelist")

    @patch("services.model_permission_service.DepartmentAuditLog")
    @patch("services.model_permission_service.ModelProviderService")
    @patch("services.model_permission_service.db")
    def test_set_whitelist_deduplicates_repeated_entries(self, mock_db, mock_svc_cls, mock_audit):
        """Repeated triples would violate unique_account_model; they must be merged."""
        mock_session = MagicMock()
        mock_db.session = mock_session
        _mock_query_chain(mock_session)
        _patch_system_models(mock_svc_cls)

        result = ModelPermissionService.set_whitelist(
            "t1",
            "u2",
            [
                {"provider_name": "openai", "model_name": "gpt-4", "model_type": "llm"},
                {"provider_name": "openai", "model_name": "gpt-4", "model_type": "llm"},
            ],
            created_by="u1",
            operator_ip="127.0.0.1",
        )

        assert mock_session.add.call_count == 1
        assert result == {"is_restricted": True, "whitelist_count": 1}


class TestGetFilteredModels:
    @patch("services.model_permission_service.ModelProviderService")
    @patch("services.model_permission_service.db")
    def test_get_filtered_models_admin_returns_all(self, mock_db, mock_svc_cls):
        mock_session = MagicMock()
        mock_db.session = mock_session
        _mock_query_chain(mock_session)
        svc_instance = _patch_system_models(mock_svc_cls)

        user = _make_user(user_id="u1", is_admin_or_owner=True)
        result = ModelPermissionService.get_filtered_models("u1", "t1", "llm", user)

        assert len(result) == 1
        assert len(result[0].models) == 2

    @patch("services.model_permission_service.ModelProviderService")
    @patch("services.model_permission_service.db")
    def test_get_filtered_models_no_whitelist_returns_all(self, mock_db, mock_svc_cls):
        mock_session = MagicMock()
        mock_db.session = mock_session
        _mock_query_chain(mock_session, first_return=None)
        _patch_system_models(mock_svc_cls)

        user = _make_user(user_id="u2", is_admin_or_owner=False)
        result = ModelPermissionService.get_filtered_models("u2", "t1", "llm", user)

        assert len(result) == 1
        assert len(result[0].models) == 2

    @patch("services.model_permission_service.ModelProviderService")
    @patch("services.model_permission_service.db")
    def test_get_filtered_models_with_whitelist_filters(self, mock_db, mock_svc_cls):
        mock_session = MagicMock()
        mock_db.session = mock_session
        rows = [_make_whitelist_row(provider_name="openai", model_name="gpt-4o", model_type="llm")]
        _mock_query_chain(mock_session, first_return=MagicMock(), all_return=rows)
        _patch_system_models(mock_svc_cls)

        user = _make_user(user_id="u2", is_admin_or_owner=False)
        result = ModelPermissionService.get_filtered_models("u2", "t1", "llm", user)

        assert len(result) == 1
        assert isinstance(result[0], ProviderWithModelsResponse)
        assert [m.model for m in result[0].models] == ["gpt-4o"]
        # 结构不变：provider 元数据原样保留
        assert result[0].provider == "openai"
        assert result[0].tenant_id == "t1"

        # 白名单跨类型不误伤：text-embedding 类型查询被白名单过滤为空
        result_te = ModelPermissionService.get_filtered_models("u2", "t1", "text-embedding", user)
        assert result_te == []


class TestGetAvailableModelsFlat:
    @patch("services.model_permission_service.ModelProviderService")
    @patch("services.model_permission_service.db")
    def test_get_available_models_flat_admin_returns_all_not_restricted(self, mock_db, mock_svc_cls):
        mock_session = MagicMock()
        mock_db.session = mock_session
        _mock_query_chain(mock_session)
        _patch_system_models(mock_svc_cls)

        user = _make_user(user_id="u1", is_admin_or_owner=True)
        models, is_restricted = ModelPermissionService.get_available_models_flat("u1", "t1", user)

        assert is_restricted is False
        assert len(models) == 3
        assert models[0] == {"provider": "openai", "model": "gpt-4", "model_type": "llm", "label": "gpt-4"}

    @patch("services.model_permission_service.ModelProviderService")
    @patch("services.model_permission_service.db")
    def test_get_available_models_flat_whitelist_filters_and_marks_restricted(self, mock_db, mock_svc_cls):
        mock_session = MagicMock()
        mock_db.session = mock_session
        rows = [_make_whitelist_row(provider_name="openai", model_name="gpt-4", model_type="llm")]
        _mock_query_chain(mock_session, first_return=MagicMock(), all_return=rows)
        _patch_system_models(mock_svc_cls)

        user = _make_user(user_id="u2", is_admin_or_owner=False)
        models, is_restricted = ModelPermissionService.get_available_models_flat("u2", "t1", user)

        assert is_restricted is True
        assert models == [{"provider": "openai", "model": "gpt-4", "model_type": "llm", "label": "gpt-4"}]


class TestMisc:
    @patch("services.model_permission_service.db")
    def test_is_restricted_false_when_no_records(self, mock_db):
        _mock_query_chain(mock_db.session, first_return=None)
        assert ModelPermissionService.is_restricted("u2", "t1") is False

    @patch("services.model_permission_service.db")
    def test_is_restricted_true_when_has_records(self, mock_db):
        _mock_query_chain(mock_db.session, first_return=MagicMock())
        assert ModelPermissionService.is_restricted("u2", "t1") is True

    @patch("services.model_permission_service.db")
    def test_get_whitelist_query_is_tenant_scoped(self, mock_db):
        """Regression: whitelist reads must filter by tenant_id, not account alone.

        Accounts can join multiple tenants; an unscoped lookup would leak
        tenant A's restrictions into tenant B for the same account.
        """
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.all.return_value = []
        mock_query.filter.return_value = mock_filter
        mock_db.session.query.return_value = mock_query

        ModelPermissionService.get_whitelist("u2", "t1")

        filter_args = mock_query.filter.call_args
        assert filter_args is not None
        assert len(filter_args.args) == 2
        # 两个过滤条件都必须命中 AccountModelWhitelist 列（account_id + tenant_id）
        columns = {str(cond.left.key) for cond in filter_args.args}
        assert columns == {"account_id", "tenant_id"}

    @patch("services.model_permission_service.db")
    def test_is_restricted_query_is_tenant_scoped(self, mock_db):
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = None
        mock_query.filter.return_value = mock_filter
        mock_db.session.query.return_value = mock_query

        assert ModelPermissionService.is_restricted("u2", "t1") is False

        filter_args = mock_query.filter.call_args
        assert filter_args is not None
        assert len(filter_args.args) == 2
        columns = {str(cond.left.key) for cond in filter_args.args}
        assert columns == {"account_id", "tenant_id"}

    @patch("services.model_permission_service.DepartmentAuditLog")
    @patch("services.model_permission_service.db")
    def test_set_whitelist_query_is_tenant_scoped(self, mock_db, mock_audit):
        mock_session = MagicMock()
        mock_db.session = mock_session
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_query.filter.return_value = mock_filter
        mock_session.query.return_value = mock_query

        ModelPermissionService.set_whitelist("t1", "u2", [], created_by="u1", operator_ip="127.0.0.1")

        filter_args = mock_query.filter.call_args
        assert filter_args is not None
        assert len(filter_args.args) == 2
        columns = {str(cond.left.key) for cond in filter_args.args}
        assert columns == {"account_id", "tenant_id"}

    @patch("services.model_permission_service.ModelProviderService")
    def test_get_all_system_models_flattens_all_types(self, mock_svc_cls):
        svc_instance = mock_svc_cls.return_value

        def get_models_by_model_type(tenant_id, model_type):
            if model_type == "llm":
                return [
                    _make_provider_response(
                        provider="openai",
                        models=[_make_model_entity(model="gpt-4", model_type="llm")],
                    )
                ]
            if model_type == "text-embedding":
                te_model = _make_model_entity(model="text-embedding-3-small", model_type="text-embedding")
                return [_make_provider_response(provider="openai", models=[te_model])]
            return []

        svc_instance.get_models_by_model_type.side_effect = get_models_by_model_type

        result = ModelPermissionService.get_all_system_models("t1")

        assert len(result) == 2
        assert {"provider": "openai", "model": "gpt-4", "model_type": "llm", "label": "gpt-4"} in result
        assert {
            "provider": "openai",
            "model": "text-embedding-3-small",
            "model_type": "text-embedding",
            "label": "text-embedding-3-small",
        } in result
        # 五个模型类型都被遍历
        assert svc_instance.get_models_by_model_type.call_count == 5


def test_model_permission_denied_error_is_base_service_error():
    from services.errors.base import BaseServiceError

    assert issubclass(ModelPermissionDeniedError, BaseServiceError)
    assert issubclass(InvalidModelError, BaseServiceError)
