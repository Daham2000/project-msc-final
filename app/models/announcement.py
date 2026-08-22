"""The ``announcements`` collection.

Collection: announcements
    _id             ObjectId
    title           string
    message         string
    audience_role   "citizen" | "all"
    audience_scope  "island_wide" | "cities"
    cities          list[string]   (empty for an island-wide notice)
    created_at      datetime (UTC)
    expires_at      datetime (UTC)  - TTL index removes the document
    created_by      embedded AnnouncementAuthor document
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from .base import BaseModel
from .enums import AudienceRole, AudienceScope

# A notice is only relevant for a week; the TTL index deletes it afterwards so
# the collection never accumulates stale content.
ANNOUNCEMENT_LIFETIME_DAYS = 7


@dataclass
class AnnouncementAuthor:
    """Snapshot of the admin who published the notice.

    Copied rather than referenced so the notice still reads correctly if the
    admin account is later renamed or removed.
    """

    id: str
    full_name: str
    email: str
    role: str

    @classmethod
    def from_document(cls, document: Dict[str, Any]) -> "AnnouncementAuthor":
        return cls(
            id=str(document.get("id", "")),
            full_name=document.get("full_name", ""),
            email=document.get("email", ""),
            role=document.get("role", ""),
        )

    @classmethod
    def from_user(cls, user: Dict[str, Any]) -> "AnnouncementAuthor":
        return cls(
            id=user["id"],
            full_name=user["full_name"],
            email=user["email"],
            role=user["role"],
        )

    def to_document(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
        }

    def to_dict(self) -> Dict[str, Any]:
        return self.to_document()


@dataclass
class Announcement(BaseModel):
    title: str
    message: str
    created_by: AnnouncementAuthor
    audience_role: str = AudienceRole.CITIZEN
    audience_scope: str = AudienceScope.ISLAND_WIDE
    cities: List[str] = field(default_factory=list)
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    id: Optional[str] = None

    @classmethod
    def create(
        cls,
        title: str,
        message: str,
        created_by: AnnouncementAuthor,
        audience_role: str = AudienceRole.CITIZEN,
        audience_scope: str = AudienceScope.ISLAND_WIDE,
        cities: Optional[List[str]] = None,
        lifetime_days: int = ANNOUNCEMENT_LIFETIME_DAYS,
    ) -> "Announcement":
        created_at = cls.utc_now()
        return cls(
            title=title.strip(),
            message=message.strip(),
            created_by=created_by,
            audience_role=audience_role,
            audience_scope=audience_scope,
            # An island-wide notice carries no city list, so a later edit of the
            # city list can never accidentally narrow its reach.
            cities=list(cities or []) if audience_scope == AudienceScope.CITIES else [],
            created_at=created_at,
            expires_at=created_at + timedelta(days=lifetime_days),
        )

    def is_island_wide(self) -> bool:
        return self.audience_scope != AudienceScope.CITIES

    @classmethod
    def from_document(cls, document: Dict[str, Any]) -> "Announcement":
        return cls(
            id=str(document["_id"]),
            title=document["title"],
            message=document["message"],
            created_by=AnnouncementAuthor.from_document(document.get("created_by", {})),
            audience_role=document.get("audience_role", AudienceRole.CITIZEN),
            # Notices created before city targeting existed have no scope field.
            audience_scope=document.get("audience_scope", AudienceScope.ISLAND_WIDE),
            cities=list(document.get("cities", [])),
            created_at=document.get("created_at"),
            expires_at=document.get("expires_at"),
        )

    def to_document(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "message": self.message,
            "audience_role": self.audience_role,
            "audience_scope": self.audience_scope,
            "cities": self.cities,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "created_by": self.created_by.to_document(),
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "audience_role": self.audience_role,
            "audience_scope": self.audience_scope,
            "cities": self.cities,
            "created_at": self.iso(self.created_at),
            "expires_at": self.iso(self.expires_at),
            "created_by": self.created_by.to_dict(),
        }
