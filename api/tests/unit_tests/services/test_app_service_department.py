from unittest.mock import MagicMock, patch

import pytest

from models.model import App
from services.app_service import AppService
from services.errors.department import DepartmentValidationError


def _make_user(user_id="u1", is_admin_or_owner=False, current_tenant_id="t1"):
    user = MagicMock()
    user.id = user_id
    user.is_admin_or_owner = is_admin_or_owner
    user.current_tenant_id = current_tenant_id
    return user


def _make_app(app_id="app1", tenant_id="t1", department_id=None, mode="chat", name="Test App"):
    app = MagicMock(spec=App)
    app.id = app_id
    app.tenant_id = tenant_id
    app.department_id = department_id
    app.mode = mode
    app.name = name
    app.is_universal = False
    app.created_by = "u1"
    return app


class TestGetPaginateAppsDepartmentFiltering:
    @patch("services.app_service.DepartmentService")
    @patch("services.app_service.db")
    def test_coalesce_filter_compiled_query(self, mock_db, mock_dept_service):
        from sqlalchemy import func

        mock_dept_service.get_accessible_department_ids.return_value = ["d1", "d2"]
        default_dept = MagicMock()
        default_dept.id = "default_d"
        mock_dept_service.get_default_department.return_value = default_dept

        def real_filter(model, tenant_id, accessible):
            return func.coalesce(model.department_id, "default_d").in_(accessible)

        mock_dept_service.resource_department_filter.side_effect = real_filter

        mock_pagination = MagicMock()
        mock_db.paginate.return_value = mock_pagination

        user = _make_user(is_admin_or_owner=False)
        service = AppService()
        args = {"page": 1, "limit": 10, "mode": "all"}

        service.get_paginate_apps(user, "t1", args)

        mock_dept_service.get_accessible_department_ids.assert_called_once_with(user, "t1")
        mock_dept_service.resource_department_filter.assert_called_once()
        call_args = mock_dept_service.resource_department_filter.call_args
        assert call_args[0][0] is App
        assert call_args[0][1] == "t1"
        assert call_args[0][2] == ["d1", "d2"]

    @patch("services.app_service.DepartmentService")
    @patch("services.app_service.db")
    def test_coalesce_sql_contains_coalesce(self, mock_db, mock_dept_service):
        from sqlalchemy import func

        mock_dept_service.get_accessible_department_ids.return_value = ["d1"]
        default_dept = MagicMock()
        default_dept.id = "default_d"
        mock_dept_service.get_default_department.return_value = default_dept

        def capture_filter(model, tenant_id, accessible):
            return func.coalesce(model.department_id, "default_d").in_(accessible)

        mock_dept_service.resource_department_filter.side_effect = capture_filter

        mock_pagination = MagicMock()
        mock_db.paginate.return_value = mock_pagination

        user = _make_user(is_admin_or_owner=False)
        service = AppService()
        args = {"page": 1, "limit": 10, "mode": "all"}

        service.get_paginate_apps(user, "t1", args)

        call_args = mock_db.paginate.call_args
        stmt = call_args[0][0]
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        assert "coalesce" in compiled.lower() or "COALESCE" in compiled
        assert "default_d" in compiled

    @patch("services.app_service.DepartmentService")
    @patch("services.app_service.db")
    def test_admin_no_department_filter(self, mock_db, mock_dept_service):
        mock_dept_service.get_accessible_department_ids.return_value = None

        mock_pagination = MagicMock()
        mock_db.paginate.return_value = mock_pagination

        user = _make_user(is_admin_or_owner=True)
        service = AppService()
        args = {"page": 1, "limit": 10, "mode": "all"}

        service.get_paginate_apps(user, "t1", args)

        mock_dept_service.get_accessible_department_ids.assert_called_once_with(user, "t1")
        mock_dept_service.resource_department_filter.assert_not_called()

    @patch("services.app_service.DepartmentService")
    @patch("services.app_service.db")
    def test_department_id_exact_filter(self, mock_db, mock_dept_service):
        mock_dept_service.get_accessible_department_ids.return_value = None

        mock_pagination = MagicMock()
        mock_db.paginate.return_value = mock_pagination

        user = _make_user(is_admin_or_owner=True)
        service = AppService()
        args = {"page": 1, "limit": 10, "mode": "all", "department_id": "d_specific"}

        service.get_paginate_apps(user, "t1", args)

        call_args = mock_db.paginate.call_args
        stmt = call_args[0][0]
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        assert "d_specific" in compiled

    @patch("services.app_service.DepartmentService")
    @patch("services.app_service.db")
    def test_null_department_visible_to_default_dept_members(self, mock_db, mock_dept_service):
        mock_dept_service.get_accessible_department_ids.return_value = ["d1"]
        default_dept = MagicMock()
        default_dept.id = "d1"
        mock_dept_service.get_default_department.return_value = default_dept

        def capture_filter(model, tenant_id, accessible):
            from sqlalchemy import func

            return func.coalesce(model.department_id, "d1").in_(accessible)

        mock_dept_service.resource_department_filter.side_effect = capture_filter

        mock_pagination = MagicMock()
        mock_db.paginate.return_value = mock_pagination

        user = _make_user(is_admin_or_owner=False)
        service = AppService()
        args = {"page": 1, "limit": 10, "mode": "all"}

        service.get_paginate_apps(user, "t1", args)

        call_args = mock_db.paginate.call_args
        stmt = call_args[0][0]
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        assert "coalesce" in compiled.lower() or "COALESCE" in compiled
        assert "d1" in compiled


class TestCreateAppDepartment:
    @patch("services.app_service.app_was_created")
    @patch("services.app_service.FeatureService")
    @patch("services.app_service.BillingService")
    @patch("services.app_service.DepartmentService")
    @patch("services.app_service.db")
    @patch("services.app_service.ModelManager")
    @patch("services.app_service.default_app_templates")
    def test_admin_no_dept_gets_default(
        self,
        mock_templates,
        mock_model_mgr,
        mock_db,
        mock_dept_service,
        mock_billing,
        mock_feature,
        mock_event,
    ):
        mock_templates.__getitem__ = MagicMock(
            return_value={
                "app": {"enable_site": True, "enable_api": True},
                "model_config": None,
            }
        )
        mock_dept_service.resolve_department_id_for_creation.return_value = "default_dept_id"

        mock_feature.get_system_features.return_value.webapp_auth.enabled = False

        from configs import dify_config

        with patch.object(dify_config, "BILLING_ENABLED", False):
            user = _make_user(is_admin_or_owner=True)
            service = AppService()
            args = {"name": "Test", "mode": "chat", "icon": "test", "icon_background": "#fff"}

            service.create_app("t1", args, user)

        mock_dept_service.resolve_department_id_for_creation.assert_called_once_with(user, "t1", None)

    @patch("services.app_service.app_was_created")
    @patch("services.app_service.FeatureService")
    @patch("services.app_service.BillingService")
    @patch("services.app_service.DepartmentService")
    @patch("services.app_service.db")
    @patch("services.app_service.ModelManager")
    @patch("services.app_service.default_app_templates")
    def test_dept_admin_wrong_dept_raises(
        self,
        mock_templates,
        mock_model_mgr,
        mock_db,
        mock_dept_service,
        mock_billing,
        mock_feature,
        mock_event,
    ):
        mock_templates.__getitem__ = MagicMock(
            return_value={
                "app": {"enable_site": True, "enable_api": True},
                "model_config": None,
            }
        )
        mock_dept_service.resolve_department_id_for_creation.side_effect = DepartmentValidationError("无权访问该部门")

        mock_feature.get_system_features.return_value.webapp_auth.enabled = False

        from configs import dify_config

        with patch.object(dify_config, "BILLING_ENABLED", False):
            user = _make_user(user_id="u2", is_admin_or_owner=False)
            service = AppService()
            args = {
                "name": "Test",
                "mode": "chat",
                "icon": "test",
                "icon_background": "#fff",
                "department_id": "wrong_dept",
            }

            with pytest.raises(DepartmentValidationError):
                service.create_app("t1", args, user)

    @patch("services.app_service.app_was_created")
    @patch("services.app_service.FeatureService")
    @patch("services.app_service.BillingService")
    @patch("services.app_service.DepartmentService")
    @patch("services.app_service.db")
    @patch("services.app_service.ModelManager")
    @patch("services.app_service.default_app_templates")
    def test_member_auto_own_department(
        self,
        mock_templates,
        mock_model_mgr,
        mock_db,
        mock_dept_service,
        mock_billing,
        mock_feature,
        mock_event,
    ):
        mock_templates.__getitem__ = MagicMock(
            return_value={
                "app": {"enable_site": True, "enable_api": True},
                "model_config": None,
            }
        )
        mock_dept_service.resolve_department_id_for_creation.return_value = "member_dept_id"

        mock_feature.get_system_features.return_value.webapp_auth.enabled = False

        from configs import dify_config

        with patch.object(dify_config, "BILLING_ENABLED", False):
            user = _make_user(user_id="u3", is_admin_or_owner=False)
            service = AppService()
            args = {"name": "Test", "mode": "chat", "icon": "test", "icon_background": "#fff"}

            service.create_app("t1", args, user)

        mock_dept_service.resolve_department_id_for_creation.assert_called_once_with(user, "t1", None)


class TestTransferAppDepartment:
    @patch("services.department_service.DepartmentAuditLog")
    @patch("services.app_service.db")
    def test_transfer_sets_department_and_audits(self, mock_db, mock_audit):
        app = _make_app(app_id="app1", department_id="d1")
        user = _make_user(user_id="u1")

        AppService.transfer_app_department(app, "d2", user, "t1")

        assert app.department_id == "d2"
        assert app.updated_by == "u1"
        mock_db.session.commit.assert_called_once()
        mock_audit.log.assert_called_once_with(
            "t1",
            "u1",
            None,
            "transfer_app",
            {"app_id": "app1", "app_name": "Test App", "target_department_id": "d2"},
        )
