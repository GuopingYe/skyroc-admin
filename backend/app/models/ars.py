"""
ARS (Analysis Results Standard) - TFL 构建器模型

基于 CDISC ARS 标准，支持 TFL 结构化存储和拖拽渲染
"""
from typing import Any

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class ARSDisplay(Base, TimestampMixin, SoftDeleteMixin):
    """
    ARS 显示表（TFL 输出定义）

    存储表格、图表、列表的元数据定义
    """

    __tablename__ = "ars_displays"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 所属作用域
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="所属作用域节点 ID（通常为 Analysis 层级）",
    )

    # 显示标识
    display_id: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="显示 ID，如 'Table 14.1.1', 'Figure 1.1'",
    )
    display_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="Table",
        comment="显示类型：Table / Figure / Listing",
    )
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="标题",
    )
    subtitle: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="副标题",
    )
    footnote: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="脚注",
    )

    # 元数据
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="排序序号",
    )

    # 扩展属性
    display_config: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="显示配置，如页面大小、边距等",
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
    sections: Mapped[list["ARSDisplaySection"]] = relationship(
        "ARSDisplaySection",
        back_populates="display",
        cascade="all, delete-orphan",
    )

    # Tracker 关联
    tracker_tasks: Mapped[list["ProgrammingTracker"]] = relationship(
        "ProgrammingTracker",
        back_populates="tfl_output",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        Index(
            "uix_ars_displays_scope_id",
            "scope_node_id",
            "display_id",
            unique=True,
        ),
        {"comment": "ARS 显示表 - TFL 输出定义"},
    )

    def __repr__(self) -> str:
        return f"<ARSDisplay(id={self.id}, display_id={self.display_id})>"


class ARSTemplateBlock(Base, TimestampMixin, SoftDeleteMixin):
    """
    ARS 模板块表

    存储可复用的表格模板块（Header、Row、Cell 模板）
    """

    __tablename__ = "ars_template_blocks"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 所属作用域
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="所属作用域节点 ID",
    )

    # 模块标识
    block_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="模块名称",
    )
    block_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="Row",
        comment="模块类型：Header / Row / Cell / Section",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="模块描述",
    )

    # 布局 Schema（JSONB 核心字段）
    layout_schema: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        comment="布局 Schema，包含缩进、统计量配置、样式等",
    )

    # 排序与元数据
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="排序序号",
    )

    # 扩展属性
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
    section_links: Mapped[list["ARSDisplaySection"]] = relationship(
        "ARSDisplaySection",
        back_populates="block_template",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        Index(
            "uix_ars_blocks_scope_name",
            "scope_node_id",
            "block_name",
            unique=True,
        ),
        {"comment": "ARS 模板块表 - TFL 模板组件"},
    )

    def __repr__(self) -> str:
        return f"<ARSTemplateBlock(id={self.id}, name={self.block_name})>"


class ARSDisplaySection(Base, TimestampMixin, SoftDeleteMixin):
    """
    ARS 显示区块表（桥接表）

    连接 Display 和 TemplateBlock，支持局部覆盖
    """

    __tablename__ = "ars_display_sections"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 关联 Display
    display_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("ars_displays.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="所属 Display ID",
    )

    # 关联 TemplateBlock
    block_template_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("ars_template_blocks.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="关联的模板块 ID",
    )

    # 显示顺序
    display_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="显示顺序",
    )

    # 覆盖布局（支持 Analysis 覆盖 Global 模板）
    override_layout_schema: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="覆盖布局 Schema，用于局部修改模板",
    )

    # 扩展属性
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
    display: Mapped["ARSDisplay"] = relationship(
        "ARSDisplay",
        back_populates="sections",
    )
    block_template: Mapped["ARSTemplateBlock"] = relationship(
        "ARSTemplateBlock",
        back_populates="section_links",
    )

    # 数据绑定
    data_bindings: Mapped[list["ARSDataBinding"]] = relationship(
        "ARSDataBinding",
        back_populates="section",
        cascade="all, delete-orphan",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        Index(
            "uix_ars_sections_display_order",
            "display_id",
            "display_order",
            unique=True,
        ),
        {"comment": "ARS 显示区块表 - Display 与 TemplateBlock 桥接"},
    )

    def __repr__(self) -> str:
        return f"<ARSDisplaySection(id={self.id}, order={self.display_order})>"


class ARSDataBinding(Base, TimestampMixin, SoftDeleteMixin):
    """
    ARS 数据绑定表

    连接 Section 和 TargetVariable，定义数据来源
    """

    __tablename__ = "ars_data_bindings"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 关联 Section
    section_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("ars_display_sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="所属 Section ID",
    )

    # 关联 TargetVariable（ADaM 变量）
    target_variable_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("target_variables.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="关联的目标变量 ID（ADaM）",
    )

    # 变量角色
    variable_role: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="analysis",
        comment="变量角色：analysis / treatment / stratification / by",
    )

    # 过滤逻辑
    filter_logic: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="过滤逻辑，如 {'where': 'SAFFL = \"Y\"'}",
    )

    # 统计量配置
    statistics_config: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="统计量配置，如 {'n': true, 'mean': true, 'sd': true}",
    )

    # 扩展属性
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
    section: Mapped["ARSDisplaySection"] = relationship(
        "ARSDisplaySection",
        back_populates="data_bindings",
    )
    target_variable: Mapped["TargetVariable"] = relationship(
        "TargetVariable",
        back_populates="data_bindings",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        Index(
            "uix_ars_bindings_section_var",
            "section_id",
            "target_variable_id",
            unique=True,
        ),
        {"comment": "ARS 数据绑定表 - Section 与 TargetVariable 关联"},
    )

    def __repr__(self) -> str:
        return f"<ARSDataBinding(id={self.id}, role={self.variable_role})>"


# 延迟导入避免循环引用
from app.models.scope_node import ScopeNode
from app.models.target_variable import TargetVariable