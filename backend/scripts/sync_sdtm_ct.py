"""
单独同步所有 SDTM CT 版本

用法: python scripts/sync_sdtm_ct.py
"""
import asyncio
import logging
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from app.database import async_session_factory
from app.services.cdisc_sync_service import CDISCSyncService

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


async def get_current_sdtm_ct_versions() -> set[str]:
    """获取数据库中已有的 SDTM CT 版本"""
    async with async_session_factory() as session:
        result = await session.execute(text("""
            SELECT DISTINCT sn.code
            FROM scope_nodes sn
            WHERE sn.is_deleted = false
                AND sn.code ILIKE '%sdtmct%'
        """))
        rows = result.fetchall()
        return {row[0] for row in rows}


async def sync_all_sdtm_ct():
    """同步所有 SDTM CT 版本"""
    logger.info("=" * 60)
    logger.info("SDTM CT 全量同步 - 开始")
    logger.info("=" * 60)

    # 1. 获取 CDISC API 中所有 SDTM CT 版本
    service = CDISCSyncService()
    all_versions = await service._get_ct_versions()
    sdtm_ct_versions = sorted([v for v in all_versions if v.startswith('sdtmct-')])

    logger.info(f"CDISC API 返回 {len(sdtm_ct_versions)} 个 SDTM CT 版本")

    # 2. 获取数据库中已有的版本
    existing_versions = await get_current_sdtm_ct_versions()
    logger.info(f"数据库中已有 {len(existing_versions)} 个 SDTM CT 版本")

    # 3. 找出缺失的版本
    missing_versions = []
    for v in sdtm_ct_versions:
        db_code = f"CDISC-CT-{v}"
        if db_code not in existing_versions:
            missing_versions.append(v)

    logger.info(f"缺失 {len(missing_versions)} 个版本，需要同步")

    if not missing_versions:
        logger.info("所有 SDTM CT 版本已存在，无需同步")
        return

    # 4. 开始同步缺失的版本
    async with async_session_factory() as session:
        total_created = 0
        total_terms = 0

        for i, version in enumerate(missing_versions, 1):
            try:
                logger.info("-" * 60)
                logger.info(f"[{i}/{len(missing_versions)}] 同步: {version}")

                result = await service.sync(session, "ct", version)
                await session.commit()

                created = result.get("created", 0)
                terms = result.get("terms", 0)
                total_created += created
                total_terms += terms

                logger.info(f"  完成: {created} codelists, {terms} terms")

            except Exception as e:
                logger.error(f"  错误: {str(e)}")
                await session.rollback()
                continue

        logger.info("=" * 60)
        logger.info(f"SDTM CT 同步完成!")
        logger.info(f"  新增: {total_created} codelists, {total_terms} terms")
        logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(sync_all_sdtm_ct())