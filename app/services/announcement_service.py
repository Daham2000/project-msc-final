"""Creating, reading, and deleting announcements.

Owns the audience rules; ``AnnouncementRepository`` owns the queries.
"""

from typing import List, Optional

from ..core.errors import ValidationError
from ..models import Announcement, AnnouncementAuthor, AudienceRole, AudienceScope
from ..repositories import AnnouncementRepository
from .location_service import LocationService


class AnnouncementService:
    def __init__(
        self,
        announcement_repository: AnnouncementRepository,
        location_service: LocationService,
    ):
        self.announcements = announcement_repository
        self.location_service = location_service

    def create(self, payload: dict, created_by: dict) -> dict:
        self.announcements.purge_expired()

        title = str(payload.get("title", "")).strip()
        message = str(payload.get("message", "")).strip()
        audience_role = str(payload.get("audience_role", AudienceRole.CITIZEN)).strip().lower()
        audience_scope = str(payload.get("audience_scope", AudienceScope.ISLAND_WIDE)).strip().lower()

        if not title or not message:
            raise ValidationError("Fields 'title' and 'message' are required.")

        if audience_role not in AudienceRole.CHOICES:
            raise ValidationError(
                f"Field 'audience_role' must be either "
                f"'{AudienceRole.CITIZEN}' or '{AudienceRole.ALL}'."
            )

        if audience_scope not in AudienceScope.CHOICES:
            raise ValidationError(
                f"Field 'audience_scope' must be either "
                f"'{AudienceScope.ISLAND_WIDE}' or '{AudienceScope.CITIES}'."
            )

        cities = self._resolve_cities(payload, audience_scope)

        announcement = Announcement.create(
            title=title,
            message=message,
            created_by=AnnouncementAuthor.from_user(created_by),
            audience_role=audience_role,
            audience_scope=audience_scope,
            cities=cities,
        )
        return self.announcements.insert(announcement).to_dict()

    def list_for_user(self, user: dict, after_id: Optional[str] = None) -> List[dict]:
        self.announcements.purge_expired()
        city = str((user.get("profile") or {}).get("city", "") or "").strip()
        found = self.announcements.list_visible_to(
            role=user["role"], city=city, after_id=after_id
        )
        return [announcement.to_dict() for announcement in found]

    def delete(self, announcement_id: str) -> bool:
        self.announcements.purge_expired()
        return self.announcements.delete_by_id(announcement_id)

    def _resolve_cities(self, payload: dict, audience_scope: str) -> List[str]:
        if audience_scope != AudienceScope.CITIES:
            return []

        requested = payload.get("cities") or []
        if not isinstance(requested, list):
            raise ValidationError("Field 'cities' must be a list of city names.")

        try:
            cities = self.location_service.normalize_many(requested)
        except ValueError as exc:
            raise ValidationError(str(exc)) from None

        if not cities:
            raise ValidationError("Select at least one city, or send the notice island wide.")

        return cities
