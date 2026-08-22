"""Registration, login, and the current-user endpoint."""

from flask import Blueprint, g, jsonify, request

from ...core import login_required
from ...core.errors import ValidationError
from .dependencies import get_auth_service, get_user_service

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/auth/register")
def register():
    payload = request.get_json(silent=True) or {}

    try:
        user = get_user_service().register_citizen(payload)
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), exc.status_code

    return jsonify({"message": "Citizen registered successfully.", "user": user}), 201


@auth_bp.post("/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip()
    password = str(payload.get("password", ""))

    if not email or not password:
        return jsonify({"error": "Fields 'email' and 'password' are required."}), 400

    user = get_user_service().authenticate(email=email, password=password)
    if not user:
        return jsonify({"error": "Invalid email or password."}), 401

    token = get_auth_service().generate_token(user)
    return jsonify({"access_token": token, "token_type": "Bearer", "user": user})


@auth_bp.get("/auth/me")
@login_required()
def auth_me():
    return jsonify({"user": g.current_user})
