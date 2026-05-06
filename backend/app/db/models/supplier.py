"""Supplier model."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.db.models.organisation import Organisation
    from app.db.models.emission_record import EmissionRecord


class Supplier(Base, TimestampMixin):
    __tablename__ = "suppliers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    # share of org Scope 3 emissions attributable to this supplier (0-1)
    emission_share: Mapped[float | None] = mapped_column(Numeric(6, 4), nullable=True)

    organisation: Mapped["Organisation"] = relationship(back_populates="suppliers")
    emission_records: Mapped[list["EmissionRecord"]] = relationship(
        back_populates="supplier"
    )

    __table_args__ = (Index("ix_supplier_org", "org_id"),)
