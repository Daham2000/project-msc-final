"""Single MongoDB connection shared by every repository."""

import atexit

from pymongo import MongoClient
from pymongo.database import Database


class MongoConnection:
    """Owns the MongoClient and hands out the application database.

    The connection is verified with a ping at start-up so a misconfigured
    MONGO_URI fails immediately instead of on the first request.
    """

    def __init__(self, mongo_uri: str, database_name: str, timeout_ms: int = 3000):
        self.client = MongoClient(mongo_uri, serverSelectionTimeoutMS=timeout_ms)
        self.client.admin.command("ping")
        atexit.register(self.close)
        self.database: Database = self.client[database_name]

    def collection(self, name: str):
        return self.database[name]

    def close(self) -> None:
        self.client.close()
