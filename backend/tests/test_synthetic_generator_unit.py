"""Unit tests for the synthetic emissions generator."""

from __future__ import annotations

from collections import defaultdict
from datetime import date

from app.data.synthetic_generator import (
    generate_detailed_emissions,
    generate_emissions,
)
from app.db.models.enums import EmissionScope

_END = date(2024, 1, 1)


def test_generate_emissions_is_deterministic() -> None:
    a = generate_emissions(years=0.5, end=_END, seed=123)
    b = generate_emissions(years=0.5, end=_END, seed=123)
    assert [(p.recorded_on, p.scope, p.co2e_tonnes) for p in a] == [
        (p.recorded_on, p.scope, p.co2e_tonnes) for p in b
    ]


def test_generate_emissions_has_all_scopes_per_day() -> None:
    points = generate_emissions(years=0.2, end=_END, seed=1)
    by_day: dict[date, set[EmissionScope]] = defaultdict(set)
    for p in points:
        by_day[p.recorded_on].add(p.scope)
    assert all(scopes == set(EmissionScope) for scopes in by_day.values())


def test_detailed_emissions_are_deterministic() -> None:
    a = generate_detailed_emissions(years=0.3, end=_END, seed=7)
    b = generate_detailed_emissions(years=0.3, end=_END, seed=7)
    assert len(a) == len(b) and len(a) > 0
    assert all(
        x.co2e_tonnes == y.co2e_tonnes and x.category == y.category
        for x, y in zip(a, b)
    )


def test_detailed_categories_sum_to_scope_total() -> None:
    """Detailed per-category values must reconstruct the scope-level total."""
    end = date(2024, 1, 1)
    scope_points = generate_emissions(years=0.3, end=end, seed=99)
    detailed = generate_detailed_emissions(years=0.3, end=end, seed=99)

    scope_totals: dict[tuple[date, EmissionScope], float] = {
        (p.recorded_on, p.scope): p.co2e_tonnes for p in scope_points
    }
    detailed_totals: dict[tuple[date, EmissionScope], float] = defaultdict(float)
    for p in detailed:
        detailed_totals[(p.recorded_on, p.scope)] += p.co2e_tonnes

    assert detailed_totals.keys() == scope_totals.keys()
    for key, total in scope_totals.items():
        assert abs(detailed_totals[key] - total) < 1e-2


def test_detailed_emissions_have_facility_and_energy_source() -> None:
    points = generate_detailed_emissions(years=0.1, end=_END, seed=3)
    assert points
    assert all(p.facility and p.energy_source for p in points)
