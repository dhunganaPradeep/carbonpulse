"""What-if simulator endpoint (stateless)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentOrgId, RequireWriteAccess
from app.db.session import get_db
from app.schemas.simulator import SimulatorParams, SimulatorResult
from app.services import simulator_service

router = APIRouter(prefix="/simulator", tags=["simulator"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post("/run", response_model=SimulatorResult)
async def run_simulation(
    params: SimulatorParams, org_id: CurrentOrgId, session: DbSession
) -> SimulatorResult:
    return await simulator_service.simulate(session, org_id, params)
