"""What-if simulator schemas."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class SimulatorParams(BaseModel):
    """Slider parameters. All percentages are 0-100 unless noted."""

    renewable_energy_pct: float = Field(
        default=0, ge=0, le=100, description="Share of energy from renewables"
    )
    fleet_ev_pct: float = Field(
        default=0, ge=0, le=100, description="Share of fleet electrified"
    )
    supplier_reduction_pct: float = Field(
        default=0, ge=0, le=100, description="Reduction applied to Scope 3 supplier emissions"
    )
    carbon_tax_rate: float = Field(
        default=0, ge=0, description="Carbon tax in currency units per tonne CO2e"
    )
    production_volume_change_pct: float = Field(
        default=0, ge=-100, le=200, description="Change in production volume"
    )


class SimulatedPoint(BaseModel):
    forecast_date: date
    baseline: float
    simulated: float


class SimulatorResult(BaseModel):
    points: list[SimulatedPoint]
    baseline_total: float
    simulated_total: float
    reduction_pct: float
    estimated_carbon_tax: float
