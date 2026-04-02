"""
CDISC Sync Scheduler - APScheduler integration.

Manages scheduled CDISC sync using APScheduler. Reads schedule config
from the database (CdiscLibraryConfig.sync_schedule) and registers
cron-like or interval triggers accordingly.
"""
import asyncio
import logging
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.database import async_session_factory
from app.models.cdisc_sync import CdiscLibraryConfig
from app.services.cdisc_task_manager import task_manager

logger = logging.getLogger(__name__)


class CDISCScheduler:
    """Manages scheduled CDISC sync using APScheduler."""

    def __init__(self) -> None:
        self._scheduler = AsyncIOScheduler()
        self._job_id = "cdisc_scheduled_sync"

    def start(self) -> None:
        """Start scheduler and register initial job from DB config."""
        self._scheduler.start()
        logger.info("CDISC scheduler started")
        self._schedule_from_config()

    def stop(self) -> None:
        """Stop the scheduler."""
        self._scheduler.shutdown(wait=False)
        logger.info("CDISC scheduler stopped")

    def reschedule(
        self, schedule_config: dict[str, Any] | None, enabled: bool
    ) -> None:
        """Reschedule based on new config."""
        self._scheduler.remove_all_jobs()
        if not enabled or not schedule_config:
            logger.info("Scheduled sync disabled")
            return
        self._add_job(schedule_config)

    def _schedule_from_config(self) -> None:
        """Read DB config and register job on startup."""
        import sqlalchemy as sa

        async def _load() -> None:
            async with async_session_factory() as session:
                result = await session.execute(
                    sa.select(CdiscLibraryConfig).where(
                        CdiscLibraryConfig.id == 1
                    )
                )
                config = result.scalar_one_or_none()
            if config and config.sync_enabled and config.sync_schedule:
                self._add_job(config.sync_schedule)
                logger.info(f"Scheduled sync loaded: {config.sync_schedule}")

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(_load())
            else:
                loop.run_until_complete(_load())
        except Exception as e:
            logger.warning(f"Failed to load schedule config: {e}")

    def _add_job(self, schedule_config: dict[str, Any]) -> None:
        """Add a scheduled job based on config."""
        sched_type = schedule_config.get("type", "daily")
        trigger = self._build_trigger(sched_type, schedule_config)
        self._scheduler.add_job(
            self._run_scheduled_sync,
            trigger=trigger,
            id=self._job_id,
            replace_existing=True,
        )
        logger.info(f"Sync job scheduled: {sched_type}")

    def _build_trigger(self, sched_type: str, config: dict[str, Any]):
        """Build APScheduler trigger from schedule config."""
        if sched_type == "daily":
            return CronTrigger(hour=2, minute=0)  # 2 AM daily
        elif sched_type == "weekly":
            day = config.get("day_of_week", "monday")
            return CronTrigger(day_of_week=day, hour=2, minute=0)
        elif sched_type == "monthly":
            day = config.get("day_of_month", 1)
            return CronTrigger(day=day, hour=2, minute=0)
        elif sched_type == "custom":
            hours = config.get("interval_hours", 6)
            return IntervalTrigger(hours=hours)
        return CronTrigger(hour=2, minute=0)

    async def _run_scheduled_sync(self) -> None:
        """Execute scheduled sync for all enabled standard types."""
        import sqlalchemy as sa

        async with async_session_factory() as session:
            result = await session.execute(
                sa.select(CdiscLibraryConfig).where(
                    CdiscLibraryConfig.id == 1
                )
            )
            config = result.scalar_one_or_none()

        if not config or not config.sync_enabled:
            return

        types = config.enabled_standard_types or []
        for std_type in types:
            try:
                task_id = await task_manager.start_sync(
                    standard_type=std_type,
                    version="latest",
                    triggered_by="scheduled",
                    created_by="scheduler",
                )
                logger.info(
                    f"Scheduled sync started: {std_type} (task {task_id})"
                )
            except Exception as e:
                logger.error(f"Scheduled sync failed for {std_type}: {e}")


# Singleton instance
cdisc_scheduler = CDISCScheduler()
