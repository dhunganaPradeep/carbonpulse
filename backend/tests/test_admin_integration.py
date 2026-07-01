"""Integration tests for the admin module (RBAC, isolation, safeguards)."""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_current_user
from app.core.security import hash_password
from app.db.models import Organisation, User
from app.db.models.enums import UserRole
from app.db.session import get_db
from app.main import app

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def admin_client(session, org_and_user):
    """Client authenticated as the ADMIN user from org_and_user."""
    _, user = org_and_user  # role=ADMIN per conftest

    async def _get_db_override():
        yield session

    async def _current_user_override():
        return user

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = _current_user_override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, user
    app.dependency_overrides.clear()


async def test_create_and_list_users(admin_client) -> None:
    ac, _ = admin_client
    res = await ac.post(
        "/api/v1/admin/users",
        json={
            "email": "newbie@example.com",
            "password": "supersecret",
            "role": "ANALYST",
        },
    )
    assert res.status_code == 201
    body = res.json()
    assert body["email"] == "newbie@example.com"
    assert "hashed_password" not in body and "password" not in body

    res = await ac.get("/api/v1/admin/users")
    assert res.status_code == 200
    emails = {u["email"] for u in res.json()}
    assert "newbie@example.com" in emails


async def test_duplicate_email_conflict(admin_client) -> None:
    ac, admin = admin_client
    res = await ac.post(
        "/api/v1/admin/users",
        json={"email": admin.email, "password": "supersecret"},
    )
    assert res.status_code == 409


async def test_admin_cannot_demote_self(admin_client) -> None:
    ac, admin = admin_client
    res = await ac.patch(
        f"/api/v1/admin/users/{admin.id}", json={"role": "VIEWER"}
    )
    assert res.status_code == 400


async def test_admin_cannot_deactivate_self(admin_client) -> None:
    ac, admin = admin_client
    res = await ac.patch(
        f"/api/v1/admin/users/{admin.id}", json={"is_active": False}
    )
    assert res.status_code == 400


async def test_admin_cannot_delete_self(admin_client) -> None:
    ac, admin = admin_client
    res = await ac.delete(f"/api/v1/admin/users/{admin.id}")
    assert res.status_code == 400


async def test_update_org_settings(admin_client) -> None:
    ac, _ = admin_client
    res = await ac.patch(
        "/api/v1/admin/settings", json={"industry": "Energy", "country": "FR"}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["industry"] == "Energy"
    assert body["country"] == "FR"


async def test_non_admin_is_forbidden(session, org_and_user) -> None:
    """A VIEWER must not reach any admin endpoint."""
    org, _ = org_and_user
    viewer = User(
        org_id=org.id,
        email="viewer-only@example.com",
        hashed_password=hash_password("secret123"),
        full_name="Viewer",
        role=UserRole.VIEWER,
    )
    session.add(viewer)
    await session.commit()
    await session.refresh(viewer)

    async def _get_db_override():
        yield session

    async def _current_user_override():
        return viewer

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = _current_user_override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        assert (await ac.get("/api/v1/admin/users")).status_code == 403
        assert (await ac.get("/api/v1/admin/settings")).status_code == 403
    app.dependency_overrides.clear()


async def test_cross_org_user_not_visible(session, org_and_user) -> None:
    """An admin must not see or fetch users from another org."""
    _, admin = org_and_user
    other_org = Organisation(name="Other", slug="other-org")
    session.add(other_org)
    await session.flush()
    outsider = User(
        org_id=other_org.id,
        email="outsider@example.com",
        hashed_password=hash_password("secret123"),
        role=UserRole.ANALYST,
    )
    session.add(outsider)
    await session.commit()
    await session.refresh(outsider)

    async def _get_db_override():
        yield session

    async def _current_user_override():
        return admin

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = _current_user_override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        listed = await ac.get("/api/v1/admin/users")
        assert outsider.email not in {u["email"] for u in listed.json()}
        fetched = await ac.get(f"/api/v1/admin/users/{outsider.id}")
        assert fetched.status_code == 404
    app.dependency_overrides.clear()