# Reference Data Management Design

**Date**: 2026-04-01
**Status**: Draft
**Phase**: Phase 1 of hardcoded data migration

## Problem Statement

The frontend contains 8 major mock data files (~6,000+ lines) and numerous inline constants that should be served from a backend API and managed through an admin interface. Key hardcoded data includes:

- Populations (Safety, ITT, FAS, PPS, etc.)
- SDTM Domains (DM, AE, VS, LB, EX, etc.)
- ADaM Datasets (ADSL, ADAE, ADLB, ADVS, etc.)
- Study Phases (Phase I through Phase IV)
- Statistic Types, Display Types, Analysis Categories
- Study Config options (Therapeutic Areas, Regulatory Agencies, Control Types, Blinding Status, Study Designs)

These are used across TFL Designer, Programming Tracker, Pipeline Management, Mapping Studio, and Study Spec pages. Currently, modifying any of these requires frontend code changes and redeployment.

## Approach

**Generic reference data table** with a `category` enum column. One table, one set of CRUD endpoints, one admin page. All 8 data types share a common code/label/description structure with an extensible JSONB metadata field for type-specific attributes.

## Data Model

### New Table: `reference_data`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default uuid4 | Primary key |
| `category` | VARCHAR(32) | NOT NULL, indexed | ReferenceDataCategory enum value |
| `code` | VARCHAR(64) | NOT NULL | Short code (e.g., "ITT", "DM", "ADSL") |
| `label` | VARCHAR(256) | NOT NULL | Display name (e.g., "Intent-to-Treat") |
| `description` | TEXT | nullable | Optional description |
| `sort_order` | INTEGER | default 0 | Display ordering |
| `metadata_` | JSONB | nullable | Extensible per-type fields |
| `is_active` | BOOLEAN | default true, indexed | Active/inactive toggle |
| `created_at` | TIMESTAMPTZ | NOT NULL | From TimestampMixin |
| `updated_at` | TIMESTAMPTZ | NOT NULL | From TimestampMixin |
| `is_deleted` | BOOLEAN | NOT NULL, default false | From SoftDeleteMixin |
| `deleted_at` | TIMESTAMPTZ | nullable | From SoftDeleteMixin |
| `deleted_by` | VARCHAR | nullable | From SoftDeleteMixin |

**Unique Constraint**: `(category, code)` WHERE `is_deleted = false`

**Indexes**: `ix_reference_data_category`, `ix_reference_data_is_deleted`, `ix_reference_data_is_active`

### New Enum: `ReferenceDataCategory`

```python
class ReferenceDataCategory(str, enum.Enum):
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

### Model Definition

```python
class ReferenceData(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "reference_data"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    category: Mapped[str] = mapped_column(
        SQLAlchemyEnum(ReferenceDataCategory), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(default=0)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, index=True)

    __table_args__ = (
        UniqueConstraint("category", "code", name="uq_reference_data_category_code"),
    )
```

### Metadata Examples

Each category can store type-specific fields in `metadata_`:

- **SDTM Domain**: `{ "class": "Events", "keys": ["STUDYID", "USUBJID", "AESEQ"], "structure": "One record per adverse event per subject" }`
- **ADaM Dataset**: `{ "class": "ADSL", "keys": ["STUDYID", "USUBJID"], "structure": "One record per subject" }`
- **Study Phase**: `{ "abbreviation": "I", "ordinal": 1 }`
- **Population**: `{ "description_detail": "All randomized subjects" }`

### Seed Data

An Alembic migration will seed initial data for all categories, matching current hardcoded values:

- Populations: Safety, ITT, FAS, PPS, All Enrolled
- SDTM Domains: DM, AE, VS, LB, EX, CM, DS, EG, PE, MH
- ADaM Datasets: ADSL, ADAE, ADLB, ADVS, ADTTE, ADRS, ADEFF, ADCM
- Study Phases: Phase I, Phase I/II, Phase II, Phase II/III, Phase III, Phase IV
- Statistic Types: n, Mean, SD, Median, Min, Max, Range, n(%), Header Row
- Display Types: Table, Figure, Listing
- Analysis Categories: Demographics, Baseline, Disposition, Treatment_Compliance, Protocol_Deviations, Adverse_Events, Laboratory, Vital_Signs_Visits, ECG_Visits, Efficacy, Other
- Study Config: Therapeutic Areas, Regulatory Agencies, Control Types, Blinding Status, Study Designs

## API Design

### New Router: `reference_data.py`

Mounted at `/api/v1/reference-data`

| Endpoint | Method | Description | Permission |
|----------|--------|-------------|------------|
| `/` | GET | List all categories with item counts | Any authenticated user |
| `/{category}` | GET | List items in category (paginated, filterable by `is_active`, `is_deleted`) | Any authenticated user |
| `/{category}` | POST | Create item in category | `reference_data:manage` |
| `/{category}/{code}` | GET | Get single item by code | Any authenticated user |
| `/{category}/{code}` | PUT | Update item | `reference_data:manage` |
| `/{category}/{code}` | PATCH | Soft delete or restore | `reference_data:manage` |

### Request/Response Schemas

```python
# Create/Update
class ReferenceDataCreate(BaseModel):
    code: str = Field(max_length=64)
    label: str = Field(max_length=256)
    description: str | None = None
    sort_order: int = 0
    metadata_: dict[str, Any] | None = None

class ReferenceDataUpdate(BaseModel):
    label: str | None = None
    description: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    metadata_: dict[str, Any] | None = None

# Response
class ReferenceDataResponse(BaseModel):
    id: str
    category: str
    code: str
    label: str
    description: str | None
    sort_order: int
    metadata_: dict[str, Any] | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

class CategorySummary(BaseModel):
    category: str
    label: str  # human-readable category name
    count: int
    active_count: int
```

### Permission Integration

The `reference_data:manage` permission will be added to the RBAC system:
- Seed as a new permission under "System Administration" category
- Assign to Super Admin and Admin roles by default
- Enforced via `require_permission("reference_data:manage")` dependency on write endpoints

## Frontend Design

### Service Layer

New file `frontend/src/service/api/reference-data.ts`:

```typescript
// API calls
fetchReferenceCategories(): Promise<CategorySummary[]>
fetchReferenceItems(category: string, params?: { is_active?: boolean }): Promise<ReferenceDataResponse[]>
createReferenceItem(category: string, data: ReferenceDataCreate): Promise<ReferenceDataResponse>
updateReferenceItem(category: string, code: string, data: ReferenceDataUpdate): Promise<ReferenceDataResponse>
deleteReferenceItem(category: string, code: string): Promise<void>
restoreReferenceItem(category: string, code: string): Promise<void>
```

New file `frontend/src/service/hooks/useReferenceData.ts`:

```typescript
// React Query hook for dropdown options
function useReferenceOptions(category: ReferenceDataCategory): {
  options: { label: string; value: string }[]
  isLoading: boolean
}

// React Query hook for admin page
function useReferenceItems(category: ReferenceDataCategory, params?: { is_active?: boolean }): {
  items: ReferenceDataResponse[]
  isLoading: boolean
  create: UseMutationResult
  update: UseMutationResult
  remove: UseMutationResult
  restore: UseMutationResult
}
```

### Admin Page

**Route**: `/system/reference-data`
**Menu**: Under System menu, "Reference Data" entry (requires `reference_data:manage` permission to see management actions)

Layout:
- Single page with `<Tabs>` component
- 12 tabs (one per ReferenceDataCategory)
- Each tab: `<ProTable>` with columns Code | Label | Description | Status | Sort Order | Actions
- Add/Edit modal form with Code (editable only on create), Label, Description, Sort Order, and category-specific metadata fields
- Delete with confirmation dialog (soft delete)
- Permission gating: write actions only visible to users with `reference_data:manage`

### Integration: Replace Hardcoded Arrays

The following hardcoded constants will be replaced with `useReferenceOptions()` calls:

| Current Location | Constant | Category |
|-----------------|----------|----------|
| `tfl-designer/components/shared/TemplateEditorPanel.tsx:51` | `POPULATION_OPTIONS` | POPULATION |
| `tfl-designer/components/study/StatisticsSetManager.tsx:30` | `STAT_TYPE_OPTIONS` | STAT_TYPE |
| `tfl-designer/components/study/StudyShellLibrary.tsx:31` | `DISPLAY_TYPE_OPTIONS` | DISPLAY_TYPE |
| `tfl-designer/types.ts:677` | `categoryOptions` | ANALYSIS_CATEGORY |
| `programming-tracker/mockData.ts:218` | populations array | POPULATION |
| `programming-tracker/mockData.ts:192` | SDTM_DOMAINS array | SDTM_DOMAIN |
| `programming-tracker/mockData.ts:206` | ADAM_DATASETS array | ADAM_DATASET |
| `pipeline-management/mockData.ts:115` | studyPhases | STUDY_PHASE |
| `mapping-studio/mockData.ts:273` | domains dropdown | SDTM_DOMAIN |

### Fallback Strategy

During migration, components will fall back to hardcoded defaults if the API is unavailable:

```typescript
const POPULATION_DEFAULTS = [
  { label: 'Safety', value: 'Safety' },
  { label: 'ITT', value: 'ITT' },
  // ...
];

const { options } = useReferenceOptions('POPULATION');
const populations = options.length > 0 ? options : POPULATION_DEFAULTS;
```

This ensures the app works during development and if the backend is temporarily unavailable.

## Migration & Seed Strategy

1. Create Alembic migration for `reference_data` table
2. Create seed migration to populate initial data for all categories
3. Add `reference_data:manage` permission to RBAC seed data
4. Register new router in `main.py`
5. Deploy backend changes first
6. Then deploy frontend changes with fallback strategy

## Out of Scope (Phase 1)

The following are deferred to future phases:

- **clinicalDataStore.ts / pipelineMock.ts**: Full TA/Product/Study/Analysis hierarchy migration (Phase 2)
- **study-spec/mockData.ts**: SDTM/ADaM variable definitions (Phase 3 - these have dedicated APIs)
- **global-library/mockStandards.ts**: CDISC standards data (Phase 4 - already has dedicated API)
- **user-management/mockData.ts**: RBAC data (Phase 5 - already has dedicated API)
- **mapping-studio/mockData.ts**: Source fields and mapping rules (Phase 6 - needs mapping API)
- **Font options**: UI configuration, not clinical data — keep static
- **System enums** (business.ts, common.ts): App-level configuration, not reference data

## Future Phases

- **Phase 2**: Pipeline hierarchy (clinicalDataStore + pipelineMock) — connect existing pipeline APIs
- **Phase 3**: Study Spec variable definitions — connect existing study-spec APIs
- **Phase 4**: Global Library CDISC standards — connect existing global-library APIs
- **Phase 5**: User Management RBAC — connect existing rbac APIs
- **Phase 6**: Mapping Studio — needs new mapping API development
