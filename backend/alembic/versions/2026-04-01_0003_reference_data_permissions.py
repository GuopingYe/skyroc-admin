"""Seed RBAC permissions for reference data page access

Revision ID: ref_data_perm_001
Revises: ref_data_seed_001
Create Date: 2026-04-01 00:03:00.000000+00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "ref_data_perm_001"
down_revision: Union[str, None] = "ref_data_seed_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "INSERT INTO permissions (code, name, category, description) "
            "VALUES (:code, :name, :cat, :desc) "
            "ON CONFLICT (code) DO NOTHING"
        ),
        [
            {"code": "page:reference-data:view", "name": "View Reference Data", "cat": "page", "desc": "Access the Reference Data management page"},
        ],
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM permissions WHERE code = :code"),
        {"code": "page:reference-data:view"},
    )
