"""Regulatory snapshot model."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Index, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, new_uuid


class RegulatorySnapshot(Base, TimestampMixin):
    __tablename__ = "regulatory_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
    )
    snapshot_on: Mapped[date] = mapped_column(Date, nullable=False)
    # overall composite risk score 0-100
    risk_score: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    # JSON-encoded per-framework breakdown (CSRD, SEC, carbon tax)
    breakdown: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (Index("ix_regulatory_org_date", "org_id", "snapshot_on"),)
