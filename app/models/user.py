"""The ``users`` collection.

Collection: users
    _id             ObjectId
    full_name       string
    email           string, unique, lower-cased
    password_hash   string  (never leaves the backend)
    role            "admin" | "citizen"
    profile         embedded UserProfile document
    created_at      datetime (UTC)
    last_login_at   datetime (UTC) | null
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional

from werkzeug.security import check_password_hash, generate_password_hash

from .base import BaseModel
from .enums import UserRole


@dataclass
class UserProfile:
    """Optional citizen details embedded inside the user document.

    ``city`` is the one field the rest of the system depends on: city-scoped
    announcements are matched against it.
    """

    age: Optional[Any] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

    @classmethod
    def from_document(cls, document: Optional[Dict[str, Any]]) -> "UserProfile":
        document = document or {}
        return cls(
            age=document.get("age"),
            gender=document.get("gender"),
            city=document.get("city"),
            phone=document.get("phone"),
            address=document.get("address"),
        )

    def to_document(self) -> Dict[str, Any]:
        """Empty fields are dropped so the stored profile stays sparse."""
        values = {
            "age": self.age,
            "gender": self.gender,
            "city": self.city,
            "phone": self.phone,
            "address": self.address,
        }
        return {key: value for key, value in values.items() if value not in (None, "")}

    def to_dict(self) -> Dict[str, Any]:
        return self.to_document()


@dataclass
class User(BaseModel):
    full_name: str
    email: str
    password_hash: str
    role: str = UserRole.CITIZEN
    profile: UserProfile = field(default_factory=UserProfile)
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    id: Optional[str] = None

    @classmethod
    def create(
        cls,
        full_name: str,
        email: str,
        password: str,
        role: str = UserRole.CITIZEN,
        profile: Optional[UserProfile] = None,
    ) -> "User":
        """Build a new user, hashing the password before it is ever stored."""
        if role not in UserRole.CHOICES:
            raise ValueError(f"Role must be one of: {', '.join(sorted(UserRole.CHOICES))}")

        return cls(
            full_name=full_name.strip(),
            email=cls.normalize_email(email),
            password_hash=generate_password_hash(password),
            role=role,
            profile=profile or UserProfile(),
            created_at=cls.utc_now(),
            last_login_at=None,
        )

    @staticmethod
    def normalize_email(email: str) -> str:
        """Emails are stored lower-cased so the unique index is case-insensitive."""
        return str(email or "").strip().lower()

    def verify_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @property
    def city(self) -> str:
        return str(self.profile.city or "").strip()

    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    @classmethod
    def from_document(cls, document: Dict[str, Any]) -> "User":
        return cls(
            id=str(document["_id"]),
            full_name=document["full_name"],
            email=document["email"],
            password_hash=document["password_hash"],
            role=document["role"],
            profile=UserProfile.from_document(document.get("profile")),
            created_at=document.get("created_at"),
            last_login_at=document.get("last_login_at"),
        )

    def to_document(self) -> Dict[str, Any]:
        return {
            "full_name": self.full_name,
            "email": self.email,
            "password_hash": self.password_hash,
            "role": self.role,
            "profile": self.profile.to_document(),
            "created_at": self.created_at,
            "last_login_at": self.last_login_at,
        }

    def to_dict(self) -> Dict[str, Any]:
        """API representation. The password hash is deliberately excluded."""
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "profile": self.profile.to_dict(),
            "created_at": self.iso(self.created_at),
            "last_login_at": self.iso(self.last_login_at),
        }
