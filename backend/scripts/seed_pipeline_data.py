"""
Pipeline Management 种子数据脚本

数据层级：
CDISC -> Global -> TA -> Compound -> Indication -> Study -> Analysis

运行方式：
    python -m scripts.seed_pipeline_data
"""
import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.database import async_session_factory
from app.models import ProgrammingTracker, ScopeNode
from app.models.audit_listener import set_audit_context
from app.models.enums import LifecycleStatus, NodeType
from app.models.mapping_enums import (
    DeliverableType,
    Priority,
    ProdStatus,
    QCMethod,
    QCStatus,
    TrackerStatus,
)


async def seed_pipeline_data() -> dict:
    """
    注入 Pipeline Management 测试数据

    层级结构：
    TA (Oncology, Immunology, Neurology)
      └── Compound (ZL-1310, ZL-1501, ZL-2201, ZL-3101)
          └── Study (ZL-1310-001, ZL-1310-002, ...)
              └── Analysis (Interim Analysis, Final Analysis, ...)
                  └── ProgrammingTracker (SDTM, ADaM, TFL tasks)

    Returns:
        创建的实体 ID 映射
    """
    result = {
        "tas": [],
        "compounds": [],
        "studies": [],
        "analyses": [],
        "trackers": [],
    }

    async with async_session_factory() as session:
        # ============================================================
        # 1. 设置审计上下文
        # ============================================================
        set_audit_context(
            user_id="pipeline_seeder",
            user_name="Pipeline Data Seeder",
            context={"operation": "seed_pipeline", "source": "script"},
            reason="初始化 Pipeline Management 测试数据",
        )

        # ============================================================
        # 2. 创建 TA 节点
        # ============================================================
        print("📌 创建 TA (Therapeutic Area) 节点...")

        ta_data = [
            {
                "code": "ONC",
                "name": "Oncology",
                "description": "肿瘤治疗领域",
            },
            {
                "code": "IMM",
                "name": "Immunology",
                "description": "免疫治疗领域",
            },
            {
                "code": "NEU",
                "name": "Neurology",
                "description": "神经科学领域",
            },
        ]

        ta_nodes = []
        for i, ta in enumerate(ta_data):
            node = ScopeNode(
                code=ta["code"],
                name=ta["name"],
                description=ta["description"],
                node_type=NodeType.TA,
                lifecycle_status=LifecycleStatus.ONGOING,
                parent_id=None,
                depth=0,
                sort_order=i + 1,
                created_by="pipeline_seeder",
            )
            session.add(node)
            await session.flush()
            node.path = f"/{node.id}/"
            ta_nodes.append(node)
            result["tas"].append({"id": node.id, "code": node.code, "name": node.name})
            print(f"   ✓ TA 创建成功: {node.code} - {node.name} (ID={node.id})")

        # ============================================================
        # 3. 创建 Compound 节点
        # ============================================================
        print("\n💊 创建 Compound (Product) 节点...")

        compound_data = [
            # Oncology compounds
            {
                "code": "ZL1310",
                "name": "ZL-1310",
                "description": "EGFR-Targeted ADC for Non-Small Cell Lung Cancer",
                "ta_index": 0,
            },
            {
                "code": "ZL1501",
                "name": "ZL-1501",
                "description": "PD-L1 Inhibitor for Triple-Negative Breast Cancer",
                "ta_index": 0,
            },
            {
                "code": "ZL1201",
                "name": "ZL-1201",
                "description": "DLL3-Targeted ADC for Small Cell Lung Cancer",
                "ta_index": 0,
            },
            # Immunology compounds
            {
                "code": "ZL2201",
                "name": "ZL-2201",
                "description": "IL-6 Receptor Antagonist for Rheumatoid Arthritis",
                "ta_index": 1,
            },
            {
                "code": "ZL2301",
                "name": "ZL-2301",
                "description": "IL-17A Inhibitor for Psoriasis",
                "ta_index": 1,
            },
            # Neurology compounds
            {
                "code": "ZL3101",
                "name": "ZL-3101",
                "description": "Amyloid Beta Antibody for Alzheimer's Disease",
                "ta_index": 2,
            },
        ]

        compound_nodes = []
        for i, compound in enumerate(compound_data):
            parent_ta = ta_nodes[compound["ta_index"]]
            node = ScopeNode(
                code=compound["code"],
                name=compound["name"],
                description=compound["description"],
                node_type=NodeType.COMPOUND,
                lifecycle_status=LifecycleStatus.ONGOING,
                parent_id=parent_ta.id,
                depth=1,
                sort_order=i + 1,
                created_by="pipeline_seeder",
            )
            session.add(node)
            await session.flush()
            node.path = f"{parent_ta.path}{node.id}/"
            compound_nodes.append(node)
            result["compounds"].append({
                "id": node.id,
                "code": node.code,
                "name": node.name,
                "parent_ta": parent_ta.code,
            })
            print(f"   ✓ Compound 创建成功: {node.code} - {node.name} (ID={node.id})")

        # ============================================================
        # 4. 创建 Study 节点
        # ============================================================
        print("\n🔬 创建 Study 节点...")

        study_data = [
            # ZL-1310 studies
            {
                "code": "ZL-1310-001",
                "name": "ZL-1310-001 Phase II Study",
                "description": "A Phase II Study of ZL-1310 in Advanced NSCLC",
                "compound_index": 0,
                "phase": "Phase II",
                "protocol_number": "PROTO-2023-001",
            },
            {
                "code": "ZL-1310-002",
                "name": "ZL-1310-002 Phase III Study",
                "description": "A Phase III Study of ZL-1310 vs Standard of Care",
                "compound_index": 0,
                "phase": "Phase III",
                "protocol_number": "PROTO-2024-001",
            },
            {
                "code": "ZL-1310-101",
                "name": "ZL-1310-101 Phase I Study",
                "description": "A Phase I Dose-Escalation Study",
                "compound_index": 0,
                "phase": "Phase I",
                "protocol_number": "PROTO-2022-001",
            },
            # ZL-1501 studies
            {
                "code": "ZL-1501-001",
                "name": "ZL-1501-001 Phase II Study",
                "description": "A Phase II Study of ZL-1501 in TNBC",
                "compound_index": 1,
                "phase": "Phase II",
                "protocol_number": "PROTO-2023-005",
            },
            # ZL-1201 studies
            {
                "code": "ZL-1201-001",
                "name": "ZL-1201-001 Phase I/II Study",
                "description": "A Phase I/II Study in SCLC",
                "compound_index": 2,
                "phase": "Phase I/II",
                "protocol_number": "PROTO-2024-003",
            },
            # ZL-2201 studies
            {
                "code": "ZL-2201-001",
                "name": "ZL-2201-001 Phase III Study",
                "description": "A Phase III Study in Rheumatoid Arthritis",
                "compound_index": 3,
                "phase": "Phase III",
                "protocol_number": "PROTO-2023-008",
            },
            # ZL-3101 studies
            {
                "code": "ZL-3101-001",
                "name": "ZL-3101-001 Phase III Study",
                "description": "A Phase III Study in Early Alzheimer's Disease",
                "compound_index": 5,
                "phase": "Phase III",
                "protocol_number": "PROTO-2023-012",
            },
        ]

        study_nodes = []
        for i, study in enumerate(study_data):
            parent_compound = compound_nodes[study["compound_index"]]
            node = ScopeNode(
                code=study["code"],
                name=study["name"],
                description=study["description"],
                node_type=NodeType.STUDY,
                lifecycle_status=LifecycleStatus.ONGOING,
                parent_id=parent_compound.id,
                depth=2,
                sort_order=i + 1,
                extra_attrs={
                    "phase": study["phase"],
                    "protocol_number": study["protocol_number"],
                },
                created_by="pipeline_seeder",
            )
            session.add(node)
            await session.flush()
            node.path = f"{parent_compound.path}{node.id}/"
            study_nodes.append(node)
            result["studies"].append({
                "id": node.id,
                "code": node.code,
                "name": node.name,
                "parent_compound": parent_compound.code,
            })
            print(f"   ✓ Study 创建成功: {node.code} (ID={node.id})")

        # ============================================================
        # 5. 创建 Analysis 节点
        # ============================================================
        print("\n📊 创建 Analysis 节点...")

        analysis_data = [
            # ZL-1310-001 analyses
            {
                "code": "ANALYSIS-001",
                "name": "Interim Analysis 1",
                "description": "First interim analysis for safety and efficacy",
                "study_index": 0,
                "type": "Interim",
                "locked": True,
            },
            {
                "code": "ANALYSIS-002",
                "name": "Final Analysis",
                "description": "Primary efficacy analysis",
                "study_index": 0,
                "type": "Primary",
                "locked": False,
            },
            {
                "code": "ANALYSIS-003",
                "name": "Safety Update",
                "description": "Quarterly safety data update",
                "study_index": 0,
                "type": "Safety",
                "locked": False,
            },
            # ZL-1310-002 analyses
            {
                "code": "ANALYSIS-004",
                "name": "Interim Analysis 1",
                "description": "First planned interim for efficacy",
                "study_index": 1,
                "type": "Interim",
                "locked": False,
            },
            # ZL-1310-101 analyses
            {
                "code": "ANALYSIS-005",
                "name": "Primary Analysis",
                "description": "Primary analysis for Phase I",
                "study_index": 2,
                "type": "Primary",
                "locked": True,
            },
            # ZL-1501-001 analyses
            {
                "code": "ANALYSIS-006",
                "name": "Interim Analysis",
                "description": "First interim for TNBC study",
                "study_index": 3,
                "type": "Interim",
                "locked": False,
            },
            # ZL-2201-001 analyses
            {
                "code": "ANALYSIS-007",
                "name": "Interim Analysis 1",
                "description": "First interim analysis for RA study",
                "study_index": 5,
                "type": "Interim",
                "locked": True,
            },
            {
                "code": "ANALYSIS-008",
                "name": "Interim Analysis 2",
                "description": "Second interim analysis",
                "study_index": 5,
                "type": "Interim",
                "locked": False,
            },
            # ZL-3101-001 analyses
            {
                "code": "ANALYSIS-009",
                "name": "Interim Analysis 1",
                "description": "First interim for Alzheimer's study",
                "study_index": 6,
                "type": "Interim",
                "locked": False,
            },
        ]

        analysis_nodes = []
        for i, analysis in enumerate(analysis_data):
            parent_study = study_nodes[analysis["study_index"]]
            node = ScopeNode(
                code=analysis["code"],
                name=analysis["name"],
                description=analysis["description"],
                node_type=NodeType.ANALYSIS,
                lifecycle_status=LifecycleStatus.ONGOING if not analysis["locked"] else LifecycleStatus.COMPLETED,
                parent_id=parent_study.id,
                depth=3,
                sort_order=i + 1,
                extra_attrs={
                    "analysis_type": analysis["type"],
                    "locked": analysis["locked"],
                },
                created_by="pipeline_seeder",
            )
            session.add(node)
            await session.flush()
            node.path = f"{parent_study.path}{node.id}/"
            analysis_nodes.append(node)
            result["analyses"].append({
                "id": node.id,
                "code": node.code,
                "name": node.name,
                "parent_study": parent_study.code,
            })
            print(f"   ✓ Analysis 创建成功: {node.code} - {node.name} (ID={node.id})")

        # ============================================================
        # 6. 创建 ProgrammingTracker 任务数据
        # ============================================================
        print("\n📋 创建 ProgrammingTracker 任务数据...")

        # 为第一个 Analysis 创建详细的 Tracker 任务
        analysis_1 = analysis_nodes[0]  # Interim Analysis 1

        tracker_tasks = [
            # SDTM Tasks
            {
                "deliverable_type": DeliverableType.SDTM,
                "deliverable_name": "DM",
                "task_name": "DM Dataset Programming",
                "description": "Demographics dataset programming",
                "prod_status": ProdStatus.COMPLETED,
                "qc_status": QCStatus.PASSED,
                "priority": Priority.HIGH,
                "execution_order": 1,
                "prod_programmer_id": "john.doe",
                "qc_programmer_id": "jane.smith",
                "prod_program_name": "dm.sas",
                "qc_program_name": "v_dm.sas",
                "output_file_name": "dm.sas7bdat",
                "due_date": datetime.utcnow() - timedelta(days=30),
            },
            {
                "deliverable_type": DeliverableType.SDTM,
                "deliverable_name": "AE",
                "task_name": "AE Dataset Programming",
                "description": "Adverse Events dataset programming",
                "prod_status": ProdStatus.COMPLETED,
                "qc_status": QCStatus.PASSED,
                "priority": Priority.HIGH,
                "execution_order": 2,
                "prod_programmer_id": "john.doe",
                "qc_programmer_id": "jane.smith",
                "prod_program_name": "ae.sas",
                "qc_program_name": "v_ae.sas",
                "output_file_name": "ae.sas7bdat",
                "due_date": datetime.utcnow() - timedelta(days=28),
            },
            {
                "deliverable_type": DeliverableType.SDTM,
                "deliverable_name": "LB",
                "task_name": "LB Dataset Programming",
                "description": "Laboratory dataset programming",
                "prod_status": ProdStatus.READY_FOR_QC,
                "qc_status": QCStatus.IN_PROGRESS,
                "priority": Priority.MEDIUM,
                "execution_order": 3,
                "prod_programmer_id": "bob.wilson",
                "qc_programmer_id": "jane.smith",
                "prod_program_name": "lb.sas",
                "qc_program_name": "v_lb.sas",
                "output_file_name": "lb.sas7bdat",
                "due_date": datetime.utcnow() - timedelta(days=25),
            },
            # ADaM Tasks
            {
                "deliverable_type": DeliverableType.ADAM,
                "deliverable_name": "ADSL",
                "task_name": "ADSL Dataset Programming",
                "description": "Subject Level Analysis Dataset",
                "prod_status": ProdStatus.COMPLETED,
                "qc_status": QCStatus.PASSED,
                "priority": Priority.HIGH,
                "execution_order": 10,
                "prod_programmer_id": "alice.chen",
                "qc_programmer_id": "david.lee",
                "prod_program_name": "adsl.sas",
                "qc_program_name": "v_adsl.sas",
                "output_file_name": "adsl.sas7bdat",
                "due_date": datetime.utcnow() - timedelta(days=20),
            },
            {
                "deliverable_type": DeliverableType.ADAM,
                "deliverable_name": "ADAE",
                "task_name": "ADAE Dataset Programming",
                "description": "Adverse Events Analysis Dataset",
                "prod_status": ProdStatus.PROGRAMMING,
                "qc_status": QCStatus.NOT_STARTED,
                "priority": Priority.HIGH,
                "execution_order": 11,
                "prod_programmer_id": "alice.chen",
                "qc_programmer_id": "david.lee",
                "prod_program_name": "adae.sas",
                "qc_program_name": "v_adae.sas",
                "output_file_name": "adae.sas7bdat",
                "due_date": datetime.utcnow() + timedelta(days=5),
            },
            {
                "deliverable_type": DeliverableType.ADAM,
                "deliverable_name": "ADLB",
                "task_name": "ADLB Dataset Programming",
                "description": "Laboratory Analysis Dataset",
                "prod_status": ProdStatus.NOT_STARTED,
                "qc_status": QCStatus.NOT_STARTED,
                "priority": Priority.MEDIUM,
                "execution_order": 12,
                "prod_programmer_id": None,
                "qc_programmer_id": None,
                "prod_program_name": None,
                "qc_program_name": None,
                "output_file_name": "adlb.sas7bdat",
                "due_date": datetime.utcnow() + timedelta(days=10),
            },
            # TFL Tasks
            {
                "deliverable_type": DeliverableType.TFL,
                "deliverable_name": "Table 14.1.1",
                "task_name": "Demographics Summary Table",
                "description": "Subject Demographics and Baseline Characteristics",
                "prod_status": ProdStatus.COMPLETED,
                "qc_status": QCStatus.PASSED,
                "priority": Priority.HIGH,
                "execution_order": 20,
                "prod_programmer_id": "sarah.jones",
                "qc_programmer_id": "mike.brown",
                "prod_program_name": "t_14_1_1.sas",
                "qc_program_name": "v_t_14_1_1.sas",
                "output_file_name": "t_14_1_1.rtf",
                "due_date": datetime.utcnow() - timedelta(days=15),
                "tfl_metadata": {
                    "output_number": "14.1.1",
                    "title": "Subject Demographics and Baseline Characteristics",
                    "population": "SAF",
                },
            },
            {
                "deliverable_type": DeliverableType.TFL,
                "deliverable_name": "Table 14.1.2",
                "task_name": "Disposition Table",
                "description": "Subject Disposition",
                "prod_status": ProdStatus.READY_FOR_QC,
                "qc_status": QCStatus.ISSUES_FOUND,
                "priority": Priority.HIGH,
                "execution_order": 21,
                "prod_programmer_id": "sarah.jones",
                "qc_programmer_id": "mike.brown",
                "prod_program_name": "t_14_1_2.sas",
                "qc_program_name": "v_t_14_1_2.sas",
                "output_file_name": "t_14_1_2.rtf",
                "due_date": datetime.utcnow() - timedelta(days=10),
                "tfl_metadata": {
                    "output_number": "14.1.2",
                    "title": "Subject Disposition",
                    "population": "SAF",
                },
            },
            {
                "deliverable_type": DeliverableType.TFL,
                "deliverable_name": "Table 14.2.1",
                "task_name": "Primary Efficacy Table",
                "description": "Primary Efficacy Endpoint Results",
                "prod_status": ProdStatus.PROGRAMMING,
                "qc_status": QCStatus.NOT_STARTED,
                "priority": Priority.HIGH,
                "execution_order": 22,
                "prod_programmer_id": "sarah.jones",
                "qc_programmer_id": "mike.brown",
                "prod_program_name": "t_14_2_1.sas",
                "qc_program_name": "v_t_14_2_1.sas",
                "output_file_name": "t_14_2_1.rtf",
                "due_date": datetime.utcnow() + timedelta(days=3),
                "tfl_metadata": {
                    "output_number": "14.2.1",
                    "title": "Primary Efficacy Endpoint Results",
                    "population": "PPS",
                },
            },
            {
                "deliverable_type": DeliverableType.TFL,
                "deliverable_name": "Figure 14.3.1",
                "task_name": "Kaplan-Meier Plot",
                "description": "Kaplan-Meier Plot for Overall Survival",
                "prod_status": ProdStatus.NOT_STARTED,
                "qc_status": QCStatus.NOT_STARTED,
                "priority": Priority.MEDIUM,
                "execution_order": 23,
                "prod_programmer_id": None,
                "qc_programmer_id": None,
                "prod_program_name": None,
                "qc_program_name": None,
                "output_file_name": "f_14_3_1.rtf",
                "due_date": datetime.utcnow() + timedelta(days=7),
                "tfl_metadata": {
                    "output_number": "14.3.1",
                    "title": "Kaplan-Meier Plot for Overall Survival",
                    "population": "PPS",
                },
            },
        ]

        for task in tracker_tasks:
            # 根据状态计算 TrackerStatus (旧版兼容)
            if task["prod_status"] == ProdStatus.COMPLETED and task["qc_status"] == QCStatus.PASSED:
                tracker_status = TrackerStatus.PASSED
            elif task["qc_status"] == QCStatus.ISSUES_FOUND:
                tracker_status = TrackerStatus.FAILED
            elif task["qc_status"] == QCStatus.IN_PROGRESS:
                tracker_status = TrackerStatus.QC_IN_PROGRESS
            elif task["prod_status"] == ProdStatus.READY_FOR_QC:
                tracker_status = TrackerStatus.READY_FOR_QC
            elif task["prod_status"] == ProdStatus.PROGRAMMING:
                tracker_status = TrackerStatus.PROGRAMMING
            else:
                tracker_status = TrackerStatus.NOT_STARTED

            tracker = ProgrammingTracker(
                analysis_id=analysis_1.id,
                deliverable_type=task["deliverable_type"],
                deliverable_name=task["deliverable_name"],
                task_name=task["task_name"],
                description=task["description"],
                prod_programmer_id=task["prod_programmer_id"],
                qc_programmer_id=task["qc_programmer_id"],
                prod_status=task["prod_status"],
                qc_status=task["qc_status"],
                status=tracker_status,
                priority=task["priority"],
                execution_order=task["execution_order"],
                qc_method=QCMethod.DOUBLE_PROGRAMMING,
                due_date=task["due_date"],
                prod_program_name=task["prod_program_name"],
                qc_program_name=task["qc_program_name"],
                output_file_name=task["output_file_name"],
                tfl_metadata=task.get("tfl_metadata"),
                delivery_batch="Batch 1",
                created_by="pipeline_seeder",
            )
            session.add(tracker)
            await session.flush()
            result["trackers"].append({
                "id": tracker.id,
                "deliverable_type": tracker.deliverable_type.value,
                "deliverable_name": tracker.deliverable_name,
                "prod_status": tracker.prod_status.value,
                "qc_status": tracker.qc_status.value,
            })
            print(f"   ✓ Tracker 创建成功: [{tracker.deliverable_type.value}] {tracker.deliverable_name}")

        # 为其他 Analysis 创建一些基础 Tracker
        print("\n   为其他 Analysis 创建基础 Tracker...")

        # Analysis 2 (Final Analysis) - 未开始状态
        analysis_2 = analysis_nodes[1]
        for i, dataset in enumerate(["DM", "AE", "ADSL"]):
            tracker = ProgrammingTracker(
                analysis_id=analysis_2.id,
                deliverable_type=DeliverableType.SDTM if i < 2 else DeliverableType.ADAM,
                deliverable_name=dataset,
                task_name=f"{dataset} Dataset Programming",
                description=f"{dataset} dataset for final analysis",
                prod_status=ProdStatus.NOT_STARTED,
                qc_status=QCStatus.NOT_STARTED,
                status=TrackerStatus.NOT_STARTED,
                priority=Priority.MEDIUM,
                execution_order=i + 1,
                qc_method=QCMethod.DOUBLE_PROGRAMMING,
                created_by="pipeline_seeder",
            )
            session.add(tracker)
            await session.flush()
            result["trackers"].append({
                "id": tracker.id,
                "deliverable_type": tracker.deliverable_type.value,
                "deliverable_name": tracker.deliverable_name,
            })

        # Analysis 4 (ZL-1310-002 Interim) - 编程中状态
        analysis_4 = analysis_nodes[3]
        tracker = ProgrammingTracker(
            analysis_id=analysis_4.id,
            deliverable_type=DeliverableType.SDTM,
            deliverable_name="DM",
            task_name="DM Dataset Programming",
            description="Demographics dataset for interim analysis",
            prod_status=ProdStatus.PROGRAMMING,
            qc_status=QCStatus.NOT_STARTED,
            status=TrackerStatus.PROGRAMMING,
            priority=Priority.HIGH,
            execution_order=1,
            qc_method=QCMethod.DOUBLE_PROGRAMMING,
            prod_programmer_id="john.doe",
            created_by="pipeline_seeder",
        )
        session.add(tracker)
        await session.flush()
        result["trackers"].append({
            "id": tracker.id,
            "deliverable_type": tracker.deliverable_type.value,
            "deliverable_name": tracker.deliverable_name,
        })

        # ============================================================
        # 7. 提交事务
        # ============================================================
        await session.commit()

        return result


async def main():
    """主函数"""
    print("=" * 60)
    print("🌱 Clinical MDR - Pipeline Data Seeder")
    print("=" * 60)
    print()

    try:
        result = await seed_pipeline_data()

        print()
        print("=" * 60)
        print("✅ Pipeline 数据注入成功!")
        print("=" * 60)
        print()
        print("📊 数据汇总:")
        print("-" * 40)
        print(f"  TA (Therapeutic Areas):  {len(result['tas'])}")
        for ta in result['tas']:
            print(f"    - {ta['code']}: {ta['name']} (ID={ta['id']})")
        print()
        print(f"  Compounds:               {len(result['compounds'])}")
        for compound in result['compounds'][:3]:
            print(f"    - {compound['code']}: {compound['name']} (TA={compound['parent_ta']})")
        print(f"    ... and {len(result['compounds']) - 3} more")
        print()
        print(f"  Studies:                 {len(result['studies'])}")
        for study in result['studies'][:3]:
            print(f"    - {study['code']} (Compound={study['parent_compound']})")
        print(f"    ... and {len(result['studies']) - 3} more")
        print()
        print(f"  Analyses:                {len(result['analyses'])}")
        for analysis in result['analyses'][:3]:
            print(f"    - {analysis['code']}: {analysis['name']}")
        print(f"    ... and {len(result['analyses']) - 3} more")
        print()
        print(f"  Programming Trackers:    {len(result['trackers'])}")
        print("-" * 40)
        print()
        print("🚀 现在可以测试 Pipeline Management API 端点了!")
        print()
        print("   示例请求:")
        if result['analyses']:
            print(f"   GET /api/v1/trackers?analysis_id={result['analyses'][0]['id']}")
        print()

    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())