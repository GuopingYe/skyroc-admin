"""
CDISC 全局标准库增量同步脚本

支持增量同步的核心功能:
1. 自动检测数据库中已存在的标准版本
2. 仅同步缺失的版本，避免重复 API 调用
3. 支持所有标准类型的增量同步
4. 数据完整性检查和修复功能

核心标准集 (Core Set):
- SDTM Model: 最新版本
- SDTMIG: 全量历史版本
- ADaM Model: 最新版本
- ADaMIG: 全量历史版本
- CDASHIG: 最新版本
- SENDIG: 最新版本
- CT: 最新受控术语包
- QRS: 常用量表测试
- BC: 生物医学概念 (可选)

防爆破节流阀: 每个大标准同步后等待 2 秒
全局异常捕获: 单个标准失败不影响整体
幂等性保证: 重复执行不会产生重复数据
完整性检查: 比对 API 返回的数据量与数据库实际数据量
"""
import argparse
import asyncio
import logging
import sys
from datetime import datetime
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models import (
    BiomedicalConcept,
    Codelist,
    CodelistTerm,
    ScopeNode,
    Specification,
    TargetDataset,
    TargetVariable,
)
from app.services.cdisc_sync_service import CDISCSyncError, CDISCSyncService

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ============================================================
# 核心标准集定义
# ============================================================

# 预定义的标准集
PRESET_CORE_SETS = {
    "minimal": {
        "sdtmig": ["3-4"],  # 最新 SDTMIG
        "adamig": ["1-3"],  # 最新 ADaMIG
        "ct": ["latest"],   # 最新 SDTM CT
    },
    "standard": {
        "sdtm": ["latest"],
        "sdtmig": ["3-4", "3-3"],  # 最近两个版本
        "adam": ["latest"],
        "adamig": ["1-3", "1-2"],  # 最近两个版本
        "ct": ["latest"],
    },
    "full": {
        "sdtm": ["all"],
        "sdtmig": ["all"],
        "adam": ["all"],
        "adamig": ["all"],
        "cdashig": ["all"],
        "sendig": ["all"],
        "ct": ["all"],      # 全量 CT (所有类型)
        "tig": ["all"],     # 全量 TIG (ISS/ISE 等)
    },
    "allct": {
        "ct": ["all"],      # 所有 CT 类型全量
    },
    "sdtmct": {
        "ct": ["sdtmct"],   # 仅 SDTM CT 全量
    },
    "adamct": {
        "ct": ["adamct"],   # 仅 ADaM CT 全量
    },
    "test": {
        "sdtm": ["latest"],
    },
    "sendig": {
        "sendig": ["all"],  # 仅 SENDIG 全量
    },
    "cdashig": {
        "cdashig": ["all"],  # 仅 CDASHIG 全量
    },
}

# 标准类型到 code 前缀的映射 (用于数据库查询)
STANDARD_CODE_PREFIX = {
    "sdtm": "CDISC-SDTM-",
    "sdtmig": "CDISC-SDTMIG-",
    "adam": "CDISC-ADAM-",
    "adamig": "CDISC-ADAMIG-",
    "cdashig": "CDISC-CDASHIG-",
    "sendig": "CDISC-SENDIG-",
    "ct": "CDISC-CT-",
    "tig": "CDISC-TIG-",
}

# CT 子类型前缀映射
CT_TYPE_PREFIXES = {
    "sdtmct": "CDISC-CT-sdtmct-",
    "adamct": "CDISC-CT-adamct-",
    "sendct": "CDISC-CT-sendct-",
    "cdashct": "CDISC-CT-cdashct-",
    "protocolct": "CDISC-CT-protocolct-",
    "qrsct": "CDISC-CT-qrsct-",
    "ddfct": "CDISC-CT-ddfct-",
    "define": "CDISC-CT-define-",
    "glossaryct": "CDISC-CT-glossaryct-",
    "tmfct": "CDISC-CT-tmfct-",
    "mrctct": "CDISC-CT-mrctct-",
    "coact": "CDISC-CT-coact-",
    "qs": "CDISC-CT-qs-",
}

# 节流间隔 (秒)
THROTTLE_INTERVAL = 2


# ============================================================
# 增量同步核心函数
# ============================================================


async def get_existing_versions(session: AsyncSession, standard_type: str) -> set[str]:
    """
    获取数据库中已存在的标准版本

    Args:
        session: 数据库会话
        standard_type: 标准类型 (sdtm, sdtmig, adam, adamig, ct, tig 等)

    Returns:
        已存在版本的集合
    """
    existing = set()
    standard_type = standard_type.lower()

    if standard_type == "ct":
        # CT 类型：查询所有 CT 版本
        result = await session.execute(text("""
            SELECT DISTINCT sn.code
            FROM scope_nodes sn
            WHERE sn.is_deleted = false
                AND sn.code LIKE 'CDISC-CT-%'
        """))
        rows = result.fetchall()
        for row in rows:
            code = row[0]
            # 提取版本号: CDISC-CT-sdtmct-2024-09-27 -> sdtmct-2024-09-27
            if code.startswith("CDISC-CT-"):
                version = code[9:]  # 去掉 "CDISC-CT-" 前缀
                existing.add(version)
    else:
        # 其他标准类型
        prefix = STANDARD_CODE_PREFIX.get(standard_type)
        if not prefix:
            logger.warning(f"Unknown standard type for version query: {standard_type}")
            return existing

        result = await session.execute(text(f"""
            SELECT DISTINCT sn.code
            FROM scope_nodes sn
            WHERE sn.is_deleted = false
                AND sn.code LIKE :prefix
        """), {"prefix": f"{prefix}%"})
        rows = result.fetchall()
        for row in rows:
            code = row[0]
            # 提取版本号: CDISC-SDTMIG-3-4 -> 3-4
            if code.startswith(prefix):
                version = code[len(prefix):]
                existing.add(version)

    return existing


async def get_missing_versions(
    session: AsyncSession,
    service: CDISCSyncService,
    standard_type: str,
    requested_versions: list[str],
) -> tuple[list[str], list[str], list[str]]:
    """
    计算缺失的版本（增量同步核心逻辑）

    Args:
        session: 数据库会话
        service: CDISC 同步服务
        standard_type: 标准类型
        requested_versions: 请求的版本列表 (可能包含 "all", "latest", "sdtmct" 等)

    Returns:
        (all_versions, existing_versions, missing_versions)
    """
    standard_type = standard_type.lower()

    # 获取 API 返回的所有可用版本
    api_versions = await service.get_available_versions(standard_type)

    if not api_versions:
        logger.warning(f"No versions found in API for {standard_type.upper()}")
        return [], [], []

    # 处理请求的版本列表
    target_versions = []

    for req_ver in requested_versions:
        req_lower = req_ver.lower()

        if req_lower == "all":
            # 全量同步：使用所有 API 版本
            target_versions = api_versions
            break

        elif req_lower == "latest":
            # 最新版本
            if api_versions:
                # CT: 找最新的 sdtmct 版本
                if standard_type == "ct":
                    sdtmct_versions = [v for v in api_versions if v.startswith("sdtmct-")]
                    if sdtmct_versions:
                        target_versions.append(sdtmct_versions[-1])  # 最后一个是最新的
                else:
                    target_versions.append(api_versions[0])  # 第一个通常是最新的

        elif req_lower in CT_TYPE_PREFIXES and standard_type == "ct":
            # CT 子类型：如 "sdtmct", "adamct"
            ct_type = req_lower
            ct_versions = [v for v in api_versions if v.startswith(f"{ct_type}-")]
            target_versions.extend(ct_versions)

        else:
            # 具体版本号
            if req_ver in api_versions:
                target_versions.append(req_ver)
            else:
                logger.warning(f"Version {req_ver} not found in API for {standard_type}")

    # 去重并排序
    target_versions = sorted(set(target_versions))

    # 获取数据库中已存在的版本
    existing_versions = await get_existing_versions(session, standard_type)

    # 计算缺失的版本
    missing_versions = []
    for ver in target_versions:
        # 根据标准类型，检查是否已存在
        if standard_type == "ct":
            # CT 版本号格式: sdtmct-2024-09-27
            if ver not in existing_versions:
                missing_versions.append(ver)
        else:
            # 其他标准版本号格式: 3-4
            if ver not in existing_versions:
                missing_versions.append(ver)

    return target_versions, existing_versions, missing_versions


async def resolve_version(
    service: CDISCSyncService,
    standard_type: str,
    version: str,
) -> str:
    """
    解析版本号

    Args:
        service: CDISC 同步服务
        standard_type: 标准类型
        version: 版本 ("latest" 或实际版本号)

    Returns:
        实际版本号
    """
    if version.lower() == "latest":
        # 获取可用版本列表
        versions = await service.get_available_versions(standard_type)
        if versions:
            # CT 特殊处理：返回最新的 sdtmct
            if standard_type == "ct":
                sdtmct_versions = [v for v in versions if v.startswith("sdtmct-")]
                if sdtmct_versions:
                    return sdtmct_versions[-1]
            return versions[0]
        else:
            logger.warning(f"Could not determine latest version for {standard_type}, using default")
            # 返回默认版本
            defaults = {
                "sdtm": "1-13",
                "sdtmig": "3-4",
                "adam": "1-3",
                "adamig": "1-3",
                "cdashig": "2-2",
                "sendig": "3-2",
            }
            return defaults.get(standard_type, "latest")

    return version


# ============================================================
# 数据完整性检查与修复
# ============================================================


async def get_ct_version_codelist_count(service: CDISCSyncService, version: str) -> int:
    """
    从 CDISC API 获取 CT 版本的 codelist 数量

    Args:
        service: CDISC 同步服务
        version: CT 版本号 (如 sdtmct-2024-09-27)

    Returns:
        API 返回的 codelist 数量
    """
    try:
        client = await service._get_client()
        response = await client.get(f"/mdr/ct/packages/{version}/codelists")

        if response.status_code != 200:
            logger.warning(f"Failed to fetch CT codelists for {version}: {response.status_code}")
            return 0

        data = response.json()
        links = data.get("_links", {})
        codelists = links.get("codelists", [])
        return len(codelists)
    except Exception as e:
        logger.error(f"Error fetching codelist count for {version}: {e}")
        return 0


async def get_db_codelist_count(session: AsyncSession, scope_node_code: str) -> int:
    """
    获取数据库中指定版本的 codelist 数量

    Args:
        session: 数据库会话
        scope_node_code: ScopeNode code (如 CDISC-CT-sdtmct-2024-09-27)

    Returns:
        数据库中的 codelist 数量
    """
    result = await session.execute(text("""
        SELECT COUNT(c.id)
        FROM scope_nodes sn
        JOIN codelists c ON c.scope_node_id = sn.id AND c.is_deleted = false
        WHERE sn.code = :code AND sn.is_deleted = false
    """), {"code": scope_node_code})
    return result.scalar() or 0


async def check_ct_integrity(
    session: AsyncSession,
    service: CDISCSyncService,
    ct_type: str = "sdtmct",
) -> list[dict]:
    """
    检查 CT 数据完整性

    Args:
        session: 数据库会话
        service: CDISC 同步服务
        ct_type: CT 类型 (sdtmct, adamct 等)

    Returns:
        不完整版本的列表
    """
    logger.info(f"")
    logger.info(f"{'═'*60}")
    logger.info(f"🔍 检查 {ct_type.upper()} 数据完整性")
    logger.info(f"{'═'*60}")

    # 获取所有已存在的版本
    result = await session.execute(text(f"""
        SELECT sn.code, sn.id
        FROM scope_nodes sn
        WHERE sn.is_deleted = false
            AND sn.code LIKE 'CDISC-CT-{ct_type}-%'
        ORDER BY sn.code
    """))
    rows = result.fetchall()

    if not rows:
        logger.info(f"   数据库中没有 {ct_type} 版本")
        return []

    incomplete_versions = []

    for row in rows:
        code = row[0]
        scope_node_id = row[1]
        version = code.replace("CDISC-CT-", "")

        # 获取 API 中的 codelist 数量
        api_count = await get_ct_version_codelist_count(service, version)

        # 获取数据库中的 codelist 数量
        db_count = await get_db_codelist_count(session, code)

        # 判断完整性
        if api_count > 0 and db_count < api_count * 0.9:  # 允许 10% 误差
            status = "⚠️ 不完整"
            incomplete_versions.append({
                "version": version,
                "code": code,
                "scope_node_id": scope_node_id,
                "api_count": api_count,
                "db_count": db_count,
            })
        else:
            status = "✅"

        logger.info(f"   {version:<25} API: {api_count:>4}  DB: {db_count:>4}  {status}")

    return incomplete_versions


async def repair_incomplete_version(
    session: AsyncSession,
    service: CDISCSyncService,
    version_info: dict,
) -> bool:
    """
    修复不完整的版本

    Args:
        session: 数据库会话
        service: CDISC 同步服务
        version_info: 版本信息字典

    Returns:
        是否修复成功
    """
    version = version_info["version"]
    scope_node_id = version_info["scope_node_id"]

    logger.info(f"")
    logger.info(f"🔧 修复不完整版本: {version}")
    logger.info(f"   API codelists: {version_info['api_count']}")
    logger.info(f"   DB codelists: {version_info['db_count']}")

    try:
        # 软删除该版本的所有数据
        logger.info(f"   🗑️ 软删除旧数据...")

        # 删除 codelist_terms
        await session.execute(text("""
            UPDATE codelist_terms
            SET is_deleted = true, deleted_at = NOW(), deleted_by = 'repair_sync'
            WHERE codelist_id IN (
                SELECT id FROM codelists WHERE scope_node_id = :scope_node_id
            )
        """), {"scope_node_id": scope_node_id})

        # 删除 codelists
        await session.execute(text("""
            UPDATE codelists
            SET is_deleted = true, deleted_at = NOW(), deleted_by = 'repair_sync'
            WHERE scope_node_id = :scope_node_id
        """), {"scope_node_id": scope_node_id})

        # 删除 scope_node
        await session.execute(text("""
            UPDATE scope_nodes
            SET is_deleted = true, deleted_at = NOW(), deleted_by = 'repair_sync'
            WHERE id = :scope_node_id
        """), {"scope_node_id": scope_node_id})

        await session.commit()
        logger.info(f"   ✅ 旧数据已软删除")

        # 重新同步
        logger.info(f"   🔄 重新同步...")
        result = await service.sync(session, "ct", version)
        await session.commit()

        new_count = result.get("created", 0)
        logger.info(f"   ✅ 同步完成: {new_count} codelists")

        return True

    except Exception as e:
        logger.error(f"   ❌ 修复失败: {e}")
        await session.rollback()
        return False


async def check_and_repair(
    session: AsyncSession,
    service: CDISCSyncService,
    ct_type: str = "sdtmct",
    auto_repair: bool = False,
) -> dict:
    """
    检查并修复 CT 数据完整性

    Args:
        session: 数据库会话
        service: CDISC 同步服务
        ct_type: CT 类型
        auto_repair: 是否自动修复

    Returns:
        检查和修复结果
    """
    # 检查完整性
    incomplete_versions = await check_ct_integrity(session, service, ct_type)

    result = {
        "ct_type": ct_type,
        "total_checked": 0,
        "incomplete_count": len(incomplete_versions),
        "repaired_count": 0,
        "failed_count": 0,
        "incomplete_versions": incomplete_versions,
    }

    # 获取总检查数
    db_result = await session.execute(text(f"""
        SELECT COUNT(*) FROM scope_nodes
        WHERE is_deleted = false AND code LIKE 'CDISC-CT-{ct_type}-%'
    """))
    result["total_checked"] = db_result.scalar() or 0

    if not incomplete_versions:
        logger.info(f"")
        logger.info(f"   ✅ 所有 {ct_type} 版本数据完整")
        return result

    logger.info(f"")
    logger.info(f"   ⚠️ 发现 {len(incomplete_versions)} 个不完整版本")

    if not auto_repair:
        logger.info(f"   💡 使用 --repair 参数自动修复")
        return result

    # 自动修复
    logger.info(f"")
    logger.info(f"   🔧 开始自动修复...")

    for idx, version_info in enumerate(incomplete_versions, 1):
        logger.info(f"")
        logger.info(f"   [{idx}/{len(incomplete_versions)}] 修复: {version_info['version']}")

        success = await repair_incomplete_version(session, service, version_info)
        if success:
            result["repaired_count"] += 1
        else:
            result["failed_count"] += 1

        # 节流
        if THROTTLE_INTERVAL > 0 and idx < len(incomplete_versions):
            await asyncio.sleep(THROTTLE_INTERVAL)

    return result


# ============================================================
# 同步执行函数
# ============================================================


async def sync_standard(
    service: CDISCSyncService,
    session: AsyncSession,
    standard_type: str,
    version: str,
    progress: str = "",
) -> dict:
    """
    同步单个标准

    Args:
        service: CDISC 同步服务
        session: 数据库会话
        standard_type: 标准类型
        version: 版本
        progress: 进度信息 (如 "[1/10]")

    Returns:
        同步结果
    """
    progress_str = f"{progress} " if progress else ""
    logger.info(f"{'='*60}")
    logger.info(f"🚀 {progress_str}Starting sync: {standard_type.upper()} v{version}")
    logger.info(f"{'='*60}")

    try:
        result = await service.sync(session, standard_type, version)

        # 打印结果摘要
        datasets = result.get("datasets_created", 0) + result.get("datasets_updated", 0)
        variables = result.get("variables_created", 0) + result.get("variables_updated", 0)
        codelists = result.get("codelists_created", 0) + result.get("codelists_updated", 0)
        terms = result.get("terms_created", 0) + result.get("terms_updated", 0)
        bcs = result.get("bc_created", 0) + result.get("bc_updated", 0)
        instruments = result.get("instruments_created", 0) + result.get("instruments_updated", 0)
        items = result.get("items_created", 0) + result.get("items_updated", 0)
        errors = len(result.get("errors", []))

        logger.info(f"✅ {progress_str}Sync completed: {standard_type.upper()} v{version}")
        logger.info(f"   Datasets: {datasets}, Variables: {variables}")
        logger.info(f"   Codelists: {codelists}, Terms: {terms}")
        logger.info(f"   BCs: {bcs}, Errors: {errors}")
        if instruments > 0 or items > 0:
            logger.info(f"   QRS Instruments: {instruments}, Items: {items}")

        return result

    except CDISCSyncError as e:
        logger.error(f"❌ {progress_str}Sync failed: {standard_type.upper()} v{version} - {e}")
        return {"error": str(e)}
    except Exception as e:
        logger.error(f"❌ {progress_str}Unexpected error: {standard_type.upper()} v{version} - {e}")
        return {"error": str(e)}


async def sync_standard_incremental(
    service: CDISCSyncService,
    session: AsyncSession,
    standard_type: str,
    requested_versions: list[str],
    force: bool = False,
) -> dict:
    """
    增量同步标准（核心函数）

    自动检测已有版本，仅同步缺失的版本

    Args:
        service: CDISC 同步服务
        session: 数据库会话
        standard_type: 标准类型
        requested_versions: 请求的版本列表
        force: 强制重新同步所有版本（即使已存在）

    Returns:
        汇总的同步结果
    """
    logger.info(f"")
    logger.info(f"{'═'*60}")
    logger.info(f"📦 Processing: {standard_type.upper()}")
    logger.info(f"{'═'*60}")

    # 计算缺失的版本
    all_versions, existing_versions, missing_versions = await get_missing_versions(
        session, service, standard_type, requested_versions
    )

    # 打印增量同步状态
    logger.info(f"   📊 API 可用版本: {len(all_versions)}")
    logger.info(f"   ✅ 数据库已有: {len(existing_versions)}")

    # 强制模式：同步所有版本
    if force:
        logger.info(f"   🔧 强制模式: 将重新同步所有版本")
        versions_to_sync = all_versions
    else:
        versions_to_sync = missing_versions
        logger.info(f"   🔄 需要同步: {len(missing_versions)}")

    if not versions_to_sync:
        logger.info(f"   ⏭️  所有版本已存在，跳过同步")
        return {
            "standard_type": standard_type,
            "total_versions": len(all_versions),
            "existing_versions": len(existing_versions),
            "synced_versions": 0,
            "skipped": True,
        }

    # 打印要同步的版本列表
    if len(versions_to_sync) <= 10:
        logger.info(f"   📋 同步版本: {versions_to_sync}")
    else:
        logger.info(f"   📋 同步版本 (前10个): {versions_to_sync[:10]}... 共 {len(versions_to_sync)} 个")

    # 汇总结果
    aggregated = {
        "standard_type": standard_type,
        "total_versions": len(all_versions),
        "existing_versions": len(existing_versions),
        "synced_versions": 0,
        "skipped": False,
        "results": [],
        "errors": [],
    }

    # 遍历同步版本
    total_to_sync = len(versions_to_sync)
    for idx, version in enumerate(versions_to_sync, 1):
        progress = f"[{idx}/{total_to_sync}]"
        result = await sync_standard(service, session, standard_type, version, progress)

        if "error" in result:
            aggregated["errors"].append({"version": version, "error": result["error"]})
        else:
            aggregated["synced_versions"] += 1

        aggregated["results"].append({"version": version, "result": result})

        # 节流
        if THROTTLE_INTERVAL > 0 and idx < total_to_sync:
            logger.info(f"   ⏳ Throttling: waiting {THROTTLE_INTERVAL}s...")
            await asyncio.sleep(THROTTLE_INTERVAL)

    # 打印汇总
    logger.info(f"")
    logger.info(f"   ✅ {standard_type.upper()} 同步完成: {aggregated['synced_versions']}/{total_to_sync}")
    if aggregated["errors"]:
        logger.warning(f"   ⚠️  失败: {len(aggregated['errors'])} 个版本")

    return aggregated


# ============================================================
# 统计函数
# ============================================================


async def count_records(session: AsyncSession) -> dict:
    """
    统计各表数据量

    Returns:
        各表记录数
    """
    counts = {}

    # ScopeNode (CDISC 类型)
    result = await session.execute(
        select(func.count(ScopeNode.id)).where(
            ScopeNode.node_type == "CDISC",
            ScopeNode.is_deleted == False,
        )
    )
    counts["cdisc_nodes"] = result.scalar() or 0

    # ScopeNode (所有)
    result = await session.execute(
        select(func.count(ScopeNode.id)).where(ScopeNode.is_deleted == False)
    )
    counts["scope_nodes_total"] = result.scalar() or 0

    # Specification
    result = await session.execute(
        select(func.count(Specification.id)).where(Specification.is_deleted == False)
    )
    counts["specifications"] = result.scalar() or 0

    # TargetDataset
    result = await session.execute(
        select(func.count(TargetDataset.id)).where(TargetDataset.is_deleted == False)
    )
    counts["target_datasets"] = result.scalar() or 0

    # TargetVariable
    result = await session.execute(
        select(func.count(TargetVariable.id)).where(TargetVariable.is_deleted == False)
    )
    counts["target_variables"] = result.scalar() or 0

    # Codelist
    result = await session.execute(
        select(func.count(Codelist.id)).where(Codelist.is_deleted == False)
    )
    counts["codelists"] = result.scalar() or 0

    # CodelistTerm
    result = await session.execute(
        select(func.count(CodelistTerm.id)).where(CodelistTerm.is_deleted == False)
    )
    counts["codelist_terms"] = result.scalar() or 0

    # BiomedicalConcept
    result = await session.execute(
        select(func.count(BiomedicalConcept.id)).where(BiomedicalConcept.is_deleted == False)
    )
    counts["biomedical_concepts"] = result.scalar() or 0

    return counts


def print_summary(counts: dict, duration: float, sync_summary: dict) -> None:
    """打印数据统计摘要"""
    print("\n")
    print("=" * 70)
    print("📊 CDISC 全局标准库增量同步完成 - 数据统计报告")
    print("=" * 70)
    print(f"\n⏱️  总耗时: {duration:.2f} 秒")

    # 同步汇总
    print("\n📦 同步汇总:")
    print("-" * 40)
    for std_type, summary in sync_summary.items():
        status = "⏭️ 跳过" if summary.get("skipped") else "✅ 完成"
        print(f"  {status} {std_type.upper():12} | "
              f"已有: {summary.get('existing_versions', 0):3} | "
              f"同步: {summary.get('synced_versions', 0):3} | "
              f"总计: {summary.get('total_versions', 0):3}")
    print("-" * 40)

    # 数据量统计
    print("\n📈 数据量统计:")
    print("-" * 40)
    print(f"  🌐 CDISC 标准节点:     {counts.get('cdisc_nodes', 0):>8,}")
    print(f"  📄 规范文档 (Spec):    {counts.get('specifications', 0):>8,}")
    print(f"  📦 数据集 (Dataset):   {counts.get('target_datasets', 0):>8,}")
    print(f"  📝 变量 (Variable):    {counts.get('target_variables', 0):>8,}")
    print(f"  🏷️  编码列表 (Codelist): {counts.get('codelists', 0):>8,}")
    print(f"  📋 编码术语 (Term):    {counts.get('codelist_terms', 0):>8,}")
    print(f"  🧬 生物医学概念 (BC):  {counts.get('biomedical_concepts', 0):>8,}")
    print("-" * 40)
    print(f"  📊 总记录数:           {sum(counts.values()):>8,}")
    print("\n" + "=" * 70)


# ============================================================
# 主函数
# ============================================================


async def main(preset: str = "standard", check_integrity: bool = False, repair: bool = False, force: bool = False):
    """
    主函数 - 执行 CDISC 标准库增量同步

    Args:
        preset: 预设标准集名称 (minimal, standard, full, sdtmct, adamct, test, sendig)
        check_integrity: 是否检查数据完整性
        repair: 是否自动修复不完整数据
        force: 强制重新同步所有版本
    """
    start_time = datetime.now()

    # 初始化同步服务
    service = CDISCSyncService()

    try:
        async with async_session_factory() as session:
            # 数据完整性检查模式
            if check_integrity or repair:
                logger.info("")
                logger.info("🔍 CDISC CT 数据完整性检查 - 启动!")
                logger.info(f"⏰ 开始时间: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
                if repair:
                    logger.info("🔧 自动修复模式: 开启")

                # 检查 SDTM CT
                sdtmct_result = await check_and_repair(session, service, "sdtmct", auto_repair=repair)

                # 检查 ADaM CT
                adamct_result = await check_and_repair(session, service, "adamct", auto_repair=repair)

                # 检查其他 CT 类型
                for ct_type in ["cdashct", "sendct", "qrsct"]:
                    await check_and_repair(session, service, ct_type, auto_repair=repair)

                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()

                # 打印摘要
                print("\n")
                print("=" * 70)
                print("📊 CDISC CT 数据完整性检查完成")
                print("=" * 70)
                print(f"\n⏱️  总耗时: {duration:.2f} 秒")
                print(f"\n📋 SDTM CT 检查结果:")
                print(f"   检查版本: {sdtmct_result['total_checked']}")
                print(f"   不完整: {sdtmct_result['incomplete_count']}")
                if repair:
                    print(f"   已修复: {sdtmct_result['repaired_count']}")
                    print(f"   修复失败: {sdtmct_result['failed_count']}")

                return {
                    "start_time": start_time.isoformat(),
                    "end_time": end_time.isoformat(),
                    "duration_seconds": duration,
                    "mode": "repair" if repair else "check",
                    "sdtmct_result": sdtmct_result,
                    "adamct_result": adamct_result,
                }

            # 正常同步模式
            core_set = PRESET_CORE_SETS.get(preset, PRESET_CORE_SETS["standard"])

            logger.info("")
            logger.info("🔥 CDISC 全局标准库增量同步 - 启动!")
            logger.info(f"📋 使用预设: {preset}")
            logger.info(f"📋 标准集: {list(core_set.keys())}")
            logger.info(f"⏰ 开始时间: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")

            sync_summary = {}

            # 按顺序同步每个标准类型
            for standard_type, versions in core_set.items():
                try:
                    summary = await sync_standard_incremental(
                        service=service,
                        session=session,
                        standard_type=standard_type,
                        requested_versions=versions,
                        force=force,
                    )
                    sync_summary[standard_type] = summary

                except Exception as e:
                    logger.error(f"❌ Critical error syncing {standard_type}: {e}")
                    sync_summary[standard_type] = {"error": str(e)}
                    continue

            # 统计数据量
            logger.info("\n📊 统计数据库记录...")
            counts = await count_records(session)

    except Exception as e:
        logger.critical(f"💥 Fatal error: {e}")
        raise
    finally:
        await service.close()

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    # 打印摘要
    print_summary(counts, duration, sync_summary)

    # 返回结果
    return {
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "duration_seconds": duration,
        "preset": preset,
        "counts": counts,
        "sync_summary": sync_summary,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="CDISC 标准库增量同步脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
预设标准集:
  minimal   - 最小集: SDTMIG 3-4, ADaMIG 1-3, 最新 SDTM CT
  standard  - 标准集: 最新 SDTM/ADaM + 最近两个 IG 版本 + 最新 CT
  full      - 全量集: 所有标准类型的历史版本
  allct     - 所有 CT 类型全量 (SDTM/ADaM/SEND/CDASH/Protocol/QRS/DDF/Define/Glossary/TMF/MRCT/COA/QS)
  sdtmct    - 仅 SDTM CT 全量
  adamct    - 仅 ADaM CT 全量
  sendig    - 仅 SENDIG 全量
  test      - 测试集: 仅最新 SDTM

示例:
  # 同步模式
  python scripts/run_initial_cdisc_sync.py              # 使用 standard 预设
  python scripts/run_initial_cdisc_sync.py --preset full   # 全量同步
  python scripts/run_initial_cdisc_sync.py --preset sendig # 仅同步 SENDIG
  python scripts/run_initial_cdisc_sync.py --preset sendig --force  # 强制重新同步 SENDIG

  # 数据完整性检查与修复
  python scripts/run_initial_cdisc_sync.py --check-integrity  # 检查 CT 数据完整性
  python scripts/run_initial_cdisc_sync.py --repair            # 检查并自动修复
        """,
    )
    parser.add_argument(
        "--preset",
        choices=list(PRESET_CORE_SETS.keys()),
        default="standard",
        help="预设标准集 (default: standard)",
    )
    parser.add_argument(
        "--check-integrity",
        action="store_true",
        help="检查 CT 数据完整性（比对 API 数据量与数据库数据量）",
    )
    parser.add_argument(
        "--repair",
        action="store_true",
        help="检查数据完整性并自动修复不完整的版本",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="强制重新同步所有版本（即使已存在）",
    )
    args = parser.parse_args()

    asyncio.run(main(
        preset=args.preset,
        check_integrity=args.check_integrity,
        repair=args.repair,
        force=args.force,
    ))