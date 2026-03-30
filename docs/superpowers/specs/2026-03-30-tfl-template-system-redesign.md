# TFL Template System Redesign

**Date:** 2026-03-30
**Status:** Draft
**Author:** Claude

## Problem Statement

When creating a new shell at analysis level, the "From Study Template" option shows an error message: "No study templates defined yet. Add templates in Study Settings > Shell Templates." However:

1. The "Shell Templates" tab does not exist in the study-level settings page
2. Users cannot choose from global (built-in) templates when creating new shells
3. The modal only shows study templates, not the available global templates

## Goals

1. Add "Shell Templates" tab to study-level settings so users can manage study-specific templates
2. Update the template picker modal to show both global and study templates
3. Provide filtering capability to switch between template sources
4. Improve UX clarity with source tags on each template

## Design

### Section 1: Study-Level Settings - Add "Shell Templates" Tab

**Location:** `frontend/src/pages/(base)/mdr/tfl-designer/index.tsx`

**Changes:**
- Add new tab to `studySettingsTabs` array:
  ```tsx
  { key: 'shellTemplates', icon: <FileTextOutlined />, label: 'Shell Templates' }
  ```
- Add case in `renderStudySettingsContent`:
  ```tsx
  case 'shellTemplates':
    return <StudyTemplateLibrary />;
  ```
- Position tab between "Header Formatting" and "Statistics"

**Result:** Users can access `StudyTemplateLibrary` component from study-level settings when no analysis is selected.

### Section 2: Template Picker Modal - Combined Sources with Filtering

**Location:** `frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx`

**UI Layout:**
```
+---------------------------------------------------------+
| New Shell from Template                            [X]  |
+---------------------------------------------------------+
| Start Blank:  [Table] [Figure] [Listing]               |
+---------------------------------------------------------+
| Filter: [All ▼]    [Search templates...          🔍]   |
+---------------------------------------------------------+
| +-----------------+ +-----------------+                  |
| | Demographics    | | Adverse Events  |                  |
| | [Global] [Table]| | [Study] [Table] |                  |
| | Standard Demog  | | AE Summary      |                  |
| +-----------------+ +-----------------+                  |
|                                                         |
| +-----------------+                                     |
| | Safety          |                                     |
| | [Global] [Fig]  |                                     |
| | KM Curve        |                                     |
| +-----------------+                                     |
+---------------------------------------------------------+
| 4 templates (2 Global, 2 Study)                         |
|                                  [Cancel] [Create Shell] |
+---------------------------------------------------------+
```

**Filter Dropdown Options:**
- "All Templates" (default)
- "Global Templates"
- "Study Templates"

**Source Tags:**
- Global templates: `<Tag color="geekblue">Global</Tag>`
- Study templates: `<Tag color="purple">Study</Tag>`

**Implementation Changes:**
1. Import `useTemplateStore` to access global templates
2. Create combined template list with source identification:
   ```tsx
   interface TemplateItem {
     id: string;
     name: string;
     source: 'global' | 'study';
     displayType: 'Table' | 'Figure' | 'Listing';
     category: string;
     shellSchema: TableShell | FigureShell | ListingShell;
     statisticsSetId?: string;
   }
   ```
3. Add filter state and dropdown
4. Update grid rendering to show source tag
5. Update footer count to show breakdown
6. Update empty state for each filter context

### Section 3: Data Flow

**Template Sources:**

| Source | Store | Data Type | Description |
|--------|-------|-----------|-------------|
| Global | `templateStore.templates` | `Template[]` | Built-in industry-standard templates |
| Study | `studyStore.studyTemplates` | `StudyTemplate[]` | Custom templates for this study |

**No store changes required.** Both stores already have the necessary data.

**Template Application Flow:**
1. User clicks "+ New Shell" → "From Template" (rename from "From Study Template")
2. Modal opens with combined template list
3. User filters by source or searches
4. User selects template and clicks "Create Shell"
5. Clone template shell with new ID
6. Add to appropriate store (tableStore/figureStore/listingStore)

### Section 4: Menu Text Updates

**Location:** `frontend/src/pages/(base)/mdr/tfl-designer/index.tsx`

**Change:** Rename menu item from "From Study Template" to "From Template"

```tsx
{
  key: 'fromTemplate',
  icon: <FileTextOutlined />,
  label: 'From Template',  // was: t('page.mdr.tflDesigner.actions.fromTemplate')
  onClick: () => setTemplatePickerOpen(true),
}
```

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/pages/(base)/mdr/tfl-designer/index.tsx` | Add Shell Templates tab, rename menu item |
| `frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx` | Add global templates, filtering, source tags |

## Testing Checklist

- [ ] Shell Templates tab visible in study-level settings
- [ ] StudyTemplateLibrary renders correctly in the new tab
- [ ] Template picker shows both global and study templates
- [ ] Filter dropdown works correctly
- [ ] Source tags display correctly (Global vs Study)
- [ ] Search works across both template sources
- [ ] Creating shell from global template works
- [ ] Creating shell from study template works
- [ ] Empty states are appropriate for each filter context
- [ ] Footer shows correct template counts

## Out of Scope

- Backend API for template persistence (already exists)
- Template versioning improvements
- Template sharing between studies