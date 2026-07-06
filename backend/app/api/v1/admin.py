"""Admin-only endpoints: organisation profile, user management and audit log.

All routes require the ADMIN role and are scoped to the caller's organisation.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentAdmin
from app.db.models import AuditLog, Organisation, User
from app.db.session import get_db
from app.schemas.admin import (
    AdminUserOut,
    AdminUserUpdate,
    AuditEntryOut,
    OrgOut,
    OrgSettingsUpdate,
)
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/org", response_model=OrgOut)
async def get_org(admin: CurrentAdmin, session: DbSession) -> OrgOut:
    org = await admin_service.get_org(session, admin.org_id)
    return OrgOut.model_validate(org)


@router.patch("/org", response_model=OrgOut)
async def update_org(
    payload: OrgSettingsUpdate, admin: CurrentAdmin, session: DbSession
) -> OrgOut:
    org = await admin_service.update_org(session, admin, payload)
    return OrgOut.model_validate(org)


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(admin: CurrentAdmin, session: DbSession) -> list[AdminUserOut]:
    users = await admin_service.list_users(session, admin.org_id)
    return [AdminUserOut.model_validate(u) for u in users]


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    admin: CurrentAdmin,
    session: DbSession,
) -> AdminUserOut:
    user = await admin_service.update_user(session, admin, user_id, payload)
    return AdminUserOut.model_validate(user)


@router.get("/audit", response_model=list[AuditEntryOut])
async def list_audit(
    admin: CurrentAdmin,
    session: DbSession,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[AuditEntryOut]:
    rows = await session.scalars(
        select(AuditLog)
        .where(AuditLog.org_id == admin.org_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    return [AuditEntryOut.model_validate(a) for a in rows]
