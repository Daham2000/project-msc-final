"""Prediction and insight endpoints backed by the trained models."""

from flask import Blueprint, jsonify, request

from ...core import login_required
from ...services.recommendation_service import city_recommendations
from .dependencies import get_smart_city_service

predictions_bp = Blueprint("predictions", __name__)


@predictions_bp.get("/dashboard/summary")
@login_required({"citizen", "admin"})
def dashboard_summary():
    return jsonify(get_smart_city_service().get_dashboard_summary())


@predictions_bp.post("/predict/citizen")
@login_required({"citizen", "admin"})
def predict_citizen():
    payload = request.get_json(silent=True) or {}

    try:
        prediction = get_smart_city_service().predict_citizen(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(prediction)


@predictions_bp.post("/predict/city")
@login_required({"citizen", "admin"})
def predict_city():
    payload = request.get_json(silent=True) or {}
    citizens = payload.get("citizens")

    if not isinstance(citizens, list) or not citizens:
        return jsonify({"error": "Payload must contain a non-empty 'citizens' list."}), 400

    try:
        result = get_smart_city_service().predict_city(citizens)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(result)


@predictions_bp.get("/insights/recommendations")
@login_required({"citizen", "admin"})
def general_recommendations():
    summary = get_smart_city_service().get_dashboard_summary()
    return jsonify(
        {
            "summary": summary,
            "city_recommendations": city_recommendations(summary),
        }
    )
