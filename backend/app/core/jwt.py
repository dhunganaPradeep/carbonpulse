"""JWT creation and decoding with jti tracking."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from jose import JWTError, jwt

from app.core.config import settings

TokenType = Literal["access", "refresh"]


class TokenError(Exception):
    """Raised when a token cannot be decoded or is invalid."""


def _create_token(
    subject: str,
    org_id: str,
    token_type: TokenType,
    expires_delta: timedelta,
    extra: dict[str, Any] | None = None,
) -> tuple[str, str]:
    """Return (encoded_jwt, jti)."""
    now = datetime.now(timezone.utc)
    jti = str(uuid.uuid4())
    payload: dict[str, Any] = {
        "sub": subject,
        "org_id": org_id,
        "type": token_type,
        "jti": jti,
        "iat": now,
        "exp": now + expires_delta,
    }
    if extra:
        payload.update(extra)
    encoded = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded, jti


def create_access_token(
    subject: str, org_id: str, extra: dict[str, Any] | None = None
) -> tuple[str, str]:
    return _create_token(
        subject,
        org_id,
        "access",
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        extra,
    )


def create_refresh_token(subject: str, org_id: str) -> tuple[str, str]:
    return _create_token(
        subject,
        org_id,
        "refresh",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError as exc:  # pragma: no cover - thin wrapper
        raise TokenError(str(exc)) from exc
