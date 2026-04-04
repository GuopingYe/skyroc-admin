"""
Pipeline Management API Schemas
"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# Request Schemas
# ============================================================

class TherapeuticAreaCreate(BaseModel):
    name: str
    code: str
    description: str | None = None

class TherapeuticAreaUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    status: str | None = None

class StudyConfigUpdate(BaseModel):
    sdtm_model_version: str | None = None
    sdtm_ig_version: str | None = None
    adam_model_version: str | None = None
    adam_ig_version: str | None = None
    meddra_version: str | None = None
    whodrug_version: str | None = None
    protocol_title: str | None = None
    phase: str | None = None

class NodeArchiveRequest(BaseModel):
    status: str  # "Active" or "Archived"

class MilestoneCreate(BaseModel):
    name: str
    study_id: str
    analysis_id: str | None = None
    level: str  # "Study" or "Analysis"
    preset_type: str = "CUSTOM"
    planned_date: str | None = None
    actual_date: str | None = None
    status: str = "Pending"
    assignee: str | None = None
    comment: str | None = None

class MilestoneUpdate(BaseModel):
    name: str | None = None
    planned_date: str | None = None
    actual_date: str | None = None
    status: str | None = None
    assignee: str | None = None
    comment: str | None = None

class NodeCreate(BaseModel):
    title: str
    node_type: str  # "TA", "COMPOUND", "STUDY", "ANALYSIS"
    parent_id: str | None = None
    phase: str | None = None
    protocol_title: str | None = None
    description: str | None = None
    # Spec initialization (study nodes only)
    create_spec: bool = False
    spec_init_method: str | None = None  # "build" | "copy_study" | "copy_analysis"
    copy_from_spec_id: int | None = None  # spec id to copy from (copy_study/copy_analysis)
    # Analysis node: domain exclusions on creation
    excluded_dataset_names: list[str] = []


# ============================================================
# Response Wrapper 
# ============================================================

class SuccessResponse(BaseModel):
    code: str = "0000"
    msg: str = "success"
    data: Any = None
