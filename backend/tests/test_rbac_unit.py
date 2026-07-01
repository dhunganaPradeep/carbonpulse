"""RBAC tests: verify role enforcement on mutating endpoints.

Viewers must be denied write access; analysts and admins must be allowed
through the role check (downstream behaviour is covered by other tests).
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.api.deps import WRITE_ROLES, require_role
from app.db.models import Organisation, User
from app.db.models.enums import UserRole


def _user(role: UserRole) -> User:
    org = Organisation(name="Test Org", slug="test-org")
    return User(
        org_id=org.id,
        email="u@example.com",
        hashed_password="x",
        full_name="U",
        role=role,
    )


@pytest.mark.asyncio
async def test_viewer_denied_write_access() -> None:
    checker = require_role(*WRITE_ROLES)
    with pytest.raises(HTTPException) as exc:
        await checker(_user(UserRole.VIEWER))
    assert exc.value.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize("role", [UserRole.ANALYST, UserRole.ADMIN])
async def test_write_roles_allowed(role: UserRole) -> None:
    checker = require_role(*WRITE_ROLES)
    result = await checker(_user(role))
    assert result.role is role
