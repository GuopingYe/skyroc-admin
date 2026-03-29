/**
 * TFL Designer - Main Page
 *
 * Implements the POC's tabbed editor pattern:
 * - Left sidebar: Outputs tree with filter tabs (All/Tables/Figures/Listings)
 * - Center: Tabbed editor (Table/Figure/Listing) based on selected output type
 * - Study overview when nothing is selected
 * - Integration with all Zustand stores and ported components
 *
 * Uses Zustand + Immer for independent state management (frontend-arch rule).
 */
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  FileTextOutlined,
  BarChartOutlined,
  TableOutlined,
  UnorderedListOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  ExclamationCircleOutlined,
  AppstoreOutlined,
  FilterOutlined,
  SettingOutlined,
  ExportOutlined,
  TeamOutlined,
  ColumnWidthOutlined,
  BgColorsOutlined,
  LayoutOutlined,
  LoadingOutlined,
  ReloadOutlined,
  NumberOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  Tabs,
  Card,
  Button,
  Space,
  Typography,
  Dropdown,
  Empty,
  Popconfirm,
  Modal,
  Tag,
  Tooltip,
  Breadcrumb,
  Segmented,
  Input,
  InputNumber,
  Select,
  Alert,
  Spin,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useClinicalContext } from '@/features/clinical-context';

import {
  useStudyStore,
  useTableStore,
  useFigureStore,
  useListingStore,
  createNewFigure,
  categoryOptions,
  datasetOptions,
  NestedRowEditor,
  TablePreview,
  TreatmentArmEditor,
  TemplateSelector,
  FigurePreview,
  ChartTypeSelector,
  AxesConfig,
  SeriesConfig,
  ListingPreview,
  ColumnEditor,
  SortConfigEditor,
  FilterConfigEditor,
  ExportModal,
  getTemplatesByType,
  searchTemplates,
  HeaderEditor,
  ColumnSourceEditor,
  PopulationManager,
  StatisticsSetManager,
  HeaderStyleSelector,
  ColumnHeaderSetEditor,
  InteractiveOutputEditor,
  DecimalDefaultsEditor,
  DecimalSettingsTab,
  StudyTemplateLibrary,
  TemplatePickerModal,
  PushToStudyModal,
  useTFLDesignerData,
} from '@/features/tfl-designer';
import type { Template, InteractiveOutputEditorRef } from '@/features/tfl-designer';

import type { TableShell, FigureShell, ListingShell, IARSDocument, ColumnHeaderGroup } from '@/features/tfl-designer';
import { generateId } from '@/features/tfl-designer';
import { useUserInfo } from '@/service/hooks';

const { Text, Title } = Typography;

// ==================== Route handle ====================

export const handle = {
  i18nKey: 'route.(base)_mdr_tfl-designer',
  icon: 'mdi:table-large',
  order: 5,
  title: 'TFL Designer',
};

// ==================== Sidebar Filter Tabs ====================

type SidebarFilter = 'all' | 'table' | 'figure' | 'listing';

type SidebarView = 'items' | 'settings';

// ==================== Main Component ====================

const TflDesigner: React.FC = () => {
  const { t } = useTranslation();
  const { isReady } = useClinicalContext();
  
  // Get current user for audit trail
  const { data: userInfo } = useUserInfo();
  // Backend data integration
  const {
    loading: tflLoading,
    saving: tflSaving,
    error: tflError,
    refresh: refreshTFLData,
    saveCurrentTable,
    saveCurrentFigure,
    saveCurrentListing,
    deleteCurrentTable,
    deleteCurrentFigure,
    deleteCurrentListing,
  } = useTFLDesignerData();



  // Zustand stores
  const studyStore = useStudyStore();
  const tableStore = useTableStore();
  const figureStore = useFigureStore();
  const listingStore = useListingStore();

  // Population options from study store (dynamic, data-driven)
  const populationSets = useStudyStore((s) => s.populationSets);
  const populationOptions = useMemo(
    () => populationSets.map((p) => ({ value: p.name, label: p.name })),
    [populationSets]
  );

  // Statistics Set options from study store (for metadata dropdown)
  const statisticsSets = useStudyStore((s) => s.statisticsSets);
  const statisticsSetOptions = useMemo(
    () => statisticsSets.map((s) => ({ value: s.id, label: s.name })),
    [statisticsSets]
  );

  // Header font style from study store
  const headerFontStyle = useStudyStore((s) => s.headerFontStyle);
  const setHeaderFontStyle = useStudyStore((s) => s.setHeaderFontStyle);

  // Column headers from the currently selected treatment arm set
  const treatmentArmSets = useStudyStore((s) => s.treatmentArmSets);
  const updateTreatmentArmSet = useStudyStore((s) => s.updateTreatmentArmSet);

  // Buffer column header edits locally — NOT applied to study store until save
  const [localColumnHeaders, setLocalColumnHeaders] = useState<Record<string, ColumnHeaderGroup[]>>({});

  // Effective headers: local override takes priority over study store
  const activeArmHeaders = useMemo(() => {
    const tasId = tableStore.currentTable?.treatmentArmSetId;
    if (!tasId) return [];
    if (localColumnHeaders[tasId]) return localColumnHeaders[tasId];
    const tas = treatmentArmSets.find(t => t.id === tasId);
    return tas?.headers || [];
  }, [tableStore.currentTable?.treatmentArmSetId, treatmentArmSets, localColumnHeaders]);

  // Handle column header edits — buffer locally instead of mutating study store
  const handleColumnHeadersChange = useCallback((newHeaders: ColumnHeaderGroup[]) => {
    const tasId = tableStore.currentTable?.treatmentArmSetId;
    if (!tasId) return;
    setLocalColumnHeaders(prev => ({ ...prev, [tasId]: newHeaders }));
  }, [tableStore.currentTable?.treatmentArmSetId]);

  // Check if there are unsaved study-level changes
  const hasUnsavedStudyChanges = Object.keys(localColumnHeaders).length > 0;

  // Find outputs that share the same treatment arm set (to warn user on save)
  const affectedOutputs = useMemo(() => {
    if (!hasUnsavedStudyChanges) return 0;
    const tasId = tableStore.currentTable?.treatmentArmSetId;
    if (!tasId) return 0;
    return tableStore.tables.filter(t => t.treatmentArmSetId === tasId && t.id !== tableStore.currentTable?.id).length;
  }, [hasUnsavedStudyChanges, tableStore.currentTable?.treatmentArmSetId, tableStore.currentTable?.id, tableStore.tables]);

  // Apply buffered study-level changes on save
  const applyStudyChanges = useCallback(() => {
    Object.entries(localColumnHeaders).forEach(([tasId, headers]) => {
      updateTreatmentArmSet(tasId, { headers });
    });
    setLocalColumnHeaders({});
  }, [localColumnHeaders, updateTreatmentArmSet]);

  // Clear local overrides when switching to a different treatment arm set
  const prevTasId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const tasId = tableStore.currentTable?.treatmentArmSetId;
    if (prevTasId.current && prevTasId.current !== tasId) {
      setLocalColumnHeaders({});
    }
    prevTasId.current = tasId;
  }, [tableStore.currentTable?.treatmentArmSetId]);

  // Sidebar filter
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>('all');

  // Sidebar view: items list or study settings
  const [sidebarView, setSidebarView] = useState<SidebarView>('items');

  // Active editor tab for each type
  const [tableEditorTab, setTableEditorTab] = useState('metadata');
  const [figureEditorTab, setFigureEditorTab] = useState('metadata');
  const [listingEditorTab, setListingEditorTab] = useState('metadata');

  // Study settings tab
  const [studySettingsTab, setStudySettingsTab] = useState('treatmentArms');

  // Template selector modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // Template picker modal (from study templates)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Push to Study PR modal
  const [pushToStudyOpen, setPushToStudyOpen] = useState(false);

  // Export modal
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Refs for InteractiveOutputEditor instances (for undo support)
  const tableEditorRef = useRef<InteractiveOutputEditorRef>(null);
  const listingEditorRef = useRef<InteractiveOutputEditorRef>(null);

  // Sidebar resizable width
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [editorPanelWidth, setEditorPanelWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingTarget, setResizingTarget] = useState<'sidebar' | 'editor'>('sidebar');

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, target: 'sidebar' | 'editor') => {
      e.preventDefault();
      setIsResizing(true);
      setResizingTarget(target);
      const startX = e.clientX;
      const startWidth = target === 'sidebar' ? sidebarWidth : editorPanelWidth;
      const minW = target === 'sidebar' ? 180 : 280;
      const maxW = target === 'sidebar' ? 500 : 600;

      const onMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const newWidth = Math.max(minW, Math.min(maxW, startWidth + delta));
        if (target === 'sidebar') setSidebarWidth(newWidth);
        else setEditorPanelWidth(newWidth);
      };

      const onMouseUp = () => {
        setIsResizing(false);
        setResizingTarget('sidebar');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [sidebarWidth, editorPanelWidth],
  );

  // ============ Derived state ============

  const hasSelection = !!(tableStore.currentTable || figureStore.currentFigure || listingStore.currentListing);

  // ============ Helper functions to convert store state to Template ============

  const convertTableToTemplate = useCallback((table: TableShell | null): Template | null => {
    if (!table) return null;
    return {
      id: table.id,
      type: 'table',
      name: table.title || 'Untitled Table',
      category: table.category || 'Other',
      description: '',
      shell: table,
      createdAt: new Date().toISOString().split('T')[0],
    };
  }, []);

  const convertFigureToTemplate = useCallback((figure: FigureShell | null): Template | null => {
    if (!figure) return null;
    return {
      id: figure.id,
      type: 'figure',
      name: figure.title || 'Untitled Figure',
      category: 'Other', // Figure doesn't have category, use default
      description: '',
      shell: figure,
      createdAt: new Date().toISOString().split('T')[0],
    };
  }, []);

  const convertListingToTemplate = useCallback((listing: ListingShell | null): Template | null => {
    if (!listing) return null;
    return {
      id: listing.id,
      type: 'listing',
      name: listing.title || 'Untitled Listing',
      category: 'Other', // Listing doesn't have category, use default
      description: '',
      shell: listing,
      createdAt: new Date().toISOString().split('T')[0],
    };
  }, []);

  // Handle template changes from InteractiveOutputEditor
  const handleTableTemplateChange = useCallback((template: Template) => {
    if (template.type === 'table' && tableStore.currentTable) {
      // Spread all shell properties to preserve custom fields (extraTitleLines, rowLabel, etc.)
      tableStore.updateMetadata({ ...(template.shell as TableShell) });
    }
  }, [tableStore]);

  const handleFigureTemplateChange = useCallback((template: Template) => {
    if (template.type === 'figure' && figureStore.currentFigure) {
      figureStore.updateMetadata({ ...(template.shell as FigureShell) });
    }
  }, [figureStore]);

  const handleListingTemplateChange = useCallback((template: Template) => {
    if (template.type === 'listing' && listingStore.currentListing) {
      listingStore.updateMetadata({ ...(template.shell as ListingShell) });
    }
  }, [listingStore]);

  // Build sidebar items from all stores
  const sidebarItems = useMemo(() => {
    const items: Array<{
      id: string;
      name: string;
      number: string;
      type: 'table' | 'figure' | 'listing';
      category: string;
    }> = [];

    tableStore.tables.forEach((tbl) => {
      items.push({
        id: tbl.id,
        name: tbl.title,
        number: tbl.shellNumber,
        type: 'table',
        category: tbl.category,
      });
    });

    figureStore.figures.forEach((fig) => {
      items.push({
        id: fig.id,
        name: fig.title,
        number: fig.figureNumber,
        type: 'figure',
        category: '',
      });
    });

    listingStore.listings.forEach((lst) => {
      items.push({
        id: lst.id,
        name: lst.title,
        number: lst.listingNumber,
        type: 'listing',
        category: '',
      });
    });

    return items;
  }, [tableStore.tables, figureStore.figures, listingStore.listings]);

  const filteredItems = useMemo(() => {
    if (sidebarFilter === 'all') return sidebarItems;
    return sidebarItems.filter((item) => item.type === sidebarFilter);
  }, [sidebarItems, sidebarFilter]);

  // Sidebar type counts
  const typeCounts = useMemo(() => ({
    table: tableStore.tables.length,
    figure: figureStore.figures.length,
    listing: listingStore.listings.length,
  }), [tableStore.tables.length, figureStore.figures.length, listingStore.listings.length]);

  // ============ Handlers ============

  const handleSelectItem = useCallback(
    (item: (typeof sidebarItems)[0]) => {
      setSidebarView('items');
      if (item.type === 'table') {
        const tbl = tableStore.tables.find((t) => t.id === item.id);
        if (tbl) tableStore.setCurrentTable(tbl);
        figureStore.setCurrentFigure(null);
        listingStore.setCurrentListing(null);
      } else if (item.type === 'figure') {
        const fig = figureStore.figures.find((f) => f.id === item.id);
        if (fig) figureStore.setCurrentFigure(fig);
        tableStore.setCurrentTable(null);
        listingStore.setCurrentListing(null);
      } else {
        const lst = listingStore.listings.find((l) => l.id === item.id);
        if (lst) listingStore.setCurrentListing(lst);
        tableStore.setCurrentTable(null);
        figureStore.setCurrentFigure(null);
      }
    },
    [tableStore, figureStore, listingStore]
  );

  const handleDeselectAll = useCallback(() => {
    tableStore.setCurrentTable(null);
    figureStore.setCurrentFigure(null);
    listingStore.setCurrentListing(null);
  }, [tableStore, figureStore, listingStore]);

  const handleShowStudySettings = useCallback(() => {
    setSidebarView('settings');
    handleDeselectAll();
  }, [handleDeselectAll]);

  const handleNewTable = useCallback(() => {
    const newTable: TableShell = {
      id: generateId('table'),
      shellNumber: `Table 14.${tableStore.tables.length + 1}.1`,
      title: 'New Table',
      population: 'Safety',
      category: 'Demographics',
      dataset: 'ADSL',
      treatmentArmSetId: studyStore.treatmentArmSets[0]?.id || 'tas1',
      statisticsSetId: 'ss1',
      rows: [],
      footer: { source: 'ADSL', notes: [] },
    };
    tableStore.addTable(newTable);
    tableStore.setCurrentTable(newTable);
    figureStore.setCurrentFigure(null);
    listingStore.setCurrentListing(null);
    window.$message?.success(t('page.mdr.tflDesigner.messages.newShellCreated'));
  }, [tableStore, figureStore, listingStore, studyStore, t]);

  const handleNewFigure = useCallback(() => {
    const fig = createNewFigure(`Figure 15.${figureStore.figures.length + 1}.1`);
    figureStore.addFigure(fig);
    figureStore.setCurrentFigure(fig);
    tableStore.setCurrentTable(null);
    listingStore.setCurrentListing(null);
    window.$message?.success(t('page.mdr.tflDesigner.messages.newShellCreated'));
  }, [figureStore, tableStore, listingStore, t]);

  const handleNewListing = useCallback(() => {
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
    window.$message?.success(t('page.mdr.tflDesigner.messages.newShellCreated'));
  }, [listingStore, tableStore, figureStore, t]);

  const handleDuplicateTable = useCallback(() => {
    if (!tableStore.currentTable) return;
    const dup: TableShell = {
      ...JSON.parse(JSON.stringify(tableStore.currentTable)),
      id: generateId('table'),
      shellNumber: tableStore.currentTable.shellNumber + ' (copy)',
      title: tableStore.currentTable.title + ' (copy)',
    };
    tableStore.addTable(dup);
    tableStore.setCurrentTable(dup);
  }, [tableStore]);

  const handleDeleteTable = useCallback(
    async (id: string) => {
      // Delete from backend if it's a persisted item
      if (!id.includes('_')) {
        const success = await deleteCurrentTable();
        if (!success) {
          window.$message?.error('Failed to delete table');
          return;
        }
      } else {
        // Remove from local store for new items
        tableStore.deleteTable(id);
      }
      window.$message?.success('Table deleted');
    },
    [tableStore, deleteCurrentTable]
  );

  const handleDeleteFigure = useCallback(
    async (id: string) => {
      if (!id.includes('_')) {
        const success = await deleteCurrentFigure();
        if (!success) {
          window.$message?.error('Failed to delete figure');
          return;
        }
      } else {
        figureStore.deleteFigure(id);
      }
      window.$message?.success('Figure deleted');
    },
    [figureStore, deleteCurrentFigure]
  );

  const handleDeleteListing = useCallback(
    async (id: string) => {
      if (!id.includes('_')) {
        const success = await deleteCurrentListing();
        if (!success) {
          window.$message?.error('Failed to delete listing');
          return;
        }
      } else {
        listingStore.deleteListing(id);
      }
      window.$message?.success('Listing deleted');
    },
    [listingStore, deleteCurrentListing]
  );
  // ============ Save Handlers ============

  const handleSaveTable = useCallback(async () => {
    if (!tableStore.currentTable) return;

    // Get user ID from somewhere - for now use a placeholder
    const userId = userInfo?.userId || 'system'; // TODO: Get from auth context

    const success = await saveCurrentTable(userId);
    if (success) {
      window.$message?.success('Table saved successfully');
      if (hasUnsavedStudyChanges) {
        applyStudyChanges();
      }
    } else {
      window.$message?.error('Failed to save table');
    }
  }, [saveCurrentTable, tableStore.currentTable, hasUnsavedStudyChanges, applyStudyChanges]);

  const handleSaveFigure = useCallback(async () => {
    if (!figureStore.currentFigure) return;
    const userId = userInfo?.userId || 'system';
    const success = await saveCurrentFigure(userId);
    if (success) {
      window.$message?.success('Figure saved successfully');
    } else {
      window.$message?.error('Failed to save figure');
    }
  }, [saveCurrentFigure, figureStore.currentFigure]);

  const handleSaveListing = useCallback(async () => {
    if (!listingStore.currentListing) return;
    const userId = userInfo?.userId || 'system';
    const success = await saveCurrentListing(userId);
    if (success) {
      window.$message?.success('Listing saved successfully');
    } else {
      window.$message?.error('Failed to save listing');
    }
  }, [saveCurrentListing, listingStore.currentListing]);



  // ============ Export ============

  const exportDocument = useMemo((): IARSDocument | null => {
    if (!studyStore.currentStudy) return null;
    const displays = [
      ...tableStore.tables.map((tbl) => ({
        id: tbl.id,
        name: tbl.title,
        type: 'Table' as const,
        displayType: 'table' as const,
        displayTitle: tbl.shellNumber,
        shellNumber: tbl.shellNumber,
        population: tbl.population,
        dataset: tbl.dataset,
        category: tbl.category,
        displaySections: [],
      })),
      ...figureStore.figures.map((fig) => ({
        id: fig.id,
        name: fig.title,
        type: 'Figure' as const,
        displayType: 'figure' as const,
        displayTitle: fig.figureNumber,
        population: fig.population,
        displaySections: [],
      })),
      ...listingStore.listings.map((lst) => ({
        id: lst.id,
        name: lst.title,
        type: 'Listing' as const,
        displayType: 'listing' as const,
        displayTitle: lst.listingNumber,
        population: lst.population,
        dataset: lst.dataset,
        displaySections: [],
      })),
    ];
    return {
      id: generateId('doc'),
      studyId: studyStore.currentStudy.studyId,
      studyInfo: {
        studyId: studyStore.currentStudy.studyId,
        studyTitle: studyStore.currentStudy.title,
        phase: [studyStore.currentStudy.phase],
        compoundUnderStudy: studyStore.currentStudy.compound,
        therapeuticArea: studyStore.currentStudy.therapeuticArea,
      },
      displays,
      outputs: [],
    };
  }, [studyStore.currentStudy, tableStore.tables, figureStore.figures, listingStore.listings]);

  // ============ Render: Table Editor ============

  const renderTableEditor = () => {
    if (!tableStore.currentTable) return null;
    const table = tableStore.currentTable;

    return (
      <div className="flex h-full flex-col gap-8px">
        {/* Breadcrumb header */}
        <div className="flex items-center justify-between">
          <Space>
            <Breadcrumb
              items={[
                { title: <Text type="secondary">{table.shellNumber}</Text> },
                { title: <Text strong>{table.title}</Text> },
              ]}
            />
            {tableStore.isDirty && (
              <Tag color="warning" className="ml-8px">
                <ExclamationCircleOutlined className="mr-4px" />
                Unsaved
              </Tag>
            )}
            {hasUnsavedStudyChanges && (
              <Tag color="orange" className="ml-4px">
                Study Settings Modified
              </Tag>
            )}
          </Space>
          <Space>
            <Button size="small" icon={<CopyOutlined />} onClick={handleDuplicateTable}>
              {t('page.mdr.tflDesigner.actions.duplicate')}
            </Button>
            <Popconfirm
              title={t('page.mdr.tflDesigner.actions.confirmDelete')}
              onConfirm={() => handleDeleteTable(table.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                {t('page.mdr.tflDesigner.actions.delete')}
              </Button>
            </Popconfirm>
            <Button size="small" icon={<UndoOutlined />} onClick={() => tableEditorRef.current?.undo()}>
              Undo
            </Button>
            <Button size="small" icon={<RedoOutlined />} onClick={() => tableEditorRef.current?.redo()}>
              Redo
            </Button>
            <Button
              size="small"
              icon={<SendOutlined />}
              style={{ color: '#722ed1', borderColor: '#722ed1' }}
              onClick={() => setPushToStudyOpen(true)}
            >
              Push to Study
            </Button>
            <Button 
              size="small" 
              type="primary" 
              icon={<SaveOutlined />}
              loading={tflSaving}
              onClick={handleSaveTable}
            >
              {t('page.mdr.tflDesigner.toolbar.save')}
            </Button>
          </Space>
        </div>

        {/* Side-by-side: Editor (left) + Live Preview (right) */}
        <div className="flex min-h-0 flex-1 gap-8px overflow-hidden">
          {/* Left: Editor Tabs */}
          <Card className="flex-shrink-0 overflow-auto" size="small" variant="borderless" style={{ width: editorPanelWidth }}>
            <Tabs
              activeKey={tableEditorTab}
              onChange={setTableEditorTab}
              type="card"
              size="small"
              tabBarStyle={{ marginBottom: 0 }}
              popupClassName="editor-tab-nav"
              items={[
                {
                  key: 'metadata',
                  label: t('page.mdr.tflDesigner.tabs.metadata'),
                  children: (
                    <div className="flex flex-col gap-12px">
                      <Card size="small" title={t('page.mdr.tflDesigner.tableMeta.basicInfo')}>
                        <div className="grid grid-cols-2 gap-8px">
                          <div>
                            <Text type="secondary" className="text-11px">Shell Number</Text>
                            <Input
                              className="mt-4px"
                              size="small"
                              value={table.shellNumber}
                              onChange={(e) => tableStore.updateMetadata({ shellNumber: e.target.value })}
                            />
                          </div>
                          <div>
                            <Text type="secondary" className="text-11px">Title</Text>
                            <Input
                              className="mt-4px"
                              size="small"
                              value={table.title}
                              onChange={(e) => tableStore.updateMetadata({ title: e.target.value })}
                            />
                          </div>
                          <div>
                            <Text type="secondary" className="text-11px">Population</Text>
                            <Select
                              className="mt-4px w-full"
                              size="small"
                              value={table.population}
                              onChange={(v) => tableStore.updateMetadata({ population: v })}
                              options={populationOptions}
                            />
                          </div>
                          <div>
                            <Text type="secondary" className="text-11px">Category</Text>
                            <Select
                              className="mt-4px w-full"
                              size="small"
                              value={table.category}
                              onChange={(v) => tableStore.updateMetadata({ category: v as any })}
                              options={categoryOptions}
                            />
                          </div>
                          <div>
                            <Text type="secondary" className="text-11px">Dataset</Text>
                            <Select
                              className="mt-4px w-full"
                              size="small"
                              value={table.dataset}
                              onChange={(v) => tableStore.updateMetadata({ dataset: v })}
                              options={datasetOptions}
                            />
                          </div>
                          <div>
                            <Text type="secondary" className="text-11px">Statistics Set</Text>
                            <Select
                              className="mt-4px w-full"
                              size="small"
                              value={table.statisticsSetId || undefined}
                              onChange={(v) => tableStore.updateMetadata({ statisticsSetId: v })}
                              options={statisticsSetOptions}
                              placeholder="Select statistics set"
                            />
                          </div>
                        </div>
                      </Card>
                      <Card size="small" title={t('page.mdr.tflDesigner.tableMeta.treatmentArms')}>
                        <ColumnSourceEditor />
                      </Card>
                      <Card size="small" title={t('page.mdr.tflDesigner.tableMeta.analysisFilter')}>
                        <div className="flex flex-col gap-8px">
                          <div>
                            <Text type="secondary" className="text-11px">{t('page.mdr.tflDesigner.tableMeta.whereClause')}</Text>
                            <Input.TextArea
                              className="mt-4px"
                              rows={2}
                              placeholder="e.g. AGE >= 18 AND SEX='M'"
                              value={table.whereClause || ''}
                              onChange={(e) => tableStore.updateMetadata({ whereClause: e.target.value || undefined })}
                            />
                          </div>
                          <div>
                            <Text type="secondary" className="text-11px">{t('page.mdr.tflDesigner.tableMeta.analysisSubset')}</Text>
                            <Input
                              className="mt-4px"
                              placeholder="e.g. Post-Baseline"
                              value={table.analysisSubset || ''}
                              onChange={(e) => tableStore.updateMetadata({ analysisSubset: e.target.value || undefined })}
                            />
                          </div>
                        </div>
                      </Card>
                    </div>
                  ),
                },
                {
                  key: 'rows',
                  label: (
                    <Space size={4}>
                      {t('page.mdr.tflDesigner.tabs.rowStructure')}
                      <Tag className="ml-4px">{table.rows.length}</Tag>
                    </Space>
                  ),
                  children: <NestedRowEditor />,
                },
                {
                  key: 'footer',
                  label: t('page.mdr.tflDesigner.tabs.footer'),
                  children: (
                    <div className="p-8px">
                      <div className="mb-8px">
                        <Text type="secondary" className="text-11px">Source Dataset</Text>
                        <Input
                          size="small"
                          value={table.footer.source || ''}
                          onChange={(e) => tableStore.updateMetadata({ footer: { ...table.footer, source: e.target.value || undefined } })}
                        />
                      </div>
                      <div>
                        <Text type="secondary" className="mb-4px block text-11px">Footnotes</Text>
                        {table.footer.notes?.length ? (
                          <ul className="list-inside list-disc space-y-2px text-12px">
                            {table.footer.notes.map((note, i) => (
                              <li key={i}>{note}</li>
                            ))}
                          </ul>
                        ) : (
                          <Text type="secondary" className="text-12px">No footnotes</Text>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'headerStyle',
                  label: 'Header Style',
                  children: (
                    <HeaderStyleSelector
                      value={headerFontStyle}
                      onChange={setHeaderFontStyle}
                    />
                  ),
                },
                {
                  key: 'programmingNotes',
                  label: t('page.mdr.tflDesigner.tabs.programmingNotes'),
                  children: (
                    <div className="p-8px">
                      <Input.TextArea
                        rows={8}
                        placeholder="e.g. Use ADaM dataset ADRS for overall survival. Hazard ratio from Cox model."
                        value={table.programmingNotes || ''}
                        onChange={(e) => tableStore.updateMetadata({ programmingNotes: e.target.value || undefined })}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'decimals',
                  label: 'Decimals',
                  children: <DecimalSettingsTab />,
                },
              ]}
            />
          </Card>

          {/* Resize handle — editor panel */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'editor')}
            style={{
              width: 4,
              cursor: 'col-resize',
              backgroundColor: isResizing && resizingTarget === 'editor' ? '#1890ff' : 'transparent',
              transition: 'background-color 0.15s',
              flexShrink: 0,
              zIndex: 10,
            }}
            onMouseEnter={(e) => { if (!isResizing) (e.currentTarget.style.backgroundColor = '#d9d9d9'); }}
            onMouseLeave={(e) => { if (!(isResizing && resizingTarget === 'editor')) (e.currentTarget.style.backgroundColor = 'transparent'); }}
          />

          {/* Right: Live Preview - Interactive */}
          <Card className="min-w-0 flex-1 overflow-auto" size="small" variant="borderless"
            title={<Text type="secondary" className="text-12px">Live Preview (Interactive)</Text>}
          >
            <InteractiveOutputEditor
              ref={tableEditorRef}
              template={convertTableToTemplate(tableStore.currentTable)}
              onTemplateChange={handleTableTemplateChange}
              editable={true}
              compact
              headerStyle={headerFontStyle}
              columnHeaders={activeArmHeaders}
              onColumnHeadersChange={handleColumnHeadersChange}
              decimalConfig={{
                shellDefaults: table.decimalOverride,
                studyDefaults: studyStore.studyDefaults?.decimalRules,
              }}
            />
          </Card>
        </div>
      </div>
    );
  };


  // ============ Render: Figure Editor ============

  const renderFigureEditor = () => {
    if (!figureStore.currentFigure) return null;
    const fig = figureStore.currentFigure;

    return (
      <div className="flex h-full flex-col gap-8px">
        {/* Breadcrumb header */}
        <div className="flex items-center justify-between">
          <Space>
            <Breadcrumb
              items={[
                { title: <Text type="secondary">{fig.figureNumber}</Text> },
                { title: <Text strong>{fig.title}</Text> },
              ]}
            />
            {figureStore.isDirty && (
              <Tag color="warning" className="ml-8px">
                <ExclamationCircleOutlined className="mr-4px" />
                Unsaved
              </Tag>
            )}
          </Space>
          <Space>
            <Popconfirm
              title={t('page.mdr.tflDesigner.actions.confirmDelete')}
              onConfirm={() => handleDeleteFigure(fig.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                {t('page.mdr.tflDesigner.actions.delete')}
              </Button>
            </Popconfirm>
            <Button 
              size="small" 
              type="primary" 
              icon={<SaveOutlined />}
              loading={tflSaving}
              onClick={handleSaveFigure}
            >
              {t('page.mdr.tflDesigner.toolbar.save')}
            </Button>
          </Space>
        </div>

        {/* Side-by-side: Editor (left) + Live Preview (right) */}
        <div className="flex min-h-0 flex-1 gap-8px overflow-hidden">
          {/* Left: Editor Tabs */}
          <Card className="flex-shrink-0 overflow-auto" size="small" variant="borderless" style={{ width: editorPanelWidth }}>
            <Tabs
              activeKey={figureEditorTab}
              onChange={setFigureEditorTab}
              type="card"
              size="small"
              tabBarStyle={{ marginBottom: 0 }}
              popupClassName="editor-tab-nav"
              items={[
                {
                  key: 'metadata',
                  label: t('page.mdr.tflDesigner.tabs.metadata'),
                  children: (
                    <div className="flex flex-col gap-12px">
                      <Card size="small" title={t('page.mdr.tflDesigner.figureMeta.basicInfo')}>
                        <div className="grid grid-cols-2 gap-8px">
                          <div>
                            <Text type="secondary" className="text-11px">Figure Number</Text>
                            <Input
                              className="mt-4px"
                              size="small"
                              value={fig.figureNumber}
                              onChange={(e) => figureStore.updateMetadata({ figureNumber: e.target.value })}
                            />
                          </div>
                          <div>
                            <Text type="secondary" className="text-11px">Title</Text>
                            <Input
                              className="mt-4px"
                              size="small"
                              value={fig.title}
                              onChange={(e) => figureStore.updateMetadata({ title: e.target.value })}
                            />
                          </div>
                          <div>
                            <Text type="secondary" className="text-11px">Population</Text>
                            <Select
                              className="mt-4px w-full"
                              size="small"
                              value={fig.population}
                              onChange={(v) => figureStore.updateMetadata({ population: v })}
                              options={populationOptions}
                            />
                          </div>
                        </div>
                      </Card>
                      <Card size="small" title={t('page.mdr.tflDesigner.figureMeta.chartType')}>
                        <ChartTypeSelector value={fig.chartType} onChange={figureStore.setChartType} />
                      </Card>
                    </div>
                  ),
                },
                {
                  key: 'axes',
                  label: t('page.mdr.tflDesigner.tabs.axes'),
                  children: (
                    <AxesConfig
                      xAxis={fig.xAxis}
                      yAxis={fig.yAxis}
                      onXAxisChange={figureStore.updateXAxis}
                      onYAxisChange={figureStore.updateYAxis}
                    />
                  ),
                },
                {
                  key: 'series',
                  label: (
                    <Space size={4}>
                      {t('page.mdr.tflDesigner.tabs.series')}
                      <Tag className="ml-4px">{fig.series.length}</Tag>
                    </Space>
                  ),
                  children: (
                    <SeriesConfig
                      series={fig.series}
                      chartType={fig.chartType}
                      onAdd={() => figureStore.addSeries()}
                      onUpdate={(id, updates) => figureStore.updateSeries(id, updates)}
                      onDelete={(id) => figureStore.removeSeries(id)}
                      onReorder={(from, to) => figureStore.reorderSeries(from, to)}
                    />
                  ),
                },
                {
                  key: 'programmingNotes',
                  label: t('page.mdr.tflDesigner.tabs.programmingNotes'),
                  children: (
                    <div className="p-8px">
                      <Input.TextArea
                        rows={8}
                        placeholder="e.g. KM curve using survfit(Surv(time, status) ~ arm). Log-rank p-value at alpha=0.05."
                        value={fig.programmingNotes || ''}
                        onChange={(e) => figureStore.updateMetadata({ programmingNotes: e.target.value })}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          {/* Resize handle — editor panel */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'editor')}
            style={{
              width: 4,
              cursor: 'col-resize',
              backgroundColor: isResizing && resizingTarget === 'editor' ? '#1890ff' : 'transparent',
              transition: 'background-color 0.15s',
              flexShrink: 0,
              zIndex: 10,
            }}
            onMouseEnter={(e) => { if (!isResizing) (e.currentTarget.style.backgroundColor = '#d9d9d9'); }}
            onMouseLeave={(e) => { if (!(isResizing && resizingTarget === 'editor')) (e.currentTarget.style.backgroundColor = 'transparent'); }}
          />

          {/* Right: Live Preview - ECharts */}
          <Card className="min-w-0 flex-1 overflow-auto" size="small" variant="borderless"
            title={<Text type="secondary" className="text-12px">Live Preview (Chart)</Text>}
          >
            <FigurePreview
              config={{
                chartType: fig.chartType,
                xAxis: fig.xAxis,
                yAxis: fig.yAxis,
                series: fig.series,
                title: fig.title,
                legend: fig.legend,
                style: fig.style,
              }}
              onStyleChange={(style) => figureStore.updateStyle(style)}
            />
          </Card>
        </div>
      </div>
    );
  };

  // ============ Render: Listing Editor ============

  const renderListingEditor = () => {
    if (!listingStore.currentListing) return null;
    const lst = listingStore.currentListing;

    return (
      <div className="flex h-full flex-col gap-8px">
        {/* Breadcrumb header */}
        <div className="flex items-center justify-between">
          <Space>
            <Breadcrumb
              items={[
                { title: <Text type="secondary">{lst.listingNumber}</Text> },
                { title: <Text strong>{lst.title}</Text> },
              ]}
            />
            {listingStore.isDirty && (
              <Tag color="warning" className="ml-8px">
                <ExclamationCircleOutlined className="mr-4px" />
                Unsaved
              </Tag>
            )}
          </Space>
          <Space>
            <Popconfirm
              title={t('page.mdr.tflDesigner.actions.confirmDelete')}
              onConfirm={() => handleDeleteListing(lst.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                {t('page.mdr.tflDesigner.actions.delete')}
              </Button>
            </Popconfirm>
            <Button size="small" icon={<UndoOutlined />} onClick={() => listingEditorRef.current?.undo()}>
              Undo
            </Button>
            <Button size="small" icon={<RedoOutlined />} onClick={() => listingEditorRef.current?.redo()}>
              Redo
            </Button>
            <Button 
              size="small" 
              type="primary" 
              icon={<SaveOutlined />}
              loading={tflSaving}
              onClick={handleSaveListing}
            >
              {t('page.mdr.tflDesigner.toolbar.save')}
            </Button>
          </Space>
        </div>

        {/* Side-by-side: Editor (left) + Live Preview (right) */}
        <div className="flex min-h-0 flex-1 gap-8px overflow-hidden">
          {/* Left: Editor Tabs */}
          <Card className="flex-shrink-0 overflow-auto" size="small" variant="borderless" style={{ width: editorPanelWidth }}>
            <Tabs
              activeKey={listingEditorTab}
              onChange={setListingEditorTab}
              type="card"
              size="small"
              tabBarStyle={{ marginBottom: 0 }}
              popupClassName="editor-tab-nav"
              items={[
                {
                  key: 'metadata',
                  label: t('page.mdr.tflDesigner.tabs.metadata'),
                  children: (
                    <div className="flex flex-col gap-12px">
                      <Card size="small" title={t('page.mdr.tflDesigner.listingMeta.basicInfo')}>
                        <div className="grid grid-cols-2 gap-12px">
                          <div>
                            <Text type="secondary" className="text-12px">
                              Listing Number
                            </Text>
                            <Input
                              className="mt-4px"
                              size="small"
                              value={lst.listingNumber}
                              onChange={(e) => listingStore.updateMetadata({ listingNumber: e.target.value })}
                            />
                          </div>
                          <div>
                            <Text type="secondary" className="text-12px">
                              Title
                            </Text>
                            <Input
                              className="mt-4px"
                              size="small"
                              value={lst.title}
                              onChange={(e) => listingStore.updateMetadata({ title: e.target.value })}
                            />
                          </div>
                          <div>
                            <Text type="secondary" className="text-12px">
                              Population
                            </Text>
                            <Select
                              className="mt-4px w-full"
                              size="small"
                              value={lst.population}
                              onChange={(v) => listingStore.updateMetadata({ population: v })}
                              options={populationOptions}
                            />
                          </div>
                          <div>
                            <Text type="secondary" className="text-12px">
                              Dataset
                            </Text>
                            <Select
                              className="mt-4px w-full"
                              size="small"
                              value={lst.dataset}
                              onChange={(v) => listingStore.updateMetadata({ dataset: v })}
                              options={datasetOptions}
                            />
                          </div>
                          <div>
                            <Text type="secondary" className="text-12px">
                              Page Size
                            </Text>
                            <InputNumber
                              className="mt-4px w-full"
                              size="small"
                              min={5}
                              max={200}
                              value={lst.pageSize || 20}
                              onChange={(v) => listingStore.updateMetadata({ pageSize: v || 20 })}
                            />
                          </div>
                        </div>
                      </Card>
                      <Card size="small" title={t('page.mdr.tflDesigner.listingMeta.analysisFilter')}>
                        <div className="flex flex-col gap-8px">
                          <div>
                            <Text type="secondary" className="text-11px">{t('page.mdr.tflDesigner.listingMeta.whereClause')}</Text>
                            <Input.TextArea
                              className="mt-4px"
                              rows={2}
                              placeholder="e.g. AGE >= 18"
                              value={lst.whereClause || ''}
                              onChange={(e) => listingStore.updateMetadata({ whereClause: e.target.value || undefined })}
                            />
                          </div>
                          <div>
                            <Text type="secondary" className="text-11px">{t('page.mdr.tflDesigner.listingMeta.analysisSubset')}</Text>
                            <Input
                              className="mt-4px"
                              placeholder="e.g. Safety Subjects with TEAE"
                              value={lst.analysisSubset || ''}
                              onChange={(e) => listingStore.updateMetadata({ analysisSubset: e.target.value || undefined })}
                            />
                          </div>
                        </div>
                      </Card>
                    </div>
                  ),
                },
                {
                  key: 'columns',
                  label: (
                    <Space size={4}>
                      {t('page.mdr.tflDesigner.tabs.columns')}
                      <Tag className="ml-4px">{lst.columns.length}</Tag>
                    </Space>
                  ),
                  children: (
                    <ColumnEditor
                      displayId={lst.id}
                      columns={lst.columns}
                      onChange={(cols) => listingStore.updateColumns(cols)}
                    />
                  ),
                },
                {
                  key: 'sort',
                  label: (
                    <Space size={4}>
                      {t('page.mdr.tflDesigner.tabs.sortOrder')}
                      <Tag className="ml-4px">{lst.sortBy?.length || 0}</Tag>
                    </Space>
                  ),
                  children: (
                    <SortConfigEditor
                      displayId={lst.id}
                      sortRules={lst.sortBy || []}
                      columns={lst.columns.map((c) => ({ id: c.id, name: c.name, label: c.label }))}
                      onAdd={() => listingStore.addSort()}
                      onUpdate={(index, updates) => listingStore.updateSort(index, updates)}
                      onReorder={(from, to) => listingStore.reorderSort(from, to)}
                      onDelete={(index) => listingStore.deleteSort(index)}
                    />
                  ),
                },
                {
                  key: 'filter',
                  label: (
                    <Space size={4}>
                      {t('page.mdr.tflDesigner.tabs.filter')}
                      <Tag className="ml-4px">{lst.filter?.length || 0}</Tag>
                    </Space>
                  ),
                  children: (
                    <FilterConfigEditor
                      displayId={lst.id}
                      filters={lst.filter || []}
                      columns={lst.columns.map((c) => ({ id: c.id, name: c.name, label: c.label }))}
                      onAdd={() => listingStore.addFilter()}
                      onUpdate={(index, updates) => listingStore.updateFilter(index, updates)}
                      onDelete={(index) => listingStore.deleteFilter(index)}
                    />
                  ),
                },
                {
                  key: 'programmingNotes',
                  label: t('page.mdr.tflDesigner.tabs.programmingNotes'),
                  children: (
                    <div className="p-8px">
                      <Input.TextArea
                        rows={8}
                        placeholder="e.g. Include only subjects with at least one post-baseline lab value. Sort by visit date."
                        value={lst.programmingNotes || ''}
                        onChange={(e) => listingStore.updateMetadata({ programmingNotes: e.target.value || undefined })}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          {/* Resize handle — editor panel */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'editor')}
            style={{
              width: 4,
              cursor: 'col-resize',
              backgroundColor: isResizing && resizingTarget === 'editor' ? '#1890ff' : 'transparent',
              transition: 'background-color 0.15s',
              flexShrink: 0,
              zIndex: 10,
            }}
            onMouseEnter={(e) => { if (!isResizing) (e.currentTarget.style.backgroundColor = '#d9d9d9'); }}
            onMouseLeave={(e) => { if (!(isResizing && resizingTarget === 'editor')) (e.currentTarget.style.backgroundColor = 'transparent'); }}
          />

          {/* Right: Live Preview - Interactive */}
          <Card className="min-w-0 flex-1 overflow-auto" size="small" variant="borderless"
            title={<Text type="secondary" className="text-12px">Live Preview (Interactive)</Text>}
          >
            <InteractiveOutputEditor
              ref={listingEditorRef}
              template={convertListingToTemplate(lst)}
              onTemplateChange={handleListingTemplateChange}
              editable={true}
              compact
              headerStyle={headerFontStyle}
            />
          </Card>
        </div>
      </div>
    );
  };

  // ============ Render: Study Overview (no selection) ============

  const renderStudyOverview = () => {
    const tableCount = tableStore.tables.length;
    const figureCount = figureStore.figures.length;
    const listingCount = listingStore.listings.length;
    const totalCount = tableCount + figureCount + listingCount;

    return (
      <div className="flex h-full flex-col overflow-y-auto p-16px gap-16px">
        {/* Summary cards row */}
        <div className="grid grid-cols-3 gap-12px flex-shrink-0">
          <div className="rounded-lg border border-gray-200 p-12px text-center transition-shadow hover:shadow-sm">
            <TableOutlined className="text-20px text-blue-500 mb-4px" />
            <div className="text-20px font-semibold text-gray-800">{tableCount}</div>
            <div className="text-11px text-gray-500">Tables</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-12px text-center transition-shadow hover:shadow-sm">
            <BarChartOutlined className="text-20px text-green-500 mb-4px" />
            <div className="text-20px font-semibold text-gray-800">{figureCount}</div>
            <div className="text-11px text-gray-500">Figures</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-12px text-center transition-shadow hover:shadow-sm">
            <UnorderedListOutlined className="text-20px text-orange-500 mb-4px" />
            <div className="text-20px font-semibold text-gray-800">{listingCount}</div>
            <div className="text-11px text-gray-500">Listings</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-between flex-shrink-0">
          <Text type="secondary" className="text-12px">
            {t('page.mdr.tflDesigner.overview.selectOrCreate')}
          </Text>
          <Space size="small">
            <Button size="small" icon={<PlusOutlined />} onClick={() => setTemplateModalOpen(true)}>
              {t('page.mdr.tflDesigner.actions.fromTemplate')}
            </Button>
            {totalCount > 0 && (
              <Button size="small" icon={<ExportOutlined />} onClick={() => setExportModalOpen(true)}>
                {t('page.mdr.tflDesigner.toolbar.export')}
              </Button>
            )}
          </Space>
        </div>

        {/* ======= Global Study Management ======= */}
        <div className="flex flex-col gap-12px min-w-0">
          <div className="flex items-center gap-8px">
            <SettingOutlined className="text-gray-400" />
            <span className="text-13px font-medium text-gray-600">Study Configuration</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <PopulationManager />
          <TreatmentArmEditor />
          <StatisticsSetManager />
        </div>
      </div>
    );
  };

  // ============ Main Layout ============

  return (
    <div className="h-full flex flex-col gap-8px overflow-hidden">
      {/* Global style for editor tab nav horizontal scroll */}
      <style>{`
        .editor-tab-nav .ant-tabs-nav {
          overflow-x: auto !important;
          overflow-y: hidden !important;
          scrollbar-width: thin;
        }
        .editor-tab-nav .ant-tabs-nav::-webkit-scrollbar {
          height: 4px;
        }
        .editor-tab-nav .ant-tabs-nav::-webkit-scrollbar-thumb {
          background-color: #d9d9d9;
          border-radius: 2px;
        }
        .editor-tab-nav .ant-tabs-nav-list {
          flex-wrap: nowrap !important;
        }
      `}</style>
      {/* Context not ready — show only the prompt, no shell content */}
      {!isReady && (
        <div className="flex flex-1 items-center justify-center">
          <Empty
            description={
              <Space direction="vertical" align="center" size={8}>
                <Text type="secondary" className="text-14px">
                  {t('page.mdr.tflDesigner.context.selectAnalysisForTfl')}
                </Text>
                <Text type="secondary" className="text-12px">
                  Select a study and analysis from the global context above to start designing outputs.
                </Text>
              </Space>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      )}

      {/* Only render workspace when context is ready */}
      {isReady && (
        <>
      {/* Toolbar */}
      <Card className="card-wrapper flex-shrink-0" size="small" variant="borderless" styles={{ body: { padding: '6px 16px', borderBottom: '1px solid #f0f0f0' } }}>
        <div className="flex items-center justify-between">
          <Space size="small">
            <AppstoreOutlined className="text-16px text-blue-600" />
            <Title className="m-0" level={5} style={{ fontSize: 15 }}>
              TFL Designer
            </Title>
          </Space>
          <Space>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'newTable',
                    icon: <TableOutlined />,
                    label: t('page.mdr.tflDesigner.actions.newTable'),
                    onClick: handleNewTable,
                  },
                  {
                    key: 'newFigure',
                    icon: <BarChartOutlined />,
                    label: t('page.mdr.tflDesigner.actions.newFigure'),
                    onClick: handleNewFigure,
                  },
                  {
                    key: 'newListing',
                    icon: <UnorderedListOutlined />,
                    label: t('page.mdr.tflDesigner.actions.newListing'),
                    onClick: handleNewListing,
                  },
                  { type: 'divider' },
                  {
                    key: 'fromTemplate',
                    icon: <FileTextOutlined />,
                    label: t('page.mdr.tflDesigner.actions.fromTemplate'),
                    onClick: () => setTemplatePickerOpen(true),
                  },
                ],
              }}
            >
              <Button icon={<PlusOutlined />} type="primary">
                {t('page.mdr.tflDesigner.toolbar.newShell')}
              </Button>
            </Dropdown>
            <Button icon={<ExportOutlined />} onClick={() => setExportModalOpen(true)}>
              {t('page.mdr.tflDesigner.toolbar.export')}
            </Button>
          </Space>
        </div>
      </Card>

      

      {/* Loading and Error States */}
      {tflLoading && (
        <div className="flex items-center justify-center py-16px">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <Text type="secondary" className="ml-8px">Loading TFL data...</Text>
        </div>
      )}
      {tflError && (
        <Alert 
          type="error" 
          message="Failed to load TFL data" 
          description={tflError}
          showIcon
          action={
            <Button size="small" onClick={refreshTFLData}>
              Retry
            </Button>
          }
          className="mx-16px"
        />
      )}

      {/* Main content: Left sidebar + Center editor */}
      <div className="min-h-0 flex flex-1 overflow-hidden">
        {/* Left sidebar - Outputs Tree (resizable) */}
        <Card
          className="flex flex-shrink-0 flex-col overflow-hidden card-wrapper"
          style={{ width: sidebarWidth }}
          size="small"
          variant="borderless"
        >
          {/* Study Settings button */}
          <div className="mb-8px">
            <Tooltip title={t('page.mdr.tflDesigner.sidebar.studySettings')}>
              <Button
                block
                size="small"
                icon={<SettingOutlined />}
                type={sidebarView === 'settings' ? 'primary' : 'default'}
                ghost={sidebarView === 'settings'}
                onClick={() => {
                  if (sidebarView === 'settings') {
                    setSidebarView('items');
                  } else {
                    handleShowStudySettings();
                  }
                }}
              >
                {t('page.mdr.tflDesigner.sidebar.studySettings')}
              </Button>
            </Tooltip>
          </div>

          {/* Filter tabs — only show in items view */}
          {sidebarView !== 'settings' && (
            <Segmented
              block
              size="small"
              value={sidebarFilter}
              options={[
                { label: `All ${typeCounts.table + typeCounts.figure + typeCounts.listing}`, value: 'all' },
                { label: <Space size={2}>T<sup>{typeCounts.table}</sup></Space>, value: 'table' },
                { label: <Space size={2}>F<sup>{typeCounts.figure}</sup></Space>, value: 'figure' },
                { label: <Space size={2}>L<sup>{typeCounts.listing}</sup></Space>, value: 'listing' },
              ]}
              onChange={(v) => setSidebarFilter(v as SidebarFilter)}
            />
          )}

          {/* Items list or Study Settings view */}
          <div className="flex-1 overflow-auto">
            {sidebarView === 'settings' ? (
              <div className="flex flex-col gap-2px pt-4px">
                {/* Study settings vertical tabs */}
                {[
                  { key: 'population', icon: <TeamOutlined />, label: t('page.mdr.tflDesigner.tabs.population') },
                  { key: 'treatmentArms', icon: <ColumnWidthOutlined />, label: t('page.mdr.tflDesigner.tabs.treatmentArms') },
                  { key: 'columnLayout', icon: <LayoutOutlined />, label: 'Column Layout' },
                  { key: 'headerStyle', icon: <BgColorsOutlined />, label: 'Header Style' },
                  { key: 'statistics', icon: <BarChartOutlined />, label: t('page.mdr.tflDesigner.tabs.statistics') },
                  { key: 'decimalDefaults', icon: <NumberOutlined />, label: 'Decimal Defaults' },
                  { key: 'shellTemplates', icon: <FileTextOutlined />, label: 'Shell Templates' },
                ].map(tab => (
                  <div
                    key={tab.key}
                    className={`flex cursor-pointer items-center gap-6px rounded px-8px py-6px transition-colors ${
                      studySettingsTab === tab.key ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-600'
                    }`}
                    onClick={() => setStudySettingsTab(tab.key)}
                  >
                    {tab.icon}
                    <span className="text-13px">{tab.label}</span>
                  </div>
                ))}
                {/* Back to Outputs */}
                <div
                  className="cursor-pointer rounded px-8px py-4px transition-colors hover:bg-gray-50"
                  onClick={() => setSidebarView('items')}
                >
                  <Space size={6}>
                    <AppstoreOutlined className="text-blue-500" />
                    <span className="text-13px">{t('page.mdr.tflDesigner.sidebar.studySettingsBack')}</span>
                  </Space>
                </div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32px">
                <Text type="secondary" className="text-12px">
                  {t('page.mdr.tflDesigner.sidebar.empty')}
                </Text>
              </div>
            ) : (
              <div className="flex flex-col gap-2px pt-8px">
                {filteredItems.map((item) => {
                  const isActive =
                    (item.type === 'table' && tableStore.currentTable?.id === item.id) ||
                    (item.type === 'figure' && figureStore.currentFigure?.id === item.id) ||
                    (item.type === 'listing' && listingStore.currentListing?.id === item.id);

                  const typeColor = item.type === 'table' ? '#1890ff' : item.type === 'figure' ? '#52c41a' : '#fa8c16';
                  const icon =
                    item.type === 'table' ? (
                      <TableOutlined style={{ color: isActive ? typeColor : undefined }} />
                    ) : item.type === 'figure' ? (
                      <BarChartOutlined style={{ color: isActive ? typeColor : undefined }} />
                    ) : (
                      <UnorderedListOutlined style={{ color: isActive ? typeColor : undefined }} />
                    );

                  return (
                    <div
                      key={item.id}
                      className={`flex cursor-pointer items-center justify-between rounded-md px-8px py-5px transition-all duration-150 ${
                        isActive ? 'bg-blue-50 shadow-sm' : 'hover:bg-gray-50'
                      }`}
                      style={isActive ? { borderLeft: `3px solid ${typeColor}`, paddingLeft: 5 } : { borderLeft: '3px solid transparent', paddingLeft: 5 }}
                      onClick={() => handleSelectItem(item)}
                    >
                      <Space size={6}>
                        {icon}
                        <span className="text-13px leading-tight">
                          <Text type="secondary" className="text-10px mr-4px block">{item.number}</Text>
                          <span className={isActive ? 'text-gray-900 font-medium' : 'text-gray-700'}>{item.name}</span>
                        </span>
                      </Space>
                      <Space size={2}>
                        {item.category && (
                          <Tag className="m-0 text-10px" color="green">
                            {item.category.replace(/_/g, ' ')}
                          </Tag>
                        )}
                      </Space>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Resize handle — sidebar */}
        <div
          onMouseDown={(e) => handleResizeStart(e, 'sidebar')}
          style={{
            width: 4,
            cursor: 'col-resize',
            backgroundColor: isResizing ? '#1890ff' : 'transparent',
            transition: 'background-color 0.15s',
            flexShrink: 0,
            zIndex: 10,
          }}
          onMouseEnter={(e) => { if (!isResizing) (e.currentTarget.style.backgroundColor = '#d9d9d9'); }}
          onMouseLeave={(e) => { if (!isResizing) (e.currentTarget.style.backgroundColor = 'transparent'); }}
        />

        {/* Center - Editor area */}
        <Card className="min-w-0 flex flex-1 flex-col overflow-hidden card-wrapper" size="small" variant="borderless">
          {sidebarView === 'settings' && !tableStore.currentTable && !figureStore.currentFigure && !listingStore.currentListing ? (
            <div className="h-full overflow-y-auto p-12px">
              {studySettingsTab === 'population' && <PopulationManager />}
              {studySettingsTab === 'treatmentArms' && <TreatmentArmEditor />}
              {studySettingsTab === 'columnLayout' && <ColumnHeaderSetEditor />}
              {studySettingsTab === 'headerStyle' && <HeaderStyleSelector value={headerFontStyle} onChange={setHeaderFontStyle} />}
              {studySettingsTab === 'statistics' && <StatisticsSetManager />}
              {studySettingsTab === 'decimalDefaults' && <DecimalDefaultsEditor />}
              {studySettingsTab === 'shellTemplates' && <StudyTemplateLibrary />}
            </div>
          ) : tableStore.currentTable
            ? renderTableEditor()
            : figureStore.currentFigure
              ? renderFigureEditor()
              : listingStore.currentListing
                ? renderListingEditor()
                : renderStudyOverview()}
        </Card>
      </div>

      {/* Template Selector Modal */}
        </>
      )}
      <TemplateSelector open={templateModalOpen} onClose={() => setTemplateModalOpen(false)} />

      {/* Export Modal */}
      <ExportModal open={exportModalOpen} onClose={() => setExportModalOpen(false)} document={exportDocument} />

      {/* Template Picker from Study Templates */}
      <TemplatePickerModal open={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} />

      {/* Push to Study PR Modal */}
      <PushToStudyModal open={pushToStudyOpen} onClose={() => setPushToStudyOpen(false)} />
    </div>
  );
};

export default TflDesigner;
