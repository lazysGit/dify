from flask import request
from flask_restx import Resource
from pydantic import BaseModel, ConfigDict, field_validator

from controllers.console import console_ns
from controllers.console.wraps import account_initialization_required, setup_required
from libs.login import current_account_with_tenant, login_required
from services.department_service import DepartmentAuditLog, DepartmentService
from services.errors.department import (
    DepartmentNotFoundError,
    DepartmentPermissionDeniedError,
    DepartmentValidationError,
)

DEFAULT_REF_TEMPLATE_SWAGGER_2_0 = "#/definitions/{model}"


class DepartmentCreatePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    parent_id: str | None = None
    description: str | None = None

    @field_validator("parent_id")
    @classmethod
    def validate_parent_id(cls, v: str | None) -> str | None:
        if v is not None and v == "":
            return None
        return v


class DepartmentUpdatePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    description: str | None = None


class DepartmentMemberMovePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    member_id: str
    department_id: str


class DepartmentMovePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    parent_id: str | None = None

    @field_validator("parent_id")
    @classmethod
    def validate_parent_id(cls, v: str | None) -> str | None:
        if v is not None and v == "":
            return None
        return v


class DepartmentAdminPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    member_id: str


def reg(cls: type[BaseModel]):
    console_ns.schema_model(cls.__name__, cls.model_json_schema(ref_template=DEFAULT_REF_TEMPLATE_SWAGGER_2_0))


reg(DepartmentCreatePayload)
reg(DepartmentUpdatePayload)
reg(DepartmentMemberMovePayload)
reg(DepartmentMovePayload)
reg(DepartmentAdminPayload)


def _translate_error(e: Exception) -> None:
    if isinstance(e, DepartmentNotFoundError):
        console_ns.abort(404, description=e.description if hasattr(e, "description") else str(e))
    elif isinstance(e, DepartmentValidationError):
        console_ns.abort(400, description=e.description if hasattr(e, "description") else str(e))
    elif isinstance(e, DepartmentPermissionDeniedError):
        console_ns.abort(403, description=e.description if hasattr(e, "description") else str(e))
    raise e


@console_ns.route("/workspaces/current/departments")
class DepartmentListApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    def get(self):
        user, tenant_id = current_account_with_tenant()
        departments = DepartmentService.get_departments_with_counts(tenant_id)
        return {
            "departments": departments,
            "tree": DepartmentService.build_tree(departments),
            "manageable_department_ids": DepartmentService.get_manageable_department_ids(user, tenant_id),
            "is_department_admin": DepartmentService.is_department_admin(user.id, tenant_id),
        }

    @setup_required
    @login_required
    @account_initialization_required
    @console_ns.expect(console_ns.models[DepartmentCreatePayload.__name__])
    def post(self):
        user, tenant_id = current_account_with_tenant()
        if not user.is_admin_or_owner:
            console_ns.abort(403, description="Only admin or owner can create department")

        payload = console_ns.payload or {}
        args = DepartmentCreatePayload.model_validate(payload)

        try:
            dept = DepartmentService.create_department(
                tenant_id=tenant_id,
                name=args.name,
                created_by=user.id,
                parent_id=args.parent_id,
                description=args.description,
                operator_ip=request.remote_addr,
            )
        except (DepartmentNotFoundError, DepartmentValidationError, DepartmentPermissionDeniedError) as e:
            _translate_error(e)
            return

        return {
            "id": dept.id,
            "name": dept.name,
            "parent_id": dept.parent_id,
            "level": dept.level,
            "path": dept.path,
            "description": dept.description,
            "is_default": dept.is_default,
        }, 201


@console_ns.route("/departments/<uuid:department_id>")
class DepartmentApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @console_ns.expect(console_ns.models[DepartmentUpdatePayload.__name__])
    def put(self, department_id):
        user, tenant_id = current_account_with_tenant()
        if not user.is_admin_or_owner:
            console_ns.abort(403, description="Only admin or owner can update department")

        payload = console_ns.payload or {}
        args = DepartmentUpdatePayload.model_validate(payload)

        try:
            dept = DepartmentService.update_department(
                tenant_id=tenant_id,
                department_id=str(department_id),
                updated_by=user.id,
                name=args.name,
                description=args.description,
                operator_ip=request.remote_addr,
            )
        except (DepartmentNotFoundError, DepartmentValidationError, DepartmentPermissionDeniedError) as e:
            _translate_error(e)
            return

        return {
            "id": dept.id,
            "name": dept.name,
            "parent_id": dept.parent_id,
            "level": dept.level,
            "path": dept.path,
            "description": dept.description,
            "is_default": dept.is_default,
        }

    @setup_required
    @login_required
    @account_initialization_required
    def delete(self, department_id):
        user, tenant_id = current_account_with_tenant()
        if not user.is_admin_or_owner:
            console_ns.abort(403, description="Only admin or owner can delete department")

        try:
            DepartmentService.delete_department(
                tenant_id=tenant_id,
                department_id=str(department_id),
                operator_ip=request.remote_addr,
            )
        except (DepartmentNotFoundError, DepartmentValidationError, DepartmentPermissionDeniedError) as e:
            _translate_error(e)
            return

        return {"result": "success"}


@console_ns.route("/departments/<uuid:department_id>/move")
class DepartmentMoveApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @console_ns.expect(console_ns.models[DepartmentMovePayload.__name__])
    def put(self, department_id):
        user, tenant_id = current_account_with_tenant()
        if not user.is_admin_or_owner:
            console_ns.abort(403, description="Only admin or owner can move department")

        payload = console_ns.payload or {}
        args = DepartmentMovePayload.model_validate(payload)

        try:
            DepartmentService.move_department(
                tenant_id=tenant_id,
                department_id=str(department_id),
                new_parent_id=args.parent_id,
                operator_id=user.id,
                operator_ip=request.remote_addr,
            )
        except (DepartmentNotFoundError, DepartmentValidationError, DepartmentPermissionDeniedError) as e:
            _translate_error(e)
            return

        return {"result": "success"}


@console_ns.route("/departments/<uuid:department_id>/members")
class DepartmentMemberApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    def get(self, department_id):
        user, tenant_id = current_account_with_tenant()

        try:
            DepartmentService.assert_department_access(user, tenant_id, str(department_id))
        except DepartmentPermissionDeniedError as e:
            _translate_error(e)
            return

        members = DepartmentService.get_department_members(tenant_id, str(department_id))
        manageable_ids = DepartmentService.get_manageable_department_ids(user, tenant_id)
        return {
            "members": members,
            "can_set_admin": str(department_id) in manageable_ids,
        }

    @setup_required
    @login_required
    @account_initialization_required
    @console_ns.expect(console_ns.models[DepartmentMemberMovePayload.__name__])
    def put(self, department_id):
        user, tenant_id = current_account_with_tenant()

        accessible = DepartmentService.get_accessible_department_ids(user, tenant_id)
        is_admin_or_owner = user.is_admin_or_owner
        is_dept_admin = DepartmentService.is_department_admin(user.id, tenant_id)

        if not is_admin_or_owner and not is_dept_admin:
            console_ns.abort(403, description="No permission to move member")

        payload = console_ns.payload or {}
        args = DepartmentMemberMovePayload.model_validate(payload)

        target_dept_id = args.department_id
        if str(department_id) != target_dept_id:
            if not is_admin_or_owner:
                if accessible is not None and target_dept_id not in accessible:
                    console_ns.abort(403, description="No permission to move member to target department")

        if not is_admin_or_owner and is_dept_admin:
            user_dept_id = DepartmentService.get_user_department_id(user.id, tenant_id)
            if user_dept_id == str(department_id) and args.member_id == user.id:
                console_ns.abort(400, description="Department admin cannot move themselves")

            if accessible is not None:
                member_join_dept = DepartmentService.get_user_department_id(args.member_id, tenant_id)
                if member_join_dept and member_join_dept not in accessible:
                    console_ns.abort(403, description="No permission to move this member")

        try:
            DepartmentService.move_member_to_department(
                tenant_id=tenant_id,
                member_account_id=args.member_id,
                target_department_id=target_dept_id,
                operator_id=user.id,
                operator_ip=request.remote_addr,
            )
        except (DepartmentNotFoundError, DepartmentValidationError, DepartmentPermissionDeniedError) as e:
            _translate_error(e)
            return

        return {"result": "success"}


@console_ns.route("/departments/<uuid:department_id>/admins")
class DepartmentAdminApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @console_ns.expect(console_ns.models[DepartmentAdminPayload.__name__])
    def post(self, department_id):
        user, tenant_id = current_account_with_tenant()
        if not user.is_admin_or_owner:
            console_ns.abort(403, description="Only owner can set department admin")

        payload = console_ns.payload or {}
        args = DepartmentAdminPayload.model_validate(payload)

        try:
            DepartmentService.set_department_admin(
                tenant_id=tenant_id,
                department_id=str(department_id),
                member_account_id=args.member_id,
                operator_id=user.id,
                operator_ip=request.remote_addr,
            )
        except (DepartmentNotFoundError, DepartmentValidationError, DepartmentPermissionDeniedError) as e:
            _translate_error(e)
            return

        return {"result": "success"}

    @setup_required
    @login_required
    @account_initialization_required
    @console_ns.expect(console_ns.models[DepartmentAdminPayload.__name__])
    def delete(self, department_id):
        user, tenant_id = current_account_with_tenant()
        if not user.is_admin_or_owner:
            console_ns.abort(403, description="Only owner can remove department admin")

        payload = console_ns.payload or {}
        args = DepartmentAdminPayload.model_validate(payload)

        try:
            DepartmentService.remove_department_admin(
                tenant_id=tenant_id,
                department_id=str(department_id),
                member_account_id=args.member_id,
                operator_id=user.id,
                operator_ip=request.remote_addr,
            )
        except (DepartmentNotFoundError, DepartmentValidationError, DepartmentPermissionDeniedError) as e:
            _translate_error(e)
            return

        return {"result": "success"}


@console_ns.route("/departments/<uuid:department_id>/operation-logs")
class DepartmentOperationLogApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    def get(self, department_id):
        user, tenant_id = current_account_with_tenant()
        if not user.is_admin_or_owner:
            console_ns.abort(403, description="Only admin or owner can view operation logs")

        limit = request.args.get("limit", 100, type=int)
        if limit < 1 or limit > 100:
            console_ns.abort(400, description="limit must be between 1 and 100")

        logs = DepartmentAuditLog.query(tenant_id, "department_id", str(department_id), limit)
        return {
            "logs": [
                {
                    "id": log.id,
                    "action": log.action,
                    "content": log.content,
                    "created_at": log.created_at.isoformat() if log.created_at else None,
                    "created_ip": log.created_ip,
                }
                for log in logs
            ]
        }
