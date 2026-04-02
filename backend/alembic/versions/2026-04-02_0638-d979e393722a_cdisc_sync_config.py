"""cdisc_sync_config

Revision ID: d979e393722a
Revises: ref_data_perm_001
Create Date: 2026-04-02 06:38:11.871574+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd979e393722a'
down_revision: Union[str, None] = 'ref_data_perm_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('cdisc_library_config',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('api_base_url', sa.String(length=512), nullable=False, comment='CDISC Library API base URL'),
        sa.Column('api_key', sa.String(length=256), nullable=False, comment='CDISC Library API key (masked in API responses)'),
        sa.Column('enabled_standard_types', sa.JSON(), nullable=True, comment='Array of enabled standard types, e.g. ["sdtmig", "adamig", "ct"]'),
        sa.Column('sync_schedule', sa.JSON(), nullable=True, comment='Schedule config: {"type": "daily", "interval_hours": null, ...}'),
        sa.Column('sync_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false'), comment='Master switch for scheduled sync'),
        sa.Column('updated_by', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        comment='CDISC Library runtime configuration (single row, id=1)'
    )
    op.create_table('cdisc_sync_log',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('task_id', sa.String(length=64), nullable=False, comment='UUID identifying the background task'),
        sa.Column('standard_type', sa.String(length=32), nullable=False, comment='Standard type: sdtmig, ct, etc.'),
        sa.Column('version', sa.String(length=64), nullable=False, comment='Version: 3-4, all, latest, etc.'),
        sa.Column('status', sa.String(length=16), nullable=False, comment='pending, running, completed, failed, interrupted'),
        sa.Column('progress', sa.JSON(), nullable=True, comment='Checkpoint: {"current_step": "...", "completed": 5, "total": 20}'),
        sa.Column('result_summary', sa.JSON(), nullable=True, comment='Final counts after sync completes'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('triggered_by', sa.String(length=16), nullable=False, comment='manual or scheduled'),
        sa.Column('created_by', sa.String(length=64), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        comment='CDISC sync history with progress checkpoints'
    )
    op.create_index(op.f('ix_cdisc_sync_log_standard_type'), 'cdisc_sync_log', ['standard_type'], unique=False)
    op.create_index(op.f('ix_cdisc_sync_log_status'), 'cdisc_sync_log', ['status'], unique=False)
    op.create_index('ix_cdisc_sync_log_status_started', 'cdisc_sync_log', ['status', 'started_at'], unique=False)
    op.create_index(op.f('ix_cdisc_sync_log_task_id'), 'cdisc_sync_log', ['task_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_cdisc_sync_log_task_id'), table_name='cdisc_sync_log')
    op.drop_index('ix_cdisc_sync_log_status_started', table_name='cdisc_sync_log')
    op.drop_index(op.f('ix_cdisc_sync_log_status'), table_name='cdisc_sync_log')
    op.drop_index(op.f('ix_cdisc_sync_log_standard_type'), table_name='cdisc_sync_log')
    op.drop_table('cdisc_sync_log')
    op.drop_table('cdisc_library_config')
