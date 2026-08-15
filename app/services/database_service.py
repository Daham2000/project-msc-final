import atexit
from datetime import datetime, timedelta, timezone

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import DuplicateKeyError
from werkzeug.security import check_password_hash, generate_password_hash

from .location_service import CITY_SCOPE, ISLAND_WIDE, LocationService

ANNOUNCEMENT_LIFETIME_DAYS = 7


class DatabaseService:
    def __init__(self, mongo_uri: str, database_name: str, location_service: LocationService):
        self.client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
        self.client.admin.command("ping")
        atexit.register(self.client.close)
        self.db = self.client[database_name]
        self.users = self.db["users"]
        self.announcements = self.db["announcements"]
        self.location_service = location_service

    def ensure_indexes(self) -> None:
        self.users.create_index([("email", ASCENDING)], unique=True)
        self.users.create_index([("role", ASCENDING)])
        self.users.create_index([("profile.city", ASCENDING)])
        self.announcements.create_index([("created_at", DESCENDING)])
        self.announcements.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
        self.announcements.create_index([("audience_role", ASCENDING)])
        self.announcements.create_index([("audience_scope", ASCENDING)])
        self.announcements.create_index([("cities", ASCENDING)])
        self.backfill_announcement_expirations()
        self.backfill_announcement_scopes()

    def ensure_default_admin(self, full_name: str, email: str, password: str) -> None:
        email_normalized = email.strip().lower()
        if self.users.find_one({"email": email_normalized}):
            return

        self.users.insert_one(
            {
                "full_name": full_name.strip(),
                "email": email_normalized,
                "password_hash": generate_password_hash(password),
                "role": "admin",
                "profile": {},
                "created_at": datetime.now(timezone.utc),
                "last_login_at": None,
            }
        )

    def create_citizen_user(self, payload: dict) -> dict:
        full_name = str(payload.get("full_name", "")).strip()
        email = str(payload.get("email", "")).strip().lower()
        password = str(payload.get("password", ""))
        city = str(payload.get("city", "") or "").strip()

        if not full_name or not email or not password:
            raise ValueError("Fields 'full_name', 'email', and 'password' are required.")

        # City is mandatory because notices are targeted by it; a citizen without
        # one would silently never receive city-scoped announcements.
        if not city:
            raise ValueError("Field 'city' is required. Select your city from the list.")

        city = self.location_service.normalize(city)

        profile = {
            "age": payload.get("age"),
            "gender": payload.get("gender"),
            "city": city,
            "phone": payload.get("phone"),
            "address": payload.get("address"),
        }
        profile = {key: value for key, value in profile.items() if value not in (None, "")}

        document = {
            "full_name": full_name,
            "email": email,
            "password_hash": generate_password_hash(password),
            "role": "citizen",
            "profile": profile,
            "created_at": datetime.now(timezone.utc),
            "last_login_at": None,
        }

        try:
            result = self.users.insert_one(document)
        except DuplicateKeyError:
            raise ValueError("A user with this email already exists.") from None

        document["_id"] = result.inserted_id
        return self.serialize_user(document)

    def authenticate_user(self, email: str, password: str) -> dict | None:
        email_normalized = email.strip().lower()
        user = self.users.find_one({"email": email_normalized})
        if not user:
            return None

        if not check_password_hash(user["password_hash"], password):
            return None

        now = datetime.now(timezone.utc)
        self.users.update_one({"_id": user["_id"]}, {"$set": {"last_login_at": now}})
        user["last_login_at"] = now
        return self.serialize_user(user)

    def get_user_by_id(self, user_id: str) -> dict | None:
        user = self.users.find_one({"_id": self._object_id(user_id)})
        return self.serialize_user(user) if user else None

    def list_users(self) -> list[dict]:
        users = self.users.find({}, sort=[("created_at", DESCENDING)])
        return [self.serialize_user(user) for user in users]

    def create_announcement(self, payload: dict, created_by: dict) -> dict:
        self.purge_expired_announcements()

        title = str(payload.get("title", "")).strip()
        message = str(payload.get("message", "")).strip()
        audience_role = str(payload.get("audience_role", "citizen")).strip().lower()
        audience_scope = str(payload.get("audience_scope", ISLAND_WIDE)).strip().lower()

        if not title or not message:
            raise ValueError("Fields 'title' and 'message' are required.")

        if audience_role not in {"citizen", "all"}:
            raise ValueError("Field 'audience_role' must be either 'citizen' or 'all'.")

        if audience_scope not in {ISLAND_WIDE, CITY_SCOPE}:
            raise ValueError(
                f"Field 'audience_scope' must be either '{ISLAND_WIDE}' or '{CITY_SCOPE}'."
            )

        if audience_scope == CITY_SCOPE:
            requested = payload.get("cities") or []
            if not isinstance(requested, list):
                raise ValueError("Field 'cities' must be a list of city names.")
            cities = self.location_service.normalize_many(requested)
            if not cities:
                raise ValueError("Select at least one city, or send the notice island wide.")
        else:
            # An island-wide notice carries no city list, so a later edit of the
            # city list can never accidentally narrow its reach.
            cities = []

        created_at = datetime.now(timezone.utc)
        document = {
            "title": title,
            "message": message,
            "audience_role": audience_role,
            "audience_scope": audience_scope,
            "cities": cities,
            "created_at": created_at,
            "expires_at": created_at + timedelta(days=ANNOUNCEMENT_LIFETIME_DAYS),
            "created_by": {
                "id": created_by["id"],
                "full_name": created_by["full_name"],
                "email": created_by["email"],
                "role": created_by["role"],
            },
        }
        result = self.announcements.insert_one(document)
        document["_id"] = result.inserted_id
        return self.serialize_announcement(document)

    def list_announcements_for_user(self, user: dict) -> list[dict]:
        self.purge_expired_announcements()
        announcements = self.announcements.find(
            self._active_announcements_query(user),
            sort=[("created_at", DESCENDING)],
        )
        return [self.serialize_announcement(item) for item in announcements]

    def list_announcements_for_user_after(self, user: dict, after_id: str | None) -> list[dict]:
        self.purge_expired_announcements()
        query = self._active_announcements_query(user)

        if after_id:
            query["_id"] = {"$gt": self._object_id(after_id)}

        announcements = self.announcements.find(query, sort=[("_id", ASCENDING)])
        return [self.serialize_announcement(item) for item in announcements]

    def delete_announcement(self, announcement_id: str) -> bool:
        self.purge_expired_announcements()
        try:
            object_id = self._object_id(announcement_id)
        except Exception:
            return False

        result = self.announcements.delete_one({"_id": object_id})
        return result.deleted_count > 0

    def purge_expired_announcements(self) -> int:
        result = self.announcements.delete_many({"expires_at": {"$lte": datetime.now(timezone.utc)}})
        return result.deleted_count

    def backfill_announcement_expirations(self) -> None:
        announcements = self.announcements.find({"expires_at": {"$exists": False}})
        for announcement in announcements:
            created_at = announcement.get("created_at") or datetime.now(timezone.utc)
            expires_at = created_at + timedelta(days=ANNOUNCEMENT_LIFETIME_DAYS)
            self.announcements.update_one(
                {"_id": announcement["_id"]},
                {"$set": {"expires_at": expires_at}},
            )

    def backfill_announcement_scopes(self) -> None:
        """Mark pre-existing notices as island wide so nobody loses visibility."""
        self.announcements.update_many(
            {"audience_scope": {"$exists": False}},
            {"$set": {"audience_scope": ISLAND_WIDE, "cities": []}},
        )

    @staticmethod
    def serialize_user(user: dict) -> dict:
        return {
            "id": str(user["_id"]),
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
            "profile": user.get("profile", {}),
            "created_at": DatabaseService._iso(user.get("created_at")),
            "last_login_at": DatabaseService._iso(user.get("last_login_at")),
        }

    @staticmethod
    def serialize_announcement(announcement: dict) -> dict:
        return {
            "id": str(announcement["_id"]),
            "title": announcement["title"],
            "message": announcement["message"],
            "audience_role": announcement["audience_role"],
            "audience_scope": announcement.get("audience_scope", ISLAND_WIDE),
            "cities": announcement.get("cities", []),
            "created_at": DatabaseService._iso(announcement.get("created_at")),
            "expires_at": DatabaseService._iso(announcement.get("expires_at")),
            "created_by": announcement["created_by"],
        }

    @staticmethod
    def _active_announcements_query(user: dict) -> dict:
        query = {"expires_at": {"$gt": datetime.now(timezone.utc)}}

        # Admins oversee every notice regardless of which cities it targets.
        if user["role"] == "admin":
            return query

        query["audience_role"] = {"$in": ["citizen", "all"]}

        # $ne rather than == ISLAND_WIDE so notices created before city targeting
        # existed (no audience_scope field) still count as island wide.
        reachable = [{"audience_scope": {"$ne": CITY_SCOPE}}]

        city = str((user.get("profile") or {}).get("city", "") or "").strip()
        if city:
            reachable.append({"cities": city})

        query["$or"] = reachable
        return query

    @staticmethod
    def _iso(value):
        return value.isoformat() if value else None

    @staticmethod
    def _object_id(value: str):
        from bson import ObjectId

        return ObjectId(value)
