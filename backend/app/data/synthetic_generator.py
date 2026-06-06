"""Synthetic emissions data generator.

Produces realistic daily Scope 1/2/3 CO2e emissions over multiple years with
trend, annual + weekly seasonality and gaussian noise. Used by the seed script
and for demo purposes.

Two levels of detail are available:

* :func:`generate_emissions` returns one :class:`EmissionPoint` per scope per
  day (the historical, backward-compatible behaviour).
* :func:`generate_detailed_emissions` splits each scope total into
  per-category, per-facility and per-energy-source :class:`DetailedEmissionPoint`
  records. The detailed per-category values sum back to the scope total for the
  same day (within floating point tolerance), so existing scope-level
  aggregations are preserved.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import date, timedelta

from app.db.models.enums import EmissionCategory, EmissionScope, EnergySource

# Baseline daily emissions (tonnes CO2e) and behaviour per scope.
_SCOPE_PROFILE: dict[EmissionScope, dict[str, float]] = {
    EmissionScope.SCOPE_1: {"base": 40.0, "trend": -0.004, "season": 0.18, "noise": 0.06},
    EmissionScope.SCOPE_2: {"base": 25.0, "trend": -0.006, "season": 0.12, "noise": 0.05},
    EmissionScope.SCOPE_3: {"base": 120.0, "trend": -0.002, "season": 0.22, "noise": 0.08},
}

# How each scope total is split across categories (weights sum to 1.0).
_CATEGORY_SPLIT: dict[EmissionScope, dict[EmissionCategory, float]] = {
    EmissionScope.SCOPE_1: {
        EmissionCategory.STATIONARY_COMBUSTION: 0.55,
        EmissionCategory.MOBILE_COMBUSTION: 0.30,
        EmissionCategory.FUGITIVE: 0.15,
    },
    EmissionScope.SCOPE_2: {
        EmissionCategory.PURCHASED_ELECTRICITY: 0.80,
        EmissionCategory.PURCHASED_STEAM: 0.20,
    },
    EmissionScope.SCOPE_3: {
        EmissionCategory.PURCHASED_GOODS: 0.45,
        EmissionCategory.TRANSPORT: 0.30,
        EmissionCategory.BUSINESS_TRAVEL: 0.15,
        EmissionCategory.WASTE: 0.10,
    },
}

# Dominant energy source per category, used for the energy-source mix.
_CATEGORY_ENERGY: dict[EmissionCategory, EnergySource] = {
    EmissionCategory.STATIONARY_COMBUSTION: EnergySource.NATURAL_GAS,
    EmissionCategory.MOBILE_COMBUSTION: EnergySource.DIESEL,
    EmissionCategory.FUGITIVE: EnergySource.OTHER,
    EmissionCategory.PURCHASED_ELECTRICITY: EnergySource.GRID,
    EmissionCategory.PURCHASED_STEAM: EnergySource.NATURAL_GAS,
    EmissionCategory.PURCHASED_GOODS: EnergySource.OTHER,
    EmissionCategory.TRANSPORT: EnergySource.DIESEL,
    EmissionCategory.BUSINESS_TRAVEL: EnergySource.OTHER,
    EmissionCategory.WASTE: EnergySource.OTHER,
}

# Synthetic facilities and the share of each scope they account for.
# Shares sum to 1.0 so per-facility values reconstruct the scope total.
_FACILITIES: dict[str, float] = {
    "Plant A (Hamburg)": 0.28,
    "Plant B (Lyon)": 0.22,
    "Plant C (Katowice)": 0.18,
    "Distribution Centre (Rotterdam)": 0.14,
    "R&D Campus (Munich)": 0.10,
    "HQ (Berlin)": 0.08,
}


@dataclass(frozen=True)
class EmissionPoint:
    recorded_on: date
    scope: EmissionScope
    co2e_tonnes: float


@dataclass(frozen=True)
class DetailedEmissionPoint:
    recorded_on: date
    scope: EmissionScope
    category: EmissionCategory
    facility: str
    energy_source: EnergySource
    co2e_tonnes: float


def _seasonal_factor(day_of_year: int, weekday: int, season_amp: float) -> float:
    """Annual (heating/cooling) + weekly (lower on weekends) seasonality."""
    annual = season_amp * math.cos(2 * math.pi * (day_of_year - 15) / 365.0)
    weekly = -0.12 if weekday >= 5 else 0.0
    return 1.0 + annual + weekly


def _scope_total(
    profile: dict[str, float], offset: int, day: date, rng: random.Random
) -> float:
    """Daily scope total: base * trend * seasonality * gaussian noise."""
    trend = 1.0 + profile["trend"] * offset / 30.0
    seasonal = _seasonal_factor(
        day.timetuple().tm_yday, day.weekday(), profile["season"]
    )
    noise = rng.gauss(1.0, profile["noise"])
    return max(0.0, profile["base"] * trend * seasonal * noise)


def generate_emissions(
    *,
    years: float = 5.0,
    end: date | None = None,
    seed: int | None = 42,
) -> list[EmissionPoint]:
    """Generate daily scope-level emissions for each scope.

    Backward compatible: returns one :class:`EmissionPoint` per scope per day.

    Args:
        years: number of years of history (>=3 recommended).
        end: last day (defaults to today).
        seed: RNG seed for reproducibility.
    """
    rng = random.Random(seed)
    end = end or date.today()
    total_days = int(years * 365)
    start = end - timedelta(days=total_days)

    points: list[EmissionPoint] = []
    for offset in range(total_days + 1):
        day = start + timedelta(days=offset)
        for scope, profile in _SCOPE_PROFILE.items():
            value = _scope_total(profile, offset, day, rng)
            points.append(
                EmissionPoint(
                    recorded_on=day,
                    scope=scope,
                    co2e_tonnes=round(value, 4),
                )
            )
    return points


def generate_detailed_emissions(
    *,
    years: float = 5.0,
    end: date | None = None,
    seed: int | None = 42,
) -> list[DetailedEmissionPoint]:
    """Generate richer per-category / facility / energy-source emissions.

    Each daily scope total (produced with the same model and seed as
    :func:`generate_emissions`) is split across categories and facilities. The
    sum of the detailed per-category values for a given scope and day equals
    that day's scope total within floating-point tolerance, keeping scope-level
    aggregations consistent.

    Args:
        years: number of years of history (>=3 recommended).
        end: last day (defaults to today).
        seed: RNG seed for reproducibility.
    """
    rng = random.Random(seed)
    end = end or date.today()
    total_days = int(years * 365)
    start = end - timedelta(days=total_days)

    points: list[DetailedEmissionPoint] = []
    for offset in range(total_days + 1):
        day = start + timedelta(days=offset)
        for scope, profile in _SCOPE_PROFILE.items():
            scope_total = _scope_total(profile, offset, day, rng)
            for category, cat_weight in _CATEGORY_SPLIT[scope].items():
                category_total = scope_total * cat_weight
                energy_source = _CATEGORY_ENERGY[category]
                for facility, fac_weight in _FACILITIES.items():
                    value = category_total * fac_weight
                    points.append(
                        DetailedEmissionPoint(
                            recorded_on=day,
                            scope=scope,
                            category=category,
                            facility=facility,
                            energy_source=energy_source,
                            co2e_tonnes=round(value, 4),
                        )
                    )
    return points
