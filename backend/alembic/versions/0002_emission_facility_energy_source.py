"""Add facility and energy_source columns to emission_records.

Revision ID: 0002
Revises: 0001
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "emission_records",
        sa.Column("facility", sa.String(255), nullable=True),
    )
    op.add_column(
        "emission_records",
        sa.Column("energy_source", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("emission_records", "energy_source")
    op.drop_column("emission_records", "facility")
