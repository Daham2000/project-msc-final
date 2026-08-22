"""Issues and verifies the signed API tokens."""

from itsdangerous import URLSafeTimedSerializer

TOKEN_LIFETIME_SECONDS = 60 * 60 * 24


class AuthService:
    """Stateless token handling.

    The token is a signed payload rather than a stored session, so it carries
    the user id and role and is validated purely by signature and age.
    """

    def __init__(self, secret_key: str, salt: str = "smart-city-auth"):
        self.serializer = URLSafeTimedSerializer(secret_key=secret_key, salt=salt)

    def generate_token(self, user: dict) -> str:
        return self.serializer.dumps({"user_id": user["id"], "role": user["role"]})

    def verify_token(self, token: str, max_age_seconds: int = TOKEN_LIFETIME_SECONDS) -> dict:
        """Raises itsdangerous BadSignature / SignatureExpired on failure."""
        return self.serializer.loads(token, max_age=max_age_seconds)
