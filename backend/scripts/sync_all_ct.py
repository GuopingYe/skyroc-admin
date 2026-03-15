"""
同步所有 CDISC Controlled Terminology (CT) 类型

支持同步的 CT 类型:
- SDTM CT (sdtmct)
- ADaM CT (adamct)
- SEND CT (sendct)
- CDASH CT (cdashct)
- Protocol CT (protocolct)
- QRS CT (qrsct)
- DDF CT (ddfct)
- Define-XML CT (define)
- Glossary CT (glossaryct)
- TMF CT (tmfct)
- MRCT CT (mrctct)
- COA CT (coact)
- QS CT (qs)

用法:
    # 同步所有 CT 类型的所有版本
    python scripts/sync_all_ct.py

    # 仅同步指定的 CT 类型
    python scripts/sync_all_ct.py --types sdtmct adamct

    # 同步最新版本
    python scripts/sync_all_ct.py --latest

    # 修复缺失的版本
    python scripts/sync_all_ct.py --repair
"""
import argparse
import asyncio
import logging
import sys
from collections import defaultdict
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

# CT 类型配置
CT_TYPE_CONFIG = {
    "sdtmct": {"label": "SDTM CT", "order": 1},
    "adamct": {"label": "ADaM CT", "order": 2},
    "sendct": {"label": "SEND CT", "order": 3},
    "cdashct": {"label": "CDASH CT", "order": 4},
    "protocolct": {"label": "Protocol CT", "order": 5},
    "qrsct": {"label": "QRS CT", "order": 6},
    "ddfct": {"label": "DDF CT", "order": 7},
    "define": {"label": "Define-XML CT", "order": 8},
    "glossaryct": {"label": "Glossary CT", "order": 9},
    "tmfct": {"label": "TMF CT", "order": 10},
    "mrctct": {"label": "MRCT CT", "order": 11},
    "coact": {"label": "COA CT", "order": 12},
    "qs": {"label": "QS CT", "order": 13},
}


async def get_current_ct_versions() -> dict[str, set[str]]:
    """获取数据库中已有的各 CT 类型版本"""
    async with async_session_factory() as session:
        result = await session.execute(text("""
            SELECT DISTINCT sn.code
            FROM scope_nodes sn
            WHERE sn.is_deleted = false
                AND sn.code ILIKE 'CDISC-CT-%'
        """))
        rows = result.fetchall()

        # 按类型分组
        versions_by_type: dict[str, set[str]] = defaultdict(set)
        for (code,) in rows:
            # code 格式: CDISC-CT-sdtmct-2024-12-27
            parts = code.replace("CDISC-CT-", "").split("-", 1)
            if len(parts) >= 1:
                ct_type = parts[0]
                versions_by_type[ct_type].add(code)

        return dict(versions_by_type)


def group_versions_by_type(all_versions: list[str]) -> dict[str, list[str]]:
    """将版本列表按 CT 类型分组"""
    grouped: dict[str, list[str]] = defaultdict(list)
    for version in all_versions:
        # version 格式: sdtmct-2024-12-27
        parts = version.split("-", 1)
        if len(parts) >= 1:
            ct_type = parts[0]
            grouped[ct_type].append(version)

    # 每个类型内按版本排序（降序，最新版本在前）
    for ct_type in grouped:
        grouped[ct_type] = sorted(grouped[ct_type], reverse=True)

    return dict(grouped)


async def sync_ct_versions(
    versions_to_sync: list[str],
    service: CDISCSyncService,
    ct_type: str
) -> tuple[int, int]:
    """同步指定版本的 CT 数据"""
    total_created = 0
    total_terms = 0

    async with async_session_factory() as session:
        for i, version in enumerate(versions_to_sync, 1):
            try:
                logger.info("-" * 60)
                logger.info(f"[{i}/{len(versions_to_sync)}] 同步: {version}")

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

    return total_created, total_terms


async def sync_all_ct(
    types_filter: list[str] | None = None,
    latest_only: bool = False,
    repair_mode: bool = False
):
    """
    同步所有 CT 类型

    Args:
        types_filter: 指定同步的 CT 类型列表，None 表示全部
        latest_only: 是否只同步最新版本
        repair_mode: 修复模式，只同步缺失的版本
    """
    logger.info("=" * 60)
    logger.info("CDISC CT 全量同步 - 开始")
    logger.info("=" * 60)

    # 1. 获取 CDISC API 中所有 CT 版本
    service = CDISCSyncService()
    all_versions = await service._get_ct_versions()

    if not all_versions:
        logger.error("无法获取 CT 版本列表")
        return

    # 2. 按类型分组
    versions_by_type = group_versions_by_type(all_versions)

    # 3. 过滤指定的类型
    if types_filter:
        types_filter_lower = [t.lower() for t in types_filter]
        versions_by_type = {
            k: v for k, v in versions_by_type.items()
            if k.lower() in types_filter_lower
        }

    # 4. 获取已存在的版本
    existing_versions = await get_current_ct_versions() if repair_mode else {}

    # 5. 打印摘要
    logger.info(f"CDISC API 返回 {len(all_versions)} 个 CT 包")
    logger.info("版本分布:")
    for ct_type in sorted(versions_by_type.keys(), key=lambda x: CT_TYPE_CONFIG.get(x, {}).get("order", 99)):
        config = CT_TYPE_CONFIG.get(ct_type, {"label": ct_type})
        count = len(versions_by_type[ct_type])
        existing = len(existing_versions.get(ct_type, set()))
        logger.info(f"  - {config['label']}: {count} 个版本 (已存在 {existing})")

    # 6. 逐类型同步
    grand_total_created = 0
    grand_total_terms = 0

    for ct_type in sorted(versions_by_type.keys(), key=lambda x: CT_TYPE_CONFIG.get(x, {}).get("order", 99)):
        config = CT_TYPE_CONFIG.get(ct_type, {"label": ct_type})
        versions = versions_by_type[ct_type]

        if not versions:
            continue

        # 选择要同步的版本
        if latest_only:
            versions_to_sync = [versions[0]]  # 最新版本
            logger.info("=" * 60)
            logger.info(f"同步 {config['label']} 最新版本: {versions[0]}")
        elif repair_mode:
            # 只同步缺失的版本
            existing = existing_versions.get(ct_type, set())
            versions_to_sync = [
                v for v in versions
                if f"CDISC-CT-{v}" not in existing
            ]
            if not versions_to_sync:
                logger.info(f"{config['label']}: 所有版本已存在，跳过")
                continue
            logger.info("=" * 60)
            logger.info(f"修复 {config['label']}: {len(versions_to_sync)} 个缺失版本")
        else:
            versions_to_sync = versions
            logger.info("=" * 60)
            logger.info(f"同步 {config['label']}: {len(versions)} 个版本")

        created, terms = await sync_ct_versions(versions_to_sync, service, ct_type)
        grand_total_created += created
        grand_total_terms += terms

        logger.info(f"{config['label']} 同步完成: {created} codelists, {terms} terms")

    # 7. 总结
    logger.info("=" * 60)
    logger.info("CDISC CT 全量同步 - 完成!")
    logger.info(f"  总计: {grand_total_created} codelists, {grand_total_terms} terms")
    logger.info("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="同步 CDISC Controlled Terminology (CT) 数据"
    )
    parser.add_argument(
        "--types",
        nargs="*",
        help="指定同步的 CT 类型，如: sdtmct adamct sendct。不指定则同步全部"
    )
    parser.add_argument(
        "--latest",
        action="store_true",
        help="只同步每个 CT 类型的最新版本"
    )
    parser.add_argument(
        "--repair",
        action="store_true",
        help="修复模式：只同步数据库中缺失的版本"
    )

    args = parser.parse_args()

    asyncio.run(sync_all_ct(
        types_filter=args.types,
        latest_only=args.latest,
        repair_mode=args.repair
    ))


if __name__ == "__main__":
    main()