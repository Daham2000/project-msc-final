"""Shared behaviour for every MongoDB-backed model class.

A model owns three representations of the same entity:

  * the Python object       - what the services work with
  * ``to_document()``       - what is written into MongoDB
  * ``to_dict()``           - what is serialised out to the API (never secrets)

``from_document()`` reads a raw Mongo document back into the object.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from bson import ObjectId
from bson.errors import InvalidId


class BaseModel:
    """Common conversion helpers for documents stored in MongoDB."""

    @staticmethod
    def utc_now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def to_object_id(value: Any) -> ObjectId:
        """Coerce a string id into an ObjectId, rejecting malformed input."""
        if isinstance(value, ObjectId):
            return value
        try:
            return ObjectId(str(value))
        except (InvalidId, TypeError) as exc:
            raise ValueError(f"'{value}' is not a valid identifier.") from exc

    @staticmethod
    def iso(value: Optional[datetime]) -> Optional[str]:
        return value.isoformat() if value else None

    def to_document(self) -> Dict[str, Any]:
        raise NotImplementedError

    def to_dict(self) -> Dict[str, Any]:
        raise NotImplementedError

    @classmethod
    def from_document(cls, document: Dict[str, Any]) -> "BaseModel":
        raise NotImplementedError
