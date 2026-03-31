"""
Shell Library Template Model

Global/TA level shell templates for hierarchical template management.
"""
from typing import Any
from sqlalchemy import Integer, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class ShellLibraryTemplate(Base, TimestampMixin, SoftDeleteMixin):
    """Global/TA 级 Shell 模板库"""

    __tablename__ = "shell_library_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope_level: Mapped[str] = mapped_column(
        String(20), nullable=False,
        comment="'global' | 'ta' | 'product' (reserved)",
    )
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=True,  # NULL for Global level
        index=True,
        comment="Scope node (NULL for Global, TA node ID for TA level)",
    )
    category: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="Demographics / Adverse_Events / ...",
    )
    template_name: Mapped[str] = mapped_column(
        String(200), nullable=False,
        comment="Template display name",
    )
    display_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="Table",
        comment="Table / Figure / Listing",
    )
    shell_schema: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False,
        comment="Complete shell definition (TableShell/FigureShell/ListingShell)",
    )
    statistics_set_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("statistics_sets.id", ondelete="SET NULL"),
        nullable=True,
        comment="Linked statistics set",
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1,
        comment="Template version number",
    )
    version_history: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB, nullable=True,
        comment="Version change history",
    )
    description: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="Template description",
    )

    # Audit fields (from TimestampMixin: created_at, updated_at)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    updated_by: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Soft delete (from SoftDeleteMixin: is_deleted, deleted_at, deleted_by)

    __table_args__ = (
        {"comment": "Global/TA 级 Shell 模板库"},
    )

    def __repr__(self) -> str:
        return f"<ShellLibraryTemplate(id={self.id}, name={self.template_name}, level={self.scope_level})>"
