# TFL Designer Enhancement — Design Spec

**Date:** 2026-03-29
**Status:** Draft
**Scope:** Statistics integration, study-level templates with inheritance, PR-based propagation

## Overview

Enhance the TFL Designer to connect Statistics Sets to shell content rendering, support study-level shell templates with per-category libraries, and enable PR-based propagation from analysis shells back to study templates.

## 1. Data Model

### 1.1 Scope Node Hierarchy

```
CDISC → Global → TA → Compound → Indication → Study → Analysis
```

- **Study level** stores global defaults + per-category shell templates
- **Analysis level** stores cloned shells (`ARSDisplay`) with free editing

### 1.2 New Table: `ars_study_defaults`

Stores study-wide global configuration. One row per study scope node.

| Column | Type | Description |
|--------|------|-------------|
| `id` | int PK | Primary key |
| `scope_node_id` | int FK → scope_nodes (unique) | Study-level scope node |
| `default_statistics_set_id` | int FK nullable | Default stat set for new shells |
| `decimal_rules` | JSONB | `{"n":0, "mean":2, "sd":3, "percent":2, "median":1, "min":1, "max":1}` |
| `header_style` | JSONB nullable | Default header font/style config |
| `created_by` / `updated_by` / timestamps / soft_delete | — | Standard audit fields |

### 1.3 New Table: `ars_study_templates`

Per-category shell templates at study level. The library that analysis shells clone from.

| Column | Type | Description |
|--------|------|-------------|
| `id` | int PK | Primary key |
| `scope_node_id` | int FK → scope_nodes | Study-level scope node |
| `category` | varchar(50) | e.g. `"Demographics"`, `"Adverse_Events"` |
| `template_name` | varchar(200) | e.g. `"Standard Demographics Table"` |
| `display_type` | varchar(20) | `"Table"` / `"Figure"` / `"Listing"` |
| `shell_schema` | JSONB | Full shell definition (rows, headers, footer, etc.) |
| `statistics_set_id` | int FK nullable | Associated statistics set |
| `decimal_override` | JSONB nullable | Per-template decimal overrides (merges with study defaults) |
| `version` | int | Template version for tracking clones and diffs |
| `created_by` / `updated_by` / timestamps / soft_delete | — | Standard audit fields |

Constraints:
- `uix_ars_study_templates_scope_cat_name` unique on `(scope_node_id, category, template_name)`

### 1.4 Changes to `ARSDisplay` (existing)

Add columns to track the inheritance chain:

| New Column | Type | Description |
|------------|------|-------------|
| `source_template_id` | int FK → ars_study_templates nullable | Which study template this was cloned from |
| `source_template_version` | int | Version of template at clone time |
| `decimal_override` | JSONB nullable | Shell-level decimal overrides |
| `statistics_set_id` | int FK nullable | Statistics set used by this shell |

### 1.5 Entity Relationships

```
scope_node (Study)
├── ars_study_defaults (1:1)
├── ars_study_templates (1:N, per category)
│   └── category: Demographics, AE, Lab, VS, ...
└── treatment_arm_sets, population_sets, statistics_sets (existing)

scope_node (Analysis)
└── ars_displays (1:N)
    ├── source_template_id → ars_study_templates
    ├── statistics_set_id → statistics_sets
    ├── sections → blocks → data_bindings
    └── display_config (JSONB: decimal_override, etc.)
```

## 2. Statistics Integration & Placeholder Formatting

### 2.1 Placeholder Format Rules

| Stat Type | Label | Placeholder Format |
|-----------|-------|--------------------|
| `n` | n | `XX` (integer, no decimals) |
| `n_percent` | n (%) | `XX (XX.XX)` |
| `mean` | Mean | `XX.XX` |
| `mean` + `sd` | Mean (SD) | `XX.XX (XX.XXX)` |
| `median` | Median | `XX.XX` |
| `min` + `max` | Min, Max | `XX.XX, XX.XX` |
| `header` | (row label only) | — no data cells |

### 2.2 Decimal Resolution Chain (3 levels)

1. **Row-level override** (highest priority): `TableRow.stats[i].decimals`
2. **Shell-level defaults**: `decimal_override` JSONB on template/display
3. **Study-level defaults** (fallback): `ars_study_defaults.decimal_rules`

Resolution algorithm:
```
function resolveDecimals(statType, row, shell, studyDefaults):
  if row.stats[i].decimals is defined:
    return row.stats[i].decimals
  if shell.decimal_override[statType] is defined:
    return shell.decimal_override[statType]
  return studyDefaults.decimal_rules[statType] ?? DEFAULT_DECIMALS[statType]
```

### 2.3 Preview Rendering Flow

1. Shell has `statistics_set_id` → load `StatisticsSet.stats[]`
2. For each `TableRow` in shell:
   a. Read `row.stats[]` — defines which stat types apply
   b. Resolve decimals per stat: row override → shell default → study default
   c. Generate placeholder string via `formatPlaceholder(statTypes, decimals)`
   d. Fill placeholder across all treatment arm columns
3. Render in `InteractiveOutputEditor` (existing preview component)

### 2.4 `formatPlaceholder` Algorithm

```typescript
function formatPlaceholder(statTypes: string[], decimalsMap: Record<string, number>): string {
  // n → "XX"
  if (statTypes.length === 1 && statTypes[0] === 'n') return 'XX';

  // n_percent → "XX (XX.XX)" where percent decimals apply
  if (statTypes.length === 1 && statTypes[0] === 'n_percent') {
    const pct = decimalsMap.percent ?? 2;
    return `XX (${'XX.' + 'X'.repeat(pct)})`;
  }

  // mean + sd → "XX.XX (XX.XXX)"
  if (statTypes.includes('mean') && statTypes.includes('sd')) {
    const meanD = decimalsMap.mean ?? 2;
    const sdD = decimalsMap.sd ?? 3;
    return `${'XX.' + 'X'.repeat(meanD)} (${'XX.' + 'X'.repeat(sdD)})`;
  }

  // mean alone → "XX.XX"
  if (statTypes.includes('mean')) {
    const d = decimalsMap.mean ?? 2;
    return `${'XX.' + 'X'.repeat(d)}`;
  }

  // median → "XX.XX"
  if (statTypes.includes('median')) {
    const d = decimalsMap.median ?? 2;
    return `${'XX.' + 'X'.repeat(d)}`;
  }

  // min + max → "XX.XX, XX.XX"
  if (statTypes.includes('min') && statTypes.includes('max')) {
    const d = decimalsMap.min ?? 1;
    return `${'XX.' + 'X'.repeat(d)}, ${'XX.' + 'X'.repeat(d)}`;
  }

  // fallback
  return 'XX.XX';
}
```

## 3. Frontend UI Design

### 3.1 Study Settings — New Tabs

Two new sidebar tabs added to study settings:

1. **Shell Templates** (`📄` icon) — per-category template library
   - Table listing: category, name, type, associated stat set, version
   - CRUD: add template (from scratch or from existing analysis shell), edit, delete, preview
   - Each template stores: rows, header layout, footer, statistics set, decimal rules, version

2. **Decimal Defaults** (`🔢` icon) — study-wide default decimal config
   - Simple form: stat type → default decimal places
   - Applies as fallback for all shells in the study

### 3.2 Analysis Shell Creation — Template Picker Modal

When user clicks "New Shell" at analysis level:
1. Modal shows a list of study templates filtered by type (Table/Figure/Listing)
2. User selects a template OR chooses "Start Blank"
3. Backend deep-clones the selected template into a new `ARSDisplay` at the analysis scope
4. Records `source_template_id` and `source_template_version` on the new display
5. User can edit freely without affecting the study template

### 3.3 Decimal Settings — Shell Editor Tab

New "Decimals" tab in the table/figure editor:
- Table showing all statistic types with two columns:
  - **Study Default** (read-only, from `ars_study_defaults.decimal_rules`)
  - **Shell Override** (editable InputNumber, stored in `display.decimal_override`)
- Info banner: "Defaults from study-level config. Override here for this specific shell."
- Per-row override: clicking a row in preview shows a popover with custom decimal settings for that row

### 3.4 PR Propagation — "Push to Study Template" Flow

New toolbar button: "Push to Study Template" (purple, with ⬆ icon)

Flow:
1. Click button → opens PR creation modal
2. Modal shows **diff preview**: current analysis shell vs. original study template (version at clone time)
3. Diff highlights: added/removed/modified rows, changed statistics, decimal changes
4. User adds title, description, selects reviewers
5. Creates a PR record via existing `pull_request` model with shell diff as payload
6. Reviewers approve → backend merges changes into study template (increments version)
7. Analysis shell's `source_template_version` updates to new version

### 3.5 Statistics Set Integration in Metadata Tab

The existing "Metadata" tab in the table editor gains a **Statistics Set** dropdown:
- Options come from the study-level statistics sets
- Changing the statistics set triggers re-rendering of placeholders in the preview
- The selected stat set is stored in `display.statistics_set_id`

## 4. API Design

### 4.1 Study Defaults

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/ars/study-defaults/{scope_node_id}` | Get study defaults |
| `PUT` | `/api/v1/ars/study-defaults/{scope_node_id}` | Upsert study defaults |

### 4.2 Study Templates

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/ars/study-templates/{scope_node_id}` | List templates for study |
| `GET` | `/api/v1/ars/study-templates/{scope_node_id}/{template_id}` | Get template detail |
| `POST` | `/api/v1/ars/study-templates/{scope_node_id}` | Create template |
| `PUT` | `/api/v1/ars/study-templates/{scope_node_id}/{template_id}` | Update template |
| `DELETE` | `/api/v1/ars/study-templates/{scope_node_id}/{template_id}` | Soft-delete template |

### 4.3 Analysis Shell Creation with Template Cloning

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/ars/displays/{scope_node_id}/from-template` | Clone template → new display |
| Body: | `{ "template_id": int, "display_id": "Table 14.2.1", "title": "..." }` | |

### 4.4 PR Propagation

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/ars/displays/{display_id}/propose-to-study` | Create PR to push changes back |
| Body: | `{ "title": "...", "description": "...", "reviewers": [...] }` | |
| `GET` | `/api/v1/ars/displays/{display_id}/diff-template` | Get diff between display and source template |

## 5. Open Questions / Clarifications

### 5.1 `statistics_sets` Backend Table

Currently `StatisticsSet` exists only as a frontend TypeScript type with mock data in `studyStore.ts`. The backend has no `statistics_sets` table. This feature **must** create a backend `statistics_sets` table as a prerequisite. The migration plan below includes this.

### 5.2 `statistics_set_id` vs `statistics_config` Relationship

The existing `ARSDataBinding.statistics_config` JSONB field stores per-binding stat flags (e.g., `{'n': true, 'mean': true}`). The new `statistics_set_id` on `ARSDisplay` serves a different purpose:

- **`statistics_set_id` (display-level):** Defines which statistic *items* (labels, types, format templates) apply to this shell. Used for rendering row labels and placeholder formatting.
- **`statistics_config` (binding-level):** Defines which stats are computed for a specific data binding. Used at programming/execution time.

They are complementary. The display-level set drives the shell UI; the binding-level config drives actual computation. No data migration needed.

### 5.3 PR Propagation Direction

The existing `MetadataPullRequest` model uses `source_scope_id` (lower scope) → `target_scope_id` (higher scope) for Study→Global propagation. Analysis→Study propagation goes in the same direction (child→parent), so the same model applies:

- `source_scope_id` = the Analysis scope node
- `target_scope_id` = the parent Study scope node
- `change_type` = `"shell_template_update"` (new enum value)
- `change_payload` = JSONB diff between analysis display and source template

No new PR model needed — extend the existing one with a new `change_type`.

### 5.4 `shell_schema` Structure

`ars_study_templates.shell_schema` follows the **frontend `TableShell`/`FigureShell`/`ListingShell`** structure (not the backend section/block model). When cloning to an `ARSDisplay`, the backend converts `shell_schema` into the section/block structure. This keeps templates human-readable and aligned with the frontend model.

## 6. Migration Plan

### Migration: `tfl_study_templates_001`

1. Create `statistics_sets` table + `statistics_items` table (backend counterpart to frontend types)
2. Create `ars_study_defaults` table
3. Create `ars_study_templates` table
4. Add columns to `ars_displays`: `source_template_id`, `source_template_version`, `decimal_override`, `statistics_set_id`
5. Seed initial data: for each existing study scope node, create a default `ars_study_defaults` row with sensible decimal rules. Seed default statistics sets from current frontend mock data.

### Migration: `tfl_study_templates_002`

1. Add FK constraints: `ars_displays.source_template_id → ars_study_templates.id`
2. Add FK constraint: `ars_displays.statistics_set_id → statistics_sets.id`
3. Add index on `ars_displays.statistics_set_id`

## 6. Frontend File Changes

### New Files
- `frontend/src/features/tfl-designer/components/study/StudyTemplateLibrary.tsx` — template library manager
- `frontend/src/features/tfl-designer/components/study/DecimalDefaultsEditor.tsx` — study-wide decimal config
- `frontend/src/features/tfl-designer/components/table/DecimalSettingsTab.tsx` — per-shell decimal editor
- `frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx` — template selection on shell creation
- `frontend/src/features/tfl-designer/components/shared/PushToStudyModal.tsx` — PR creation with diff preview
- `frontend/src/features/tfl-designer/utils/placeholderFormatter.ts` — `formatPlaceholder` algorithm
- `backend/app/models/ars_study.py` — new model file for `StudyDefaults`, `StudyTemplate`
- `backend/app/api/routers/ars_study.py` — new router for study templates/defaults

### Modified Files
- `frontend/src/features/tfl-designer/types.ts` — add decimal config types
- `frontend/src/features/tfl-designer/stores/studyStore.ts` — add template library state
- `frontend/src/features/tfl-designer/stores/tableStore.ts` — add decimal override state
- `frontend/src/features/tfl-designer/components/shared/InteractiveOutputEditor.tsx` — render placeholders
- `frontend/src/pages/(base)/mdr/tfl-designer/index.tsx` — new tabs, template picker, push button
- `backend/app/models/ars.py` — add new columns to ARSDisplay
- `backend/app/models/__init__.py` — register new models
