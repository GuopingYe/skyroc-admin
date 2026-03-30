# TFL Template System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Shell Templates tab to study settings and combine global + study templates in the picker modal with filtering.

**Architecture:** Modify 2 frontend files - add tab to settings page, redesign modal to merge both template sources with filter dropdown and source tags.

**Tech Stack:** React, TypeScript, Zustand, Ant Design

---

## File Structure

| File | Purpose |
|------|---------|
| `frontend/src/pages/(base)/mdr/tfl-designer/index.tsx` | Add Shell Templates tab, rename menu item |
| `frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx` | Add global templates, filtering, source tags |

---

### Task 1: Add Shell Templates Tab to Study Settings

**Files:**
- Modify: `frontend/src/pages/(base)/mdr/tfl-designer/index.tsx`

- [ ] **Step 1: Add FileTextOutlined import if not present**

Check if `FileTextOutlined` is already imported. If not, add to imports:

```tsx
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  FileTextOutlined,  // Add this if missing
  // ... other imports
} from '@ant-design/icons';
```

- [ ] **Step 2: Add Shell Templates tab to studySettingsTabs**

Locate `studySettingsTabs` useMemo (around line 236) and add the new tab:

```tsx
const studySettingsTabs = useMemo(() => [
  { key: 'tableHeaders', icon: <ColumnWidthOutlined />, label: 'Table Headers' },
  { key: 'populations', icon: <TeamOutlined />, label: t('page.mdr.tflDesigner.tabs.population') },
  { key: 'shellTemplates', icon: <FileTextOutlined />, label: 'Shell Templates' },
  { key: 'headerFormatting', icon: <BgColorsOutlined />, label: 'Header Formatting' },
  { key: 'statistics', icon: <BarChartOutlined />, label: t('page.mdr.tflDesigner.tabs.statistics') },
], [t]);
```

- [ ] **Step 3: Add case in renderStudySettingsContent**

Locate `renderStudySettingsContent` useCallback (around line 244) and add the case:

```tsx
const renderStudySettingsContent = useCallback(() => {
  switch (studySettingsTab) {
    case 'tableHeaders':
      return <TreatmentArmEditor />;
    case 'populations':
      return <PopulationManager />;
    case 'shellTemplates':
      return <StudyTemplateLibrary />;
    case 'headerFormatting':
      return <HeaderStyleSelector value={headerFontStyle} onChange={updateHeaderStyle} />;
    case 'statistics':
      return <StatisticsSetManager />;
    default:
      return null;
  }
}, [studySettingsTab, headerFontStyle, updateHeaderStyle]);
```

- [ ] **Step 4: Verify StudyTemplateLibrary is imported**

Check imports at top of file. If `StudyTemplateLibrary` is not imported, add it:

```tsx
import {
  // ... existing imports
  StudyTemplateLibrary,
  // ... other imports
} from '@/features/tfl-designer';
```

- [ ] **Step 5: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "^src/" | head -20
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/\(base\)/mdr/tfl-designer/index.tsx
git commit -m "feat(tfl): add Shell Templates tab to study-level settings"
```

---

### Task 2: Add Filter Dropdown to Template Picker Modal

**Files:**
- Modify: `frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx`

- [ ] **Step 1: Add Select import and useTemplateStore**

Update imports at top of file:

```tsx
import { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  Card,
  Input,
  Tabs,
  Tag,
  Space,
  Button,
  Typography,
  Divider,
  Select,
} from 'antd';
import { SearchOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { StudyTemplate, AnalysisCategory, Template } from '../../types';
import { categoryOptions, generateId } from '../../types';
import type { TableShell, FigureShell, ListingShell } from '../../types';
import { useStudyStore, useTableStore, useFigureStore, useListingStore, useTemplateStore } from '../../stores';
import { createNewFigure } from '../../stores/figureStore';
```

- [ ] **Step 2: Add filter state and initialize global templates**

Add after the existing state declarations (around line 50):

```tsx
const [sourceFilter, setSourceFilter] = useState<'all' | 'global' | 'study'>('all');

// Access global templates and initialize on mount
const globalTemplates = useTemplateStore((s) => s.templates);
const initTemplates = useTemplateStore((s) => s.initTemplates);

useEffect(() => {
  initTemplates();
}, [initTemplates]);
```

- [ ] **Step 3: Add TemplateItem interface and combined templates memo**

Add before the component return:

```tsx
interface TemplateItem {
  id: string;
  name: string;
  source: 'global' | 'study';
  displayType: 'Table' | 'Figure' | 'Listing';
  category: AnalysisCategory;
  shellSchema: TableShell | FigureShell | ListingShell;
  statisticsSetId?: string;
  version?: number;
}

// Combine global and study templates into unified list
const allTemplates = useMemo<TemplateItem[]>(() => {
  const global: TemplateItem[] = globalTemplates.map((t: Template) => ({
    id: t.id,
    name: t.name,
    source: 'global' as const,
    displayType: t.type === 'table' ? 'Table' : t.type === 'figure' ? 'Figure' : 'Listing',
    category: t.category,
    shellSchema: t.shell,
  }));

  const study: TemplateItem[] = studyTemplates.map((t: StudyTemplate) => ({
    id: String(t.id),
    name: t.templateName,
    source: 'study' as const,
    displayType: t.displayType,
    category: t.category,
    shellSchema: t.shellSchema,
    statisticsSetId: t.statisticsSetId,
    version: t.version,
  }));

  return [...global, ...study];
}, [globalTemplates, studyTemplates]);
```

- [ ] **Step 4: Update filteredTemplates to use allTemplates and sourceFilter**

Replace the existing `filteredTemplates` useMemo with:

```tsx
const filteredTemplates = useMemo(() => {
  let templates = allTemplates;

  // Filter by source
  if (sourceFilter === 'global') {
    templates = templates.filter((t) => t.source === 'global');
  } else if (sourceFilter === 'study') {
    templates = templates.filter((t) => t.source === 'study');
  }

  // Filter by search
  if (searchValue) {
    const q = searchValue.toLowerCase();
    templates = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    );
  }

  // Filter by display type tab
  if (activeTab !== 'all') {
    templates = templates.filter((t) => t.displayType === activeTab);
  }

  return templates;
}, [allTemplates, sourceFilter, searchValue, activeTab]);
```

- [ ] **Step 5: Update selectedTemplate type**

Change the state type to use TemplateItem:

```tsx
const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx
git commit -m "feat(tfl): add filter dropdown and combine template sources in picker modal"
```

---

### Task 3: Update Modal UI with Filter and Source Tags

**Files:**
- Modify: `frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx`

- [ ] **Step 1: Add filter dropdown and source filter options constant**

Add constant after DISPLAY_TYPE_TABS:

```tsx
const SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Templates' },
  { value: 'global', label: 'Global Templates' },
  { value: 'study', label: 'Study Templates' },
];
```

- [ ] **Step 2: Add filter dropdown UI in modal**

Locate the search input section (around line 213) and add the filter dropdown before it:

```tsx
{/* Filter and Search */}
<div style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
  <Select
    value={sourceFilter}
    onChange={(v) => setSourceFilter(v as 'all' | 'global' | 'study')}
    options={SOURCE_FILTER_OPTIONS}
    style={{ width: 150 }}
    size="small"
  />
  <Search
    placeholder="Search templates..."
    prefix={<SearchOutlined />}
    value={searchValue}
    onChange={(e) => setSearchValue(e.target.value)}
    allowClear
    style={{ flex: 1 }}
  />
</div>
```

- [ ] **Step 3: Update template card rendering with source tags**

Locate the template grid rendering (around line 244) and update:

```tsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
  {filteredTemplates.map((tpl) => {
    const isSelected = selectedTemplate?.id === tpl.id;
    const ssName = tpl.statisticsSetId
      ? statisticsSets.find((s) => s.id === tpl.statisticsSetId)?.name
      : undefined;
    return (
      <Card
        key={`${tpl.source}-${tpl.id}`}
        hoverable
        size="small"
        style={{
          cursor: 'pointer',
          border: isSelected ? '2px solid #1890ff' : undefined,
        }}
        onClick={() => {
          setSelectedTemplate(tpl);
          setSelectedBlank(null);
        }}
      >
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ fontSize: 13 }}>{tpl.name}</Text>
            <Tag color={tpl.displayType === 'Table' ? 'blue' : tpl.displayType === 'Figure' ? 'green' : 'orange'}>
              {tpl.displayType}
            </Tag>
          </div>
          <div>
            <Tag color={tpl.source === 'global' ? 'geekblue' : 'purple'}>
              {tpl.source === 'global' ? 'Global' : 'Study'}
            </Tag>
            <Tag style={{ fontSize: 11 }}>{getCategoryLabel(tpl.category)}</Tag>
            {ssName && <Tag color="purple" style={{ fontSize: 11 }}>{ssName}</Tag>}
            {tpl.version && <Tag style={{ fontSize: 11 }}>v{tpl.version}</Tag>}
          </div>
        </Space>
      </Card>
    );
  })}
</div>
```

- [ ] **Step 4: Update empty state for each filter context**

Update the empty state rendering (around line 234):

```tsx
{filteredTemplates.length === 0 ? (
  <div style={{ padding: '40px 0', textAlign: 'center' }}>
    <Text type="secondary">
      {sourceFilter === 'global' && globalTemplates.length === 0
        ? 'No global templates available.'
        : sourceFilter === 'study' && studyTemplates.length === 0
        ? 'No study templates defined yet. Add templates in Study Settings > Shell Templates.'
        : 'No templates match your search.'}
    </Text>
  </div>
) : (
  // ... grid
)}
```

- [ ] **Step 5: Update footer counts**

Locate the footer (around line 170) and update:

```tsx
footer={
  <Space className="w-full justify-between">
    <Text type="secondary">
      {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
      {sourceFilter === 'all' && ` (${globalTemplates.length} Global, ${studyTemplates.length} Study)`}
    </Text>
    <Space>
      <Button onClick={handleClose}>Cancel</Button>
      <Button type="primary" onClick={handleApply} disabled={!canApply}>
        Create Shell
      </Button>
    </Space>
  </Space>
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx
git commit -m "feat(tfl): add source tags and update empty states in template picker"
```

---

### Task 4: Update handleApply to Support Both Template Types

**Files:**
- Modify: `frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx`

- [ ] **Step 1: Update handleApply to use TemplateItem**

Update the handleApply function to work with the unified TemplateItem type:

```tsx
const handleApply = () => {
  if (selectedBlank) {
    // Start blank - existing code remains the same
    if (selectedBlank === 'Table') {
      const newTable: TableShell = {
        id: generateId('table'),
        shellNumber: `Table 14.${tableStore.tables.length + 1}.1`,
        title: 'New Table',
        population: 'Safety',
        category: 'Demographics',
        dataset: 'ADSL',
        treatmentArmSetId: '',
        statisticsSetId: '',
        rows: [],
        footer: { source: '', notes: [] },
      };
      tableStore.addTable(newTable);
      tableStore.setCurrentTable(newTable);
      figureStore.setCurrentFigure(null);
      listingStore.setCurrentListing(null);
    } else if (selectedBlank === 'Figure') {
      const fig = createNewFigure(`Figure 15.${figureStore.figures.length + 1}.1`);
      figureStore.addFigure(fig);
      figureStore.setCurrentFigure(fig);
      tableStore.setCurrentTable(null);
      listingStore.setCurrentListing(null);
    } else if (selectedBlank === 'Listing') {
      const newList: ListingShell = {
        id: generateId('listing'),
        listingNumber: `Listing 16.${listingStore.listings.length + 1}.1`,
        title: 'New Listing',
        population: 'Safety',
        dataset: 'ADAE',
        columns: [],
        pageSize: 20,
      };
      listingStore.addListing(newList);
      listingStore.setCurrentListing(newList);
      tableStore.setCurrentTable(null);
      figureStore.setCurrentFigure(null);
    }
    window.$message?.success('Blank shell created');
  } else if (selectedTemplate) {
    // Clone from template
    const schema = JSON.parse(JSON.stringify(selectedTemplate.shellSchema)) as TableShell | FigureShell | ListingShell;

    if (selectedTemplate.displayType === 'Table') {
      const shell = schema as TableShell;
      shell.id = generateId('table');
      if (selectedTemplate.statisticsSetId) {
        shell.statisticsSetId = selectedTemplate.statisticsSetId;
      }
      tableStore.addTable(shell);
      tableStore.setCurrentTable(shell);
      figureStore.setCurrentFigure(null);
      listingStore.setCurrentListing(null);
    } else if (selectedTemplate.displayType === 'Figure') {
      const shell = schema as FigureShell;
      shell.id = generateId('figure');
      figureStore.addFigure(shell);
      figureStore.setCurrentFigure(shell);
      tableStore.setCurrentTable(null);
      listingStore.setCurrentListing(null);
    } else if (selectedTemplate.displayType === 'Listing') {
      const shell = schema as ListingShell;
      shell.id = generateId('listing');
      listingStore.addListing(shell);
      listingStore.setCurrentListing(shell);
      tableStore.setCurrentTable(null);
      figureStore.setCurrentFigure(null);
    }
    window.$message?.success(`Shell created from ${selectedTemplate.source === 'global' ? 'global' : 'study'} template "${selectedTemplate.name}"`);
  }

  handleClose();
};
```

- [ ] **Step 2: Update selected template preview**

Locate the selected template preview section (around line 284) and update:

```tsx
{selectedTemplate && (
  <>
    <Divider />
    <div style={{ background: '#f5f5f5', borderRadius: 6, padding: 12 }}>
      <Title level={5} style={{ marginTop: 0 }}>Selected: {selectedTemplate.name}</Title>
      <Space size="large">
        <span>
          <Text type="secondary">Source:</Text>{' '}
          <Tag color={selectedTemplate.source === 'global' ? 'geekblue' : 'purple'}>
            {selectedTemplate.source === 'global' ? 'Global' : 'Study'}
          </Tag>
        </span>
        <span><Text type="secondary">Category:</Text> {getCategoryLabel(selectedTemplate.category)}</span>
        <span><Text type="secondary">Type:</Text> {selectedTemplate.displayType}</span>
        {selectedTemplate.version && <span><Text type="secondary">Version:</Text> v{selectedTemplate.version}</span>}
      </Space>
    </div>
  </>
)}
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "^src/" | head -20
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/tfl-designer/components/shared/TemplatePickerModal.tsx
git commit -m "feat(tfl): update handleApply to support both global and study templates"
```

---

### Task 5: Update Menu Text

**Files:**
- Modify: `frontend/src/pages/(base)/mdr/tfl-designer/index.tsx`

- [ ] **Step 1: Rename menu item from "From Study Template" to "From Template"**

Locate the Dropdown menu items (around line 1560) and update:

```tsx
{
  key: 'fromTemplate',
  icon: <FileTextOutlined />,
  label: 'From Template',
  onClick: () => setTemplatePickerOpen(true),
},
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "^src/" | head -20
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/\(base\)/mdr/tfl-designer/index.tsx
git commit -m "feat(tfl): rename menu item to 'From Template'"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Run full TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 2: Manual testing checklist**

Verify the following:
- [ ] Shell Templates tab visible in study-level settings (when no analysis selected)
- [ ] StudyTemplateLibrary renders correctly in the new tab
- [ ] Template picker shows both global and study templates
- [ ] Filter dropdown works (All/Global/Study)
- [ ] Source tags display correctly (Global = geekblue, Study = purple)
- [ ] Search works across both template sources
- [ ] Creating shell from global template works
- [ ] Creating shell from study template works
- [ ] Empty states are appropriate for each filter context
- [ ] Footer shows correct template counts with breakdown

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git status
# If changes, commit with:
git add -A
git commit -m "fix(tfl): resolve template system issues"
```