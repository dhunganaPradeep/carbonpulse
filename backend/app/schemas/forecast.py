"""Forecast Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.enums import ForecastModel, ForecastStatus


class ForecastTriggerRequest(BaseModel):
    horizon_months: int = Field(default=12, ge=1, le=36)
    model: ForecastModel = ForecastModel.PROPHET


class ForecastPointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    forecast_date: date
    yhat: float
    yhat_lower: float
    yhat_upper: float
    scope: str | None


class ForecastRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    model: ForecastModel
    status: ForecastStatus
    horizon_months: int
    started_at: datetime | None
    completed_at: datetime | None
    error: str | None
    metrics: str | None
    created_at: datetime


class ForecastRunDetail(ForecastRunOut):
    points: list[ForecastPointOut] = []
