"""Unit tests for the stateless simulator lever maths."""

from __future__ import annotations

from app.schemas.simulator import SimulatorParams
from app.services.simulator_service import apply_levers


def test_no_levers_is_identity() -> None:
    params = SimulatorParams()
    assert apply_levers(100.0, params) == 100.0


def test_renewables_reduce_emissions() -> None:
    params = SimulatorParams(renewable_energy_pct=100)
    assert apply_levers(100.0, params) < 100.0


def test_production_increase_raises_emissions() -> None:
    params = SimulatorParams(production_volume_change_pct=50)
    assert apply_levers(100.0, params) > 100.0


def test_full_reduction_never_negative() -> None:
    params = SimulatorParams(
        renewable_energy_pct=100,
        fleet_ev_pct=100,
        supplier_reduction_pct=100,
        production_volume_change_pct=-100,
    )
    assert apply_levers(100.0, params) >= 0.0
