"""Emissions Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.enums import EmissionScope


class EmissionCreate(BaseModel):
    recorded_on: date
    scope: EmissionScope
    co2e_tonnes: float = Field(ge=0, description="Tonnes CO2-equivalent")
    category: str | None = Field(default=None, max_length=255)
    facility: str | None = Field(default=None, max_length=255)
    energy_source: str | None = Field(default=None, max_length=64)
    source: str | None = Field(default=None, max_length=255)
    supplier_id: uuid.UUID | None = None


class EmissionUpdate(BaseModel):
    recorded_on: date | None = None
    scope: EmissionScope | None = None
    co2e_tonnes: float | None = Field(default=None, ge=0)
    category: str | None = Field(default=None, max_length=255)
    facility: str | None = Field(default=None, max_length=255)
    energy_source: str | None = Field(default=None, max_length=64)
    source: str | None = Field(default=None, max_length=255)
    supplier_id: uuid.UUID | None = None


class EmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    recorded_on: date
    scope: EmissionScope
    co2e_tonnes: float
    category: str | None
    facility: str | None
    energy_source: str | None
    source: str | None
    supplier_id: uuid.UUID | None


class EmissionPage(BaseModel):
    items: list[EmissionOut]
    total: int
    limit: int
    offset: int


class ScopeTotal(BaseModel):
    scope: EmissionScope
    total_co2e_tonnes: float


class TimeBucket(BaseModel):
    period: date
    scope: EmissionScope
    total_co2e_tonnes: float


class AggregationResponse(BaseModel):
    by_scope: list[ScopeTotal]
    grand_total_co2e_tonnes: float


class DimensionTotal(BaseModel):
    """Total emissions grouped by an arbitrary dimension value."""

    key: str
    total_co2e_tonnes: float


class DimensionBreakdownResponse(BaseModel):
    dimension: str
    items: list[DimensionTotal]
    grand_total_co2e_tonnes: float
