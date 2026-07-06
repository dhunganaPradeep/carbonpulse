"""Forecast endpoints (trigger + results)."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentOrgId, RequireWriteAccess
from app.db.session import get_db
from app.schemas.forecast import (
    ForecastPointOut,
    ForecastRunDetail,
    ForecastRunOut,
    ForecastTriggerRequest,
)
from app.services import forecast_service

router = APIRouter(prefix="/forecast", tags=["forecast"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post(
    "/runs",
    response_model=ForecastRunOut,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[RequireWriteAccess],
)
async def trigger_forecast(
    payload: ForecastTriggerRequest,
    org_id: CurrentOrgId,
    session: DbSession,
    background: BackgroundTasks,
) -> ForecastRunOut:
    run = await forecast_service.create_run(
        session, org_id, payload.horizon_months, payload.model
    )
    background.add_task(forecast_service.execute_run, run.id)
    return ForecastRunOut.model_validate(run)


@router.get("/runs/latest", response_model=ForecastRunDetail)
async def get_latest(org_id: CurrentOrgId, session: DbSession) -> ForecastRunDetail:
    run = await forecast_service.latest_run(session, org_id)
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed forecast run found",
        )
    points = await forecast_service.get_run_points(session, run.id)
    return _build_run_detail(run, points)


@router.get("/runs/{run_id}", response_model=ForecastRunDetail)
async def get_run(
    run_id: uuid.UUID, org_id: CurrentOrgId, session: DbSession
) -> ForecastRunDetail:
    run = await forecast_service.get_run(session, org_id, run_id)
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Forecast run not found"
        )
    points = await forecast_service.get_run_points(session, run.id)
    return _build_run_detail(run, points)


def _build_run_detail(run, points) -> ForecastRunDetail:
    """Build a detail response without triggering async lazy-load on run.points."""
    base = ForecastRunOut.model_validate(run)
    return ForecastRunDetail(
        **base.model_dump(),
        points=[ForecastPointOut.model_validate(p) for p in points],
    )
