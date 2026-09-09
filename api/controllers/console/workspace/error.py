from libs.exception import BaseHTTPException


class RepeatPasswordNotMatchError(BaseHTTPException):
    error_code = "repeat_password_not_match"
    description = "New password and repeat password does not match."
    code = 400


class CurrentPasswordIncorrectError(BaseHTTPException):
    error_code = "current_password_incorrect"
    description = "Current password is incorrect."
    code = 400


class InvalidInvitationCodeError(BaseHTTPException):
    error_code = "invalid_invitation_code"
    description = "Invalid invitation code."
    code = 400


class AccountAlreadyInitedError(BaseHTTPException):
    error_code = "account_already_inited"
    description = "The account has been initialized. Please refresh the page."
    code = 400


class AccountNotInitializedError(BaseHTTPException):
    error_code = "account_not_initialized"
    description = "The account has not been initialized yet. Please proceed with the initialization process first."
    code = 400


class MustChangePasswordError(BaseHTTPException):
    error_code = "must_change_password"
    description = "The current password matches the default member password. Please change your password first."
    code = 400


class DefaultPasswordNotAllowedError(BaseHTTPException):
    error_code = "default_password_not_allowed"
    description = "New password cannot be the default member password."
    code = 400


class InvalidAccountDeletionCodeError(BaseHTTPException):
    error_code = "invalid_account_deletion_code"
    description = "Invalid account deletion code."
    code = 400
