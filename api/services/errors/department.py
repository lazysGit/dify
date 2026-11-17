from services.errors.base import BaseServiceError


class DepartmentNotFoundError(BaseServiceError):
    pass


class DepartmentValidationError(BaseServiceError):
    pass


class DepartmentPermissionDeniedError(BaseServiceError):
    pass
