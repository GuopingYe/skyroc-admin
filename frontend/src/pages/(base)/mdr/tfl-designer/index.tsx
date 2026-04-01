/**
 * TFL Designer - Main Page
 *
 * Implements the POC's tabbed editor pattern:
 *
 * - Left sidebar: Outputs tree with filter tabs (All/Tables/Figures/Listings)
 * - Center: Tabbed editor (Table/Figure/Listing) based on selected output type
 * - Study overview when nothing is selected
 * - Integration with all Zustand stores and ported components
 *
 * Uses Zustand + Immer for independent state management (frontend-arch rule).
 */
import {
  AppstoreOutlined,
  BarChartOutlined,
  BgColorsOutlined,
  ColumnWidthOutlined,
  CopyOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  FileTextOutlined,
  FilterOutlined,
  LayoutOutlined,
  LoadingOutlined,
  NumberOutlined,
  PlusOutlined,
  RedoOutlined,
  ReloadOutlined,
  SaveOutlined,
  SendOutlined,
  SettingOutlined,
  TableOutlined,
  TeamOutlined,
  UndoOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Dropdown,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useClinicalContext } from '@/features/clinical-context';
import {
  AxesConfig,
  ChartTypeSelector,
  ColumnSourceEditor,
  DEFAULT_HEADER_FONT_STYLE,
  DecimalDefaultsEditor,
  DecimalSettingsTab,
  ExportModal,
  FigurePreview,
  FilterConfigEditor,
  HeaderEditor,
  HeaderStyleSelector,
  InteractiveOutputEditor,
  ListingPreview,
  NestedRowEditor,
  PopulationManager,
  PushToStudyModal,
  SeriesConfig,
  SortConfigEditor,
  StatisticsSetManager,
  StudyShellLibrary,
  TablePreview,
  TemplatePickerModal,
  TemplateSelector,
  TreatmentArmEditor,
  categoryOptions,
  createNewFigure,
  datasetOptions,
  generateId,
  getTemplatesByType,
  searchTemplates,
  useFigureStore,
  useListingStore,
  useStudyStore,
  useTFLDesignerData,
  useTableStore
} from '@/features/tfl-designer';
import type {
  ColumnHeaderGroup,
  FigureShell,
  IARSDocument,
  InteractiveOutputEditorRef,
  ListingShell,
  TableShell,
  Template
} from '@/features/tfl-designer';
import { useUserInfo } from '@/service/hooks';

const { Text, Title } = Typography;

// ==================== Route handle ====================

export const handle = {
  i18nKey: 'route.(base)_mdr_tfl-designer',
  icon: 'mdi:table-large',
  order: 5,
  title: 'TFL Designer'
};

// ==================== Sidebar Filter Tabs ====================

type SidebarFilter = 'all' | 'figure' | 'listing' | 'table';

type SidebarView = 'items' | 'settings';

// ==================== Main Component ====================

const TflDesigner: React.FC = () => {
  const { t } = useTranslation();
  const { isAnalysisReady, isReady, isStudyReady } = useClinicalContext();

  // Get current user for audit trail
  const { data: userInfo } = useUserInfo();
  // Backend data integration
  const {
    deleteCurrentFigure,
    deleteCurrentListing,
    deleteCurrentTable,
    error: tflError,
    loading: tflLoading,
    refresh: refreshTFLData,
    saveCurrentFigure,
    saveCurrentListing,
    saveCurrentTable,
    saving: tflSaving
  } = useTFLDesignerData();

  // Zustand stores
  const studyStore = useStudyStore();
  const tableStore = useTableStore();
  const figureStore = useFigureStore();
  const listingStore = useListingStore();

  // Population options from study store (dynamic, data-driven)
  const populationSets = useStudyStore(s => s.populationSets);
  const populationOptions = useMemo(
    () => populationSets.map(p => ({ label: p.name, value: p.name })),
    [populationSets]
  );

  // Statistics Set options from study store (for metadata dropdown)
  const statisticsSets = useStudyStore(s => s.statisticsSets);
  const statisticsSetOptions = useMemo(
    () => statisticsSets.map(s => ({ label: s.name, value: s.id })),
    [statisticsSets]
  );

  // Study defaults (decimal rules, header style, etc.)
  const studyDefaults = useStudyStore(s => s.studyDefaults);
  const updateHeaderStyle = useStudyStore(s => s.updateHeaderStyle);
  const headerFontStyle = studyDefaults?.headerStyle ?? DEFAULT_HEADER_FONT_STYLE;

  // Column headers from the currently selected treatment arm set
  const treatmentArmSets = useStudyStore(s => s.treatmentArmSets);
  const updateTreatmentArmSet = useStudyStore(s => s.updateTreatmentArmSet);

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
  const handleColumnHeadersChange = useCallback(
    (newHeaders: ColumnHeaderGroup[]) => {
      const tasId = tableStore.currentTable?.treatmentArmSetId;
      if (!tasId) return;
      setLocalColumnHeaders(prev => ({ ...prev, [tasId]: newHeaders }));
    },
    [tableStore.currentTable?.treatmentArmSetId]
  );

  // Check if there are unsaved study-level changes
  const hasUnsavedStudyChanges = Object.keys(localColumnHeaders).length > 0;

  // Find outputs that share the same treatment arm set (to warn user on save)
  const affectedOutputs = useMemo(() => {
    if (!hasUnsavedStudyChanges) return 0;
    const tasId = tableStore.currentTable?.treatmentArmSetId;
    if (!tasId) return 0;
    return tableStore.tables.filter(t => t.treatmentArmSetId === tasId && t.id !== tableStore.currentTable?.id).length;
  }, [
    hasUnsavedStudyChanges,
    tableStore.currentTable?.treatmentArmSetId,
    tableStore.currentTable?.id,
    tableStore.tables
  ]);

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
  const [studySettingsTab, setStudySettingsTab] = useState('tableHeaders');

  // Study settings tabs configuration (shared between two views)
  const studySettingsTabs = useMemo(
    () => [
      { icon: <ColumnWidthOutlined />, key: 'tableHeaders', label: 'Table Headers' },
      { icon: <TeamOutlined />, key: 'populations', label: t('page.mdr.tflDesigner.tabs.population') },
      { icon: <FileTextOutlined />, key: 'shellTemplates', label: 'Shell Templates' },
      { icon: <BgColorsOutlined />, key: 'headerFormatting', label: 'Header Formatting' },
      { icon: <BarChartOutlined />, key: 'statistics', label: t('page.mdr.tflDesigner.tabs.statistics') }
    ],
    [t]
  );

  // Render study settings content based on active tab
  const renderStudySettingsContent = useCallback(() => {
    switch (studySettingsTab) {
      case 'tableHeaders':
        return <TreatmentArmEditor />;
      case 'populations':
        return <PopulationManager />;
      case 'shellTemplates':
        return <StudyShellLibrary />;
      case 'headerFormatting':
        return (
          <HeaderStyleSelector
            value={headerFontStyle}
            onChange={updateHeaderStyle}
          />
        );
      case 'statistics':
        return <StatisticsSetManager />;
      default:
        return null;
    }
  }, [studySettingsTab, headerFontStyle, updateHeaderStyle]);

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
  const [resizingTarget, setResizingTarget] = useState<'editor' | 'sidebar'>('sidebar');

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, target: 'editor' | 'sidebar') => {
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
    [sidebarWidth, editorPanelWidth]
  );

  // ============ Derived state ============

  const hasSelection = Boolean(tableStore.currentTable || figureStore.currentFigure || listingStore.currentListing);

  // ============ Helper functions to convert store state to Template ============

  const convertTableToTemplate = useCallback((table: TableShell | null): Template | null => {
    if (!table) return null;
    return {
      category: table.category || 'Other',
      createdAt: new Date().toISOString().split('T')[0],
      description: '',
      id: table.id,
      name: table.title || 'Untitled Table',
      shell: table,
      type: 'table'
    };
  }, []);

  const convertFigureToTemplate = useCallback((figure: FigureShell | null): Template | null => {
    if (!figure) return null;
    return {
      category: 'Other',
      createdAt: new Date().toISOString().split('T')[0],
      // Figure doesn't have category, use default
      description: '',
      id: figure.id,
      name: figure.title || 'Untitled Figure',
      shell: figure,
      type: 'figure'
    };
  }, []);

  const convertListingToTemplate = useCallback((listing: ListingShell | null): Template | null => {
    if (!listing) return null;
    return {
      category: 'Other',
      createdAt: new Date().toISOString().split('T')[0],
      // Listing doesn't have category, use default
      description: '',
      id: listing.id,
      name: listing.title || 'Untitled Listing',
      shell: listing,
      type: 'listing'
    };
  }, []);

  // Handle template changes from InteractiveOutputEditor
  const handleTableTemplateChange = useCallback(
    (template: Template) => {
      if (template.type === 'table' && tableStore.currentTable) {
        // Spread all shell properties to preserve custom fields (extraTitleLines, rowLabel, etc.)
        tableStore.updateMetadata({ ...(template.shell as TableShell) });
      }
    },
    [tableStore]
  );

  const handleFigureTemplateChange = useCallback(
    (template: Template) => {
      if (template.type === 'figure' && figureStore.currentFigure) {
        figureStore.updateMetadata({ ...(template.shell as FigureShell) });
      }
    },
    [figureStore]
  );

  const handleListingTemplateChange = useCallback(
    (template: Template) => {
      if (template.type === 'listing' && listingStore.currentListing) {
        listingStore.updateMetadata({ ...(template.shell as ListingShell) });
      }
    },
    [listingStore]
  );

  // Build sidebar items from all stores
  const sidebarItems = useMemo(() => {
    const items: Array<{
      category: string;
      id: string;
      name: string;
      number: string;
      type: 'figure' | 'listing' | 'table';
    }> = [];

    tableStore.tables.forEach(tbl => {
      items.push({
        category: tbl.category,
        id: tbl.id,
        name: tbl.title,
        number: tbl.shellNumber,
        type: 'table'
      });
    });

    figureStore.figures.forEach(fig => {
      items.push({
        category: '',
        id: fig.id,
        name: fig.title,
        number: fig.figureNumber,
        type: 'figure'
      });
    });

    listingStore.listings.forEach(lst => {
      items.push({
        category: '',
        id: lst.id,
        name: lst.title,
        number: lst.listingNumber,
        type: 'listing'
      });
    });

    return items;
  }, [tableStore.tables, figureStore.figures, listingStore.listings]);

  const filteredItems = useMemo(() => {
    if (sidebarFilter === 'all') return sidebarItems;
    return sidebarItems.filter(item => item.type === sidebarFilter);
  }, [sidebarItems, sidebarFilter]);

  // Sidebar type counts
  const typeCounts = useMemo(
    () => ({
      figure: figureStore.figures.length,
      listing: listingStore.listings.length,
      table: tableStore.tables.length
    }),
    [tableStore.tables.length, figureStore.figures.length, listingStore.listings.length]
  );

  // ============ Handlers ============

  const handleSelectItem = useCallback(
    (item: (typeof sidebarItems)[0]) => {
      setSidebarView('items');
      if (item.type === 'table') {
        const tbl = tableStore.tables.find(t => t.id === item.id);
        if (tbl) tableStore.setCurrentTable(tbl);
        figureStore.setCurrentFigure(null);
        listingStore.setCurrentListing(null);
      } else if (item.type === 'figure') {
        const fig = figureStore.figures.find(f => f.id === item.id);
        if (fig) figureStore.setCurrentFigure(fig);
        tableStore.setCurrentTable(null);
        listingStore.setCurrentListing(null);
      } else {
        const lst = listingStore.listings.find(l => l.id === item.id);
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
      category: 'Demographics',
      dataset: 'ADSL',
      footer: { notes: [], source: 'ADSL' },
      id: generateId('table'),
      population: 'Safety',
      rows: [],
      shellNumber: `Table 14.${tableStore.tables.length + 1}.1`,
      statisticsSetId: 'ss1',
      title: 'New Table',
      treatmentArmSetId: studyStore.treatmentArmSets[0]?.id || 'tas1'
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
      columns: [],
      dataset: 'ADAE',
      id: generateId('listing'),
      listingNumber: `Listing 16.${listingStore.listings.length + 1}.1`,
      pageSize: 20,
      population: 'Safety',
      title: 'New Listing'
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
      shellNumber: `${tableStore.currentTable.shellNumber} (copy)`,
      title: `${tableStore.currentTable.title} (copy)`
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
      ...tableStore.tables.map(tbl => ({
        category: tbl.category,
        dataset: tbl.dataset,
        displaySections: [],
        displayTitle: tbl.shellNumber,
        displayType: 'table' as const,
        id: tbl.id,
        name: tbl.title,
        population: tbl.population,
        shellNumber: tbl.shellNumber,
        type: 'Table' as const
      })),
      ...figureStore.figures.map(fig => ({
        displaySections: [],
        displayTitle: fig.figureNumber,
        displayType: 'figure' as const,
        id: fig.id,
        name: fig.title,
        population: fig.population,
        type: 'Figure' as const
      })),
      ...listingStore.listings.map(lst => ({
        dataset: lst.dataset,
        displaySections: [],
        displayTitle: lst.listingNumber,
        displayType: 'listing' as const,
        id: lst.id,
        name: lst.title,
        population: lst.population,
        type: 'Listing' as const
      }))
    ];
    return {
      displays,
      id: generateId('doc'),
      outputs: [],
      studyId: studyStore.currentStudy.studyId,
      studyInfo: {
        compoundUnderStudy: studyStore.currentStudy.compound,
        phase: [studyStore.currentStudy.phase],
        studyId: studyStore.currentStudy.studyId,
        studyTitle: studyStore.currentStudy.title,
        therapeuticArea: studyStore.currentStudy.therapeuticArea
      }
    };
  }, [studyStore.currentStudy, tableStore.tables, figureStore.figures, listingStore.listings]);

  // ============ Render: Table Editor ============

  const renderTableEditor = () => {
    if (!tableStore.currentTable) return null;
    const table = tableStore.currentTable;

    return (
      <div className="h-full flex flex-col gap-8px">
        {/* Breadcrumb header */}
        <div className="flex items-center justify-between">
          <Space>
            <Breadcrumb
              items={[
                { title: <Text type="secondary">{table.shellNumber}</Text> },
                { title: <Text strong>{table.title}</Text> }
              ]}
            />
            {tableStore.isDirty && (
              <Tag
                className="ml-8px"
                color="warning"
              >
                <ExclamationCircleOutlined className="mr-4px" />
                Unsaved
              </Tag>
            )}
            {hasUnsavedStudyChanges && (
              <Tag
                className="ml-4px"
                color="orange"
              >
                Study Settings Modified
              </Tag>
            )}
          </Space>
          <Space>
            <Button
              icon={<CopyOutlined />}
              size="small"
              onClick={handleDuplicateTable}
            >
              {t('page.mdr.tflDesigner.actions.duplicate')}
            </Button>
            <Popconfirm
              title={t('page.mdr.tflDesigner.actions.confirmDelete')}
              onConfirm={() => handleDeleteTable(table.id)}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
              >
                {t('page.mdr.tflDesigner.actions.delete')}
              </Button>
            </Popconfirm>
            <Button
              icon={<UndoOutlined />}
              size="small"
              onClick={() => tableEditorRef.current?.undo()}
            >
              Undo
            </Button>
            <Button
              icon={<RedoOutlined />}
              size="small"
              onClick={() => tableEditorRef.current?.redo()}
            >
              Redo
            </Button>
            <Button
              icon={<SendOutlined />}
              size="small"
              style={{ borderColor: '#722ed1', color: '#722ed1' }}
              onClick={() => setPushToStudyOpen(true)}
            >
              Push to Study
            </Button>
            <Button
              icon={<SaveOutlined />}
              loading={tflSaving}
              size="small"
              type="primary"
              onClick={handleSaveTable}
            >
              {t('page.mdr.tflDesigner.toolbar.save')}
            </Button>
          </Space>
        </div>

        {/* Side-by-side: Editor (left) + Live Preview (right) */}
        <div className="min-h-0 flex flex-1 gap-8px overflow-hidden">
          {/* Left: Editor Tabs */}
          <Card
            className="flex-shrink-0 overflow-auto"
            size="small"
            style={{ width: editorPanelWidth }}
            variant="borderless"
          >
            <Tabs
              activeKey={tableEditorTab}
              popupClassName="editor-tab-nav"
              size="small"
              tabBarStyle={{ marginBottom: 0 }}
              type="card"
              items={[
                {
                  children: (
                    <div className="flex flex-col gap-12px">
                      <Card
                        size="small"
                        title={t('page.mdr.tflDesigner.tableMeta.basicInfo')}
                      >
                        <div className="grid grid-cols-2 gap-8px">
                          <div>
                            <Text
                              className="text-11px"
                              type="secondary"
                            >
                              Shell Number
                            </Text>
                            <Input
                              className="mt-4px"
                              size="small"
                              value={table.shellNumber}
                              onChange={e => tableStore.updateMetadata({ shellNumber: e.target.value })}
                            />
                          </div>
                          <div>
                            <Text
                              className="text-11px"
                              type="secondary"
                            >
                              Title
                            </Text>
                            <Input
                              className="mt-4px"
                              size="small"
                              value={table.title}
                              onChange={e => tableStore.updateMetadata({ title: e.target.value })}
                            />
                          </div>
                          <div>
                            <Text
                              className="text-11px"
                              type="secondary"
                            >
                              Population
                            </Text>
                            <Select
                              className="mt-4px w-full"
                              options={populationOptions}
                              size="small"
                              value={table.population}
                              onChange={v => tableStore.updateMetadata({ population: v })}
                            />
                          </div>
                          <div>
                            <Text
                              className="text-11px"
                              type="secondary"
                            >
                              Category
                            </Text>
                            <Select
                              className="mt-4px w-full"
                              options={categoryOptions}
                              size="small"
                              value={table.category}
                              onChange={v => tableStore.updateMetadata({ category: v as any })}
                            />
                          </div>
                          <div>
                            <Text
                              className="text-11px"
                              type="secondary"
                            >
                              Dataset
                            </Text>
                            <Select
                              className="mt-4px w-full"
                              options={datasetOptions}
                              size="small"
                              value={table.dataset}
                              onChange={v => tableStore.updateMetadata({ dataset: v })}
                            />
                          </div>
                          <div>
                            <Text
                              className="text-11px"
                              type="secondary"
                            >
                              Statistics Set
                            </Text>
                            <Select
                              className="mt-4px w-full"
                              options={statisticsSetOptions}
                              placeholder="Select statistics set"
                              size="small"
                              value={table.statisticsSetId || undefined}
                              onChange={v => tableStore.updateMetadata({ statisticsSetId: v })}
                            />
                          </div>
                        </div>
                      </Card>
                      <Card
                        size="small"
                        title={t('page.mdr.tflDesigner.tableMeta.treatmentArms')}
                      >
                        <ColumnSourceEditor />
                      </Card>
                      <Card
                        size="small"
                        title={t('page.mdr.tflDesigner.tableMeta.analysisFilter')}
                      >
                        <div className="flex flex-col gap-8px">
                          <div>
                            <Text
                              className="text-11px"
                              type="secondary"
                            >
                              {t('page.mdr.tflDesigner.tableMeta.whereClause')}
                            </Text>
                            <Input.TextArea
                              className="mt-4px"
                              placeholder="e.g. AGE >= 18 AND SEX='M'"
                              rows={2}
                              value={table.whereClause || ''}
                              onChange={e => tableStore.updateMetadata({ whereClause: e.target.value || undefined })}
                            />
                          </div>
                          <div>
                            <Text
                              className="text-11px"
                              type="secondary"
                            >
                              {t('page.mdr.tflDesigner.tableMeta.analysisSubset')}
                            </Text>
                            <Input
                              className="mt-4px"
                              placeholder="e.g. Post-Baseline"
                              value={table.analysisSubset || ''}
                              onChange={e => tableStore.updateMetadata({ analysisSubset: e.target.value || undefined })}
                            />
                          </div>
                        </div>
                      </Card>
                      <Card
                        size="small"
                        title="Decimal Settings"
                      >
                        <DecimalSettingsTab />
                      </Card>
                    </div>
                  ),
                  key: 'metadata',
                  label: t('page.mdr.tflDesigner.tabs.metadata')
                },
                {
                  children: (
                    <div className="p-8px">
                      <div className="mb-8px">
                        <Text
                          className="text-11px"
                          type="secondary"
                        >
                          Source Dataset
                        </Text>
                        <Input
                          size="small"
                          value={table.footer.source || ''}
                          onChange={e =>
                            tableStore.updateMetadata({
                              footer: { ...table.footer, source: e.target.value || undefined }
                            })
                          }
                        />
                      </div>
                      <div>
                        <Text
                          className="mb-4px block text-11px"
                          type="secondary"
                        >
                          Footnotes
                        </Text>
                        {table.footer.notes?.length ? (
                          <ul className="list-disc list-inside text-12px space-y-2px">
                            {table.footer.notes.map((note, i) => (
                              <li key={i}>{note}</li>
                            ))}
                          </ul>
                        ) : (
                          <Text
                            className="text-12px"
                            type="secondary"
                          >
                            No footnotes
                          </Text>
                        )}
                      </div>
                    </div>
                  ),
                  key: 'footer',
                  label: t('page.mdr.tflDesigner.tabs.footer')
                },
                {
                  children: (
                    <div className="p-8px">
                      <Input.TextArea
                        placeholder="e.g. Use ADaM dataset ADRS for overall survival. Hazard ratio from Cox model."
                        rows={8}
                        style={{ fontSize: 12 }}
                        value={table.programmingNotes || ''}
                        onChange={e => tableStore.updateMetadata({ programmingNotes: e.target.value || undefined })}
                      />
                    </div>
                  ),
                  key: 'programmingNotes',
                  label: t('page.mdr.tflDesigner.tabs.programmingNotes')
                }
              ]}
              onChange={setTableEditorTab}
            />
          </Card>

          {/* Resize handle — editor panel */}
          <div
            style={{
              backgroundColor: isResizing && resizingTarget === 'editor' ? '#1890ff' : 'transparent',
              cursor: 'col-resize',
              flexShrink: 0,
              transition: 'background-color 0.15s',
              width: 4,
              zIndex: 10
            }}
            onMouseDown={e => handleResizeStart(e, 'editor')}
            onMouseEnter={e => {
              if (!isResizing) e.currentTarget.style.backgroundColor = '#d9d9d9';
            }}
            onMouseLeave={e => {
              if (!(isResizing && resizingTarget === 'editor')) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          />

          {/* Right: Live Preview - Interactive */}
          <Card
            className="min-w-0 flex-1 overflow-auto"
            size="small"
            variant="borderless"
            title={
              <Text
                className="text-12px"
                type="secondary"
              >
                Live Preview (Interactive)
              </Text>
            }
          >
            <InteractiveOutputEditor
              compact
              columnHeaders={activeArmHeaders}
              editable={true}
              headerStyle={headerFontStyle}
              ref={tableEditorRef}
              template={convertTableToTemplate(tableStore.currentTable)}
              decimalConfig={{
                shellDefaults: table.decimalOverride,
                studyDefaults: studyStore.studyDefaults?.decimalRules
              }}
              onColumnHeadersChange={handleColumnHeadersChange}
              onTemplateChange={handleTableTemplateChange}
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
      <div className="h-full flex flex-col gap-8px">
        {/* Breadcrumb header */}
        <div className="flex items-center justify-between">
          <Space>
            <Breadcrumb
              items={[
                { title: <Text type="secondary">{fig.figureNumber}</Text> },
                { title: <Text strong>{fig.title}</Text> }
              ]}
            />
            {figureStore.isDirty && (
              <Tag
                className="ml-8px"
                color="warning"
              >
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
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
              >
                {t('page.mdr.tflDesigner.actions.delete')}
              </Button>
            </Popconfirm>
            <Button
              icon={<SaveOutlined />}
              loading={tflSaving}
              size="small"
              type="primary"
              onClick={handleSaveFigure}
            >
              {t('page.mdr.tflDesigner.toolbar.save')}
            </Button>
          </Space>
        </div>

        {/* Side-by-side: Editor (left) + Live Preview (right) */}
        <div className="min-h-0 flex flex-1 gap-8px overflow-hidden">
          {/* Left: Editor Tabs */}
          <Card
            className="flex-shrink-0 overflow-auto"
            size="small"
            style={{ width: editorPanelWidth }}
            variant="borderless"
          >
            <Tabs
              activeKey={figureEditorTab}
              popupClassName="editor-tab-nav"
              size="small"
              tabBarStyle={{ marginBottom: 0 }}
              type="card"
              items={[
                {
                  children: (
                    <div className="flex flex-col gap-12px">
                      <Card
                        size="small"
                        title={t('page.mdr.tflDesigner.figureMeta.basicInfo')}
                      >
                        <div className="grid grid-cols-2 gap-8px">
                          <div>
                            <Text
                              className="text-11px"
                              type="secondary"
                            >
                              Figure Number
                            </Text>
                            <Input
                              className="mt-4px"
                              size="small"
                              value={fig.figureNumber}
                              onChange={e => figureStore.updateMetadata({ figureNumber: e.target.value })}
                            />
                          </div>
                          <div>
                            <Text
                              className="text-11px"
                              type="secondary"
                            >
                              Title
                            </Text>
                            <Input
                              className="mt-4px"
                              size="small"
                              value={fig.title}
                              onChange={e => figureStore.updateMetadata({ title: e.target.value })}
                            />
                          </div>
                          <div>
                            <Text
                              className="text-11px"
                              type="secondary"
                            >
                              Population
                            </Text>
                            <Select
                              className="mt-4px w-full"
                              options={populationOptions}
                              size="small"
                              value={fig.population}
                              onChange={v => figureStore.updateMetadata({ population: v })}
                            />
                          </div>
                        </div>
                      </Card>
                      <Card
                        size="small"
                        title={t('page.mdr.tflDesigner.figureMeta.chartType')}
                      >
                        <ChartTypeSelector
                          value={fig.chartType}
                          onChange={figureStore.setChartType}
                        />
                      </Card>
                    </div>
                  ),
                  key: 'metadata',
                  label: t('page.mdr.tflDesigner.tabs.metadata')
                },
                {
                  children: (
                    <AxesConfig
                      xAxis={fig.xAxis}
                      yAxis={fig.yAxis}
                      onXAxisChange={figureStore.updateXAxis}
                      onYAxisChange={figureStore.updateYAxis}
                    />
                  ),
                  key: 'axes',
                  label: t('page.mdr.tflDesigner.tabs.axes')
                },
                {
                  children: (
                    <SeriesConfig
                      chartType={fig.chartType}
                      series={fig.series}
                      onAdd={() => figureStore.addSeries()}
                      onDelete={id => figureStore.removeSeries(id)}
                      onReorder={(from, to) => figureStore.reorderSeries(from, to)}
                      onUpdate={(id, updates) => figureStore.updateSeries(id, updates)}
                    />
                  ),
                  key: 'series',
                  label: (
                    <Space size={4}>
                      {t('page.mdr.tflDesigner.tabs.series')}
                      <Tag className="ml-4px">{fig.series.length}</Tag>
                    </Space>
                  )
                },
                {
                  children: (
                    <div className="p-8px">
                      <Input.TextArea
                        placeholder="e.g. KM curve using survfit(Surv(time, status) ~ arm). Log-rank p-value at alpha=0.05."
                        rows={8}
                        style={{ fontSize: 12 }}
                        value={fig.programmingNotes || ''}
                        onChange={e => figureStore.updateMetadata({ programmingNotes: e.target.value })}
                      />
                    </div>
                  ),
                  key: 'programmingNotes',
                  label: t('page.mdr.tflDesigner.tabs.programmingNotes')
                }
              ]}
              onChange={setFigureEditorTab}
            />
          </Card>

          {/* Resize handle — editor panel */}
          <div
            style={{
              backgroundColor: isResizing && resizingTarget === 'editor' ? '#1890ff' : 'transparent',
              cursor: 'col-resize',
              flexShrink: 0,
              transition: 'background-color 0.15s',
              width: 4,
              zIndex: 10
            }}
            onMouseDown={e => handleResizeStart(e, 'editor')}
            onMouseEnter={e => {
              if (!isResizing) e.currentTarget.style.backgroundColor = '#d9d9d9';
            }}
            onMouseLeave={e => {
              if (!(isResizing && resizingTarget === 'editor')) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          />

          {/* Right: Live Preview - ECharts */}
          <Card
            className="min-w-0 flex-1 overflow-auto"
            size="small"
            variant="borderless"
            title={
              <Text
                className="text-12px"
                type="secondary"
              >
                Live Preview (Chart)
              </Text>
            }
          >
            <FigurePreview
              config={{
                chartType: fig.chartType,
                legend: fig.legend,
                series: fig.series,
                style: fig.style,
                title: fig.title,
                xAxis: fig.xAxis,
                yAxis: fig.yAxis
              }}
              onStyleChange={style => figureStore.updateStyle(style)}
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
      <div className="h-full flex flex-col gap-8px">
        {/* Breadcrumb header */}
        <div className="flex items-center justify-between">
          <Space>
            <Breadcrumb
              items={[
                { title: <Text type="secondary">{lst.listingNumber}</Text> },
                { title: <Text strong>{lst.title}</Text> }
              ]}
            />
            {listingStore.isDirty && (
              <Tag
                className="ml-8px"
                color="warning"
              >
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
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
              >
                {t('page.mdr.tflDesigner.actions.delete')}
              </Button>
            </Popconfirm>
            <Button
              icon={<UndoOutlined />}
              size="small"
              onClick={() => listingEditorRef.current?.undo()}
            >
              Undo
            </Button>
            <Button
              icon={<RedoOutlined />}
              size="small"
              onClick={() => listingEditorRef.current?.redo()}
            >
              Redo
            </Button>
            <Button
              icon={<SaveOutlined />}
              loading={tflSaving}
              size="small"
              type="primary"
              onClick={handleSaveListing}
            >
              {t('page.mdr.tflDesigner.toolbar.save')}
            </Button>
          </Space>
        </div>

        {/* Side-by-side: Editor (left) + Live Preview (right) */}
        <div className="min-h-0 flex flex-1 gap-8px overflow-hidden">
          {/* Left: Editor Tabs */}
          <Card
            className="flex-shrink-0 overflow-auto"
            size="small"
            style={{ width: editorPanelWidth }}
            variant="borderless"
          >
            <Tabs
              activeKey={listingEditorTab}
              popupClassName="editor-tab-nav"
              size="small"
              tabBarStyle={{ marginBottom: 0 }}
              type="card"
              items={[
                {
                  children: (
                    <div className="flex flex-col gap-12px">
                      <Card
                        size="small"
                        title={t('page.mdr.tflDesigner.listingMeta.basicInfo')}
                      >
                        <div className="grid grid-cols-2 gap-12px">
                          <div>
                            <Text
                              className="text-12px"
                              type="secondary"
                            >
                              Listing Number
                            </Text>
                            <Input
                              className="mt-4px"
                              size="small"
                              value={lst.listingNumber}
                              onChange={e => listingStore.updateMetadata({ listingNumber: e.target.value })}
                            />
                          </div>
                          <div>
                            <Text
                              className="text-12px"
                              type="secondary"
                            >
                              Title
                            </Text>
                            <Input
                              className="mt-4px"
                              size="small"
                              value={lst.title}
                              onChange={e => listingStore.updateMetadata({ title: e.target.value })}
                            />
                          </div>
                          <div>
                            <Text
                              className="text-12px"
                              type="secondary"
                            >
                              Population
                            </Text>
                            <Select
                              className="mt-4px w-full"
                              options={populationOptions}
                              size="small"
                              value={lst.population}
                              onChange={v => listingStore.updateMetadata({ population: v })}
                            />
                          </div>
                          <div>
                            <Text
                              className="text-12px"
                              type="secondary"
                            >
                              Dataset
                            </Text>
                            <Select
                              className="mt-4px w-full"
                              options={datasetOptions}
                              size="small"
                              value={lst.dataset}
                              onChange={v => listingStore.updateMetadata({ dataset: v })}
                            />
                          </div>
                          <div>
                            <Text
                              className="text-12px"
                              type="secondary"
                            >
                              Page Size
                            </Text>
                            <InputNumber
                              className="mt-4px w-full"
                              max={200}
                              min={5}
                              size="small"
                              value={lst.pageSize || 20}
                              onChange={v => listingStore.updateMetadata({ pageSize: v || 20 })}
                            />
                          </div>
                        </div>
                      </Card>
                      <Card
                        size="small"
                        title={t('page.mdr.tflDesigner.listingMeta.analysisFilter')}
                      >
                        <div className="flex flex-col gap-8px">
                          <div>
                            <Text
                              className="text-11px"
                              type="secondary"
                            >
                              {t('page.mdr.tflDesigner.listingMeta.whereClause')}
                            </Text>
                            <Input.TextArea
                              className="mt-4px"
                              placeholder="e.g. AGE >= 18"
                              rows={2}
                              value={lst.whereClause || ''}
                              onChange={e => listingStore.updateMetadata({ whereClause: e.target.value || undefined })}
                            />
                          </div>
                          <div>
                            <Text
                              className="text-11px"
                              type="secondary"
                            >
                              {t('page.mdr.tflDesigner.listingMeta.analysisSubset')}
                            </Text>
                            <Input
                              className="mt-4px"
                              placeholder="e.g. Safety Subjects with TEAE"
                              value={lst.analysisSubset || ''}
                              onChange={e =>
                                listingStore.updateMetadata({ analysisSubset: e.target.value || undefined })
                              }
                            />
                          </div>
                        </div>
                      </Card>
                    </div>
                  ),
                  key: 'metadata',
                  label: t('page.mdr.tflDesigner.tabs.metadata')
                },
                {
                  children: (
                    <SortConfigEditor
                      columns={lst.columns.map(c => ({ id: c.id, label: c.label, name: c.name }))}
                      displayId={lst.id}
                      sortRules={lst.sortBy || []}
                      onAdd={() => listingStore.addSort()}
                      onDelete={index => listingStore.deleteSort(index)}
                      onReorder={(from, to) => listingStore.reorderSort(from, to)}
                      onUpdate={(index, updates) => listingStore.updateSort(index, updates)}
                    />
                  ),
                  key: 'sort',
                  label: (
                    <Space size={4}>
                      {t('page.mdr.tflDesigner.tabs.sortOrder')}
                      <Tag className="ml-4px">{lst.sortBy?.length || 0}</Tag>
                    </Space>
                  )
                },
                {
                  children: (
                    <FilterConfigEditor
                      columns={lst.columns.map(c => ({ id: c.id, label: c.label, name: c.name }))}
                      displayId={lst.id}
                      filters={lst.filter || []}
                      onAdd={() => listingStore.addFilter()}
                      onDelete={index => listingStore.deleteFilter(index)}
                      onUpdate={(index, updates) => listingStore.updateFilter(index, updates)}
                    />
                  ),
                  key: 'filter',
                  label: (
                    <Space size={4}>
                      {t('page.mdr.tflDesigner.tabs.filter')}
                      <Tag className="ml-4px">{lst.filter?.length || 0}</Tag>
                    </Space>
                  )
                },
                {
                  children: (
                    <div className="p-8px">
                      <Input.TextArea
                        placeholder="e.g. Include only subjects with at least one post-baseline lab value. Sort by visit date."
                        rows={8}
                        style={{ fontSize: 12 }}
                        value={lst.programmingNotes || ''}
                        onChange={e => listingStore.updateMetadata({ programmingNotes: e.target.value || undefined })}
                      />
                    </div>
                  ),
                  key: 'programmingNotes',
                  label: t('page.mdr.tflDesigner.tabs.programmingNotes')
                }
              ]}
              onChange={setListingEditorTab}
            />
          </Card>

          {/* Resize handle — editor panel */}
          <div
            style={{
              backgroundColor: isResizing && resizingTarget === 'editor' ? '#1890ff' : 'transparent',
              cursor: 'col-resize',
              flexShrink: 0,
              transition: 'background-color 0.15s',
              width: 4,
              zIndex: 10
            }}
            onMouseDown={e => handleResizeStart(e, 'editor')}
            onMouseEnter={e => {
              if (!isResizing) e.currentTarget.style.backgroundColor = '#d9d9d9';
            }}
            onMouseLeave={e => {
              if (!(isResizing && resizingTarget === 'editor')) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          />

          {/* Right: Live Preview - Interactive */}
          <Card
            className="min-w-0 flex-1 overflow-auto"
            size="small"
            variant="borderless"
            title={
              <Text
                className="text-12px"
                type="secondary"
              >
                Live Preview (Interactive)
              </Text>
            }
          >
            <InteractiveOutputEditor
              compact
              editable={true}
              headerStyle={headerFontStyle}
              ref={listingEditorRef}
              template={convertListingToTemplate(lst)}
              onTemplateChange={handleListingTemplateChange}
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
      <div className="h-full flex flex-col gap-16px overflow-y-auto p-16px">
        {/* Summary cards row */}
        <div className="grid grid-cols-3 flex-shrink-0 gap-12px">
          <div className="border border-gray-200 rounded-lg p-12px text-center transition-shadow hover:shadow-sm">
            <TableOutlined className="mb-4px text-20px text-blue-500" />
            <div className="text-20px text-gray-800 font-semibold">{tableCount}</div>
            <div className="text-11px text-gray-500">Tables</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-12px text-center transition-shadow hover:shadow-sm">
            <BarChartOutlined className="mb-4px text-20px text-green-500" />
            <div className="text-20px text-gray-800 font-semibold">{figureCount}</div>
            <div className="text-11px text-gray-500">Figures</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-12px text-center transition-shadow hover:shadow-sm">
            <UnorderedListOutlined className="mb-4px text-20px text-orange-500" />
            <div className="text-20px text-gray-800 font-semibold">{listingCount}</div>
            <div className="text-11px text-gray-500">Listings</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-shrink-0 items-center justify-between">
          <Text
            className="text-12px"
            type="secondary"
          >
            {t('page.mdr.tflDesigner.overview.selectOrCreate')}
          </Text>
          <Space size="small">
            <Button
              icon={<PlusOutlined />}
              size="small"
              onClick={() => setTemplateModalOpen(true)}
            >
              {t('page.mdr.tflDesigner.actions.fromTemplate')}
            </Button>
            {totalCount > 0 && (
              <Button
                icon={<ExportOutlined />}
                size="small"
                onClick={() => setExportModalOpen(true)}
              >
                {t('page.mdr.tflDesigner.toolbar.export')}
              </Button>
            )}
          </Space>
        </div>

        {/* ======= Global Study Management ======= */}
        <div className="min-w-0 flex flex-col gap-12px">
          <div className="flex items-center gap-8px">
            <SettingOutlined className="text-gray-400" />
            <span className="text-13px text-gray-600 font-medium">Study Configuration</span>
            <div className="h-px flex-1 bg-gray-200" />
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
      {/* No study selected — prompt to select */}
      {!isStudyReady && (
        <div className="flex flex-1 items-center justify-center">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space
                align="center"
                direction="vertical"
                size={8}
              >
                <Text
                  className="text-14px"
                  type="secondary"
                >
                  Select a study to start designing
                </Text>
                <Text
                  className="text-12px"
                  type="secondary"
                >
                  Choose a product and study from the global context above.
                </Text>
              </Space>
            }
          />
        </div>
      )}

      {/* Study selected but no analysis — show study-level settings */}
      {isStudyReady && !isAnalysisReady && (
        <Card
          className="flex-1 overflow-hidden"
          size="small"
          variant="borderless"
        >
          <div className="h-full flex gap-8px overflow-hidden">
            {/* Study settings sidebar */}
            <div className="w-260px flex-shrink-0 overflow-y-auto border-r border-gray-200 pr-8px">
              <div className="mb-8px text-12px text-gray-500 font-medium">Study-Level Configuration</div>
              {studySettingsTabs.map(tab => (
                <div
                  className="flex cursor-pointer items-center gap-8px rounded px-8px py-6px text-12px transition-colors"
                  key={tab.key}
                  style={{
                    background: studySettingsTab === tab.key ? '#e6f4ff' : 'transparent',
                    color: studySettingsTab === tab.key ? '#1890ff' : '#666'
                  }}
                  onClick={() => setStudySettingsTab(tab.key)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
              ))}
            </div>

            {/* Settings content */}
            <div className="flex-1 overflow-y-auto py-4px">{renderStudySettingsContent()}</div>
          </div>
        </Card>
      )}

      {/* Analysis selected — show full TFL workspace */}
      {isAnalysisReady && (
        <>
          {/* Toolbar */}
          <Card
            className="flex-shrink-0 card-wrapper"
            size="small"
            styles={{ body: { borderBottom: '1px solid #f0f0f0', padding: '6px 16px' } }}
            variant="borderless"
          >
            <div className="flex items-center justify-between">
              <Space size="small">
                <AppstoreOutlined className="text-16px text-blue-600" />
                <Title
                  className="m-0"
                  level={5}
                  style={{ fontSize: 15 }}
                >
                  TFL Designer
                </Title>
              </Space>
              <Space>
                <Dropdown
                  menu={{
                    items: [
                      {
                        icon: <TableOutlined />,
                        key: 'newTable',
                        label: t('page.mdr.tflDesigner.actions.newTable'),
                        onClick: handleNewTable
                      },
                      {
                        icon: <BarChartOutlined />,
                        key: 'newFigure',
                        label: t('page.mdr.tflDesigner.actions.newFigure'),
                        onClick: handleNewFigure
                      },
                      {
                        icon: <UnorderedListOutlined />,
                        key: 'newListing',
                        label: t('page.mdr.tflDesigner.actions.newListing'),
                        onClick: handleNewListing
                      },
                      { type: 'divider' },
                      {
                        icon: <FileTextOutlined />,
                        key: 'fromTemplate',
                        label: t('page.mdr.tflDesigner.actions.fromTemplate'),
                        onClick: () => setTemplatePickerOpen(true)
                      }
                    ]
                  }}
                >
                  <Button
                    icon={<PlusOutlined />}
                    type="primary"
                  >
                    {t('page.mdr.tflDesigner.toolbar.newShell')}
                  </Button>
                </Dropdown>
                <Button
                  icon={<ExportOutlined />}
                  onClick={() => setExportModalOpen(true)}
                >
                  {t('page.mdr.tflDesigner.toolbar.export')}
                </Button>
              </Space>
            </div>
          </Card>

          {/* Loading and Error States */}
          {tflLoading && (
            <div className="flex items-center justify-center py-16px">
              <Spin
                indicator={
                  <LoadingOutlined
                    spin
                    style={{ fontSize: 24 }}
                  />
                }
              />
              <Text
                className="ml-8px"
                type="secondary"
              >
                Loading TFL data...
              </Text>
            </div>
          )}
          {tflError && (
            <Alert
              showIcon
              className="mx-16px"
              description={tflError}
              message="Failed to load TFL data"
              type="error"
              action={
                <Button
                  size="small"
                  onClick={refreshTFLData}
                >
                  Retry
                </Button>
              }
            />
          )}

          {/* Main content: Left sidebar + Center editor */}
          <div className="min-h-0 flex flex-1 overflow-hidden">
            {/* Left sidebar - Outputs Tree (resizable) */}
            <Card
              className="flex flex-col flex-shrink-0 overflow-hidden card-wrapper"
              size="small"
              style={{ width: sidebarWidth }}
              variant="borderless"
            >
              {/* Study Settings button */}
              <div className="mb-8px">
                <Tooltip title={t('page.mdr.tflDesigner.sidebar.studySettings')}>
                  <Button
                    block
                    ghost={sidebarView === 'settings'}
                    icon={<SettingOutlined />}
                    size="small"
                    type={sidebarView === 'settings' ? 'primary' : 'default'}
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
                    {
                      label: (
                        <Space size={2}>
                          T<sup>{typeCounts.table}</sup>
                        </Space>
                      ),
                      value: 'table'
                    },
                    {
                      label: (
                        <Space size={2}>
                          F<sup>{typeCounts.figure}</sup>
                        </Space>
                      ),
                      value: 'figure'
                    },
                    {
                      label: (
                        <Space size={2}>
                          L<sup>{typeCounts.listing}</sup>
                        </Space>
                      ),
                      value: 'listing'
                    }
                  ]}
                  onChange={v => setSidebarFilter(v as SidebarFilter)}
                />
              )}

              {/* Items list or Study Settings view */}
              <div className="flex-1 overflow-auto">
                {sidebarView === 'settings' ? (
                  <div className="flex flex-col gap-2px pt-4px">
                    {/* Study settings vertical tabs */}
                    {studySettingsTabs.map(tab => (
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
                    <Text
                      className="text-12px"
                      type="secondary"
                    >
                      {t('page.mdr.tflDesigner.sidebar.empty')}
                    </Text>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2px pt-8px">
                    {filteredItems.map(item => {
                      const isActive =
                        (item.type === 'table' && tableStore.currentTable?.id === item.id) ||
                        (item.type === 'figure' && figureStore.currentFigure?.id === item.id) ||
                        (item.type === 'listing' && listingStore.currentListing?.id === item.id);

                      const typeColor =
                        item.type === 'table' ? '#1890ff' : item.type === 'figure' ? '#52c41a' : '#fa8c16';
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
                          style={
                            isActive
                              ? { borderLeft: `3px solid ${typeColor}`, paddingLeft: 5 }
                              : { borderLeft: '3px solid transparent', paddingLeft: 5 }
                          }
                          onClick={() => handleSelectItem(item)}
                        >
                          <Space size={6}>
                            {icon}
                            <span className="text-13px leading-tight">
                              <Text
                                className="mr-4px block text-10px"
                                type="secondary"
                              >
                                {item.number}
                              </Text>
                              <span className={isActive ? 'text-gray-900 font-medium' : 'text-gray-700'}>
                                {item.name}
                              </span>
                            </span>
                          </Space>
                          <Space size={2}>
                            {item.category && (
                              <Tag
                                className="m-0 text-10px"
                                color="green"
                              >
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
              style={{
                backgroundColor: isResizing ? '#1890ff' : 'transparent',
                cursor: 'col-resize',
                flexShrink: 0,
                transition: 'background-color 0.15s',
                width: 4,
                zIndex: 10
              }}
              onMouseDown={e => handleResizeStart(e, 'sidebar')}
              onMouseEnter={e => {
                if (!isResizing) e.currentTarget.style.backgroundColor = '#d9d9d9';
              }}
              onMouseLeave={e => {
                if (!isResizing) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            />

            {/* Center - Editor area */}
            <Card
              className="min-w-0 flex flex-col flex-1 overflow-hidden card-wrapper"
              size="small"
              variant="borderless"
            >
              {sidebarView === 'settings' &&
              !tableStore.currentTable &&
              !figureStore.currentFigure &&
              !listingStore.currentListing ? (
                <div className="h-full overflow-y-auto p-12px">{renderStudySettingsContent()}</div>
              ) : tableStore.currentTable ? (
                renderTableEditor()
              ) : figureStore.currentFigure ? (
                renderFigureEditor()
              ) : listingStore.currentListing ? (
                renderListingEditor()
              ) : (
                renderStudyOverview()
              )}
            </Card>
          </div>

          {/* Template Selector Modal */}
        </>
      )}
      <TemplateSelector
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
      />

      {/* Export Modal */}
      <ExportModal
        document={exportDocument}
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />

      {/* Template Picker from Study Templates */}
      <TemplatePickerModal
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
      />

      {/* Push to Study PR Modal */}
      <PushToStudyModal
        open={pushToStudyOpen}
        onClose={() => setPushToStudyOpen(false)}
      />
    </div>
  );
};

export default TflDesigner;
