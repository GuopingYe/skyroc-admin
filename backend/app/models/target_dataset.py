"""
Target Dataset - 目标数据集模型

用于存储 SDTM/ADaM 目标数据集定义
归属于 Specification，支持跨层级继承
"""
from typing import Any

from sqlalchemy import Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.mapping_enums import DatasetClass, OverrideType


class TargetDataset(Base, TimestampMixin, SoftDeleteMixin):
    """
    目标数据集表

    存储 SDTM/ADaM 目标数据集定义，如 AE, DM, VS 等
    归属于 Specification（规范文档）
    支持跨层级继承：Global -> TA -> Study -> Analysis
    """

    __tablename__ = "target_datasets"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # ============================================================
    # 关联字段（核心变更：指向 Specification）
    # ============================================================
    specification_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("specifications.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="所属规范文档 ID",
    )

    # 数据集标识
    dataset_name: Mapped[str] = mapped_column(
        String(255),  # 扩展为 255 以支持 ADaM Data Structures 和 SDTM Class 名称
        nullable=False,
        index=True,
        comment="数据集名称，如 AE, DM, ADSL, General Observations",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="数据集描述",
    )

    # 分类
    class_type: Mapped[DatasetClass] = mapped_column(
        Enum(DatasetClass, name="dataset_class_enum"),
        nullable=False,
        comment="SDTM 数据集分类：Interventions/Events/Findings 等",
    )

    # ============================================================
    # Spec 继承机制（核心）
    # ============================================================
    base_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("target_datasets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="父级 Dataset ID（跨层级继承来源），NULL 表示顶层定义",
    )
    override_type: Mapped[OverrideType] = mapped_column(
        Enum(OverrideType, name="override_type_enum"),
        nullable=False,
        default=OverrideType.NONE,
        index=True,
        comment="继承覆盖类型：None(完全继承)/Modified(已修改)/Added(新增)/Deleted(已删除)",
    )

    # 排序与元数据
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="排序序号",
    )

    # 扩展属性（存储标准定义中的其他元数据）
    standard_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="标准元数据，如 CDISC 定义的结构、键变量等",
    )
    extra_attrs: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="扩展属性",
    )

    # 审计字段
    created_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="创建者用户 ID",
    )
    updated_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="最后更新者用户 ID",
    )

    # ============================================================
    # Relationships
    # ============================================================
    # 所属规范文档
    specification: Mapped["Specification"] = relationship(
        "Specification",
        back_populates="datasets",
    )

    # Spec 继承关系（自引用）
    base_spec: Mapped["TargetDataset | None"] = relationship(
        "TargetDataset",
        remote_side=[id],
        back_populates="derived_specs",
        foreign_keys=[base_id],
    )
    derived_specs: Mapped[list["TargetDataset"]] = relationship(
        "TargetDataset",
        back_populates="base_spec",
        foreign_keys=[base_id],
    )

    # 变量关系
    variables: Mapped[list["TargetVariable"]] = relationship(
        "TargetVariable",
        back_populates="dataset",
        cascade="all, delete-orphan",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 唯一约束：同一规范下数据集名称唯一
        Index(
            "uix_target_datasets_spec_name",
            "specification_id",
            "dataset_name",
            unique=True,
        ),
        # 索引：优化继承查询
        Index(
            "ix_target_datasets_base_override",
            "base_id",
            "override_type",
        ),
        {"comment": "目标数据集表 - SDTM/ADaM 数据集定义（归属于 Specification）"},
    )

    def __repr__(self) -> str:
        return f"<TargetDataset(id={self.id}, name={self.dataset_name}, class={self.class_type.value})>"

    def is_inherited(self) -> bool:
        """判断是否为继承的 Dataset"""
        return self.base_id is not None

    def is_modified(self) -> bool:
        """判断是否已修改"""
        return self.override_type == OverrideType.MODIFIED


# 延迟导入避免循环引用
from app.models.specification import Specification
from app.models.target_variable import TargetVariable