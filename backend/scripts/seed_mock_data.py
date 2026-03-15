"""
Mock 数据初始化脚本

用于注入极具临床业务真实感的测试数据，打通 API 测试闭环。

数据层级：
ScopeNode (Study) -> Specification (SDTM) -> TargetDataset (DM/VS) -> TargetVariable
                  -> SourceCollection (EDC) -> SourceItem

运行方式：
    python -m scripts.seed_mock_data
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
    SourceCollection,
    SourceItem,
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
    SourceType,
    SpecStatus,
    SpecType,
    VariableCore,
)


async def seed_mock_data() -> dict:
    """
    注入 Mock 数据

    Returns:
        创建的实体 ID 映射
    """
    result = {}

    async with async_session_factory() as session:
        # ============================================================
        # 1. 设置审计上下文
        # ============================================================
        set_audit_context(
            user_id="mock_seeder",
            user_name="Mock Data Seeder",
            context={"operation": "seed", "source": "script"},
            reason="初始化测试数据",
        )

        # ============================================================
        # 2. 创建 ScopeNode (Study 节点)
        # ============================================================
        print("📌 创建 ScopeNode (Study 节点)...")

        study_node = ScopeNode(
            code="ZL-1310-001",
            name="ZL-1310-001 Phase III Oncology Study",
            description="一项随机、双盲、安慰剂对照的 III 期临床研究，评估 ZL-1310 在晚期非小细胞肺癌患者中的疗效和安全性",
            node_type=NodeType.STUDY,
            lifecycle_status=LifecycleStatus.ONGOING,
            parent_id=None,  # 顶层 Study 节点
            path=None,  # 将在 flush 后更新
            depth=0,
            sort_order=1,
            created_by="mock_seeder",
        )
        session.add(study_node)
        await session.flush()

        # 更新 path
        study_node.path = f"/{study_node.id}/"
        result["scope_node_id"] = study_node.id
        print(f"   ✓ ScopeNode 创建成功: ID={study_node.id}, Code={study_node.code}")

        # ============================================================
        # 3. 创建 Specification (SDTM Spec)
        # ============================================================
        print("\n📄 创建 Specification (SDTM 规范文档)...")

        sdtm_spec = Specification(
            scope_node_id=study_node.id,
            name="ZL-1310-001 SDTM Specification v1.0",
            spec_type=SpecType.SDTM,
            version="1.0",
            status=SpecStatus.ACTIVE,
            description="ZL-1310-001 试验 SDTM 数据标准规范文档",
            standard_name="SDTM-IG",
            standard_version="3.4",
            created_by="mock_seeder",
        )
        session.add(sdtm_spec)
        await session.flush()

        result["specification_id"] = sdtm_spec.id
        print(f"   ✓ Specification 创建成功: ID={sdtm_spec.id}, Name={sdtm_spec.name}")

        # ============================================================
        # 4. 创建 TargetDataset (DM, VS)
        # ============================================================
        print("\n📊 创建 TargetDataset (目标数据集)...")

        # DM - Demographics
        dm_dataset = TargetDataset(
            specification_id=sdtm_spec.id,
            dataset_name="DM",
            description="Demographics - 人口学数据集",
            class_type=DatasetClass.SPECIAL_PURPOSE,
            override_type=OverrideType.NONE,
            sort_order=1,
            standard_metadata={
                "structure": "One record per subject",
                "key_variables": ["STUDYID", "USUBJID"],
                "domain": "DM",
            },
            created_by="mock_seeder",
        )
        session.add(dm_dataset)

        # VS - Vital Signs
        vs_dataset = TargetDataset(
            specification_id=sdtm_spec.id,
            dataset_name="VS",
            description="Vital Signs - 生命体征数据集",
            class_type=DatasetClass.FINDINGS,
            override_type=OverrideType.NONE,
            sort_order=2,
            standard_metadata={
                "structure": "One record per vital sign measurement per visit per subject",
                "key_variables": ["STUDYID", "USUBJID", "VSTESTCD", "VISITNUM"],
                "domain": "VS",
            },
            created_by="mock_seeder",
        )
        session.add(vs_dataset)
        await session.flush()

        result["dm_dataset_id"] = dm_dataset.id
        result["vs_dataset_id"] = vs_dataset.id
        print(f"   ✓ DM Dataset 创建成功: ID={dm_dataset.id}")
        print(f"   ✓ VS Dataset 创建成功: ID={vs_dataset.id}")

        # ============================================================
        # 5. 创建 TargetVariable
        # ============================================================
        print("\n🔧 创建 TargetVariable (目标变量)...")

        # DM 变量
        dm_variables = [
            TargetVariable(
                dataset_id=dm_dataset.id,
                variable_name="STUDYID",
                variable_label="Study Identifier",
                description="研究唯一标识符",
                data_type=DataType.CHAR,
                length=12,
                core=VariableCore.REQ,
                origin_type=OriginType.CDISC,
                override_type=OverrideType.NONE,
                sort_order=1,
                standard_metadata={
                    "role": "Identifier",
                    "codelist": None,
                },
                created_by="mock_seeder",
            ),
            TargetVariable(
                dataset_id=dm_dataset.id,
                variable_name="AGE",
                variable_label="Age",
                description="受试者年龄（岁）",
                data_type=DataType.NUM,
                length=8,
                core=VariableCore.REQ,
                origin_type=OriginType.CDISC,  # CDISC 标准定义变量
                override_type=OverrideType.NONE,
                sort_order=2,
                standard_metadata={
                    "role": "Topic",
                    "codelist": None,
                },
                created_by="mock_seeder",
            ),
            TargetVariable(
                dataset_id=dm_dataset.id,
                variable_name="TRT01P",
                variable_label="Planned Treatment for Period 01",
                description="第一治疗期计划治疗分组",
                data_type=DataType.CHAR,
                length=40,
                core=VariableCore.PERM,
                origin_type=OriginType.CDISC,
                override_type=OverrideType.NONE,
                sort_order=3,
                standard_metadata={
                    "role": "Qualifier",
                    "codelist": "TRT01P_CD",
                },
                created_by="mock_seeder",
            ),
        ]

        # VS 变量
        vs_variables = [
            TargetVariable(
                dataset_id=vs_dataset.id,
                variable_name="VSORRES",
                variable_label="Result or Finding in Original Units",
                description="生命体征测量原始结果值",
                data_type=DataType.NUM,
                length=8,
                core=VariableCore.REQ,
                origin_type=OriginType.CDISC,
                override_type=OverrideType.NONE,
                sort_order=1,
                standard_metadata={
                    "role": "Result",
                    "codelist": None,
                },
                created_by="mock_seeder",
            ),
            TargetVariable(
                dataset_id=vs_dataset.id,
                variable_name="VSSTRESC",
                variable_label="Character Result/Finding in Standard Format",
                description="生命体征测量标准字符结果",
                data_type=DataType.CHAR,
                length=200,
                core=VariableCore.PERM,
                origin_type=OriginType.CDISC,
                override_type=OverrideType.NONE,
                sort_order=2,
                standard_metadata={
                    "role": "Result",
                    "codelist": None,
                },
                created_by="mock_seeder",
            ),
        ]

        for var in dm_variables + vs_variables:
            session.add(var)
        await session.flush()

        result["studyid_var_id"] = dm_variables[0].id
        result["age_var_id"] = dm_variables[1].id
        result["trt01p_var_id"] = dm_variables[2].id
        result["vsorres_var_id"] = vs_variables[0].id
        result["vsstresc_var_id"] = vs_variables[1].id

        print(f"   ✓ STUDYID 变量创建成功: ID={dm_variables[0].id}")
        print(f"   ✓ AGE 变量创建成功: ID={dm_variables[1].id}")
        print(f"   ✓ TRT01P 变量创建成功: ID={dm_variables[2].id}")
        print(f"   ✓ VSORRES 变量创建成功: ID={vs_variables[0].id}")
        print(f"   ✓ VSSTRESC 变量创建成功: ID={vs_variables[1].id}")

        # ============================================================
        # 6. 创建 SourceCollection (EDC 表单)
        # ============================================================
        print("\n📋 创建 SourceCollection (EDC 表单)...")

        # Vital Signs CRF
        vs_crf = SourceCollection(
            scope_node_id=study_node.id,
            collection_name="Vital Signs CRF",
            collection_oid="VS_CRF_001",
            description="生命体征数据采集表单 - 包含血压、心率、体温、体重等测量指标",
            source_type=SourceType.EDC,
            source_system="Medidata Rave",
            source_version="2023.1",
            sort_order=1,
            raw_attributes={
                "form_oid": "FORM.VS",
                "visit_name": "Screening",
                "log_type": "standard",
            },
            created_by="mock_seeder",
        )
        session.add(vs_crf)

        # Demographics CRF
        dm_crf = SourceCollection(
            scope_node_id=study_node.id,
            collection_name="Demographics CRF",
            collection_oid="DM_CRF_001",
            description="人口学数据采集表单 - 包含出生日期、性别、种族、民族等信息",
            source_type=SourceType.EDC,
            source_system="Medidata Rave",
            source_version="2023.1",
            sort_order=2,
            raw_attributes={
                "form_oid": "FORM.DM",
                "visit_name": "Screening",
                "log_type": "standard",
            },
            created_by="mock_seeder",
        )
        session.add(dm_crf)
        await session.flush()

        result["vs_crf_id"] = vs_crf.id
        result["dm_crf_id"] = dm_crf.id
        print(f"   ✓ Vital Signs CRF 创建成功: ID={vs_crf.id}")
        print(f"   ✓ Demographics CRF 创建成功: ID={dm_crf.id}")

        # ============================================================
        # 7. 创建 SourceItem (源数据字段)
        # ============================================================
        print("\n📝 创建 SourceItem (源数据字段)...")

        # Vital Signs CRF 字段
        vs_items = [
            SourceItem(
                collection_id=vs_crf.id,
                item_name="VS_RAW_VAL",
                item_oid="ITEM.VS_RAW_VAL",
                item_label="Vital Sign Value",
                description="生命体征测量原始数值",
                data_type="float",
                field_text="Result Value:",  # aCRF 锚点文本
                pdf_coordinates={
                    "page": 3,
                    "x0": 150.5,
                    "y0": 420.3,
                    "x1": 280.2,
                    "y1": 438.7,
                },
                sort_order=1,
                raw_attributes={
                    "control_type": "text",
                    "max_length": 20,
                    "decimal_places": 2,
                },
                created_by="mock_seeder",
            ),
            SourceItem(
                collection_id=vs_crf.id,
                item_name="VS_UNIT",
                item_oid="ITEM.VS_UNIT",
                item_label="Unit of Measure",
                description="测量单位",
                data_type="text",
                field_text="Unit:",  # aCRF 锚点文本
                pdf_coordinates={
                    "page": 3,
                    "x0": 290.0,
                    "y0": 420.3,
                    "x1": 380.5,
                    "y1": 438.7,
                },
                sort_order=2,
                raw_attributes={
                    "control_type": "dropdown",
                    "codelist": "VS_UNIT_CD",
                },
                created_by="mock_seeder",
            ),
            SourceItem(
                collection_id=vs_crf.id,
                item_name="VS_TEST_CD",
                item_oid="ITEM.VS_TEST_CD",
                item_label="Vital Sign Test Code",
                description="生命体征检测项目代码",
                data_type="text",
                field_text="Test Name:",
                pdf_coordinates={
                    "page": 3,
                    "x0": 50.0,
                    "y0": 420.3,
                    "x1": 140.0,
                    "y1": 438.7,
                },
                sort_order=3,
                raw_attributes={
                    "control_type": "dropdown",
                    "codelist": "VSTEST_CD",
                },
                created_by="mock_seeder",
            ),
        ]

        # Demographics CRF 字段
        dm_items = [
            SourceItem(
                collection_id=dm_crf.id,
                item_name="BRTHDAT",
                item_oid="ITEM.BRTHDAT",
                item_label="Date of Birth",
                description="受试者出生日期",
                data_type="date",
                field_text="Birth Date (DD-MMM-YYYY):",
                pdf_coordinates={
                    "page": 2,
                    "x0": 120.0,
                    "y0": 350.0,
                    "x1": 300.0,
                    "y1": 368.0,
                },
                sort_order=1,
                raw_attributes={
                    "control_type": "date",
                    "format": "DD-MMM-YYYY",
                },
                created_by="mock_seeder",
            ),
            SourceItem(
                collection_id=dm_crf.id,
                item_name="AGE_RAW",
                item_oid="ITEM.AGE_RAW",
                item_label="Age at Screening",
                description="筛选时年龄（岁）",
                data_type="integer",
                field_text="Age (years):",
                pdf_coordinates={
                    "page": 2,
                    "x0": 120.0,
                    "y0": 380.0,
                    "x1": 250.0,
                    "y1": 398.0,
                },
                sort_order=2,
                raw_attributes={
                    "control_type": "integer",
                    "min_value": 0,
                    "max_value": 120,
                },
                created_by="mock_seeder",
            ),
            SourceItem(
                collection_id=dm_crf.id,
                item_name="TRT_CODE",
                item_oid="ITEM.TRT_CODE",
                item_label="Treatment Assignment",
                description="治疗分组代码",
                data_type="text",
                field_text="Treatment Group:",
                pdf_coordinates={
                    "page": 2,
                    "x0": 120.0,
                    "y0": 410.0,
                    "x1": 280.0,
                    "y1": 428.0,
                },
                sort_order=3,
                raw_attributes={
                    "control_type": "dropdown",
                    "codelist": "TRT_CD",
                    "values": ["ZL-1310-HIGH", "ZL-1310-LOW", "PLACEBO"],
                },
                created_by="mock_seeder",
            ),
            SourceItem(
                collection_id=dm_crf.id,
                item_name="SEX",
                item_oid="ITEM.SEX",
                item_label="Sex",
                description="受试者性别",
                data_type="text",
                field_text="Sex:",
                pdf_coordinates={
                    "page": 2,
                    "x0": 120.0,
                    "y0": 440.0,
                    "x1": 200.0,
                    "y1": 458.0,
                },
                sort_order=4,
                raw_attributes={
                    "control_type": "radio",
                    "codelist": "SEX_CD",
                    "values": ["M", "F", "U"],
                },
                created_by="mock_seeder",
            ),
        ]

        for item in vs_items + dm_items:
            session.add(item)
        await session.flush()

        result["vs_raw_val_item_id"] = vs_items[0].id
        result["vs_unit_item_id"] = vs_items[1].id
        result["vs_test_cd_item_id"] = vs_items[2].id
        result["brthdat_item_id"] = dm_items[0].id
        result["age_raw_item_id"] = dm_items[1].id
        result["trt_code_item_id"] = dm_items[2].id
        result["sex_item_id"] = dm_items[3].id

        print(f"   ✓ VS_RAW_VAL 字段创建成功: ID={vs_items[0].id}")
        print(f"   ✓ VS_UNIT 字段创建成功: ID={vs_items[1].id}")
        print(f"   ✓ VS_TEST_CD 字段创建成功: ID={vs_items[2].id}")
        print(f"   ✓ BRTHDAT 字段创建成功: ID={dm_items[0].id}")
        print(f"   ✓ AGE_RAW 字段创建成功: ID={dm_items[1].id}")
        print(f"   ✓ TRT_CODE 字段创建成功: ID={dm_items[2].id}")
        print(f"   ✓ SEX 字段创建成功: ID={dm_items[3].id}")

        # ============================================================
        # 8. 提交事务
        # ============================================================
        await session.commit()

        return result


async def main():
    """主函数"""
    print("=" * 60)
    print("🌱 Clinical MDR - Mock Data Seeder")
    print("=" * 60)
    print()

    try:
        result = await seed_mock_data()

        print()
        print("=" * 60)
        print("✅ Mock 数据注入成功!")
        print("=" * 60)
        print()
        print("📊 数据汇总:")
        print("-" * 40)
        print(f"  ScopeNode ID:     {result['scope_node_id']}")
        print(f"  Specification ID: {result['specification_id']}")
        print(f"  DM Dataset ID:    {result['dm_dataset_id']}")
        print(f"  VS Dataset ID:    {result['vs_dataset_id']}")
        print("-" * 40)
        print("  目标变量:")
        print(f"    - STUDYID:  {result['studyid_var_id']}")
        print(f"    - AGE:      {result['age_var_id']}")
        print(f"    - TRT01P:   {result['trt01p_var_id']}")
        print(f"    - VSORRES:  {result['vsorres_var_id']}")
        print(f"    - VSSTRESC: {result['vsstresc_var_id']}")
        print("-" * 40)
        print("  源数据表单:")
        print(f"    - Vital Signs CRF:   {result['vs_crf_id']}")
        print(f"    - Demographics CRF:  {result['dm_crf_id']}")
        print("-" * 40)
        print("  源数据字段:")
        print(f"    - VS_RAW_VAL:  {result['vs_raw_val_item_id']}")
        print(f"    - AGE_RAW:     {result['age_raw_item_id']}")
        print(f"    - TRT_CODE:    {result['trt_code_item_id']}")
        print()
        print("🚀 现在可以测试 API 端点了！")
        print("   示例请求:")
        print(f"   GET /api/v1/mapping-studio/source-items?scope_node_id={result['scope_node_id']}")
        print()

    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())