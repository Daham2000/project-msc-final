"""Accessors for the services registered on the Flask app.

Views call these instead of reaching into ``current_app.extensions`` directly,
so the wiring can change in one place.
"""

from flask import current_app


def get_smart_city_service():
    return current_app.extensions["smart_city_service"]


def get_user_service():
    return current_app.extensions["user_service"]


def get_announcement_service():
    return current_app.extensions["announcement_service"]


def get_location_service():
    return current_app.extensions["location_service"]


def get_auth_service():
    return current_app.extensions["auth_service"]
