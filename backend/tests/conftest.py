"""Shared pytest fixtures: async in-memory DB, auth helpers."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.deps import get_current_user
from app.core.security import hash_password
from app.db.base import Base
from app.db.models import Organisation, User
from app.db.models.enums import UserRole
from app.db.session import get_db
from app.main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(TEST_DB_URL, future=True)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def session(engine) -> AsyncGenerator[AsyncSession, None]:
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        yield s


@pytest_asyncio.fixture
async def org_and_user(session: AsyncSession) -> tuple[Organisation, User]:
    org = Organisation(name="Test Org", slug="test-org")
    session.add(org)
    await session.flush()
    user = User(
        org_id=org.id,
        email="test@example.com",
        hashed_password=hash_password("secret123"),
        full_name="Test User",
        role=UserRole.ADMIN,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return org, user


@pytest_asyncio.fixture
async def client(session: AsyncSession, org_and_user) -> AsyncGenerator[AsyncClient, None]:
    _, user = org_and_user

    async def _get_db_override():
        yield session

    async def _current_user_override():
        return user

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = _current_user_override

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
