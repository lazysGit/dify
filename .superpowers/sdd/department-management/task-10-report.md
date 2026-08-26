# Task 10 Report: Member API Extension + Remove Invitation System

## Status: DONE

## Summary

Extended member APIs with department fields and removed the entire invitation system (invite-email endpoint, activate flow, invite tokens, frontend invite UI).

## Changes

### Backend
- **Deleted** `api/controllers/console/auth/activate.py` (activate endpoints)
- **Deleted** `api/tasks/mail_invite_member_task.py` (invite email task)
- **Modified** `api/services/account_service.py`: removed all invite methods (`invite_new_member`, `generate_invite_token`, `is_valid_invite_token`, `revoke_token`, `get_invitation_*`, `_get_invitation_token_key`); removed `invite_token` param from `authenticate`; enhanced `get_tenant_members` with batch department info query
- **Modified** `api/controllers/console/auth/login.py`: removed `invite_token` from `LoginPayload` and login flow
- **Modified** `api/controllers/console/auth/oauth.py`: removed invite_token from OAuth login/callback
- **Modified** `api/libs/workspace_permission.py`: deleted `check_workspace_member_invite_permission`
- **Modified** `api/controllers/console/workspace/members.py`: deleted `MemberInviteEmailApi`; added `MemberCreateApi`, `MemberCreatedResourcesApi`, `MemberOperationLogApi`; modified `MemberListApi` with permission tightening and department fields; modified `MemberUpdateRoleApi` to revoke department admin on role downgrade
- **Modified** `api/services/department_service.py`: added `get_member_created_resources`
- **Modified** `api/fields/member_fields.py`: added `department_id`, `department_name`, `is_department_admin` to `AccountWithRole`
- **Modified** `api/controllers/console/__init__.py`: removed activate import

### Frontend
- **Deleted** `web/app/signin/invite-settings/` directory
- **Deleted** `web/app/activate/` directory
- **Modified** signin components: removed invite_token/isInvite logic from `normal-form.tsx`, `mail-and-password-auth.tsx`, `mail-and-code-auth.tsx`, `sso-auth.tsx`, `social-auth.tsx`, `check-code/page.tsx`
- **Deleted** `invitationCheck` and `activateMember` from `web/service/common.ts`
- **Deleted** `useInvitationCheck` from `web/service/use-common.ts`
- **Modified** `web/service/sso.ts`: removed invite_token params

### Tests
- **Deleted** `api/tests/unit_tests/controllers/console/test_workspace_members.py`
- **Deleted** `api/tests/unit_tests/controllers/console/auth/test_account_activation.py`
- **Deleted** `api/tests/test_containers_integration_tests/tasks/test_mail_invite_member_task.py`
- **Deleted** `web/app/components/header/account-setting/members-page/__tests__/invite-button.spec.tsx`
- **Modified** test files to remove invite-related tests and fix assertions

## Test Summary
80 passed in targeted test files (members, login, auth security, account service, workspace permission).

## Concerns
- The `MemberListApi` now requires admin or department admin role; non-admin non-dept-admin users get 403.
- OAuth `get_authorization_url` still accepts optional `invite_token` in the library (`api/libs/oauth.py`) but it is no longer passed from the controller. The library parameter could be cleaned up in a follow-up.
