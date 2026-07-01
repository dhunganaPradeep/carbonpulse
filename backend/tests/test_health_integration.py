"""Integration test for health endpoint via async client."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def test_health(client) -> None:
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
