"""Registration, authentication, and user lookups.

Validates input and applies business rules; all persistence goes through
``UserRepository``.
"""

from typing import List, Optional

from ..core.errors import ValidationError
from ..models import User, UserProfile, UserRole
from ..repositories import UserRepository
from .location_service import LocationService


class UserService:
    def __init__(self, user_repository: UserRepository, location_service: LocationService):
        self.users = user_repository
        self.location_service = location_service

    def ensure_default_admin(self, full_name: str, email: str, password: str) -> None:
        """Seed the first admin so a fresh database is immediately usable."""
        if self.users.exists_by_email(email):
            return

        admin = User.create(
            full_name=full_name,
            email=email,
            password=password,
            role=UserRole.ADMIN,
        )
        self.users.insert(admin)

    def register_citizen(self, payload: dict) -> dict:
        full_name = str(payload.get("full_name", "")).strip()
        email = str(payload.get("email", "")).strip()
        password = str(payload.get("password", ""))
        city = str(payload.get("city", "") or "").strip()

        if not full_name or not email or not password:
            raise ValidationError("Fields 'full_name', 'email', and 'password' are required.")

        # City is mandatory because notices are targeted by it; a citizen without
        # one would silently never receive city-scoped announcements.
        if not city:
            raise ValidationError("Field 'city' is required. Select your city from the list.")

        try:
            canonical_city = self.location_service.normalize(city)
        except ValueError as exc:
            raise ValidationError(str(exc)) from None

        profile = UserProfile(
            age=payload.get("age"),
            gender=payload.get("gender"),
            city=canonical_city,
            phone=payload.get("phone"),
            address=payload.get("address"),
        )

        citizen = User.create(
            full_name=full_name,
            email=email,
            password=password,
            role=UserRole.CITIZEN,
            profile=profile,
        )

        try:
            return self.users.insert(citizen).to_dict()
        except ValueError as exc:
            raise ValidationError(str(exc)) from None

    def authenticate(self, email: str, password: str) -> Optional[dict]:
        user = self.users.find_by_email(email)
        if not user or not user.verify_password(password):
            return None

        return self.users.touch_last_login(user).to_dict()

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        user = self.users.find_by_id(user_id)
        return user.to_dict() if user else None

    def get_user_model_by_id(self, user_id: str) -> Optional[User]:
        return self.users.find_by_id(user_id)

    def list_users(self) -> List[dict]:
        return [user.to_dict() for user in self.users.list_all()]
