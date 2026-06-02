from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.task import Task
from app.schemas.tasks import TaskCreate, TaskUpdate

async def list_tasks(session: AsyncSession, org_id: uuid.UUID) -> list[Task]:
    rows = await session.scalars(
        select(Task)
        .where(Task.org_id == org_id)
        .order_by(Task.created_at.desc())
    )
    return list(rows)

async def create_task(session: AsyncSession, org_id: uuid.UUID, payload: TaskCreate) -> Task:
    record = Task(org_id=org_id, **payload.model_dump())
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record

async def get_task(session: AsyncSession, org_id: uuid.UUID, task_id: uuid.UUID) -> Task:
    record = await session.scalar(
        select(Task).where(Task.id == task_id, Task.org_id == org_id)
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return record

async def update_task(
    session: AsyncSession, org_id: uuid.UUID, task_id: uuid.UUID, payload: TaskUpdate
) -> Task:
    record = await get_task(session, org_id, task_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    await session.commit()
    await session.refresh(record)
    return record

async def delete_task(session: AsyncSession, org_id: uuid.UUID, task_id: uuid.UUID) -> None:
    record = await get_task(session, org_id, task_id)
    await session.delete(record)
    await session.commit()
