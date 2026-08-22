"""Data access for the ``announcements`` collection."""

from datetime import timedelta
from typing import List, Optional

from pymongo import ASCENDING, DESCENDING

from ..models import (
    ANNOUNCEMENT_LIFETIME_DAYS,
    Announcement,
    AudienceRole,
    AudienceScope,
    UserRole,
)
from .base_repository import BaseRepository


class AnnouncementRepository(BaseRepository):
    collection_name = "announcements"
    model = Announcement

    def insert(self, announcement: Announcement) -> Announcement:
        result = self.collection.insert_one(announcement.to_document())
        announcement.id = str(result.inserted_id)
        return announcement

    def list_visible_to(
        self, role: str, city: str = "", after_id: Optional[str] = None
    ) -> List[Announcement]:
        """Active notices a reader with this role and city is allowed to see.

        ``after_id`` is used by the SSE stream to fetch only what appeared since
        the last delivered notice; results are then ordered oldest first.
        """
        query = self._visibility_query(role, city)
        sort = [("created_at", DESCENDING)]

        if after_id:
            query["_id"] = {"$gt": self._object_id(after_id)}
            sort = [("_id", ASCENDING)]

        return [Announcement.from_document(item) for item in self.collection.find(query, sort=sort)]

    def delete_by_id(self, announcement_id: str) -> bool:
        try:
            object_id = self._object_id(announcement_id)
        except ValueError:
            return False
        return self.collection.delete_one({"_id": object_id}).deleted_count > 0

    def purge_expired(self) -> int:
        """Delete lapsed notices immediately.

        The TTL index also does this, but only every ~60 seconds, so reads call
        this first to avoid briefly serving an expired notice.
        """
        result = self.collection.delete_many({"expires_at": {"$lte": Announcement.utc_now()}})
        return result.deleted_count

    def backfill_expirations(self) -> None:
        for document in self.collection.find({"expires_at": {"$exists": False}}):
            created_at = document.get("created_at") or Announcement.utc_now()
            self.collection.update_one(
                {"_id": document["_id"]},
                {"$set": {"expires_at": created_at + timedelta(days=ANNOUNCEMENT_LIFETIME_DAYS)}},
            )

    def backfill_missing_scope(self, default_scope: str) -> None:
        self.collection.update_many(
            {"audience_scope": {"$exists": False}},
            {"$set": {"audience_scope": default_scope, "cities": []}},
        )

    @staticmethod
    def _visibility_query(role: str, city: str) -> dict:
        query = {"expires_at": {"$gt": Announcement.utc_now()}}

        # Admins oversee every notice regardless of which cities it targets.
        if role == UserRole.ADMIN:
            return query

        query["audience_role"] = {"$in": [AudienceRole.CITIZEN, AudienceRole.ALL]}

        # $ne rather than == ISLAND_WIDE so notices created before city targeting
        # existed (no audience_scope field) still count as island wide.
        reachable = [{"audience_scope": {"$ne": AudienceScope.CITIES}}]
        if city:
            reachable.append({"cities": city})

        query["$or"] = reachable
        return query
