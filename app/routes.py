import json
import time

from flask import Blueprint, Response, current_app, g, jsonify, request, stream_with_context

from .services.auth_service import AuthError, get_authenticated_user, login_required
from .services.recommendations import city_recommendations


api_bp = Blueprint("api", __name__)


def get_service():
    return current_app.extensions["smart_city_service"]


def get_database_service():
    return current_app.extensions["database_service"]


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


@api_bp.post("/auth/register")
def register():
    payload = request.get_json(silent=True) or {}
    database_service = get_database_service()

    try:
        user = database_service.create_citizen_user(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"message": "Citizen registered successfully.", "user": user}), 201


@api_bp.post("/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip()
    password = str(payload.get("password", ""))

    if not email or not password:
        return jsonify({"error": "Fields 'email' and 'password' are required."}), 400

    database_service = get_database_service()
    user = database_service.authenticate_user(email=email, password=password)
    if not user:
        return jsonify({"error": "Invalid email or password."}), 401

    auth_service = current_app.extensions["auth_service"]
    token = auth_service.generate_token(user)
    return jsonify({"access_token": token, "token_type": "Bearer", "user": user})


@api_bp.get("/auth/me")
@login_required()
def auth_me():
    return jsonify({"user": g.current_user})


@api_bp.get("/metadata")
@login_required({"citizen", "admin"})
def metadata():
    service = get_service()
    return jsonify(service.get_metadata())


@api_bp.get("/dashboard/summary")
@login_required({"citizen", "admin"})
def dashboard_summary():
    service = get_service()
    return jsonify(service.get_dashboard_summary())


@api_bp.post("/predict/citizen")
@login_required({"citizen", "admin"})
def predict_citizen():
    payload = request.get_json(silent=True) or {}
    service = get_service()

    try:
        prediction = service.predict_citizen(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(prediction)


@api_bp.post("/predict/city")
@login_required({"citizen", "admin"})
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
@login_required({"citizen", "admin"})
def general_recommendations():
    service = get_service()
    summary = service.get_dashboard_summary()
    return jsonify(
        {
            "summary": summary,
            "city_recommendations": city_recommendations(summary),
        }
    )


@api_bp.get("/announcements")
@login_required({"citizen", "admin"})
def list_announcements():
    database_service = get_database_service()
    announcements = database_service.list_announcements_for_user(g.current_user)
    return jsonify({"count": len(announcements), "announcements": announcements})


@api_bp.get("/announcements/stream")
def stream_announcements():
    try:
        user = get_authenticated_user({"citizen", "admin"}, allow_query_token=True)
    except AuthError as exc:
        return jsonify({"error": str(exc)}), exc.status_code

    database_service = get_database_service()
    initial_since_id = str(request.args.get("since_id", "")).strip() or None

    def generate():
        last_seen_id = initial_since_id
        yield _sse_message("connected", {"since_id": last_seen_id})

        while True:
            announcements = database_service.list_announcements_for_user_after(user, last_seen_id)
            for announcement in announcements:
                last_seen_id = announcement["id"]
                yield _sse_message("announcement", announcement)

            yield ": keep-alive\n\n"
            time.sleep(2)

    response = Response(stream_with_context(generate()), mimetype="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Connection"] = "keep-alive"
    response.headers["X-Accel-Buffering"] = "no"
    return response


@api_bp.post("/admin/announcements")
@login_required({"admin"})
def create_announcement():
    payload = request.get_json(silent=True) or {}
    database_service = get_database_service()

    try:
        announcement = database_service.create_announcement(payload, created_by=g.current_user)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"message": "Announcement created successfully.", "announcement": announcement}), 201


@api_bp.delete("/admin/announcements/<announcement_id>")
@login_required({"admin"})
def delete_announcement(announcement_id: str):
    database_service = get_database_service()

    deleted = database_service.delete_announcement(announcement_id)
    if not deleted:
        return jsonify({"error": "Announcement not found."}), 404

    return jsonify({"message": "Announcement deleted successfully."})


@api_bp.get("/admin/users")
@login_required({"admin"})
def list_users():
    database_service = get_database_service()
    users = database_service.list_users()
    return jsonify({"count": len(users), "users": users})


def _sse_message(event_name: str, payload: dict) -> str:
    return f"event: {event_name}\ndata: {json.dumps(payload)}\n\n"
