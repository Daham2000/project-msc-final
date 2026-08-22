"""Application-level exceptions that map cleanly onto HTTP responses."""


class AppError(Exception):
    """Base class for errors the API turns into a JSON body."""

    status_code = 400

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        if status_code is not None:
            self.status_code = status_code


class ValidationError(AppError):
    """Bad or missing input from the client."""

    status_code = 400


class AuthError(AppError):
    """Missing, invalid, or insufficiently privileged credentials."""

    status_code = 401


class NotFoundError(AppError):
    status_code = 404
