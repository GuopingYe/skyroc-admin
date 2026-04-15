"""
CDISC Library Sync Service - 深度重构版

全局标准库同步引擎 - 从 CDISC Library API 抓取官方标准并结构化存储

支持的标准类型 (9种)：
1. sdtm (Foundational Model) - SDTM 基础模型
2. sdtmig (Implementation Guide) - SDTMIG 实施指南
3. adam (Foundational Model) - ADaM 基础模型
4. adamig (Implementation Guide) - ADaMIG 实施指南
5. cdashig - CDASH 实施指南
6. sendig - SEND 实施指南
7. qrs - Questionnaires, Ratings, and Scales 量表库
8. ct - Controlled Terminology 受控术语
9. bc - Biomedical Concepts 生物医学概念

核心设计原则：
1. 幂等性设计（重复执行不会产生重复数据）
2. 防御性编程（大量使用 dict.get()）
3. 分类抓取策略（Model/IG/CT/BC/QRS 不同解析逻辑）
"""
import asyncio
import logging
import re
from datetime import datetime
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import (
    BiomedicalConcept,
    Codelist,
    CodelistTerm,
    ScopeNode,
    Specification,
    TargetDataset,
    TargetVariable,
)
from app.models.enums import LifecycleStatus, NodeType
from app.models.mapping_enums import (
    DataType,
    DatasetClass,
    OriginType,
    OverrideType,
    SpecStatus,
    SpecType,
    VariableCore,
)

logger = logging.getLogger(__name__)


class CDISCSyncError(Exception):
    """CDISC 同步错误"""

    pass


class StandardType:
    """标准类型常量"""

    # Model 类型
    SDTM = "sdtm"
    ADAM = "adam"

    # IG 类型
    SDTMIG = "sdtmig"
    ADAMIG = "adamig"
    CDASHIG = "cdashig"
    SENDIG = "sendig"

    # QRS 量表库
    QRS = "qrs"

    # CT 和 BC
    CT = "ct"
    BC = "bc"

    # TIG (Targeted Implementation Guide / Integrated Standards)
    TIG = "tig"
    INTEGRATED = "integrated"  # 别名

    @classmethod
    def all(cls) -> list[str]:
        """返回所有支持的类型"""
        return [
            cls.SDTM,
            cls.SDTMIG,
            cls.ADAM,
            cls.ADAMIG,
            cls.CDASHIG,
            cls.SENDIG,
            cls.QRS,
            cls.CT,
            cls.BC,
            cls.TIG,
            cls.INTEGRATED,
        ]

    @classmethod
    def is_model_type(cls, standard_type: str) -> bool:
        """判断是否为 Model 类型"""
        return standard_type.lower() in [cls.SDTM, cls.ADAM]

    @classmethod
    def is_ig_type(cls, standard_type: str) -> bool:
        """判断是否为 IG 类型"""
        return standard_type.lower() in [
            cls.SDTMIG,
            cls.ADAMIG,
            cls.CDASHIG,
            cls.SENDIG,
        ]

    @classmethod
    def is_tig_type(cls, standard_type: str) -> bool:
        """判断是否为 TIG 类型"""
        return standard_type.lower() in [cls.TIG, cls.INTEGRATED]

    @classmethod
    def get_spec_type(cls, standard_type: str) -> SpecType | None:
        """获取规范类型"""
        mapping = {
            cls.SDTM: SpecType.SDTM,
            cls.SDTMIG: SpecType.SDTM,
            cls.ADAM: SpecType.ADAM,
            cls.ADAMIG: SpecType.ADAM,
            cls.CDASHIG: SpecType.SDTM,  # CDASH 基于 SDTM
            cls.SENDIG: SpecType.SDTM,  # SEND 基于 SDTM
            cls.QRS: SpecType.SDTM,  # QRS 基于 SDTM (QS Domain)
            cls.TIG: SpecType.SDTM,  # TIG 通常是 SDTM-based
            cls.INTEGRATED: SpecType.SDTM,
        }
        return mapping.get(standard_type.lower())


class CDISCSyncService:
    """
    CDISC Library 同步服务

    支持同步多种 CDISC 标准，采用分类抓取策略
    """

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        progress_callback: Any = None,
        cancel_check: Any = None,
    ):
        self.base_url = base_url or settings.CDISC_API_BASE_URL
        self.api_key = api_key or settings.CDISC_LIBRARY_API_KEY
        self.headers = {
            "api-key": self.api_key,
            "Accept": "application/json",
        }
        self._client: httpx.AsyncClient | None = None
        self._progress_callback = progress_callback
        self._cancel_check = cancel_check

    async def _get_client(self) -> httpx.AsyncClient:
        """获取或创建 HTTP 客户端"""
        if self._client is None:
            # 配置客户端以处理SSL和连接问题
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self.headers,
                timeout=120.0,  # 增加超时时间，QRS/CT 数据量可能很大
                verify=True,  # SSL验证
                http2=False,  # 禁用HTTP/2以避免兼容性问题
                limits=httpx.Limits(
                    max_connections=10,
                    max_keepalive_connections=5,
                    keepalive_expiry=30.0
                ),
            )
        return self._client

    async def close(self) -> None:
        """关闭 HTTP 客户端"""
        if self._client:
            await self._client.aclose()
            self._client = None

    # ============================================================
    # Progress / Cancel helpers
    # ============================================================

    async def _report_progress(
        self, current_step: str, completed: int, total: int
    ) -> None:
        """Report progress via callback."""
        if self._progress_callback:
            pct = int((completed / total) * 100) if total > 0 else 0
            await self._progress_callback({
                "current_step": current_step,
                "completed": completed,
                "total": total,
                "percentage": pct,
            })

    def _check_cancelled(self) -> bool:
        """Check if the task has been cancelled."""
        if self._cancel_check and self._cancel_check():
            raise asyncio.CancelledError("Sync cancelled by user")
        return False

    async def _fetch_json(self, endpoint: str) -> dict[str, Any] | None:
        """
        从 CDISC API 获取 JSON 数据（防御性编程）

        Args:
            endpoint: API 端点路径

        Returns:
            JSON 响应数据，失败时返回 None
        """
        # 方法1: 使用 httpx
        try:
            client = await self._get_client()
            response = await client.get(endpoint)

            if response.status_code != 200:
                logger.warning(
                    f"CDISC API error: {response.status_code} - {endpoint}"
                )
                # 尝试使用 curl 作为备选
                return await self._fetch_json_via_curl(endpoint)

            return response.json()
        except httpx.TimeoutException:
            logger.error(f"Timeout fetching: {endpoint}, trying curl fallback")
            return await self._fetch_json_via_curl(endpoint)
        except Exception as e:
            logger.error(f"Error fetching {endpoint}: {str(e)}, trying curl fallback")
            return await self._fetch_json_via_curl(endpoint)

    async def _fetch_json_via_curl(self, endpoint: str) -> dict[str, Any] | None:
        """
        使用 curl 作为备选方法获取 CDISC API 数据

        Args:
            endpoint: API 端点路径

        Returns:
            JSON 响应数据，失败时返回 None
        """
        import asyncio
        import json
        import shlex

        url = f"{self.base_url}{endpoint}"

        try:
            proc = await asyncio.create_subprocess_exec(
                'curl', '-s', '-m', '60',
                '-H', f'api-key: {self.api_key}',
                url,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=90)

            if proc.returncode == 0 and stdout:
                return json.loads(stdout.decode())
            else:
                logger.error(f"Curl fallback failed for {endpoint}: {stderr.decode() if stderr else 'Unknown error'}")
                return None
        except asyncio.TimeoutError:
            logger.error(f"Curl timeout for {endpoint}")
            return None
        except Exception as e:
            logger.error(f"Curl error for {endpoint}: {str(e)}")
            return None

    # ============================================================
    # 版本嗅探方法
    # ============================================================

    async def get_available_versions(self, standard_type: str) -> list[str]:
        """
        动态获取指定标准类型的所有可用版本

        Args:
            standard_type: 标准类型 (sdtm, sdtmig, adam, adamig, cdashig, sendig, tig, integrated)

        Returns:
            版本号列表，如 ["3-1-2", "3-2", "3-3", "3-4"]
            对于 TIG，返回的是完整 href 列表，如 ["/mdr/integrated/tig/iss-ise-1-0"]
        """
        standard_type = standard_type.lower()
        versions = []

        # 特殊处理的类型 - QRS 和 BC 不支持版本枚举
        if standard_type in ("qrs", "bc"):
            logger.warning(f"{standard_type.upper()} does not support version enumeration")
            return []

        # CT 特殊处理 - 从 terminology 分组获取所有 CT 包
        if standard_type == "ct":
            return await self._get_ct_versions()

        # TIG/Integrated 特殊处理 - 从 /mdr/products 的 integrated 分组获取
        if standard_type in ("tig", "integrated"):
            return await self._get_tig_versions()

        # 标准类型到 products 路径的映射
        # products 结构: data-tabulation -> sdtm, sdtmig, sendig
        #                data-analysis -> adam, adamig
        #                data-collection -> cdash, cdashig
        category_mapping = {
            "sdtm": ("data-tabulation", "sdtm"),
            "sdtmig": ("data-tabulation", "sdtmig"),
            "sendig": ("data-tabulation", "sendig"),
            "adam": ("data-analysis", "adam"),
            "adamig": ("data-analysis", "adamig"),
            "cdash": ("data-collection", "cdash"),
            "cdashig": ("data-collection", "cdashig"),
        }

        if standard_type not in category_mapping:
            logger.warning(f"Unknown standard type for version enumeration: {standard_type}")
            return []

        category, key = category_mapping[standard_type]

        try:
            # 从 /mdr/products 获取版本列表
            data = await self._fetch_json("/mdr/products")
            if not data:
                logger.warning(f"Failed to fetch /mdr/products for version enumeration")
                return []

            # 导航到对应的标准列表
            links = data.get("_links", {})
            category_links = links.get(category, {})
            if isinstance(category_links, dict):
                inner_links = category_links.get("_links", {})
                standard_links = inner_links.get(key, [])
            else:
                standard_links = []

            # 提取版本号
            for link in standard_links:
                href = link.get("href", "")
                if href:
                    # 从 href 提取版本号: /mdr/sdtmig/3-4 -> 3-4
                    parts = href.rstrip("/").split("/")
                    version = parts[-1] if parts else ""
                    if version and version not in versions:
                        versions.append(version)

            if versions:
                logger.info(f"Found {len(versions)} versions for {standard_type.upper()}: {versions}")
            else:
                logger.warning(f"No versions found for {standard_type.upper()}")

        except Exception as e:
            logger.error(f"Error fetching versions for {standard_type}: {str(e)}")

        return versions

    async def _get_tig_versions(self) -> list[str]:
        """
        获取 TIG (Integrated Standards) 的所有可用版本

        TIG 位于 /mdr/products 端点的 integrated 分组下

        Returns:
            TIG href 列表，如 ["/mdr/integrated/tig/iss-ise-1-0"]
        """
        versions = []

        try:
            data = await self._fetch_json("/mdr/products")
            if not data:
                logger.warning("Failed to fetch /mdr/products for TIG version enumeration")
                return []

            # 导航到 integrated 分组
            links = data.get("_links", {})
            integrated_section = links.get("integrated", {})

            if isinstance(integrated_section, dict):
                inner_links = integrated_section.get("_links", {})

                # 遍历所有数组（除了 self）
                for key, value in inner_links.items():
                    if key == "self":
                        continue

                    if isinstance(value, list):
                        for link in value:
                            href = link.get("href", "")
                            if href and href not in versions:
                                versions.append(href)

            if versions:
                logger.info(f"Found {len(versions)} TIG products: {versions}")
            else:
                logger.warning("No TIG versions found")

        except Exception as e:
            logger.error(f"Error fetching TIG versions: {str(e)}")

        return versions

    async def _get_ct_versions(self) -> list[str]:
        """
        获取 CT (Controlled Terminology) 的所有可用版本

        CT 位于 /mdr/products 端点的 terminology 分组下

        Returns:
            CT package 名称列表，如 ["sdtmct-2024-12-27", "adamct-2024-12-27", "cdashct-2024-12-27"]
        """
        versions = []

        try:
            data = await self._fetch_json("/mdr/products")
            if not data:
                logger.warning("Failed to fetch /mdr/products for CT version enumeration")
                return []

            # 导航到 terminology 分组
            links = data.get("_links", {})
            terminology_section = links.get("terminology", {})

            if isinstance(terminology_section, dict):
                inner_links = terminology_section.get("_links", {})
                packages = inner_links.get("packages", [])

                # 提取所有 CT 包
                for pkg in packages:
                    href = pkg.get("href", "")
                    # 从 href 提取包名: /mdr/ct/packages/sdtmct-2024-12-27 -> sdtmct-2024-12-27
                    parts = href.rstrip("/").split("/")
                    package_name = parts[-1] if parts else ""
                    if package_name and package_name not in versions:
                        versions.append(package_name)

            if versions:
                logger.info(f"Found {len(versions)} CT packages (all types)")
            else:
                logger.warning("No CT packages found")

        except Exception as e:
            logger.error(f"Error fetching CT versions: {str(e)}")

        return versions

    # ============================================================
    # 统一同步入口
    # ============================================================

    async def sync(
        self, session: AsyncSession, standard_type: str, version: str
    ) -> dict[str, Any]:
        """
        统一同步入口

        Args:
            session: 数据库会话
            standard_type: 标准类型
            version: 版本 ("all" 表示获取所有历史版本)
                      对于 TIG，version 可以是 href (如 "/mdr/integrated/tig/iss-ise-1-0")

        Returns:
            同步结果统计
        """
        standard_type = standard_type.lower()

        if standard_type not in StandardType.all():
            raise CDISCSyncError(
                f"Unsupported standard type: {standard_type}. "
                f"Supported: {StandardType.all()}"
            )

        # Resolve 'latest' to the actual newest version from CDISC API
        if version.lower() == "latest":
            version = await self._resolve_latest_version(standard_type)
            logger.info(
                f"Resolved 'latest' for {standard_type.upper()} → {version}"
            )

        # 特殊处理: "all" 版本 - 动态获取所有版本并遍历
        if version.lower() == "all":
            return await self._sync_all_versions(session, standard_type)

        # TIG 特殊处理 - version 可以是 href 或版本号
        if StandardType.is_tig_type(standard_type):
            return await self._sync_tig(session, version)

        # 根据类型路由到不同的同步方法
        sync_methods = {
            StandardType.SDTM: self._sync_sdtm_model,
            StandardType.SDTMIG: self._sync_sdtmig,
            StandardType.ADAM: self._sync_adam_model,
            StandardType.ADAMIG: self._sync_adamig,
            StandardType.CDASHIG: self._sync_cdashig,
            StandardType.SENDIG: self._sync_sendig,
            StandardType.QRS: self._sync_qrs,
            StandardType.CT: self._sync_ct,
            StandardType.BC: self._sync_bc,
        }

        sync_method = sync_methods.get(standard_type)
        if sync_method:
            return await sync_method(session, version)

        raise CDISCSyncError(f"No sync method for type: {standard_type}")

    async def _sync_all_versions(
        self, session: AsyncSession, standard_type: str
    ) -> dict[str, Any]:
        """
        同步指定标准类型的所有历史版本

        Args:
            session: 数据库会话
            standard_type: 标准类型

        Returns:
            汇总的同步结果
        """
        logger.info(f"{'='*60}")
        logger.info(f"🔄 Starting ALL VERSIONS sync for {standard_type.upper()}")
        logger.info(f"{'='*60}")

        # 获取所有可用版本
        versions = await self.get_available_versions(standard_type)

        if not versions:
            logger.warning(f"No versions found for {standard_type.upper()}")
            return self._init_result(standard_type.upper(), "all")

        total_versions = len(versions)
        logger.info(f"📋 Found {total_versions} versions to sync: {versions}")

        # 汇总结果
        aggregated_result = self._init_result(standard_type.upper(), "all")
        aggregated_result["versions_synced"] = 0
        aggregated_result["versions_total"] = total_versions
        aggregated_result["version_details"] = []

        # 根据类型获取同步方法
        # 注意: TIG 需要特殊处理，因为它的 version 是 href
        sync_methods = {
            StandardType.SDTM: self._sync_sdtm_model,
            StandardType.SDTMIG: self._sync_sdtmig,
            StandardType.ADAM: self._sync_adam_model,
            StandardType.ADAMIG: self._sync_adamig,
            StandardType.CDASHIG: self._sync_cdashig,
            StandardType.SENDIG: self._sync_sendig,
            StandardType.QRS: self._sync_qrs,
            StandardType.CT: self._sync_ct,
            StandardType.BC: self._sync_bc,
            StandardType.TIG: self._sync_tig,
            StandardType.INTEGRATED: self._sync_tig,
        }

        sync_method = sync_methods.get(standard_type)
        if not sync_method:
            raise CDISCSyncError(f"No sync method for type: {standard_type}")

        # 遍历所有版本
        for idx, ver in enumerate(versions, 1):
            self._check_cancelled()
            await self._report_progress(
                f"Syncing {standard_type.upper()} v{ver} ({idx}/{total_versions})",
                idx,
                total_versions,
            )
            try:
                remaining = total_versions - idx
                logger.info(f"")
                logger.info(f"{'─'*60}")
                logger.info(f"📦 Syncing {standard_type.upper()} v{ver} ({idx}/{total_versions})")
                logger.info(f"   Remaining versions: {remaining}")
                logger.info(f"{'─'*60}")

                result = await sync_method(session, ver)

                # 汇总结果
                aggregated_result["datasets_created"] += result.get("datasets_created", 0)
                aggregated_result["datasets_updated"] += result.get("datasets_updated", 0)
                aggregated_result["variables_created"] += result.get("variables_created", 0)
                aggregated_result["variables_updated"] += result.get("variables_updated", 0)
                aggregated_result["versions_synced"] += 1

                version_detail = {
                    "version": ver,
                    "datasets": result.get("datasets_created", 0) + result.get("datasets_updated", 0),
                    "variables": result.get("variables_created", 0) + result.get("variables_updated", 0),
                    "errors": len(result.get("errors", [])),
                }
                aggregated_result["version_details"].append(version_detail)

                logger.info(f"✅ Successfully synced {standard_type.upper()} v{ver}")
                logger.info(f"   Datasets: {version_detail['datasets']}, Variables: {version_detail['variables']}")

                # 节流 - 版本之间等待 2 秒，避免被服务器限流
                if idx < total_versions:
                    logger.info(f"⏳ Throttling: waiting 2s before next version...")
                    await asyncio.sleep(2)

            except Exception as e:
                logger.error(f"❌ Failed to sync {standard_type.upper()} v{ver}: {str(e)}")
                aggregated_result["errors"].append(f"Version {ver}: {str(e)}")
                continue

        logger.info(f"")
        logger.info(f"{'='*60}")
        logger.info(f"🎉 ALL VERSIONS sync completed for {standard_type.upper()}")
        logger.info(f"   Total versions synced: {aggregated_result['versions_synced']}/{total_versions}")
        logger.info(f"   Total datasets: {aggregated_result['datasets_created'] + aggregated_result['datasets_updated']}")
        logger.info(f"   Total variables: {aggregated_result['variables_created'] + aggregated_result['variables_updated']}")
        logger.info(f"{'='*60}")

        return aggregated_result

    # ============================================================
    # 基础 Upsert 方法
    # ============================================================

    def _format_version_display(self, version: str) -> str:
        """Format a version string for human display.

        Sentinel strings ('latest', 'all') are returned as-is.
        Date-based versions (YYYY-MM-DD, used by CT) are returned as-is.
        Numeric versions (e.g. '3-4') become 'v3.4'.
        """
        # Sentinel strings
        if version.lower() in ("latest", "all"):
            return version
        # Bare date
        if re.match(r'^\d{4}-\d{2}-\d{2}$', version):
            return version
        # CT package name with date suffix (e.g. sdtmct-2026-03-27)
        match = re.search(r'(\d{4}-\d{2}-\d{2})$', version)
        if match:
            return match.group(1)
        # Numeric version
        return f"v{version.replace('-', '.')}"

    async def _resolve_latest_version(self, standard_type: str) -> str:
        """Resolve the 'latest' sentinel to the actual newest version.

        Called from sync() when version='latest' is requested.
        Each standard type has different versioning semantics:
        - tig:  multiple independent products, use 'all' to sync everything
        - bc/qrs: no enumerable version list, pass 'latest' through as-is
        - ct:  date-stamped packages; extract dates, pick newest
        - others: CDISC API lists versions newest-first, take index 0
        """
        if standard_type in ("tig", "integrated"):
            return "all"

        if standard_type in ("bc", "qrs"):
            return "latest"

        if standard_type == "ct":
            packages = await self._get_ct_versions()
            dates: set[str] = set()
            for pkg in packages:
                match = re.search(r"(\d{4}-\d{2}-\d{2})$", pkg)
                if match:
                    dates.add(match.group(1))
            if not dates:
                logger.warning("CT: no dates found in package list, falling back to 'latest'")
                return "latest"
            return sorted(dates, reverse=True)[0]

        # sdtm, sdtmig, adam, adamig, cdashig, sendig, integrated
        versions = await self.get_available_versions(standard_type)
        if not versions:
            logger.warning(
                f"{standard_type.upper()}: no versions from CDISC API, falling back to 'latest'"
            )
            return "latest"
        return versions[0]

    async def _upsert_cdisc_scope_node(
        self,
        session: AsyncSession,
        standard_type: str,
        version: str,
        suffix: str = "",
    ) -> ScopeNode:
        """
        创建或获取 CDISC 标准的 ScopeNode

        Args:
            session: 数据库会话
            standard_type: 标准类型
            version: 版本
            suffix: 可选后缀（用于 QRS 等需要多个节点的场景）
        """
        code = f"CDISC-{standard_type.upper()}-{version}"
        if suffix:
            code = f"{code}-{suffix}"

        name = f"CDISC {standard_type.upper()} {self._format_version_display(version)}"
        if suffix:
            name = f"{name} - {suffix}"

        # 查询现有节点（包括已软删除的）
        query = select(ScopeNode).where(ScopeNode.code == code)
        result = await session.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            if existing.is_deleted:
                # 恢复已软删除的节点
                existing.is_deleted = False
                existing.deleted_at = None
                existing.deleted_by = None
                existing.updated_by = "cdisc_sync_restore"
                logger.info(f"Restored soft-deleted ScopeNode: {code}")
            # Always update name/description so re-sync corrects stale formatting
            existing.name = name
            existing.description = (
                f"CDISC 官方 {standard_type.upper()} 标准，版本 {self._format_version_display(version)}"
            )
            return existing

        # 创建新节点
        new_node = ScopeNode(
            code=code,
            name=name,
            description=f"CDISC 官方 {standard_type.upper()} 标准，版本 {self._format_version_display(version)}",
            node_type=NodeType.CDISC,
            lifecycle_status=LifecycleStatus.COMPLETED,
            parent_id=None,
            path=None,
            depth=0,
            sort_order=0,
            created_by="cdisc_sync",
        )
        session.add(new_node)
        await session.flush()

        # 更新 path
        new_node.path = f"/{new_node.id}/"

        return new_node

    async def _upsert_specification(
        self,
        session: AsyncSession,
        scope_node: ScopeNode,
        spec_type: SpecType,
        version: str,
        name_suffix: str = "",
    ) -> Specification:
        """
        创建或获取 Specification 文档
        """
        name = f"{scope_node.name} Specification"
        if name_suffix:
            name = f"{name} - {name_suffix}"

        # 查询现有 Spec
        query = select(Specification).where(
            Specification.scope_node_id == scope_node.id,
            Specification.name == name,
            Specification.is_deleted == False,
        )
        result = await session.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            return existing

        # 创建新 Spec
        new_spec = Specification(
            scope_node_id=scope_node.id,
            name=name,
            spec_type=spec_type,
            version=self._format_version_display(version).removeprefix("v"),
            status=SpecStatus.ACTIVE,
            description=f"CDISC {spec_type.value} {self._format_version_display(version)} 标准规范",
            standard_name=scope_node.name,
            standard_version=self._format_version_display(version).removeprefix("v"),
            created_by="cdisc_sync",
        )
        session.add(new_spec)
        await session.flush()

        return new_spec

    async def _upsert_target_dataset(
        self,
        session: AsyncSession,
        specification: Specification,
        dataset_name: str,
        description: str,
        class_type: DatasetClass,
        created: dict,
    ) -> TargetDataset:
        """Upsert TargetDataset"""
        # 查询现有 Dataset
        query = select(TargetDataset).where(
            TargetDataset.specification_id == specification.id,
            TargetDataset.dataset_name == dataset_name,
            TargetDataset.is_deleted == False,
        )
        result = await session.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            existing.description = description
            existing.class_type = class_type
            existing.updated_by = "cdisc_sync"
            created["datasets_updated"] += 1
            return existing

        # 创建
        new_dataset = TargetDataset(
            specification_id=specification.id,
            dataset_name=dataset_name,
            description=description,
            class_type=class_type,
            override_type=OverrideType.NONE,
            sort_order=0,
            standard_metadata={"source": "CDISC"},
            created_by="cdisc_sync",
        )
        session.add(new_dataset)
        await session.flush()
        created["datasets_created"] += 1

        return new_dataset

    async def _upsert_target_variable(
        self,
        session: AsyncSession,
        dataset: TargetDataset,
        var_name: str,
        var_label: str,
        description: str,
        data_type: DataType,
        length: int | None,
        core: VariableCore,
        sort_order: int,
        created: dict,
        standard_metadata: dict | None = None,
    ) -> TargetVariable:
        """Upsert TargetVariable"""
        if not var_name:
            raise ValueError("Variable name is required")

        # 查询现有 Variable
        query = select(TargetVariable).where(
            TargetVariable.dataset_id == dataset.id,
            TargetVariable.variable_name == var_name,
            TargetVariable.is_deleted == False,
        )
        result = await session.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            existing.variable_label = var_label
            existing.description = description
            existing.data_type = data_type
            existing.length = length
            existing.core = core
            existing.sort_order = sort_order
            existing.origin_type = OriginType.CDISC
            # 更新 standard_metadata（包含 var_set 等字段）
            if standard_metadata:
                existing.standard_metadata = standard_metadata
            existing.updated_by = "cdisc_sync"
            created["variables_updated"] += 1
            return existing

        # 创建
        new_var = TargetVariable(
            dataset_id=dataset.id,
            variable_name=var_name,
            variable_label=var_label,
            description=description,
            data_type=data_type,
            length=length,
            core=core,
            origin_type=OriginType.CDISC,
            override_type=OverrideType.NONE,
            sort_order=sort_order,
            standard_metadata=standard_metadata or {"source": "CDISC"},
            created_by="cdisc_sync",
        )
        session.add(new_var)
        await session.flush()
        created["variables_created"] += 1

        return new_var

    async def _upsert_codelist(
        self,
        session: AsyncSession,
        scope_node: ScopeNode,
        codelist_id: str,
        name: str,
        ncit_code: str | None,
        definition: str | None,
        created: dict,
    ) -> Codelist:
        """Upsert Codelist（支持恢复已软删除的记录）"""
        # 查询现有 Codelist（包括已软删除的）
        query = select(Codelist).where(
            Codelist.scope_node_id == scope_node.id,
            Codelist.codelist_id == codelist_id,
        )
        result = await session.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            if existing.is_deleted:
                # 恢复已软删除的 Codelist
                existing.is_deleted = False
                existing.deleted_at = None
                existing.deleted_by = None
                created["codelists_created"] += 1
            else:
                created["codelists_updated"] += 1
            existing.name = name
            existing.ncit_code = ncit_code
            existing.definition = definition
            existing.updated_by = "cdisc_sync"
            return existing

        # 创建
        new_codelist = Codelist(
            scope_node_id=scope_node.id,
            codelist_id=codelist_id,
            name=name,
            ncit_code=ncit_code,
            definition=definition,
            created_by="cdisc_sync",
        )
        session.add(new_codelist)
        await session.flush()
        created["codelists_created"] += 1

        return new_codelist

    async def _upsert_codelist_term(
        self,
        session: AsyncSession,
        codelist: Codelist,
        term_value: str,
        ncit_code: str | None,
        name: str | None,
        definition: str | None,
        sort_order: int,
        created: dict,
    ) -> CodelistTerm:
        """Upsert CodelistTerm（支持恢复已软删除的记录）"""
        # 查询现有 Term（包括已软删除的）
        query = select(CodelistTerm).where(
            CodelistTerm.codelist_id == codelist.id,
            CodelistTerm.term_value == term_value,
        )
        result = await session.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            if existing.is_deleted:
                # 恢复已软删除的 Term
                existing.is_deleted = False
                existing.deleted_at = None
                existing.deleted_by = None
                created["terms_created"] += 1
            else:
                created["terms_updated"] += 1
            existing.ncit_code = ncit_code
            existing.name = name
            existing.definition = definition
            existing.sort_order = sort_order
            existing.updated_by = "cdisc_sync"
            return existing

        # 创建
        new_term = CodelistTerm(
            codelist_id=codelist.id,
            term_value=term_value,
            ncit_code=ncit_code,
            name=name,
            definition=definition,
            sort_order=sort_order,
            created_by="cdisc_sync",
        )
        session.add(new_term)
        await session.flush()
        created["terms_created"] += 1

        return new_term

    async def _upsert_biomedical_concept(
        self,
        session: AsyncSession,
        scope_node: ScopeNode,
        concept_id: str,
        ncit_code: str | None,
        short_name: str,
        definition: str | None,
        synonyms: dict | None,
        created: dict,
    ) -> BiomedicalConcept:
        """Upsert BiomedicalConcept"""
        # 查询现有 BC
        query = select(BiomedicalConcept).where(
            BiomedicalConcept.scope_node_id == scope_node.id,
            BiomedicalConcept.concept_id == concept_id,
            BiomedicalConcept.is_deleted == False,
        )
        result = await session.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            existing.ncit_code = ncit_code
            existing.short_name = short_name
            existing.definition = definition
            existing.synonyms = synonyms
            existing.updated_by = "cdisc_sync"
            created["bc_updated"] += 1
            return existing

        # 创建
        new_bc = BiomedicalConcept(
            scope_node_id=scope_node.id,
            concept_id=concept_id,
            ncit_code=ncit_code,
            short_name=short_name,
            definition=definition,
            synonyms=synonyms,
            created_by="cdisc_sync",
        )
        session.add(new_bc)
        await session.flush()
        created["bc_created"] += 1

        return new_bc

    # ============================================================
    # Model 类型同步 (SDTM, ADaM)
    # ============================================================

    async def _sync_sdtm_model(
        self, session: AsyncSession, version: str
    ) -> dict[str, Any]:
        """
        同步 SDTM Foundational Model

        端点: /mdr/sdtm/{version}
        解析重点: Observation Classes 和 Class Variables

        SDTM Model 包含:
        - Classes (如 Findings, Events, Interventions 等)
        - 每个 Class 有 classVariables (如 --TESTCD, --ORRES 等)
        """
        result = self._init_result("SDTM Model", version)

        try:
            # 创建 ScopeNode
            scope_node = await self._upsert_cdisc_scope_node(
                session, "sdtm", version
            )

            # 创建 Specification
            specification = await self._upsert_specification(
                session, scope_node, SpecType.SDTM, version
            )

            # 获取 SDTM Model Classes
            endpoint = f"/mdr/sdtm/{version}/classes"
            data = await self._fetch_json(endpoint)

            if not data:
                result["errors"].append("Failed to fetch SDTM model data")
                return result

            # 从 _links.classes 获取
            links = data.get("_links", {})
            class_links = links.get("classes", [])
            total_classes = len(class_links)

            for class_idx, class_link in enumerate(class_links, 1):
                self._check_cancelled()
                await self._report_progress(
                    f"SDTM Model: class {class_idx}/{total_classes}",
                    class_idx,
                    total_classes,
                )
                try:
                    class_href = class_link.get("href", "")
                    class_title = class_link.get("title", "")

                    # 获取 class 详情
                    class_data = await self._fetch_json(class_href) if class_href else None

                    class_name = class_data.get("name", class_title) if class_data else class_title
                    class_label = class_data.get("label", class_name) if class_data else class_title

                    # 映射 Class 到 DatasetClass
                    class_type = self._map_class_to_dataset_class(class_name)
                    if class_type is None:
                        logger.warning(f"  Skipping unknown class: {class_name}")
                        continue

                    # Upsert Dataset for each class (Model 中的 Class 映射为 Dataset)
                    dataset = await self._upsert_target_dataset(
                        session=session,
                        specification=specification,
                        dataset_name=class_name[:32] if len(class_name) > 32 else class_name,  # 限制长度
                        description=class_label,
                        class_type=class_type,
                        created=result,
                    )

                    # 处理 classVariables - 这是 SDTM Model 的核心变量定义
                    if class_data and dataset:
                        class_variables = class_data.get("classVariables", [])
                        logger.info(f"  Class {class_name}: {len(class_variables)} classVariables")

                        for var_info in class_variables:
                            try:
                                var_name = var_info.get("name", "")
                                if not var_name:
                                    continue

                                await self._upsert_target_variable(
                                    session=session,
                                    dataset=dataset,
                                    var_name=var_name,  # 如 --TESTCD, --ORRES
                                    var_label=var_info.get("label", ""),
                                    description=var_info.get("definition", ""),
                                    data_type=self._map_data_type(
                                        var_info.get("simpleDatatype", "Char")
                                    ),
                                    length=None,
                                    core=self._map_core(var_info.get("core", "Perm")),
                                    sort_order=int(var_info.get("ordinal", 0)),
                                    created=result,
                                    standard_metadata={
                                        "source": "CDISC SDTM Model",
                                        "role": var_info.get("role", ""),
                                        "var_info": var_info,
                                    },
                                )
                            except Exception as e:
                                result["errors"].append(
                                    f"ClassVariable error in {class_name}.{var_name}: {str(e)}"
                                )

                        # 处理 datasets - SpecialPurpose, TrialDesign 等类的具体数据集
                        # 这些类没有 classVariables，但有 datasets 数组
                        class_datasets = class_data.get("datasets", [])
                        if class_datasets:
                            logger.info(f"  Class {class_name}: {len(class_datasets)} datasets")

                            for ds_info in class_datasets:
                                try:
                                    ds_name = ds_info.get("name", "")
                                    if not ds_name:
                                        continue

                                    # 为每个 dataset 创建 TargetDataset
                                    # 使用父级 class 的 class_type (已验证不为 None)
                                    ds_dataset = await self._upsert_target_dataset(
                                        session=session,
                                        specification=specification,
                                        dataset_name=ds_name,
                                        description=ds_info.get("label", ds_name),
                                        class_type=class_type,  # 使用已验证的 class_type
                                        created=result,
                                    )

                                    # 处理 datasetVariables
                                    ds_variables = ds_info.get("datasetVariables", [])
                                    for var_info in ds_variables:
                                        try:
                                            var_name = var_info.get("name", "")
                                            if not var_name:
                                                continue

                                            await self._upsert_target_variable(
                                                session=session,
                                                dataset=ds_dataset,
                                                var_name=var_name,
                                                var_label=var_info.get("label", ""),
                                                description=var_info.get("definition", ""),
                                                data_type=self._map_data_type(
                                                    var_info.get("simpleDatatype", "Char")
                                                ),
                                                length=None,
                                                core=self._map_core(var_info.get("core", "Perm")),
                                                sort_order=int(var_info.get("ordinal", 0)),
                                                created=result,
                                                standard_metadata={
                                                    "source": "CDISC SDTM Model",
                                                    "role": var_info.get("role", ""),
                                                    "var_info": var_info,
                                                },
                                            )
                                        except Exception as e:
                                            result["errors"].append(
                                                f"DatasetVariable error in {ds_name}.{var_name}: {str(e)}"
                                            )

                                except Exception as e:
                                    result["errors"].append(
                                        f"Dataset error in {class_name}.{ds_name}: {str(e)}"
                                    )

                    # 节流
                    await asyncio.sleep(0.3)

                except Exception as e:
                    result["errors"].append(f"Class error: {str(e)}")

            await session.commit()

        except Exception as e:
            await session.rollback()
            result["errors"].append(f"Sync failed: {str(e)}")
            raise CDISCSyncError(f"SDTM Model sync failed: {str(e)}")

        finally:
            await self.close()

        return result

    async def _sync_adam_model(
        self, session: AsyncSession, version: str
    ) -> dict[str, Any]:
        """
        同步 ADaM Foundational Model

        端点: /mdr/adam/{version}
        版本格式: adam-2-1 (已包含前缀)

        注意: ADaM 基础模型通常不包含 dataStructures
        真正的数据结构和变量在 ADaMIG (adamig-*) 中
        """
        result = self._init_result("ADaM", version)

        try:
            scope_node = await self._upsert_cdisc_scope_node(
                session, "adam", version
            )

            specification = await self._upsert_specification(
                session, scope_node, SpecType.ADAM, version
            )

            # ADaM 基础模型端点: /mdr/adam/adam-2-1
            endpoint = f"/mdr/adam/{version}"
            data = await self._fetch_json(endpoint)

            if not data:
                result["errors"].append("Failed to fetch ADaM model data")
                await self.close()
                return result

            # 检查是否有 dataStructures（通常基础模型没有）
            data_structures = data.get("dataStructures", [])
            logger.info(f"ADaM {version}: found {len(data_structures)} dataStructures")

            # 如果有 dataStructures，处理它们
            for ds_idx, ds_info in enumerate(data_structures):
                self._check_cancelled()
                await self._report_progress(
                    f"ADaM: datastructure {ds_idx + 1}/{total_ds}",
                    ds_idx + 1,
                    total_ds,
                )
                try:
                    await self._process_adam_datastructure(
                        session=session,
                        specification=specification,
                        ds_info=ds_info,
                        result=result,
                    )
                    await asyncio.sleep(0.5)
                except Exception as e:
                    logger.warning(f"ADaM datastructure error: {str(e)}")
                    result["errors"].append(f"Datastructure error: {str(e)}")

            await session.commit()

        except Exception as e:
            await session.rollback()
            result["errors"].append(f"Sync failed: {str(e)}")
            raise CDISCSyncError(f"ADaM Model sync failed: {str(e)}")

        finally:
            await self.close()

        return result

    async def _process_adam_datastructure(
        self,
        session: AsyncSession,
        specification: Specification,
        ds_info: dict,
        result: dict,
    ) -> None:
        """
        处理单个 ADaM DataStructure

        Args:
            session: 数据库会话
            specification: 规范文档
            ds_info: DataStructure 信息
            result: 结果统计
        """
        # 提取 DataStructure 名称和描述
        ds_links = ds_info.get("_links", {})
        self_link = ds_links.get("self", {})
        ds_name = self_link.get("href", "").split("/")[-1]
        ds_label = self_link.get("title", ds_name)

        if not ds_name:
            logger.warning("ADaM datastructure has no name, skipping")
            return

        logger.info(f"  Processing ADaM DataStructure: {ds_name}")

        # 创建 TargetDataset
        dataset = await self._upsert_target_dataset(
            session=session,
            specification=specification,
            dataset_name=ds_name,
            description=ds_label,
            class_type=DatasetClass.FINDINGS,  # ADaM 默认
            created=result,
        )

        # 解析 analysisVariableSets -> analysisVariables
        var_sets = ds_info.get("analysisVariableSets", [])
        var_count = 0

        for var_set in var_sets:
            variables = var_set.get("analysisVariables", [])

            for var_info in variables:
                try:
                    var_name = var_info.get("name", "")
                    if not var_name:
                        continue

                    await self._upsert_target_variable(
                        session=session,
                        dataset=dataset,
                        var_name=var_name,
                        var_label=var_info.get("label", ""),
                        description=var_info.get("description", ""),
                        data_type=self._map_data_type(
                            var_info.get("simpleDatatype", "Char")
                        ),
                        length=None,
                        core=self._map_core(var_info.get("core", "Perm")),
                        sort_order=int(var_info.get("ordinal", 0)),
                        created=result,
                        standard_metadata={
                            "source": "CDISC ADaM",
                            "var_set": var_set.get("_links", {}).get("self", {}).get("title", ""),
                        },
                    )
                    var_count += 1

                except Exception as e:
                    logger.warning(f"ADaM variable error in {ds_name}: {str(e)}")

        logger.info(f"    Synced {var_count} variables for {ds_name}")

    # ============================================================
    # IG 类型同步
    # ============================================================

    async def _sync_sdtmig(
        self, session: AsyncSession, version: str
    ) -> dict[str, Any]:
        """
        同步 SDTMIG

        CDISC API 结构:
        - /mdr/sdtmig/{version}/classes 返回 _links.classes
        - 每个 class 的详细信息包含 datasets 和 datasetVariables
        """
        result = self._init_result("SDTMIG", version)

        try:
            scope_node = await self._upsert_cdisc_scope_node(
                session, "sdtmig", version
            )

            specification = await self._upsert_specification(
                session, scope_node, SpecType.SDTM, version
            )

            # 获取 Classes (已包含 datasets 和 datasetVariables)
            classes = await self._fetch_sdtmig_classes(version)
            total_classes = len(classes)

            for class_idx, class_info in enumerate(classes, 1):
                self._check_cancelled()
                await self._report_progress(
                    f"SDTMIG: class {class_idx}/{total_classes}",
                    class_idx,
                    total_classes,
                )
                class_name = class_info.get("name", "")
                class_type = self._map_class_to_dataset_class(class_name)

                # 跳过未知的 class
                if class_type is None:
                    logger.warning(f"  SDTMIG: Skipping unknown class: {class_name}")
                    continue

                # datasets 直接在 class_info 中
                datasets = class_info.get("datasets", [])

                for domain_info in datasets:
                    try:
                        domain_name = domain_info.get("name", "")
                        if not domain_name:
                            continue

                        # Upsert TargetDataset
                        dataset = await self._upsert_target_dataset(
                            session=session,
                            specification=specification,
                            dataset_name=domain_name,
                            description=domain_info.get("label", ""),
                            class_type=class_type,
                            created=result,
                        )

                        # datasetVariables 直接在 domain_info 中
                        variables = domain_info.get("datasetVariables", [])

                        for var_info in variables:
                            try:
                                var_name = var_info.get("name", "")
                                if not var_name:
                                    continue

                                await self._upsert_target_variable(
                                    session=session,
                                    dataset=dataset,
                                    var_name=var_name,
                                    var_label=var_info.get("label", ""),
                                    description=var_info.get("description", ""),
                                    data_type=self._map_data_type(
                                        var_info.get("simpleDatatype", "Char")
                                    ),
                                    length=None,
                                    core=self._map_core(var_info.get("core", "Perm")),
                                    sort_order=int(var_info.get("ordinal", 0)),
                                    created=result,
                                    standard_metadata={
                                        "source": "CDISC",
                                        "var_info": var_info,
                                    },
                                )
                            except Exception as e:
                                result["errors"].append(
                                    f"Variable error in {domain_name}: {str(e)}"
                                )

                    except Exception as e:
                        result["errors"].append(f"Domain error: {str(e)}")

            await session.commit()

        except Exception as e:
            await session.rollback()
            result["errors"].append(f"Sync failed: {str(e)}")
            raise CDISCSyncError(f"SDTMIG sync failed: {str(e)}")

        finally:
            await self.close()

        return result

    async def _sync_adamig(
        self, session: AsyncSession, version: str
    ) -> dict[str, Any]:
        """
        同步 ADaMIG

        端点: /mdr/adam/adamig-{version}
        版本格式: 1-3 (需要添加 adamig- 前缀)

        结构: dataStructures -> analysisVariableSets -> analysisVariables

        层级映射:
        - DataStructure -> TargetDataset (如 ADSL, BDS)
        - AnalysisVariable -> TargetVariable
        """
        result = self._init_result("ADaMIG", version)

        try:
            scope_node = await self._upsert_cdisc_scope_node(
                session, "adamig", version
            )

            specification = await self._upsert_specification(
                session, scope_node, SpecType.ADAM, version
            )

            # ADaMIG 端点格式: /mdr/adam/adamig-1-3
            # version 参数是 "1-3"，需要添加 "adamig-" 前缀
            adamig_version = f"adamig-{version}" if not version.startswith("adamig") else version
            endpoint = f"/mdr/adam/{adamig_version}"
            data = await self._fetch_json(endpoint)

            if not data:
                result["errors"].append("Failed to fetch ADaMIG data")
                await self.close()
                return result

            # 解析 dataStructures
            data_structures = data.get("dataStructures", [])
            logger.info(f"ADaMIG {version}: found {len(data_structures)} dataStructures")

            for idx, ds_info in enumerate(data_structures):
                self._check_cancelled()
                await self._report_progress(
                    f"ADaMIG: datastructure {idx + 1}/{total_ds}",
                    idx + 1,
                    total_ds,
                )
                try:
                    await self._process_adam_datastructure(
                        session=session,
                        specification=specification,
                        ds_info=ds_info,
                        result=result,
                    )
                    # 节流 - 每个 DataStructure 之间等待
                    if idx < len(data_structures) - 1:
                        await asyncio.sleep(0.5)

                except Exception as e:
                    result["errors"].append(f"ADaMIG data structure error: {str(e)}")

            await session.commit()

        except Exception as e:
            await session.rollback()
            result["errors"].append(f"Sync failed: {str(e)}")
            raise CDISCSyncError(f"ADaMIG sync failed: {str(e)}")

        finally:
            await self.close()

        return result

    async def _sync_cdashig(
        self, session: AsyncSession, version: str
    ) -> dict[str, Any]:
        """
        同步 CDASHIG

        端点: /mdr/cdashig/{version}
        版本格式: 2-3 (直接使用版本号)
        数据结构: classes 数组直接在根响应中，每个 class 下有 domains 数组
        变量需要单独请求每个 domain 获取 fields
        """
        result = self._init_result("CDASHIG", version)

        try:
            scope_node = await self._upsert_cdisc_scope_node(
                session, "cdashig", version
            )

            specification = await self._upsert_specification(
                session, scope_node, SpecType.SDTM, version
            )

            # CDASHIG 端点格式: /mdr/cdashig/2-3
            # 响应中直接包含 classes 数组
            endpoint = f"/mdr/cdashig/{version}"
            data = await self._fetch_json(endpoint)

            if not data:
                result["errors"].append("Failed to fetch CDASHIG data")
                await self.close()
                return result

            # CDASHIG 的 classes 直接在根响应中
            classes = data.get("classes", [])
            logger.info(f"CDASHIG {version}: found {len(classes)} classes")

            total_datasets = 0
            total_variables = 0

            for class_idx, class_info in enumerate(classes, 1):
                self._check_cancelled()
                await self._report_progress(
                    f"CDASHIG: class {class_idx}/{total_classes}",
                    class_idx,
                    total_classes,
                )
                class_name = class_info.get("name", "")
                class_type = self._map_class_to_dataset_class(class_name)

                # 跳过未知的 class
                if class_type is None:
                    logger.warning(f"  CDASHIG: Skipping unknown class: {class_name}")
                    continue

                # domains 在 class_info 中
                domains = class_info.get("domains", [])

                for domain_info in domains:
                    try:
                        domain_name = domain_info.get("name", "")
                        if not domain_name:
                            continue

                        # Upsert TargetDataset
                        dataset = await self._upsert_target_dataset(
                            session=session,
                            specification=specification,
                            dataset_name=domain_name,
                            description=domain_info.get("label", ""),
                            class_type=class_type,
                            created=result,
                        )
                        total_datasets += 1

                        # 获取 fields (variables)
                        # CDASHIG v2.2+ 直接在 domain_info 中返回 fields，优先使用
                        fields = domain_info.get("fields", [])

                        # 如果 domain_info 中没有 fields，尝试通过 href 请求详情
                        if not fields:
                            domain_href = domain_info.get("_links", {}).get("self", {}).get("href", "")
                            if domain_href:
                                domain_data = await self._fetch_json(domain_href)
                                if domain_data:
                                    fields = domain_data.get("fields", [])

                        for field_info in fields:
                            try:
                                field_name = field_info.get("name", "")
                                if not field_name:
                                    continue

                                await self._upsert_target_variable(
                                    session=session,
                                    dataset=dataset,
                                    var_name=field_name,
                                    var_label=field_info.get("label", ""),
                                    description=field_info.get("definition", "") or field_info.get("questionText", ""),
                                    data_type=self._map_data_type(
                                        field_info.get("simpleDatatype", "Char")
                                    ),
                                    length=None,
                                    core=self._map_core(field_info.get("core", "Perm")),
                                    sort_order=int(field_info.get("ordinal", 0)),
                                    created=result,
                                    standard_metadata={
                                        "source": "CDISC",
                                        "var_info": field_info,
                                    },
                                )
                                total_variables += 1
                            except Exception as e:
                                result["errors"].append(
                                    f"Field error in {domain_name}.{field_name}: {str(e)}"
                                )

                    except Exception as e:
                        result["errors"].append(f"CDASHIG domain error: {str(e)}")

            logger.info(f"CDASHIG {version}: processed {total_datasets} domains, {total_variables} fields")
            await session.commit()

        except Exception as e:
            await session.rollback()
            result["errors"].append(f"Sync failed: {str(e)}")
            raise CDISCSyncError(f"CDASHIG sync failed: {str(e)}")

        finally:
            await self.close()

        return result

    async def _sync_sendig(
        self, session: AsyncSession, version: str
    ) -> dict[str, Any]:
        """
        同步 SENDIG

        端点: /mdr/sendig/{version}
        版本格式: 3-0 (直接使用版本号)
        数据结构: 根响应包含 classes，需要逐个获取 class 详情来得到 datasets 和 datasetVariables
        """
        result = self._init_result("SENDIG", version)

        try:
            scope_node = await self._upsert_cdisc_scope_node(
                session, "sendig", version
            )

            specification = await self._upsert_specification(
                session, scope_node, SpecType.SDTM, version
            )

            # SENDIG 端点格式: /mdr/sendig/3-0
            # 根响应中包含 classes 数组，但 datasets 需要从 class 详情获取
            endpoint = f"/mdr/sendig/{version}"
            data = await self._fetch_json(endpoint)

            if not data:
                result["errors"].append("Failed to fetch SENDIG data")
                await self.close()
                return result

            # SENDIG 的 classes 直接在根响应中，但不包含 datasets
            classes = data.get("classes", [])
            logger.info(f"SENDIG {version}: found {len(classes)} classes")

            total_datasets = 0
            total_variables = 0

            for class_idx, class_info in enumerate(classes, 1):
                self._check_cancelled()
                await self._report_progress(
                    f"SENDIG: class {class_idx}/{total_classes}",
                    class_idx,
                    total_classes,
                )
                class_name = class_info.get("name", "")
                class_type = self._map_class_to_dataset_class(class_name)

                # 跳过未知的 class
                if class_type is None:
                    logger.warning(f"  SENDIG: Skipping unknown class: {class_name}")
                    continue

                # 根响应中的 class_info 不包含 datasets，需要获取详情
                class_href = class_info.get("_links", {}).get("self", {}).get("href", "")
                if not class_href:
                    logger.warning(f"  SENDIG: No self link for class: {class_name}")
                    continue

                class_data = await self._fetch_json(class_href)
                if not class_data:
                    logger.warning(f"  SENDIG: Failed to fetch class detail: {class_name}")
                    continue

                datasets = class_data.get("datasets", [])
                logger.info(f"  SENDIG class {class_name}: {len(datasets)} datasets")

                for dataset_info in datasets:
                    try:
                        dataset_name = dataset_info.get("name", "")
                        if not dataset_name:
                            continue

                        # Upsert TargetDataset
                        dataset = await self._upsert_target_dataset(
                            session=session,
                            specification=specification,
                            dataset_name=dataset_name,
                            description=dataset_info.get("label", ""),
                            class_type=class_type,
                            created=result,
                        )
                        total_datasets += 1

                        # Sync datasetVariables
                        variables = dataset_info.get("datasetVariables", [])
                        for var_info in variables:
                            try:
                                var_name = var_info.get("name", "")
                                if not var_name:
                                    continue

                                await self._upsert_target_variable(
                                    session=session,
                                    dataset=dataset,
                                    var_name=var_name,
                                    var_label=var_info.get("label", ""),
                                    description=var_info.get("description", ""),
                                    data_type=self._map_data_type(
                                        var_info.get("simpleDatatype", "Char")
                                    ),
                                    length=None,
                                    core=self._map_core(var_info.get("core", "Perm")),
                                    sort_order=int(var_info.get("ordinal", 0)),
                                    created=result,
                                    standard_metadata={
                                        "source": "CDISC",
                                        "var_info": var_info,
                                    },
                                )
                                total_variables += 1
                            except Exception as e:
                                result["errors"].append(
                                    f"Variable error in {dataset_name}.{var_name}: {str(e)}"
                                )

                    except Exception as e:
                        result["errors"].append(f"SENDIG dataset error: {str(e)}")

            logger.info(f"SENDIG {version}: processed {total_datasets} datasets, {total_variables} variables")
            await session.commit()

        except Exception as e:
            await session.rollback()
            result["errors"].append(f"Sync failed: {str(e)}")
            raise CDISCSyncError(f"SENDIG sync failed: {str(e)}")

        finally:
            await self.close()

        return result

    async def _fetch_sendig_classes(self, version: str) -> list[dict]:
        """
        获取 SENDIG Classes

        CDISC API: /mdr/sendig/{version}/classes
        返回格式: {"_links": {"classes": [{"href": "...", "title": "..."}]}}
        """
        endpoint = f"/mdr/sendig/{version}/classes"
        data = await self._fetch_json(endpoint)

        if not data:
            return []

        # CDISC API 返回 _links.classes 格式
        classes = []
        links = data.get("_links", {})
        class_links = links.get("classes", [])

        for class_link in class_links:
            # 获取每个 class 的详细信息
            class_href = class_link.get("href", "")
            if class_href:
                class_data = await self._fetch_json(class_href)
                if class_data:
                    classes.append(class_data)

        return classes

    async def _fetch_cdashig_classes(self, version: str) -> list[dict]:
        """
        获取 CDASHIG Classes

        CDISC API: /mdr/cdashig/{version}/classes
        返回格式: {"_links": {"classes": [{"href": "...", "title": "..."}]}}
        """
        endpoint = f"/mdr/cdashig/{version}/classes"
        data = await self._fetch_json(endpoint)

        if not data:
            return []

        # CDISC API 返回 _links.classes 格式
        classes = []
        links = data.get("_links", {})
        class_links = links.get("classes", [])

        for class_link in class_links:
            # 获取每个 class 的详细信息
            class_href = class_link.get("href", "")
            if class_href:
                class_data = await self._fetch_json(class_href)
                if class_data:
                    classes.append(class_data)

        return classes

    # ============================================================
    # QRS 同步 (Questionnaires, Ratings, and Scales)
    # ============================================================

    async def _sync_qrs(self, session: AsyncSession, version: str) -> dict[str, Any]:
        """
        同步 QRS (Questionnaires, Ratings, and Scales) 量表库

        关键发现: QRS 根节点访问必须带有 /root/ 前缀！
        正确路径: GET /mdr/root/qrs/instruments/{instrument_name}

        同步链路:
        Step 1: 尝试多个端点获取量表清单
        Step 2: GET /mdr/root/qrs/instruments/{name} - 获取版本号
        Step 3: GET {version_href}/items - 获取题目详情并落库

        层级映射:
        - Instrument -> Specification (如 PHQ-9, AIMS01)
        - Instrument -> TargetDataset (class_type = QRS)
        - Item -> TargetVariable (题目/评分项)
        """
        result = self._init_result("QRS", version)
        result["instruments_created"] = 0
        result["instruments_updated"] = 0
        result["items_created"] = 0
        result["items_updated"] = 0
        result["errors"] = []

        instruments = []

        # 已知的 QRS 量表列表 (作为最终备用方案)
        KNOWN_QRS_INSTRUMENTS = [
            "AIMS01",  # Abnormal Involuntary Movement Scale
            "APCH1",   # Acute Physiology and Chronic Health Evaluation II
            "ATLAS1",  # Age, treatment with systemic antibiotics...
            "CGI02",   # Clinical Global Impression
            "HAMA1",   # Hamilton Anxiety Rating Scale
            "KFSS1",   # Kurtzke Functional Systems Scores
            "KPSS",    # Karnofsky Performance Scale
            "PGI01",   # Patient Global Impression
            "SIXMW1",  # 6 Minute Walk Test
        ]

        try:
            # ============================================================
            # Step 1: 获取量表总清单 - 尝试多个端点
            # ============================================================
            logger.info("QRS Step 1: Fetching instruments list...")

            # 尝试路径 1: /mdr/products/QrsInstrument (推荐)
            qrs_products = await self._fetch_json("/mdr/products/QrsInstrument")
            if qrs_products:
                instruments_links = qrs_products.get("_links", {}).get("instruments", [])
                for link in instruments_links:
                    href = link.get("href", "")
                    if href:
                        # href 格式: /mdr/qrs/instruments/AIMS01/versions/2-0
                        parts = href.rstrip("/").split("/")
                        for i, part in enumerate(parts):
                            if part == "instruments" and i + 1 < len(parts):
                                name = parts[i + 1]
                                if name and name not in instruments:
                                    instruments.append(name)
                                break
                if instruments:
                    logger.info(f"Found {len(instruments)} instruments from /mdr/products/QrsInstrument")

            # 尝试路径 2: /mdr/root/qrs/instruments
            if not instruments:
                list_data = await self._fetch_json("/mdr/root/qrs/instruments")
                if list_data:
                    instruments_links = list_data.get("_links", {}).get("instruments", [])
                    for link in instruments_links:
                        href = link.get("href", "")
                        if href:
                            parts = href.rstrip("/").split("/")
                            instrument_name = parts[-1] if parts else ""
                            if instrument_name:
                                instruments.append(instrument_name)
                    if instruments:
                        logger.info(f"Found {len(instruments)} instruments from /mdr/root/qrs/instruments")

            # 尝试路径 3: /mdr/products -> qrs section
            if not instruments:
                logger.info("QRS Step 1: Trying /mdr/products...")
                products_data = await self._fetch_json("/mdr/products")
                if products_data:
                    qrs_section = products_data.get("_links", {}).get("qrs", {})
                    if isinstance(qrs_section, dict):
                        instruments_links = qrs_section.get("_links", {}).get("instruments", [])
                        for link in instruments_links:
                            href = link.get("href", "")
                            if href:
                                parts = href.rstrip("/").split("/")
                                for i, part in enumerate(parts):
                                    if part == "instruments" and i + 1 < len(parts):
                                        name = parts[i + 1]
                                        if name and name not in instruments:
                                            instruments.append(name)
                                        break

            # 最终备用方案：使用已知量表列表
            if not instruments:
                logger.info("QRS Step 1: Using known instruments list as fallback")
                instruments = KNOWN_QRS_INSTRUMENTS.copy()

            logger.info(f"QRS: Found {len(instruments)} instruments to process")

            # 同步所有量表（移除测试限制）
            instruments_to_sync = instruments
            logger.info(f"QRS: Syncing {len(instruments_to_sync)} instruments")

            # ============================================================
            # Step 2 & 3: 遍历量表，获取版本和题目
            # ============================================================
            total_instruments = len(instruments_to_sync)
            for instr_idx, instrument_name in enumerate(instruments_to_sync, 1):
                self._check_cancelled()
                await self._report_progress(
                    f"QRS: instrument {instr_idx}/{total_instruments} ({instrument_name})",
                    instr_idx,
                    total_instruments,
                )
                try:
                    logger.info(f"QRS Step 2: Fetching root node for {instrument_name}...")

                    # Step 2: 访问根节点获取版本号
                    root_endpoint = f"/mdr/root/qrs/instruments/{instrument_name}"
                    root_data = await self._fetch_json(root_endpoint)

                    if not root_data:
                        result["errors"].append(f"Instrument {instrument_name}: root node not found")
                        continue

                    # 提取最新版本路径
                    versions = root_data.get("_links", {}).get("versions", [])
                    if not versions:
                        result["errors"].append(f"Instrument {instrument_name}: no versions found")
                        continue

                    version_href = versions[0].get("href", "")
                    if not version_href:
                        result["errors"].append(f"Instrument {instrument_name}: version href not found")
                        continue

                    logger.info(f"QRS {instrument_name}: version href = {version_href}")

                    # Step 3: 获取题目详情
                    items_endpoint = f"{version_href}/items"
                    logger.info(f"QRS Step 3: Fetching items from {items_endpoint}...")

                    items_data = await self._fetch_json(items_endpoint)

                    if not items_data:
                        result["errors"].append(f"Instrument {instrument_name}: items not found")
                        continue

                    # 创建 ScopeNode 和 Specification
                    scope_node = await self._upsert_cdisc_scope_node(
                        session, "qrs", version, suffix=instrument_name
                    )

                    specification = await self._upsert_specification(
                        session=session,
                        scope_node=scope_node,
                        spec_type=SpecType.QRS,
                        version=version_href.split("/")[-1] or version,
                        name_suffix=instrument_name,
                    )

                    # 获取量表描述
                    instrument_title = root_data.get("title", instrument_name)
                    instrument_description = root_data.get("description", "")

                    # 创建 TargetDataset (量表 = Dataset)
                    dataset = await self._upsert_target_dataset(
                        session=session,
                        specification=specification,
                        dataset_name=instrument_name,
                        description=f"{instrument_title}: {instrument_description}" if instrument_description else instrument_title,
                        class_type=DatasetClass.QRS,
                        created=result,
                    )

                    # 解析题目列表
                    items_links = items_data.get("_links", {}).get("items", [])
                    if not items_links:
                        # 尝试直接从 items_data 获取
                        items_links = items_data.get("items", [])

                    logger.info(f"QRS {instrument_name}: found {len(items_links)} item links")

                    item_count = 0
                    for idx, item_link in enumerate(items_links):
                        try:
                            # 获取 Item 详情
                            item_href = item_link.get("href", "") if isinstance(item_link, dict) else ""
                            if item_href:
                                item_detail = await self._fetch_json(item_href)
                            else:
                                item_detail = item_link

                            if not item_detail:
                                logger.warning(f"QRS {instrument_name} item {idx}: no detail data")
                                continue

                            # 提取 Item 字段 - 多种可能的字段名
                            # QRS API 使用 itemCode 作为标识符
                            item_id = (
                                item_detail.get("itemCode") or
                                item_detail.get("itemId") or
                                item_detail.get("id") or
                                item_detail.get("conceptId") or
                                item_detail.get("shortName") or
                                ""
                            )

                            # itemCode 即为变量名
                            item_name = item_id

                            item_label = (
                                item_detail.get("label") or
                                item_detail.get("questionText") or
                                item_detail.get("title") or
                                ""
                            )

                            question_text = (
                                item_detail.get("questionText") or
                                item_detail.get("question") or
                                item_detail.get("description") or
                                item_label
                            )

                            if not item_name:
                                logger.warning(f"QRS {instrument_name} item {idx}: no name found, keys={list(item_detail.keys())[:5]}")
                                continue

                            # 确定 Core 类型
                            core_str = (item_detail.get("core") or "Perm").upper()
                            core = VariableCore.PERM
                            if core_str == "REQ" or core_str == "REQUIRED":
                                core = VariableCore.REQ
                            elif core_str == "EXP" or core_str == "EXPECTED":
                                core = VariableCore.EXP

                            # 确定数据类型
                            data_type_str = (item_detail.get("dataType") or "text").lower()
                            data_type = DataType.CHAR
                            if data_type_str in ("integer", "number", "numeric", "float", "num"):
                                data_type = DataType.NUM
                            elif data_type_str in ("date", "datetime"):
                                data_type = DataType.DATE

                            # 提取关联的术语代码
                            term_codes = item_detail.get("response", {}).get("codeList", [])
                            standard_metadata = {}
                            if term_codes:
                                standard_metadata["term_codes"] = term_codes

                            # 创建 TargetVariable
                            await self._upsert_target_variable(
                                session=session,
                                dataset=dataset,
                                var_name=item_name,
                                var_label=item_label[:200] if item_label else item_name,
                                description=question_text,
                                data_type=data_type,
                                length=None,
                                core=core,
                                sort_order=idx,
                                created=result,
                                standard_metadata=standard_metadata if standard_metadata else None,
                            )

                            item_count += 1
                            result["items_created"] += 1

                            # 节流
                            await asyncio.sleep(0.5)

                        except Exception as e:
                            logger.warning(f"QRS Item error in {instrument_name}: {str(e)}")
                            continue

                    logger.info(f"QRS {instrument_name}: synced {item_count} items")
                    result["instruments_created"] += 1

                    # 节流 - 量表之间等待
                    await asyncio.sleep(1.0)

                except Exception as e:
                    logger.warning(f"QRS Instrument {instrument_name} error: {str(e)}")
                    result["errors"].append(f"Instrument {instrument_name}: {str(e)}")
                    continue

            await session.commit()
            logger.info(f"QRS sync completed: {result['instruments_created']} instruments, {result['items_created']} items")

        except Exception as e:
            await session.rollback()
            result["errors"].append(f"QRS sync failed: {str(e)}")
            logger.error(f"QRS sync failed: {str(e)}")
            raise CDISCSyncError(f"QRS sync failed: {str(e)}")

        finally:
            await self.close()

        return result

    # ============================================================
    # BC 同步 (Biomedical Concepts) - COSMoS v2
    # ============================================================

    async def _sync_bc(self, session: AsyncSession, version: str) -> dict[str, Any]:
        """
        同步 Biomedical Concepts

        COSMoS v2 端点:
        - /cosmos/v2/mdr/bc/biomedicalconcepts - 获取所有 BC 列表
        - /cosmos/v2/mdr/bc/biomedicalconcepts/{conceptId} - 获取 BC 详情

        解析重点: NCIt 编码、同义词、数据元素概念
        """
        result = self._init_result("BC", version)
        result["bc_created"] = 0
        result["bc_updated"] = 0

        try:
            scope_node = await self._upsert_cdisc_scope_node(
                session, "bc", version
            )

            # 使用 COSMoS v2 端点获取所有 BC 列表
            endpoint = "/cosmos/v2/mdr/bc/biomedicalconcepts"
            data = await self._fetch_json(endpoint)

            if not data:
                result["errors"].append("Failed to fetch BC data from COSMoS v2")
                return result

            # 解析 _links.biomedicalConcepts
            bc_links = data.get("_links", {}).get("biomedicalConcepts", [])
            logger.info(f"Found {len(bc_links)} biomedical concept links to process")

            total_bc = len(bc_links)
            for bc_idx, bc_link in enumerate(bc_links, 1):
                self._check_cancelled()
                await self._report_progress(
                    f"BC: concept {bc_idx}/{total_bc}",
                    bc_idx,
                    total_bc,
                )
                try:
                    bc_href = bc_link.get("href", "")
                    bc_title = bc_link.get("title", "")

                    if not bc_href:
                        continue

                    # 构建完整的 COSMoS v2 详情路径
                    # href 格式: /mdr/bc/biomedicalconcepts/{conceptId}
                    # 需要转换为: /cosmos/v2/mdr/bc/biomedicalconcepts/{conceptId}
                    concept_id = bc_href.split("/")[-1]
                    cosmos_href = f"/cosmos/v2/mdr/bc/biomedicalconcepts/{concept_id}"

                    # 获取 BC 详情
                    bc_data = await self._fetch_json(cosmos_href)
                    if not bc_data:
                        logger.warning(f"Failed to fetch BC detail: {cosmos_href}")
                        continue

                    # 提取字段
                    concept_id = bc_data.get("conceptId", concept_id)
                    ncit_code = bc_data.get("ncitCode", concept_id)
                    short_name = bc_data.get("shortName", bc_data.get("name", bc_title))
                    definition = bc_data.get("definition", bc_data.get("description", ""))
                    synonyms = bc_data.get("synonyms", [])
                    categories = bc_data.get("categories", [])
                    data_element_concepts = bc_data.get("dataElementConcepts", [])

                    await self._upsert_biomedical_concept(
                        session=session,
                        scope_node=scope_node,
                        concept_id=concept_id,
                        ncit_code=ncit_code,
                        short_name=short_name,
                        definition=definition,
                        synonyms={
                            "items": synonyms,
                            "categories": categories,
                        } if synonyms or categories else None,
                        created=result,
                    )

                    # 节流 - 防止触发 Rate Limit
                    await asyncio.sleep(0.5)

                except Exception as e:
                    logger.warning(f"BC concept error: {str(e)}")
                    result["errors"].append(f"Concept error: {str(e)}")
                    continue

            await session.commit()

        except Exception as e:
            await session.rollback()
            result["errors"].append(f"Sync failed: {str(e)}")
            raise CDISCSyncError(f"BC sync failed: {str(e)}")

        finally:
            await self.close()

        return result

    # ============================================================
    # CT 同步 (Controlled Terminology)
    # ============================================================

    async def _sync_ct(self, session: AsyncSession, version: str) -> dict[str, Any]:
        """
        同步 Controlled Terminology

        端点: /mdr/ct/packages/{package_name}/codelists
        package_name 格式: sdtmct-2024-09-27, adamct-2024-09-27 等

        版本处理:
        - 完整包名 (如 sdtmct-2026-03-27): 仅同步该包，节点 code = CDISC-CT-sdtmct-2026-03-27
        - 裸日期 (如 2026-03-27): 同步该日期所有 CT 包 (sdtmct, adamct, sendct 等)，每个包独立节点

        防爆机制:
        - 分批提交: 每 CODELIST_BATCH_SIZE 个 Codelist 提交一次
        - 异常隔离: 单个 Codelist 失败不影响整体
        """
        CODELIST_BATCH_SIZE = 50

        result = self._init_result("CT", version)
        result["codelists_created"] = 0
        result["codelists_updated"] = 0
        result["terms_created"] = 0
        result["terms_updated"] = 0

        valid_ct_prefixes = [
            "sdtmct-", "adamct-", "sendct-", "cdashct-", "protocolct-",
            "qrsct-", "ddfct-", "define-", "glossaryct-", "tmfct-",
            "mrctct-", "coact-", "qs-"
        ]

        try:
            if any(version.startswith(prefix) for prefix in valid_ct_prefixes):
                # Full package name given: sync just that one package
                packages_to_sync = [version]
            else:
                # Bare date given (e.g. 2026-03-27): sync ALL packages for this date
                all_packages = await self._get_ct_versions()
                packages_to_sync = [pkg for pkg in all_packages if pkg.endswith(version)]
                if not packages_to_sync:
                    logger.warning(
                        f"No CT packages found for date {version}, falling back to sdtmct-{version}"
                    )
                    packages_to_sync = [f"sdtmct-{version}"]
                logger.info(
                    f"CT bare date {version}: syncing {len(packages_to_sync)} packages: {packages_to_sync}"
                )

            for package_name in packages_to_sync:
                # Each package gets its own scope node keyed by the full package name
                scope_node = await self._upsert_cdisc_scope_node(session, "ct", package_name)

                endpoint = f"/mdr/ct/packages/{package_name}/codelists"
                data = await self._fetch_json(endpoint)

                if not data:
                    result["errors"].append(f"Failed to fetch CT data for package: {package_name}")
                    continue

                links = data.get("_links", {})
                codelist_links = links.get("codelists", [])

                total_codelists = len(codelist_links)
                logger.info(f"Found {total_codelists} codelists to process for CT {package_name}")

                codelist_count = 0
                for codelist_link in codelist_links:
                    self._check_cancelled()
                    await self._report_progress(
                        f"CT {package_name}: codelist {codelist_count + 1}/{total_codelists}",
                        codelist_count + 1,
                        total_codelists,
                    )
                    try:
                        async with session.begin_nested():
                            codelist_href = codelist_link.get("href", "")
                            if not codelist_href:
                                continue

                            codelist_data = await self._fetch_json(codelist_href)
                            if not codelist_data:
                                continue

                            codelist_id = codelist_data.get("conceptId", codelist_href.split("/")[-1])

                            codelist = await self._upsert_codelist(
                                session=session,
                                scope_node=scope_node,
                                codelist_id=codelist_id,
                                name=codelist_data.get("name", codelist_link.get("title", "")),
                                ncit_code=codelist_data.get("conceptId"),
                                definition=codelist_data.get("definition", ""),
                                created=result,
                            )

                            terms = codelist_data.get("terms", [])
                            for idx, term_info in enumerate(terms):
                                term_value = term_info.get("submissionValue", term_info.get("code", ""))
                                if not term_value:
                                    continue

                                await self._upsert_codelist_term(
                                    session=session,
                                    codelist=codelist,
                                    term_value=term_value,
                                    ncit_code=term_info.get("conceptId"),
                                    name=term_info.get("preferredTerm", term_info.get("name", "")),
                                    definition=term_info.get("definition", ""),
                                    sort_order=idx,
                                    created=result,
                                )

                            codelist_count += 1

                            if codelist_count % CODELIST_BATCH_SIZE == 0:
                                await session.commit()
                                logger.info(
                                    f"CT batch committed: {codelist_count}/{total_codelists} "
                                    f"codelists processed for {package_name}"
                                )

                    except Exception as e:
                        logger.warning(f"CT codelist error ({package_name}): {str(e)}")
                        result["errors"].append(f"Codelist error ({package_name}): {str(e)}")
                        continue

                await session.commit()
                logger.info(
                    f"CT package {package_name} completed: {codelist_count}/{total_codelists} codelists"
                )

        except Exception as e:
            await session.rollback()
            result["errors"].append(f"Sync failed: {str(e)}")
            logger.error(f"CT sync failed for {version}: {str(e)}")
            raise CDISCSyncError(f"CT sync failed: {str(e)}")

        finally:
            await self.close()

        return result

    # ============================================================
    # 辅助方法
    # ============================================================

    def _init_result(self, standard: str, version: str) -> dict[str, Any]:
        """初始化结果字典"""
        return {
            "standard": standard,
            "version": version,
            "datasets_created": 0,
            "datasets_updated": 0,
            "variables_created": 0,
            "variables_updated": 0,
            "codelists_created": 0,
            "codelists_updated": 0,
            "terms_created": 0,
            "terms_updated": 0,
            "bc_created": 0,
            "bc_updated": 0,
            "errors": [],
        }

    async def _fetch_sdtmig_classes(self, version: str) -> list[dict]:
        """
        获取 SDTMIG Classes

        CDISC API: /mdr/sdtmig/{version}/classes
        返回格式: {"_links": {"classes": [{"href": "...", "title": "..."}]}}
        """
        endpoint = f"/mdr/sdtmig/{version}/classes"
        data = await self._fetch_json(endpoint)

        if not data:
            return []

        # CDISC API 返回 _links.classes 格式
        classes = []
        links = data.get("_links", {})
        class_links = links.get("classes", [])

        for class_link in class_links:
            # 获取每个 class 的详细信息
            class_href = class_link.get("href", "")
            if class_href:
                class_data = await self._fetch_json(class_href)
                if class_data:
                    classes.append(class_data)

        return classes

    async def _fetch_sdtmig_domains(
        self, version: str, class_name: str
    ) -> list[dict]:
        """获取指定类下的 Domains"""
        try:
            endpoint = f"/mdr/sdtmig/{version}/classes/{class_name}/domains"
            data = await self._fetch_json(endpoint)

            if not data:
                return []

            if "_embedded" in data:
                return data["_embedded"].get("domains", [])
            if "domains" in data:
                return data["domains"]
            if isinstance(data, list):
                return data
        except Exception:
            pass

        return []

    async def _fetch_sdtmig_domain_variables(
        self, version: str, domain_name: str
    ) -> list[dict]:
        """获取 Domain 的变量列表"""
        try:
            endpoint = f"/mdr/sdtmig/{version}/domains/{domain_name}/variables"
            data = await self._fetch_json(endpoint)

            if not data:
                return []

            if "_embedded" in data:
                return data["_embedded"].get("variables", [])
            if "variables" in data:
                return data["variables"]
            if isinstance(data, list):
                return data
        except Exception:
            pass

        return []

    def _map_class_to_dataset_class(self, class_name: str) -> DatasetClass | None:
        """
        映射 CDISC Class Name 到 DatasetClass 枚举

        SDTM Model 中的 Classes 分层:
        - General Observations: 抽象基类，包含所有观测类共有的泛化变量模板
        - Observation Classes: Findings, Events, Interventions, Findings About
        - Special Classes: Special Purpose, Trial Design, Relationship
        - Associated Persons: AP 域变量模板

        Args:
            class_name: CDISC SDTM Model 中的 Class 名称

        Returns:
            对应的 DatasetClass 枚举值，未知类型返回 None
        """
        # 标准化 class_name：移除连字符和空格，统一为大写
        # CDISC API 可能返回 "Special-Purpose" 或 "Special Purpose"
        normalized_name = class_name.upper().replace("-", " ").replace("  ", " ")

        # SDTM Model 完整 Class 映射
        class_mapping: dict[str, DatasetClass] = {
            # === General Observations (抽象基类) ===
            # 包含所有观测类共有的泛化变量模板 (如 --TESTCD, --ORRES 等)
            "GENERAL OBSERVATIONS": DatasetClass.GENERAL_OBSERVATIONS,

            # === Observation Classes (观测类) ===
            "FINDINGS": DatasetClass.FINDINGS,
            "EVENTS": DatasetClass.EVENTS,
            "INTERVENTIONS": DatasetClass.INTERVENTIONS,
            "FINDINGS ABOUT": DatasetClass.FINDINGS_ABOUT,

            # === Special Classes (特殊类) ===
            "SPECIAL PURPOSE": DatasetClass.SPECIAL_PURPOSE,
            "TRIAL DESIGN": DatasetClass.TRIAL_DESIGN,
            "RELATIONSHIP": DatasetClass.RELATIONSHIP,

            # === Associated Persons (相关人员) ===
            "ASSOCIATED PERSONS": DatasetClass.ASSOCIATED_PERSONS,

            # === QRS (量表库) ===
            "QRS": DatasetClass.QRS,
        }

        return class_mapping.get(normalized_name)

    def _map_data_type(self, cdisc_type: str) -> DataType:
        """映射 CDISC 数据类型"""
        type_mapping = {
            "text": DataType.CHAR,
            "char": DataType.CHAR,
            "character": DataType.CHAR,
            "num": DataType.NUM,
            "numeric": DataType.NUM,
            "integer": DataType.NUM,
            "float": DataType.NUM,
            "date": DataType.DATE,
            "datetime": DataType.DATETIME,
            "time": DataType.TIME,
        }

        return type_mapping.get(cdisc_type.lower(), DataType.CHAR)

    def _map_core(self, cdisc_core: str) -> VariableCore:
        """映射 Core 属性"""
        core_mapping = {
            "req": VariableCore.REQ,
            "required": VariableCore.REQ,
            "perm": VariableCore.PERM,
            "permissible": VariableCore.PERM,
            "exp": VariableCore.EXP,
            "expected": VariableCore.EXP,
        }

        return core_mapping.get(cdisc_core.lower(), VariableCore.PERM)

    # ============================================================
    # TIG 同步 (Targeted Implementation Guide / Integrated Standards)
    # ============================================================

    async def _sync_tig(
        self, session: AsyncSession, product_href: str
    ) -> dict[str, Any]:
        """
        同步 TIG (Targeted Implementation Guide / Integrated Standards)

        TIG 是一个复合容器，内部包含 SDTM、ADaM、CDASH 等模块

        Args:
            session: 数据库会话
            product_href: TIG 产品 href，如 "/mdr/integrated/tig/iss-ise-1-0"
                          或简短版本号，如 "iss-ise-1-0"

        同步策略:
        1. 请求基础 product_href 获取 TIG 概览
        2. 创建对应的 ScopeNode 和 Specification
        3. 嗅探 SDTM 模块 -> 复用 Family A 解析逻辑
        4. 嗅探 ADaM 模块 -> 复用 Family B 解析逻辑
        5. 嗅探 CDASH 模块 -> 复用 Family C 解析逻辑
        """
        # 标准化 href
        if not product_href.startswith("/mdr/"):
            # 如果只是版本号，构建完整 href
            product_href = f"/mdr/integrated/tig/{product_href}"

        # 提取版本号用于命名
        version = product_href.rstrip("/").split("/")[-1]

        result = self._init_result("TIG", version)
        result["sdtm_datasets"] = 0
        result["sdtm_variables"] = 0
        result["adam_datasets"] = 0
        result["adam_variables"] = 0
        result["cdash_datasets"] = 0
        result["modules_found"] = []

        logger.info(f"🔄 Syncing TIG: {product_href}")

        try:
            self._check_cancelled()
            await self._report_progress(
                f"TIG: processing {product_href}",
                0,
                1,
            )

            # Step 1: 获取 TIG 概览
            tig_data = await self._fetch_json(product_href)
            if not tig_data:
                result["errors"].append(f"Failed to fetch TIG data from {product_href}")
                return result

            # 提取 TIG 名称和描述
            tig_name = tig_data.get("name", version)
            tig_description = tig_data.get("description", "")

            logger.info(f"   TIG Name: {tig_name}")

            # Step 2: 创建 ScopeNode 和 Specification
            scope_node = await self._upsert_cdisc_scope_node(
                session, "TIG", version
            )
            # 更新名称为 TIG 实际名称
            scope_node.name = f"CDISC TIG - {tig_name}"
            scope_node.description = tig_description or f"TIG Integrated Standard: {tig_name}"

            specification = await self._upsert_specification(
                session, scope_node, SpecType.SDTM, version, name_suffix=tig_name
            )

            # Step 3: 嗅探 SDTM 模块
            logger.info("   🔍 Sniffing SDTM module...")
            await self._sync_tig_sdtm_module(
                session=session,
                product_href=product_href,
                specification=specification,
                result=result,
            )

            # Step 4: 嗅探 ADaM 模块
            logger.info("   🔍 Sniffing ADaM module...")
            await self._sync_tig_adam_module(
                session=session,
                product_href=product_href,
                specification=specification,
                result=result,
            )

            # Step 5: 嗅探 CDASH 模块
            logger.info("   🔍 Sniffing CDASH module...")
            await self._sync_tig_cdash_module(
                session=session,
                product_href=product_href,
                specification=specification,
                result=result,
            )

            await session.commit()

            # 汇总结果
            result["datasets_created"] = (
                result.get("sdtm_datasets", 0) +
                result.get("adam_datasets", 0) +
                result.get("cdash_datasets", 0)
            )
            result["variables_created"] = (
                result.get("sdtm_variables", 0) +
                result.get("adam_variables", 0)
            )

            logger.info(f"✅ TIG sync completed: {version}")
            logger.info(f"   Modules found: {result.get('modules_found', [])}")
            logger.info(f"   SDTM: {result.get('sdtm_datasets', 0)} datasets, {result.get('sdtm_variables', 0)} variables")
            logger.info(f"   ADaM: {result.get('adam_datasets', 0)} datasets, {result.get('adam_variables', 0)} variables")
            logger.info(f"   CDASH: {result.get('cdash_datasets', 0)} datasets")

        except Exception as e:
            await session.rollback()
            result["errors"].append(f"TIG sync failed: {str(e)}")
            raise CDISCSyncError(f"TIG sync failed: {str(e)}")

        finally:
            await self.close()

        return result

    async def _sync_tig_sdtm_module(
        self,
        session: AsyncSession,
        product_href: str,
        specification: Specification,
        result: dict[str, Any],
    ) -> None:
        """
        同步 TIG 中的 SDTM 模块

        尝试端点:
        - {product_href}/sdtm/classes
        - {product_href}/sdtm/datasets
        """
        # 尝试方式 1: /sdtm/classes (类似 SDTMIG)
        try:
            endpoint = f"{product_href}/sdtm/classes"
            data = await self._fetch_json(endpoint)

            if data:
                classes = data.get("_embedded", {}).get("classes", [])
                if isinstance(data, list):
                    classes = data
                if isinstance(data.get("classes"), list):
                    classes = data["classes"]

                if classes:
                    result["modules_found"].append("SDTM")
                    logger.info(f"      Found SDTM classes: {len(classes)}")

                    for class_info in classes:
                        class_name = class_info.get("name", "")
                        class_type = self._map_class_to_dataset_class(class_name)

                        # 跳过未知的 class
                        if class_type is None:
                            logger.warning(f"      TIG SDTM: Skipping unknown class: {class_name}")
                            continue

                        datasets = class_info.get("datasets", [])

                        for domain_info in datasets:
                            try:
                                domain_name = domain_info.get("name", "")
                                if not domain_name:
                                    continue

                                dataset = await self._upsert_target_dataset(
                                    session=session,
                                    specification=specification,
                                    dataset_name=domain_name,
                                    description=domain_info.get("label", ""),
                                    class_type=class_type,
                                    created=result,
                                )
                                result["sdtm_datasets"] += 1

                                # 处理变量
                                variables = domain_info.get("datasetVariables", [])
                                for var_info in variables:
                                    try:
                                        var_name = var_info.get("name", "")
                                        if not var_name:
                                            continue

                                        await self._upsert_target_variable(
                                            session=session,
                                            dataset=dataset,
                                            var_name=var_name,
                                            var_label=var_info.get("label", ""),
                                            description=var_info.get("description", ""),
                                            data_type=self._map_data_type(
                                                var_info.get("simpleDatatype", "Char")
                                            ),
                                            length=None,
                                            core=self._map_core(var_info.get("core", "Perm")),
                                            sort_order=int(var_info.get("ordinal", 0)),
                                            created=result,
                                            standard_metadata={
                                                "source": "TIG-SDTM",
                                                "tig_href": product_href,
                                            },
                                        )
                                        result["sdtm_variables"] += 1
                                    except Exception as e:
                                        logger.warning(f"Variable error in {domain_name}: {str(e)}")

                            except Exception as e:
                                logger.warning(f"Domain error: {str(e)}")

                    return  # 成功获取数据，直接返回

        except Exception as e:
            logger.debug(f"SDTM classes endpoint failed: {str(e)}")

        # 尝试方式 2: /sdtm/datasets
        try:
            endpoint = f"{product_href}/sdtm/datasets"
            data = await self._fetch_json(endpoint)

            if data:
                datasets = data.get("_embedded", {}).get("datasets", [])
                if isinstance(data, list):
                    datasets = data

                if datasets:
                    if "SDTM" not in result["modules_found"]:
                        result["modules_found"].append("SDTM")
                    logger.info(f"      Found SDTM datasets: {len(datasets)}")

                    for domain_info in datasets:
                        try:
                            domain_name = domain_info.get("name", "")
                            if not domain_name:
                                continue

                            # 获取 domain 的 class
                            domain_class = domain_info.get("class", "")
                            class_type = self._map_class_to_dataset_class(domain_class)

                            # 跳过未知 class 的 domain
                            if class_type is None:
                                logger.warning(f"      TIG SDTM dataset: Skipping unknown class '{domain_class}' for domain {domain_name}")
                                continue

                            await self._upsert_target_dataset(
                                session=session,
                                specification=specification,
                                dataset_name=domain_name,
                                description=domain_info.get("label", ""),
                                class_type=class_type,
                                created=result,
                            )
                            result["sdtm_datasets"] += 1

                        except Exception as e:
                            logger.warning(f"Domain error: {str(e)}")

        except Exception as e:
            logger.info(f"   ℹ️ No SDTM module in this TIG: {str(e)}")

    async def _sync_tig_adam_module(
        self,
        session: AsyncSession,
        product_href: str,
        specification: Specification,
        result: dict[str, Any],
    ) -> None:
        """
        同步 TIG 中的 ADaM 模块

        尝试端点: {product_href}/adam/datastructures
        """
        try:
            endpoint = f"{product_href}/adam/datastructures"
            data = await self._fetch_json(endpoint)

            if not data:
                logger.info("   ℹ️ No ADaM module in this TIG")
                return

            data_structures = data.get("dataStructures", [])
            if isinstance(data, list):
                data_structures = data

            if not data_structures:
                logger.info("   ℹ️ No ADaM module in this TIG")
                return

            result["modules_found"].append("ADaM")
            logger.info(f"      Found ADaM dataStructures: {len(data_structures)}")

            for ds_info in data_structures:
                try:
                    ds_name = ds_info.get("name", "")
                    if not ds_name:
                        continue

                    dataset = await self._upsert_target_dataset(
                        session=session,
                        specification=specification,
                        dataset_name=ds_name,
                        description=ds_info.get("label", ds_info.get("description", "")),
                        class_type=DatasetClass.FINDINGS,  # ADaM 默认
                        created=result,
                    )
                    result["adam_datasets"] += 1

                    # 处理变量
                    var_sets = ds_info.get("analysisVariableSets", [])
                    for var_set in var_sets:
                        variables = var_set.get("analysisVariables", [])
                        for var_info in variables:
                            try:
                                var_name = var_info.get("name", "")
                                if not var_name:
                                    continue

                                await self._upsert_target_variable(
                                    session=session,
                                    dataset=dataset,
                                    var_name=var_name,
                                    var_label=var_info.get("label", ""),
                                    description=var_info.get("description", ""),
                                    data_type=self._map_data_type(
                                        var_info.get("simpleDatatype", "Char")
                                    ),
                                    length=None,
                                    core=self._map_core(var_info.get("core", "Perm")),
                                    sort_order=int(var_info.get("ordinal", 0)),
                                    created=result,
                                    standard_metadata={
                                        "source": "TIG-ADaM",
                                        "tig_href": product_href,
                                    },
                                )
                                result["adam_variables"] += 1
                            except Exception as e:
                                logger.warning(f"ADaM variable error: {str(e)}")

                except Exception as e:
                    logger.warning(f"ADaM datastructure error: {str(e)}")

        except Exception as e:
            logger.info(f"   ℹ️ No ADaM module in this TIG: {str(e)}")

    async def _sync_tig_cdash_module(
        self,
        session: AsyncSession,
        product_href: str,
        specification: Specification,
        result: dict[str, Any],
    ) -> None:
        """
        同步 TIG 中的 CDASH 模块

        尝试端点: {product_href}/cdash/domains
        """
        try:
            endpoint = f"{product_href}/cdash/domains"
            data = await self._fetch_json(endpoint)

            if not data:
                logger.info("   ℹ️ No CDASH module in this TIG")
                return

            domains = data.get("_embedded", {}).get("domains", [])
            if isinstance(data, list):
                domains = data

            if not domains:
                logger.info("   ℹ️ No CDASH module in this TIG")
                return

            result["modules_found"].append("CDASH")
            logger.info(f"      Found CDASH domains: {len(domains)}")

            for domain_info in domains:
                try:
                    domain_name = domain_info.get("name", "")
                    if not domain_name:
                        continue

                    # 获取 domain 的 class
                    domain_class = domain_info.get("class", "")
                    class_type = self._map_class_to_dataset_class(domain_class)

                    # 跳过未知 class 的 domain
                    if class_type is None:
                        logger.warning(f"      TIG CDASH: Skipping unknown class '{domain_class}' for domain {domain_name}")
                        continue

                    await self._upsert_target_dataset(
                        session=session,
                        specification=specification,
                        dataset_name=domain_name,
                        description=domain_info.get("label", ""),
                        class_type=class_type,
                        created=result,
                    )
                    result["cdash_datasets"] += 1

                except Exception as e:
                    logger.warning(f"CDASH domain error: {str(e)}")

        except Exception as e:
            logger.info(f"   ℹ️ No CDASH module in this TIG: {str(e)}")


# ============================================================
# 便捷函数
# ============================================================

async def sync_cdisc(
    session: AsyncSession, standard_type: str, version: str
) -> dict[str, Any]:
    """
    同步 CDISC 标准的便捷函数

    Args:
        session: 数据库会话
        standard_type: 标准类型 (sdtm, sdtmig, adam, adamig, cdashig, sendig, qrs, ct, bc)
        version: 版本

    Returns:
        同步结果
    """
    service = CDISCSyncService()
    return await service.sync(session, standard_type, version)