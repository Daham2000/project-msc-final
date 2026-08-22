"""Admin-only endpoints: publishing notices and listing accounts."""

from flask import Blueprint, g, jsonify, request

from ...core import login_required
from ...core.errors import ValidationError
from .dependencies import get_announcement_service, get_user_service

admin_bp = Blueprint("admin", __name__)


@admin_bp.post("/admin/announcements")
@login_required({"admin"})
def create_announcement():
    payload = request.get_json(silent=True) or {}

    try:
        announcement = get_announcement_service().create(payload, created_by=g.current_user)
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), exc.status_code

    return (
        jsonify({"message": "Announcement created successfully.", "announcement": announcement}),
        201,
    )


@admin_bp.delete("/admin/announcements/<announcement_id>")
@login_required({"admin"})
def delete_announcement(announcement_id: str):
    if not get_announcement_service().delete(announcement_id):
        return jsonify({"error": "Announcement not found."}), 404

    return jsonify({"message": "Announcement deleted successfully."})


@admin_bp.get("/admin/users")
@login_required({"admin"})
def list_users():
    users = get_user_service().list_users()
    return jsonify({"count": len(users), "users": users})
