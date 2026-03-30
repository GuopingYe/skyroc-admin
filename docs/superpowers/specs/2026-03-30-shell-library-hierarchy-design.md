# Shell Library Hierarchy System Design

**Date:** 2026-03-30
**Status:** Draft
**Author:** Claude

## Overview

A hierarchical shell template management system supporting four levels: Global, TA (Therapeutic Area), Study, and Analysis. Each level can create shells from scratch, clone from upper-level templates, or import from JSON files. Push mechanisms allow lower levels to propagate shells to any upper level through PR-based approval workflows.

## Problem Statement

Current system has limited template hierarchy:
- Global Template Library exists but is isolated
- Study Shell Templates exist but cannot trace source or push upward
- Analysis Shells can only push to Study level (adjacent)
- No TA/Product level support
- No JSON import capability across all levels

## Goals

1. Establish 4-level hierarchy: Global → TA → Study → Analysis
2. Enable downward cloning (lower levels use upper-level templates)
3. Enable upward push with PR workflow (any level to any upper level)
4. Support JSON import at all levels (Clymb Clinical ARS format)
5. Reserve extensibility for Product level
6. Track source origin and version history

---

## Section 1: Data Model Design

### 1.1 ShellLibraryTemplate (Global + TA Level)

```typescript
interface ShellLibraryTemplate {
  id: string;
  scopeLevel: 'global' | 'ta' | 'product';  // 'product' reserved for future
  scopeNodeId: string;                       // 'GLOBAL' | 'TA_ONCOLOGY' | 'TA_CARDIO'
  category: AnalysisCategory;
  templateName: string;
  displayType: 'Table' | 'Figure' | 'Listing';
  shellSchema: TableShell | FigureShell | ListingShell;
  statisticsSetId?: string;
  version: number;
  versionHistory?: VersionHistoryEntry[];
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  isArchived: boolean;
}

interface VersionHistoryEntry {
  version: number;
  changedAt: string;
  changedBy: string;
  changeDescription?: string;
  snapshot?: ShellSchema;
}
```

### 1.2 StudyTemplate (Extended)

```typescript
interface StudyTemplate {
  id: string;
  scopeNodeId: string;                       // Study_XXX
  category: AnalysisCategory;
  templateName: string;
  displayType: 'Table' | 'Figure' | 'Listing';
  shellSchema: ShellSchema;
  statisticsSetId?: string;
  version: number;

  // New: Source tracking
  sourceLibraryId?: string;                  // From Global/TA Library
  sourceLevel?: 'global' | 'ta' | 'product';
  sourceTemplateName?: string;

  // New: Version and audit
  versionHistory?: VersionHistoryEntry[];
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  isArchived: boolean;
}
```

### 1.3 Analysis Shell (Extended)

```typescript
interface ShellBase {
  id: string;
  shellNumber: string;
  title: string;
  // ... existing fields

  // New: Source tracking
  sourceTemplateId?: string;                 // From Study Template
  sourceLibraryId?: string;                  // From Global/TA Library (skip-level)
  sourceLevel?: 'global' | 'ta' | 'product' | 'study';
  sourceTemplateName?: string;

  // New: Version
  version: number;
  versionHistory?: VersionHistoryEntry[];
}
```

---

## Section 2: Store & State Management

### 2.1 shellLibraryStore (New)

```typescript
interface ShellLibraryState {
  templates: ShellLibraryTemplate[];
  selectedTemplate: ShellLibraryTemplate | null;

  // Filters
  scopeLevelFilter: 'all' | 'global' | 'ta' | 'product';
  searchQuery: string;

  // CRUD
  addTemplate: (t) => void;
  updateTemplate: (id, updates) => void;
  archiveTemplate: (id) => void;
  duplicateTemplate: (id) => void;

  // Import
  importFromJSON: (json, scopeLevel, scopeNodeId) => ShellLibraryTemplate[];

  // Selection
  selectTemplate: (t) => void;

  // Filters
  setScopeLevelFilter: (filter) => void;
  setSearchQuery: (query) => void;

  // Init
  initTemplates: () => void;
}
```

### 2.2 studyStore (Extended)

```typescript
interface StudyState {
  studyTemplates: StudyTemplate[];

  // New: Clone from Library
  cloneFromLibrary: (libraryTemplate) => StudyTemplate;

  // New: Push to Library
  pushToLibrary: (templateId, targetLevel, targetScopeNodeId) => Promise<void>;

  // New: Import
  importFromJSON: (json) => StudyTemplate[];

  // Existing methods preserved
}
```

### 2.3 Shell Stores (Extended)

```typescript
interface TableState {
  // New: Create from any level
  createFromLibrary: (libraryTemplate) => TableShell;
  createFromStudyTemplate: (studyTemplate) => TableShell;
  createFromJSON: (json) => TableShell;

  // New: Push to any upper level
  pushToStudy: (shellId) => Promise<void>;
  pushToLibrary: (shellId, targetLevel, targetScopeNodeId) => Promise<void>;
}
```

### 2.4 Store Relationship Diagram

```
shellLibraryStore (Global + TA)
    │
    ├── cloneFromLibrary() → studyStore.studyTemplates
    │                              │
    │                              ├── cloneFromLibrary() → tableStore/figureStore
    │                              │
    │                              └── pushToLibrary() → shellLibraryStore
    │
    └── importFromJSON() → shellLibraryStore.templates

tableStore/figureStore/listingStore (Analysis)
    │
    ├── createFromLibrary() → shellLibraryStore (skip-level)
    │
    ├── createFromStudyTemplate() → studyStore
    │
    ├── pushToStudy() → studyStore
    │
    └── pushToLibrary() → shellLibraryStore (skip-level)
```

---

## Section 3: UI Components & Pages

### 3.1 Page Hierarchy

| Level | Entry Page | Component | Function |
|-------|------------|-----------|----------|
| Global Shell Library | `/mdr/tfl-template-library` | `GlobalShellLibraryPage` | Manage Global templates |
| TA Shell Library | `/mdr/tfl-template-library` (filter TA) | Same, filter `scopeLevel='ta'` | Manage TA templates |
| Study Shell Library | Study Settings > Shell Templates | `StudyShellLibrary` | Manage study templates |
| Analysis Shells | TFL Designer analysis page | `ShellEditor` | Edit analysis shells |

### 3.2 Global/TA Shell Library Page Changes

**Existing:** `/mdr/tfl-template-library/index.tsx`

**New UI Elements:**

```
+------------------------------------------------------------------+
| Global Shell Library                         [Import JSON] [+Add] |
+------------------------------------------------------------------+
| Scope Level: [All ▼] [Global] [TA] [Product(disabled)]          |
| TA Filter:   [All TA ▼] [Onco] [Cardio] [CNS] ...               |
| Search: [___________________🔍]                                  |
+------------------------------------------------------------------+
| Template Cards Grid                                              |
| +---------------+ +---------------+ +---------------+             |
| | [Global]      | | [TA: Onco]    | | [Global]      |             |
| | Demographics  | | AE Summary    | | KM Curve      |             |
| | Table v2      | | Table v1      | | Figure v1     |             |
| +---------------+ +---------------+ +---------------+             |
+------------------------------------------------------------------+
| Footer: 45 templates (30 Global, 15 TA)                          |
+------------------------------------------------------------------+
```

**New Filter Components:**
```tsx
<Segmented options={[
  { label: 'All', value: 'all' },
  { label: 'Global', value: 'global' },
  { label: 'TA', value: 'ta' },
  { label: 'Product', value: 'product', disabled: true },
]} />

<Select placeholder="Filter by TA" options={taOptions} allowClear />
```

**Source Tag:**
```tsx
<Tag color={template.scopeLevel === 'global' ? 'geekblue' : 'purple'}>
  {template.scopeLevel === 'global' ? 'Global' : `TA: ${template.scopeNodeId}`}
</Tag>
```

### 3.3 Study Shell Library Page Changes

**Rename:** `StudyTemplateLibrary.tsx` → `StudyShellLibrary.tsx`

**New Features:**
1. **Source Column:** Display `sourceLevel` + `sourceTemplateName`
2. **Create Menu:**
   ```
   [+ Add Shell] dropdown:
   ├─ From Scratch
   ├─ From Global Template
   ├─ From TA Template
   └─ Import from JSON
   ```
3. **Push Actions:**
   ```
   [Actions] column:
   ├─ Edit
   ├─ Push to TA Library
   ├─ Push to Global Library
   ├─ Duplicate
   └─ Archive
   ```

### 3.4 Template Picker Modal Changes

**Existing:** `TemplatePickerModal.tsx`

**New Layout:**
```
+------------------------------------------------------------------+
| Create New Shell                                           [X]    |
+------------------------------------------------------------------+
| Start Blank:  [Table] [Figure] [Listing]                         |
+------------------------------------------------------------------+
| Source Filter: [All Sources ▼]                                   |
|   ├─ All Sources                                                 |
|   ├─ Global Library                                              |
|   ├─ TA Library                                                  |
|   └─ Study Library                                               |
+------------------------------------------------------------------+
| [Search templates...🔍]                                          |
+------------------------------------------------------------------+
| Template Cards                                                   |
| +---------------+ +---------------+ +---------------+             |
| | [Global]      | | [TA: Onco]    | | [Study]       |             |
| | Demographics  | | AE Summary    | | Custom Table  |             |
| | [Use]         | | [Use]         | | [Use]         |             |
| +---------------+ +---------------+ +---------------+             |
+------------------------------------------------------------------+
| Footer: 12 templates (5 Global, 4 TA, 3 Study)   [Cancel][Create]|
+------------------------------------------------------------------+
```

**Data Merge:**
```tsx
const allTemplates = useMemo(() => {
  const globalTemplates = shellLibraryStore.templates.filter(t => t.scopeLevel === 'global');
  const taTemplates = shellLibraryStore.templates.filter(t => t.scopeLevel === 'ta');
  const studyTemplates = studyStore.studyTemplates;

  return [
    ...globalTemplates.map(t => ({ ...t, source: 'global' })),
    ...taTemplates.map(t => ({ ...t, source: 'ta' })),
    ...studyTemplates.map(t => ({ ...t, source: 'study' })),
  ];
}, [shellLibraryStore.templates, studyStore.studyTemplates]);
```

### 3.5 PushToLibraryModal (New)

```
+------------------------------------------------------------------+
| Push Shell to Library                                     [X]    |
+------------------------------------------------------------------+
| Current: [Study] Demographics Table v2                           |
+------------------------------------------------------------------+
| Target Level: [Global ▼]                                         |
|   ├─ Global Library                                              |
|   ├─ TA Library                                                  |
|   │   └─ TA: [Oncology ▼]                                        |
+------------------------------------------------------------------+
| PR Title: [Update Demographics shell template...________]        |
| Description: [________________________________________]          |
+------------------------------------------------------------------+
| Diff Preview:                                                    |
| ─────────────────────────────────────────────────────────────    |
| | Modified | Title | "Demographics" → "Demographics Summary" |  |
| | Added    | Rows  | 15 → 18                              |    |
+------------------------------------------------------------------+
|                              [Cancel] [Submit PR]                 |
+------------------------------------------------------------------+
```

---

## Section 4: Push Mechanism & Permissions

### 4.1 Push Path Matrix

| Source | Target | Operation | Data Write |
|--------|--------|-----------|------------|
| Analysis Shell | Study Library | `pushToStudy` | Create StudyTemplate |
| Analysis Shell | TA Library | `pushToTA` | Create ShellLibraryTemplate (scopeLevel='ta') |
| Analysis Shell | Global Library | `pushToGlobal` | Create ShellLibraryTemplate (scopeLevel='global') |
| Study Library | TA Library | `pushToTA` | Create ShellLibraryTemplate (scopeLevel='ta') |
| Study Library | Global Library | `pushToGlobal` | Create ShellLibraryTemplate (scopeLevel='global') |
| TA Library | Global Library | `pushToGlobal` | Create ShellLibraryTemplate (scopeLevel='global') |

### 4.2 Push Flow

```
Analysis Shell ──┬── pushToStudy() → StudyTemplate (version=1)
                 ├── pushToTA(taId) → ShellLibraryTemplate (PR → Approved → Write)
                 └── pushToGlobal() → ShellLibraryTemplate (PR → Approved → Write)

Study Template ──┬── pushToTA(taId) → ShellLibraryTemplate (PR → Approved → Write)
                 └── pushToGlobal() → ShellLibraryTemplate (PR → Approved → Write)

TA Template ─────└── pushToGlobal() → ShellLibraryTemplate (PR → Approved → Write)
```

### 4.3 PR Workflow

Push to Global/TA Library requires PR approval:

```
User clicks "Push to Library"
    ↓
PushToLibraryModal opens
    ↓
User selects target level
    ↓
System generates diff preview
    ↓
User fills PR title + description
    ↓
[Submit PR]
    ↓
Backend: Create PR (PRStatus='Pending', PRItemType='ShellTemplateUpdate')
    ↓
Reviewer notified
    ↓
Reviewer: Approve / Reject
    ↓
If Approved:
  - Write ShellLibraryTemplate
  - Set version=1 (or increment if updating existing)
  - Link PR to template
  - PRStatus='Merged'
```

**Push to Study Library (within same Study):**
- No PR required (direct write)
- Audit Trail recorded

### 4.4 Permission Matrix

| Operation | Required Permission | Validation |
|-----------|---------------------|------------|
| Create Global Template | `R_ADMIN` or `R_SUPER` | Admin only |
| Push to Global Library | `R_ADMIN` or `PR_APPROVE_GLOBAL` | PR approval required |
| Create TA Template | `R_TA_ADMIN` or `R_ADMIN` | TA Admin or Global Admin |
| Push to TA Library | `R_TA_ADMIN` or `PR_APPROVE_TA` | PR approval required |
| Create Study Template | `R_STUDY_EDITOR` | Study edit permission |
| Push to Study | `R_STUDY_EDITOR` | Same study, edit permission |
| Create Analysis Shell | `R_ANALYSIS_EDITOR` | Analysis edit permission |

### 4.5 Version Inheritance Rules

| Creation Method | Version | Source Tracking |
|-----------------|---------|-----------------|
| Scratch | v1 | `sourceLevel=null`, `sourceLibraryId=null` |
| Clone from Global/TA | v1 | `sourceLevel='global'/'ta'`, `sourceLibraryId=XXX` |
| Clone from Study | v1 | `sourceLevel='study'`, `sourceTemplateId=XXX` |
| JSON Import | v1 | `sourceLevel=null`, `importSource='json'` |
| Push (PR approved) | v1 or inherit | If updating existing template: `version+1` |

---

## Section 5: Backend API Design

### 5.1 Shell Library API (Global + TA)

```
# New router: backend/app/api/routers/shell_library.py

# CRUD
GET    /api/v1/shell-library/templates
       ?scopeLevel=global|ta|product
       ?scopeNodeId=TA_ONCOLOGY
       ?category=Demographics
       ?displayType=Table
       ?isArchived=false
       → List ShellLibraryTemplate[]

GET    /api/v1/shell-library/templates/{id}
       → ShellLibraryTemplate

POST   /api/v1/shell-library/templates
       Body: { scopeLevel, scopeNodeId, templateName, displayType, shellSchema }
       → Create ShellLibraryTemplate (version=1)
       Permission: R_ADMIN (global) / R_TA_ADMIN (ta)

PUT    /api/v1/shell-library/templates/{id}
       Body: { templateName, shellSchema, description }
       → Update (version+1)

DELETE /api/v1/shell-library/templates/{id}
       → Soft delete (isArchived=true)

POST   /api/v1/shell-library/templates/{id}/duplicate
       → Duplicate

# Import
POST   /api/v1/shell-library/import
       Body: { jsonContent, scopeLevel, scopeNodeId }
       → Import ShellLibraryTemplate[]

# Push (PR-based)
POST   /api/v1/shell-library/push-request
       Body: { sourceType, sourceId, targetLevel, targetScopeNodeId, prTitle, prDescription }
       → Create PR

GET    /api/v1/shell-library/push-request/{prId}
       → PR detail with diff

PUT    /api/v1/shell-library/push-request/{prId}/approve
       → Approve, write ShellLibraryTemplate

PUT    /api/v1/shell-library/push-request/{prId}/reject
       Body: { rejectReason }
       → Reject

# Clone (downward)
POST   /api/v1/shell-library/templates/{id}/clone-to-study
       Body: { studyId }
       → Create StudyTemplate
```

### 5.2 Study Template API (Extended)

```
# Existing: backend/app/api/routers/ars_study.py

GET    /api/v1/studies/{studyId}/shell-templates
POST   /api/v1/studies/{studyId}/shell-templates
PUT    /api/v1/studies/{studyId}/shell-templates/{id}
DELETE /api/v1/studies/{studyId}/shell-templates/{id}

# New
POST   /api/v1/studies/{studyId}/shell-templates/import
       Body: { jsonContent }
       → Import StudyTemplate[]

POST   /api/v1/studies/{studyId}/shell-templates/{id}/push-to-library
       Body: { targetLevel, targetScopeNodeId, prTitle, prDescription }
       → Create PR

POST   /api/v1/studies/{studyId}/shell-templates/clone-from-library
       Body: { libraryTemplateId }
       → Create StudyTemplate
```

### 5.3 Analysis Shell API (Extended)

```
# Existing: backend/app/api/routers/ars.py

POST   /api/v1/analyses/{analysisId}/shells
       Body: { displayType, shellSchema, sourceTemplateId?, sourceLibraryId?, sourceLevel? }
       → Create Shell

POST   /api/v1/analyses/{analysisId}/shells/import
       Body: { jsonContent }
       → Import Shell

POST   /api/v1/analyses/{analysisId}/shells/{shellId}/push-to-study
       Body: { studyId }
       → Create StudyTemplate (direct)

POST   /api/v1/analyses/{analysisId}/shells/{shellId}/push-to-library
       Body: { targetLevel, targetScopeNodeId, prTitle, prDescription }
       → Create PR
```

### 5.4 Database Models

```python
# backend/app/models/shell_library.py

class ShellLibraryTemplate(Base, SoftDeleteMixin):
    __tablename__ = "shell_library_templates"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    scope_level: Mapped[str] = mapped_column(String(20))
    scope_node_id: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(50))
    template_name: Mapped[str] = mapped_column(String(200))
    display_type: Mapped[str] = mapped_column(String(20))
    shell_schema: Mapped[dict] = mapped_column(JSONB)
    statistics_set_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    version_history: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

# backend/app/models/ars_study.py (extend StudyTemplate)

class StudyTemplate(Base, SoftDeleteMixin):
    # Existing fields preserved

    # New: source tracking
    source_library_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    source_template_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # New: version and audit
    version: Mapped[int] = mapped_column(Integer, default=1)
    version_history: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_by: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
```

### 5.5 Migration

```python
# backend/alembic/versions/YYYY-MM-DD_shell_library_system.py

def upgrade():
    # Create shell_library_templates table
    op.create_table(
        'shell_library_templates',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('scope_level', sa.String(20)),
        sa.Column('scope_node_id', sa.String(100)),
        sa.Column('category', sa.String(50)),
        sa.Column('template_name', sa.String(200)),
        sa.Column('display_type', sa.String(20)),
        sa.Column('shell_schema', sa.JSON),
        sa.Column('statistics_set_id', sa.String(50), nullable=True),
        sa.Column('version', sa.Integer, default=1),
        sa.Column('version_history', sa.JSON, nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(100)),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_by', sa.String(100), nullable=True),
        sa.Column('updated_at', sa.DateTime, nullable=True),
        sa.Column('is_archived', sa.Boolean, default=False),
    )

    # Extend study_templates
    op.add_column('study_templates', sa.Column('source_library_id', sa.String(50), nullable=True))
    op.add_column('study_templates', sa.Column('source_level', sa.String(20), nullable=True))
    op.add_column('study_templates', sa.Column('source_template_name', sa.String(200), nullable=True))
    op.add_column('study_templates', sa.Column('version', sa.Integer, default=1))
    op.add_column('study_templates', sa.Column('version_history', sa.JSON, nullable=True))
    op.add_column('study_templates', sa.Column('created_by', sa.String(100)))
    op.add_column('study_templates', sa.Column('created_at', sa.DateTime))
    op.add_column('study_templates', sa.Column('updated_by', sa.String(100), nullable=True))
    op.add_column('study_templates', sa.Column('updated_at', sa.DateTime, nullable=True))
    op.add_column('study_templates', sa.Column('is_archived', sa.Boolean, default=False))
```

---

## Section 6: JSON Import & Testing

### 6.1 JSON Import Implementation

**Clymb Clinical ARS Format:**

```json
{
  "about": { "version": "2.0.2" },
  "studyInfo": { "studyId", "therapeuticArea" },
  "analyses": [{ "id", "name", "dataset", "variable", "results" }],
  "outputs": [{ "id", "displays": [{ "displaySections": [...] }] }]
}
```

**Parse Logic:**

```typescript
// frontend/src/features/tfl-designer/utils/jsonImportUtils.ts

function parseARSJSONToShellTemplates(
  json: ARSExportJSON,
  scopeLevel: string,
  scopeNodeId: string
): ShellLibraryTemplate[] {
  const templates: ShellLibraryTemplate[] = [];

  for (const output of json.outputs) {
    for (const displayItem of output.displays) {
      const display = displayItem.display;
      const sections = display.displaySections || [];

      const titleSection = sections.find(s => s.sectionType === 'Title');
      const footnoteSection = sections.find(s => s.sectionType === 'Footnote');

      const matchedAnalyses = findMatchingAnalyses(json.analyses, output.id, display.id);

      const shellSchema: TableShell = {
        id: generateId('table'),
        shellNumber: titleSection?.orderedSubSections?.[0]?.subSection?.text || '',
        title: titleSection?.orderedSubSections?.[1]?.subSection?.text || display.displayTitle,
        population: 'Safety',
        category: inferCategory(matchedAnalyses),
        dataset: matchedAnalyses?.[0]?.dataset || 'ADSL',
        rows: buildRowsFromAnalyses(matchedAnalyses),
        footer: {
          source: matchedAnalyses?.[0]?.dataset || '',
          notes: footnoteSection?.orderedSubSections?.map(s => s.subSection.text) || [],
        },
      };

      templates.push({
        id: generateId('libtpl'),
        scopeLevel,
        scopeNodeId,
        category: shellSchema.category,
        templateName: display.name,
        displayType: 'Table',
        shellSchema,
        version: 1,
        createdBy: 'import',
        createdAt: new Date().toISOString().split('T')[0],
        isArchived: false,
      });
    }
  }

  return templates;
}
```

### 6.2 Testing Strategy

**Unit Tests:**
- `jsonImportUtils.ts`: ARS JSON parsing accuracy
- `shellLibraryStore`: CRUD, filtering
- API endpoints: Push, Clone operations

**Integration Tests:**
- Push flow: Analysis → Study → TA → Global
- PR Workflow: Create → Approve → Write → Version update
- JSON Import: Upload → Parse → Store → Display

**E2E Scenarios:**

| Scenario | Steps |
|----------|-------|
| Create Global Template | Admin login → Global Library → Add → Scratch → Save |
| Clone Global to Study | Study Settings → Add → From Global → Select → Create |
| Study Push to TA | Study Library → Push to TA → PR → Admin approve → Verify TA |
| Analysis Push to Global | Analysis Shell → Push to Global → PR → Admin approve → Verify Global |
| JSON Import | Global Library → Import JSON → Select file → Preview → Confirm → Verify |

### 6.3 File List

**New Files:**

| File | Purpose |
|------|---------|
| `frontend/src/features/tfl-designer/stores/shellLibraryStore.ts` | Global/TA Store |
| `frontend/src/features/tfl-designer/components/shared/PushToLibraryModal.tsx` | Push Modal |
| `frontend/src/features/tfl-designer/utils/jsonImportUtils.ts` | JSON Import parsing |
| `backend/app/models/shell_library.py` | ShellLibraryTemplate model |
| `backend/app/api/routers/shell_library.py` | Shell Library API |
| `backend/app/schemas/shell_library.py` | Pydantic Schema |
| `backend/alembic/versions/XXX_shell_library_system.py` | Migration |

**Modified Files:**

| File | Changes |
|------|---------|
| `frontend/src/features/tfl-designer/types/index.ts` | Add ShellLibraryTemplate type |
| `frontend/src/features/tfl-designer/components/study/StudyTemplateLibrary.tsx` | Rename + new features |
| `frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx` | Multi-source support |
| `frontend/src/pages/(base)/mdr/tfl-template-library/index.tsx` | Global/TA filter |
| `frontend/src/features/tfl-designer/stores/tableStore.ts` | Add push methods |
| `backend/app/models/ars_study.py` | StudyTemplate extensions |
| `backend/app/api/routers/ars_study.py` | Add Import/Push endpoints |

### 6.4 Implementation Phases

**Phase 1: Foundation**
1. Database Migration (shell_library_templates + study_templates extensions)
2. Backend API (Shell Library CRUD)
3. Frontend Store (shellLibraryStore)
4. Type definitions

**Phase 2: UI**
1. Global/TA Shell Library page filtering
2. Study Shell Library rename + source display
3. Template Picker Modal multi-source merge

**Phase 3: Push Mechanism**
1. PushToLibraryModal component
2. Push API endpoints
3. PR Workflow integration

**Phase 4: JSON Import**
1. jsonImportUtils parsing logic
2. Import Modal at all levels
3. Testing validation

---

## Summary

This design establishes a 4-level shell library hierarchy with:
- **Downward cloning**: Lower levels can use upper-level templates (cumulative inheritance)
- **Upward push**: Any level can push to any upper level via PR workflow
- **JSON import**: All levels support Clymb Clinical ARS format import
- **Version tracking**: All shells/templates have version history
- **Source tracing**: Origin of each shell/template is recorded
- **Product extensibility**: Architecture reserved for future Product level