from urllib.parse import urlparse

from flask import Flask, request

from .config import Config
from .routes import api_bp
from .services.auth_service import AuthService
from .services.database_service import DatabaseService
from .services.location_service import LocationService
from .services.smart_city_service import SmartCityService


_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}


def _is_allowed_origin(origin: str, config) -> bool:
    if origin in set(config["CORS_ALLOWED_ORIGINS"]):
        return True

    if not config["CORS_ALLOW_LOOPBACK_PORTS"]:
        return False

    parsed = urlparse(origin)
    return parsed.scheme in {"http", "https"} and parsed.hostname in _LOOPBACK_HOSTS


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    service = SmartCityService(dataset_path=app.config["DATASET_PATH"])
    service.train()
    location_service = LocationService(dataset_path=app.config["CITIES_PATH"])
    database_service = DatabaseService(
        mongo_uri=app.config["MONGO_URI"],
        database_name=app.config["MONGO_DB_NAME"],
        location_service=location_service,
    )
    database_service.ensure_indexes()
    database_service.ensure_default_admin(
        full_name=app.config["DEFAULT_ADMIN_NAME"],
        email=app.config["DEFAULT_ADMIN_EMAIL"],
        password=app.config["DEFAULT_ADMIN_PASSWORD"],
    )
    auth_service = AuthService(secret_key=app.config["SECRET_KEY"])

    app.extensions["smart_city_service"] = service
    app.extensions["database_service"] = database_service
    app.extensions["auth_service"] = auth_service
    app.extensions["location_service"] = location_service
    app.register_blueprint(api_bp, url_prefix="/api/v1")

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")

        if origin and _is_allowed_origin(origin, app.config):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
            response.headers["Access-Control-Max-Age"] = "600"

        return response

    return app
