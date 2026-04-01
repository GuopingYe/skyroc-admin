# Shell Library Hierarchy System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 4-level shell template hierarchy (Global → TA → Study → Analysis) with downward cloning, upward push via PR workflow, and JSON import at all levels.

**Architecture:** Hybrid approach - Global/TA use new `shell_library_templates` table with `ShellLibraryTemplate` model; Study/Analysis extend existing models with source tracking fields. Frontend uses new `shellLibraryStore` replacing deprecated `templateStore`.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Alembic, PostgreSQL, React 18, TypeScript, Zustand, Ant Design

**Spec:** `docs/superpowers/specs/2026-03-30-shell-library-hierarchy-design.md`

---

## File Structure

### New Files (Backend)
| File | Purpose |
|------|---------|
| `backend/app/models/shell_library.py` | ShellLibraryTemplate SQLAlchemy model |
| `backend/app/schemas/shell_library.py` | Pydantic schemas for API |
| `backend/app/api/routers/shell_library.py` | REST API endpoints |
| `backend/alembic/versions/2026-03-31_XXXX_shell_library_system.py` | Database migration |

### New Files (Frontend)
| File | Purpose |
|------|---------|
| `frontend/src/features/tfl-designer/stores/shellLibraryStore.ts` | Zustand store for Global/TA templates |
| `frontend/src/features/tfl-designer/components/shared/PushToLibraryModal.tsx` | Push to Library PR modal |
| `frontend/src/features/tfl-designer/utils/jsonImportUtils.ts` | ARS JSON parsing utilities |

### Modified Files (Backend)
| File | Changes |
|------|---------|
| `backend/app/models/ars_study.py` | Add source_library_id, source_level, source_template_name, version_history |
| `backend/app/api/routers/ars_study.py` | Add import/push endpoints |
| `backend/app/api/routers/__init__.py` | Register shell_library router |

### Modified Files (Frontend)
| File | Changes |
|------|---------|
| `frontend/src/features/tfl-designer/types.ts` | Add ShellLibraryTemplate, VersionHistoryEntry types |
| `frontend/src/features/tfl-designer/components/study/StudyTemplateLibrary.tsx` | Rename to StudyShellLibrary, add source column, push actions |
| `frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx` | Multi-source template list |
| `frontend/src/pages/(base)/mdr/tfl-template-library/index.tsx` | Add scope level filter, TA dropdown |
| `frontend/src/features/tfl-designer/stores/tableStore.ts` | Add pushToStudy, pushToLibrary methods |
| `frontend/src/features/tfl-designer/stores/index.ts` | Export shellLibraryStore |

---

## Phase 1: Foundation (Database & Backend API)

### Task 1: Create Database Migration

**Files:**
- Create: `backend/alembic/versions/2026-03-31_XXXX_shell_library_system.py`

- [ ] **Step 1: Generate migration file**

Run:
```bash
cd backend && alembic revision -m "shell_library_system"
```

- [ ] **Step 2: Write migration upgrade()**

```python
# backend/alembic/versions/2026-03-31_XXXX_shell_library_system.py

from alembic import op
import sqlalchemy as sa

revision = '<generated>'
down_revision = '<previous>'
branch_labels = None
depends_on = None

def upgrade():
    # Create shell_library_templates table
    op.create_table(
        'shell_library_templates',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('scope_level', sa.String(20), nullable=False),
        sa.Column('scope_node_id', sa.Integer, sa.ForeignKey('scope_nodes.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('template_name', sa.String(200), nullable=False),
        sa.Column('display_type', sa.String(20), nullable=False, server_default='Table'),
        sa.Column('shell_schema', sa.JSON, nullable=False),
        sa.Column('statistics_set_id', sa.Integer, sa.ForeignKey('statistics_sets.id', ondelete='SET NULL'), nullable=True),
        sa.Column('version', sa.Integer, nullable=False, server_default='1'),
        sa.Column('version_history', sa.JSON, nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(100), nullable=False),
        sa.Column('updated_by', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='FALSE'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_by', sa.String, nullable=True),
    )

    op.create_index('ix_shell_library_templates_scope_node_id', 'shell_library_templates', ['scope_node_id'])
    op.create_index(
        'uix_shell_library_templates_scope_name',
        'shell_library_templates',
        ['scope_node_id', 'template_name'],
        unique=True,
        postgresql_where=sa.text('is_deleted = FALSE')
    )

    # Extend ars_study_templates
    op.add_column('ars_study_templates', sa.Column('source_library_id', sa.Integer, sa.ForeignKey('shell_library_templates.id', ondelete='SET NULL'), nullable=True))
    op.add_column('ars_study_templates', sa.Column('source_level', sa.String(20), nullable=True))
    op.add_column('ars_study_templates', sa.Column('source_template_name', sa.String(200), nullable=True))
    op.add_column('ars_study_templates', sa.Column('version_history', sa.JSON, nullable=True))

def downgrade():
    op.drop_column('ars_study_templates', 'version_history')
    op.drop_column('ars_study_templates', 'source_template_name')
    op.drop_column('ars_study_templates', 'source_level')
    op.drop_column('ars_study_templates', 'source_library_id')
    op.drop_index('uix_shell_library_templates_scope_name')
    op.drop_index('ix_shell_library_templates_scope_node_id')
    op.drop_table('shell_library_templates')
```

- [ ] **Step 3: Run migration**

Run:
```bash
cd backend && alembic upgrade head
```
Expected: Migration succeeds without errors

- [ ] **Step 4: Verify tables created**

Run:
```bash
cd backend && python -c "from app.models import *; print('Models imported OK')"
```
Expected: `Models imported OK`

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/versions/2026-03-31_*.py
git commit -m "feat(db): add shell_library_templates table and study_templates extensions"
```

---

### Task 2: Create ShellLibraryTemplate Model

**Files:**
- Create: `backend/app/models/shell_library.py`

- [ ] **Step 1: Write the model**

```python
# backend/app/models/shell_library.py

"""
Shell Library Template Model

Global/TA level shell templates for hierarchical template management.
"""
from typing import Any
from sqlalchemy import Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class ShellLibraryTemplate(Base, TimestampMixin, SoftDeleteMixin):
    """Global/TA 级 Shell 模板库"""

    __tablename__ = "shell_library_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope_level: Mapped[str] = mapped_column(
        String(20), nullable=False,
        comment="'global' | 'ta' | 'product' (reserved)",
    )
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Scope node (GLOBAL or TA node)",
    )
    category: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="Demographics / Adverse_Events / ...",
    )
    template_name: Mapped[str] = mapped_column(
        String(200), nullable=False,
        comment="Template display name",
    )
    display_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="Table",
        comment="Table / Figure / Listing",
    )
    shell_schema: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False,
        comment="Complete shell definition (TableShell/FigureShell/ListingShell)",
    )
    statistics_set_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("statistics_sets.id", ondelete="SET NULL"),
        nullable=True,
        comment="Linked statistics set",
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1,
        comment="Template version number",
    )
    version_history: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB, nullable=True,
        comment="Version change history",
    )
    description: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="Template description",
    )

    # Audit fields (from TimestampMixin: created_at, updated_at)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    updated_by: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Soft delete (from SoftDeleteMixin: is_deleted, deleted_at, deleted_by)

    __table_args__ = (
        {"comment": "Global/TA 级 Shell 模板库"},
    )

    def __repr__(self) -> str:
        return f"<ShellLibraryTemplate(id={self.id}, name={self.template_name}, level={self.scope_level})>"
```

- [ ] **Step 2: Register model in __init__**

Add to `backend/app/models/__init__.py`:
```python
from app.models.shell_library import ShellLibraryTemplate
```

- [ ] **Step 3: Verify model import**

Run:
```bash
cd backend && python -c "from app.models.shell_library import ShellLibraryTemplate; print('OK')"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/shell_library.py backend/app/models/__init__.py
git commit -m "feat(models): add ShellLibraryTemplate model"
```

---

### Task 3: Extend StudyTemplate Model

**Files:**
- Modify: `backend/app/models/ars_study.py`

- [ ] **Step 1: Add source tracking fields to StudyTemplate**

Locate `class StudyTemplate` in `backend/app/models/ars_study.py` (around line 119) and add after `version` field (line 160), before `created_by`:

```python
    # Source tracking (NEW)
    source_library_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("shell_library_templates.id", ondelete="SET NULL"),
        nullable=True,
        comment="Source template from Global/TA Library",
    )
    source_level: Mapped[str | None] = mapped_column(
        String(20), nullable=True,
        comment="Source level: 'global' | 'ta' | 'product'",
    )
    source_template_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True,
        comment="Original template name from source",
    )

    # Version history (NEW)
    version_history: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB, nullable=True,
        comment="Version change history",
    )
```

- [ ] **Step 2: Verify model still imports**

Run:
```bash
cd backend && python -c "from app.models.ars_study import StudyTemplate; print('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/ars_study.py
git commit -m "feat(models): add source tracking to StudyTemplate"
```

---

### Task 4: Create Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/shell_library.py`

- [ ] **Step 1: Write schemas**

```python
# backend/app/schemas/shell_library.py

"""
Pydantic schemas for Shell Library API
"""
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class VersionHistoryEntry(BaseModel):
    """Version history entry"""
    version: int
    changed_at: str
    changed_by: str
    change_description: Optional[str] = None
    snapshot: Optional[dict[str, Any]] = None


class ShellLibraryTemplateBase(BaseModel):
    """Base schema for ShellLibraryTemplate"""
    scope_level: str = Field(..., pattern="^(global|ta|product)$")
    scope_node_id: int
    category: str
    template_name: str
    display_type: str = Field(default="Table", pattern="^(Table|Figure|Listing)$")
    shell_schema: dict[str, Any]
    statistics_set_id: Optional[int] = None
    description: Optional[str] = None


class ShellLibraryTemplateCreate(ShellLibraryTemplateBase):
    """Schema for creating a new template"""
    pass


class ShellLibraryTemplateUpdate(BaseModel):
    """Schema for updating a template"""
    template_name: Optional[str] = None
    shell_schema: Optional[dict[str, Any]] = None
    description: Optional[str] = None


class ShellLibraryTemplateResponse(ShellLibraryTemplateBase):
    """Schema for template response"""
    id: int
    version: int
    version_history: Optional[list[VersionHistoryEntry]] = None
    created_by: str
    created_at: datetime
    updated_by: Optional[str] = None
    updated_at: datetime
    is_deleted: bool
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None

    class Config:
        from_attributes = True


class ShellLibraryTemplateList(BaseModel):
    """Schema for template list response"""
    items: list[ShellLibraryTemplateResponse]
    total: int


class PushRequestCreate(BaseModel):
    """Schema for push request"""
    source_type: str = Field(..., pattern="^(analysis|study|ta)$")
    source_id: int
    target_level: str = Field(..., pattern="^(global|ta)$")
    target_scope_node_id: int
    pr_title: str
    pr_description: Optional[str] = None
    update_existing_template_id: Optional[int] = None


class CloneToStudyRequest(BaseModel):
    """Schema for clone-to-study request"""
    study_id: int
```

- [ ] **Step 2: Verify schema imports**

Run:
```bash
cd backend && python -c "from app.schemas.shell_library import ShellLibraryTemplateCreate; print('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/shell_library.py
git commit -m "feat(schemas): add ShellLibraryTemplate Pydantic schemas"
```

---

### Task 5: Create Shell Library API Router

**Files:**
- Create: `backend/app/api/routers/shell_library.py`

- [ ] **Step 1: Write the router with CRUD endpoints**

```python
# backend/app/api/routers/shell_library.py

"""
Shell Library API Router

REST API for Global/TA level shell template management.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.shell_library import ShellLibraryTemplate
from app.models.audit_listener import set_audit_context
from app.schemas.shell_library import (
    ShellLibraryTemplateCreate,
    ShellLibraryTemplateUpdate,
    ShellLibraryTemplateResponse,
    ShellLibraryTemplateList,
)
from app.api.deps import CurrentUser, get_current_user

router = APIRouter(prefix="/shell-library", tags=["Shell Library"])


@router.get("/templates", response_model=ShellLibraryTemplateList)
async def list_templates(
    scope_level: Optional[str] = Query(None, pattern="^(global|ta|product)$"),
    scope_node_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    display_type: Optional[str] = Query(None, pattern="^(Table|Figure|Listing)$"),
    is_deleted: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List shell library templates with filters"""
    conditions = [ShellLibraryTemplate.is_deleted == is_deleted]

    if scope_level:
        conditions.append(ShellLibraryTemplate.scope_level == scope_level)
    if scope_node_id:
        conditions.append(ShellLibraryTemplate.scope_node_id == scope_node_id)
    if category:
        conditions.append(ShellLibraryTemplate.category == category)
    if display_type:
        conditions.append(ShellLibraryTemplate.display_type == display_type)

    stmt = select(ShellLibraryTemplate).where(and_(*conditions)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    templates = result.scalars().all()

    # Get total count
    count_stmt = select(ShellLibraryTemplate.id).where(and_(*conditions))
    count_result = await db.execute(count_stmt)
    total = len(count_result.all())

    return ShellLibraryTemplateList(items=templates, total=total)


@router.get("/templates/{template_id}", response_model=ShellLibraryTemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single shell library template"""
    stmt = select(ShellLibraryTemplate).where(ShellLibraryTemplate.id == template_id)
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return template


@router.post("/templates", response_model=ShellLibraryTemplateResponse, status_code=201)
async def create_template(
    data: ShellLibraryTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new shell library template"""
    # TODO: Add permission check (R_ADMIN for global, R_TA_ADMIN for ta)

    set_audit_context(db, current_user.username)

    template = ShellLibraryTemplate(
        scope_level=data.scope_level,
        scope_node_id=data.scope_node_id,
        category=data.category,
        template_name=data.template_name,
        display_type=data.display_type,
        shell_schema=data.shell_schema,
        statistics_set_id=data.statistics_set_id,
        description=data.description,
        version=1,
        created_by=current_user.username,
    )

    db.add(template)
    await db.commit()
    await db.refresh(template)

    return template


@router.put("/templates/{template_id}", response_model=ShellLibraryTemplateResponse)
async def update_template(
    template_id: int,
    data: ShellLibraryTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update a shell library template (increments version)"""
    set_audit_context(db, current_user.username)

    stmt = select(ShellLibraryTemplate).where(ShellLibraryTemplate.id == template_id)
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)

    # Increment version
    template.version += 1
    template.updated_by = current_user.username

    # TODO: Add version history entry

    await db.commit()
    await db.refresh(template)

    return template


@router.post("/templates/{template_id}/soft-delete", response_model=ShellLibraryTemplateResponse)
async def soft_delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Soft delete a shell library template"""
    set_audit_context(db, current_user.username)

    stmt = select(ShellLibraryTemplate).where(ShellLibraryTemplate.id == template_id)
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.soft_delete(current_user.username)
    await db.commit()
    await db.refresh(template)

    return template


@router.post("/templates/{template_id}/duplicate", response_model=ShellLibraryTemplateResponse, status_code=201)
async def duplicate_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Duplicate a shell library template"""
    set_audit_context(db, current_user.username)

    stmt = select(ShellLibraryTemplate).where(ShellLibraryTemplate.id == template_id)
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()

    if not source:
        raise HTTPException(status_code=404, detail="Template not found")

    import copy
    new_template = ShellLibraryTemplate(
        scope_level=source.scope_level,
        scope_node_id=source.scope_node_id,
        category=source.category,
        template_name=f"{source.template_name} (Copy)",
        display_type=source.display_type,
        shell_schema=copy.deepcopy(source.shell_schema),
        statistics_set_id=source.statistics_set_id,
        description=source.description,
        version=1,
        created_by=current_user.username,
    )

    db.add(new_template)
    await db.commit()
    await db.refresh(new_template)

    return new_template
```

- [ ] **Step 2: Register router**

Add to `backend/app/api/routers/__init__.py`:
```python
from app.api.routers.shell_library import router as shell_library_router
```

And register in `backend/app/main.py` (in the routers section around line 220):
```python
from app.api.routers.shell_library import router as shell_library_router
# ... then later
app.include_router(shell_library_router, prefix="/api/v1")
```

- [ ] **Step 3: Test endpoint (manual verification)**

Run:
```bash
cd backend && uvicorn app.main:app --reload &
curl http://localhost:8080/api/v1/shell-library/templates
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/routers/shell_library.py backend/app/api/routers/__init__.py
git commit -m "feat(api): add Shell Library CRUD endpoints"
```

---

## Phase 2: Frontend Foundation

### Task 6: Add TypeScript Types

**Files:**
- Modify: `frontend/src/features/tfl-designer/types.ts`

- [ ] **Step 1: Add ShellLibraryTemplate type**

Add to `frontend/src/features/tfl-designer/types.ts`:

```typescript
// ==================== Shell Library Types ====================

export type ScopeLevel = 'global' | 'ta' | 'product';

export interface VersionHistoryEntry {
  version: number;
  changedAt: string;
  changedBy: string;
  changeDescription?: string;
  snapshot?: TableShell | FigureShell | ListingShell;
}

export interface ShellLibraryTemplate {
  id: number;
  scopeLevel: ScopeLevel;
  scopeNodeId: number;
  category: AnalysisCategory;
  templateName: string;
  displayType: 'Table' | 'Figure' | 'Listing';
  shellSchema: TableShell | FigureShell | ListingShell;
  statisticsSetId?: number;
  version: number;
  versionHistory?: VersionHistoryEntry[];
  description?: string;

  // Audit fields
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;

  // Soft delete
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

// Extend StudyTemplate with source tracking
export interface StudyTemplateExtension {
  sourceLibraryId?: number;
  sourceLevel?: ScopeLevel;
  sourceTemplateName?: string;
  versionHistory?: VersionHistoryEntry[];
}

// Extend shell types with source tracking
export interface ShellSourceTracking {
  sourceTemplateId?: number;
  sourceLibraryId?: number;
  sourceLevel?: ScopeLevel | 'study';
  sourceTemplateName?: string;
  version: number;
  versionHistory?: VersionHistoryEntry[];
}
```

- [ ] **Step 2: Run type check**

Run:
```bash
cd frontend && pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/tfl-designer/types.ts
git commit -m "feat(types): add ShellLibraryTemplate and source tracking types"
```

---

### Task 7: Create shellLibraryStore

**Files:**
- Create: `frontend/src/features/tfl-designer/stores/shellLibraryStore.ts`

- [ ] **Step 1: Write the store**

```typescript
// frontend/src/features/tfl-designer/stores/shellLibraryStore.ts

/**
 * Shell Library Store (Zustand + Immer)
 *
 * Manages Global/TA level shell templates.
 * Replaces the deprecated templateStore.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ShellLibraryTemplate, ScopeLevel } from '../types';

type ScopeLevelFilter = 'all' | ScopeLevel;

interface ShellLibraryState {
  templates: ShellLibraryTemplate[];
  selectedTemplate: ShellLibraryTemplate | null;

  // Filters
  scopeLevelFilter: ScopeLevelFilter;
  searchQuery: string;

  // CRUD
  setTemplates: (templates: ShellLibraryTemplate[]) => void;
  addTemplate: (template: ShellLibraryTemplate) => void;
  updateTemplate: (id: number, updates: Partial<ShellLibraryTemplate>) => void;
  archiveTemplate: (id: number) => void;
  duplicateTemplate: (id: number) => void;

  // Selection
  selectTemplate: (template: ShellLibraryTemplate | null) => void;

  // Filters
  setScopeLevelFilter: (filter: ScopeLevelFilter) => void;
  setSearchQuery: (query: string) => void;

  // Computed
  getFilteredTemplates: () => ShellLibraryTemplate[];
}

export const useShellLibraryStore = create<ShellLibraryState>()(
  immer((set, get) => ({
    templates: [],
    selectedTemplate: null,
    scopeLevelFilter: 'all',
    searchQuery: '',

    setTemplates: (templates) =>
      set((state) => {
        state.templates = templates;
      }),

    addTemplate: (template) =>
      set((state) => {
        state.templates.push(template);
      }),

    updateTemplate: (id, updates) =>
      set((state) => {
        const index = state.templates.findIndex((t) => t.id === id);
        if (index !== -1) {
          Object.assign(state.templates[index], updates);
        }
      }),

    archiveTemplate: (id) =>
      set((state) => {
        const template = state.templates.find((t) => t.id === id);
        if (template) {
          template.isDeleted = true;
        }
        if (state.selectedTemplate?.id === id) {
          state.selectedTemplate = null;
        }
      }),

    duplicateTemplate: (id) =>
      set((state) => {
        const source = state.templates.find((t) => t.id === id);
        if (!source) return;

        const copy: ShellLibraryTemplate = {
          ...JSON.parse(JSON.stringify(source)),
          id: Date.now(), // Temporary ID, will be replaced by backend
          templateName: `${source.templateName} (Copy)`,
          version: 1,
          createdBy: 'duplicate',
          createdAt: new Date().toISOString().split('T')[0],
        };

        state.templates.push(copy);
      }),

    selectTemplate: (template) =>
      set((state) => {
        state.selectedTemplate = template;
      }),

    setScopeLevelFilter: (filter) =>
      set((state) => {
        state.scopeLevelFilter = filter;
      }),

    setSearchQuery: (query) =>
      set((state) => {
        state.searchQuery = query;
      }),

    getFilteredTemplates: () => {
      const state = get();
      let result = state.templates.filter((t) => !t.isDeleted);

      if (state.scopeLevelFilter !== 'all') {
        result = result.filter((t) => t.scopeLevel === state.scopeLevelFilter);
      }

      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        result = result.filter(
          (t) =>
            t.templateName.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q)
        );
      }

      return result;
    },
  }))
);
```

- [ ] **Step 2: Export from stores/index.ts**

Add to `frontend/src/features/tfl-designer/stores/index.ts`:
```typescript
export { useShellLibraryStore } from './shellLibraryStore';
```

- [ ] **Step 3: Run type check**

Run:
```bash
cd frontend && pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/tfl-designer/stores/shellLibraryStore.ts frontend/src/features/tfl-designer/stores/index.ts
git commit -m "feat(store): add shellLibraryStore for Global/TA templates"
```

---

## Phase 3: UI Updates

### Task 8: Update Global Shell Library Page

**Files:**
- Modify: `frontend/src/pages/(base)/mdr/tfl-template-library/index.tsx`

- [ ] **Step 1: Add scope level filter UI**

In the toolbar section, add after the search input:

```tsx
// Add state for scope level filter
const [scopeLevelFilter, setScopeLevelFilter] = useState<ScopeLevelFilter>('all');

// In toolbar JSX
<Segmented
  size="small"
  value={scopeLevelFilter}
  onChange={(v) => setScopeLevelFilter(v as ScopeLevelFilter)}
  options={[
    { label: 'All', value: 'all' },
    { label: 'Global', value: 'global' },
    { label: 'TA', value: 'ta' },
    { label: 'Product', value: 'product', disabled: true },
  ]}
  style={{ marginBottom: 8 }}
/>
```

- [ ] **Step 2: Add source tag to template cards**

Update the template card rendering to show scope level tag:

```tsx
<Tag
  color={template.scopeLevel === 'global' ? 'geekblue' : 'purple'}
  style={{ fontSize: 10 }}
>
  {template.scopeLevel === 'global' ? 'Global' : `TA`}
</Tag>
```

- [ ] **Step 3: Run type check**

Run:
```bash
cd frontend && pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/\(base\)/mdr/tfl-template-library/index.tsx
git commit -m "feat(ui): add scope level filter to Global Shell Library page"
```

---

### Task 9: Update Template Picker Modal

**Files:**
- Modify: `frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx`

- [ ] **Step 1: Add source filter dropdown**

Add source filter state and dropdown:

```tsx
const [sourceFilter, setSourceFilter] = useState<'all' | 'global' | 'ta' | 'study'>('all');

// In modal JSX, before template grid
<Select
  size="small"
  value={sourceFilter}
  onChange={setSourceFilter}
  options={[
    { label: 'All Sources', value: 'all' },
    { label: 'Global Library', value: 'global' },
    { label: 'TA Library', value: 'ta' },
    { label: 'Study Library', value: 'study' },
  ]}
  style={{ width: 140, marginBottom: 12 }}
/>
```

- [ ] **Step 2: Merge template sources**

Update template list to include all sources. Note: This code must be inside a React component using Zustand hooks:

```tsx
// Inside component, using Zustand hooks
const shellLibraryTemplates = useShellLibraryStore((s) => s.templates);
const studyTemplates = useStudyStore((s) => s.studyTemplates);

const allTemplates = useMemo(() => {
  const libraryTemplates = shellLibraryTemplates.filter(t => !t.isDeleted);

  const combined = [
    ...libraryTemplates.map(t => ({
      ...t,
      source: t.scopeLevel as 'global' | 'ta',
    })),
    ...studyTemplates.map(t => ({
      ...t,
      source: 'study' as const,
    })),
  ];

  if (sourceFilter !== 'all') {
    return combined.filter(t => t.source === sourceFilter);
  }
  return combined;
}, [shellLibraryTemplates, studyTemplates, sourceFilter]);
```

- [ ] **Step 3: Add source tag to cards**

```tsx
<Tag color={
  item.source === 'global' ? 'geekblue' :
  item.source === 'ta' ? 'purple' : 'green'
}>
  {item.source === 'study' ? 'Study' : item.source === 'global' ? 'Global' : 'TA'}
</Tag>
```

- [ ] **Step 4: Run type check**

Run:
```bash
cd frontend && pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx
git commit -m "feat(ui): add multi-source support to Template Picker Modal"
```

---

### Task 10: Update Study Shell Library

**Files:**
- Rename: `frontend/src/features/tfl-designer/components/study/StudyTemplateLibrary.tsx` → `StudyShellLibrary.tsx`

- [ ] **Step 1: Rename file and update component**

```bash
cd frontend/src/features/tfl-designer/components/study
mv StudyTemplateLibrary.tsx StudyShellLibrary.tsx
```

Update component name and title:

```tsx
// Change component name
export default function StudyShellLibrary() {

// Update Card title
<Card
  title={
    <Space>
      <Title level={5} style={{ margin: 0 }}>Study Shell Library</Title>
      <Tag color="purple">{studyTemplates.length}</Tag>
    </Space>
  }
```

- [ ] **Step 2: Add source column to table**

Add column after `templateName`:

```tsx
{
  title: 'Source',
  dataIndex: 'sourceLevel',
  key: 'source',
  width: 120,
  render: (level: string | undefined, record: StudyTemplate) => {
    if (!level) return <Text type="secondary">Scratch</Text>;
    const color = level === 'global' ? 'geekblue' : level === 'ta' ? 'purple' : 'green';
    return (
      <Tag color={color}>
        {level === 'global' ? 'Global' : level === 'ta' ? 'TA' : 'Study'}
      </Tag>
    );
  },
},
```

- [ ] **Step 3: Update exports**

Update `frontend/src/features/tfl-designer/components/study/index.ts`:
```tsx
// Change from
export { default as StudyTemplateLibrary } from './StudyTemplateLibrary';
// To
export { default as StudyShellLibrary } from './StudyShellLibrary';
```

Update `frontend/src/features/tfl-designer/index.ts`:
```tsx
// Update import path
export { StudyShellLibrary } from './components/study/StudyShellLibrary';
```

- [ ] **Step 4: Run type check**

Run:
```bash
cd frontend && pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/tfl-designer/components/study/StudyShellLibrary.tsx frontend/src/features/tfl-designer/components/study/index.ts frontend/src/features/tfl-designer/index.ts
git commit -m "feat(ui): rename to StudyShellLibrary, add source column"
```

---

## Phase 4: Push Mechanism

### Task 11: Create PushToLibraryModal Component

**Files:**
- Create: `frontend/src/features/tfl-designer/components/shared/PushToLibraryModal.tsx`

- [ ] **Step 1: Write the modal component**

```tsx
/**
 * TFL Designer - Push to Library Modal
 *
 * Modal for pushing shells/templates to Global/TA Library via PR workflow.
 */
import { useState, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Tag,
  Divider,
  Alert,
  Button,
} from 'antd';
import { SendOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
const { TextArea } = Input;

type TargetLevel = 'global' | 'ta';

interface Props {
  open: boolean;
  onClose: () => void;
  sourceType: 'analysis' | 'study' | 'ta';
  sourceId: number;
  sourceName: string;
  shellSchema: object;
}

export default function PushToLibraryModal({
  open,
  onClose,
  sourceType,
  sourceId,
  sourceName,
  shellSchema,
}: Props) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const targetLevel = Form.useWatch('targetLevel', form);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();

      // TODO: Call API POST /api/v1/shell-library/push-request
      console.log('Push request:', {
        sourceType,
        sourceId,
        targetLevel: values.targetLevel,
        targetScopeNodeId: values.targetScopeNodeId,
        prTitle: values.prTitle,
        prDescription: values.prDescription,
      });

      window.$message?.success('Push request submitted for review');
      form.resetFields();
      onClose();
    } catch {
      // Form validation error
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <SendOutlined />
          <span>Push to Library</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={600}
      footer={
        <Space>
          <Text type="secondary">This will create a PR for review</Text>
          <span style={{ flex: 1 }} />
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            Submit PR
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        message={`Push "${sourceName}" to ${targetLevel === 'global' ? 'Global' : 'TA'} Library`}
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="targetLevel"
          label="Target Level"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { label: 'Global Library', value: 'global' },
              { label: 'TA Library', value: 'ta' },
            ]}
          />
        </Form.Item>

        {targetLevel === 'ta' && (
          <Form.Item
            name="targetScopeNodeId"
            label="Target TA"
            rules={[{ required: true, message: 'Select a TA' }]}
          >
            <Select
              placeholder="Select Therapeutic Area"
              options={[
                // TODO: Load from API
                { label: 'Oncology', value: 1 },
                { label: 'Cardiovascular', value: 2 },
                { label: 'CNS', value: 3 },
              ]}
            />
          </Form.Item>
        )}

        <Form.Item
          name="prTitle"
          label="PR Title"
          rules={[{ required: true, message: 'Enter a title' }]}
        >
          <Input placeholder="e.g., Add Demographics shell template" />
        </Form.Item>

        <Form.Item name="prDescription" label="Description">
          <TextArea rows={3} placeholder="Describe the changes and rationale..." />
        </Form.Item>
      </Form>

      <Divider orientation="left">Preview</Divider>
      <div style={{ padding: 12, background: '#fafafa', borderRadius: 4 }}>
        <Text code style={{ fontSize: 11 }}>
          {JSON.stringify(shellSchema, null, 2).slice(0, 500)}...
        </Text>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Export from index.ts**

Add to `frontend/src/features/tfl-designer/index.ts`:
```tsx
export { default as PushToLibraryModal } from './components/shared/PushToLibraryModal';
```

- [ ] **Step 3: Run type check**

Run:
```bash
cd frontend && pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/tfl-designer/components/shared/PushToLibraryModal.tsx frontend/src/features/tfl-designer/index.ts
git commit -m "feat(ui): add PushToLibraryModal component"
```

---

## Phase 5: JSON Import

### Task 12: Create JSON Import Utilities

**Files:**
- Create: `frontend/src/features/tfl-designer/utils/jsonImportUtils.ts`

- [ ] **Step 1: Write the import utilities**

```typescript
// frontend/src/features/tfl-designer/utils/jsonImportUtils.ts

/**
 * JSON Import Utilities
 *
 * Parse Clymb Clinical ARS format JSON into shell templates.
 */
import type { TableShell, TableRow, TableFooter, AnalysisCategory } from '../types';
import { generateId } from '../types';

// ARS JSON format interfaces
interface ARSAbout {
  version: string;
}

interface ARSStudyInfo {
  studyId: string;
  therapeuticArea?: string;
}

interface ARSResult {
  rawValue?: string;
  formattedValue?: string;
}

interface ARSAnalysis {
  id: string;
  name: string;
  dataset: string;
  variable: string;
  results: ARSResult[];
}

interface ARSDisplaySection {
  sectionType: string;
  orderedSubSections?: Array<{
    subSection: { text: string };
  }>;
}

interface ARSDisplay {
  id: string;
  name: string;
  displayTitle: string;
  displaySections: ARSDisplaySection[];
}

interface ARSOutput {
  id: string;
  name: string;
  displays: Array<{ display: ARSDisplay }>;
}

interface ARSExportJSON {
  about: ARSAbout;
  studyInfo: ARSStudyInfo;
  analyses: ARSAnalysis[];
  outputs: ARSOutput[];
}

/**
 * Parse ARS JSON to TableShell templates
 */
export function parseARSJSONToShells(json: ARSExportJSON): Partial<TableShell>[] {
  const shells: Partial<TableShell>[] = [];

  for (const output of json.outputs || []) {
    for (const displayItem of output.displays || []) {
      const display = displayItem.display;
      const sections = display.displaySections || [];

      const titleSection = sections.find((s) => s.sectionType === 'Title');
      const footnoteSection = sections.find((s) => s.sectionType === 'Footnote');

      const shellNumber = titleSection?.orderedSubSections?.[0]?.subSection?.text || '';
      const title = titleSection?.orderedSubSections?.[1]?.subSection?.text || display.displayTitle;

      const footerNotes = footnoteSection?.orderedSubSections?.map((s) => s.subSection.text) || [];

      const shell: Partial<TableShell> = {
        id: generateId('table'),
        shellNumber,
        title,
        population: 'Safety',
        category: inferCategory(display.name),
        dataset: 'ADSL',
        rows: [],
        footer: {
          source: 'ADSL',
          notes: footerNotes,
        },
      };

      shells.push(shell);
    }
  }

  return shells;
}

/**
 * Infer category from template name
 */
function inferCategory(name: string): AnalysisCategory {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('demograph') || lowerName.includes('age') || lowerName.includes('sex')) {
    return 'Demographics';
  }
  if (lowerName.includes('adverse') || lowerName.includes('ae ') || lowerName.includes(' sae')) {
    return 'Adverse_Events';
  }
  if (lowerName.includes('efficacy') || lowerName.includes('primary')) {
    return 'Efficacy';
  }
  if (lowerName.includes('laboratory') || lowerName.includes('lab ')) {
    return 'Laboratory';
  }
  if (lowerName.includes('vital') || lowerName.includes('sign')) {
    return 'Vital_Signs';
  }
  if (lowerName.includes('concomitant') || lowerName.includes('medication')) {
    return 'Concomitant_Medications';
  }

  return 'Other';
}

/**
 * Validate ARS JSON structure
 */
export function validateARSJSON(json: unknown): json is ARSExportJSON {
  if (!json || typeof json !== 'object') return false;

  const obj = json as Record<string, unknown>;

  // Check required fields
  if (!obj.about || typeof obj.about !== 'object') return false;
  if (!Array.isArray(obj.outputs)) return false;

  return true;
}

export type { ARSExportJSON, ARSAnalysis, ARSOutput };
```

- [ ] **Step 2: Run type check**

Run:
```bash
cd frontend && pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/tfl-designer/utils/jsonImportUtils.ts
git commit -m "feat(utils): add ARS JSON import utilities"
```

---

## Final Steps

### Task 13: Integration Testing & Documentation

- [ ] **Step 1: Run full type check**

Run:
```bash
cd frontend && pnpm typecheck
cd ../backend && python -m py_compile app/models/shell_library.py app/api/routers/shell_library.py
```

- [ ] **Step 2: Run migration on test database**

Run:
```bash
cd backend && alembic upgrade head
```

- [ ] **Step 3: Manual testing checklist**

Test the following scenarios:
- [ ] Create Global template via API
- [ ] List templates with scope level filter
- [ ] Soft delete template
- [ ] Frontend displays templates with source tags
- [ ] Template picker shows all sources

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete Shell Library Hierarchy System Phase 1-5

Implements 4-level shell template hierarchy:
- Global/TA shell library with CRUD API
- Source tracking for Study templates
- Push mechanism via PR workflow (UI ready)
- JSON import utilities for Clymb Clinical format

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1: Foundation | Tasks 1-5 | Database & Backend API |
| Phase 2: Frontend Foundation | Tasks 6-7 | Types & Store |
| Phase 3: UI Updates | Tasks 8-10 | Page modifications |
| Phase 4: Push Mechanism | Task 11 | PushToLibraryModal |
| Phase 5: JSON Import | Task 12 | Import utilities |
| Final | Task 13 | Testing & Commit |

**Next Steps After Plan Completion:**
1. Add push API endpoints to backend (PR workflow integration)
2. Add clone-to-study API endpoint
3. Add import API endpoints
4. Implement permission checks (R_ADMIN, R_TA_ADMIN)
5. Add version history recording on updates
6. Add shell store push methods (tableStore.pushToStudy, pushToLibrary)
7. Add Study Template API extensions (import, push-to-library, clone-from-library)

**Note on Analysis Shell Source Tracking:** Per spec Section 1.3, `ShellSourceTracking` fields are added to frontend types only. Analysis shells are not persisted to database (they exist in frontend store only), so no backend migration needed.