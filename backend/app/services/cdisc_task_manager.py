"""
CDISC Background Task Manager - async tasks with DB checkpointing.

Manages in-memory background CDISC sync tasks. Each task:
1. Creates a CdiscSyncLog row with status=running
2. Spawns an asyncio.Task that runs CDISCSyncService
3. Writes progress checkpoints to the DB during sync
4. Marks the log row completed/failed/interrupted when done
"""
import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.cdisc_sync import CdiscSyncLog
from app.schemas.cdisc_sync import SyncProgressResponse

logger = logging.getLogger(__name__)


class CDISCBackgroundTaskManager:
    """Manages in-memory background CDISC sync tasks with DB checkpoints."""

    def __init__(self) -> None:
        self._tasks: dict[str, asyncio.Task] = {}
        self._cancel_flags: dict[str, bool] = {}

    async def start_sync(
        self,
        standard_type: str,
        version: str,
        triggered_by: str,
        created_by: str,
    ) -> str:
        """Create a sync log row, spawn background task, return task_id."""
        task_id = str(uuid.uuid4())[:8]

        async with async_session_factory() as session:
            log = CdiscSyncLog(
                task_id=task_id,
                standard_type=standard_type,
                version=version,
                status="running",
                started_at=datetime.now(timezone.utc),
                triggered_by=triggered_by,
                created_by=created_by,
                progress={
                    "current_step": "Initializing",
                    "completed": 0,
                    "total": 0,
                    "percentage": 0,
                },
            )
            session.add(log)
            await session.commit()

        self._cancel_flags[task_id] = False
        task = asyncio.create_task(
            self._run_sync(task_id, standard_type, version)
        )
        self._tasks[task_id] = task
        task.add_done_callback(lambda _: self._cleanup(task_id))

        return task_id

    async def _run_sync(
        self, task_id: str, standard_type: str, version: str
    ) -> None:
        """Execute the sync service with checkpointing."""
        try:
            from app.services.cdisc_sync_service import CDISCSyncService

            async with async_session_factory() as session:
                # Get dynamic config
                config = await self._get_config(session)

            service = CDISCSyncService(
                base_url=config["api_base_url"],
                api_key=config["api_key"],
                progress_callback=lambda p: asyncio.ensure_future(
                    self._update_checkpoint(task_id, p)
                ),
                cancel_check=lambda: self._cancel_flags.get(task_id, False),
            )

            async with async_session_factory() as session:
                result = await service.sync(session, standard_type, version)

            await self._mark_completed(task_id, result)

        except asyncio.CancelledError:
            await self._update_status(task_id, "interrupted")
            logger.info(f"Sync task {task_id} was cancelled")
        except Exception as e:
            logger.error(f"Sync task {task_id} failed: {e}")
            await self._mark_failed(task_id, str(e))

    async def _get_config(self, session: AsyncSession) -> dict[str, str]:
        """Read config from DB, fall back to env vars."""
        from app.models.cdisc_sync import CdiscLibraryConfig
        from app.core.config import settings

        result = await session.execute(
            select(CdiscLibraryConfig).where(CdiscLibraryConfig.id == 1)
        )
        row = result.scalar_one_or_none()
        if row and row.api_key:
            return {
                "api_base_url": row.api_base_url,
                "api_key": row.api_key,
            }
        return {
            "api_base_url": settings.CDISC_API_BASE_URL,
            "api_key": settings.CDISC_LIBRARY_API_KEY,
        }

    async def _update_checkpoint(
        self, task_id: str, progress: dict[str, Any]
    ) -> None:
        """Write progress checkpoint to DB."""
        try:
            async with async_session_factory() as session:
                await session.execute(
                    update(CdiscSyncLog)
                    .where(CdiscSyncLog.task_id == task_id)
                    .values(progress=progress)
                )
                await session.commit()
        except Exception as e:
            logger.warning(f"Failed to update checkpoint for {task_id}: {e}")

    async def _update_status(self, task_id: str, status: str) -> None:
        """Update task status in DB."""
        try:
            async with async_session_factory() as session:
                values: dict[str, Any] = {"status": status}
                if status in ("completed", "failed", "interrupted"):
                    values["completed_at"] = datetime.now(timezone.utc)
                await session.execute(
                    update(CdiscSyncLog)
                    .where(CdiscSyncLog.task_id == task_id)
                    .values(**values)
                )
                await session.commit()
        except Exception as e:
            logger.warning(f"Failed to update status for {task_id}: {e}")

    async def _mark_completed(
        self, task_id: str, result: dict[str, Any]
    ) -> None:
        """Mark a task as completed with result summary."""
        try:
            async with async_session_factory() as session:
                await session.execute(
                    update(CdiscSyncLog)
                    .where(CdiscSyncLog.task_id == task_id)
                    .values(
                        status="completed",
                        completed_at=datetime.now(timezone.utc),
                        result_summary=result,
                        progress={
                            "current_step": "Completed",
                            "percentage": 100,
                        },
                    )
                )
                await session.commit()
        except Exception as e:
            logger.warning(f"Failed to mark {task_id} completed: {e}")

    async def _mark_failed(self, task_id: str, error: str) -> None:
        """Mark a task as failed with error message."""
        try:
            async with async_session_factory() as session:
                await session.execute(
                    update(CdiscSyncLog)
                    .where(CdiscSyncLog.task_id == task_id)
                    .values(
                        status="failed",
                        completed_at=datetime.now(timezone.utc),
                        error_message=error[:2000],
                    )
                )
                await session.commit()
        except Exception as e:
            logger.warning(f"Failed to mark {task_id} failed: {e}")

    def _cleanup(self, task_id: str) -> None:
        """Remove task from in-memory tracking after completion."""
        self._tasks.pop(task_id, None)
        self._cancel_flags.pop(task_id, None)

    async def cancel_sync(self, task_id: str) -> bool:
        """Cancel a running sync task."""
        if task_id not in self._tasks:
            return False
        self._cancel_flags[task_id] = True
        self._tasks[task_id].cancel()
        return True

    def is_running(self, task_id: str) -> bool:
        """Check if a task is currently running."""
        return task_id in self._tasks and not self._tasks[task_id].done()


# Singleton instance
task_manager = CDISCBackgroundTaskManager()
