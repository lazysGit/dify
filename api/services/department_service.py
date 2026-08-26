import logging
from typing import Any

import sqlalchemy as sa
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from extensions.ext_database import db
from models.account import TenantAccountJoin
from models.dataset import Dataset
from models.department import Department
from models.model import App, OperationLog
from services.errors.department import (
    DepartmentNotFoundError,
    DepartmentPermissionDeniedError,
    DepartmentValidationError,
)

logger = logging.getLogger(__name__)


class DepartmentAuditLog:
    @staticmethod
    def log(tenant_id: str, operator_id: str, operator_ip: str | None, action: str, content: dict) -> None:
        log_entry = OperationLog(
            tenant_id=tenant_id,
            account_id=operator_id,
            action=action,
            content=content,
            created_ip=operator_ip or "0.0.0.0",
        )
        db.session.add(log_entry)
        db.session.commit()

    @staticmethod
    def query(tenant_id: str, key: str, value: str, limit: int = 100) -> list[OperationLog]:
        import sqlalchemy as sa

        return (
            db.session.query(OperationLog)
            .filter(
                OperationLog.tenant_id == tenant_id,
                func.cast(OperationLog.content[key], sa.String) == value,
            )
            .order_by(OperationLog.created_at.desc())
            .limit(limit)
            .all()
        )


class DepartmentService:
    MAX_DEPTH = 10

    @staticmethod
    def get_default_department(tenant_id: str) -> Department:
        department = (
            db.session.query(Department)
            .filter(Department.tenant_id == tenant_id, Department.is_default.is_(True))
            .first()
        )
        if not department:
            raise DepartmentNotFoundError("Default department not found")
        return department

    @staticmethod
    def create_default_department(tenant_id: str, created_by: str) -> Department:
        try:
            department = Department(
                tenant_id=tenant_id,
                name="默认部门",
                description=None,
                level=1,
                is_default=True,
                created_by=created_by,
                path=f"/{tenant_id}",
            )
            db.session.add(department)
            db.session.flush()
            department.path = f"/{tenant_id}/{department.id}"
            db.session.commit()
            return department
        except IntegrityError:
            db.session.rollback()
            return DepartmentService.get_default_department(tenant_id)

    @staticmethod
    def create_department(
        tenant_id: str,
        name: str,
        created_by: str,
        parent_id: str | None = None,
        description: str | None = None,
        operator_ip: str | None = None,
    ) -> Department:
        parent = None
        if parent_id:
            parent = (
                db.session.query(Department)
                .filter(Department.id == parent_id, Department.tenant_id == tenant_id)
                .first()
            )
            if not parent:
                raise DepartmentNotFoundError("Parent department not found")
            if parent.is_default:
                raise DepartmentValidationError("默认部门不能有子部门")
            if parent.level >= DepartmentService.MAX_DEPTH:
                raise DepartmentValidationError("部门层级不能超过 10 级")

        dup = (
            db.session.query(Department)
            .filter(
                Department.tenant_id == tenant_id,
                Department.parent_id.is_(parent_id),
                Department.name == name,
            )
            .first()
        )
        if dup:
            raise DepartmentValidationError("同级下已存在同名部门")

        prefix = parent.path if parent else f"/{tenant_id}"
        department = Department(
            tenant_id=tenant_id,
            parent_id=parent_id,
            name=name,
            description=description,
            level=(parent.level + 1) if parent else 1,
            is_default=False,
            created_by=created_by,
            path=prefix,
        )
        db.session.add(department)
        db.session.flush()
        department.path = f"{prefix}/{department.id}"
        db.session.commit()

        DepartmentAuditLog.log(
            tenant_id,
            created_by,
            operator_ip,
            "create_department",
            {"department_id": department.id, "name": name, "parent_id": parent_id},
        )
        return department

    @staticmethod
    def update_department(
        tenant_id: str,
        department_id: str,
        updated_by: str,
        name: str | None = None,
        description: str | None = None,
        operator_ip: str | None = None,
    ) -> Department:
        department = (
            db.session.query(Department)
            .filter(Department.id == department_id, Department.tenant_id == tenant_id)
            .first()
        )
        if not department:
            raise DepartmentNotFoundError("Department not found")

        if name and name != department.name:
            dup = (
                db.session.query(Department)
                .filter(
                    Department.tenant_id == tenant_id,
                    Department.parent_id.is_(department.parent_id),
                    Department.name == name,
                    Department.id != department_id,
                )
                .first()
            )
            if dup:
                raise DepartmentValidationError("同级下已存在同名部门")
            department.name = name

        if description is not None:
            department.description = description

        department.updated_by = updated_by
        db.session.commit()

        DepartmentAuditLog.log(
            tenant_id,
            updated_by,
            operator_ip,
            "update_department",
            {"department_id": department_id, "name": name, "description": description},
        )
        return department

    @staticmethod
    def delete_department(tenant_id: str, department_id: str, operator_ip: str | None = None) -> None:
        department = (
            db.session.query(Department)
            .filter(Department.id == department_id, Department.tenant_id == tenant_id)
            .first()
        )
        if not department:
            raise DepartmentNotFoundError("Department not found")

        checks: list[tuple[Any, str]] = [
            (department.is_default, "默认部门不能删除"),
            (
                db.session.query(Department).filter(Department.parent_id == department_id).count(),
                "部门下有子部门，请先删除子部门",
            ),
            (
                db.session.query(TenantAccountJoin).filter(TenantAccountJoin.department_id == department_id).count(),
                "部门下有成员，请先移动成员",
            ),
            (
                db.session.query(App).filter(App.department_id == department_id).count(),
                "部门下有应用，请先转移应用",
            ),
            (
                db.session.query(Dataset).filter(Dataset.department_id == department_id).count(),
                "部门下有知识库，请先转移知识库",
            ),
        ]
        for blocked, message in checks:
            if blocked:
                raise DepartmentValidationError(message)

        db.session.delete(department)
        db.session.commit()

        DepartmentAuditLog.log(
            tenant_id,
            operator_ip or "0.0.0.0",
            operator_ip,
            "delete_department",
            {"department_id": department_id},
        )

    @staticmethod
    def move_department(
        tenant_id: str,
        department_id: str,
        new_parent_id: str | None,
        operator_id: str,
        operator_ip: str | None = None,
    ) -> None:
        department = (
            db.session.query(Department)
            .filter(Department.id == department_id, Department.tenant_id == tenant_id)
            .first()
        )
        if not department:
            raise DepartmentNotFoundError("Department not found")

        if department.is_default:
            raise DepartmentValidationError("默认部门不能移动")

        new_parent = None
        if new_parent_id:
            if new_parent_id == department_id:
                raise DepartmentValidationError("不能将部门移动到自身下")
            new_parent = (
                db.session.query(Department)
                .filter(Department.id == new_parent_id, Department.tenant_id == tenant_id)
                .first()
            )
            if not new_parent:
                raise DepartmentNotFoundError("Parent department not found")
            if new_parent.is_default:
                raise DepartmentValidationError("默认部门不能有子部门")
            if new_parent.path.startswith(department.path):
                raise DepartmentValidationError("不能将部门移动到其子孙部门下")

            subtree_max_level = (
                db.session.query(func.max(Department.level))
                .filter(
                    Department.tenant_id == tenant_id,
                    Department.path.like(f"{department.path}%"),
                )
                .scalar()
            ) or department.level
            projected_depth = new_parent.level + 1 + (subtree_max_level - department.level)
            if projected_depth > DepartmentService.MAX_DEPTH:
                raise DepartmentValidationError("部门层级不能超过 10 级")

        old_prefix = department.path
        new_prefix = f"{(new_parent.path if new_parent else '/' + tenant_id)}/{department.id}"
        level_diff = (new_parent.level + 1 if new_parent else 1) - department.level

        db.session.execute(
            sa.update(Department)
            .where(Department.tenant_id == tenant_id, Department.path.like(old_prefix + "%"))
            .values(
                path=func.replace(Department.path, old_prefix, new_prefix),
                level=Department.level + level_diff,
                updated_at=func.now(),
            )
        )
        db.session.execute(
            sa.update(Department)
            .where(Department.id == department_id)
            .values(parent_id=new_parent_id)
        )
        db.session.commit()

        DepartmentAuditLog.log(
            tenant_id,
            operator_id,
            operator_ip,
            "move_department",
            {"department_id": department_id, "old_path": old_prefix, "new_path": new_prefix},
        )

    @staticmethod
    def get_departments_with_counts(tenant_id: str) -> list[dict]:
        departments = (
            db.session.query(Department)
            .filter(Department.tenant_id == tenant_id)
            .order_by(Department.sort_order, Department.created_at)
            .all()
        )
        default_dept_id = DepartmentService.get_default_department(tenant_id).id
        result = []
        for dept in departments:
            member_count = (
                db.session.query(TenantAccountJoin).filter(TenantAccountJoin.department_id == dept.id).count()
            )
            app_count = (
                db.session.query(App).filter(func.coalesce(App.department_id, default_dept_id) == dept.id).count()
            )
            dataset_count = (
                db.session.query(Dataset)
                .filter(func.coalesce(Dataset.department_id, default_dept_id) == dept.id)
                .count()
            )
            result.append(
                {
                    "id": dept.id,
                    "name": dept.name,
                    "parent_id": dept.parent_id,
                    "level": dept.level,
                    "path": dept.path,
                    "description": dept.description,
                    "is_default": dept.is_default,
                    "sort_order": dept.sort_order,
                    "member_count": member_count,
                    "app_count": app_count,
                    "dataset_count": dataset_count,
                }
            )
        return result

    @staticmethod
    def build_tree(departments: list[dict]) -> list[dict]:
        dept_map: dict[str, dict] = {}
        roots: list[dict] = []
        for dept in departments:
            dept["children"] = []
            dept_map[dept["id"]] = dept
        for dept in departments:
            parent_id = dept.get("parent_id")
            if parent_id and parent_id in dept_map:
                dept_map[parent_id]["children"].append(dept)
            else:
                roots.append(dept)
        return roots

    @staticmethod
    def get_descendant_ids(tenant_id: str, department_id: str) -> list[str]:
        department = (
            db.session.query(Department)
            .filter(Department.id == department_id, Department.tenant_id == tenant_id)
            .first()
        )
        if not department:
            return []
        descendants = (
            db.session.query(Department)
            .filter(
                Department.tenant_id == tenant_id,
                Department.path.like(f"{department.path}/%"),
            )
            .all()
        )
        return [d.id for d in descendants]

    @staticmethod
    def get_user_department_id(account_id: str, tenant_id: str) -> str | None:
        join_record = (
            db.session.query(TenantAccountJoin)
            .filter(
                TenantAccountJoin.account_id == account_id,
                TenantAccountJoin.tenant_id == tenant_id,
            )
            .first()
        )
        return join_record.department_id if join_record else None

    @staticmethod
    def is_department_admin(account_id: str, tenant_id: str) -> bool:
        join_record = (
            db.session.query(TenantAccountJoin)
            .filter(
                TenantAccountJoin.account_id == account_id,
                TenantAccountJoin.tenant_id == tenant_id,
            )
            .first()
        )
        return join_record.is_department_admin if join_record else False

    @staticmethod
    def get_accessible_department_ids(user: Any, tenant_id: str) -> list[str] | None:
        if user.is_admin_or_owner:
            return None
        dept_id = DepartmentService.get_user_department_id(user.id, tenant_id)
        if not dept_id:
            return []
        if DepartmentService.is_department_admin(user.id, tenant_id):
            return [dept_id, *DepartmentService.get_descendant_ids(tenant_id, dept_id)]
        return [dept_id]

    @staticmethod
    def get_manageable_department_ids(user: Any, tenant_id: str) -> list[str]:
        accessible = DepartmentService.get_accessible_department_ids(user, tenant_id)
        if accessible is None:
            all_depts = db.session.query(Department).filter(Department.tenant_id == tenant_id).all()
            return [d.id for d in all_depts]
        return accessible

    @staticmethod
    def resolve_department_id_for_creation(user: Any, tenant_id: str, requested_department_id: str | None) -> str:
        if requested_department_id:
            DepartmentService.assert_department_access(user, tenant_id, requested_department_id)
            return requested_department_id
        dept_id = DepartmentService.get_user_department_id(user.id, tenant_id)
        if dept_id:
            return dept_id
        return DepartmentService.get_default_department(tenant_id).id

    @staticmethod
    def assert_department_access(
        user: Any,
        tenant_id: str,
        resource_department_id: str | None,
        resource_tenant_id: str | None = None,
    ) -> None:
        if resource_tenant_id and resource_tenant_id != tenant_id:
            raise DepartmentPermissionDeniedError("无权访问该资源")
        accessible = DepartmentService.get_accessible_department_ids(user, tenant_id)
        if accessible is None:
            return
        dept_id = resource_department_id or DepartmentService.get_default_department(tenant_id).id
        if dept_id not in accessible:
            raise DepartmentPermissionDeniedError("无权访问该资源")

    @staticmethod
    def resource_department_filter(resource_model: Any, tenant_id: str, accessible: list[str]):
        default_dept_id = DepartmentService.get_default_department(tenant_id).id
        return func.coalesce(resource_model.department_id, default_dept_id).in_(accessible)

    @staticmethod
    def get_department_members(tenant_id: str, department_id: str) -> list[dict]:
        from models.account import Account

        joins = (
            db.session.query(TenantAccountJoin)
            .filter(
                TenantAccountJoin.tenant_id == tenant_id,
                TenantAccountJoin.department_id == department_id,
            )
            .all()
        )
        result = []
        for join in joins:
            account = db.session.query(Account).filter(Account.id == join.account_id).first()
            if account:
                result.append(
                    {
                        "account_id": account.id,
                        "name": account.name,
                        "email": account.email,
                        "role": join.role,
                        "is_department_admin": join.is_department_admin,
                        "joined_at": join.created_at,
                    }
                )
        return result

    @staticmethod
    def move_member_to_department(
        tenant_id: str,
        member_account_id: str,
        target_department_id: str,
        operator_id: str,
        operator_ip: str | None = None,
    ) -> None:
        target_dept = (
            db.session.query(Department)
            .filter(Department.id == target_department_id, Department.tenant_id == tenant_id)
            .first()
        )
        if not target_dept:
            raise DepartmentNotFoundError("Target department not found")

        join = (
            db.session.query(TenantAccountJoin)
            .filter(
                TenantAccountJoin.tenant_id == tenant_id,
                TenantAccountJoin.account_id == member_account_id,
            )
            .first()
        )
        if not join:
            raise DepartmentNotFoundError("Member not found in tenant")

        join.department_id = target_department_id
        join.is_department_admin = False
        db.session.commit()

        DepartmentAuditLog.log(
            tenant_id,
            operator_id,
            operator_ip,
            "move_member",
            {"member_id": member_account_id, "target_department_id": target_department_id},
        )

    @staticmethod
    def set_department_admin(
        tenant_id: str,
        department_id: str,
        member_account_id: str,
        operator_id: str,
        operator_ip: str | None = None,
    ) -> None:
        dept = (
            db.session.query(Department)
            .filter(Department.id == department_id, Department.tenant_id == tenant_id)
            .first()
        )
        if not dept:
            raise DepartmentNotFoundError("Department not found")

        join = (
            db.session.query(TenantAccountJoin)
            .filter(
                TenantAccountJoin.tenant_id == tenant_id,
                TenantAccountJoin.account_id == member_account_id,
            )
            .first()
        )
        if not join:
            raise DepartmentNotFoundError("Member not found in tenant")

        join.department_id = department_id
        join.is_department_admin = True
        db.session.commit()

        DepartmentAuditLog.log(
            tenant_id,
            operator_id,
            operator_ip,
            "set_department_admin",
            {"department_id": department_id, "member_id": member_account_id},
        )

    @staticmethod
    def remove_department_admin(
        tenant_id: str,
        department_id: str,
        member_account_id: str,
        operator_id: str,
        operator_ip: str | None = None,
    ) -> None:
        join = (
            db.session.query(TenantAccountJoin)
            .filter(
                TenantAccountJoin.tenant_id == tenant_id,
                TenantAccountJoin.account_id == member_account_id,
            )
            .first()
        )
        if not join:
            raise DepartmentNotFoundError("Member not found in tenant")

        join.is_department_admin = False
        db.session.commit()

        DepartmentAuditLog.log(
            tenant_id,
            operator_id,
            operator_ip,
            "remove_department_admin",
            {"department_id": department_id, "member_id": member_account_id},
        )
