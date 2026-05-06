"""Shared enumerations for ORM models."""

from __future__ import annotations

import enum


class EmissionScope(str, enum.Enum):
    SCOPE_1 = "scope_1"
    SCOPE_2 = "scope_2"
    SCOPE_3 = "scope_3"


class EmissionCategory(str, enum.Enum):
    """GHG-Protocol-aligned categories grouped by scope."""

    # Scope 1
    STATIONARY_COMBUSTION = "stationary_combustion"
    MOBILE_COMBUSTION = "mobile_combustion"
    FUGITIVE = "fugitive"
    # Scope 2
    PURCHASED_ELECTRICITY = "purchased_electricity"
    PURCHASED_STEAM = "purchased_steam"
    # Scope 3
    PURCHASED_GOODS = "purchased_goods"
    TRANSPORT = "transport"
    BUSINESS_TRAVEL = "business_travel"
    WASTE = "waste"


class EnergySource(str, enum.Enum):
    """Energy source mix used to attribute emissions."""

    GRID = "grid"
    NATURAL_GAS = "natural_gas"
    DIESEL = "diesel"
    RENEWABLE = "renewable"
    OTHER = "other"


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    ANALYST = "ANALYST"
    VIEWER = "VIEWER"


class ForecastStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ForecastModel(str, enum.Enum):
    PROPHET = "prophet"
    LSTM = "lstm"
