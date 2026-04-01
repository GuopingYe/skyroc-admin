"""Create reference_data table

Revision ID: ref_data_001
Revises: shell_lib_001
Create Date: 2026-04-01 00:01:00.000000+00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.models.base import JSONB

revision: str = "ref_data_001"
down_revision: Union[str, None] = "shell_lib_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "reference_data",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False, comment="Reference data category"),
        sa.Column("code", sa.String(length=64), nullable=False, comment="Short code"),
        sa.Column("label", sa.String(length=256), nullable=False, comment="Display name"),
        sa.Column("description", sa.Text(), nullable=True, comment="Optional description"),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False, comment="Display ordering"),
        sa.Column("metadata_", JSONB(), nullable=True, comment="Extensible per-category fields"),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False, comment="Active toggle"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_by", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        comment="Generic reference data for configurable clinical metadata",
    )
    op.create_index(op.f("ix_reference_data_category"), "reference_data", ["category"], unique=False)
    op.create_index(op.f("ix_reference_data_is_active"), "reference_data", ["is_active"], unique=False)
    op.create_index(op.f("ix_reference_data_is_deleted"), "reference_data", ["is_deleted"], unique=False)
    op.execute(
        "CREATE UNIQUE INDEX uq_reference_data_category_code "
        "ON reference_data (category, code) WHERE is_deleted = false"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_reference_data_category_code")
    op.drop_index(op.f("ix_reference_data_is_deleted"), table_name="reference_data")
    op.drop_index(op.f("ix_reference_data_is_active"), table_name="reference_data")
    op.drop_index(op.f("ix_reference_data_category"), table_name="reference_data")
    op.drop_table("reference_data")
