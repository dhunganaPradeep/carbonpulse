"""Organisation model."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.emission_record import EmissionRecord
    from app.db.models.supplier import Supplier


class Organisation(Base, TimestampMixin):
    __tablename__ = "organisations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)

    users: Mapped[list["User"]] = relationship(back_populates="organisation")
    emission_records: Mapped[list["EmissionRecord"]] = relationship(
        back_populates="organisation"
    )
    suppliers: Mapped[list["Supplier"]] = relationship(back_populates="organisation")
