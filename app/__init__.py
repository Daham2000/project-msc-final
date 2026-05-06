from flask import Flask, request

from .config import Config
from .routes import api_bp
from .services.auth_service import AuthService
from .services.database_service import DatabaseService
from .services.smart_city_service import SmartCityService


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    service = SmartCityService(dataset_path=app.config["DATASET_PATH"])
    service.train()
    database_service = DatabaseService(
        mongo_uri=app.config["MONGO_URI"],
        database_name=app.config["MONGO_DB_NAME"],
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
    app.register_blueprint(api_bp, url_prefix="/api/v1")

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        allowed_origins = set(app.config["CORS_ALLOWED_ORIGINS"])

        if origin and origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"

        return response

    return app
