"""Authentication service: credential checks and token lifecycle."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.jwt import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.redis_client import get_redis
from app.core.security import verify_password
from app.db.models import User
from app.schemas.auth import TokenPair

_REFRESH_PREFIX = "refresh:"  # active refresh jti store


class AuthError(Exception):
    """Raised on authentication/authorisation failures."""


async def authenticate(session: AsyncSession, email: str, password: str) -> User:
    user = await session.scalar(select(User).where(User.email == email))
    if not user or not user.is_active or not verify_password(password, user.hashed_password):
        raise AuthError("Invalid email or password")
    return user


async def issue_tokens(user: User) -> TokenPair:
    access, _ = create_access_token(str(user.id), str(user.org_id), {"role": user.role.value})
    refresh, refresh_jti = create_refresh_token(str(user.id), str(user.org_id))
    redis = get_redis()
    await redis.setex(
        f"{_REFRESH_PREFIX}{refresh_jti}",
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        str(user.id),
    )
    return TokenPair(access_token=access, refresh_token=refresh)


async def rotate_refresh_token(session: AsyncSession, refresh_token: str) -> TokenPair:
    try:
        payload = decode_token(refresh_token)
    except TokenError as exc:
        raise AuthError("Invalid refresh token") from exc
    if payload.get("type") != "refresh":
        raise AuthError("Not a refresh token")

    jti = payload.get("jti", "")
    redis = get_redis()
    stored = await redis.get(f"{_REFRESH_PREFIX}{jti}")
    if stored is None:
        raise AuthError("Refresh token revoked or expired")

    # Rotate: invalidate the old refresh jti.
    await redis.delete(f"{_REFRESH_PREFIX}{jti}")

    user = await session.scalar(select(User).where(User.id == payload["sub"]))
    if not user or not user.is_active:
        raise AuthError("User not found or inactive")
    return await issue_tokens(user)


async def revoke_refresh_token(refresh_token: str) -> None:
    try:
        payload = decode_token(refresh_token)
    except TokenError:
        return
    jti = payload.get("jti")
    if jti:
        await get_redis().delete(f"{_REFRESH_PREFIX}{jti}")
