"""
Target Variable - 目标变量模型

用于存储 SDTM/ADaM 目标变量定义
归属于 TargetDataset，支持跨层级继承
"""
from typing import Any

from sqlalchemy import Enum, ForeignKey, Index, Integer, String, Text
from app.models.base import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.mapping_enums import DataType, OriginType, OverrideType, VariableCore


class TargetVariable(Base, TimestampMixin, SoftDeleteMixin):
    """
    目标变量表

    存储 SDTM/ADaM 目标变量定义，如 AETERM, VSORRES 等
    归属于 TargetDataset
    支持跨层级继承：Global -> TA -> Study -> Analysis
    """

    __tablename__ = "target_variables"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 所属数据集
    dataset_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("target_datasets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="所属目标数据集 ID",
    )

    # 变量标识
    variable_name: Mapped[str] = mapped_column(
        String(255),  # 扩展为 255 以支持 ADaM 变量和通配符变量
        nullable=False,
        index=True,
        comment="变量名称，如 AETERM, VSORRES, --DECOD",
    )
    variable_label: Mapped[str | None] = mapped_column(
        Text,  # 改为 Text 以支持长标签
        nullable=True,
        comment="变量标签",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="变量详细描述",
    )

    # 数据类型
    data_type: Mapped[DataType] = mapped_column(
        Enum(DataType, name="data_type_enum"),
        nullable=False,
        default=DataType.CHAR,
        comment="数据类型：Char/Num/Date/DateTime/Time",
    )
    length: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="变量长度",
    )

    # 核心性
    core: Mapped[VariableCore] = mapped_column(
        Enum(VariableCore, name="variable_core_enum"),
        nullable=False,
        default=VariableCore.PERM,
        comment="核心性：Req(必须)/Perm(允许)/Exp(期望)",
    )

    # ============================================================
    # Spec 继承机制（核心）
    # ============================================================
    base_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("target_variables.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="父级 Variable ID（跨层级继承来源），NULL 表示顶层定义",
    )
    override_type: Mapped[OverrideType] = mapped_column(
        Enum(OverrideType, name="override_type_enum"),
        nullable=False,
        default=OverrideType.NONE,
        index=True,
        comment="继承覆盖类型：None(完全继承)/Modified(已修改)/Added(新增)/Deleted(已删除)",
    )

    # ============================================================
    # 变量来源类型（核心新增）
    # ============================================================
    origin_type: Mapped[OriginType] = mapped_column(
        Enum(OriginType, name="origin_type_enum"),
        nullable=False,
        default=OriginType.CDISC,
        index=True,
        comment="变量来源：CDISC官方/企业标准/TA标准/试验自定义",
    )

    # 排序与元数据
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="数据集内变量排序序号",
    )

    # 扩展属性
    standard_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="标准元数据，如 CDISC 定义的 CodeList、角色等",
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
    dataset: Mapped["TargetDataset"] = relationship(
        "TargetDataset",
        back_populates="variables",
    )

    # Spec 继承关系（自引用）
    base_spec: Mapped["TargetVariable | None"] = relationship(
        "TargetVariable",
        remote_side=[id],
        back_populates="derived_specs",
        foreign_keys=[base_id],
    )
    derived_specs: Mapped[list["TargetVariable"]] = relationship(
        "TargetVariable",
        back_populates="base_spec",
        foreign_keys=[base_id],
    )

    # 映射规则关系
    mapping_rules: Mapped[list["MappingRule"]] = relationship(
        "MappingRule",
        back_populates="target_variable",
    )

    # ARS 数据绑定关系
    data_bindings: Mapped[list["ARSDataBinding"]] = relationship(
        "ARSDataBinding",
        back_populates="target_variable",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 唯一约束：同一数据集下变量名唯一
        Index(
            "uix_target_variables_dataset_name",
            "dataset_id",
            "variable_name",
            unique=True,
        ),
        # 索引：优化继承查询
        Index(
            "ix_target_variables_base_override",
            "base_id",
            "override_type",
        ),
        # 索引：优化来源类型查询
        Index(
            "ix_target_variables_origin",
            "origin_type",
        ),
        {"comment": "目标变量表 - SDTM/ADaM 变量定义（含来源与继承）"},
    )

    def __repr__(self) -> str:
        return f"<TargetVariable(id={self.id}, name={self.variable_name}, origin={self.origin_type.value})>"

    def is_inherited(self) -> bool:
        """判断是否为继承的 Variable"""
        return self.base_id is not None

    def is_modified(self) -> bool:
        """判断是否已修改"""
        return self.override_type == OverrideType.MODIFIED

    def is_custom(self) -> bool:
        """判断是否为自定义变量"""
        return self.origin_type == OriginType.STUDY_CUSTOM


# 延迟导入避免循环引用
from app.models.mapping_rule import MappingRule
from app.models.target_dataset import TargetDataset