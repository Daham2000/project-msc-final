"""Request-level authentication: reads the bearer token and loads the user."""

from functools import wraps
from typing import Iterable

from flask import current_app, g, jsonify, request
from itsdangerous import BadSignature, SignatureExpired

from .errors import AuthError


def _extract_bearer_token() -> str | None:
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return None
    return authorization.split(" ", 1)[1].strip() or None


def get_authenticated_user(roles: Iterable[str] | None = None, allow_query_token: bool = False):
    """Resolve the caller into a user dict, or raise AuthError.

    ``allow_query_token`` exists for the SSE endpoint: EventSource cannot set an
    Authorization header, so the token arrives as a query parameter there.
    """
    allowed_roles = set(roles or [])
    token = _extract_bearer_token()

    if not token and allow_query_token:
        token = str(request.args.get("token", "")).strip() or None

    if not token:
        raise AuthError("Authorization token is required.", 401)

    auth_service = current_app.extensions["auth_service"]
    user_service = current_app.extensions["user_service"]

    try:
        payload = auth_service.verify_token(token)
    except SignatureExpired as exc:
        raise AuthError("Authentication token has expired.", 401) from exc
    except BadSignature as exc:
        raise AuthError("Authentication token is invalid.", 401) from exc

    user = user_service.get_user_by_id(payload["user_id"])
    if not user:
        raise AuthError("Authenticated user no longer exists.", 401)

    if allowed_roles and user["role"] not in allowed_roles:
        raise AuthError("You do not have permission to access this resource.", 403)

    return user


def login_required(roles: Iterable[str] | None = None):
    """Guard a view and expose the caller as ``g.current_user``."""

    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            try:
                g.current_user = get_authenticated_user(roles=roles)
            except AuthError as exc:
                return jsonify({"error": str(exc)}), exc.status_code

            return view(*args, **kwargs)

        return wrapped

    return decorator
