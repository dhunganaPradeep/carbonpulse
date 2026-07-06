"""Emissions endpoints (CRUD + aggregation)."""

from __future__ import annotations

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentOrgId, RequireWriteAccess
from app.db.models.enums import EmissionScope
from app.db.session import get_db
from app.schemas.emissions import (
    AggregationResponse,
    DimensionBreakdownResponse,
    EmissionCreate,
    EmissionOut,
    EmissionPage,
    EmissionUpdate,
    TimeBucket,
)
from app.services import emission_service

router = APIRouter(prefix="/emissions", tags=["emissions"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post(
    "",
    response_model=EmissionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[RequireWriteAccess],
)
async def create(
    payload: EmissionCreate, org_id: CurrentOrgId, session: DbSession
) -> EmissionOut:
    record = await emission_service.create_emission(session, org_id, payload)
    return EmissionOut.model_validate(record)


@router.get("", response_model=EmissionPage)
async def list_records(
    org_id: CurrentOrgId,
    session: DbSession,
    scope: EmissionScope | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> EmissionPage:
    items, total = await emission_service.list_emissions(
        session,
        org_id,
        scope=scope,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return EmissionPage(
        items=[EmissionOut.model_validate(i) for i in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/aggregate", response_model=AggregationResponse)
async def aggregate(
    org_id: CurrentOrgId,
    session: DbSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> AggregationResponse:
    return await emission_service.aggregate_by_scope(
        session, org_id, date_from=date_from, date_to=date_to
    )


@router.get("/breakdown", response_model=DimensionBreakdownResponse)
async def breakdown(
    org_id: CurrentOrgId,
    session: DbSession,
    dimension: Annotated[
        str,
        Query(description="One of: category, facility, energy_source, supplier"),
    ] = "category",
    date_from: date | None = None,
    date_to: date | None = None,
) -> DimensionBreakdownResponse:
    return await emission_service.aggregate_by_dimension(
        session,
        org_id,
        dimension=dimension,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/timeseries", response_model=list[TimeBucket])
async def timeseries(
    org_id: CurrentOrgId,
    session: DbSession,
    granularity: str = "month",
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[TimeBucket]:
    return await emission_service.aggregate_timeseries(
        session,
        org_id,
        granularity=granularity,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/{record_id}", response_model=EmissionOut)
async def get_one(
    record_id: uuid.UUID, org_id: CurrentOrgId, session: DbSession
) -> EmissionOut:
    record = await emission_service.get_emission(session, org_id, record_id)
    return EmissionOut.model_validate(record)


@router.patch(
    "/{record_id}", response_model=EmissionOut, dependencies=[RequireWriteAccess]
)
async def update(
    record_id: uuid.UUID,
    payload: EmissionUpdate,
    org_id: CurrentOrgId,
    session: DbSession,
) -> EmissionOut:
    record = await emission_service.update_emission(session, org_id, record_id, payload)
    return EmissionOut.model_validate(record)


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[RequireWriteAccess],
)
async def delete(
    record_id: uuid.UUID, org_id: CurrentOrgId, session: DbSession
) -> Response:
    await emission_service.delete_emission(session, org_id, record_id)
