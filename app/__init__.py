from flask import Flask

from .config import Config
from .routes import api_bp
from .services.smart_city_service import SmartCityService


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    service = SmartCityService(dataset_path=app.config["DATASET_PATH"])
    service.train()

    app.extensions["smart_city_service"] = service
    app.register_blueprint(api_bp, url_prefix="/api/v1")

    return app
