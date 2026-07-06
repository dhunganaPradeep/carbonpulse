"""Shared API dependencies: current user and organisation isolation."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.jwt import TokenError, decode_token
from app.db.models import User
from app.db.models.enums import UserRole
from app.db.session import get_db

_bearer = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Resolve the authenticated user from a bearer access token."""
    cred_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
    except TokenError:
        raise cred_error
    if payload.get("type") != "access":
        raise cred_error
    user_id = payload.get("sub")
    if not user_id:
        raise cred_error
    user = await session.scalar(select(User).where(User.id == uuid.UUID(user_id)))
    if not user or not user.is_active:
        raise cred_error
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: UserRole):
    """Dependency factory enforcing that the user has one of the given roles."""

    async def _checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this action",
            )
        return user

    return _checker


# Roles permitted to mutate organisation data. VIEWER is intentionally
# excluded; ADMIN inherits everything an ANALYST can do.
WRITE_ROLES = (UserRole.ANALYST, UserRole.ADMIN)

# Dependency enforcing write access (ANALYST or ADMIN).
RequireWriteAccess = Depends(require_role(*WRITE_ROLES))

# Dependency enforcing admin-only access.
RequireAdminAccess = Depends(require_role(UserRole.ADMIN))


async def get_current_admin(
    user: CurrentUser,
) -> User:
    """Resolve the current user and require the ADMIN role."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return user


CurrentAdmin = Annotated[User, Depends(get_current_admin)]


def get_current_org_id(user: CurrentUser) -> uuid.UUID:
    """Return the org id used to scope all queries (data isolation)."""
    return user.org_id


CurrentOrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]
