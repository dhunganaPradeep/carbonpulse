"""Admin Pydantic schemas (organisation, users, audit)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.db.models.enums import UserRole


class OrgOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    industry: str | None
    country: str | None


class OrgSettingsUpdate(BaseModel):
    name: str | None = None
    industry: str | None = None
    country: str | None = None

class AdminUserCreate(BaseModel):
    email: str
    password: str
    full_name: str | None = None
    role: UserRole = UserRole.VIEWER
    is_active: bool = True


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str | None
    role: UserRole
    is_active: bool
    created_at: datetime


class AdminUserUpdate(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None


class AuditEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    entity: str | None
    detail: str | None
    created_at: datetime
