"""
TFL Data Seeding Script

Populates test TFL (Tables, Figures, Listings) data for the TFL Designer.
Creates a test Analysis scope node with sample ARSDisplay records.

Run:
    cd backend
    python scripts/seed_tfl_data.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.database import async_session_factory
from app.models import ARSDisplay, LifecycleStatus, NodeType, ScopeNode
from app.models.audit_listener import set_audit_context

# Sample TFL Shell Definitions
TFL_SHELLS = [
    {
        "display_id": "Table 14.1.1",
        "display_type": "Table",
        "title": "Demographics",
        "subtitle": "Safety Population",
        "sort_order": 1,
        "display_config": {
            "shellNumber": "Table 14.1.1",
            "title": "Demographics",
            "population": "Safety",
            "category": "Demographics",
            "dataset": "ADSL",
            "columns": [
                {
                    "id": "col1",
                    "label": "Placebo (N=50)",
                    "variable": "PLACEBO"
                },
                {
                    "id": "col2",
                    "label": "Drug X 10mg (N=52)",
                    "variable": "DRUG10"
                },
                {
                    "id": "col3",
                    "label": "Drug X 20mg (N=48)",
                    "variable": "DRUG20"
                },
                {
                    "id": "col4",
                    "label": "Drug X 40mg (N=47)",
                    "variable": "DRUG40"
                },
                {
                    "id": "col5",
                    "label": "Total (N=197)",
                    "variable": "TOTAL"
                }
            ],
            "rows": [
                {
                    "id": "row1",
                    "label": "Age (years)",
                    "level": 0
                },
                {
                    "id": "row1_1",
                    "label": "  n",
                    "level": 1,
                    "stats": [
                        {
                            "type": "n"
                        }
                    ]
                },
                {
                    "id": "row1_2",
                    "label": "  Mean (SD)",
                    "level": 1,
                    "stats": [
                        {
                            "type": "mean"
                        },
                        {
                            "type": "sd"
                        }
                    ]
                },
                {
                    "id": "row2",
                    "label": "Sex, n (%)",
                    "level": 0
                },
                {
                    "id": "row2_1",
                    "label": "  Male",
                    "level": 1,
                    "stats": [
                        {
                            "type": "n_percent"
                        }
                    ]
                },
                {
                    "id": "row2_2",
                    "label": "  Female",
                    "level": 1,
                    "stats": [
                        {
                            "type": "n_percent"
                        }
                    ]
                }
            ],
            "footer": {
                "source": "ADSL",
                "notes": [
                    "Safety Population."
                ]
            }
        }
    },
    {
        "display_id": "Table 14.2.1",
        "display_type": "Table",
        "title": "Summary of Adverse Events",
        "subtitle": "Safety Population",
        "sort_order": 2,
        "display_config": {
            "shellNumber": "Table 14.2.1",
            "title": "Summary of Adverse Events",
            "population": "Safety",
            "category": "Adverse Events",
            "dataset": "ADAE",
            "columns": [
                {
                    "id": "col1",
                    "label": "Placebo (N=50)",
                    "variable": "PLACEBO"
                },
                {
                    "id": "col2",
                    "label": "Drug X 10mg (N=52)",
                    "variable": "DRUG10"
                },
                {
                    "id": "col3",
                    "label": "Drug X 20mg (N=48)",
                    "variable": "DRUG20"
                },
                {
                    "id": "col4",
                    "label": "Drug X 40mg (N=47)",
                    "variable": "DRUG40"
                },
                {
                    "id": "col5",
                    "label": "Total (N=197)",
                    "variable": "TOTAL"
                }
            ],
            "rows": [
                {
                    "id": "row1",
                    "label": "Subjects with any AE, n (%)",
                    "stats": [
                        {
                            "type": "n_percent"
                        }
                    ]
                },
                {
                    "id": "row2",
                    "label": "Subjects with any TEAE, n (%)",
                    "stats": [
                        {
                            "type": "n_percent"
                        }
                    ]
                },
                {
                    "id": "row3",
                    "label": "Subjects with any SAE, n (%)",
                    "stats": [
                        {
                            "type": "n_percent"
                        }
                    ]
                }
            ],
            "footer": {
                "source": "ADAE",
                "notes": [
                    "AE = Adverse Event."
                ]
            }
        }
    },
    {
        "display_id": "Figure 15.1.1",
        "display_type": "Figure",
        "title": "Kaplan-Meier Plot of PFS",
        "subtitle": "ITT Population",
        "sort_order": 3,
        "display_config": {
            "shellNumber": "Figure 15.1.1",
            "title": "Kaplan-Meier Plot",
            "population": "ITT",
            "category": "Efficacy",
            "dataset": "ADSL",
            "figureType": "KM",
            "figureConfig": {
                "type": "kaplan_meier",
                "xAxis": {
                    "label": "Time (Months)"
                },
                "yAxis": {
                    "label": "Probability"
                },
                "strata": [
                    {
                        "name": "Placebo",
                        "color": "#1f77b4"
                    },
                    {
                        "name": "Drug X 10mg",
                        "color": "#ff7f0e"
                    },
                    {
                        "name": "Drug X 20mg",
                        "color": "#2ca02c"
                    },
                    {
                        "name": "Drug X 40mg",
                        "color": "#d62728"
                    }
                ],
                "censorMarks": True,
                "riskTable": True
            },
            "footer": {
                "source": "ADSL, ADTTE"
            }
        }
    },
    {
        "display_id": "Listing 16.1.1",
        "display_type": "Listing",
        "title": "Listing of Adverse Events",
        "subtitle": "Safety Population",
        "sort_order": 4,
        "display_config": {
            "shellNumber": "Listing 16.1.1",
            "title": "Listing of AE",
            "population": "Safety",
            "category": "Adverse Events",
            "dataset": "ADAE",
            "columns": [
                {
                    "id": "col1",
                    "label": "Subject ID",
                    "variable": "USUBJID"
                },
                {
                    "id": "col2",
                    "label": "Site",
                    "variable": "SITEID"
                },
                {
                    "id": "col3",
                    "label": "Treatment",
                    "variable": "TRTA"
                },
                {
                    "id": "col4",
                    "label": "SOC",
                    "variable": "AEBODSYS"
                },
                {
                    "id": "col5",
                    "label": "Preferred Term",
                    "variable": "AEDECOD"
                }
            ],
            "rows": [],
            "sortOrder": [
                {
                    "variable": "SITEID",
                    "direction": "asc"
                }
            ],
            "filterConditions": [
                {
                    "variable": "TRTEMFL",
                    "operator": "=",
                    "value": "Y"
                }
            ],
            "footer": {
                "source": "ADAE"
            }
        }
    }
]


async def seed_tfl_data():
    result = {}
    async with async_session_factory() as session:
        set_audit_context(user_id="tfl_data_seeder", user_name="TFL Data Seeder", context={}, reason="Initialize TFL test data")
        print("Creating Study node...")
        existing_study = await session.execute(select(ScopeNode).where(ScopeNode.code == "STUDY-TEST-001", ScopeNode.is_deleted == False))
        study_node = existing_study.scalar_one_or_none()
        if not study_node:
            study_node = ScopeNode(code="STUDY-TEST-001", name="Test Study for TFL Designer", description="A test study for TFL Designer", node_type=NodeType.STUDY, lifecycle_status=LifecycleStatus.ONGOING, parent_id=None, path=None, depth=0, sort_order=0, extra_attrs={"studyId": "STUDY-TEST-001", "compound": "Test Compound", "phase": "Phase 3"}, created_by="tfl_data_seeder")
            session.add(study_node)
            await session.flush()
            study_node.path = f"/{study_node.id}/"
        result["study_node_id"] = study_node.id
        print(f"  Study Node: ID={study_node.id}")
        print("Creating Analysis node...")
        existing_analysis = await session.execute(select(ScopeNode).where(ScopeNode.code == "ANALYSIS-TEST-001", ScopeNode.is_deleted == False))
        analysis_node = existing_analysis.scalar_one_or_none()
        if not analysis_node:
            analysis_node = ScopeNode(code="ANALYSIS-TEST-001", name="Primary Analysis", description="Primary analysis for CSR", node_type=NodeType.ANALYSIS, lifecycle_status=LifecycleStatus.ONGOING, parent_id=study_node.id, path=None, depth=1, sort_order=0, extra_attrs={"analysisType": "Primary"}, created_by="tfl_data_seeder")
            session.add(analysis_node)
            await session.flush()
            analysis_node.path = f"{study_node.path}{analysis_node.id}/"
        result["analysis_node_id"] = analysis_node.id
        print(f"  Analysis Node: ID={analysis_node.id}")
        print("Creating ARSDisplay records...")
        display_count = 0
        for shell in TFL_SHELLS:
            existing_display = await session.execute(select(ARSDisplay).where(ARSDisplay.scope_node_id == analysis_node.id, ARSDisplay.display_id == shell["display_id"], ARSDisplay.is_deleted == False))
            if existing_display.scalar_one_or_none():
                print(f"  Skipping {shell['display_id']}: already exists")
                continue
            display = ARSDisplay(scope_node_id=analysis_node.id, display_id=shell["display_id"], display_type=shell["display_type"], title=shell["title"], subtitle=shell.get("subtitle"), sort_order=shell["sort_order"], display_config=shell["display_config"], created_by="tfl_data_seeder")
            session.add(display)
            display_count += 1
            print(f"  Created {shell['display_id']}")
        await session.commit()
        print(f"TFL Data Seeding Complete!")
        print(f"  - Study Node ID: {result.get('study_node_id')}")
        print(f"  - Analysis Node ID: {result.get('analysis_node_id')}")
        print(f"  - ARSDisplay records created: {display_count}")
        return result

if __name__ == "__main__":
    asyncio.run(seed_tfl_data())
