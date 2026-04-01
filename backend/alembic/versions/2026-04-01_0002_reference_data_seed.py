"""Seed reference data for all categories

Revision ID: ref_data_seed_001
Revises: ref_data_001
Create Date: 2026-04-01 00:02:00.000000+00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "ref_data_seed_001"
down_revision: Union[str, None] = "ref_data_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED_DATA = {
    "POPULATION": [
        {"code": "Safety", "label": "Safety", "sort_order": 1},
        {"code": "ITT", "label": "Intent-to-Treat", "sort_order": 2},
        {"code": "FAS", "label": "Full Analysis Set", "sort_order": 3},
        {"code": "PPS", "label": "Per-Protocol Set", "sort_order": 4},
        {"code": "Efficacy", "label": "Efficacy", "sort_order": 5},
        {"code": "All Enrolled", "label": "All Enrolled", "sort_order": 6},
    ],
    "SDTM_DOMAIN": [
        {"code": "DM", "label": "Demographics", "sort_order": 1},
        {"code": "AE", "label": "Adverse Events", "sort_order": 2},
        {"code": "VS", "label": "Vital Signs", "sort_order": 3},
        {"code": "LB", "label": "Laboratory", "sort_order": 4},
        {"code": "EX", "label": "Exposure", "sort_order": 5},
        {"code": "CM", "label": "Concomitant Medications", "sort_order": 6},
        {"code": "DS", "label": "Disposition", "sort_order": 7},
        {"code": "EG", "label": "ECG", "sort_order": 8},
        {"code": "PE", "label": "Physical Examination", "sort_order": 9},
        {"code": "MH", "label": "Medical History", "sort_order": 10},
    ],
    "ADAM_DATASET": [
        {"code": "ADSL", "label": "Subject-Level Analysis Dataset", "sort_order": 1},
        {"code": "ADAE", "label": "Adverse Events Analysis Dataset", "sort_order": 2},
        {"code": "ADLB", "label": "Laboratory Analysis Dataset", "sort_order": 3},
        {"code": "ADVS", "label": "Vital Signs Analysis Dataset", "sort_order": 4},
        {"code": "ADTTE", "label": "Time-to-Event Analysis Dataset", "sort_order": 5},
        {"code": "ADRS", "label": "Response Analysis Dataset", "sort_order": 6},
        {"code": "ADEFF", "label": "Efficacy Analysis Dataset", "sort_order": 7},
        {"code": "ADCM", "label": "Concomitant Medications Analysis Dataset", "sort_order": 8},
    ],
    "STUDY_PHASE": [
        {"code": "Phase_I", "label": "Phase I", "sort_order": 1},
        {"code": "Phase_I_II", "label": "Phase I/II", "sort_order": 2},
        {"code": "Phase_II", "label": "Phase II", "sort_order": 3},
        {"code": "Phase_II_III", "label": "Phase II/III", "sort_order": 4},
        {"code": "Phase_III", "label": "Phase III", "sort_order": 5},
        {"code": "Phase_IV", "label": "Phase IV", "sort_order": 6},
    ],
    "STAT_TYPE": [
        {"code": "n", "label": "n (Count)", "sort_order": 1},
        {"code": "Mean", "label": "Mean", "sort_order": 2},
        {"code": "SD", "label": "Standard Deviation", "sort_order": 3},
        {"code": "Median", "label": "Median", "sort_order": 4},
        {"code": "Min", "label": "Minimum", "sort_order": 5},
        {"code": "Max", "label": "Maximum", "sort_order": 6},
        {"code": "Range", "label": "Range", "sort_order": 7},
        {"code": "n_pct", "label": "n (%)", "sort_order": 8},
        {"code": "Header_Row", "label": "Header Row", "sort_order": 9},
    ],
    "DISPLAY_TYPE": [
        {"code": "Table", "label": "Table", "sort_order": 1},
        {"code": "Figure", "label": "Figure", "sort_order": 2},
        {"code": "Listing", "label": "Listing", "sort_order": 3},
    ],
    "ANALYSIS_CATEGORY": [
        {"code": "Demographics", "label": "Demographics", "sort_order": 1},
        {"code": "Baseline", "label": "Baseline Characteristics", "sort_order": 2},
        {"code": "Disposition", "label": "Disposition", "sort_order": 3},
        {"code": "Treatment_Compliance", "label": "Treatment Compliance", "sort_order": 4},
        {"code": "Protocol_Deviations", "label": "Protocol Deviations", "sort_order": 5},
        {"code": "Adverse_Events", "label": "Adverse Events", "sort_order": 6},
        {"code": "Laboratory", "label": "Laboratory", "sort_order": 7},
        {"code": "Vital_Signs_Visits", "label": "Vital Signs by Visit", "sort_order": 8},
        {"code": "ECG_Visits", "label": "ECG by Visit", "sort_order": 9},
        {"code": "Efficacy", "label": "Efficacy", "sort_order": 10},
        {"code": "Other", "label": "Other", "sort_order": 11},
    ],
    "THERAPEUTIC_AREA": [
        {"code": "Oncology", "label": "Oncology", "sort_order": 1},
        {"code": "Cardiovascular", "label": "Cardiovascular", "sort_order": 2},
        {"code": "Immunology", "label": "Immunology", "sort_order": 3},
        {"code": "Neuroscience", "label": "Neuroscience", "sort_order": 4},
        {"code": "Rare_Disease", "label": "Rare Disease", "sort_order": 5},
    ],
    "REGULATORY_AGENCY": [
        {"code": "FDA", "label": "FDA", "sort_order": 1},
        {"code": "EMA", "label": "EMA", "sort_order": 2},
        {"code": "PMDA", "label": "PMDA", "sort_order": 3},
        {"code": "NMPA", "label": "NMPA", "sort_order": 4},
        {"code": "Health_Canada", "label": "Health Canada", "sort_order": 5},
    ],
    "CONTROL_TYPE": [
        {"code": "Placebo", "label": "Placebo", "sort_order": 1},
        {"code": "Active_Comparator", "label": "Active Comparator", "sort_order": 2},
        {"code": "Dose_Response", "label": "Dose-Response", "sort_order": 3},
        {"code": "No_Control", "label": "No Control", "sort_order": 4},
    ],
    "BLINDING_STATUS": [
        {"code": "Double_Blind", "label": "Double-Blind", "sort_order": 1},
        {"code": "Single_Blind", "label": "Single-Blind", "sort_order": 2},
        {"code": "Open_Label", "label": "Open-Label", "sort_order": 3},
        {"code": "Triple_Blind", "label": "Triple-Blind", "sort_order": 4},
    ],
    "STUDY_DESIGN": [
        {"code": "Parallel", "label": "Parallel", "sort_order": 1},
        {"code": "Crossover", "label": "Crossover", "sort_order": 2},
        {"code": "Factorial", "label": "Factorial", "sort_order": 3},
        {"code": "Adaptive", "label": "Adaptive", "sort_order": 4},
        {"code": "Cohort", "label": "Cohort", "sort_order": 5},
    ],
}


def upgrade() -> None:
    conn = op.get_bind()
    for category, items in SEED_DATA.items():
        for item in items:
            conn.execute(
                sa.text(
                    "INSERT INTO reference_data (category, code, label, sort_order, is_active, is_deleted) "
                    "VALUES (:category, :code, :label, :sort_order, true, false) "
                    "ON CONFLICT DO NOTHING"
                ),
                {
                    "category": category,
                    "code": item["code"],
                    "label": item["label"],
                    "sort_order": item["sort_order"],
                },
            )


def downgrade() -> None:
    conn = op.get_bind()
    categories = list(SEED_DATA.keys())
    conn.execute(
        sa.text("DELETE FROM reference_data WHERE category = ANY(:categories)"),
        {"categories": categories},
    )
