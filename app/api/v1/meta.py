"""Public and reference endpoints: city list, health, model metadata."""

from flask import Blueprint, jsonify

from ...core import login_required
from .dependencies import get_location_service, get_smart_city_service

meta_bp = Blueprint("meta", __name__)


@meta_bp.get("/cities")
def list_cities():
    """Unauthenticated: the registration form needs this before an account exists."""
    return jsonify(get_location_service().to_dict())


@meta_bp.get("/health")
def health_check():
    service = get_smart_city_service()
    return jsonify(
        {
            "status": "ok",
            "dataset_path": service.dataset_path,
            "records_loaded": service.dataset_size,
            "models_trained": service.is_trained,
        }
    )


@meta_bp.get("/metadata")
@login_required({"citizen", "admin"})
def metadata():
    return jsonify(get_smart_city_service().get_metadata())
