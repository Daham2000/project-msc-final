"""HTTP layer. Views stay thin: parse, delegate to a service, serialise."""

from flask import Flask

from .v1 import API_V1_PREFIX, api_v1_bp


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(api_v1_bp, url_prefix=API_V1_PREFIX)


__all__ = ["register_blueprints"]
