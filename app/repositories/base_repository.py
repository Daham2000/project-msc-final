"""Base class for collection-level data access.

Repositories are the only layer that talks to pymongo. They translate between
raw documents and the model classes in ``app/models``; everything above them
works with model objects only.
"""

from typing import Any

from pymongo.collection import Collection

from ..database import MongoConnection


class BaseRepository:
    collection_name: str = ""
    model = None

    def __init__(self, connection: MongoConnection):
        if not self.collection_name:
            raise ValueError(f"{type(self).__name__} must define a collection_name.")
        self.connection = connection
        self.collection: Collection = connection.collection(self.collection_name)

    def _to_model(self, document: dict | None):
        return self.model.from_document(document) if document else None

    def _object_id(self, value: Any):
        return self.model.to_object_id(value)
