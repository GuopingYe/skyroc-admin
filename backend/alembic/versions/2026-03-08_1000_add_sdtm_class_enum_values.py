"""Add SDTM Model class enum values for DatasetClass

Revision ID: sdtm_class_enum_001
Revises: rbac_init
Create Date: 2026-03-08 10:00:00

新增枚举值:
- DatasetClass.GENERAL_OBSERVATIONS - 抽象基类
- DatasetClass.ASSOCIATED_PERSONS - AP 域变量模板

修复问题:
- SDTM classes/datasets 分层错误，Associated Persons 和 General Observations
  之前被错误地归类到 Findings 下

注意: 数据库存储值使用下划线格式 (如 SPECIAL_PURPOSE)，与 CDISC 标准显示名称不同
"""
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'sdtm_class_enum_001'
down_revision: str | None = 'rbac_init'
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # 添加 DatasetClass.GENERAL_OBSERVATIONS 枚举值
    # General Observations 是 SDTM Model 的抽象基类，包含所有观测类共有的泛化变量模板
    op.execute("""
        ALTER TYPE dataset_class_enum ADD VALUE IF NOT EXISTS 'GENERAL_OBSERVATIONS';
    """)

    # 添加 DatasetClass.ASSOCIATED_PERSONS 枚举值
    # Associated Persons 是 AP 域的变量模板类
    op.execute("""
        ALTER TYPE dataset_class_enum ADD VALUE IF NOT EXISTS 'ASSOCIATED_PERSONS';
    """)


def downgrade() -> None:
    # PostgreSQL 不支持直接删除枚举值
    # 需要重建枚举类型，这里仅记录日志
    # 实际生产环境中，通常不需要回滚枚举值
    pass