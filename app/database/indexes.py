"""Index definitions and one-off data backfills.

Called once at start-up from the application factory.
"""

from pymongo import ASCENDING, DESCENDING

from ..models import AudienceScope


def ensure_indexes(user_repository, announcement_repository) -> None:
    _ensure_user_indexes(user_repository.collection)
    _ensure_announcement_indexes(announcement_repository.collection)
    _backfill_announcements(announcement_repository)


def _ensure_user_indexes(users) -> None:
    users.create_index([("email", ASCENDING)], unique=True)
    users.create_index([("role", ASCENDING)])
    users.create_index([("profile.city", ASCENDING)])


def _ensure_announcement_indexes(announcements) -> None:
    announcements.create_index([("created_at", DESCENDING)])
    # TTL index: MongoDB removes the document once expires_at passes.
    announcements.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
    announcements.create_index([("audience_role", ASCENDING)])
    announcements.create_index([("audience_scope", ASCENDING)])
    announcements.create_index([("cities", ASCENDING)])


def _backfill_announcements(announcement_repository) -> None:
    """Bring documents written by earlier versions up to the current shape."""
    announcement_repository.backfill_expirations()
    # Mark pre-existing notices as island wide so nobody loses visibility.
    announcement_repository.backfill_missing_scope(AudienceScope.ISLAND_WIDE)
