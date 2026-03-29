"""
ARS Study-Level Models

Statistics Sets, Study Defaults, and Study Templates for TFL Designer.
"""
from typing import Any

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from app.models.base import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class StatisticsSet(Base, TimestampMixin, SoftDeleteMixin):
    """统计量集合 — 可在 study 级别定义，供 shell 引用"""

    __tablename__ = "statistics_sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="所属 study scope node",
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="集合名称")

    stats: Mapped[list["StatisticsItem"]] = relationship(
        "StatisticsItem",
        back_populates="statistics_set",
        cascade="all, delete-orphan",
        order_by="StatisticsItem.sort_order",
    )

    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    updated_by: Mapped[str | None] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        Index("uix_stat_sets_scope_name", "scope_node_id", "name", unique=True),
        {"comment": "统计量集合表"},
    )

    def __repr__(self) -> str:
        return f"<StatisticsSet(id={self.id}, name={self.name})>"


class StatisticsItem(Base, TimestampMixin):
    """统计量条目"""

    __tablename__ = "statistics_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    statistics_set_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("statistics_sets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stat_type: Mapped[str] = mapped_column(
        String(30), nullable=False,
        comment="n / mean / sd / median / min / max / range / n_percent / header",
    )
    label: Mapped[str] = mapped_column(String(100), nullable=False, comment="显示标签")
    format: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="格式模板 e.g. XX.X (X.XX)",
    )

    statistics_set: Mapped["StatisticsSet"] = relationship(
        "StatisticsSet", back_populates="stats",
    )

    __table_args__ = (
        Index("uix_stat_items_set_order", "statistics_set_id", "sort_order", unique=True),
        {"comment": "统计量条目表"},
    )


class StudyDefaults(Base, TimestampMixin, SoftDeleteMixin):
    """Study 级全局默认配置"""

    __tablename__ = "ars_study_defaults"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
        index=True,
        comment="Study scope node (1:1)",
    )
    default_statistics_set_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("statistics_sets.id", ondelete="SET NULL"),
        nullable=True,
        comment="默认统计量集合",
    )
    decimal_rules: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        comment='{"n":0, "mean":2, "sd":3, "percent":2, "median":1, "min":1, "max":1}',
    )
    header_style: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True, comment="默认 header 样式",
    )

    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    updated_by: Mapped[str | None] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        {"comment": "Study 级全局默认配置"},
    )


class StudyTemplate(Base, TimestampMixin, SoftDeleteMixin):
    """Study 级 Shell 模板 — 按 category 分类的模板库"""

    __tablename__ = "ars_study_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Study scope node",
    )
    category: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="Demographics / Adverse_Events / ...",
    )
    template_name: Mapped[str] = mapped_column(
        String(200), nullable=False, comment="模板名称",
    )
    display_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="Table",
        comment="Table / Figure / Listing",
    )
    shell_schema: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False,
        comment="完整 shell 定义 (TableShell/FigureShell/ListingShell 结构)",
    )
    statistics_set_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("statistics_sets.id", ondelete="SET NULL"),
        nullable=True,
        comment="关联的统计量集合",
    )
    decimal_override: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True,
        comment="模板级小数位覆盖 (与 Study Defaults 合并)",
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1,
        comment="模板版本号",
    )

    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    updated_by: Mapped[str | None] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        Index(
            "uix_ars_study_templates_scope_cat_name",
            "scope_node_id", "category", "template_name",
            unique=True,
        ),
        {"comment": "Study 级 Shell 模板库"},
    )

    def __repr__(self) -> str:
        return f"<StudyTemplate(id={self.id}, name={self.template_name}, v{self.version})>"
