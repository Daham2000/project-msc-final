"""Unit tests for the User database model (app/models/user.py).

These are true unit tests: the model owns password hashing and the two
serialisation paths, so nothing here touches MongoDB or the Flask app.
"""

import pytest

from app.models import User, UserProfile, UserRole


def make_user(**overrides) -> User:
    defaults = {
        "full_name": "  Nimal Perera  ",
        "email": "  Nimal.Perera@Example.COM ",
        "password": "Str0ng@Pass",
        "role": UserRole.CITIZEN,
        "profile": UserProfile(age=34, city="Colombo"),
    }
    defaults.update(overrides)
    return User.create(**defaults)


class TestUserCreate:
    def test_password_is_hashed_never_stored_in_plaintext(self):
        user = make_user(password="Str0ng@Pass")

        assert user.password_hash != "Str0ng@Pass"
        assert "Str0ng@Pass" not in user.password_hash
        assert user.verify_password("Str0ng@Pass") is True

    def test_wrong_password_is_rejected(self):
        user = make_user(password="Str0ng@Pass")

        assert user.verify_password("wrong-password") is False
        assert user.verify_password("") is False

    def test_same_password_produces_different_hashes(self):
        """Werkzeug salts each hash, so two accounts never share a digest."""
        first = make_user(email="a@example.com", password="SamePass1")
        second = make_user(email="b@example.com", password="SamePass1")

        assert first.password_hash != second.password_hash

    def test_email_is_lowercased_and_name_trimmed(self):
        """Emails are normalised so the unique index is case-insensitive."""
        user = make_user(email="  Nimal.Perera@Example.COM ", full_name="  Nimal Perera  ")

        assert user.email == "nimal.perera@example.com"
        assert user.full_name == "Nimal Perera"

    def test_created_at_is_set_and_last_login_is_empty(self):
        user = make_user()

        assert user.created_at is not None
        assert user.last_login_at is None

    def test_unknown_role_is_rejected(self):
        with pytest.raises(ValueError, match="Role must be one of"):
            make_user(role="superuser")


class TestUserSerialisation:
    def test_to_dict_never_exposes_the_password_hash(self):
        """The API response path must not leak credentials."""
        payload = make_user().to_dict()

        assert "password_hash" not in payload
        assert set(payload) == {
            "id",
            "full_name",
            "email",
            "role",
            "profile",
            "created_at",
            "last_login_at",
        }

    def test_to_document_keeps_the_hash_for_storage(self):
        document = make_user().to_document()

        assert document["password_hash"].startswith(("pbkdf2:", "scrypt:"))
        assert "id" not in document  # Mongo assigns _id itself

    def test_datetimes_are_iso_strings_in_the_api_payload(self):
        payload = make_user().to_dict()

        assert isinstance(payload["created_at"], str)
        assert payload["last_login_at"] is None

    def test_empty_profile_fields_are_dropped(self):
        """A sparse profile keeps stored documents small and queries honest."""
        user = make_user(profile=UserProfile(age=None, gender="", city="Kandy"))

        assert user.to_document()["profile"] == {"city": "Kandy"}

    def test_round_trip_from_document_preserves_the_user(self):
        original = make_user()
        document = original.to_document()
        document["_id"] = "6a89616e91cfa930b448df73"

        restored = User.from_document(document)

        assert restored.email == original.email
        assert restored.city == "Colombo"
        assert restored.verify_password("Str0ng@Pass") is True


class TestUserRoles:
    def test_admin_is_recognised(self):
        assert make_user(role=UserRole.ADMIN).is_admin() is True

    def test_citizen_is_not_an_admin(self):
        assert make_user(role=UserRole.CITIZEN).is_admin() is False

    def test_city_is_blank_when_no_profile_city_is_set(self):
        """Announcement targeting relies on this, so it must never return None."""
        user = make_user(profile=UserProfile())

        assert user.city == ""
