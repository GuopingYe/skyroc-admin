/**
 * TFL Template Library — Standalone page under /mdr/
 *
 * Three-column layout matching TFL Designer pattern:
 *
 * - Left sidebar: Template list with search, type filter, category selector
 * - Center: Tabbed editor panel (same components as TFL Designer)
 * - Right: Live preview of the selected template (InteractiveOutputEditor)
 *
 * Features:
 *
 * - Import templates from reference JSON files
 * - Edit templates with undo/redo via templateEditorStore
 * - Dirty tracking with save confirmation
 * - All edits are recorded in undo/redo stacks
 */
import {
  AppstoreOutlined,
  BarChartOutlined,
  CopyOutlined,
  DeleteOutlined,
  ImportOutlined,
  LeftOutlined,
  RedoOutlined,
  RightOutlined,
  SaveOutlined,
  SearchOutlined,
  TableOutlined,
  UndoOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/auth';
import type { ScopeLevel, Template } from '@/features/tfl-designer';
import {
  InteractiveOutputEditor,
  TemplateEditorPanel,
  categoryOptions,
  getScopeLevelTagProps,
  importARSJSONToTemplates,
  useTemplateEditorStore,
  useTemplateStore
} from '@/features/tfl-designer';
import { CollapsedRail, CollapseButton } from '@/features/tfl-designer';

const { Text, Title } = Typography;

type TypeFilter = 'all' | 'figure' | 'listing' | 'table';
type ScopeLevelFilter = 'all' | 'global' | 'product' | 'ta';

const categoryLabelMap: Record<string, string> = {};
categoryOptions.forEach(opt => {
  categoryLabelMap[opt.value] = opt.label;
});

const typeColor: Record<string, string> = { figure: '#52c41a', listing: '#722ed1', table: '#1890ff' };

const typeIconMap: Record<string, React.ReactNode> = {
  figure: <BarChartOutlined />,
  listing: <UnorderedListOutlined />,
  table: <TableOutlined />
};

// ==================== Route handle ====================

export const handle = {
  i18nKey: 'route.(base)_mdr_tfl-template-library',
  icon: 'mdi:bookshelf',
  order: 6,
  title: 'Template Library'
};

// ==================== Main Component ====================

const TemplateLibrary: React.FC = () => {
  const { t } = useTranslation();
  const { hasAuth } = useAuth();
  const canManage = hasAuth('R_ADMIN') || hasAuth('R_SUPER');

  // --- Template store (read-only list) ---
  const templates = useTemplateStore(s => s.templates);
  const initTemplates = useTemplateStore(s => s.initTemplates);
  const selectedTemplate = useTemplateStore(s => s.selectedTemplate);
  const selectTemplate = useTemplateStore(s => s.selectTemplate);
  const deleteTemplate = useTemplateStore(s => s.deleteTemplate);
  const duplicateTemplate = useTemplateStore(s => s.duplicateTemplate);
  const updateTemplate = useTemplateStore(s => s.updateTemplate);

  // --- Editor store (undo/redo/dirty) ---
  const editingTemplate = useTemplateEditorStore(s => s.editingTemplate);
  const isDirty = useTemplateEditorStore(s => s.isDirty);
  const canUndo = useTemplateEditorStore(s => s.canUndo);
  const canRedo = useTemplateEditorStore(s => s.canRedo);
  const startEditing = useTemplateEditorStore(s => s.startEditing);
  const setEditingTemplate = useTemplateEditorStore(s => s.setEditingTemplate);
  const undo = useTemplateEditorStore(s => s.undo);
  const redo = useTemplateEditorStore(s => s.redo);
  const commitEditing = useTemplateEditorStore(s => s.commitEditing);
  const clearEditing = useTemplateEditorStore(s => s.clearEditing);

  // --- Local UI state ---
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [scopeLevelFilter, setScopeLevelFilter] = useState<ScopeLevelFilter>('all');
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importedTemplates, setImportedTemplates] = useState<Template[]>([]);
  const [pendingSelect, setPendingSelect] = useState<Template | null>(null);

  useEffect(() => {
    initTemplates();
  }, [initTemplates]);

  // Load reference templates on mount
  useEffect(() => {
    loadReferenceTemplates();
  }, []);

  // Load templates from reference JSON files
  const loadReferenceTemplates = useCallback(async (showToast = false) => {
    try {
      const refFiles = [
        '/examples/tfldesigner/references/export 1.json',
        '/examples/tfldesigner/references/export 2.json',
        '/examples/tfldesigner/references/export 3.json',
        '/examples/tfldesigner/references/export 4.json'
      ];

      const results = await Promise.all(
        refFiles.map(async filePath => {
          try {
            const response = await fetch(filePath);
            if (response.ok) {
              const json = await response.json();
              return importARSJSONToTemplates(json).map(t => ({
                ...t,
                scopeLevel: t.scopeLevel ?? 'global' as const
              }));
            }
          } catch (err) {
            console.warn(`Could not load ${filePath}:`, err);
          }
          return [];
        })
      );
      const allLoaded = results.flat();

      if (allLoaded.length > 0) {
        setImportedTemplates(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newTemplates = allLoaded.filter(t => !existingIds.has(t.id));
          if (newTemplates.length === 0) return prev;
          if (showToast || prev.length === 0) {
            message.success(`Loaded ${newTemplates.length} reference templates`);
          }
          return [...prev, ...newTemplates];
        });
      }
    } catch (error) {
      console.error('Error loading reference templates:', error);
    }
  }, []);

  // Combine built-in and imported templates
  const allTemplatesCombined = useMemo(() => {
    const existingIds = new Set(templates.map(t => t.id));
    const uniqueImported = importedTemplates.filter(t => !existingIds.has(t.id));
    return [...templates, ...uniqueImported];
  }, [templates, importedTemplates]);

  // Resize handle
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      const onMouseMove = (ev: MouseEvent) => {
        setSidebarWidth(Math.max(180, Math.min(420, startWidth + (ev.clientX - startX))));
      };
      const onMouseUp = () => {
        setIsResizing(false);
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
    [sidebarWidth]
  );

  const filtered = useMemo(() => {
    let list = allTemplatesCombined;
    if (typeFilter !== 'all') list = list.filter(tp => tp.type === typeFilter);
    if (categoryFilter) list = list.filter(tp => tp.category === categoryFilter);
    if (scopeLevelFilter !== 'all') list = list.filter(tp => (tp.scopeLevel ?? 'global') === scopeLevelFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(tp => tp.name.toLowerCase().includes(q) || tp.description?.toLowerCase().includes(q));
    }
    return list;
  }, [allTemplatesCombined, typeFilter, categoryFilter, scopeLevelFilter, search]);

  const typeCounts = useMemo(
    () => ({
      all: allTemplatesCombined.length,
      figure: allTemplatesCombined.filter(tp => tp.type === 'figure').length,
      listing: allTemplatesCombined.filter(tp => tp.type === 'listing').length,
      table: allTemplatesCombined.filter(tp => tp.type === 'table').length
    }),
    [allTemplatesCombined]
  );

  const categories = useMemo(() => {
    const cats = new Set(allTemplatesCombined.map(tp => tp.category));
    return Array.from(cats).map(c => ({ label: categoryLabelMap[c] || c, value: c }));
  }, [allTemplatesCombined]);

  // --- Template selection with dirty check ---
  const doSelect = useCallback(
    (tpl: Template) => {
      selectTemplate(tpl);
      startEditing(tpl);
    },
    [selectTemplate, startEditing]
  );

  const handleSelect = useCallback(
    (tpl: Template) => {
      if (isDirty && editingTemplate) {
        // Prompt to save or discard
        setPendingSelect(tpl);
        return;
      }
      doSelect(tpl);
    },
    [isDirty, editingTemplate, doSelect]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteTemplate(id);
      clearEditing();
      message.success(t('page.mdr.tflTemplateLibrary.deleteSuccess'));
    },
    [deleteTemplate, clearEditing, t]
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      duplicateTemplate(id);
      message.success(t('page.mdr.tflTemplateLibrary.duplicateSuccess'));
    },
    [duplicateTemplate, t]
  );

  // Handle file import
  const handleFileImport = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const imported = importARSJSONToTemplates(json);
      if (imported.length > 0) {
        setImportedTemplates(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newTemplates = imported.filter(t => !existingIds.has(t.id));
          return [...prev, ...newTemplates];
        });
        message.success(`Imported ${imported.length} templates from ${file.name}`);
      } else {
        message.warning(`No valid templates found in ${file.name}`);
      }
    } catch (error) {
      message.error(`Failed to import ${file.name}: ${error}`);
    }
    setImportModalOpen(false);
  }, []);

  // --- Editor changes ---
  const handleEditorChange = useCallback(
    (updated: Template) => {
      setEditingTemplate(updated);
    },
    [setEditingTemplate]
  );

  // --- Save ---
  const handleSave = useCallback(() => {
    const saved = commitEditing();
    if (!saved) return;
    const inStore = templates.some(t => t.id === saved.id);
    if (inStore) {
      updateTemplate(saved.id, saved);
    } else {
      setImportedTemplates(prev => prev.map(t => (t.id === saved.id ? saved : t)));
    }
    selectTemplate(saved);
    message.success('Template saved successfully');
  }, [commitEditing, templates, updateTemplate, selectTemplate]);

  // --- Dirty confirmation modal ---
  const renderDirtyConfirm = () => (
    <Modal
      closable={false}
      open={pendingSelect !== null}
      title="Unsaved Changes"
      onCancel={() => setPendingSelect(null)}
      footer={[
        <Button
          key="cancel"
          onClick={() => setPendingSelect(null)}
        >
          Cancel
        </Button>,
        <Button
          danger
          key="discard"
          onClick={() => {
            if (pendingSelect) {
              clearEditing();
              doSelect(pendingSelect);
              setPendingSelect(null);
            }
          }}
        >
          Discard Changes
        </Button>,
        <Button
          icon={<SaveOutlined />}
          key="save"
          type="primary"
          onClick={() => {
            handleSave();
            if (pendingSelect) {
              doSelect(pendingSelect);
              setPendingSelect(null);
            }
          }}
        >
          Save & Switch
        </Button>
      ]}
    >
      <Text>You have unsaved changes. Would you like to save before switching templates?</Text>
    </Modal>
  );

  // --- Import Modal ---
  const renderImportModal = () => (
    <Modal
      open={importModalOpen}
      title="Import Templates"
      footer={[
        <Button
          key="cancel"
          onClick={() => setImportModalOpen(false)}
        >
          Cancel
        </Button>
      ]}
      onCancel={() => setImportModalOpen(false)}
    >
      <div className="p-4">
        <Upload.Dragger
          multiple
          accept=".json"
          beforeUpload={file => {
            handleFileImport(file as unknown as File);
            return false;
          }}
        >
          <p className="ant-upload-drag-icon">
            <ImportOutlined />
          </p>
          <p className="ant-upload-text">Click or drag JSON files to import</p>
          <p className="ant-upload-hint">Supports CDISC ARS format JSON files</p>
        </Upload.Dragger>
        <div className="mt-4">
          <Text type="secondary">
            Reference templates are loaded automatically from the references folder on page load.
          </Text>
        </div>
      </div>
    </Modal>
  );

  // ==================== Main Layout ====================

  return (
    <div className="h-full flex flex-col gap-8px overflow-hidden">
      {/* Toolbar */}
      <Card
        className="flex-shrink-0 card-wrapper"
        size="small"
        styles={{ body: { padding: '8px 12px' } }}
        variant="borderless"
      >
        <div className="flex items-center justify-between">
          <Space size="small">
            <AppstoreOutlined className="text-18px text-purple-600" />
            <Title
              className="m-0"
              level={5}
            >
              {t('page.mdr.tflTemplateLibrary.title')}
            </Title>
            <Text
              className="text-12px"
              type="secondary"
            >
              {typeCounts.all} {t('page.mdr.tflTemplateLibrary.templates')}
            </Text>
            {isDirty && (
              <Tag
                color="orange"
                style={{ fontSize: 10 }}
              >
                Unsaved
              </Tag>
            )}
          </Space>
          <Space>
            {/* Undo / Redo */}
            <Tooltip title="Undo (Ctrl+Z)">
              <Button
                disabled={!canUndo}
                icon={<UndoOutlined />}
                size="small"
                onClick={undo}
              />
            </Tooltip>
            <Tooltip title="Redo (Ctrl+Y)">
              <Button
                disabled={!canRedo}
                icon={<RedoOutlined />}
                size="small"
                onClick={redo}
              />
            </Tooltip>
            {canManage && (
              <Button
                disabled={!isDirty}
                icon={<SaveOutlined />}
                size="small"
                type="primary"
                onClick={handleSave}
              >
                Save
              </Button>
            )}
            <Button
              icon={<ImportOutlined />}
              onClick={() => setImportModalOpen(true)}
            >
              {t('page.mdr.tflTemplateLibrary.import')}
            </Button>
            {canManage && <Button onClick={() => loadReferenceTemplates(true)}>Reload References</Button>}
          </Space>
        </div>
      </Card>

      {/* Three-column layout */}
      <div className="min-h-0 flex flex-1 overflow-hidden">
        {/* Left sidebar — collapsible */}
        {sidebarCollapsed ? (
          <CollapsedRail tooltip="Expand sidebar" onExpand={() => setSidebarCollapsed(false)} />
        ) : (
          <>
            <Card
              className="flex flex-col flex-shrink-0 overflow-hidden card-wrapper"
              size="small"
              style={{ width: sidebarWidth }}
              styles={{ body: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '8px' } }}
              variant="borderless"
            >
              <div className="mb-4px flex items-center justify-end">
                <CollapseButton tooltip="Collapse sidebar" onCollapse={() => setSidebarCollapsed(true)} />
              </div>
              <div className="mb-8px">
                <Input
                  allowClear
                  placeholder={t('page.mdr.tflTemplateLibrary.searchPlaceholder')}
                  prefix={<SearchOutlined />}
                  size="small"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Segmented
                size="small"
                style={{ marginBottom: 8, width: '100%' }}
                value={scopeLevelFilter}
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Global', value: 'global' },
                  { label: 'TA', value: 'ta' },
                  { disabled: true, label: 'Product', value: 'product' }
                ]}
                onChange={v => setScopeLevelFilter(v as ScopeLevelFilter)}
              />
              <Segmented
                block
                size="small"
                value={typeFilter}
                options={[
                  {
                    label: (
                      <Space size={2}>
                        All<sup>{typeCounts.all}</sup>
                      </Space>
                    ),
                    value: 'all'
                  },
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
                onChange={v => setTypeFilter(v as TypeFilter)}
              />
              <div className="mt-8px">
                <Select
                  allowClear
                  options={categories}
                  placeholder={t('page.mdr.tflTemplateLibrary.categoryFilter')}
                  popupMatchSelectWidth={false}
                  size="small"
                  style={{ width: '100%' }}
                  value={categoryFilter || undefined}
                  onChange={v => setCategoryFilter(v || undefined)}
                />
              </div>
              <div className="flex-1 overflow-auto pt-8px">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32px">
                    <Text
                      className="text-12px"
                      type="secondary"
                    >
                      {t('page.mdr.tflTemplateLibrary.empty')}
                    </Text>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2px">
                    {filtered.map(tpl => {
                      const isActive = selectedTemplate?.id === tpl.id;
                      const scopeTag = getScopeLevelTagProps(tpl.scopeLevel as ScopeLevel | undefined);
                      return (
                        <div
                          className={`flex cursor-pointer items-center justify-between rounded px-8px py-5px transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          key={tpl.id}
                          onClick={() => handleSelect(tpl)}
                        >
                          <Space size={6}>
                            <span style={{ color: typeColor[tpl.type], fontSize: 13 }}>{typeIconMap[tpl.type]}</span>
                            <span
                              className="truncate text-13px"
                              style={{ maxWidth: sidebarWidth - 100 }}
                            >
                              {tpl.name}
                            </span>
                          </Space>
                          <Space size={4}>
                            <Tag
                              className="m-0 text-10px"
                              style={{ fontSize: 10 }}
                              color={scopeTag.color}
                            >
                              {scopeTag.label}
                            </Tag>
                            <Tag
                              className="m-0 text-10px"
                              color="green"
                              style={{ fontSize: 10 }}
                            >
                              {categoryLabelMap[tpl.category]?.replace(/_/g, ' ') || tpl.category.replace(/_/g, ' ')}
                            </Tag>
                          </Space>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            {/* Resize handle */}
            <div
              style={{
                backgroundColor: isResizing ? '#1890ff' : 'transparent',
                cursor: 'col-resize',
                flexShrink: 0,
                transition: 'background-color 0.15s',
                width: 4,
                zIndex: 10
              }}
              onMouseDown={handleResizeStart}
              onMouseEnter={e => {
                if (!isResizing) e.currentTarget.style.backgroundColor = '#d9d9d9';
              }}
              onMouseLeave={e => {
                if (!isResizing) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            />

            {/* Collapse sidebar button */}
          </>
        )}

        {/* Center — Tabbed Editor Panel (collapsible) */}
        {editorCollapsed ? (
          <CollapsedRail tooltip="Expand editor" onExpand={() => setEditorCollapsed(false)} />
        ) : (
          <Card
            className="min-w-0 flex flex-col flex-1 overflow-hidden card-wrapper"
            size="small"
            styles={{ body: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' } }}
            variant="borderless"
            title={
              selectedTemplate ? (
                <div className="flex items-center justify-between">
                  <Space size={6}>
                    <span style={{ color: typeColor[selectedTemplate.type], fontSize: 14 }}>
                      {typeIconMap[selectedTemplate.type]}
                    </span>
                    <Text
                      className="text-13px"
                      strong
                    >
                      {selectedTemplate.name}
                    </Text>
                    <Tag
                      color={typeColor[selectedTemplate.type]}
                      style={{ fontSize: 10 }}
                    >
                      {selectedTemplate.type.toUpperCase()}
                    </Tag>
                  </Space>
                  <Space size={4}>
                    <CollapseButton tooltip="Collapse editor" onCollapse={() => setEditorCollapsed(true)} />
                    <Tooltip title="Duplicate">
                      <Button
                        icon={<CopyOutlined />}
                        size="small"
                        onClick={() => handleDuplicate(selectedTemplate.id)}
                      />
                    </Tooltip>
                    {canManage && (
                      <Popconfirm
                        title={t('page.mdr.tflTemplateLibrary.confirmDelete')}
                        onConfirm={() => handleDelete(selectedTemplate.id)}
                      >
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                        />
                      </Popconfirm>
                    )}
                  </Space>
                </div>
              ) : (
                <Text
                  className="text-12px"
                  type="secondary"
                >
                  Editor
                </Text>
              )
            }
        >
          <div className="flex-1 overflow-auto">
            {editingTemplate ? (
              <TemplateEditorPanel
                editable={canManage}
                template={editingTemplate}
                onChange={handleEditorChange}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <Empty
                  description={t('page.mdr.tflTemplateLibrary.selectToEdit')}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            )}
          </div>
        </Card>
        )}

        {/* Right — Live Preview */}
        <Card
          className="min-w-[340px] flex-1 overflow-hidden card-wrapper"
          size="small"
          styles={{ body: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' } }}
          variant="borderless"
          title={
            <Text
              className="text-12px"
              type="secondary"
            >
              Preview
            </Text>
          }
        >
          {editingTemplate ? (
            <InteractiveOutputEditor
              compact={false}
              editable={canManage}
              template={editingTemplate}
              onTemplateChange={handleEditorChange}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <Empty
                description={t('page.mdr.tflTemplateLibrary.selectToPreview')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      {renderImportModal()}
      {renderDirtyConfirm()}
    </div>
  );
};

export default TemplateLibrary;
