"""Integration tests for emissions CRUD + aggregation via the API."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def test_create_and_list_emission(client) -> None:
    payload = {
        "recorded_on": "2025-01-01",
        "scope": "scope_1",
        "co2e_tonnes": 12.5,
    }
    res = await client.post("/api/v1/emissions", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["co2e_tonnes"] == 12.5

    res = await client.get("/api/v1/emissions")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1


async def test_aggregate_by_scope(client) -> None:
    for scope, value in (("scope_1", 10), ("scope_2", 5), ("scope_2", 5)):
        await client.post(
            "/api/v1/emissions",
            json={"recorded_on": "2025-02-01", "scope": scope, "co2e_tonnes": value},
        )
    res = await client.get("/api/v1/emissions/aggregate")
    assert res.status_code == 200
    data = res.json()
    assert data["grand_total_co2e_tonnes"] == 20


async def test_invalid_negative_emission_rejected(client) -> None:
    res = await client.post(
        "/api/v1/emissions",
        json={"recorded_on": "2025-01-01", "scope": "scope_1", "co2e_tonnes": -1},
    )
    assert res.status_code == 422
