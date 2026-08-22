"""Application factory.

Layering, outermost first:

    app/api          HTTP routes, one blueprint per resource
    app/services     business rules and validation
    app/repositories MongoDB queries
    app/models       document schemas (the database design)
    app/ml           dataset, domain equations, and the trained models
    app/core         auth guard and shared error types
"""

from flask import Flask

from .api import register_blueprints
from .config import Config
from .cors import register_cors
from .extensions import register_services


def create_app(config_object: type = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object)

    register_services(app)
    register_blueprints(app)
    register_cors(app)

    return app


__all__ = ["create_app"]
