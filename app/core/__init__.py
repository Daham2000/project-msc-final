"""Cross-cutting concerns shared by the API and service layers."""

from .errors import AppError, AuthError, NotFoundError, ValidationError
from .security import get_authenticated_user, login_required

__all__ = [
    "AppError",
    "AuthError",
    "NotFoundError",
    "ValidationError",
    "get_authenticated_user",
    "login_required",
]
