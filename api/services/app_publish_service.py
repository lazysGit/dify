import logging

from sqlalchemy import delete, select

from extensions.ext_database import db
from models.account import Account
from models.department import AppPublishedDepartment, Department
from models.model import App
from services.department_service import DepartmentAuditLog, DepartmentService

logger = logging.getLogger(__name__)


class AppPublishService:
    @staticmethod
    def get_published_departments(app_id: str) -> list[dict]:
        rows = (
            db.session.execute(
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
            )
            .all()
        )
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
