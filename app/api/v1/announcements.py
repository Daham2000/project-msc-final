"""Reading announcements, including the live server-sent-events stream."""

import json
import time

from flask import Blueprint, Response, jsonify, g, request, stream_with_context

from ...core import get_authenticated_user, login_required
from ...core.errors import AuthError
from .dependencies import get_announcement_service

announcements_bp = Blueprint("announcements", __name__)

STREAM_POLL_SECONDS = 2


@announcements_bp.get("/announcements")
@login_required({"citizen", "admin"})
def list_announcements():
    announcements = get_announcement_service().list_for_user(g.current_user)
    return jsonify({"count": len(announcements), "announcements": announcements})


@announcements_bp.get("/announcements/stream")
def stream_announcements():
    # EventSource cannot send an Authorization header, so the token may arrive
    # as a query parameter for this endpoint only.
    try:
        user = get_authenticated_user({"citizen", "admin"}, allow_query_token=True)
    except AuthError as exc:
        return jsonify({"error": str(exc)}), exc.status_code

    service = get_announcement_service()
    initial_since_id = str(request.args.get("since_id", "")).strip() or None

    def generate():
        last_seen_id = initial_since_id
        yield _sse_message("connected", {"since_id": last_seen_id})

        while True:
            for announcement in service.list_for_user(user, after_id=last_seen_id):
                last_seen_id = announcement["id"]
                yield _sse_message("announcement", announcement)

            yield ": keep-alive\n\n"
            time.sleep(STREAM_POLL_SECONDS)

    response = Response(stream_with_context(generate()), mimetype="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Connection"] = "keep-alive"
    response.headers["X-Accel-Buffering"] = "no"
    return response


def _sse_message(event_name: str, payload: dict) -> str:
    return f"event: {event_name}\ndata: {json.dumps(payload)}\n\n"
