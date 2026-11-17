from services.errors.base import BaseServiceError


class ModelPermissionDeniedError(BaseServiceError):
    """Raised when a non-privileged user attempts a whitelist management operation."""


class InvalidModelError(BaseServiceError):
    """Raised when a whitelist entry references a model absent from the workspace catalogue."""
