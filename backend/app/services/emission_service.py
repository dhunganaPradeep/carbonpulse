"""Emissions service: org-scoped CRUD and aggregations."""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import HTTPException, status
import json
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis_client import get_redis
from app.db.models import EmissionRecord
from app.db.models.enums import EmissionScope
from app.schemas.emissions import (
    AggregationResponse,
    DimensionBreakdownResponse,
    DimensionTotal,
    EmissionCreate,
    EmissionUpdate,
    ScopeTotal,
    TimeBucket,
)

# Columns that may be used as a breakdown dimension.
_BREAKDOWN_COLUMNS = {
    "category": EmissionRecord.category,
    "facility": EmissionRecord.facility,
    "energy_source": EmissionRecord.energy_source,
    "supplier": EmissionRecord.supplier_id,
}


async def _invalidate_org_cache(org_id: uuid.UUID) -> None:
    redis = get_redis()
    prefix = f"emissions:{org_id}:"
    keys = await redis.keys(f"{prefix}*")
    if keys:
        await redis.delete(*keys)

async def create_emission(
    session: AsyncSession, org_id: uuid.UUID, payload: EmissionCreate
) -> EmissionRecord:
    record = EmissionRecord(org_id=org_id, **payload.model_dump())
    session.add(record)
    await session.commit()
    await session.refresh(record)
    await _invalidate_org_cache(org_id)
    return record


async def get_emission(
    session: AsyncSession, org_id: uuid.UUID, record_id: uuid.UUID
) -> EmissionRecord:
    record = await session.scalar(
        select(EmissionRecord).where(
            EmissionRecord.id == record_id, EmissionRecord.org_id == org_id
        )
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Emission record not found"
        )
    return record


async def list_emissions(
    session: AsyncSession,
    org_id: uuid.UUID,
    *,
    scope: EmissionScope | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[EmissionRecord], int]:
    filters = [EmissionRecord.org_id == org_id]
    if scope is not None:
        filters.append(EmissionRecord.scope == scope)
    if date_from is not None:
        filters.append(EmissionRecord.recorded_on >= date_from)
    if date_to is not None:
        filters.append(EmissionRecord.recorded_on <= date_to)

    total = await session.scalar(
        select(func.count()).select_from(EmissionRecord).where(*filters)
    )
    rows = await session.scalars(
        select(EmissionRecord)
        .where(*filters)
        .order_by(EmissionRecord.recorded_on.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(rows), int(total or 0)


async def update_emission(
    session: AsyncSession,
    org_id: uuid.UUID,
    record_id: uuid.UUID,
    payload: EmissionUpdate,
) -> EmissionRecord:
    record = await get_emission(session, org_id, record_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    await session.commit()
    await session.refresh(record)
    await _invalidate_org_cache(org_id)
    return record


async def delete_emission(
    session: AsyncSession, org_id: uuid.UUID, record_id: uuid.UUID
) -> None:
    record = await get_emission(session, org_id, record_id)
    await session.delete(record)
    await session.commit()
    await _invalidate_org_cache(org_id)


async def aggregate_by_scope(
    session: AsyncSession,
    org_id: uuid.UUID,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
) -> AggregationResponse:
    redis = get_redis()
    cache_key = f"emissions:{org_id}:scope:{date_from}:{date_to}"
    cached = await redis.get(cache_key)
    if cached:
        return AggregationResponse.model_validate_json(cached)

    filters = [EmissionRecord.org_id == org_id]
    if date_from is not None:
        filters.append(EmissionRecord.recorded_on >= date_from)
    if date_to is not None:
        filters.append(EmissionRecord.recorded_on <= date_to)

    rows = await session.execute(
        select(
            EmissionRecord.scope,
            func.coalesce(func.sum(EmissionRecord.co2e_tonnes), 0),
        )
        .where(*filters)
        .group_by(EmissionRecord.scope)
    )
    by_scope = [
        ScopeTotal(scope=scope, total_co2e_tonnes=float(total))
        for scope, total in rows.all()
    ]
    grand_total = sum(s.total_co2e_tonnes for s in by_scope)
    resp = AggregationResponse(by_scope=by_scope, grand_total_co2e_tonnes=grand_total)
    await redis.set(cache_key, resp.model_dump_json(), ex=3600)
    return resp


async def aggregate_by_dimension(
    session: AsyncSession,
    org_id: uuid.UUID,
    *,
    dimension: str,
    date_from: date | None = None,
    date_to: date | None = None,
) -> DimensionBreakdownResponse:
    """Sum emissions grouped by a single enriched dimension.

    ``dimension`` must be one of: category, facility, energy_source, supplier.
    Rows with a NULL value for the dimension are grouped under "unspecified".
    """
    column = _BREAKDOWN_COLUMNS.get(dimension)
    if column is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"dimension must be one of: {', '.join(sorted(_BREAKDOWN_COLUMNS))}",
        )

    redis = get_redis()
    cache_key = f"emissions:{org_id}:dim:{dimension}:{date_from}:{date_to}"
    cached = await redis.get(cache_key)
    if cached:
        return DimensionBreakdownResponse.model_validate_json(cached)

    filters = [EmissionRecord.org_id == org_id]
    if date_from is not None:
        filters.append(EmissionRecord.recorded_on >= date_from)
    if date_to is not None:
        filters.append(EmissionRecord.recorded_on <= date_to)

    total_col = func.coalesce(func.sum(EmissionRecord.co2e_tonnes), 0)
    rows = await session.execute(
        select(column, total_col)
        .where(*filters)
        .group_by(column)
        .order_by(total_col.desc())
    )
    items = [
        DimensionTotal(
            key=str(key) if key is not None else "unspecified",
            total_co2e_tonnes=float(total),
        )
        for key, total in rows.all()
    ]
    grand_total = sum(i.total_co2e_tonnes for i in items)
    resp = DimensionBreakdownResponse(
        dimension=dimension, items=items, grand_total_co2e_tonnes=grand_total
    )
    await redis.set(cache_key, resp.model_dump_json(), ex=3600)
    return resp


async def aggregate_timeseries(
    session: AsyncSession,
    org_id: uuid.UUID,
    *,
    granularity: str = "month",
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[TimeBucket]:
    if granularity not in {"day", "week", "month", "year"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="granularity must be one of: day, week, month, year",
        )

    redis = get_redis()
    cache_key = f"emissions:{org_id}:ts:{granularity}:{date_from}:{date_to}"
    cached = await redis.get(cache_key)
    if cached:
        return [TimeBucket.model_validate(x) for x in json.loads(cached)]

    period = func.date_trunc(granularity, EmissionRecord.recorded_on).label("period")
    filters = [EmissionRecord.org_id == org_id]
    if date_from is not None:
        filters.append(EmissionRecord.recorded_on >= date_from)
    if date_to is not None:
        filters.append(EmissionRecord.recorded_on <= date_to)

    rows = await session.execute(
        select(
            period,
            EmissionRecord.scope,
            func.coalesce(func.sum(EmissionRecord.co2e_tonnes), 0),
        )
        .where(*filters)
        .group_by(period, EmissionRecord.scope)
        .order_by(period)
    )
    resp = [
        TimeBucket(
            period=p.date() if hasattr(p, "date") else p,
            scope=scope,
            total_co2e_tonnes=float(total),
        )
        for p, scope, total in rows.all()
    ]
    await redis.set(cache_key, json.dumps([x.model_dump(mode="json") for x in resp]), ex=3600)
    return resp
