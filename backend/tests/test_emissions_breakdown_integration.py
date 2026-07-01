"""Integration tests for the emissions breakdown endpoint."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def test_breakdown_by_category(client) -> None:
    records = [
        ("scope_1", "stationary_combustion", 10),
        ("scope_1", "stationary_combustion", 5),
        ("scope_1", "mobile_combustion", 4),
    ]
    for scope, category, value in records:
        res = await client.post(
            "/api/v1/emissions",
            json={
                "recorded_on": "2025-03-01",
                "scope": scope,
                "category": category,
                "co2e_tonnes": value,
            },
        )
        assert res.status_code == 201

    res = await client.get("/api/v1/emissions/breakdown?dimension=category")
    assert res.status_code == 200
    data = res.json()
    assert data["dimension"] == "category"
    assert data["grand_total_co2e_tonnes"] == 19
    # Ordered by total desc: stationary_combustion (15) before mobile (4).
    by_key = {i["key"]: i["total_co2e_tonnes"] for i in data["items"]}
    assert by_key["stationary_combustion"] == 15
    assert by_key["mobile_combustion"] == 4
    assert data["items"][0]["key"] == "stationary_combustion"


async def test_breakdown_invalid_dimension_rejected(client) -> None:
    res = await client.get("/api/v1/emissions/breakdown?dimension=not_a_dimension")
    assert res.status_code == 400
