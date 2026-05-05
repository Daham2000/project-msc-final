from flask import Blueprint, current_app, jsonify, request

from .services.recommendations import city_recommendations


api_bp = Blueprint("api", __name__)


def get_service():
    return current_app.extensions["smart_city_service"]


@api_bp.get("/health")
def health_check():
    service = get_service()
    return jsonify(
        {
            "status": "ok",
            "dataset_path": service.dataset_path,
            "records_loaded": service.dataset_size,
            "models_trained": service.is_trained,
        }
    )


@api_bp.get("/metadata")
def metadata():
    service = get_service()
    return jsonify(service.get_metadata())


@api_bp.get("/dashboard/summary")
def dashboard_summary():
    service = get_service()
    return jsonify(service.get_dashboard_summary())


@api_bp.post("/predict/citizen")
def predict_citizen():
    payload = request.get_json(silent=True) or {}
    service = get_service()

    try:
        prediction = service.predict_citizen(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(prediction)


@api_bp.post("/predict/city")
def predict_city():
    payload = request.get_json(silent=True) or {}
    citizens = payload.get("citizens")

    if not isinstance(citizens, list) or not citizens:
        return jsonify({"error": "Payload must contain a non-empty 'citizens' list."}), 400

    service = get_service()

    try:
        result = service.predict_city(citizens)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(result)


@api_bp.get("/insights/recommendations")
def general_recommendations():
    service = get_service()
    summary = service.get_dashboard_summary()
    return jsonify(
        {
            "summary": summary,
            "city_recommendations": city_recommendations(summary),
        }
    )
