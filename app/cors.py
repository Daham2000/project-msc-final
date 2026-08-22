"""Minimal CORS handling for the single-page frontend."""

from urllib.parse import urlparse

from flask import Flask, request

_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}


def _is_allowed_origin(origin: str, config) -> bool:
    if origin in set(config["CORS_ALLOWED_ORIGINS"]):
        return True

    if not config["CORS_ALLOW_LOOPBACK_PORTS"]:
        return False

    parsed = urlparse(origin)
    return parsed.scheme in {"http", "https"} and parsed.hostname in _LOOPBACK_HOSTS


def register_cors(app: Flask) -> None:
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")

        if origin and _is_allowed_origin(origin, app.config):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
            response.headers["Access-Control-Max-Age"] = "600"

        return response
