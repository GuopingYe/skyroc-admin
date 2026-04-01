"""Reference Data model — configurable dropdown/metadata entries."""
from typing import Any

from sqlalchemy import Boolean, Index, Integer, String, Text, column as sa_column
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, JSONB as JSONBType, SoftDeleteMixin, TimestampMixin
from app.models.enums import ReferenceDataCategory


class ReferenceData(Base, TimestampMixin, SoftDeleteMixin):
    """Generic reference data table for configurable clinical metadata."""

    __tablename__ = "reference_data"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Business columns
    category: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
        comment="Reference data category (POPULATION, SDTM_DOMAIN, etc.)",
    )
    code: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="Short code (e.g., ITT, DM, ADSL)",
    )
    label: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        comment="Display name (e.g., Intent-to-Treat)",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Optional description",
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        comment="Display ordering within category",
    )
    metadata_: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata_",
        JSONBType,
        nullable=True,
        comment="Extensible per-category fields",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        index=True,
        comment="Active/inactive toggle",
    )

    # Table-level constraints
    __table_args__ = (
        Index(
            "uq_reference_data_category_code",
            "category",
            "code",
            unique=True,
            postgresql_where=sa_column("is_deleted") == False,  # noqa: E712
        ),
        {"comment": "Generic reference data for configurable clinical metadata"},
    )

    def __repr__(self) -> str:
        return f"<ReferenceData {self.category}:{self.code}>"
