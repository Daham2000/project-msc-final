"""Database connection and schema setup."""

from .connection import MongoConnection
from .indexes import ensure_indexes

__all__ = ["MongoConnection", "ensure_indexes"]
