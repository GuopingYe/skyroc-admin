# Pipeline ↔ Study Spec Integration Design

**Date:** 2026-04-04  
**Status:** Approved  
**Author:** GuopingYe

---

## 1. Overview

This document describes the integration between the Pipeline Management page and the Study Spec page. It covers:

- Study creation modal enhancements (spec initialization prompt)
- Analysis creation modal enhancements (spec inheritance flow)
- Study Spec page UI updates (study-level vs analysis-level view, variable columns, push-upstream PR)
- Full spec inheritance chain from CDISC Library down to Analysis

---

## 2. Spec Inheritance Chain

The specification hierarchy follows the ScopeNode tree:

```
CDISC Library (read-only, source of truth)
    ↓ inherits into
TA Spec  (managed by TA Lead)
    ↓ inherits into
Product/Compound Spec  (managed by Product Lead)
    ↓ inherits into
Study Spec  (managed by Study Lead)
    ↓ inherits into
Analysis Spec  (managed by Study Lead, per-analysis overrides)
```

**Rules:**
- Each level inherits all datasets and variables from the level above via `base_specification_id` (Specification) and `base_id` (TargetDataset / TargetVariable).
- Each level can add new domains, modify existing variables, or exclude domains — tracked via `override_type` (NONE / MODIFIED / ADDED / DELETED).
- CDISC Library is the industry standard baseline; it may not contain all columns. Levels above it can add sponsor-standard, TA-standard, or study-custom variables.
- A Study has both an SDTM spec and an ADaM spec. Both are inherited by the Analysis.
- All spec snapshots at every level are archived for result reproducibility (21 CFR Part 11).

---

## 3. Study Creation Flow (Pipeline Modal)

### 3.1 Modal Steps

**Step 1 — Basic Study Info**  
Name, code, TA, compound, lifecycle status. No change from current implementation.

**Step 2 — CDISC Version Check**  
Auto-reads CDISC standard versions from the Study Configuration tab.

- If already configured: show read-only summary (SDTM-IG version, ADaM-IG version, MedDRA, WHODrug). User confirms or navigates back to edit.
- If not set: show inline version selector fields (SDTM-IG, ADaM-IG, MedDRA, WHODrug). Saved to Study Config on modal submit.

**Step 3 — Spec Decision**  
Toggle: `Yes / No / Later`

- `No` or `Later`: study is created without a spec. Study node in pipeline shows badge `Spec: Not Created` or `Spec: Pending`.
- `Yes`: proceed to Step 4.

**Step 4 — Spec Initialization Method**  
Three options (radio or tab):

| Option | Label | Behaviour |
|--------|-------|-----------|
| A | Copy from Existing Study | Dropdown: pick any study. Its spec is cloned immediately (all datasets + variables). Spec badge shows `Spec Ready` after creation. |
| B | Copy from Existing Analysis | Dropdown: pick a study → then an analysis. That analysis spec snapshot is cloned. Good for reproducibility. Spec badge shows `Spec Ready`. |
| C | Build from Sources | No further input in modal. Spec stub is created; badge shows `Spec: Pending Setup`. User clicks badge (or navigates to Study Spec page) to open the multi-source domain picker wizard. |

### 3.2 Pipeline Node Badge States

| State | Badge Label | Color |
|-------|-------------|-------|
| Spec not created | `No Spec` | Grey |
| Spec pending setup | `Spec: Pending Setup` | Blue |
| Spec ready | `Spec Ready` | Green |
| Spec has pending PR | `Spec: PR Open` | Purple |

---

## 4. Multi-Source Domain Picker Wizard (Study Spec Page)

Triggered when a study node has `Spec: Pending Setup` badge. Opens as a full-page wizard on the Study Spec page.

### 4.1 Sources Available

Users can select individual domains from any combination of:

1. **CDISC Library** — domains filtered by the study's selected CDISC version (e.g., SDTM-IG 3.4). Shows standard domain list with standard variables pre-populated. Always available.
2. **TA Spec** — domains defined at the parent TA level. Only shown if a TA Spec exists for this study's therapeutic area.
3. **Product Spec** — domains defined at the parent Compound/Product level. Only shown if a Product Spec exists for this compound.

### 4.2 Wizard Steps

1. **Select Spec Type**: SDTM, ADaM, or both. Repeat wizard per spec type.
2. **Browse & Select Domains**: Three-pane view — Source selector (left), Domain list by source (middle), Selected domains summary (right). Users can multi-select domains from any source in one pass.
3. **Review**: Final summary of selected domains and their origin. Confirm to create.

### 4.3 Outcome

- One `Specification` record per spec type (SDTM/ADaM), linked to the study's `ScopeNode`.
- Each selected domain becomes a `TargetDataset` with `override_type = NONE` (for inherited) or `ADDED` (for sponsor-custom).
- Variables are pre-populated from the source (CDISC Library data or parent spec). `origin_type` is set accordingly: `CDISC`, `TA_STANDARD`, `SPONSOR_STANDARD`, or `STUDY_CUSTOM`.

---

## 5. Analysis Creation Flow (Pipeline Modal)

### 5.1 Modal Steps

**Step 1 — Basic Analysis Info**  
Name, code, type (Primary / Sensitivity / Exploratory), description.

**Step 2 — Spec Inheritance Summary**  
Read-only. All parent study specs (SDTM + ADaM) are listed and auto-inherited.

- If parent study has no spec yet: warning shown. Analysis will inherit when study spec is initialized.
- User just confirms; no selection needed.

**Step 3 — Domain Customization (Optional)**  
Study Lead can exclude domains not relevant to this analysis directly in the modal. Excluded domains are marked `override_type = DELETED` — they remain in the chain for audit but are excluded from this analysis. Can also be done post-creation on the Study Spec page.

### 5.2 Analysis Node Badge States

| State | Badge |
|-------|-------|
| Spec auto-inherited, no customization | `Spec Inherited` (Green) |
| Domains excluded or variables modified | `Spec Customized` (Amber) |
| Parent study spec not yet set up | `Spec Pending` (Blue) |

---

## 6. Study Spec Page — UI Design

### 6.1 Scope Switcher

A dropdown in the page header allows switching the view between:

- **Study Level** — shows the study spec with full edit rights (for Study Lead and above).
- **Analysis: [name]** — shows the analysis-level override view for a specific analysis.

### 6.2 Domain Sidebar

Left sidebar lists all domains grouped by spec type (SDTM / ADaM). Each domain shows a badge:

| Badge | Meaning |
|-------|---------|
| `inherited` (grey) | Inherited from parent spec, no local changes |
| `modified` (amber) | One or more variables modified at this level |
| `+added` (green) | Entire domain added at this level |
| `excluded` (red, struck-through) | Domain excluded at this level |

### 6.3 Variable Table Columns (Extended)

The following columns are shown in the variable table:

| Column | Source Field | Notes |
|--------|-------------|-------|
| Variable Name | `variable_name` | Sortable |
| Label | `variable_label` | Editable |
| Data Type | `data_type` | CHAR / NUM / DATE / DATETIME / TIME |
| Length | `length` | Numeric |
| Core | `core` | REQ / EXP / PERM |
| Role | `standard_metadata.role` | e.g., Identifier, Topic |
| Origin | `origin_type` | CDISC / Sponsor Standard / TA Standard / Study Custom |
| Codelist | `standard_metadata.codelist` | Code list reference |
| Source / Derivation | `standard_metadata.source_derivation` | Where the value comes from |
| Implementation Notes | `standard_metadata.implementation_notes` | Sponsor-specific guidance |
| Comment | `standard_metadata.comment` | Free text |
| Global Library Ref | `standard_metadata.global_library_ref` | Link to CDISC Library entry |
| Override | `override_type` | NONE / MODIFIED / ADDED / DELETED — shown as tag |

**Inherited variable link:** Variables inherited from an upper level show a link icon next to the Origin badge. Clicking it navigates to the source:
- `CDISC` → CDISC Library viewer page (filtered to that domain/variable)
- `TA_STANDARD` → TA Spec page for this TA, scrolled to that domain
- `SPONSOR_STANDARD` → Product Spec page, scrolled to that domain

### 6.4 Study-Level Actions (Study Lead and above)

- `+ Add Domain` — opens domain picker (browse CDISC Library, TA Spec, or Product Spec)
- `+ Add Variable` — opens variable form drawer within current domain
- Edit any variable inline or via drawer
- Delete / exclude domain (sets `override_type = DELETED`)
- `↑ Push to [Parent Level] Spec` — creates a PR proposing study-level changes to the parent (Product or TA Spec)

### 6.5 Analysis-Level View

When "Viewing as: Analysis X" is selected:

- Blue info bar shows: "Viewing [Analysis Name] — inherited from Study Spec — N domains excluded, M variables modified"
- Sidebar shows domains with exclusions struck-through
- Variable table is read-only by default; click pencil icon on any row to add an analysis-level override for that variable
- `Exclude Domain` button on toolbar to mark current domain as excluded for this analysis
- `↑ Push to Study Spec` — creates a PR proposing analysis-level changes to promote to the study spec

---

## 7. Push to Upper Level (PR Workflow)

Study Lead (or above) can propose changes at any level upward via a PR:

- **Trigger**: `↑ Push to [Parent] Spec` button on the Study Spec page.
- **Payload**: Diff of `TargetDataset` and `TargetVariable` records with `override_type != NONE` at this level that do not yet exist at the parent level.
- **Flow**: Creates a PR via the existing PR approval workflow. The parent level owner reviews, approves or rejects. On approval, changes are merged into the parent spec.
- **Badge**: Study node shows `Spec: PR Open` while a push PR is pending.
- **Scope**: A study can push up to Product Spec; an analysis can push up to Study Spec. No skipping levels.

---

## 8. New Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /pipeline/nodes` | extend | Accept `create_spec`, `spec_init_method` (`copy_study` / `copy_analysis` / `build`), `copy_from_spec_id` in study/analysis creation payload |
| `GET /study-specs/sources` | GET | Return available source domains for domain picker: CDISC domains by version, TA Spec domains, Product Spec domains for a given scope_node_id |
| `POST /study-specs/initialize` | POST | Initialize spec from multi-source domain selection (list of domain ids + their source spec ids) |
| `POST /study-specs/{id}/copy` | POST | Clone spec from an existing Specification record (study or analysis) |
| `PUT /study-specs/{id}/datasets/{dataset_id}/toggle` | PUT | Set `override_type = DELETED` or `NONE` on a dataset (include/exclude domain) |
| `POST /study-specs/{id}/push-upstream` | POST | Create a PR proposing changes from this spec to its parent spec |

---

## 9. Frontend File Changes

### New files

| File | Purpose |
|------|---------|
| `pages/(base)/mdr/pipeline-management/components/StudySpecStepModal.tsx` | Steps 3–4 of the study creation modal (spec decision + init method) |
| `pages/(base)/mdr/pipeline-management/components/AnalysisSpecStepModal.tsx` | Steps 2–3 of the analysis creation modal (inheritance summary + domain exclusion) |
| `pages/(base)/mdr/study-spec/components/DomainPickerWizard.tsx` | Multi-source domain picker wizard for "build from sources" path |
| `pages/(base)/mdr/study-spec/components/ScopeSwitcher.tsx` | Dropdown to switch between study-level and analysis-level view |
| `pages/(base)/mdr/study-spec/components/VariableTable.tsx` | Extended variable table with all columns and source link |
| `pages/(base)/mdr/study-spec/components/PushUpstreamModal.tsx` | Confirm + diff preview for push-upstream PR creation |
| `service/api/studySpec.ts` | API calls for the new endpoints |
| `service/hooks/useStudySpec.ts` | React Query hooks for study spec data |

### Modified files

| File | Change |
|------|--------|
| `pages/(base)/mdr/pipeline-management/index.tsx` | Add spec badge to study/analysis nodes; wire spec step into create modal |
| `pages/(base)/mdr/study-spec/index.tsx` | Add scope switcher; wire new variable table; add push-upstream button |
| `backend/app/api/routers/pipeline.py` | Accept spec init fields in node creation payload |
| `backend/app/api/routers/study_spec.py` | Add new endpoints |

---

## 10. Permissions

| Action | Minimum Role |
|--------|-------------|
| View study spec | Any authenticated user with study scope access |
| Edit study spec (add/modify/delete domain or variable) | Study Lead |
| Exclude domain at analysis level | Study Lead |
| Push to upper level (create PR) | Study Lead |
| Approve push PR | Parent level owner (Product Lead / TA Lead) |
| Initialize spec from CDISC / copy | Study Lead |

---

## 11. Out of Scope

- Designing the TA Spec or Product Spec management pages (they follow the same pattern but are separate features)
- CDISC Library variable detail page (exists, just needs deep-link support)
- Spec versioning / locking workflow (handled by existing lifecycle status)
- TFL designer integration with spec (separate feature)
