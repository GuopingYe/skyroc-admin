"""shell_library_system

Revision ID: shell_lib_001
Revises: 393f43c88771
Create Date: 2026-03-31 00:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.models.base import JSONB


# revision identifiers, used by Alembic.
revision: str = 'shell_lib_001'
down_revision: Union[str, None] = '393f43c88771'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================================
    # 1. Create shell_library_templates table
    # ============================================================
    op.create_table(
        'shell_library_templates',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('scope_level', sa.String(length=20), nullable=False, comment='Scope level: Global / TA / Compound / Indication'),
        sa.Column('scope_node_id', sa.Integer(), nullable=True, comment='Scope node ID (NULL for Global level)'),
        sa.Column('category', sa.String(length=50), nullable=False, comment='Demographics / Adverse_Events / ...'),
        sa.Column('template_name', sa.String(length=200), nullable=False, comment='Template name'),
        sa.Column('display_type', sa.String(length=20), nullable=False, server_default='Table', comment='Table / Figure / Listing'),
        sa.Column('shell_schema', JSONB(), nullable=False, comment='Complete shell definition (TableShell/FigureShell/ListingShell structure)'),
        sa.Column('statistics_set_id', sa.Integer(), nullable=True, comment='Associated statistics set'),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1', comment='Template version number'),
        sa.Column('version_history', JSONB(), nullable=True, comment='Version change history'),
        sa.Column('description', sa.Text(), nullable=True, comment='Template description'),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('updated_by', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_by', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['scope_node_id'], ['scope_nodes.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['statistics_set_id'], ['statistics_sets.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        comment='Shell library templates for Global/TA/Compound/Indication levels'
    )
    op.create_index(op.f('ix_shell_library_templates_is_deleted'), 'shell_library_templates', ['is_deleted'], unique=False)
    op.create_index(op.f('ix_shell_library_templates_scope_node_id'), 'shell_library_templates', ['scope_node_id'], unique=False)
    op.create_index(op.f('ix_shell_library_templates_scope_level'), 'shell_library_templates', ['scope_level'], unique=False)
    # Unique index: (scope_level, scope_node_id, category, template_name) WHERE is_deleted = FALSE
    # For Global level (scope_node_id = NULL), we need a partial unique index
    op.execute("""
        CREATE UNIQUE INDEX uix_shell_library_templates_scope_name
        ON shell_library_templates (scope_level, scope_node_id, category, template_name)
        WHERE is_deleted = FALSE
    """)

    # ============================================================
    # 2. Extend ars_study_templates table
    # ============================================================
    op.add_column(
        'ars_study_templates',
        sa.Column('source_library_id', sa.Integer(), nullable=True, comment='Source shell library template ID')
    )
    op.add_column(
        'ars_study_templates',
        sa.Column('source_level', sa.String(length=20), nullable=True, comment='Source scope level (Global/TA/Compound/Indication)')
    )
    op.add_column(
        'ars_study_templates',
        sa.Column('source_template_name', sa.String(length=200), nullable=True, comment='Source template name (snapshot at copy time)')
    )
    op.add_column(
        'ars_study_templates',
        sa.Column('version_history', JSONB(), nullable=True, comment='Version change history')
    )
    op.create_index(
        op.f('ix_ars_study_templates_source_library_id'),
        'ars_study_templates',
        ['source_library_id'],
        unique=False
    )
    op.create_foreign_key(
        'fk_ars_study_templates_source_library_id',
        'ars_study_templates',
        'shell_library_templates',
        ['source_library_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # ============================================================
    # 2. Revert ars_study_templates extensions
    # ============================================================
    op.drop_constraint('fk_ars_study_templates_source_library_id', 'ars_study_templates', type_='foreignkey')
    op.drop_index(op.f('ix_ars_study_templates_source_library_id'), table_name='ars_study_templates')
    op.drop_column('ars_study_templates', 'version_history')
    op.drop_column('ars_study_templates', 'source_template_name')
    op.drop_column('ars_study_templates', 'source_level')
    op.drop_column('ars_study_templates', 'source_library_id')

    # ============================================================
    # 1. Drop shell_library_templates table
    # ============================================================
    op.execute("DROP INDEX IF EXISTS uix_shell_library_templates_scope_name")
    op.drop_index(op.f('ix_shell_library_templates_scope_level'), table_name='shell_library_templates')
    op.drop_index(op.f('ix_shell_library_templates_scope_node_id'), table_name='shell_library_templates')
    op.drop_index(op.f('ix_shell_library_templates_is_deleted'), table_name='shell_library_templates')
    op.drop_table('shell_library_templates')