"""Controlled vocabularies shared by the database models and the API layer.

Keeping these values in one place stops a route, a repository, and a stored
document from drifting apart (e.g. a notice saved as "Citizens" that no query
would ever match).
"""


class UserRole:
    """Roles a stored user account can hold."""

    ADMIN = "admin"
    CITIZEN = "citizen"

    CHOICES = frozenset({ADMIN, CITIZEN})


class AudienceRole:
    """Which kind of account an announcement is addressed to."""

    CITIZEN = "citizen"
    ALL = "all"

    CHOICES = frozenset({CITIZEN, ALL})


class AudienceScope:
    """How widely an announcement reaches."""

    ISLAND_WIDE = "island_wide"
    CITIES = "cities"

    CHOICES = frozenset({ISLAND_WIDE, CITIES})
