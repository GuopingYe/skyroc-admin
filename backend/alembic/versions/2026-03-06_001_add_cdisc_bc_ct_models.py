"""Add CDISC standard models for BC and CT

Revision ID: bc_ct_models_001
Revises: 0ac04a15816c
Create Date: 2026-03-06 01:00:00

新增表：
- biomedical_concepts: CDISC 生物医学概念
- codelists: CDISC 受控术语编码列表
- codelist_terms: 编码列表术语
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'bc_ct_models_001'
down_revision: Union[str, None] = '0ac04a15816c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================================
    # biomedical_concepts 表
    # ============================================================
    op.create_table(
        "biomedical_concepts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("scope_node_id", sa.Integer(), nullable=False),
        sa.Column("concept_id", sa.String(length=100), nullable=False),
        sa.Column("ncit_code", sa.String(length=50), nullable=True),
        sa.Column("short_name", sa.String(length=255), nullable=False),
        sa.Column("definition", sa.Text(), nullable=True),
        sa.Column("synonyms", postgresql.JSONB(), nullable=True),
        sa.Column("data_element_concepts", postgresql.JSONB(), nullable=True),
        sa.Column("standard_metadata", postgresql.JSONB(), nullable=True),
        sa.Column("extra_attrs", postgresql.JSONB(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_by", sa.String(), nullable=True),
        sa.Column("created_by", sa.String(length=100), nullable=False),
        sa.Column("updated_by", sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(["scope_node_id"], ["scope_nodes.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        comment="生物医学概念表 - CDISC BC 语义概念",
    )

    # 索引
    op.create_index("ix_biomedical_concepts_scope_node_id", "biomedical_concepts", ["scope_node_id"])
    op.create_index("ix_biomedical_concepts_concept_id", "biomedical_concepts", ["concept_id"])
    op.create_index("ix_biomedical_concepts_ncit_code", "biomedical_concepts", ["ncit_code"])
    op.create_index("ix_biomedical_concepts_short_name", "biomedical_concepts", ["short_name"])
    op.create_index(
        "uix_biomedical_concepts_scope_concept",
        "biomedical_concepts",
        ["scope_node_id", "concept_id"],
        unique=True,
    )

    # ============================================================
    # codelists 表
    # ============================================================
    op.create_table(
        "codelists",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("scope_node_id", sa.Integer(), nullable=False),
        sa.Column("codelist_id", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("ncit_code", sa.String(length=50), nullable=True),
        sa.Column("definition", sa.Text(), nullable=True),
        sa.Column("synonyms", postgresql.JSONB(), nullable=True),
        sa.Column("preferred_term", sa.String(length=255), nullable=True),
        sa.Column("submission_value", sa.String(length=255), nullable=True),
        sa.Column("standard_metadata", postgresql.JSONB(), nullable=True),
        sa.Column("extra_attrs", postgresql.JSONB(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_by", sa.String(), nullable=True),
        sa.Column("created_by", sa.String(length=100), nullable=False),
        sa.Column("updated_by", sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(["scope_node_id"], ["scope_nodes.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        comment="编码列表表 - CDISC CT 编码列表",
    )

    # 索引
    op.create_index("ix_codelists_scope_node_id", "codelists", ["scope_node_id"])
    op.create_index("ix_codelists_codelist_id", "codelists", ["codelist_id"])
    op.create_index("ix_codelists_name", "codelists", ["name"])
    op.create_index("ix_codelists_ncit_code", "codelists", ["ncit_code"])
    op.create_index(
        "uix_codelists_scope_id",
        "codelists",
        ["scope_node_id", "codelist_id"],
        unique=True,
    )

    # ============================================================
    # codelist_terms 表
    # ============================================================
    op.create_table(
        "codelist_terms",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("codelist_id", sa.Integer(), nullable=False),
        sa.Column("term_id", sa.String(length=100), nullable=True),
        sa.Column("term_value", sa.String(length=255), nullable=False),
        sa.Column("ncit_code", sa.String(length=50), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("definition", sa.Text(), nullable=True),
        sa.Column("synonyms", postgresql.JSONB(), nullable=True),
        sa.Column("submission_value", sa.String(length=255), nullable=True),
        sa.Column("standard_metadata", postgresql.JSONB(), nullable=True),
        sa.Column("extra_attrs", postgresql.JSONB(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_by", sa.String(), nullable=True),
        sa.Column("created_by", sa.String(length=100), nullable=False),
        sa.Column("updated_by", sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(["codelist_id"], ["codelists.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        comment="编码列表术语表 - CDISC CT 术语",
    )

    # 索引
    op.create_index("ix_codelist_terms_codelist_id", "codelist_terms", ["codelist_id"])
    op.create_index("ix_codelist_terms_term_id", "codelist_terms", ["term_id"])
    op.create_index("ix_codelist_terms_term_value", "codelist_terms", ["term_value"])
    op.create_index("ix_codelist_terms_ncit_code", "codelist_terms", ["ncit_code"])
    op.create_index(
        "uix_codelist_terms_value",
        "codelist_terms",
        ["codelist_id", "term_value"],
        unique=True,
    )


def downgrade() -> None:
    # 按依赖关系逆序删除
    op.drop_table("codelist_terms")
    op.drop_table("codelists")
    op.drop_table("biomedical_concepts")