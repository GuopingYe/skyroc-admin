# Reference Data Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 8+ hardcoded mock data files with a generic reference data backend API and admin UI, enabling runtime configuration without frontend redeployment.

**Architecture:** Single `reference_data` table with a `category` enum column. One set of CRUD endpoints at `/api/v1/reference-data`. Frontend uses React Query hooks with fallback to hardcoded defaults during migration. All operations tracked by existing audit trail (21 CFR Part 11).

**Tech Stack:** Backend: FastAPI / SQLAlchemy 2.0 async / Alembic / PostgreSQL. Frontend: React 18 / TypeScript / Ant Design `Table` / TanStack React Query / elegant-router.

**Spec:** `docs/superpowers/specs/2026-04-01-reference-data-management-design.md`

---

## File Structure

### Backend (create/modify)

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `backend/app/models/reference_data.py` | Model + enum definition |
| Modify | `backend/app/models/enums.py` | Add `ReferenceDataCategory` enum |
| Modify | `backend/app/models/__init__.py` | Export new model + enum |
| Create | `backend/app/schemas/reference_data.py` | Pydantic request/response schemas |
| Create | `backend/app/api/routers/reference_data.py` | CRUD endpoints |
| Modify | `backend/app/api/routers/__init__.py` | Export new router |
| Modify | `backend/app/main.py` | Register router |
| Create | `backend/alembic/versions/2026-04-01_0001_reference_data.py` | Table migration |
| Create | `backend/alembic/versions/2026-04-01_0002_reference_data_seed.py` | Seed data |
| Create | `backend/alembic/versions/2026-04-01_0003_reference_data_rbac_seed.py` | RBAC permission seeds |
| Create | `backend/tests/test_reference_data.py` | Backend tests |

### Frontend (create/modify)

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/service/urls/reference-data.ts` | API URL constants |
| Create | `frontend/src/service/types/reference-data.d.ts` | TypeScript type declarations |
| Create | `frontend/src/service/api/reference-data.ts` | API fetch functions |
| Modify | `frontend/src/service/api/index.ts` | Re-export |
| Modify | `frontend/src/service/urls/index.ts` | Re-export |
| Modify | `frontend/src/service/keys/index.ts` | Query keys |
| Create | `frontend/src/service/hooks/useReferenceData.ts` | React Query hooks |
| Modify | `frontend/src/service/hooks/index.ts` | Re-export |
| Create | `frontend/src/pages/(base)/system/reference-data/index.tsx` | Admin page |
| Modify | `frontend/src/features/router/routeGuard.ts` | Permission entry |

### Frontend integration (replace hardcoded data — Task 9)

| File | Constant | Category |
|------|----------|----------|
| `frontend/src/features/tfl-designer/components/shared/TemplateEditorPanel.tsx:51` | `POPULATION_OPTIONS` | POPULATION |
| `frontend/src/pages/(base)/mdr/programming-tracker/mockData.ts:192-223` | `sdtmDomains`, `adamDatasets`, `populations` | SDTM_DOMAIN, ADAM_DATASET, POPULATION |

---

## Task 1: Backend Model + Enum

**Files:**
- Modify: `backend/app/models/enums.py` (append new enum)
- Create: `backend/app/models/reference_data.py`
- Modify: `backend/app/models/__init__.py` (add exports)

- [ ] **Step 1: Write the failing test for model creation**

Create `backend/tests/test_reference_data.py`:

```python
"""Tests for Reference Data CRUD endpoints and model."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ReferenceData, ReferenceDataCategory


# ============================================================
# Model Tests
# ============================================================


@pytest.mark.asyncio
async def test_model_creation(db_session: AsyncSession):
    """ReferenceData can be created with all required fields."""
    item = ReferenceData(
        category=ReferenceDataCategory.POPULATION,
        code="ITT",
        label="Intent-to-Treat",
    )
    db_session.add(item)
    await db_session.flush()
    await db_session.refresh(item)

    assert item.id is not None
    assert item.category == ReferenceDataCategory.POPULATION
    assert item.code == "ITT"
    assert item.label == "Intent-to-Treat"
    assert item.is_active is True
    assert item.is_deleted is False
    assert item.sort_order == 0


@pytest.mark.asyncio
async def test_model_unique_constraint(db_session: AsyncSession):
    """Duplicate (category, code) pair for non-deleted rows raises error."""
    from sqlalchemy.exc import IntegrityError

    item1 = ReferenceData(
        category=ReferenceDataCategory.POPULATION,
        code="Safety",
        label="Safety Population",
    )
    db_session.add(item1)
    await db_session.flush()

    item2 = ReferenceData(
        category=ReferenceDataCategory.POPULATION,
        code="Safety",
        label="Safety Duplicate",
    )
    db_session.add(item2)
    with pytest.raises(IntegrityError):
        await db_session.flush()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_reference_data.py::test_model_creation -xvs`
Expected: FAIL — `ImportError: cannot import name 'ReferenceData'`

- [ ] **Step 3: Add `ReferenceDataCategory` enum to `backend/app/models/enums.py`**

Append to the file (before the `__all__` block, or after `AuditAction`):

```python
class ReferenceDataCategory(str, enum.Enum):
    """Reference data categories for configurable dropdowns and metadata."""
    POPULATION = "POPULATION"
    SDTM_DOMAIN = "SDTM_DOMAIN"
    ADAM_DATASET = "ADAM_DATASET"
    STUDY_PHASE = "STUDY_PHASE"
    STAT_TYPE = "STAT_TYPE"
    DISPLAY_TYPE = "DISPLAY_TYPE"
    ANALYSIS_CATEGORY = "ANALYSIS_CATEGORY"
    THERAPEUTIC_AREA = "THERAPEUTIC_AREA"
    REGULATORY_AGENCY = "REGULATORY_AGENCY"
    CONTROL_TYPE = "CONTROL_TYPE"
    BLINDING_STATUS = "BLINDING_STATUS"
    STUDY_DESIGN = "STUDY_DESIGN"
```

Add `"ReferenceDataCategory"` to `enums.py` `__all__` list.

- [ ] **Step 4: Create `backend/app/models/reference_data.py`**

```python
"""Reference Data model — configurable dropdown/metadata entries."""
from typing import Any

from sqlalchemy import Boolean, Index, Integer, String, Text, column as sa_column
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import ReferenceDataCategory

# Re-import JSONB from our base for cross-dialect support
from app.models.base import JSONB as JSONBType


class ReferenceData(Base, TimestampMixin, SoftDeleteMixin):
    """Generic reference data table for configurable clinical metadata.

    Categories include populations, SDTM domains, ADaM datasets, study phases,
    statistic types, display types, analysis categories, and study config options.
    """
    __tablename__ = "reference_data"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Business columns
    category: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
        comment="Reference data category (POPULATION, SDTM_DOMAIN, etc.)",
    )
    code: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="Short code (e.g., ITT, DM, ADSL)",
    )
    label: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        comment="Display name (e.g., Intent-to-Treat)",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Optional description",
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        comment="Display ordering within category",
    )
    metadata_: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata_",
        JSONBType,
        nullable=True,
        comment="Extensible per-category fields",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        index=True,
        comment="Active/inactive toggle",
    )

    # Table-level constraints
    __table_args__ = (
        Index(
            "uq_reference_data_category_code",
            "category",
            "code",
            unique=True,
            postgresql_where=sa_column("is_deleted") == False,  # noqa: E712
        ),
        {"comment": "Generic reference data for configurable clinical metadata"},
    )

    def __repr__(self) -> str:
        return f"<ReferenceData {self.category}:{self.code}>"
```

> Note: Using `String(32)` for `category` instead of native PostgreSQL `ENUM` to avoid migration complexity with SQLite tests. The application layer validates category values against `ReferenceDataCategory` enum.

- [ ] **Step 5: Export from `backend/app/models/__init__.py`**

Add import:
```python
from app.models.reference_data import ReferenceData
```

Add to `__all__` list:
```python
"ReferenceData",
"ReferenceDataCategory",
```

(`ReferenceDataCategory` is already imported via `from app.models.enums import ...`)

- [ ] **Step 6: Run model tests**

Run: `cd backend && python -m pytest tests/test_reference_data.py::test_model_creation tests/test_reference_data.py::test_model_unique_constraint -xvs`
Expected: PASS (both tests)

> **Note:** The partial unique index `postgresql_where` is PostgreSQL-specific. SQLite tests will not enforce this constraint at the DB level — this is acceptable; application-layer validation in the router will enforce uniqueness.

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/reference_data.py backend/app/models/enums.py backend/app/models/__init__.py backend/tests/test_reference_data.py
git commit -m "feat: add ReferenceData model with category enum and soft delete"
```

---

## Task 2: Alembic Migrations (Table + Seed)

**Files:**
- Create: `backend/alembic/versions/2026-04-01_0001_reference_data.py`
- Create: `backend/alembic/versions/2026-04-01_0002_reference_data_seed.py`

- [ ] **Step 1: Create table migration**

Create `backend/alembic/versions/2026-04-01_0001_reference_data.py`:

```python
"""Create reference_data table

Revision ID: ref_data_001
Revises: shell_lib_001
Create Date: 2026-04-01 00:01:00.000000+00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.models.base import JSONB

revision: str = "ref_data_001"
down_revision: Union[str, None] = "shell_lib_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "reference_data",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False, comment="Reference data category"),
        sa.Column("code", sa.String(length=64), nullable=False, comment="Short code"),
        sa.Column("label", sa.String(length=256), nullable=False, comment="Display name"),
        sa.Column("description", sa.Text(), nullable=True, comment="Optional description"),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False, comment="Display ordering"),
        sa.Column("metadata_", JSONB(), nullable=True, comment="Extensible per-category fields"),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False, comment="Active toggle"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_by", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        comment="Generic reference data for configurable clinical metadata",
    )
    op.create_index(op.f("ix_reference_data_category"), "reference_data", ["category"], unique=False)
    op.create_index(op.f("ix_reference_data_is_active"), "reference_data", ["is_active"], unique=False)
    op.create_index(op.f("ix_reference_data_is_deleted"), "reference_data", ["is_deleted"], unique=False)
    # Partial unique index: (category, code) WHERE is_deleted = false
    op.execute(
        "CREATE UNIQUE INDEX uq_reference_data_category_code "
        "ON reference_data (category, code) WHERE is_deleted = false"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_reference_data_category_code")
    op.drop_index(op.f("ix_reference_data_is_deleted"), table_name="reference_data")
    op.drop_index(op.f("ix_reference_data_is_active"), table_name="reference_data")
    op.drop_index(op.f("ix_reference_data_category"), table_name="reference_data")
    op.drop_table("reference_data")
```

- [ ] **Step 2: Create seed migration**

Create `backend/alembic/versions/2026-04-01_0002_reference_data_seed.py`:

```python
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

# Seed data grouped by category
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
        {"code": "Phase_I", "label": "Phase I", "sort_order": 1, "metadata_": '{"abbreviation": "I", "ordinal": 1}'},
        {"code": "Phase_I_II", "label": "Phase I/II", "sort_order": 2, "metadata_": '{"abbreviation": "I/II", "ordinal": 2}'},
        {"code": "Phase_II", "label": "Phase II", "sort_order": 3, "metadata_": '{"abbreviation": "II", "ordinal": 3}'},
        {"code": "Phase_II_III", "label": "Phase II/III", "sort_order": 4, "metadata_": '{"abbreviation": "II/III", "ordinal": 4}'},
        {"code": "Phase_III", "label": "Phase III", "sort_order": 5, "metadata_": '{"abbreviation": "III", "ordinal": 5}'},
        {"code": "Phase_IV", "label": "Phase IV", "sort_order": 6, "metadata_": '{"abbreviation": "IV", "ordinal": 6}'},
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
                    "INSERT INTO reference_data (category, code, label, sort_order, metadata_, is_active, is_deleted) "
                    "VALUES (:category, :code, :label, :sort_order, :metadata_::jsonb, true, false) "
                    "ON CONFLICT DO NOTHING"
                ),
                {
                    "category": category,
                    "code": item["code"],
                    "label": item["label"],
                    "sort_order": item["sort_order"],
                    "metadata_": item.get("metadata_"),
                },
            )


def downgrade() -> None:
    conn = op.get_bind()
    categories = list(SEED_DATA.keys())
    conn.execute(
        sa.text("DELETE FROM reference_data WHERE category = ANY(:categories)"),
        {"categories": categories},
    )
```

- [ ] **Step 3: Verify migrations compile**

Run: `cd backend && python -c "from alembic.config import Config; from alembic.script import ScriptDirectory; c = Config(); s = ScriptDirectory(c); print(s.get_current_head())"`
Expected: prints the latest revision ID

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/versions/2026-04-01_0001_reference_data.py backend/alembic/versions/2026-04-01_0002_reference_data_seed.py
git commit -m "feat: add reference_data table and seed migrations"
```

---

## Task 2b: RBAC Permission Seed

**Files:**
- Create: `backend/alembic/versions/2026-04-01_0003_reference_data_permissions.py`

> Without this migration, `page:reference-data:view` permission won't exist in the RBAC system, causing non-superuser users to be blocked from the reference data page.

- [ ] **Step 1: Create RBAC permission seed migration**

Create `backend/alembic/versions/2026-04-01_0003_reference_data_permissions.py`:

```python
"""Seed RBAC permissions for reference data page access

Revision ID: ref_data_perm_001
Revises: ref_data_seed_001
Create Date: 2026-04-01 00:03:00.000000+00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "ref_data_perm_001"
down_revision: Union[str, None] = "ref_data_seed_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    # Add page-level permission for reference data viewing
    conn.execute(
        sa.text(
            "INSERT INTO permissions (code, name, category, description) "
            "VALUES (:code, :name, :cat, :desc) "
            "ON CONFLICT (code) DO NOTHING"
        ),
        [
            {"code": "page:reference-data:view", "name": "View Reference Data", "cat": "page", "desc": "Access the Reference Data management page"},
        ],
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM permissions WHERE code = :code"),
        {"code": "page:reference-data:view"},
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/alembic/versions/2026-04-01_0003_reference_data_permissions.py
git commit -m "feat: add RBAC permission seed for reference data page access"
```

---

## Task 3: Backend Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/reference_data.py`

- [ ] **Step 1: Create schema file**

Create `backend/app/schemas/reference_data.py`:

```python
"""Pydantic schemas for Reference Data API."""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    """Base schema with common config."""
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


# --- Request Schemas ---

class ReferenceDataCreate(BaseSchema):
    """Schema for creating a reference data item."""
    code: str = Field(..., min_length=1, max_length=64, description="Short code (e.g., ITT, DM)")
    label: str = Field(..., min_length=1, max_length=256, description="Display name")
    description: str | None = Field(None, description="Optional description")
    sort_order: int = Field(0, description="Display ordering within category")
    metadata_: dict[str, Any] | None = Field(None, description="Extensible per-category fields")


class ReferenceDataUpdate(BaseSchema):
    """Schema for updating a reference data item. All fields optional."""
    label: str | None = Field(None, min_length=1, max_length=256)
    description: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    metadata_: dict[str, Any] | None = None


# --- Response Schemas ---

class ReferenceDataResponse(BaseSchema):
    """Full reference data item response."""
    id: int
    category: str
    code: str
    label: str
    description: str | None
    sort_order: int
    metadata_: dict[str, Any] | None = None
    is_active: bool
    is_deleted: bool
    deleted_at: datetime | None
    deleted_by: str | None
    created_at: datetime
    updated_at: datetime


class CategorySummary(BaseSchema):
    """Summary of a reference data category."""
    category: str
    label: str
    count: int
    active_count: int
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/reference_data.py
git commit -m "feat: add reference data Pydantic schemas"
```

---

## Task 4: Backend Router (CRUD Endpoints)

**Files:**
- Create: `backend/app/api/routers/reference_data.py`
- Modify: `backend/app/api/routers/__init__.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write failing endpoint tests**

Append to `backend/tests/test_reference_data.py`:

```python
# ============================================================
# Helper
# ============================================================

CATEGORY_LABELS = {
    "POPULATION": "Population",
    "SDTM_DOMAIN": "SDTM Domain",
    "ADAM_DATASET": "ADaM Dataset",
    "STUDY_PHASE": "Study Phase",
    "STAT_TYPE": "Statistic Type",
    "DISPLAY_TYPE": "Display Type",
    "ANALYSIS_CATEGORY": "Analysis Category",
    "THERAPEUTIC_AREA": "Therapeutic Area",
    "REGULATORY_AGENCY": "Regulatory Agency",
    "CONTROL_TYPE": "Control Type",
    "BLINDING_STATUS": "Blinding Status",
    "STUDY_DESIGN": "Study Design",
}


async def _seed_items(db_session: AsyncSession):
    """Seed test items."""
    items = [
        ReferenceData(category="POPULATION", code="Safety", label="Safety", sort_order=1),
        ReferenceData(category="POPULATION", code="ITT", label="Intent-to-Treat", sort_order=2),
        ReferenceData(category="SDTM_DOMAIN", code="DM", label="Demographics", sort_order=1),
    ]
    db_session.add_all(items)
    await db_session.flush()


# ============================================================
# Endpoint Tests
# ============================================================


@pytest.mark.asyncio
async def test_list_categories(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /reference-data returns category summaries."""
    await _seed_items(db_session)
    resp = await authenticated_client.get("/api/v1/reference-data")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    categories = {item["category"]: item for item in data}
    assert "POPULATION" in categories
    assert categories["POPULATION"]["count"] == 2
    assert categories["POPULATION"]["active_count"] == 2


@pytest.mark.asyncio
async def test_list_items(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /reference-data/POPULATION returns items in category."""
    await _seed_items(db_session)
    resp = await authenticated_client.get("/api/v1/reference-data/POPULATION")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    codes = {item["code"] for item in data}
    assert codes == {"Safety", "ITT"}


@pytest.mark.asyncio
async def test_get_item_by_code(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /reference-data/POPULATION/Safety returns single item."""
    await _seed_items(db_session)
    resp = await authenticated_client.get("/api/v1/reference-data/POPULATION/Safety")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "Safety"
    assert data["label"] == "Safety"
    assert data["category"] == "POPULATION"


@pytest.mark.asyncio
async def test_get_item_not_found(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /reference-data/POPULATION/MISSING returns 404."""
    resp = await authenticated_client.get("/api/v1/reference-data/POPULATION/MISSING")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_item(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /reference-data/POPULATION creates item (superuser only)."""
    resp = await admin_authenticated_client.post(
        "/api/v1/reference-data/POPULATION",
        json={"code": "FAS", "label": "Full Analysis Set", "sort_order": 3},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["code"] == "FAS"
    assert data["label"] == "Full Analysis Set"


@pytest.mark.asyncio
async def test_create_item_non_superuser(authenticated_client: AsyncClient, test_user, db_session: AsyncSession):
    """POST /reference-data/POPULATION by non-superuser returns 403."""
    resp = await authenticated_client.post(
        "/api/v1/reference-data/POPULATION",
        json={"code": "FAS", "label": "Full Analysis Set"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_duplicate_code(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST with duplicate code in same category returns 409."""
    await _seed_items(db_session)
    resp = await admin_authenticated_client.post(
        "/api/v1/reference-data/POPULATION",
        json={"code": "Safety", "label": "Safety Duplicate"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_update_item(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """PUT /reference-data/POPULATION/Safety updates item."""
    await _seed_items(db_session)
    resp = await admin_authenticated_client.put(
        "/api/v1/reference-data/POPULATION/Safety",
        json={"label": "Safety Population", "sort_order": 10},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["label"] == "Safety Population"
    assert data["sort_order"] == 10


@pytest.mark.asyncio
async def test_deactivate_item(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /reference-data/POPULATION/Safety/deactivate soft-deletes item."""
    await _seed_items(db_session)
    resp = await admin_authenticated_client.post("/api/v1/reference-data/POPULATION/Safety/deactivate")
    assert resp.status_code == 200

    # Verify item is soft-deleted
    resp2 = await admin_authenticated_client.get("/api/v1/reference-data/POPULATION/Safety")
    assert resp2.status_code == 404

    # Verify list still shows remaining items
    resp3 = await admin_authenticated_client.get("/api/v1/reference-data/POPULATION")
    assert len(resp3.json()) == 1


@pytest.mark.asyncio
async def test_restore_item(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /reference-data/POPULATION/Safety/restore restores soft-deleted item."""
    await _seed_items(db_session)
    # Deactivate first
    await admin_authenticated_client.post("/api/v1/reference-data/POPULATION/Safety/deactivate")
    # Then restore
    resp = await admin_authenticated_client.post("/api/v1/reference-data/POPULATION/Safety/restore")
    assert resp.status_code == 200

    # Verify item is back
    resp2 = await admin_authenticated_client.get("/api/v1/reference-data/POPULATION/Safety")
    assert resp2.status_code == 200
    assert resp2.json()["is_deleted"] is False


@pytest.mark.asyncio
async def test_list_items_includes_deleted(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET with is_deleted=true returns soft-deleted items."""
    await _seed_items(db_session)
    await admin_authenticated_client.post("/api/v1/reference-data/POPULATION/Safety/deactivate")

    resp = await admin_authenticated_client.get("/api/v1/reference-data/POPULATION?is_deleted=true")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["code"] == "Safety"
    assert data[0]["is_deleted"] is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_reference_data.py -xvs -k "test_list_categories"`
Expected: FAIL — 404 or connection error (router not yet registered)

- [ ] **Step 3: Create router `backend/app/api/routers/reference_data.py`**

```python
"""Reference Data CRUD endpoints."""
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_superuser
from app.database import get_db_session
from app.models import ReferenceData
from app.models.audit_listener import set_audit_context
from app.models.enums import ReferenceDataCategory
from app.schemas.reference_data import (
    CategorySummary,
    ReferenceDataCreate,
    ReferenceDataResponse,
    ReferenceDataUpdate,
)

router = APIRouter(prefix="/reference-data", tags=["Reference Data"])

CATEGORY_LABELS: dict[str, str] = {
    "POPULATION": "Population",
    "SDTM_DOMAIN": "SDTM Domain",
    "ADAM_DATASET": "ADaM Dataset",
    "STUDY_PHASE": "Study Phase",
    "STAT_TYPE": "Statistic Type",
    "DISPLAY_TYPE": "Display Type",
    "ANALYSIS_CATEGORY": "Analysis Category",
    "THERAPEUTIC_AREA": "Therapeutic Area",
    "REGULATORY_AGENCY": "Regulatory Agency",
    "CONTROL_TYPE": "Control Type",
    "BLINDING_STATUS": "Blinding Status",
    "STUDY_DESIGN": "Study Design",
}

VALID_CATEGORIES = {c.value for c in ReferenceDataCategory}


def _validate_category(category: str) -> None:
    if category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{category}'. Valid: {sorted(VALID_CATEGORIES)}",
        )


@router.get("/", response_model=list[CategorySummary])
async def list_categories(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """List all reference data categories with item counts."""
    results = await db.execute(
        select(
            ReferenceData.category,
            func.count().label("count"),
            func.count().filter(ReferenceData.is_active == True, ReferenceData.is_deleted == False).label("active_count"),  # noqa: E712
        )
        .where(ReferenceData.is_deleted == False)  # noqa: E712
        .group_by(ReferenceData.category)
    )
    rows = results.all()
    return [
        CategorySummary(
            category=row.category,
            label=CATEGORY_LABELS.get(row.category, row.category),
            count=row.count,
            active_count=row.active_count,
        )
        for row in rows
    ]


@router.get("/{category}", response_model=list[ReferenceDataResponse])
async def list_items(
    category: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    is_active: bool | None = None,
    is_deleted: bool | None = None,
):
    """List items in a category. By default returns non-deleted active items."""
    _validate_category(category)

    query = select(ReferenceData).where(ReferenceData.category == category)

    if is_deleted is not None:
        query = query.where(ReferenceData.is_deleted == is_deleted)
    else:
        query = query.where(ReferenceData.is_deleted == False)  # noqa: E712

    if is_active is not None:
        query = query.where(ReferenceData.is_active == is_active)

    query = query.order_by(ReferenceData.sort_order, ReferenceData.code)
    result = await db.execute(query)
    items = result.scalars().all()
    return [ReferenceDataResponse.model_validate(item) for item in items]


@router.get("/{category}/{code}", response_model=ReferenceDataResponse)
async def get_item(
    category: str,
    code: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """Get a single reference data item by category and code."""
    _validate_category(category)
    result = await db.execute(
        select(ReferenceData).where(
            ReferenceData.category == category,
            ReferenceData.code == code,
            ReferenceData.is_deleted == False,  # noqa: E712
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item '{code}' not found in '{category}'")
    return ReferenceDataResponse.model_validate(item)


@router.post("/{category}", response_model=ReferenceDataResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    category: str,
    body: ReferenceDataCreate,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    """Create a new reference data item (superuser only)."""
    _validate_category(category)
    set_audit_context(str(admin.id), admin.username, context={"operation": "create_reference_data"})

    # Check uniqueness
    existing = await db.execute(
        select(ReferenceData).where(
            ReferenceData.category == category,
            ReferenceData.code == body.code,
            ReferenceData.is_deleted == False,  # noqa: E712
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Item '{body.code}' already exists in '{category}'",
        )

    item = ReferenceData(category=category, **body.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return ReferenceDataResponse.model_validate(item)


@router.put("/{category}/{code}", response_model=ReferenceDataResponse)
async def update_item(
    category: str,
    code: str,
    body: ReferenceDataUpdate,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    """Update a reference data item (superuser only)."""
    _validate_category(category)
    set_audit_context(str(admin.id), admin.username, context={"operation": "update_reference_data"})

    result = await db.execute(
        select(ReferenceData).where(
            ReferenceData.category == category,
            ReferenceData.code == code,
            ReferenceData.is_deleted == False,  # noqa: E712
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item '{code}' not found in '{category}'")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.flush()
    await db.refresh(item)
    return ReferenceDataResponse.model_validate(item)


@router.post("/{category}/{code}/deactivate", response_model=ReferenceDataResponse)
async def deactivate_item(
    category: str,
    code: str,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    """Soft delete a reference data item (superuser only)."""
    _validate_category(category)
    set_audit_context(str(admin.id), admin.username, context={"operation": "deactivate_reference_data"})

    result = await db.execute(
        select(ReferenceData).where(
            ReferenceData.category == category,
            ReferenceData.code == code,
            ReferenceData.is_deleted == False,  # noqa: E712
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item '{code}' not found in '{category}'")

    item.soft_delete(deleted_by=admin.username)
    await db.flush()
    await db.refresh(item)
    return ReferenceDataResponse.model_validate(item)


@router.post("/{category}/{code}/restore", response_model=ReferenceDataResponse)
async def restore_item(
    category: str,
    code: str,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    """Restore a soft-deleted reference data item (superuser only)."""
    _validate_category(category)
    set_audit_context(str(admin.id), admin.username, context={"operation": "restore_reference_data"})

    result = await db.execute(
        select(ReferenceData).where(
            ReferenceData.category == category,
            ReferenceData.code == code,
            ReferenceData.is_deleted == True,  # noqa: E712
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Deleted item '{code}' not found in '{category}'",
        )

    item.is_deleted = False
    item.deleted_at = None
    item.deleted_by = None
    await db.flush()
    await db.refresh(item)
    return ReferenceDataResponse.model_validate(item)
```

- [ ] **Step 4: Register router**

Add to `backend/app/api/routers/__init__.py`:
```python
from app.api.routers.reference_data import router as reference_data_router
```
Add `"reference_data_router"` to `__all__`.

Add to `backend/app/main.py` (in the router import block and registration):
```python
# In the import block:
from app.api.routers import (
    ...,
    reference_data_router,
)

# After existing router registrations:
app.include_router(
    reference_data_router,
    prefix="/api/v1",
)
```

- [ ] **Step 5: Fix test fixture for admin auth**

The `test_create_item` test needs admin authentication. Update `backend/tests/conftest.py` — add an `admin_authenticated_client` fixture:

```python
@pytest_asyncio.fixture(scope="function")
async def admin_authenticated_client(
    client: AsyncClient,
    admin_user: User,
) -> AsyncClient:
    """Create admin-authenticated test client with audit context."""
    async def override_get_current_user():
        return admin_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    set_audit_context(str(admin_user.id), admin_user.username)

    yield client

    app.dependency_overrides.clear()
```

> **Important:** All superuser tests use `admin_authenticated_client` which handles both auth override AND audit context internally. No manual `set_audit_context` calls needed in test bodies.

- [ ] **Step 6: Run all reference data tests**

Run: `cd backend && python -m pytest tests/test_reference_data.py -xvs`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/routers/reference_data.py backend/app/api/routers/__init__.py backend/app/main.py backend/app/schemas/reference_data.py backend/tests/test_reference_data.py backend/tests/conftest.py
git commit -m "feat: add reference data CRUD router with tests"
```

---

## Task 5: Frontend Types + URLs + API Service

**Files:**
- Create: `frontend/src/service/types/reference-data.d.ts`
- Create: `frontend/src/service/urls/reference-data.ts`
- Create: `frontend/src/service/api/reference-data.ts`
- Modify: `frontend/src/service/types/` barrel (no barrel file exists — types are ambient `.d.ts`)
- Modify: `frontend/src/service/urls/index.ts`
- Modify: `frontend/src/service/api/index.ts`

- [ ] **Step 1: Create type declarations**

Create `frontend/src/service/types/reference-data.d.ts`:

```typescript
declare namespace Api {
  namespace ReferenceData {
    /** Reference data category enum values */
    type Category =
      | 'POPULATION'
      | 'SDTM_DOMAIN'
      | 'ADAM_DATASET'
      | 'STUDY_PHASE'
      | 'STAT_TYPE'
      | 'DISPLAY_TYPE'
      | 'ANALYSIS_CATEGORY'
      | 'THERAPEUTIC_AREA'
      | 'REGULATORY_AGENCY'
      | 'CONTROL_TYPE'
      | 'BLINDING_STATUS'
      | 'STUDY_DESIGN';

    /** Human-readable category label map */
    interface CategorySummary {
      /** Category code */
      category: string;
      /** Human-readable label */
      label: string;
      /** Total item count (excluding deleted) */
      count: number;
      /** Active item count */
      active_count: number;
    }

    /** Reference data item response */
    interface ReferenceDataItem {
      id: number;
      category: string;
      code: string;
      label: string;
      description: string | null;
      sort_order: number;
      metadata_: Record<string, unknown> | null;
      is_active: boolean;
      is_deleted: boolean;
      deleted_at: string | null;
      deleted_by: string | null;
      created_at: string;
      updated_at: string;
    }

    /** Create request body */
    interface CreateRequest {
      code: string;
      label: string;
      description?: string | null;
      sort_order?: number;
      metadata_?: Record<string, unknown> | null;
    }

    /** Update request body */
    interface UpdateRequest {
      label?: string | null;
      description?: string | null;
      sort_order?: number | null;
      is_active?: boolean | null;
      metadata_?: Record<string, unknown> | null;
    }

    /** Dropdown option (derived from label/code) */
    interface DropdownOption {
      label: string;
      value: string;
    }
  }
}
```

- [ ] **Step 2: Create URL constants**

Create `frontend/src/service/urls/reference-data.ts`:

```typescript
/** Reference Data API URL constants */
export const REFERENCE_DATA_URLS = {
  CATEGORIES: '/api/v1/reference-data',
  ITEMS: (category: string) => `/api/v1/reference-data/${category}`,
  ITEM_BY_CODE: (category: string, code: string) => `/api/v1/reference-data/${category}/${code}`,
  DEACTIVATE: (category: string, code: string) => `/api/v1/reference-data/${category}/${code}/deactivate`,
  RESTORE: (category: string, code: string) => `/api/v1/reference-data/${category}/${code}/restore`
} as const;
```

- [ ] **Step 3: Create API service**

Create `frontend/src/service/api/reference-data.ts`:

```typescript
import { rbacRequest } from '../request/rbac';
import { REFERENCE_DATA_URLS } from '../urls/reference-data';

/** Fetch all categories with item counts */
export function fetchReferenceCategories() {
  return rbacRequest<Api.ReferenceData.CategorySummary[]>({
    url: REFERENCE_DATA_URLS.CATEGORIES,
    method: 'get'
  });
}

/** Fetch items in a category */
export function fetchReferenceItems(category: string, params?: { is_active?: boolean; is_deleted?: boolean }) {
  return rbacRequest<Api.ReferenceData.ReferenceDataItem[]>({
    url: REFERENCE_DATA_URLS.ITEMS(category),
    method: 'get',
    params
  });
}

/** Get single item by code */
export function fetchReferenceItem(category: string, code: string) {
  return rbacRequest<Api.ReferenceData.ReferenceDataItem>({
    url: REFERENCE_DATA_URLS.ITEM_BY_CODE(category, code),
    method: 'get'
  });
}

/** Create a new reference data item */
export function fetchCreateReferenceItem(category: string, data: Api.ReferenceData.CreateRequest) {
  return rbacRequest<Api.ReferenceData.ReferenceDataItem>({
    url: REFERENCE_DATA_URLS.ITEMS(category),
    method: 'post',
    data
  });
}

/** Update a reference data item */
export function fetchUpdateReferenceItem(category: string, code: string, data: Api.ReferenceData.UpdateRequest) {
  return rbacRequest<Api.ReferenceData.ReferenceDataItem>({
    url: REFERENCE_DATA_URLS.ITEM_BY_CODE(category, code),
    method: 'put',
    data
  });
}

/** Soft delete (deactivate) a reference data item */
export function fetchDeactivateReferenceItem(category: string, code: string) {
  return rbacRequest<Api.ReferenceData.ReferenceDataItem>({
    url: REFERENCE_DATA_URLS.DEACTIVATE(category, code),
    method: 'post'
  });
}

/** Restore a soft-deleted reference data item */
export function fetchRestoreReferenceItem(category: string, code: string) {
  return rbacRequest<Api.ReferenceData.ReferenceDataItem>({
    url: REFERENCE_DATA_URLS.RESTORE(category, code),
    method: 'post'
  });
}
```

- [ ] **Step 4: Update barrel exports**

Add to `frontend/src/service/urls/index.ts`:
```typescript
export * from './reference-data';
```

Add to `frontend/src/service/api/index.ts`:
```typescript
export * from './reference-data';
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors related to reference-data files

- [ ] **Step 6: Commit**

```bash
git add frontend/src/service/types/reference-data.d.ts frontend/src/service/urls/reference-data.ts frontend/src/service/api/reference-data.ts frontend/src/service/urls/index.ts frontend/src/service/api/index.ts
git commit -m "feat: add reference data frontend service layer (types, URLs, API)"
```

---

## Task 6: Frontend React Query Hooks + Query Keys

**Files:**
- Modify: `frontend/src/service/keys/index.ts`
- Create: `frontend/src/service/hooks/useReferenceData.ts`
- Modify: `frontend/src/service/hooks/index.ts`

- [ ] **Step 1: Add query keys**

Add `REFERENCE_DATA` section to `QUERY_KEYS` in `frontend/src/service/keys/index.ts`:

```typescript
REFERENCE_DATA: {
  CATEGORIES: ['referenceData', 'categories'] as const,
  ITEMS: (category: string, params?: { is_active?: boolean; is_deleted?: boolean }) =>
    ['referenceData', 'items', category, params] as const,
  ITEM: (category: string, code: string) => ['referenceData', 'item', category, code] as const
}
```

- [ ] **Step 2: Create hooks**

Create `frontend/src/service/hooks/useReferenceData.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchCreateReferenceItem,
  fetchDeactivateReferenceItem,
  fetchReferenceCategories,
  fetchReferenceItem,
  fetchReferenceItems,
  fetchRestoreReferenceItem,
  fetchUpdateReferenceItem
} from '../api/reference-data';
import { QUERY_KEYS } from '../keys';

/** Hook: fetch all category summaries */
export function useReferenceCategories(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.REFERENCE_DATA.CATEGORIES,
    queryFn: fetchReferenceCategories,
    enabled,
    staleTime: 5 * 60 * 1000
  });
}

/** Hook: fetch items in a category */
export function useReferenceItems(
  category: string,
  params?: { is_active?: boolean; is_deleted?: boolean },
  enabled = true
) {
  return useQuery({
    queryKey: QUERY_KEYS.REFERENCE_DATA.ITEMS(category, params),
    queryFn: () => fetchReferenceItems(category, params),
    enabled: enabled && Boolean(category),
    staleTime: 5 * 60 * 1000
  });
}

/** Hook: derive dropdown options from reference data */
export function useReferenceOptions(category: string, enabled = true) {
  const { data, isLoading } = useReferenceItems(category, { is_active: true }, enabled);
  const options: Api.ReferenceData.DropdownOption[] = (data || []).map(item => ({
    label: item.label,
    value: item.code
  }));
  return { options, isLoading };
}

/** Hook: fetch single item */
export function useReferenceItem(category: string, code: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.REFERENCE_DATA.ITEM(category, code),
    queryFn: () => fetchReferenceItem(category, code),
    enabled: enabled && Boolean(category) && Boolean(code)
  });
}

/** Hook: create reference data item */
export function useCreateReferenceItem(category: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Api.ReferenceData.CreateRequest) => fetchCreateReferenceItem(category, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referenceData'] });
    }
  });
}

/** Hook: update reference data item */
export function useUpdateReferenceItem(category: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Api.ReferenceData.UpdateRequest }) =>
      fetchUpdateReferenceItem(category, code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referenceData'] });
    }
  });
}

/** Hook: deactivate (soft delete) reference data item */
export function useDeactivateReferenceItem(category: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => fetchDeactivateReferenceItem(category, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referenceData'] });
    }
  });
}

/** Hook: restore soft-deleted reference data item */
export function useRestoreReferenceItem(category: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => fetchRestoreReferenceItem(category, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referenceData'] });
    }
  });
}
```

- [ ] **Step 3: Add to hooks barrel export**

Add to `frontend/src/service/hooks/index.ts`:
```typescript
export * from './useReferenceData';
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/service/keys/index.ts frontend/src/service/hooks/useReferenceData.ts frontend/src/service/hooks/index.ts
git commit -m "feat: add reference data React Query hooks with dropdown options helper"
```

---

## Task 7: Frontend Admin Page

**Files:**
- Create: `frontend/src/pages/(base)/system/reference-data/index.tsx`

> The route will be auto-generated by `elegant-router` when this file is created. The filesystem convention maps `(base)/system/reference-data/index.tsx` → route `/system/reference-data`.

- [ ] **Step 1: Create the admin page**

Create `frontend/src/pages/(base)/system/reference-data/index.tsx`:

```typescript
import { useCallback, useMemo, useState } from 'react';

import { DeleteOutlined, EditOutlined, PlusOutlined, RedoOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tabs,
  Tag
} from 'antd';
import { useTranslation } from 'react-i18next';

import { useMyPermissions } from '@/service/hooks/useRBAC';
import {
  useCreateReferenceItem,
  useDeactivateReferenceItem,
  useReferenceItems,
  useRestoreReferenceItem,
  useUpdateReferenceItem
} from '@/service/hooks/useReferenceData';

const CATEGORIES = [
  { key: 'POPULATION', label: 'Population' },
  { key: 'SDTM_DOMAIN', label: 'SDTM Domain' },
  { key: 'ADAM_DATASET', label: 'ADaM Dataset' },
  { key: 'STUDY_PHASE', label: 'Study Phase' },
  { key: 'STAT_TYPE', label: 'Statistic Type' },
  { key: 'DISPLAY_TYPE', label: 'Display Type' },
  { key: 'ANALYSIS_CATEGORY', label: 'Analysis Category' },
  { key: 'THERAPEUTIC_AREA', label: 'Therapeutic Area' },
  { key: 'REGULATORY_AGENCY', label: 'Regulatory Agency' },
  { key: 'CONTROL_TYPE', label: 'Control Type' },
  { key: 'BLINDING_STATUS', label: 'Blinding Status' },
  { key: 'STUDY_DESIGN', label: 'Study Design' }
] as const;

export const handle = {
  i18nKey: 'route.(base)_system_reference-data',
  icon: 'mdi:database-cog',
  order: 3,
  title: 'Reference Data'
};

const ReferenceDataPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('POPULATION');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Api.ReferenceData.ReferenceDataItem | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const { data: myPermissions } = useMyPermissions();
  const is_superuser = myPermissions?.is_superuser ?? false;

  // Data hooks
  const { data: items = [], isLoading } = useReferenceItems(
    activeCategory,
    showDeleted ? { is_deleted: true } : undefined
  );
  const createMutation = useCreateReferenceItem(activeCategory);
  const updateMutation = useUpdateReferenceItem(activeCategory);
  const deactivateMutation = useDeactivateReferenceItem(activeCategory);
  const restoreMutation = useRestoreReferenceItem(activeCategory);

  // Table columns
  const columns: ColumnsType<Api.ReferenceData.ReferenceDataItem> = useMemo(
    () => [
      {
        title: 'Code',
        dataIndex: 'code',
        width: 120,
        sorter: (a, b) => a.code.localeCompare(b.code)
      },
      {
        title: 'Label',
        dataIndex: 'label',
        width: 200
      },
      {
        title: 'Description',
        dataIndex: 'description',
        width: 250,
        ellipsis: true
      },
      {
        title: 'Sort Order',
        dataIndex: 'sort_order',
        width: 100,
        sorter: (a, b) => a.sort_order - b.sort_order
      },
      {
        title: 'Status',
        dataIndex: 'is_active',
        width: 80,
        render: (val: boolean, record) =>
          record.is_deleted ? (
            <Tag color="red">Deleted</Tag>
          ) : val ? (
            <Tag color="green">Active</Tag>
          ) : (
            <Tag color="orange">Inactive</Tag>
          )
      },
      ...(is_superuser
        ? [
            {
              title: 'Actions',
              width: 180,
              render: (_: unknown, record: Api.ReferenceData.ReferenceDataItem) => (
                <Space>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingItem(record);
                      form.setFieldsValue(record);
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  {record.is_deleted ? (
                    <Button
                      type="link"
                      size="small"
                      icon={<RedoOutlined />}
                      loading={restoreMutation.isPending}
                      onClick={() => {
                        restoreMutation.mutate(record.code, {
                          onSuccess: () => messageApi.success('Item restored'),
                          onError: () => messageApi.error('Restore failed')
                        });
                      }}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Popconfirm
                      title="Deactivate this item?"
                      onConfirm={() => {
                        deactivateMutation.mutate(record.code, {
                          onSuccess: () => messageApi.success('Item deactivated'),
                          onError: () => messageApi.error('Deactivate failed')
                        });
                      }}
                    >
                      <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                        Deactivate
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              )
            }
          ]
        : []),
    ],
    [is_superuser, form, deactivateMutation, restoreMutation, messageApi]
  );

  // Modal handlers
  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingItem) {
        updateMutation.mutate(
          { code: editingItem.code, data: values },
          {
            onSuccess: () => {
              messageApi.success('Updated');
              setModalOpen(false);
              form.resetFields();
              setEditingItem(null);
            },
            onError: () => messageApi.error('Update failed')
          }
        );
      } else {
        createMutation.mutate(values, {
          onSuccess: () => {
            messageApi.success('Created');
            setModalOpen(false);
            form.resetFields();
          },
          onError: () => messageApi.error('Create failed')
        });
      }
    } catch {
      // validation error
    }
  }, [editingItem, form, createMutation, updateMutation, messageApi]);

  return (
    <Card>
      {contextHolder}
      <Tabs
        activeKey={activeCategory}
        onChange={key => {
          setActiveCategory(key);
          setShowDeleted(false);
        }}
        items={CATEGORIES.map(cat => ({
          key: cat.key,
          label: cat.label
        }))}
      />

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          {is_superuser && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingItem(null);
                form.resetFields();
                setModalOpen(true);
              }}
            >
              Add Item
            </Button>
          )}
          <Switch
            checkedChildren="Show Deleted"
            unCheckedChildren="Hide Deleted"
            checked={showDeleted}
            onChange={setShowDeleted}
          />
        </Space>
      </div>

      <Table<Api.ReferenceData.ReferenceDataItem>
        columns={columns}
        dataSource={items}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ x: 'max-content', y: 'calc(100vh - 400px)' }}
        size="small"
      />

      <Modal
        title={editingItem ? 'Edit Reference Data' : 'Add Reference Data'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
          setEditingItem(null);
        }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Code" rules={[{ required: true, max: 64 }]}>
            <Input disabled={!!editingItem} placeholder="e.g., ITT, DM, ADSL" />
          </Form.Item>
          <Form.Item name="label" label="Label" rules={[{ required: true, max: 256 }]}>
            <Input placeholder="e.g., Intent-to-Treat" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="sort_order" label="Sort Order" initialValue={0}>
            <InputNumber min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ReferenceDataPage;
```

- [ ] **Step 2: Re-generate elegant-router routes**

Run: `cd frontend && npx soy execute-route-gen`

> If `soy` CLI is unavailable, manually add route entry to `frontend/src/router/elegant/routes.ts` following the existing pattern for system routes. The route should be:
> ```typescript
> {
>   matchedFiles: [null, '/src/pages/(base)/system/reference-data/index.tsx', null, null],
>   name: '(base)_system_reference-data',
>   path: '/system/reference-data',
>   handle: {
>     i18nKey: 'route.(base)_system_reference-data',
>     icon: 'mdi:database-cog',
>     order: 3,
>     title: 'Reference Data'
>   }
> }
> ```

- [ ] **Step 3: Add permission entry to route guard**

Add to `PAGE_PERMISSION_MAP` in `frontend/src/features/router/routeGuard.ts`:

```typescript
'/system/reference-data': 'page:reference-data:view'
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors (may need minor fixes depending on user store types)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/\(base\)/system/reference-data/index.tsx frontend/src/features/router/routeGuard.ts
git commit -m "feat: add reference data admin page with CRUD and tab-based categories"
```

---

## Task 8: Replace Hardcoded Data (Integration)

**Files:**
- Modify: `frontend/src/features/tfl-designer/components/shared/TemplateEditorPanel.tsx`
- Modify: `frontend/src/pages/(base)/mdr/programming-tracker/mockData.ts`

> Phase 1 covers the two highest-impact locations. Remaining integrations are tracked as TODOs at the end.

### Code value changes

The seed data consolidates multiple independently-created hardcoded arrays. Key changes:

| Old value (tracker) | New seed code | Notes |
|---------------------|---------------|-------|
| `PP` (Per-Protocol) | `PPS` (Per-Protocol Set) | More standard CDISC naming |
| N/A | `FAS`, `All Enrolled`, `Efficacy` | Added from other modules |

The tracker mock data uses these values in task records. Update `mockData.ts` to use the new codes.

- [ ] **Step 1: Replace `POPULATION_OPTIONS` in TemplateEditorPanel**

In `frontend/src/features/tfl-designer/components/shared/TemplateEditorPanel.tsx`:

Add import at top:
```typescript
import { useReferenceOptions } from '@/service/hooks/useReferenceData';
```

Define defaults for fallback:
```typescript
const POPULATION_DEFAULTS = [
  { label: 'Safety', value: 'Safety' },
  { label: 'ITT', value: 'ITT' },
  { label: 'FAS', value: 'FAS' },
  { label: 'PPS', value: 'PPS' },
  { label: 'Efficacy', value: 'Efficacy' },
  { label: 'All Enrolled', value: 'All Enrolled' }
];
```

Inside the component function, replace the static `POPULATION_OPTIONS` constant with:
```typescript
const { options: populationApiOptions } = useReferenceOptions('POPULATION');
const POPULATION_OPTIONS = populationApiOptions.length > 0 ? populationApiOptions : POPULATION_DEFAULTS;
```

Remove the old hardcoded `POPULATION_OPTIONS` constant.

- [ ] **Step 2: Update tracker mock data and mark deprecated**

In `frontend/src/pages/(base)/mdr/programming-tracker/mockData.ts`:

Add at top of the file:
```typescript
/**
 * @deprecated These arrays are fallback defaults.
 * Prefer useReferenceOptions('SDTM_DOMAIN'), useReferenceOptions('ADAM_DATASET'),
 * useReferenceOptions('POPULATION') from @/service/hooks/useReferenceData
 */
```

Update the `populations` array to use the new standardized code values:
```typescript
export const populations = [
  { label: 'ITT (Intent-to-Treat)', value: 'ITT' },
  { label: 'Safety', value: 'Safety' },
  { label: 'PPS (Per-Protocol Set)', value: 'PPS' },
  { label: 'FAS (Full Analysis Set)', value: 'FAS' },
  { label: 'Efficacy', value: 'Efficacy' }
];
```

Update any mock task records that reference `'PP'` to use `'PPS'` instead.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Manual smoke test**

1. Start backend: `cd backend && python -m uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && pnpm dev`
3. Navigate to `/system/reference-data` — verify tabs load and data displays
4. Navigate to TFL Designer — verify population dropdown still works
5. Navigate to Programming Tracker — verify domain/dataset dropdowns still work

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/tfl-designer/components/shared/TemplateEditorPanel.tsx frontend/src/pages/\(base\)/mdr/programming-tracker/mockData.ts
git commit -m "feat: replace hardcoded population options with API-backed reference data"
```

### Remaining integrations (Phase 1+ TODOs)

These will be addressed as each module is refactored:

- [ ] `tfl-designer/components/study/StatisticsSetManager.tsx:30` — `STAT_TYPE_OPTIONS` → `useReferenceOptions('STAT_TYPE')`
- [ ] `tfl-designer/components/study/StudyShellLibrary.tsx:31` — `DISPLAY_TYPE_OPTIONS` → `useReferenceOptions('DISPLAY_TYPE')`
- [ ] `tfl-designer/types.ts:677` — `categoryOptions` → `useReferenceOptions('ANALYSIS_CATEGORY')`
- [ ] `pipeline-management/mockData.ts:115` — `studyPhases` → `useReferenceOptions('STUDY_PHASE')`
- [ ] `mapping-studio/mockData.ts:273` — domains dropdown → `useReferenceOptions('SDTM_DOMAIN')`

---

## Task 9: Run Alembic Migration + Verify End-to-End

**Files:** None (operational task)

- [ ] **Step 1: Run migrations on dev database**

Run: `cd backend && alembic upgrade head`
Expected: Migration applies successfully, no errors

- [ ] **Step 2: Verify seed data**

Run: `cd backend && python -c "
import asyncio
from app.database import async_session_factory
from sqlalchemy import select, func
from app.models import ReferenceData

async def check():
    async with async_session_factory() as db:
        result = await db.execute(
            select(ReferenceData.category, func.count())
            .where(ReferenceData.is_deleted == False)
            .group_by(ReferenceData.category)
        )
        for row in result.all():
            print(f'{row[0]}: {row[1]} items')

asyncio.run(check())
"`
Expected: All 12 categories with correct item counts

- [ ] **Step 3: Run full test suite**

Run: `cd backend && python -m pytest tests/ -xvs`
Expected: ALL PASS (no regressions)

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore: fix issues found during end-to-end verification"
```

---

## Summary of Migration Chain

```
shell_lib_001 → ref_data_001 → ref_data_seed_001 → ref_data_perm_001
```

## Permission Model

| Operation | Required Role |
|-----------|--------------|
| List categories | Any authenticated user |
| List items | Any authenticated user |
| Get item | Any authenticated user |
| Create item | Superuser |
| Update item | Superuser |
| Deactivate item | Superuser |
| Restore item | Superuser |

## Audit Trail

All CRUD operations on `reference_data` are automatically tracked by the existing `audit_listener.py` event system. No additional configuration needed — `ReferenceData` inherits from `Base`, and `register_audit_listeners(Base)` is already called during app startup.
