"""
Global Library 标准版本 Seeding 脚本

用于在本地开发环境中初始化基本的 SDTM/ADaM 版本数据。
如果已配置 CDISC API Key，推荐使用 run_initial_cdisc_sync.py 获取完整数据。

运行方式：
    python -m scripts.seed_global_library

数据结构：
ScopeNode (CDISC) -> Specification (SDTM-IG 3.4) -> TargetDataset (DM/AE) -> TargetVariable
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.database import async_session_factory
from app.models import (
    ScopeNode,
    Specification,
    TargetDataset,
    TargetVariable,
)
from app.models.audit_listener import set_audit_context
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

# ============================================================
# 标准版本定义
# ============================================================

SDTMIG_34_DATASETS = [
    {
        "name": "DM",
        "description": "Demographics",
        "class_type": DatasetClass.SPECIAL_PURPOSE,
        "variables": [
            {"name": "STUDYID", "label": "Study Identifier", "type": DataType.CHAR, "length": 12, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "DOMAIN", "label": "Domain Abbreviation", "type": DataType.CHAR, "length": 2, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "USUBJID", "label": "Unique Subject Identifier", "type": DataType.CHAR, "length": 40, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "SUBJID", "label": "Subject Identifier for the Study", "type": DataType.CHAR, "length": 20, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "RFSTDTC", "label": "Subject Reference Start Date/Time", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
            {"name": "RFENDTC", "label": "Subject Reference End Date/Time", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
            {"name": "RFXSTDTC", "label": "Date/Time of First Study Treatment", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
            {"name": "RFXENDTC", "label": "Date/Time of Last Study Treatment", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
            {"name": "SITEID", "label": "Study Site Identifier", "type": DataType.CHAR, "length": 8, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "AGE", "label": "Age", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "AGEU", "label": "Age Units", "type": DataType.CHAR, "length": 10, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "SEX", "label": "Sex", "type": DataType.CHAR, "length": 1, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "RACE", "label": "Race", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "ETHNIC", "label": "Ethnicity", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "ARM", "label": "Description of Planned Arm", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "ARMCD", "label": "Planned Arm Code", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "ACTARM", "label": "Description of Actual Arm", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "ACTARMCD", "label": "Actual Arm Code", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "COUNTRY", "label": "Country", "type": DataType.CHAR, "length": 3, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "DMDTC", "label": "Date/Time of Collection", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
            {"name": "DMDY", "label": "Study Day of Collection", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
        ],
    },
    {
        "name": "AE",
        "description": "Adverse Events",
        "class_type": DatasetClass.EVENTS,
        "variables": [
            {"name": "STUDYID", "label": "Study Identifier", "type": DataType.CHAR, "length": 12, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "DOMAIN", "label": "Domain Abbreviation", "type": DataType.CHAR, "length": 2, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "USUBJID", "label": "Unique Subject Identifier", "type": DataType.CHAR, "length": 40, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "AESEQ", "label": "Sequence Number", "type": DataType.NUM, "length": 8, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "AESPID", "label": "Sponsor-Defined Identifier", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "AETERM", "label": "Reported Term for the Adverse Event", "type": DataType.CHAR, "length": 200, "core": VariableCore.REQ, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "AEDECOD", "label": "Dictionary-Derived Term", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Synonym Qualifier", "origin": OriginType.CDISC},
            {"name": "AELLT", "label": "Lowest Level Term", "type": DataType.CHAR, "length": 100, "core": VariableCore.EXP, "role": "Synonym Qualifier", "origin": OriginType.CDISC},
            {"name": "AEPTCD", "label": "Preferred Term Code", "type": DataType.NUM, "length": 8, "core": VariableCore.PERM, "role": "Synonym Qualifier", "origin": OriginType.CDISC},
            {"name": "AEHLT", "label": "High Level Term", "type": DataType.CHAR, "length": 100, "core": VariableCore.PERM, "role": "Synonym Qualifier", "origin": OriginType.CDISC},
            {"name": "AEHLGT", "label": "High Level Group Term", "type": DataType.CHAR, "length": 100, "core": VariableCore.PERM, "role": "Synonym Qualifier", "origin": OriginType.CDISC},
            {"name": "AEBODSYS", "label": "Body System or Organ Class", "type": DataType.CHAR, "length": 100, "core": VariableCore.EXP, "role": "Synonym Qualifier", "origin": OriginType.CDISC},
            {"name": "AESOC", "label": "Primary System Organ Class", "type": DataType.CHAR, "length": 100, "core": VariableCore.EXP, "role": "Synonym Qualifier", "origin": OriginType.CDISC},
            {"name": "AESEV", "label": "Severity/Intensity", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "AESER", "label": "Serious Event", "type": DataType.CHAR, "length": 1, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "AEACN", "label": "Action Taken with Study Treatment", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "AEREL", "label": "Causality", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "AEOUT", "label": "Outcome of Adverse Event", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "AESTDTC", "label": "Start Date/Time of Adverse Event", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
            {"name": "AEENDTC", "label": "End Date/Time of Adverse Event", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
            {"name": "AESTDY", "label": "Study Day of Start of Adverse Event", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
            {"name": "AEENDY", "label": "Study Day of End of Adverse Event", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
        ],
    },
    {
        "name": "VS",
        "description": "Vital Signs",
        "class_type": DatasetClass.FINDINGS,
        "variables": [
            {"name": "STUDYID", "label": "Study Identifier", "type": DataType.CHAR, "length": 12, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "DOMAIN", "label": "Domain Abbreviation", "type": DataType.CHAR, "length": 2, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "USUBJID", "label": "Unique Subject Identifier", "type": DataType.CHAR, "length": 40, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "VSSEQ", "label": "Sequence Number", "type": DataType.NUM, "length": 8, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "VSTESTCD", "label": "Vital Signs Test Short Name", "type": DataType.CHAR, "length": 8, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "VSTEST", "label": "Vital Signs Test Name", "type": DataType.CHAR, "length": 40, "core": VariableCore.REQ, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "VSORRES", "label": "Vital Signs Result in Original Units", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Result", "origin": OriginType.CDISC},
            {"name": "VSORRESU", "label": "Original Units", "type": DataType.CHAR, "length": 8, "core": VariableCore.EXP, "role": "Result Qualifier", "origin": OriginType.CDISC},
            {"name": "VSSTRESC", "label": "Character Result/Finding in Standard Format", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Result", "origin": OriginType.CDISC},
            {"name": "VSSTRESN", "label": "Numeric Finding in Standard Units", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Result", "origin": OriginType.CDISC},
            {"name": "VSSTRESU", "label": "Standard Units", "type": DataType.CHAR, "length": 8, "core": VariableCore.EXP, "role": "Result Qualifier", "origin": OriginType.CDISC},
            {"name": "VSSTAT", "label": "Completion Status", "type": DataType.CHAR, "length": 8, "core": VariableCore.EXP, "role": "Record Qualifier", "origin": OriginType.CDISC},
            {"name": "VSLOC", "label": "Location of Vital Signs Measurement", "type": DataType.CHAR, "length": 40, "core": VariableCore.PERM, "role": "Variable Qualifier", "origin": OriginType.CDISC},
            {"name": "VSDTC", "label": "Date/Time of Measurements", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
            {"name": "VSDY", "label": "Study Day of Vital Signs", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
        ],
    },
    {
        "name": "EX",
        "description": "Exposure",
        "class_type": DatasetClass.INTERVENTIONS,
        "variables": [
            {"name": "STUDYID", "label": "Study Identifier", "type": DataType.CHAR, "length": 12, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "DOMAIN", "label": "Domain Abbreviation", "type": DataType.CHAR, "length": 2, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "USUBJID", "label": "Unique Subject Identifier", "type": DataType.CHAR, "length": 40, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "EXSEQ", "label": "Sequence Number", "type": DataType.NUM, "length": 8, "core": VariableCore.REQ, "role": "Identifier", "origin": OriginType.CDISC},
            {"name": "EXTRT", "label": "Name of Actual Treatment", "type": DataType.CHAR, "length": 100, "core": VariableCore.REQ, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "EXDOSE", "label": "Dose per Administration", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Topic", "origin": OriginType.CDISC},
            {"name": "EXDOSU", "label": "Dose Units", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Topic Qualifier", "origin": OriginType.CDISC},
            {"name": "EXDOSFRM", "label": "Dose Form", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "Topic Qualifier", "origin": OriginType.CDISC},
            {"name": "EXROUTE", "label": "Route of Administration", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "Topic Qualifier", "origin": OriginType.CDISC},
            {"name": "EXSTDTC", "label": "Start Date/Time of Treatment", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
            {"name": "EXENDTC", "label": "End Date/Time of Treatment", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
            {"name": "EXSTDY", "label": "Study Day of Start of Treatment", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
            {"name": "EXENDY", "label": "Study Day of End of Treatment", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Timing", "origin": OriginType.CDISC},
        ],
    },
]

ADAMIG_13_DATASETS = [
    {
        "name": "ADSL",
        "description": "Subject Level Analysis Dataset",
        "class_type": DatasetClass.SPECIAL_PURPOSE,  # ADSL is a special purpose dataset
        "variables": [
            {"name": "STUDYID", "label": "Study Identifier", "type": DataType.CHAR, "length": 12, "core": VariableCore.REQ, "role": "KEY", "origin": OriginType.CDISC},
            {"name": "USUBJID", "label": "Unique Subject Identifier", "type": DataType.CHAR, "length": 40, "core": VariableCore.REQ, "role": "KEY", "origin": OriginType.CDISC},
            {"name": "SUBJID", "label": "Subject Identifier for the Study", "type": DataType.CHAR, "length": 20, "core": VariableCore.REQ, "role": "KEY", "origin": OriginType.CDISC},
            {"name": "SITEID", "label": "Study Site Identifier", "type": DataType.CHAR, "length": 8, "core": VariableCore.REQ, "role": "KEY", "origin": OriginType.CDISC},
            {"name": "TRT01P", "label": "Planned Treatment for Period 01", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "TRT", "origin": OriginType.CDISC},
            {"name": "TRT01A", "label": "Actual Treatment for Period 01", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "TRT", "origin": OriginType.CDISC},
            {"name": "TRT01PN", "label": "Planned Treatment for Period 01 (N)", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "TRT", "origin": OriginType.CDISC},
            {"name": "TRT01AN", "label": "Actual Treatment for Period 01 (N)", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "TRT", "origin": OriginType.CDISC},
            {"name": "AGE", "label": "Age", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "COV", "origin": OriginType.CDISC},
            {"name": "AGEGR1", "label": "Pooled Age Group 1", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "COV", "origin": OriginType.CDISC},
            {"name": "SEX", "label": "Sex", "type": DataType.CHAR, "length": 1, "core": VariableCore.EXP, "role": "COV", "origin": OriginType.CDISC},
            {"name": "RACE", "label": "Race", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "COV", "origin": OriginType.CDISC},
            {"name": "ETHNIC", "label": "Ethnicity", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "COV", "origin": OriginType.CDISC},
            {"name": "SAFFL", "label": "Safety Population Flag", "type": DataType.CHAR, "length": 1, "core": VariableCore.EXP, "role": "FLAG", "origin": OriginType.CDISC},
            {"name": "EFFFL", "label": "Efficacy Population Flag", "type": DataType.CHAR, "length": 1, "core": VariableCore.EXP, "role": "FLAG", "origin": OriginType.CDISC},
            {"name": "COMPFL", "label": "Completers Population Flag", "type": DataType.CHAR, "length": 1, "core": VariableCore.PERM, "role": "FLAG", "origin": OriginType.CDISC},
            {"name": "TRTSDT", "label": "Date of First Exposure to Treatment", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "TIME", "origin": OriginType.CDISC},
            {"name": "TRTEDT", "label": "Date of Last Exposure to Treatment", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "TIME", "origin": OriginType.CDISC},
            {"name": "TRTSDTM", "label": "Datetime of First Exposure to Treatment", "type": DataType.NUM, "length": 8, "core": VariableCore.PERM, "role": "TIME", "origin": OriginType.CDISC},
            {"name": "TRTEDTM", "label": "Datetime of Last Exposure to Treatment", "type": DataType.NUM, "length": 8, "core": VariableCore.PERM, "role": "TIME", "origin": OriginType.CDISC},
        ],
    },
    {
        "name": "ADAE",
        "description": "Adverse Events Analysis Dataset",
        "class_type": DatasetClass.EVENTS,  # ADAE is an events dataset
        "variables": [
            {"name": "STUDYID", "label": "Study Identifier", "type": DataType.CHAR, "length": 12, "core": VariableCore.REQ, "role": "KEY", "origin": OriginType.CDISC},
            {"name": "USUBJID", "label": "Unique Subject Identifier", "type": DataType.CHAR, "length": 40, "core": VariableCore.REQ, "role": "KEY", "origin": OriginType.CDISC},
            {"name": "TRTA", "label": "Actual Treatment", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "TRT", "origin": OriginType.CDISC},
            {"name": "TRTAN", "label": "Actual Treatment (N)", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "TRT", "origin": OriginType.CDISC},
            {"name": "AETERM", "label": "Reported Term for the Adverse Event", "type": DataType.CHAR, "length": 200, "core": VariableCore.REQ, "role": "VAR", "origin": OriginType.CDISC},
            {"name": "AEDECOD", "label": "Dictionary-Derived Term", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "VAR", "origin": OriginType.CDISC},
            {"name": "AEBODSYS", "label": "Body System or Organ Class", "type": DataType.CHAR, "length": 100, "core": VariableCore.EXP, "role": "VAR", "origin": OriginType.CDISC},
            {"name": "AESOC", "label": "Primary System Organ Class", "type": DataType.CHAR, "length": 100, "core": VariableCore.EXP, "role": "VAR", "origin": OriginType.CDISC},
            {"name": "AESEV", "label": "Severity/Intensity", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "VAR", "origin": OriginType.CDISC},
            {"name": "AESER", "label": "Serious Event", "type": DataType.CHAR, "length": 1, "core": VariableCore.EXP, "role": "VAR", "origin": OriginType.CDISC},
            {"name": "AREL", "label": "Analysis Causality", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "VAR", "origin": OriginType.CDISC},
            {"name": "AEOUT", "label": "Outcome of Adverse Event", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "VAR", "origin": OriginType.CDISC},
            {"name": "ASTDT", "label": "Analysis Start Date", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "TIME", "origin": OriginType.CDISC},
            {"name": "AENDT", "label": "Analysis End Date", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "TIME", "origin": OriginType.CDISC},
            {"name": "ASTDY", "label": "Analysis Start Relative Day", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "TIME", "origin": OriginType.CDISC},
            {"name": "AENDY", "label": "Analysis End Relative Day", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "TIME", "origin": OriginType.CDISC},
            {"name": "TRTEMFL", "label": "Treatment Emergent Analysis Flag", "type": DataType.CHAR, "length": 1, "core": VariableCore.EXP, "role": "FLAG", "origin": OriginType.CDISC},
            {"name": "ANL01FL", "label": "Analysis Record Selection 1", "type": DataType.CHAR, "length": 1, "core": VariableCore.EXP, "role": "FLAG", "origin": OriginType.CDISC},
        ],
    },
]


async def seed_global_library() -> dict:
    """
    初始化 Global Library 标准版本数据

    只创建带完整数据集定义的 Specification，不创建空版本列表。
    版本号完全从数据库已有数据动态获取，由 Global Library 管理界面维护。

    Returns:
        创建的实体 ID 映射
    """
    result = {}

    async with async_session_factory() as session:
        # 设置审计上下文
        set_audit_context(
            user_id="global_library_seeder",
            user_name="Global Library Seeder",
            context={"operation": "seed", "source": "script"},
            reason="初始化 Global Library 标准版本数据",
        )

        # ============================================================
        # 1. 创建 CDISC ScopeNode
        # ============================================================
        print("📌 创建 CDISC ScopeNode...")

        # 检查是否已存在 CDISC 节点
        existing_cdisc = await session.execute(
            select(ScopeNode).where(ScopeNode.node_type == NodeType.CDISC).limit(1)
        )
        cdisc_node = existing_cdisc.scalar()

        if not cdisc_node:
            cdisc_node = ScopeNode(
                code="CDISC",
                name="CDISC Standards Library",
                description="CDISC Global Standards Library containing SDTM, ADaM, and CT standards",
                node_type=NodeType.CDISC,
                lifecycle_status=LifecycleStatus.ONGOING,
                parent_id=None,
                path=None,
                depth=0,
                sort_order=0,
                created_by="global_library_seeder",
            )
            session.add(cdisc_node)
            await session.flush()
            cdisc_node.path = f"/{cdisc_node.id}/"

        result["cdisc_node_id"] = cdisc_node.id
        print(f"   ✓ CDISC ScopeNode: ID={cdisc_node.id}")

        # ============================================================
        # 2. 创建 SDTM-IG 3.4 Specification (含完整数据集定义)
        # ============================================================
        print("\n📄 创建 SDTM-IG 3.4 Specification (with datasets)...")

        existing_sdtmig = await session.execute(
            select(Specification).where(
                Specification.standard_name == "SDTMIG v3.4",
                Specification.is_deleted == False,  # noqa: E712
            )
        )
        sdtmig_spec = existing_sdtmig.scalar_one_or_none()

        if not sdtmig_spec:
            sdtmig_spec = Specification(
                scope_node_id=cdisc_node.id,
                name="CDISC SDTMIG v3.4 Specification",
                spec_type=SpecType.SDTM,
                version="3.4",
                status=SpecStatus.ACTIVE,
                standard_name="SDTMIG v3.4",
                standard_version="3.4",
                description="SDTM Implementation Guide Version 3.4",
                created_by="global_library_seeder",
            )
            session.add(sdtmig_spec)
            await session.flush()
            print("   ✓ Created: SDTMIG v3.4")

        result["sdtmig_spec_id"] = sdtmig_spec.id
        print(f"   ✓ SDTM-IG 3.4 Specification: ID={sdtmig_spec.id}")

        # 创建 SDTM-IG 3.4 的数据集和变量
        dataset_count = 0
        variable_count = 0

        for ds_def in SDTMIG_34_DATASETS:
            # 检查数据集是否已存在
            existing_ds = await session.execute(
                select(TargetDataset).where(
                    TargetDataset.specification_id == sdtmig_spec.id,
                    TargetDataset.dataset_name == ds_def["name"],
                    TargetDataset.is_deleted == False,  # noqa: E712
                )
            )
            dataset = existing_ds.scalar_one_or_none()

            if not dataset:
                dataset = TargetDataset(
                    specification_id=sdtmig_spec.id,
                    dataset_name=ds_def["name"],
                    description=ds_def["description"],
                    class_type=ds_def["class_type"],
                    sort_order=dataset_count + 1,
                    override_type=OverrideType.NONE,
                    created_by="global_library_seeder",
                )
                session.add(dataset)
                await session.flush()

            dataset_count += 1

            # 创建变量
            var_order = 0
            for var_def in ds_def["variables"]:
                existing_var = await session.execute(
                    select(TargetVariable).where(
                        TargetVariable.dataset_id == dataset.id,
                        TargetVariable.variable_name == var_def["name"],
                        TargetVariable.is_deleted == False,  # noqa: E712
                    )
                )
                if existing_var.scalar_one_or_none():
                    continue

                var = TargetVariable(
                    dataset_id=dataset.id,
                    variable_name=var_def["name"],
                    variable_label=var_def["label"],
                    data_type=var_def["type"],
                    length=var_def["length"],
                    core=var_def["core"],
                    sort_order=var_order,
                    origin_type=var_def["origin"],
                    override_type=OverrideType.NONE,
                    standard_metadata={"role": var_def["role"]},
                    created_by="global_library_seeder",
                )
                session.add(var)
                var_order += 1
                variable_count += 1

        print(f"   ✓ SDTM-IG 3.4: {dataset_count} datasets, {variable_count} variables")

        # ============================================================
        # 3. 创建 ADaM-IG 1.3 Specification (含完整数据集定义)
        # ============================================================
        print("\n📄 创建 ADaM-IG 1.3 Specification (with datasets)...")

        existing_adamig = await session.execute(
            select(Specification).where(
                Specification.standard_name == "ADaMIG v1.3",
                Specification.is_deleted == False,  # noqa: E712
            )
        )
        adamig_spec = existing_adamig.scalar_one_or_none()

        if not adamig_spec:
            adamig_spec = Specification(
                scope_node_id=cdisc_node.id,
                name="CDISC ADaMIG v1.3 Specification",
                spec_type=SpecType.ADAM,
                version="1.3",
                status=SpecStatus.ACTIVE,
                standard_name="ADaMIG v1.3",
                standard_version="1.3",
                description="ADaM Implementation Guide Version 1.3",
                created_by="global_library_seeder",
            )
            session.add(adamig_spec)
            await session.flush()
            print("   ✓ Created: ADaMIG v1.3")

        result["adamig_spec_id"] = adamig_spec.id
        print(f"   ✓ ADaM-IG 1.3 Specification: ID={adamig_spec.id}")

        # 创建 ADaM-IG 1.3 的数据集和变量
        dataset_count = 0
        variable_count = 0

        for ds_def in ADAMIG_13_DATASETS:
            existing_ds = await session.execute(
                select(TargetDataset).where(
                    TargetDataset.specification_id == adamig_spec.id,
                    TargetDataset.dataset_name == ds_def["name"],
                    TargetDataset.is_deleted == False,  # noqa: E712
                )
            )
            dataset = existing_ds.scalar_one_or_none()

            if not dataset:
                dataset = TargetDataset(
                    specification_id=adamig_spec.id,
                    dataset_name=ds_def["name"],
                    description=ds_def["description"],
                    class_type=ds_def["class_type"],
                    sort_order=dataset_count + 1,
                    override_type=OverrideType.NONE,
                    created_by="global_library_seeder",
                )
                session.add(dataset)
                await session.flush()

            dataset_count += 1

            var_order = 0
            for var_def in ds_def["variables"]:
                existing_var = await session.execute(
                    select(TargetVariable).where(
                        TargetVariable.dataset_id == dataset.id,
                        TargetVariable.variable_name == var_def["name"],
                        TargetVariable.is_deleted == False,  # noqa: E712
                    )
                )
                if existing_var.scalar_one_or_none():
                    continue

                var = TargetVariable(
                    dataset_id=dataset.id,
                    variable_name=var_def["name"],
                    variable_label=var_def["label"],
                    data_type=var_def["type"],
                    length=var_def["length"],
                    core=var_def["core"],
                    sort_order=var_order,
                    origin_type=var_def["origin"],
                    override_type=OverrideType.NONE,
                    standard_metadata={"role": var_def["role"]},
                    created_by="global_library_seeder",
                )
                session.add(var)
                var_order += 1
                variable_count += 1

        print(f"   ✓ ADaM-IG 1.3: {dataset_count} datasets, {variable_count} variables")

        # 提交事务
        await session.commit()

        print("\n✅ Global Library Seeding 完成!")
        print(f"   - CDISC Node ID: {result.get('cdisc_node_id')}")
        print(f"   - SDTM-IG 3.4 Spec ID: {result.get('sdtmig_spec_id')}")
        print(f"   - ADaM-IG 1.3 Spec ID: {result.get('adamig_spec_id')}")
        print("\n   提示: 更多版本请通过 Global Library 管理界面添加")

        return result


if __name__ == "__main__":
    asyncio.run(seed_global_library())