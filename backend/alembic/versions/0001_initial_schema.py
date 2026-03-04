from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")

    op.execute("CREATE TYPE user_role AS ENUM ('ADMIN', 'ANALYST', 'VIEWER');")
    op.execute("CREATE TYPE emission_scope AS ENUM ('scope_1', 'scope_2', 'scope_3');")
    op.execute("CREATE TYPE forecast_model AS ENUM ('prophet', 'lstm');")
    op.execute("CREATE TYPE forecast_status AS ENUM ('pending', 'running', 'completed', 'failed');")

    op.create_table(
        "organisations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False, unique=True),
        sa.Column("industry", sa.String(255)),
        sa.Column("country", sa.String(2)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_organisations_slug", "organisations", ["slug"])

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255)),
        sa.Column("role", sa.String(50), nullable=False, server_default="VIEWER"), # Changed to String
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_org_id", "users", ["org_id"])
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "suppliers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("country", sa.String(2)),
        sa.Column("emission_share", sa.Numeric(6, 4)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_supplier_org", "suppliers", ["org_id"])

    op.create_table(
        "emission_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id", ondelete="SET NULL")),
        sa.Column("recorded_on", sa.Date, nullable=False),
        sa.Column("scope", sa.String(50), nullable=False), # Changed to String
        sa.Column("category", sa.String(255)),
        sa.Column("co2e_tonnes", sa.Numeric(14, 4), nullable=False),
        sa.Column("source", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_emission_org_date", "emission_records", ["org_id", "recorded_on"])
    op.create_index("ix_emission_org_scope_date", "emission_records", ["org_id", "scope", "recorded_on"])

    op.create_table(
        "forecast_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("model", sa.String(50), nullable=False, server_default="prophet"), # Changed to String
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"), # Changed to String
        sa.Column("horizon_months", sa.Integer, nullable=False, server_default=sa.text("12")),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("error", sa.Text),
        sa.Column("metrics", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_forecast_run_org_created", "forecast_runs", ["org_id", "created_at"])

    op.create_table(
        "forecast_points",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("forecast_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("forecast_date", sa.Date, nullable=False),
        sa.Column("yhat", sa.Numeric(14, 4), nullable=False),
        sa.Column("yhat_lower", sa.Numeric(14, 4), nullable=False),
        sa.Column("yhat_upper", sa.Numeric(14, 4), nullable=False),
        sa.Column("scope", sa.String(20)),
    )

    op.create_index(
        "ix_forecast_point_run_date",
        "forecast_points",
        ["run_id", "forecast_date"],
    )

    op.create_table(
        "simulation_scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organisations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("parameters", sa.Text, nullable=False),
        sa.Column("result", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_simulation_org", "simulation_scenarios", ["org_id"])

    op.create_table(
        "regulatory_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organisations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("snapshot_on", sa.Date, nullable=False),
        sa.Column("risk_score", sa.Numeric(6, 2), nullable=False),
        sa.Column("breakdown", sa.Text),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_regulatory_org_date", "regulatory_snapshots", ["org_id", "snapshot_on"])

    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="SET NULL")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("action", sa.String(255), nullable=False),
        sa.Column("entity", sa.String(255)),
        sa.Column("detail", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_audit_org_created", "audit_log", ["org_id", "created_at"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("regulatory_snapshots")
    op.drop_table("simulation_scenarios")
    op.drop_table("forecast_points")
    op.drop_table("forecast_runs")
    op.drop_table("emission_records")
    op.drop_table("suppliers")
    op.drop_table("users")
    op.drop_table("organisations")
    for enum_name in ("forecast_status", "forecast_model", "emission_scope", "user_role"):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")