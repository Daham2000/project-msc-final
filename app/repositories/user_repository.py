"""Data access for the ``users`` collection."""

from typing import List, Optional

from pymongo import DESCENDING
from pymongo.errors import DuplicateKeyError

from ..models import User
from .base_repository import BaseRepository


class UserRepository(BaseRepository):
    collection_name = "users"
    model = User

    def insert(self, user: User) -> User:
        try:
            result = self.collection.insert_one(user.to_document())
        except DuplicateKeyError:
            raise ValueError("A user with this email already exists.") from None

        user.id = str(result.inserted_id)
        return user

    def find_by_email(self, email: str) -> Optional[User]:
        document = self.collection.find_one({"email": User.normalize_email(email)})
        return self._to_model(document)

    def find_by_id(self, user_id: str) -> Optional[User]:
        try:
            object_id = self._object_id(user_id)
        except ValueError:
            return None
        return self._to_model(self.collection.find_one({"_id": object_id}))

    def exists_by_email(self, email: str) -> bool:
        return self.collection.count_documents({"email": User.normalize_email(email)}, limit=1) > 0

    def list_all(self) -> List[User]:
        documents = self.collection.find({}, sort=[("created_at", DESCENDING)])
        return [User.from_document(document) for document in documents]

    def touch_last_login(self, user: User) -> User:
        now = User.utc_now()
        self.collection.update_one(
            {"_id": self._object_id(user.id)}, {"$set": {"last_login_at": now}}
        )
        user.last_login_at = now
        return user
