"""Regulatory risk scoring endpoint."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentOrgId, RequireWriteAccess
from app.db.session import get_db
from app.schemas.regulatory import RegulatoryScoreRequest, RegulatoryScoreResponse
from app.services import regulatory_service

router = APIRouter(prefix="/regulatory", tags=["regulatory"])

DbSession = Annotated[AsyncSession, Depends(get_db)]

# Default org profile for read-only dashboard snapshots.
_DEFAULT_SNAPSHOT = RegulatoryScoreRequest(
    annual_revenue_eur=60_000_000,
    employee_count=300,
    is_eu_operating=True,
    is_us_listed=True,
    carbon_tax_rate=85.0,
)


@router.get("/snapshot", response_model=RegulatoryScoreResponse)
async def snapshot(org_id: CurrentOrgId, session: DbSession) -> RegulatoryScoreResponse:
    """Read-only regulatory score for dashboards (all authenticated roles)."""
    return await regulatory_service.score(session, org_id, _DEFAULT_SNAPSHOT)


@router.post(
    "/score", response_model=RegulatoryScoreResponse, dependencies=[RequireWriteAccess]
)
async def score(
    payload: RegulatoryScoreRequest, org_id: CurrentOrgId, session: DbSession
) -> RegulatoryScoreResponse:
    return await regulatory_service.score(session, org_id, payload)
