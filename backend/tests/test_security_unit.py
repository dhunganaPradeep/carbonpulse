"""Unit tests for password hashing and JWT."""

from __future__ import annotations

from app.core.jwt import create_access_token, create_refresh_token, decode_token
from app.core.security import hash_password, verify_password


def test_password_hash_roundtrip() -> None:
    hashed = hash_password("my-password")
    assert hashed != "my-password"
    assert verify_password("my-password", hashed)
    assert not verify_password("wrong", hashed)


def test_access_token_contains_claims() -> None:
    token, jti = create_access_token("user-1", "org-1", {"role": "admin"})
    payload = decode_token(token)
    assert payload["sub"] == "user-1"
    assert payload["org_id"] == "org-1"
    assert payload["type"] == "access"
    assert payload["jti"] == jti
    assert payload["role"] == "admin"


def test_refresh_token_type() -> None:
    token, _ = create_refresh_token("user-1", "org-1")
    payload = decode_token(token)
    assert payload["type"] == "refresh"
