"""Admin service: org-scoped user management and organisation settings.

All operations are scoped to the acting admin's organisation. The caller's
``org_id`` is always taken from the authenticated user, never from request
input, to prevent cross-tenant access. Safeguards prevent an admin from locking
themselves out (self demotion/deactivation/deletion).
"""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.models import AuditLog, Organisation, User
from app.db.models.enums import UserRole
from app.schemas.admin import (
    AdminUserCreate,
    AdminUserUpdate,
    OrgSettingsUpdate,
)


async def _log(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    actor_id: uuid.UUID,
    action: str,
    entity: str,
    detail: str | None = None,
) -> None:
    session.add(
        AuditLog(
            org_id=org_id,
            user_id=actor_id,
            action=action,
            entity=entity,
            detail=detail,
        )
    )


async def list_users(session: AsyncSession, org_id: uuid.UUID) -> list[User]:
    rows = await session.scalars(
        select(User).where(User.org_id == org_id).order_by(User.email)
    )
    return list(rows)


async def get_user(
    session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID
) -> User:
    user = await session.scalar(
        select(User).where(User.id == user_id, User.org_id == org_id)
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


async def create_user(
    session: AsyncSession, actor: User, payload: AdminUserCreate
) -> User:
    existing = await session.scalar(
        select(User).where(func.lower(User.email) == payload.email.lower())
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    user = User(
        org_id=actor.org_id,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=payload.is_active,
    )
    session.add(user)
    await session.flush()
    await _log(
        session,
        org_id=actor.org_id,
        actor_id=actor.id,
        action="user.create",
        entity=str(user.id),
        detail=f"role={user.role.value}",
    )
    await session.commit()
    await session.refresh(user)
    return user


async def update_user(
    session: AsyncSession,
    actor: User,
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
) -> User:
    user = await get_user(session, actor.org_id, user_id)

    is_self = user.id == actor.id
    data = payload.model_dump(exclude_unset=True)

    # Prevent an admin from locking themselves out.
    if is_self and "role" in data and data["role"] is not UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own admin role",
        )
    if is_self and data.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    if "password" in data:
        password = data.pop("password")
        if password is not None:
            user.hashed_password = hash_password(password)
    for field, value in data.items():
        setattr(user, field, value)

    await _log(
        session,
        org_id=actor.org_id,
        actor_id=actor.id,
        action="user.update",
        entity=str(user.id),
        detail=",".join(sorted(data.keys())) or "password",
    )
    await session.commit()
    await session.refresh(user)
    return user


async def delete_user(
    session: AsyncSession, actor: User, user_id: uuid.UUID
) -> None:
    if user_id == actor.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )
    user = await get_user(session, actor.org_id, user_id)
    await session.delete(user)
    await _log(
        session,
        org_id=actor.org_id,
        actor_id=actor.id,
        action="user.delete",
        entity=str(user_id),
    )
    await session.commit()


async def get_org(session: AsyncSession, org_id: uuid.UUID) -> Organisation:
    org = await session.get(Organisation, org_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organisation not found"
        )
    return org


async def update_org(
    session: AsyncSession, actor: User, payload: OrgSettingsUpdate
) -> Organisation:
    org = await get_org(session, actor.org_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(org, field, value)
    await _log(
        session,
        org_id=actor.org_id,
        actor_id=actor.id,
        action="org.update",
        entity=str(org.id),
        detail=",".join(sorted(data.keys())),
    )
    await session.commit()
    await session.refresh(org)
    return org