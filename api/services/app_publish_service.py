import logging

from sqlalchemy import delete, select

from extensions.ext_database import db
from models.account import Account
from models.department import AppPublishedDepartment, Department
from models.model import App
from services.department_service import DepartmentAuditLog, DepartmentService
from services.errors.department import DepartmentPermissionDeniedError

logger = logging.getLogger(__name__)


def _check_publish_permission(user: Account, target_dept_id: str, tenant_id: str) -> None:
    """Raise DepartmentPermissionDeniedError when user may not publish to target_dept_id.

    Matrix: tenant owner/admin -> anywhere; department admin -> own department and
    its descendants (get_descendant_ids excludes self, so it is appended); regular
    members (any role) -> their own department only.
    """
    if user.is_admin_or_owner:
        return

    user_dept_id = DepartmentService.get_user_department_id(user.id, tenant_id)

    if target_dept_id == user_dept_id:
        return

    if DepartmentService.is_department_admin(user.id, tenant_id):
        user_dept = db.session.query(Department).filter_by(id=user_dept_id).first()
        if user_dept:
            allowed_ids = DepartmentService.get_descendant_ids(tenant_id, user_dept_id)
            allowed_ids.append(user_dept_id)
            if target_dept_id in allowed_ids:
                return
        raise DepartmentPermissionDeniedError("部门管理员只能发布到管辖范围内的部门")

    raise DepartmentPermissionDeniedError("普通用户只能发布到自己所属部门，如需跨部门发布请联系管理员")


class AppPublishService:
    @staticmethod
    def get_published_departments(app_id: str) -> list[dict]:
        rows = db.session.execute(
            select(
                Department.id,
                Department.name,
                Department.path,
            )
            .join(
                AppPublishedDepartment,
                AppPublishedDepartment.department_id == Department.id,
            )
            .where(AppPublishedDepartment.app_id == app_id)
        ).all()
        return [{"id": str(r.id), "name": r.name, "path": r.path} for r in rows]

    @staticmethod
    def update_published_departments(
        user: Account,
        tenant_id: str,
        app_id: str,
        department_ids: list[str],
        operator_ip: str | None = None,
    ) -> list[dict]:
        app = db.session.scalar(select(App).where(App.id == app_id, App.tenant_id == tenant_id))
        if not app:
            raise ValueError("App not found")
        if not app.enable_site:
            raise ValueError("App site is not enabled")

        # Permission gate: any out-of-scope target rejects the whole request,
        # with the denial audited before re-raising (design doc §11).
        for dept_id in department_ids:
            try:
                _check_publish_permission(user, dept_id, tenant_id)
            except DepartmentPermissionDeniedError:
                DepartmentAuditLog.log(
                    tenant_id,
                    user.id,
                    operator_ip,
                    "publish_permission_denied",
                    {"app_id": app_id, "target_department_id": dept_id, "user_id": user.id},
                )
                raise

        # Successful publish audit: distinguish cross-department pushes from
        # routine own-department ones (admins always count as cross-department;
        # short-circuit before touching department lookup to avoid a needless query).
        if user.is_admin_or_owner:
            publish_action = "publish_cross_department"
        else:
            user_dept_id = DepartmentService.get_user_department_id(user.id, tenant_id)
            if any(d != user_dept_id for d in department_ids):
                publish_action = "publish_cross_department"
            else:
                publish_action = "publish_to_own_department"
        DepartmentAuditLog.log(
            tenant_id,
            user.id,
            operator_ip,
            publish_action,
            {"app_id": app_id, "department_ids": department_ids},
        )

        unique_dept_ids = list(dict.fromkeys(department_ids))

        existing = (
            db.session.execute(
                select(AppPublishedDepartment.department_id).where(AppPublishedDepartment.app_id == app_id)
            )
            .scalars()
            .all()
        )
        existing_set = {str(d) for d in existing}
        desired_set = set(unique_dept_ids)

        to_add = desired_set - existing_set
        to_remove = existing_set - desired_set

        for dept_id in to_add:
            db.session.add(
                AppPublishedDepartment(
                    app_id=app_id,
                    department_id=dept_id,
                    published_by=user.id,
                )
            )

        if to_remove:
            db.session.execute(
                delete(AppPublishedDepartment).where(
                    AppPublishedDepartment.app_id == app_id,
                    AppPublishedDepartment.department_id.in_(to_remove),
                )
            )

        db.session.commit()

        if to_add:
            DepartmentAuditLog.log(
                tenant_id,
                user.id,
                operator_ip,
                "publish_app_to_departments",
                {"app_id": app_id, "department_ids": list(to_add)},
            )
        if to_remove:
            DepartmentAuditLog.log(
                tenant_id,
                user.id,
                operator_ip,
                "unpublish_app_from_departments",
                {"app_id": app_id, "department_ids": list(to_remove)},
            )

        return AppPublishService.get_published_departments(app_id)

    @staticmethod
    def can_access(user: Account, tenant_id: str, app_id: str) -> bool:
        if user.is_admin_or_owner:
            return True

        app = db.session.scalar(select(App).where(App.id == app_id, App.tenant_id == tenant_id))
        if not app:
            return False

        accessible = DepartmentService.get_accessible_department_ids(user, tenant_id)
        if accessible is None:
            return True
        if not accessible:
            return False

        published_depts = (
            db.session.execute(
                select(AppPublishedDepartment.department_id).where(AppPublishedDepartment.app_id == app_id)
            )
            .scalars()
            .all()
        )
        published_set = {str(d) for d in published_depts}

        return bool(published_set & set(accessible))
