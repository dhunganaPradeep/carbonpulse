from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentOrgId, RequireWriteAccess
from app.db.session import get_db
from app.schemas.tasks import TaskCreate, TaskOut, TaskUpdate
from app.services import task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])

DbSession = Annotated[AsyncSession, Depends(get_db)]

@router.post(
    "",
    response_model=TaskOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[RequireWriteAccess],
)
async def create(
    payload: TaskCreate, org_id: CurrentOrgId, session: DbSession
) -> TaskOut:
    record = await task_service.create_task(session, org_id, payload)
    return TaskOut.model_validate(record)

@router.get("", response_model=list[TaskOut])
async def list_records(
    org_id: CurrentOrgId, session: DbSession
) -> list[TaskOut]:
    items = await task_service.list_tasks(session, org_id)
    return [TaskOut.model_validate(i) for i in items]

@router.patch(
    "/{task_id}", response_model=TaskOut, dependencies=[RequireWriteAccess]
)
async def update(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    org_id: CurrentOrgId,
    session: DbSession,
) -> TaskOut:
    record = await task_service.update_task(session, org_id, task_id, payload)
    return TaskOut.model_validate(record)

@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[RequireWriteAccess],
)
async def delete(
    task_id: uuid.UUID, org_id: CurrentOrgId, session: DbSession
) -> Response:
    await task_service.delete_task(session, org_id, task_id)
