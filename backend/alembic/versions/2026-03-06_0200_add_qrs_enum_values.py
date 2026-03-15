"""Add QRS enum values for DatasetClass and SpecType

Revision ID: qrs_enum_001
Revises: bc_ct_models_001
Create Date: 2026-03-06 02:00:00

新增枚举值:
- DatasetClass.QRS = "QRS" - Questionnaires, Ratings, and Scales
- SpecType.QRS = "QRS" - QRS 规范文档类型
"""
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'qrs_enum_001'
down_revision: str | None = '543b3436cf86'
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # 添加 DatasetClass.QRS 枚举值
    op.execute("""
        ALTER TYPE dataset_class_enum ADD VALUE IF NOT EXISTS 'QRS';
    """)

    # 添加 SpecType.QRS 枚举值
    op.execute("""
        ALTER TYPE spec_type_enum ADD VALUE IF NOT EXISTS 'QRS';
    """)


def downgrade() -> None:
    # PostgreSQL 不支持直接删除枚举值
    # 需要重建枚举类型，这里仅记录日志
    # 实际生产环境中，通常不需要回滚枚举值
    pass