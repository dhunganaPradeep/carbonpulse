"""Emission record model (the core time-series table)."""

from __future__ import annotations

import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Index, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, new_uuid
from app.db.models.enums import EmissionScope

if TYPE_CHECKING:
    from app.db.models.organisation import Organisation
    from app.db.models.supplier import Supplier


class EmissionRecord(Base, TimestampMixin):
    __tablename__ = "emission_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
    )
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
    )
    recorded_on: Mapped[date] = mapped_column(Date, nullable=False)
    scope: Mapped[EmissionScope] = mapped_column(
        SAEnum(
            EmissionScope,
            name="emission_scope",
            create_type=False,
            values_callable=lambda enum: [e.value for e in enum],
        ),
        nullable=False,
    )
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    facility: Mapped[str | None] = mapped_column(String(255), nullable=True)
    energy_source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # tonnes CO2-equivalent
    co2e_tonnes: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)

    organisation: Mapped["Organisation"] = relationship(
        back_populates="emission_records"
    )
    supplier: Mapped["Supplier | None"] = relationship(back_populates="emission_records")

    __table_args__ = (
        Index("ix_emission_org_date", "org_id", "recorded_on"),
        Index("ix_emission_org_scope_date", "org_id", "scope", "recorded_on"),
    )
