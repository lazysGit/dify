from datetime import datetime
from unittest.mock import MagicMock, PropertyMock, patch

import pytest

import controllers.console.explore.department_app as dept_module
import controllers.console.explore.installed_app as installed_module
from services.feature_service import FeatureService


def unwrap(func):
    while hasattr(func, "__wrapped__"):
        func = func.__wrapped__
    return func


@pytest.fixture
def tenant_id():
    return "t1"


@pytest.fixture
def admin_user(tenant_id):
    user = MagicMock()
    user.id = "u_admin"
    user.current_tenant = MagicMock(id=tenant_id)
    user.is_admin_or_owner = True
    return user


@pytest.fixture
def dept_admin_user(tenant_id):
    user = MagicMock()
    user.id = "u_dept_admin"
    user.current_tenant = MagicMock(id=tenant_id)
    user.is_admin_or_owner = False
    return user


@pytest.fixture
def member_user(tenant_id):
    user = MagicMock()
    user.id = "u_member"
    user.current_tenant = MagicMock(id=tenant_id)
    user.is_admin_or_owner = False
    return user


class TestDepartmentAppListApi:
    def test_admin_sees_all_published_apps(self, app, admin_user, tenant_id):
        api = dept_module.DepartmentAppListApi()
        method = unwrap(api.get)

        row1 = MagicMock()
        row1.id = "app1"
        row1.name = "App 1"
        row1.mode = MagicMock(value="chat")
        row1.icon = "icon1"
        row1.icon_type = MagicMock(value="emoji")
        row1.icon_background = "#fff"
        row1.description = "desc1"
        row1.is_installed = False
        row1.is_pinned = False

        row2 = MagicMock()
        row2.id = "app2"
        row2.name = "App 2"
        row2.mode = MagicMock(value="workflow")
        row2.icon = "icon2"
        row2.icon_type = None
        row2.icon_background = "#000"
        row2.description = "desc2"
        row2.is_installed = True
        row2.is_pinned = True

        session = MagicMock()
        session.execute.return_value.all.return_value = [row1, row2]

        with (
            app.test_request_context("/"),
            patch.object(dept_module, "current_account_with_tenant", return_value=(admin_user, tenant_id)),
            patch.object(dept_module.DepartmentService, "get_accessible_department_ids", return_value=None),
            patch.object(dept_module.db, "session", session),
        ):
            result = method(api)

        assert len(result["department_apps"]) == 2

    def test_dept_admin_sees_in_scope_apps(self, app, dept_admin_user, tenant_id):
        api = dept_module.DepartmentAppListApi()
        method = unwrap(api.get)

        row1 = MagicMock()
        row1.id = "app1"
        row1.name = "App 1"
        row1.mode = MagicMock(value="chat")
        row1.icon = "icon1"
        row1.icon_type = MagicMock(value="emoji")
        row1.icon_background = "#fff"
        row1.description = ""
        row1.is_installed = False
        row1.is_pinned = False

        session = MagicMock()
        session.execute.return_value.all.return_value = [row1]

        with (
            app.test_request_context("/"),
            patch.object(dept_module, "current_account_with_tenant", return_value=(dept_admin_user, tenant_id)),
            patch.object(dept_module.DepartmentService, "get_accessible_department_ids", return_value=["d1", "d2"]),
            patch.object(dept_module.db, "session", session),
        ):
            result = method(api)

        assert len(result["department_apps"]) == 1
        assert result["department_apps"][0]["id"] == "app1"

    def test_member_sees_own_dept_apps(self, app, member_user, tenant_id):
        api = dept_module.DepartmentAppListApi()
        method = unwrap(api.get)

        session = MagicMock()
        session.execute.return_value.all.return_value = []

        with (
            app.test_request_context("/"),
            patch.object(dept_module, "current_account_with_tenant", return_value=(member_user, tenant_id)),
            patch.object(dept_module.DepartmentService, "get_accessible_department_ids", return_value=["d1"]),
            patch.object(dept_module.db, "session", session),
        ):
            result = method(api)

        assert result["department_apps"] == []

    def test_empty_accessible_returns_empty(self, app, member_user, tenant_id):
        api = dept_module.DepartmentAppListApi()
        method = unwrap(api.get)

        with (
            app.test_request_context("/"),
            patch.object(dept_module, "current_account_with_tenant", return_value=(member_user, tenant_id)),
            patch.object(dept_module.DepartmentService, "get_accessible_department_ids", return_value=[]),
        ):
            result = method(api)

        assert result["department_apps"] == []


class TestInstalledAppsListWithDeptFilter:
    def test_flag_off_no_dept_filter(self, app, member_user, tenant_id):
        api = installed_module.InstalledAppsListApi()
        method = unwrap(api.get)

        mock_app = MagicMock(id="a1")
        installed = MagicMock()
        installed.id = "ia1"
        installed.app = mock_app
        installed.app_owner_tenant_id = "t2"
        installed.is_pinned = False
        installed.last_used_at = datetime(2024, 1, 1)

        session = MagicMock()
        session.scalars.return_value.all.return_value = [installed]

        with (
            app.test_request_context("/"),
            patch.object(installed_module, "current_account_with_tenant", return_value=(member_user, tenant_id)),
            patch.object(installed_module.db, "session", session),
            patch.object(installed_module.TenantService, "get_user_role", return_value="member"),
            patch.object(
                installed_module.FeatureService,
                "get_system_features",
                return_value=MagicMock(webapp_auth=MagicMock(enabled=False)),
            ),
            patch.object(installed_module.dify_config, "DEPARTMENT_ACCESS_CONTROL_ENABLED", False),
        ):
            result = method(api)

        assert len(result["installed_apps"]) == 1

    def test_flag_off_unpublished_app_still_visible(self, app, member_user, tenant_id):
        api = installed_module.InstalledAppsListApi()
        method = unwrap(api.get)

        mock_app = MagicMock(id="a_unpublished")
        installed = MagicMock()
        installed.id = "ia2"
        installed.app = mock_app
        installed.app_owner_tenant_id = "t1"
        installed.is_pinned = False
        installed.last_used_at = datetime(2024, 1, 1)

        session = MagicMock()
        session.scalars.return_value.all.return_value = [installed]

        with (
            app.test_request_context("/"),
            patch.object(installed_module, "current_account_with_tenant", return_value=(member_user, tenant_id)),
            patch.object(installed_module.db, "session", session),
            patch.object(installed_module.TenantService, "get_user_role", return_value="member"),
            patch.object(
                installed_module.FeatureService,
                "get_system_features",
                return_value=MagicMock(webapp_auth=MagicMock(enabled=False)),
            ),
            patch.object(installed_module.dify_config, "DEPARTMENT_ACCESS_CONTROL_ENABLED", False),
        ):
            result = method(api)

        assert len(result["installed_apps"]) == 1

    def test_flag_on_filters_unpublished(self, app, member_user, tenant_id):
        api = installed_module.InstalledAppsListApi()
        method = unwrap(api.get)

        mock_app_published = MagicMock(id="a_published")
        mock_app_unpublished = MagicMock(id="a_unpublished")
        installed_published = MagicMock()
        installed_published.id = "ia1"
        installed_published.app = mock_app_published
        installed_published.app_owner_tenant_id = "t2"
        installed_published.is_pinned = False
        installed_published.last_used_at = datetime(2024, 1, 1)
        installed_unpublished = MagicMock()
        installed_unpublished.id = "ia2"
        installed_unpublished.app = mock_app_unpublished
        installed_unpublished.app_owner_tenant_id = "t2"
        installed_unpublished.is_pinned = False
        installed_unpublished.last_used_at = datetime(2024, 1, 2)

        session = MagicMock()
        session.scalars.return_value.all.return_value = [installed_published, installed_unpublished]
        session.execute.return_value.scalars.return_value.all.return_value = ["a_published"]

        with (
            app.test_request_context("/"),
            patch.object(installed_module, "current_account_with_tenant", return_value=(member_user, tenant_id)),
            patch.object(installed_module.db, "session", session),
            patch.object(installed_module.TenantService, "get_user_role", return_value="member"),
            patch.object(
                installed_module.FeatureService,
                "get_system_features",
                return_value=MagicMock(webapp_auth=MagicMock(enabled=False)),
            ),
            patch.object(installed_module.dify_config, "DEPARTMENT_ACCESS_CONTROL_ENABLED", True),
            patch.object(installed_module.DepartmentService, "get_accessible_department_ids", return_value=["d1"]),
        ):
            result = method(api)

        assert len(result["installed_apps"]) == 1
        assert result["installed_apps"][0]["app"].id == "a_published"

    def test_flag_on_cancel_publish_filters_silently(self, app, member_user, tenant_id):
        api = installed_module.InstalledAppsListApi()
        method = unwrap(api.get)

        mock_app = MagicMock(id="a_was_published")
        installed = MagicMock()
        installed.id = "ia1"
        installed.app = mock_app
        installed.app_owner_tenant_id = "t2"
        installed.is_pinned = False
        installed.last_used_at = datetime(2024, 1, 1)

        session = MagicMock()
        session.scalars.return_value.all.return_value = [installed]
        session.execute.return_value.scalars.return_value.all.return_value = []

        with (
            app.test_request_context("/"),
            patch.object(installed_module, "current_account_with_tenant", return_value=(member_user, tenant_id)),
            patch.object(installed_module.db, "session", session),
            patch.object(installed_module.TenantService, "get_user_role", return_value="member"),
            patch.object(
                installed_module.FeatureService,
                "get_system_features",
                return_value=MagicMock(webapp_auth=MagicMock(enabled=False)),
            ),
            patch.object(installed_module.dify_config, "DEPARTMENT_ACCESS_CONTROL_ENABLED", True),
            patch.object(installed_module.DepartmentService, "get_accessible_department_ids", return_value=["d1"]),
        ):
            result = method(api)

        assert result["installed_apps"] == []

    def test_flag_on_admin_sees_all(self, app, admin_user, tenant_id):
        api = installed_module.InstalledAppsListApi()
        method = unwrap(api.get)

        mock_app = MagicMock(id="a1")
        installed = MagicMock()
        installed.id = "ia1"
        installed.app = mock_app
        installed.app_owner_tenant_id = "t2"
        installed.is_pinned = False
        installed.last_used_at = datetime(2024, 1, 1)

        session = MagicMock()
        session.scalars.return_value.all.return_value = [installed]

        with (
            app.test_request_context("/"),
            patch.object(installed_module, "current_account_with_tenant", return_value=(admin_user, tenant_id)),
            patch.object(installed_module.db, "session", session),
            patch.object(installed_module.TenantService, "get_user_role", return_value="owner"),
            patch.object(
                installed_module.FeatureService,
                "get_system_features",
                return_value=MagicMock(webapp_auth=MagicMock(enabled=False)),
            ),
            patch.object(installed_module.dify_config, "DEPARTMENT_ACCESS_CONTROL_ENABLED", True),
            patch.object(installed_module.DepartmentService, "get_accessible_department_ids", return_value=None),
        ):
            result = method(api)

        assert len(result["installed_apps"]) == 1


class TestSystemFeaturesDepartmentAccessControl:
    def test_system_features_exposes_flag(self):
        with patch.object(
            FeatureService, "_fulfill_system_params_from_env", wraps=FeatureService._fulfill_system_params_from_env
        ):
            features = FeatureService.get_system_features()
        assert hasattr(features, "department_access_control")
        assert isinstance(features.department_access_control, bool)


class TestInstallWithDeptPublish:
    def test_flag_on_can_install_published_dept_app(self, app, member_user, tenant_id):
        api = installed_module.InstalledAppsListApi()
        method = unwrap(api.post)

        app_entity = MagicMock()
        app_entity.id = "a1"
        app_entity.is_public = False
        app_entity.tenant_id = "t2"

        session = MagicMock()
        session.get.return_value = app_entity
        session.scalar.side_effect = [True, None]

        with (
            app.test_request_context("/", json={"app_id": "a1"}),
            patch.object(
                type(installed_module.console_ns),
                "payload",
                new_callable=PropertyMock,
                return_value={"app_id": "a1"},
            ),
            patch.object(installed_module.db, "session", session),
            patch.object(installed_module, "current_account_with_tenant", return_value=(member_user, tenant_id)),
            patch.object(installed_module.dify_config, "DEPARTMENT_ACCESS_CONTROL_ENABLED", True),
            patch.object(installed_module.DepartmentService, "get_accessible_department_ids", return_value=["d1"]),
        ):
            result = method(api)

        assert result == {"message": "App installed successfully"}

    def test_flag_on_unpublished_app_install_rejected(self, app, member_user, tenant_id):
        from werkzeug.exceptions import Forbidden

        api = installed_module.InstalledAppsListApi()
        method = unwrap(api.post)

        app_entity = MagicMock()
        app_entity.id = "a1"
        app_entity.is_public = False
        app_entity.tenant_id = "t2"

        session = MagicMock()
        session.get.return_value = app_entity
        session.scalar.return_value = False

        with (
            app.test_request_context("/", json={"app_id": "a1"}),
            patch.object(
                type(installed_module.console_ns),
                "payload",
                new_callable=PropertyMock,
                return_value={"app_id": "a1"},
            ),
            patch.object(installed_module.db, "session", session),
            patch.object(installed_module, "current_account_with_tenant", return_value=(member_user, tenant_id)),
            patch.object(installed_module.dify_config, "DEPARTMENT_ACCESS_CONTROL_ENABLED", True),
            patch.object(installed_module.DepartmentService, "get_accessible_department_ids", return_value=["d1"]),
        ):
            with pytest.raises(Forbidden):
                method(api)

    def test_flag_off_non_public_still_rejected(self, app, member_user, tenant_id):
        from werkzeug.exceptions import Forbidden

        api = installed_module.InstalledAppsListApi()
        method = unwrap(api.post)

        recommended = MagicMock()
        app_entity = MagicMock(is_public=False)

        session = MagicMock()
        session.scalar.return_value = recommended
        session.get.return_value = app_entity

        with (
            app.test_request_context("/", json={"app_id": "a1"}),
            patch.object(
                type(installed_module.console_ns),
                "payload",
                new_callable=PropertyMock,
                return_value={"app_id": "a1"},
            ),
            patch.object(installed_module.db, "session", session),
            patch.object(installed_module, "current_account_with_tenant", return_value=(member_user, tenant_id)),
            patch.object(installed_module.dify_config, "DEPARTMENT_ACCESS_CONTROL_ENABLED", False),
        ):
            with pytest.raises(Forbidden):
                method(api)
