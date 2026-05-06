from functools import wraps
from typing import Iterable

from flask import current_app, g, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer


class AuthError(Exception):
    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.status_code = status_code


class AuthService:
    def __init__(self, secret_key: str, salt: str = "smart-city-auth"):
        self.serializer = URLSafeTimedSerializer(secret_key=secret_key, salt=salt)

    def generate_token(self, user: dict) -> str:
        return self.serializer.dumps({"user_id": user["id"], "role": user["role"]})

    def verify_token(self, token: str, max_age_seconds: int = 60 * 60 * 24) -> dict:
        return self.serializer.loads(token, max_age=max_age_seconds)


def _extract_bearer_token() -> str | None:
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return None
    return authorization.split(" ", 1)[1].strip() or None


def get_authenticated_user(
    roles: Iterable[str] | None = None, allow_query_token: bool = False
):
    allowed_roles = set(roles or [])
    token = _extract_bearer_token()

    if not token and allow_query_token:
        token = str(request.args.get("token", "")).strip() or None

    if not token:
        raise AuthError("Authorization token is required.", 401)

    auth_service = current_app.extensions["auth_service"]
    database_service = current_app.extensions["database_service"]

    try:
        payload = auth_service.verify_token(token)
    except SignatureExpired as exc:
        raise AuthError("Authentication token has expired.", 401) from exc
    except BadSignature as exc:
        raise AuthError("Authentication token is invalid.", 401) from exc

    user = database_service.get_user_by_id(payload["user_id"])
    if not user:
        raise AuthError("Authenticated user no longer exists.", 401)

    if allowed_roles and user["role"] not in allowed_roles:
        raise AuthError("You do not have permission to access this resource.", 403)

    return user


def login_required(roles: Iterable[str] | None = None):
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
