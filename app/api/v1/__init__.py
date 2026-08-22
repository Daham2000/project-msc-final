"""Version 1 of the REST API, split into one blueprint per resource."""

from flask import Blueprint

from .admin import admin_bp
from .announcements import announcements_bp
from .auth import auth_bp
from .meta import meta_bp
from .predictions import predictions_bp

API_V1_PREFIX = "/api/v1"

api_v1_bp = Blueprint("api_v1", __name__)

for blueprint in (meta_bp, auth_bp, predictions_bp, announcements_bp, admin_bp):
    api_v1_bp.register_blueprint(blueprint)

__all__ = ["API_V1_PREFIX", "api_v1_bp"]
