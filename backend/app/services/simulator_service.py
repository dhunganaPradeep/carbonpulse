"""Stateless what-if simulator.

Applies analytical adjustments on top of the latest stored forecast without
any model retraining. Effects are applied to scope-weighted emissions:
- renewable energy % primarily reduces Scope 2 (purchased energy)
- fleet EV % primarily reduces Scope 1 (direct combustion)
- supplier reduction % reduces Scope 3 (value chain)
- production volume scales all scopes
"""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.simulator import SimulatedPoint, SimulatorParams, SimulatorResult
from app.services import forecast_service

# Approximate share of total emissions affected by each lever. These reflect a
# typical org mix and keep the simulator analytical and fast.
_SCOPE2_SHARE = 0.20  # energy-related, addressable by renewables
_SCOPE1_SHARE = 0.20  # direct/fleet, addressable by EV
_SCOPE3_SHARE = 0.55  # value chain, addressable by suppliers
# Max fraction of each share that the lever can remove at 100%.
_RENEWABLE_MAX_EFFECT = 0.9
_EV_MAX_EFFECT = 0.8


def apply_levers(baseline: float, params: SimulatorParams) -> float:
    """Return adjusted emissions for a single baseline value."""
    scope2 = baseline * _SCOPE2_SHARE
    scope1 = baseline * _SCOPE1_SHARE
    scope3 = baseline * _SCOPE3_SHARE
    other = baseline - scope2 - scope1 - scope3

    scope2 *= 1 - (params.renewable_energy_pct / 100) * _RENEWABLE_MAX_EFFECT
    scope1 *= 1 - (params.fleet_ev_pct / 100) * _EV_MAX_EFFECT
    scope3 *= 1 - (params.supplier_reduction_pct / 100)

    subtotal = scope1 + scope2 + scope3 + other
    # Production volume scales the whole footprint.
    subtotal *= 1 + (params.production_volume_change_pct / 100)
    return max(0.0, subtotal)


async def simulate(
        session: AsyncSession, org_id: uuid.UUID, params: SimulatorParams
) -> SimulatorResult:
    run = await forecast_service.latest_run(session, org_id)
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No completed forecast available. Trigger a forecast first.",
        )
    points = await forecast_service.get_run_points(session, run.id)
    if not points:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Latest forecast has no points.",
        )

    sim_points: list[SimulatedPoint] = []
    baseline_total = 0.0
    simulated_total = 0.0
    for p in points:
        baseline = float(p.yhat)
        simulated = apply_levers(baseline, params)
        baseline_total += baseline
        simulated_total += simulated
        sim_points.append(
            SimulatedPoint(
                forecast_date=p.forecast_date,
                baseline=round(baseline, 4),
                simulated=round(simulated, 4),
            )
        )

    reduction_pct = (
        (baseline_total - simulated_total) / baseline_total * 100
        if baseline_total > 0
        else 0.0
    )
    estimated_tax = simulated_total * params.carbon_tax_rate
    return SimulatorResult(
        points=sim_points,
        baseline_total=round(baseline_total, 4),
        simulated_total=round(simulated_total, 4),
        reduction_pct=round(reduction_pct, 2),
        estimated_carbon_tax=round(estimated_tax, 2),
    )
