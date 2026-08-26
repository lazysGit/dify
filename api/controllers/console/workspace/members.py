from flask import abort, request
from flask_restx import Resource
from pydantic import BaseModel, TypeAdapter

import services
from controllers.common.schema import register_enum_models, register_schema_models
from controllers.console import console_ns
from controllers.console.auth.error import (
    CannotTransferOwnerToSelfError,
    EmailCodeError,
    InvalidEmailError,
    InvalidTokenError,
    MemberNotInTenantError,
    NotOwnerError,
    OwnerTransferLimitError,
)
from controllers.console.error import EmailSendIpLimitError
from controllers.console.wraps import (
    account_initialization_required,
    cloud_edition_billing_resource_check,
    decrypt_password_field,
    is_allow_transfer_owner,
    setup_required,
)
from extensions.ext_database import db
from fields.member_fields import AccountWithRole, AccountWithRoleList
from libs.helper import extract_remote_ip
from libs.login import current_account_with_tenant, login_required
from models.account import Account, TenantAccountJoin, TenantAccountRole
from services.account_service import AccountService, RegisterService, TenantService
from services.department_service import DepartmentAuditLog, DepartmentService

DEFAULT_REF_TEMPLATE_SWAGGER_2_0 = "#/definitions/{model}"


class MemberCreatePayload(BaseModel):
    name: str
    email: str
    password: str
    department_id: str
    role: str


class MemberRoleUpdatePayload(BaseModel):
    role: str


class OwnerTransferEmailPayload(BaseModel):
    language: str | None = None


class OwnerTransferCheckPayload(BaseModel):
    code: str
    token: str


class OwnerTransferPayload(BaseModel):
    token: str


def reg(cls: type[BaseModel]):
    console_ns.schema_model(cls.__name__, cls.model_json_schema(ref_template=DEFAULT_REF_TEMPLATE_SWAGGER_2_0))


reg(MemberCreatePayload)
reg(MemberRoleUpdatePayload)
reg(OwnerTransferEmailPayload)
reg(OwnerTransferCheckPayload)
reg(OwnerTransferPayload)
register_enum_models(console_ns, TenantAccountRole)
register_schema_models(console_ns, AccountWithRole, AccountWithRoleList)


@console_ns.route("/workspaces/current/members")
class MemberListApi(Resource):
    """List all members of current tenant."""

    @setup_required
    @login_required
    @account_initialization_required
    @console_ns.response(200, "Success", console_ns.models[AccountWithRoleList.__name__])
    def get(self):
        current_user, _ = current_account_with_tenant()
        if not current_user.current_tenant:
            raise ValueError("No current tenant")

        tenant_id = current_user.current_tenant.id
        is_admin_or_owner = current_user.is_admin_or_owner
        is_dept_admin = DepartmentService.is_department_admin(current_user.id, tenant_id)

        if not is_admin_or_owner and not is_dept_admin:
            return {"code": "forbidden", "message": "Only admin or department admin can list members"}, 403

        members = TenantService.get_tenant_members(current_user.current_tenant)

        if not is_admin_or_owner and is_dept_admin:
            manageable = DepartmentService.get_manageable_department_ids(current_user, tenant_id)
            members = [m for m in members if getattr(m, "department_id", None) in manageable]

        member_models = TypeAdapter(list[AccountWithRole]).validate_python(members, from_attributes=True)
        response = AccountWithRoleList(accounts=member_models)
        return response.model_dump(mode="json"), 200


@console_ns.route("/workspaces/current/members/<uuid:member_id>")
class MemberCancelInviteApi(Resource):
    """Remove a member from the workspace."""

    @setup_required
    @login_required
    @account_initialization_required
    def delete(self, member_id):
        current_user, _ = current_account_with_tenant()
        if not current_user.current_tenant:
            raise ValueError("No current tenant")
        member = db.session.get(Account, str(member_id))
        if member is None:
            abort(404)
        else:
            try:
                TenantService.remove_member_from_tenant(current_user.current_tenant, member, current_user)
            except services.errors.account.CannotOperateSelfError as e:
                return {"code": "cannot-operate-self", "message": str(e)}, 400
            except services.errors.account.NoPermissionError as e:
                return {"code": "forbidden", "message": str(e)}, 403
            except services.errors.account.MemberNotInTenantError as e:
                return {"code": "member-not-found", "message": str(e)}, 404
            except Exception as e:
                raise ValueError(str(e))

        return {
            "result": "success",
            "tenant_id": str(current_user.current_tenant.id) if current_user.current_tenant else "",
        }, 200


@console_ns.route("/workspaces/current/members/<uuid:member_id>/update-role")
class MemberUpdateRoleApi(Resource):
    """Update member role."""

    @console_ns.expect(console_ns.models[MemberRoleUpdatePayload.__name__])
    @setup_required
    @login_required
    @account_initialization_required
    def put(self, member_id):
        payload = console_ns.payload or {}
        args = MemberRoleUpdatePayload.model_validate(payload)
        new_role = args.role

        if not TenantAccountRole.is_valid_role(new_role):
            return {"code": "invalid-role", "message": "Invalid role"}, 400
        current_user, _ = current_account_with_tenant()
        if not current_user.current_tenant:
            raise ValueError("No current tenant")
        member = db.session.get(Account, str(member_id))
        if not member:
            abort(404)

        try:
            assert member is not None, "Member not found"
            tenant_id = current_user.current_tenant.id

            old_join = (
                db.session.query(TenantAccountJoin)
                .filter_by(tenant_id=tenant_id, account_id=member.id).first()
            )
            was_dept_admin = old_join.is_department_admin if old_join else False

            TenantService.update_member_role(current_user.current_tenant, member, new_role, current_user)

            if was_dept_admin and new_role in {
                TenantAccountRole.NORMAL,
                TenantAccountRole.DATASET_OPERATOR,
            }:
                DepartmentService.revoke_department_admin_and_notify(
                    tenant_id=tenant_id,
                    account_id=member.id,
                    reason="role_downgrade",
                )
        except Exception as e:
            raise ValueError(str(e))

        return {"result": "success"}


@console_ns.route("/workspaces/current/members/create")
class MemberCreateApi(Resource):
    """Create a new member by admin."""

    @console_ns.expect(console_ns.models[MemberCreatePayload.__name__])
    @setup_required
    @login_required
    @account_initialization_required
    @decrypt_password_field
    @cloud_edition_billing_resource_check("members")
    def post(self):
        payload = console_ns.payload or {}
        args = MemberCreatePayload.model_validate(payload)

        current_user, _ = current_account_with_tenant()
        if not current_user.current_tenant:
            raise ValueError("No current tenant")

        tenant_id = current_user.current_tenant.id

        if not TenantAccountRole.is_non_owner_role(args.role):
            return {"code": "invalid-role", "message": "Invalid role"}, 400

        if not current_user.is_admin_or_owner:
            is_dept_admin = DepartmentService.is_department_admin(current_user.id, tenant_id)
            if not is_dept_admin:
                return {"code": "forbidden", "message": "Only admin or department admin can create members"}, 403

        try:
            account = RegisterService.create_member_by_admin(
                operator=current_user,
                tenant_id=tenant_id,
                name=args.name,
                email=args.email,
                password=args.password,
                department_id=args.department_id,
                role=TenantAccountRole(args.role),
            )
        except Exception as e:
            raise ValueError(str(e))

        join = (
            db.session.query(TenantAccountJoin)
            .filter_by(tenant_id=tenant_id, account_id=account.id).first()
        )

        from models.department import Department

        dept_name = ""
        if join and join.department_id:
            dept = db.session.query(Department).filter_by(id=join.department_id).first()
            dept_name = dept.name if dept else ""

        return {
            "id": account.id,
            "name": account.name,
            "email": account.email,
            "department_id": join.department_id if join else None,
            "role": join.role if join else None,
            "is_department_admin": join.is_department_admin if join else False,
            "created_at": int(account.created_at.timestamp()) if account.created_at else None,
            "department_name": dept_name,
        }, 201


@console_ns.route("/workspaces/current/members/<uuid:member_id>/created-resources")
class MemberCreatedResourcesApi(Resource):
    """Get resources created by a member (G1)."""

    @setup_required
    @login_required
    @account_initialization_required
    def get(self, member_id):
        current_user, _ = current_account_with_tenant()
        if not current_user.current_tenant:
            raise ValueError("No current tenant")

        tenant_id = current_user.current_tenant.id

        if not current_user.is_admin_or_owner:
            is_dept_admin = DepartmentService.is_department_admin(current_user.id, tenant_id)
            if not is_dept_admin:
                return {"code": "forbidden", "message": "Forbidden"}, 403

        try:
            resources = DepartmentService.get_member_created_resources(tenant_id, str(member_id))
        except Exception as e:
            raise ValueError(str(e))

        if not current_user.is_admin_or_owner:
            manageable = DepartmentService.get_manageable_department_ids(current_user, tenant_id)
            resources["apps"] = [a for a in resources["apps"] if a.get("department_id") in manageable]
            resources["datasets"] = [d for d in resources["datasets"] if d.get("department_id") in manageable]

        return resources, 200


@console_ns.route("/workspaces/current/members/<uuid:member_id>/operation-logs")
class MemberOperationLogApi(Resource):
    """Get operation logs for a member (G2)."""

    @setup_required
    @login_required
    @account_initialization_required
    def get(self, member_id):
        current_user, _ = current_account_with_tenant()
        if not current_user.current_tenant:
            raise ValueError("No current tenant")

        if not current_user.is_admin_or_owner:
            return {"code": "forbidden", "message": "Only owner/admin can view operation logs"}, 403

        tenant_id = current_user.current_tenant.id
        limit = request.args.get("limit", 100, type=int)

        try:
            logs = DepartmentAuditLog.query(tenant_id, "account_id", str(member_id), limit)
        except Exception as e:
            raise ValueError(str(e))

        return {
            "logs": [
                {
                    "id": log.id,
                    "action": log.action,
                    "content": log.content,
                    "created_at": int(log.created_at.timestamp()) if log.created_at else None,
                    "created_ip": log.created_ip,
                }
                for log in logs
            ]
        }, 200


@console_ns.route("/workspaces/current/dataset-operators")
class DatasetOperatorMemberListApi(Resource):
    """List all members of current tenant."""

    @setup_required
    @login_required
    @account_initialization_required
    @console_ns.response(200, "Success", console_ns.models[AccountWithRoleList.__name__])
    def get(self):
        current_user, _ = current_account_with_tenant()
        if not current_user.current_tenant:
            raise ValueError("No current tenant")
        members = TenantService.get_dataset_operator_members(current_user.current_tenant)
        member_models = TypeAdapter(list[AccountWithRole]).validate_python(members, from_attributes=True)
        response = AccountWithRoleList(accounts=member_models)
        return response.model_dump(mode="json"), 200


@console_ns.route("/workspaces/current/members/send-owner-transfer-confirm-email")
class SendOwnerTransferEmailApi(Resource):
    """Send owner transfer email."""

    @console_ns.expect(console_ns.models[OwnerTransferEmailPayload.__name__])
    @setup_required
    @login_required
    @account_initialization_required
    @is_allow_transfer_owner
    def post(self):
        payload = console_ns.payload or {}
        args = OwnerTransferEmailPayload.model_validate(payload)
        ip_address = extract_remote_ip(request)
        if AccountService.is_email_send_ip_limit(ip_address):
            raise EmailSendIpLimitError()
        current_user, _ = current_account_with_tenant()
        # check if the current user is the owner of the workspace
        if not current_user.current_tenant:
            raise ValueError("No current tenant")
        if not TenantService.is_owner(current_user, current_user.current_tenant):
            raise NotOwnerError()

        if args.language is not None and args.language == "zh-Hans":
            language = "zh-Hans"
        else:
            language = "en-US"

        email = current_user.email

        token = AccountService.send_owner_transfer_email(
            account=current_user,
            email=email,
            language=language,
            workspace_name=current_user.current_tenant.name if current_user.current_tenant else "",
        )

        return {"result": "success", "data": token}


@console_ns.route("/workspaces/current/members/owner-transfer-check")
class OwnerTransferCheckApi(Resource):
    @console_ns.expect(console_ns.models[OwnerTransferCheckPayload.__name__])
    @setup_required
    @login_required
    @account_initialization_required
    @is_allow_transfer_owner
    def post(self):
        payload = console_ns.payload or {}
        args = OwnerTransferCheckPayload.model_validate(payload)
        # check if the current user is the owner of the workspace
        current_user, _ = current_account_with_tenant()
        if not current_user.current_tenant:
            raise ValueError("No current tenant")
        if not TenantService.is_owner(current_user, current_user.current_tenant):
            raise NotOwnerError()

        user_email = current_user.email

        is_owner_transfer_error_rate_limit = AccountService.is_owner_transfer_error_rate_limit(user_email)
        if is_owner_transfer_error_rate_limit:
            raise OwnerTransferLimitError()

        token_data = AccountService.get_owner_transfer_data(args.token)
        if token_data is None:
            raise InvalidTokenError()

        if user_email != token_data.get("email"):
            raise InvalidEmailError()

        if args.code != token_data.get("code"):
            AccountService.add_owner_transfer_error_rate_limit(user_email)
            raise EmailCodeError()

        # Verified, revoke the first token
        AccountService.revoke_owner_transfer_token(args.token)

        # Refresh token data by generating a new token
        _, new_token = AccountService.generate_owner_transfer_token(user_email, code=args.code, additional_data={})

        AccountService.reset_owner_transfer_error_rate_limit(user_email)
        return {"is_valid": True, "email": token_data.get("email"), "token": new_token}


@console_ns.route("/workspaces/current/members/<uuid:member_id>/owner-transfer")
class OwnerTransfer(Resource):
    @console_ns.expect(console_ns.models[OwnerTransferPayload.__name__])
    @setup_required
    @login_required
    @account_initialization_required
    @is_allow_transfer_owner
    def post(self, member_id):
        payload = console_ns.payload or {}
        args = OwnerTransferPayload.model_validate(payload)

        # check if the current user is the owner of the workspace
        current_user, _ = current_account_with_tenant()
        if not current_user.current_tenant:
            raise ValueError("No current tenant")
        if not TenantService.is_owner(current_user, current_user.current_tenant):
            raise NotOwnerError()

        if current_user.id == str(member_id):
            raise CannotTransferOwnerToSelfError()

        transfer_token_data = AccountService.get_owner_transfer_data(args.token)
        if not transfer_token_data:
            raise InvalidTokenError()

        if transfer_token_data.get("email") != current_user.email:
            raise InvalidEmailError()

        AccountService.revoke_owner_transfer_token(args.token)

        member = db.session.get(Account, str(member_id))
        if not member:
            abort(404)
            return  # Never reached, but helps type checker

        if not current_user.current_tenant:
            raise ValueError("No current tenant")
        if not TenantService.is_member(member, current_user.current_tenant):
            raise MemberNotInTenantError()

        try:
            assert member is not None, "Member not found"
            TenantService.update_member_role(current_user.current_tenant, member, "owner", current_user)

            AccountService.send_new_owner_transfer_notify_email(
                account=member,
                email=member.email,
                workspace_name=current_user.current_tenant.name if current_user.current_tenant else "",
            )

            AccountService.send_old_owner_transfer_notify_email(
                account=current_user,
                email=current_user.email,
                workspace_name=current_user.current_tenant.name if current_user.current_tenant else "",
                new_owner_email=member.email,
            )

        except Exception as e:
            raise ValueError(str(e))

        return {"result": "success"}
