"""Builds the object graph and attaches it to the Flask app.

Wiring order matters: connection -> repositories -> services. Everything is
constructed once at start-up and reached later via ``app.extensions``.
"""

from flask import Flask

from .database import MongoConnection, ensure_indexes
from .repositories import AnnouncementRepository, UserRepository
from .services import (
    AnnouncementService,
    AuthService,
    LocationService,
    SmartCityService,
    UserService,
)


def register_services(app: Flask) -> None:
    smart_city_service = SmartCityService(dataset_path=app.config["DATASET_PATH"])
    smart_city_service.train()

    location_service = LocationService(dataset_path=app.config["CITIES_PATH"])

    connection = MongoConnection(
        mongo_uri=app.config["MONGO_URI"],
        database_name=app.config["MONGO_DB_NAME"],
    )
    user_repository = UserRepository(connection)
    announcement_repository = AnnouncementRepository(connection)
    ensure_indexes(user_repository, announcement_repository)

    user_service = UserService(user_repository, location_service)
    user_service.ensure_default_admin(
        full_name=app.config["DEFAULT_ADMIN_NAME"],
        email=app.config["DEFAULT_ADMIN_EMAIL"],
        password=app.config["DEFAULT_ADMIN_PASSWORD"],
    )
    announcement_service = AnnouncementService(announcement_repository, location_service)
    auth_service = AuthService(secret_key=app.config["SECRET_KEY"])

    app.extensions["mongo_connection"] = connection
    app.extensions["smart_city_service"] = smart_city_service
    app.extensions["location_service"] = location_service
    app.extensions["user_service"] = user_service
    app.extensions["announcement_service"] = announcement_service
    app.extensions["auth_service"] = auth_service
