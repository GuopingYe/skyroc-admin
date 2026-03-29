# TFL Designer Enhancement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect Statistics Sets to shell placeholder rendering, add study-level shell templates with per-category libraries and inheritance, and enable PR-based propagation from analysis shells back to study templates.

**Architecture:** Layered scope-node model. New backend tables (`statistics_sets`, `ars_study_defaults`, `ars_study_templates`) at study level. `ARSDisplay` gains FK columns to track template lineage. Frontend gains a `formatPlaceholder` utility, new study settings tabs, a template picker modal, and a "Push to Study" PR flow.

**Tech Stack:** FastAPI / SQLAlchemy 2.0 async / Alembic / PostgreSQL | React 18 / TypeScript / Zustand+Immer / Ant Design

**Spec:** `docs/superpowers/specs/2026-03-29-tfl-designer-enhancement-design.md`

---

## File Structure

### New Backend Files
- `backend/app/models/ars_study.py` — `StatisticsSet`, `StatisticsItem`, `StudyDefaults`, `StudyTemplate` models
- `backend/app/api/routers/ars_study.py` — study defaults + template CRUD + clone + PR propagation endpoints
- `backend/app/schemas/ars_study.py` — Pydantic request/response schemas for new endpoints
- Modify: `backend/app/schemas/ars_schemas.py` — add `source_template_id`, `source_template_version`, `decimal_override`, `statistics_set_id` to `ARSDisplayRead`, `ARSDisplayCreate`, `ARSDisplayDetailRead`
- `backend/alembic/versions/*_tfl_study_templates_001.py` — migration 1: create tables (filename varies by Alembic autogenerate)
- `backend/alembic/versions/*_tfl_study_constraints_002.py` — migration 2: add FKs

### New Frontend Files
- `frontend/src/features/tfl-designer/utils/placeholderFormatter.ts` — `formatPlaceholder` + `resolveDecimals`
- `frontend/src/features/tfl-designer/components/study/StudyTemplateLibrary.tsx` — template library CRUD
- `frontend/src/features/tfl-designer/components/study/DecimalDefaultsEditor.tsx` — study-wide decimal config
- `frontend/src/features/tfl-designer/components/table/DecimalSettingsTab.tsx` — per-shell decimal editor
- `frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx` — template selection modal
- `frontend/src/features/tfl-designer/components/shared/PushToStudyModal.tsx` — PR creation with diff preview
- `frontend/src/service/api/tfl-study.ts` — API client for study templates/defaults
- `frontend/src/service/urls/tfl-study.ts` — URL constants
- `frontend/src/service/types/tfl-study.d.ts` — TypeScript types for new backend entities

### Modified Backend Files
- `backend/app/models/ars.py` — add `source_template_id`, `source_template_version`, `decimal_override`, `statistics_set_id` to `ARSDisplay`
- `backend/app/models/__init__.py` — register new models
- `backend/app/models/mapping_enums.py` — add `SHELL_TEMPLATE_UPDATE` to `PRItemType`

### Modified Frontend Files
- `frontend/src/features/tfl-designer/types.ts` — add `DecimalConfig`, `StudyTemplate`, `StudyDefaults` types
- `frontend/src/features/tfl-designer/stores/studyStore.ts` — add template library state + decimal defaults
- `frontend/src/features/tfl-designer/stores/tableStore.ts` — add `decimalOverride` to state
- `frontend/src/features/tfl-designer/components/shared/InteractiveOutputEditor.tsx` — render placeholders
- `frontend/src/features/tfl-designer/components/study/index.ts` — export new components
- `frontend/src/features/tfl-designer/components/index.ts` — export new components
- `frontend/src/features/tfl-designer/index.ts` — export new components
- `frontend/src/pages/(base)/mdr/tfl-designer/index.tsx` — new sidebar tabs, template picker, push button, decimals tab

---

## Task 1: Backend Models — Statistics Sets + Study Defaults + Study Templates

**Files:**
- Create: `backend/app/models/ars_study.py`
- Modify: `backend/app/models/ars.py` (add 4 columns to `ARSDisplay`)
- Modify: `backend/app/models/__init__.py` (register new models)
- Modify: `backend/app/models/mapping_enums.py` (add `SHELL_TEMPLATE_UPDATE` to `PRItemType`)
- Modify: `backend/app/schemas/ars_schemas.py` (add new fields to ARSDisplay schemas)

- [ ] **Step 1: Create `backend/app/models/ars_study.py`**

```python
"""
ARS Study-Level Models

Statistics Sets, Study Defaults, and Study Templates for TFL Designer.
"""
from typing import Any

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from app.models.base import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class StatisticsSet(Base, TimestampMixin, SoftDeleteMixin):
    """统计量集合 — 可在 study 级别定义，供 shell 引用"""

    __tablename__ = "statistics_sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="所属 study scope node",
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="集合名称")

    stats: Mapped[list["StatisticsItem"]] = relationship(
        "StatisticsItem",
        back_populates="statistics_set",
        cascade="all, delete-orphan",
        order_by="StatisticsItem.sort_order",
    )

    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    updated_by: Mapped[str | None] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        Index("uix_stat_sets_scope_name", "scope_node_id", "name", unique=True),
        {"comment": "统计量集合表"},
    )

    def __repr__(self) -> str:
        return f"<StatisticsSet(id={self.id}, name={self.name})>"


class StatisticsItem(Base, TimestampMixin):
    """统计量条目"""

    __tablename__ = "statistics_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    statistics_set_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("statistics_sets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stat_type: Mapped[str] = mapped_column(
        String(30), nullable=False,
        comment="n / mean / sd / median / min / max / range / n_percent / header",
    )
    label: Mapped[str] = mapped_column(String(100), nullable=False, comment="显示标签")
    format: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="格式模板 e.g. XX.X (X.XX)",
    )

    statistics_set: Mapped["StatisticsSet"] = relationship(
        "StatisticsSet", back_populates="stats",
    )

    __table_args__ = (
        Index("uix_stat_items_set_order", "statistics_set_id", "sort_order", unique=True),
        {"comment": "统计量条目表"},
    )


class StudyDefaults(Base, TimestampMixin, SoftDeleteMixin):
    """Study 级全局默认配置"""

    __tablename__ = "ars_study_defaults"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
        index=True,
        comment="Study scope node (1:1)",
    )
    default_statistics_set_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("statistics_sets.id", ondelete="SET NULL"),
        nullable=True,
        comment="默认统计量集合",
    )
    decimal_rules: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        comment='{"n":0, "mean":2, "sd":3, "percent":2, "median":1, "min":1, "max":1}',
    )
    header_style: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True, comment="默认 header 样式",
    )

    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    updated_by: Mapped[str | None] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        {"comment": "Study 级全局默认配置"},
    )


class StudyTemplate(Base, TimestampMixin, SoftDeleteMixin):
    """Study 级 Shell 模板 — 按 category 分类的模板库"""

    __tablename__ = "ars_study_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Study scope node",
    )
    category: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="Demographics / Adverse_Events / ...",
    )
    template_name: Mapped[str] = mapped_column(
        String(200), nullable=False, comment="模板名称",
    )
    display_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="Table",
        comment="Table / Figure / Listing",
    )
    shell_schema: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False,
        comment="完整 shell 定义 (TableShell/FigureShell/ListingShell 结构)",
    )
    statistics_set_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("statistics_sets.id", ondelete="SET NULL"),
        nullable=True,
        comment="关联的统计量集合",
    )
    decimal_override: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True,
        comment="模板级小数位覆盖 (与 Study Defaults 合并)",
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1,
        comment="模板版本号",
    )

    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    updated_by: Mapped[str | None] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        Index(
            "uix_ars_study_templates_scope_cat_name",
            "scope_node_id", "category", "template_name",
            unique=True,
        ),
        {"comment": "Study 级 Shell 模板库"},
    )

    def __repr__(self) -> str:
        return f"<StudyTemplate(id={self.id}, name={self.template_name}, v{self.version})>"


# Late imports to avoid circular refs
from app.models.scope_node import ScopeNode
```

- [ ] **Step 2: Add columns to `ARSDisplay` in `backend/app/models/ars.py`**

Add after the existing `updated_by` field (around line 95), before the relationships section:

```python
    # Template lineage (inheritance tracking)
    source_template_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("ars_study_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="克隆来源的 Study 模板 ID",
    )
    source_template_version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="克隆时的模板版本号",
    )
    decimal_override: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True,
        comment="Shell 级小数位覆盖",
    )
    statistics_set_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("statistics_sets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="关联的统计量集合 ID",
    )
```

- [ ] **Step 3: Register new models in `backend/app/models/__init__.py`**

Add imports after the existing ARS imports:

```python
from app.models.ars_study import StatisticsItem, StatisticsSet, StudyDefaults, StudyTemplate
```

Add to `__all__` list:

```python
    # ARS Study Models
    "StatisticsSet",
    "StatisticsItem",
    "StudyDefaults",
    "StudyTemplate",
```

- [ ] **Step 4: Add `SHELL_TEMPLATE_UPDATE` to `PRItemType` in `backend/app/models/mapping_enums.py`**

Add to the `PRItemType` enum:

```python
    SHELL_TEMPLATE_UPDATE = "ShellTemplateUpdate"  # Shell 模板更新 PR
```

- [ ] **Step 5: Update existing ARS Pydantic schemas**

Find the existing ARS display schemas (likely in `backend/app/schemas/` or similar). Add these new fields to `ARSDisplayRead`, `ARSDisplayCreate`, and `ARSDisplayDetailRead`:
- `source_template_id: int | None = None`
- `source_template_version: int | None = None`
- `decimal_override: dict | None = None`
- `statistics_set_id: int | None = None`

- [ ] **Step 6: Verify models load**

Run: `cd backend && python -c "from app.models import StatisticsSet, StatisticsItem, StudyDefaults, StudyTemplate; print('OK')"`
Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/ars_study.py backend/app/models/ars.py backend/app/models/__init__.py backend/app/models/mapping_enums.py backend/app/schemas/
git commit -m "feat(ars): add statistics sets, study defaults, and study template models"
```

---

## Task 2: Alembic Migration — Create Tables + Add Columns

**Files:**
- Create: `backend/alembic/versions/2026-03-29_001_tfl_study_templates.py`
- Create: `backend/alembic/versions/2026-03-29_002_tfl_study_constraints.py`

- [ ] **Step 1: Generate migration from model changes**

Run: `cd backend && alembic revision --autogenerate -m "tfl_study_templates_001"`

Note: Alembic autogenerates filenames with a hash prefix (e.g., `2026-03-29_a1b2c3d4e5f6_tfl_study_templates_001.py`). The filename won't match the file structure section exactly — this is expected.

Review the generated migration. Ensure it includes:
1. `statistics_sets` table
2. `statistics_items` table
3. `ars_study_defaults` table
4. `ars_study_templates` table
5. New columns on `ars_displays`: `source_template_id`, `source_template_version`, `decimal_override`, `statistics_set_id`

If autogenerate misses anything, edit the migration to include all changes.

- [ ] **Step 2: Run migration**

Run: `cd backend && alembic upgrade head`
Expected: no errors

- [ ] **Step 3: Verify tables exist**

Run: `cd backend && python -c "from sqlalchemy import inspect; from app.core.database import engine; import asyncio; async def check(): async with engine.connect() as conn: pass; print('tables OK')"`
Expected: `tables OK`

- [ ] **Step 4: Commit migration**

```bash
git add backend/alembic/versions/
git commit -m "migrate(tfl): add statistics_sets, study_defaults, study_templates tables"
```

---

## Task 3: Backend API — Study Defaults + Templates + Clone + PR

**Files:**
- Create: `backend/app/api/schemas/ars_study.py`
- Create: `backend/app/api/routers/ars_study.py`
- Modify: `backend/app/main.py` or router registry (register new router)

- [ ] **Step 1: Create Pydantic schemas in `backend/app/api/schemas/ars_study.py`**

Define request/response schemas for:
- `StatisticsSetCreate` / `StatisticsSetUpdate` / `StatisticsSetResponse`
- `StatisticsItemSchema`
- `StudyDefaultsUpdate` / `StudyDefaultsResponse`
- `StudyTemplateCreate` / `StudyTemplateUpdate` / `StudyTemplateResponse`
- `CloneFromTemplateRequest` / `CloneFromTemplateResponse`
- `ProposeToStudyRequest` / `DiffResponse`

- [ ] **Step 2: Create router in `backend/app/api/routers/ars_study.py`**

Implement endpoints per spec Section 4:
- `GET /api/v1/ars/study-defaults/{scope_node_id}`
- `PUT /api/v1/ars/study-defaults/{scope_node_id}`
- `GET /api/v1/ars/study-templates/{scope_node_id}`
- `GET /api/v1/ars/study-templates/{scope_node_id}/{template_id}`
- `POST /api/v1/ars/study-templates/{scope_node_id}`
- `PUT /api/v1/ars/study-templates/{scope_node_id}/{template_id}`
- `DELETE /api/v1/ars/study-templates/{scope_node_id}/{template_id}` (soft delete)
- `POST /api/v1/ars/displays/{scope_node_id}/from-template`
- `POST /api/v1/ars/displays/{display_id}/propose-to-study`
- `GET /api/v1/ars/displays/{display_id}/diff-template`

Key implementation notes:
- `from-template` endpoint: deep-clone `shell_schema` from `StudyTemplate` into a new `ARSDisplay`, record `source_template_id` and `source_template_version`
- `propose-to-study`: compute diff between display's current state and source template, create `MetadataPullRequest` with `item_type=SHELL_TEMPLATE_UPDATE`
- `diff-template`: return JSON diff of rows, stats, decimal changes

- [ ] **Step 3: Register router in app**

Add the new router to the FastAPI app (find where `ars_builder` or `tfl` router is registered and follow the pattern).

- [ ] **Step 4: Verify API starts**

Run: `cd backend && python -c "from app.main import app; print([r.path for r in app.routes if 'study-template' in str(r.path) or 'study-default' in str(r.path)][:6])"`
Expected: list of new routes matching `study-templates` and `study-defaults`

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/schemas/ars_study.py backend/app/api/routers/ars_study.py backend/app/
git commit -m "feat(ars): add study defaults, templates, clone, and PR propagation API"
```

---

## Task 4: Frontend Types + Placeholder Formatter

**Files:**
- Modify: `frontend/src/features/tfl-designer/types.ts`
- Create: `frontend/src/features/tfl-designer/utils/placeholderFormatter.ts`

- [ ] **Step 1: Add new types to `types.ts`**

Add after the existing `StatisticItem` interface:

```typescript
// ==================== Decimal Config ====================

export type StatTypeKey = 'n' | 'mean' | 'sd' | 'median' | 'min' | 'max' | 'percent' | 'range';

export interface DecimalConfig {
  n?: number;
  mean?: number;
  sd?: number;
  median?: number;
  min?: number;
  max?: number;
  percent?: number;
  range?: number;
}

export const DEFAULT_DECIMAL_RULES: DecimalConfig = {
  n: 0,
  mean: 2,
  sd: 3,
  median: 1,
  min: 1,
  max: 1,
  percent: 2,
};

// ==================== Study Template ====================

export interface StudyTemplate {
  id: string | number;
  scopeNodeId: string | number;
  category: AnalysisCategory;
  templateName: string;
  displayType: 'Table' | 'Figure' | 'Listing';
  shellSchema: TableShell | FigureShell | ListingShell;
  statisticsSetId?: string | number;
  decimalOverride?: DecimalConfig;
  version: number;
  createdBy?: string;
  updatedAt?: string;
}

export interface StudyDefaults {
  id: string | number;
  scopeNodeId: string | number;
  defaultStatisticsSetId?: string | number;
  decimalRules: DecimalConfig;
  headerStyle?: Record<string, unknown>;
}
```

- [ ] **Step 2: Create `placeholderFormatter.ts`**

```typescript
import type { DecimalConfig, StatTypeKey, RowStats } from '../types';

/**
 * Resolve decimal places for a stat type using the 3-level chain:
 * 1. Row-level override (highest priority)
 * 2. Shell-level defaults
 * 3. Study-level defaults (fallback)
 */
export function resolveDecimals(
  statType: StatTypeKey,
  rowDecimals: number | undefined,
  shellDefaults: DecimalConfig | undefined,
  studyDefaults: DecimalConfig | undefined,
  globalDefaults: DecimalConfig,
): number {
  if (rowDecimals !== undefined) return rowDecimals;
  if (shellDefaults?.[statType] !== undefined) return shellDefaults[statType]!;
  if (studyDefaults?.[statType] !== undefined) return studyDefaults[statType]!;
  return globalDefaults[statType] ?? 2;
}

/**
 * Build a decimal config map from row stats + shell + study defaults.
 */
export function buildDecimalsMap(
  stats: RowStats[],
  shellDefaults: DecimalConfig | undefined,
  studyDefaults: DecimalConfig | undefined,
  globalDefaults: DecimalConfig,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of stats) {
    const key = s.type as StatTypeKey;
    // For combined stats like n_percent, use 'percent' key
    const lookupKey = key === 'n_percent' ? 'percent' : key;
    map[lookupKey] = resolveDecimals(lookupKey, s.decimals, shellDefaults, studyDefaults, globalDefaults);
  }
  return map;
}

/**
 * Generate placeholder string from stat types and resolved decimals.
 */
export function formatPlaceholder(
  statTypes: string[],
  decimalsMap: Record<string, number>,
): string | null {
  if (statTypes.length === 0) return null;
  if (statTypes.includes('header')) return null;

  // n → "XX"
  if (statTypes.length === 1 && statTypes[0] === 'n') return 'XX';

  // n_percent → "XX (XX.XX)"
  if (statTypes.length === 1 && statTypes[0] === 'n_percent') {
    const pct = decimalsMap.percent ?? 2;
    return `XX (XX.${'X'.repeat(pct)})`;
  }

  // mean + sd → "XX.XX (XX.XXX)"
  if (statTypes.includes('mean') && statTypes.includes('sd')) {
    const meanD = decimalsMap.mean ?? 2;
    const sdD = decimalsMap.sd ?? 3;
    return `XX.${'X'.repeat(meanD)} (XX.${'X'.repeat(sdD)})`;
  }

  // mean alone → "XX.XX"
  if (statTypes.includes('mean')) {
    const d = decimalsMap.mean ?? 2;
    return `XX.${'X'.repeat(d)}`;
  }

  // median → "XX.XX"
  if (statTypes.includes('median')) {
    const d = decimalsMap.median ?? 2;
    return `XX.${'X'.repeat(d)}`;
  }

  // min + max → "XX.XX, XX.XX"
  if (statTypes.includes('min') && statTypes.includes('max')) {
    const d = decimalsMap.min ?? 1;
    return `XX.${'X'.repeat(d)}, XX.${'X'.repeat(d)}`;
  }

  // range → "XX.XX"
  if (statTypes.includes('range')) {
    const d = decimalsMap.range ?? 1;
    return `XX.${'X'.repeat(d)}`;
  }

  // fallback
  return 'XX.XX';
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/tfl-designer/types.ts frontend/src/features/tfl-designer/utils/placeholderFormatter.ts
git commit -m "feat(tfl): add decimal config types and placeholder formatter utility"
```

---

## Task 5: Frontend Stores — Study Template + Decimal State

**Files:**
- Modify: `frontend/src/features/tfl-designer/stores/studyStore.ts`
- Modify: `frontend/src/features/tfl-designer/stores/tableStore.ts`

- [ ] **Step 1: Add template library + decimal defaults state to `studyStore.ts`**

Add to `StudyState` interface:
```typescript
  studyTemplates: StudyTemplate[];
  studyDefaults: StudyDefaults | null;

  // Study Template CRUD
  setStudyTemplates: (templates: StudyTemplate[]) => void;
  addStudyTemplate: (template: Omit<StudyTemplate, 'id' | 'version'>) => void;
  updateStudyTemplate: (id: string | number, updates: Partial<StudyTemplate>) => void;
  deleteStudyTemplate: (id: string | number) => void;

  // Study Defaults
  setStudyDefaults: (defaults: StudyDefaults) => void;
  updateDecimalRules: (rules: DecimalConfig) => void;
```

Initialize with empty arrays/null. Implement actions following the existing CRUD patterns in the store.

- [ ] **Step 2: Add decimal override + statistics set to `tableStore.ts` state**

Ensure `TableShell` type includes `decimalOverride?: DecimalConfig` and `statisticsSetId` is properly used.

Add to `TableState`:
```typescript
  updateDecimalOverride: (overrides: DecimalConfig) => void;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/tfl-designer/stores/studyStore.ts frontend/src/features/tfl-designer/stores/tableStore.ts
git commit -m "feat(tfl): add study template and decimal state to stores"
```

---

## Task 6: Frontend — InteractiveOutputEditor Placeholder Rendering

**Files:**
- Modify: `frontend/src/features/tfl-designer/components/shared/InteractiveOutputEditor.tsx`

- [ ] **Step 1: Integrate `formatPlaceholder` into the table preview renderer**

Find where data cells are rendered for each row in the `InteractiveOutputEditor`. Currently cells are empty for rows with `stats`.

Add logic: for each `TableRow` that has `stats` and is not a `header` type:
1. Extract stat types from `row.stats.map(s => s.type)`
2. Build decimals map using `buildDecimalsMap()`
3. Call `formatPlaceholder(statTypes, decimalsMap)`
4. Render the placeholder string in the cell, styled with a distinct color (e.g., `color: #1890ff`)

The component needs new props:
```typescript
  /** Decimal config for resolving placeholder precision */
  decimalConfig?: {
    shellDefaults?: DecimalConfig;
    studyDefaults?: DecimalConfig;
  };
```

- [ ] **Step 2: Verify placeholder rendering in browser**

Run: `cd frontend && pnpm dev`
Open TFL Designer, select a table shell, verify cells show `XX`, `XX.XX (XX.XXX)`, `XX (XX.XX)` etc.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/tfl-designer/components/shared/InteractiveOutputEditor.tsx
git commit -m "feat(tfl): render placeholder values based on statistics config"
```

---

## Task 7: Frontend — Decimal Settings UI (Study-wide + Per-shell)

**Files:**
- Create: `frontend/src/features/tfl-designer/components/study/DecimalDefaultsEditor.tsx`
- Create: `frontend/src/features/tfl-designer/components/table/DecimalSettingsTab.tsx`

- [ ] **Step 1: Create `DecimalDefaultsEditor.tsx`**

Study-wide decimal config editor. Simple form with `InputNumber` for each stat type (n, mean, sd, median, min, max, percent). Saves to `studyStore.updateDecimalRules()`.

- [ ] **Step 2: Create `DecimalSettingsTab.tsx`**

Per-shell decimal override tab for the table editor. Shows:
- Study default column (read-only)
- Shell override column (editable `InputNumber`)
- Info banner explaining inheritance

- [ ] **Step 3: Wire `DecimalSettingsTab` into the table editor tabs**

In `index.tsx`, add a new tab `decimals` to the table editor `Tabs` component.

- [ ] **Step 4: Wire `DecimalDefaultsEditor` into study settings sidebar**

In `index.tsx`, add the "Decimal Defaults" sidebar tab and render `<DecimalDefaultsEditor />` when selected.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/tfl-designer/components/study/DecimalDefaultsEditor.tsx frontend/src/features/tfl-designer/components/table/DecimalSettingsTab.tsx
git commit -m "feat(tfl): add decimal settings UI for study-wide and per-shell config"
```

---

## Task 8: Frontend — Statistics Set Dropdown in Metadata Tab

**Files:**
- Modify: `frontend/src/pages/(base)/mdr/tfl-designer/index.tsx`

- [ ] **Step 1: Add Statistics Set selector to table metadata tab**

In the `renderTableEditor()` function, inside the metadata tab's grid, add a new `<Select>` field:
```tsx
<div>
  <Text type="secondary" className="text-11px">Statistics Set</Text>
  <Select
    className="mt-4px w-full"
    size="small"
    value={table.statisticsSetId}
    onChange={(v) => tableStore.updateMetadata({ statisticsSetId: v })}
    options={statisticsSetOptions}
  />
</div>
```

Where `statisticsSetOptions` is derived from `studyStore.statisticsSets`.

- [ ] **Step 2: Pass decimal config to InteractiveOutputEditor**

When rendering the `InteractiveOutputEditor` for table preview, pass the `decimalConfig` prop with resolved study/shell defaults.

- [ ] **Step 3: Verify in browser**

Open TFL Designer → select table → change statistics set → verify placeholders update.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/\(base\)/mdr/tfl-designer/index.tsx
git commit -m "feat(tfl): add statistics set dropdown and wire decimal config to preview"
```

---

## Task 9: Frontend — Study Template Library UI

**Files:**
- Create: `frontend/src/features/tfl-designer/components/study/StudyTemplateLibrary.tsx`

- [ ] **Step 1: Create `StudyTemplateLibrary.tsx`**

Template library manager component:
- Ant Design `Table` listing templates by category, name, type, stat set, version
- Add/Edit via modal form with JSON preview of shell schema
- Delete with soft-delete confirmation
- Uses `studyStore` for state

- [ ] **Step 2: Export from component index files**

Add exports to `study/index.ts`, `components/index.ts`, and `features/tfl-designer/index.ts`.

- [ ] **Step 3: Wire into study settings sidebar**

In `index.tsx`, add "Shell Templates" tab to sidebar settings, render `<StudyTemplateLibrary />` when selected.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/tfl-designer/components/study/StudyTemplateLibrary.tsx frontend/src/features/tfl-designer/components/study/index.ts frontend/src/features/tfl-designer/components/index.ts frontend/src/features/tfl-designer/index.ts frontend/src/pages/\(base\)/mdr/tfl-designer/index.tsx
git commit -m "feat(tfl): add study template library UI component"
```

---

## Task 10: Frontend — Template Picker Modal + "Push to Study" Flow

**Files:**
- Create: `frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx`
- Create: `frontend/src/features/tfl-designer/components/shared/PushToStudyModal.tsx`

- [ ] **Step 1: Create `TemplatePickerModal.tsx`**

Modal shown when clicking "New Shell" at analysis level:
- Filter tabs: Table / Figure / Listing
- List of study templates (from `studyStore.studyTemplates`) filtered by type
- "Start Blank" option
- On select → call backend `POST /from-template` API → add to tableStore

- [ ] **Step 2: Create `PushToStudyModal.tsx`**

Modal for proposing analysis shell changes back to study:
- Diff preview (text-based for v1): shows row-level changes, stat set changes, decimal changes
- Title/description input
- Reviewer select
- Submit → call `POST /propose-to-study` API

- [ ] **Step 3: Wire into `index.tsx`**

Replace the "New Shell" dropdown handlers to open `TemplatePickerModal`.
Add "Push to Study Template" button to the table editor toolbar.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 5: End-to-end verification**

1. Open TFL Designer with a study/analysis context
2. Go to Study Settings → Shell Templates → create a template
3. Click "New Shell" → template picker appears → select template → shell is created
4. Edit the shell → verify placeholders render
5. Change statistics set → verify placeholders update
6. Click "Push to Study Template" → modal opens → submit PR

- [ ] **Step 6: Final commit**

```bash
git add frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx frontend/src/features/tfl-designer/components/shared/PushToStudyModal.tsx frontend/src/pages/\(base\)/mdr/tfl-designer/index.tsx
git commit -m "feat(tfl): add template picker modal and push-to-study PR flow"
```
