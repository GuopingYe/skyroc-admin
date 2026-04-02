"""
CDISC Library Sync models - config, scheduling, and sync logs.

CdiscLibraryConfig: single-row runtime config (id=1 always).
CdiscSyncLog: sync history with progress checkpoints.
"""
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, JSONB as JSONBType


class CdiscLibraryConfig(Base):
    """
    Single-row CDISC Library configuration (id is always 1).

    Stores the API base URL, API key, enabled standard types,
    and schedule for automatic sync.
    """

    __tablename__ = "cdisc_library_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    api_base_url: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        default="https://library.cdisc.org/api",
        comment="CDISC Library API base URL",
    )
    api_key: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        default="",
        comment="CDISC Library API key (masked in API responses)",
    )
    enabled_standard_types: Mapped[dict[str, Any] | None] = mapped_column(
        JSONBType,
        nullable=True,
        default=None,
        comment='Array of enabled standard types, e.g. ["sdtmig", "adamig", "ct"]',
    )
    sync_schedule: Mapped[dict[str, Any] | None] = mapped_column(
        JSONBType,
        nullable=True,
        default=None,
        comment='Schedule config: {"type": "daily", "interval_hours": null, ...}',
    )
    sync_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Master switch for scheduled sync",
    )
    updated_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        {"comment": "CDISC Library runtime configuration (single row, id=1)"},
    )

    def __repr__(self) -> str:
        return f"<CdiscLibraryConfig(id={self.id}, enabled={self.sync_enabled})>"


class CdiscSyncLog(Base):
    """
    Sync history and checkpoint log.

    Each row represents one sync attempt with status tracking,
    progress checkpoints, and final result summary.
    """

    __tablename__ = "cdisc_sync_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
        comment="UUID identifying the background task",
    )
    standard_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
        comment="Standard type: sdtmig, ct, etc.",
    )
    version: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="Version: 3-4, all, latest, etc.",
    )
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="pending",
        index=True,
        comment="pending, running, completed, failed, interrupted",
    )
    progress: Mapped[dict[str, Any] | None] = mapped_column(
        JSONBType,
        nullable=True,
        default=None,
        comment='Checkpoint: {"current_step": "...", "completed": 5, "total": 20}',
    )
    result_summary: Mapped[dict[str, Any] | None] = mapped_column(
        JSONBType,
        nullable=True,
        default=None,
        comment="Final counts after sync completes",
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    triggered_by: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="manual",
        comment="manual or scheduled",
    )
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_cdisc_sync_log_status_started", "status", "started_at"),
        {"comment": "CDISC sync history with progress checkpoints"},
    )

    def __repr__(self) -> str:
        return (
            f"<CdiscSyncLog(id={self.id}, task_id={self.task_id}, "
            f"type={self.standard_type}, status={self.status})>"
        )
