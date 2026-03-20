/**
 * TFL Template Library — Standalone page under /mdr/
 *
 * Three-column layout matching TFL Designer pattern:
 * - Left sidebar: Template list with search, type filter, category selector
 * - Center: Template metadata (name, type, category, description, shell config)
 * - Right: Live preview of the selected template
 *
 * Features:
 * - Import templates from reference JSON files
 * - Admin can edit templates
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TableOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  SearchOutlined,
  AppstoreOutlined,
  ImportOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  Card,
  Input,
  Segmented,
  Button,
  Space,
  Typography,
  Tag,
  Empty,
  Popconfirm,
  Select,
  Breadcrumb,
  Tabs,
  message,
  Modal,
  Upload,
  Drawer,
  Tooltip,
} from 'antd';
import { useTranslation } from 'react-i18next';

import { useTemplateStore, categoryOptions, InteractiveOutputEditor } from '@/features/tfl-designer';
import type { Template, TableShell, ListingShell, FigureShell } from '@/features/tfl-designer';
import { useAuth } from '@/features/auth/auth';
import { importARSJSONToTemplates } from '@/features/tfl-designer';

const { Text, Title } = Typography;

type TypeFilter = 'all' | 'table' | 'figure' | 'listing';

const categoryLabelMap: Record<string, string> = {};
categoryOptions.forEach((opt) => {
  categoryLabelMap[opt.value] = opt.label;
});

const typeColor: Record<string, string> = { table: '#1890ff', figure: '#52c41a', listing: '#722ed1' };

const typeIconMap: Record<string, React.ReactNode> = {
  table: <TableOutlined />,
  figure: <BarChartOutlined />,
  listing: <UnorderedListOutlined />,
};

// ==================== Route handle ====================

export const handle = {
  i18nKey: 'route.(base)_mdr_tfl-template-library',
  icon: 'mdi:bookshelf',
  order: 6,
  title: 'Template Library',
};

// ==================== Main Component ====================

const TemplateLibrary: React.FC = () => {
  const { t } = useTranslation();
  const { hasAuth } = useAuth();
  const canManage = hasAuth('R_ADMIN') || hasAuth('R_SUPER');

  const templates = useTemplateStore((s) => s.templates);
  const initTemplates = useTemplateStore((s) => s.initTemplates);
  const selectedTemplate = useTemplateStore((s) => s.selectedTemplate);
  const selectTemplate = useTemplateStore((s) => s.selectTemplate);
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate);
  const duplicateTemplate = useTemplateStore((s) => s.duplicateTemplate);
  const updateTemplate = useTemplateStore((s) => s.updateTemplate);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [importedTemplates, setImportedTemplates] = useState<Template[]>([]);
  const [activeConfigTab, setActiveConfigTab] = useState<'rows' | 'footer' | null>(null);

  useEffect(() => { initTemplates(); }, [initTemplates]);

  // Load reference templates on mount
  useEffect(() => {
    loadReferenceTemplates();
  }, []);

  // Load templates from reference JSON files
  const loadReferenceTemplates = useCallback(async () => {
    try {
      const refFiles = [
        '/examples/tfldesigner/references/export 1.json',
        '/examples/tfldesigner/references/export 2.json',
        '/examples/tfldesigner/references/export 3.json',
        '/examples/tfldesigner/references/export 4.json',
      ];

      const allLoaded: Template[] = [];

      for (const filePath of refFiles) {
        try {
          const response = await fetch(filePath);
          if (response.ok) {
            const json = await response.json();
            const imported = importARSJSONToTemplates(json);
            allLoaded.push(...imported);
          }
        } catch (err) {
          console.warn(`Could not load ${filePath}:`, err);
        }
      }

      if (allLoaded.length > 0) {
        setImportedTemplates(allLoaded);
        message.success(`Loaded ${allLoaded.length} reference templates`);
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
    [sidebarWidth],
  );

  const filtered = useMemo(() => {
    let list = allTemplatesCombined;
    if (typeFilter !== 'all') list = list.filter((tp) => tp.type === typeFilter);
    if (categoryFilter) list = list.filter((tp) => tp.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((tp) => tp.name.toLowerCase().includes(q) || tp.description?.toLowerCase().includes(q));
    }
    return list;
  }, [allTemplatesCombined, typeFilter, categoryFilter, search]);

  const typeCounts = useMemo(
    () => ({
      all: allTemplatesCombined.length,
      table: allTemplatesCombined.filter((tp) => tp.type === 'table').length,
      figure: allTemplatesCombined.filter((tp) => tp.type === 'figure').length,
      listing: allTemplatesCombined.filter((tp) => tp.type === 'listing').length,
    }),
    [allTemplatesCombined],
  );

  const categories = useMemo(() => {
    const cats = new Set(allTemplatesCombined.map((tp) => tp.category));
    return Array.from(cats).map((c) => ({ value: c, label: categoryLabelMap[c] || c }));
  }, [allTemplatesCombined]);

  const handleSelect = useCallback((tpl: Template) => {
    selectTemplate(tpl);
    setActiveConfigTab(null);
  }, [selectTemplate]);

  const handleDelete = useCallback(
    (id: string) => { deleteTemplate(id); message.success(t('page.mdr.tflTemplateLibrary.deleteSuccess')); },
    [deleteTemplate, t],
  );

  const handleDuplicate = useCallback(
    (id: string) => { duplicateTemplate(id); message.success(t('page.mdr.tflTemplateLibrary.duplicateSuccess')); },
    [duplicateTemplate, t],
  );

  const handleUse = useCallback(
    (tpl: Template) => { selectTemplate(tpl); message.info(t('page.mdr.tflTemplateLibrary.useHint')); },
    [selectTemplate, t],
  );

  // Handle file import
  const handleFileImport = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const imported = importARSJSONToTemplates(json);
      if (imported.length > 0) {
        setImportedTemplates(prev => [...prev, ...imported]);
        message.success(`Imported ${imported.length} templates from ${file.name}`);
      } else {
        message.warning(`No valid templates found in ${file.name}`);
      }
    } catch (error) {
      message.error(`Failed to import ${file.name}: ${error}`);
    }
    setImportModalOpen(false);
  }, []);

  // Handle edit
  const handleEdit = useCallback((tpl: Template) => {
    setEditingTemplate(tpl);
    setEditDrawerOpen(true);
  }, []);

  // ==================== Preview ====================

  // Handle template changes from TemplateEditor
  const handleTemplateChange = useCallback((updatedTemplate: Template) => {
    const inStore = templates.some(t => t.id === updatedTemplate.id);
    if (inStore) {
      updateTemplate(updatedTemplate.id, updatedTemplate);
    } else {
      setImportedTemplates(prev =>
        prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t)
      );
    }
    // Also update selectedTemplate
    selectTemplate(updatedTemplate);
  }, [templates, updateTemplate, selectTemplate]);

  const renderPreview = () => {
    if (!selectedTemplate) {
      return (
        <div className="flex h-full items-center justify-center">
          <Empty description={t('page.mdr.tflTemplateLibrary.selectToPreview')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    // Use InteractiveOutputEditor for WYSIWYG editing
    return (
      <InteractiveOutputEditor
        template={selectedTemplate}
        onTemplateChange={handleTemplateChange}
        editable={true}
        compact={false}
      />
    );
  };

  // ==================== Shell Config Visualization ====================

  const renderShellConfigVisualization = () => {
    if (!selectedTemplate) return null;
    const shell = selectedTemplate.shell as any;

    if (selectedTemplate.type === 'table') {
      return renderTableShellConfig(selectedTemplate.shell as TableShell);
    }
    if (selectedTemplate.type === 'figure') {
      return renderFigureShellConfig(selectedTemplate.shell as FigureShell);
    }
    if (selectedTemplate.type === 'listing') {
      return renderListingShellConfig(selectedTemplate.shell as ListingShell);
    }
    return null;
  };

  const renderTableShellConfig = (shell: TableShell) => (
    <div className="flex flex-col gap-8px">
      <Card size="small" title="Header Configuration">
        <div className="grid grid-cols-3 gap-4 text-12px">
          <div><span className="text-gray-500">Shell #:</span> <span className="ml-1 font-medium">{shell.shellNumber}</span></div>
          <div><span className="text-gray-500">Dataset:</span> <span className="ml-1 font-medium">{shell.dataset}</span></div>
          <div><span className="text-gray-500">Population:</span> <span className="ml-1 font-medium">{shell.population}</span></div>
        </div>
      </Card>
      <Card size="small" title={<div className="flex items-center justify-between"><span>Rows ({shell.rows?.length || 0})</span><a onClick={() => setActiveConfigTab(activeConfigTab === 'rows' ? null : 'rows')}><SettingOutlined /></a></div>}>
        <div className="max-h-48 overflow-auto">
          {activeConfigTab === 'rows' ? (
            <div className="flex flex-col gap-1">
              {(shell.rows || []).slice(0, 10).map((row, idx) => (
                <div key={`${row.id}_${idx}`} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
                  <span className="text-gray-400 w-4">{idx + 1}.</span>
                  <span className="text-12px" style={{ paddingLeft: row.level * 12 }}>{row.label}</span>
                  {row.variable && <Tag className="ml-auto" color="blue" style={{ fontSize: 10 }}>{row.variable}</Tag>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-11px text-gray-500">Click settings icon to configure rows</div>
          )}
        </div>
      </Card>
      <Card size="small" title={<div className="flex items-center justify-between"><span>Footer Notes</span><a onClick={() => setActiveConfigTab(activeConfigTab === 'footer' ? null : 'footer')}><SettingOutlined /></a></div>}>
        <div className="max-h-32 overflow-auto">
          {shell.footer?.notes?.slice(0, 5).map((note, idx) => (
            <div key={`footer_${idx}`} className="text-11px text-gray-600 py-1">{note}</div>
          ))}
          {!shell.footer?.notes?.length && <div className="text-11px text-gray-400">No footer notes</div>}
        </div>
      </Card>
    </div>
  );

  const renderFigureShellConfig = (shell: FigureShell) => (
    <div className="flex flex-col gap-8px">
      <Card size="small" title="Figure Configuration">
        <div className="grid grid-cols-2 gap-4 text-12px">
          <div><span className="text-gray-500">Figure #:</span> <span className="ml-1 font-medium">{shell.figureNumber}</span></div>
          <div><span className="text-gray-500">Chart Type:</span> <Tag className="ml-1" color="purple">{shell.chartType}</Tag></div>
          <div><span className="text-gray-500">Population:</span> <span className="ml-1 font-medium">{shell.population}</span></div>
          <div><span className="text-gray-500">Series:</span> <span className="ml-1 font-medium">{shell.series?.length || 0}</span></div>
        </div>
      </Card>
      <Card size="small" title="Axes">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-12px">
            <div className="mb-1 font-medium text-gray-600">X-Axis</div>
            <div className="text-gray-500">Label: {shell.xAxis?.label || '-'}</div>
            <div className="text-gray-500">Type: {shell.xAxis?.type || '-'}</div>
          </div>
          <div className="text-12px">
            <div className="mb-1 font-medium text-gray-600">Y-Axis</div>
            <div className="text-gray-500">Label: {shell.yAxis?.label || '-'}</div>
            <div className="text-gray-500">Type: {shell.yAxis?.type || '-'}</div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderListingShellConfig = (shell: ListingShell) => (
    <div className="flex flex-col gap-8px">
      <Card size="small" title="Listing Configuration">
        <div className="grid grid-cols-3 gap-4 text-12px">
          <div><span className="text-gray-500">Listing #:</span> <span className="ml-1 font-medium">{shell.listingNumber}</span></div>
          <div><span className="text-gray-500">Dataset:</span> <span className="ml-1 font-medium">{shell.dataset}</span></div>
          <div><span className="text-gray-500">Population:</span> <span className="ml-1 font-medium">{shell.population}</span></div>
        </div>
      </Card>
      <Card size="small" title={<span>Columns ({shell.columns?.length || 0})</span>}>
        <div className="max-h-48 overflow-auto">
          <div className="flex flex-wrap gap-2">
            {(shell.columns || []).slice(0, 8).map((col) => (
              <Tag key={col.id} color="blue" style={{ fontSize: 11 }}>{col.label}</Tag>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );

  // ==================== Metadata ====================

  const renderMetadata = () => {
    if (!selectedTemplate) {
      return (
        <div className="flex h-full items-center justify-center">
          <Empty description={t('page.mdr.tflTemplateLibrary.selectToEdit')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }
    const tpl = selectedTemplate;
    return (
      <div className="flex h-full flex-col gap-8px">
        <div className="flex items-center justify-between">
          <Breadcrumb items={[{ title: <Text type="secondary">{tpl.type.toUpperCase()}</Text> }, { title: <Text strong>{tpl.name}</Text> }]} />
          <Space>
            {canManage && (
              <Tooltip title="Edit Template">
                <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(tpl)} />
              </Tooltip>
            )}
            <Tooltip title="Duplicate">
              <Button size="small" icon={<CopyOutlined />} onClick={() => handleDuplicate(tpl.id)} />
            </Tooltip>
            {canManage && (
              <Popconfirm title={t('page.mdr.tflTemplateLibrary.confirmDelete')} onConfirm={() => handleDelete(tpl.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
            <Button size="small" type="primary" onClick={() => handleUse(tpl)}>{t('page.mdr.tflTemplateLibrary.use')}</Button>
          </Space>
        </div>
        <Tabs
          defaultActiveKey="basicInfo"
          type="card"
          size="small"
          items={[
            {
              key: 'basicInfo',
              label: t('page.mdr.tflDesigner.tableMeta.basicInfo'),
              children: (
                <div className="flex flex-col gap-8px p-2">
                  <Card size="small">
                    <div className="grid grid-cols-2 gap-8px">
                      <div><Text type="secondary" className="text-11px">Name</Text><div className="mt-1 text-13px font-medium">{tpl.name}</div></div>
                      <div><Text type="secondary" className="text-11px">Type</Text><div className="mt-1"><Tag color={typeColor[tpl.type]}>{tpl.type.toUpperCase()}</Tag></div></div>
                      <div><Text type="secondary" className="text-11px">Category</Text><div className="mt-1"><Tag color="blue">{categoryLabelMap[tpl.category] || tpl.category}</Tag></div></div>
                      <div><Text type="secondary" className="text-11px">Created</Text><div className="mt-1 text-13px">{tpl.createdAt}</div></div>
                    </div>
                  </Card>
                  <Card size="small" title={t('page.mdr.tflTemplateLibrary.description')}>
                    <Text className="text-13px">{tpl.description || '-'}</Text>
                  </Card>
                </div>
              ),
            },
            {
              key: 'shellConfig',
              label: 'Shell Config',
              children: renderShellConfigVisualization(),
            },
          ]}
        />
      </div>
    );
  };

  // ==================== Import Modal ====================

  const renderImportModal = () => (
    <Modal
      title="Import Templates"
      open={importModalOpen}
      onCancel={() => setImportModalOpen(false)}
      footer={[
        <Button key="cancel" onClick={() => setImportModalOpen(false)}>
          Cancel
        </Button>,
      ]}
    >
      <div className="p-4">
        <Upload.Dragger
          accept=".json"
          multiple
          beforeUpload={(file) => {
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

  // ==================== Edit Drawer ====================

  const renderEditDrawer = () => (
    <Drawer
      title="Edit Template"
      open={editDrawerOpen}
      onClose={() => { setEditDrawerOpen(false); setEditingTemplate(null); }}
      width={900}
      styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column' } }}
    >
      {editingTemplate && (
        <InteractiveOutputEditor
          template={editingTemplate}
          onTemplateChange={(updated: Template) => {
            setEditingTemplate(updated);
          }}
          editable={true}
          compact={false}
        />
      )}
      <div className="mt-4 flex justify-end gap-2 pt-4 border-t">
        <Button onClick={() => { setEditDrawerOpen(false); setEditingTemplate(null); }}>
          Cancel
        </Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={() => {
          if (editingTemplate) {
            handleTemplateChange(editingTemplate);
            message.success('Template saved successfully');
            setEditDrawerOpen(false);
            setEditingTemplate(null);
          }
        }}>
          Save Changes
        </Button>
      </div>
    </Drawer>
  );

  // ==================== Main Layout ====================

  return (
    <div className="h-full flex flex-col gap-8px overflow-hidden">
      {/* Toolbar */}
      <Card className="card-wrapper flex-shrink-0" size="small" variant="borderless" styles={{ body: { padding: '8px 12px' } }}>
        <div className="flex items-center justify-between">
          <Space size="small">
            <AppstoreOutlined className="text-18px text-purple-600" />
            <Title className="m-0" level={5}>{t('page.mdr.tflTemplateLibrary.title')}</Title>
            <Text type="secondary" className="text-12px">{typeCounts.all} {t('page.mdr.tflTemplateLibrary.templates')}</Text>
          </Space>
          <Space>
            <Button icon={<ImportOutlined />} onClick={() => setImportModalOpen(true)}>
              {t('page.mdr.tflTemplateLibrary.import')}
            </Button>
            {canManage && (
              <Button onClick={loadReferenceTemplates}>
                Reload References
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* Three-column layout */}
      <div className="min-h-0 flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <Card className="flex flex-shrink-0 flex-col overflow-hidden card-wrapper" style={{ width: sidebarWidth }} size="small" variant="borderless">
          <div className="mb-8px">
            <Input prefix={<SearchOutlined />} size="small" placeholder={t('page.mdr.tflTemplateLibrary.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} allowClear />
          </div>
          <Segmented block size="small" value={typeFilter} options={[
            { label: <Space size={2}>All<sup>{typeCounts.all}</sup></Space>, value: 'all' },
            { label: <Space size={2}>T<sup>{typeCounts.table}</sup></Space>, value: 'table' },
            { label: <Space size={2}>F<sup>{typeCounts.figure}</sup></Space>, value: 'figure' },
            { label: <Space size={2}>L<sup>{typeCounts.listing}</sup></Space>, value: 'listing' },
          ]} onChange={(v) => setTypeFilter(v as TypeFilter)} />
          <div className="mt-8px">
            <Select size="small" placeholder={t('page.mdr.tflTemplateLibrary.categoryFilter')} value={categoryFilter || undefined} allowClear onChange={(v) => setCategoryFilter(v || undefined)} options={categories} style={{ width: '100%' }} popupMatchSelectWidth={false} />
          </div>
          <div className="flex-1 overflow-auto pt-8px">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32px"><Text type="secondary" className="text-12px">{t('page.mdr.tflTemplateLibrary.empty')}</Text></div>
            ) : (
              <div className="flex flex-col gap-2px">
                {filtered.map((tpl) => {
                  const isActive = selectedTemplate?.id === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      className={`flex cursor-pointer items-center justify-between rounded px-8px py-5px transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      onClick={() => handleSelect(tpl)}
                    >
                      <Space size={6}>
                        <span style={{ color: typeColor[tpl.type], fontSize: 13 }}>{typeIconMap[tpl.type]}</span>
                        <span className="text-13px truncate" style={{ maxWidth: sidebarWidth - 100 }}>{tpl.name}</span>
                      </Space>
                      <Tag className="m-0 text-10px" color="green" style={{ fontSize: 10 }}>
                        {categoryLabelMap[tpl.category]?.replace(/_/g, ' ') || tpl.category.replace(/_/g, ' ')}
                      </Tag>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Resize handle */}
        <div
          onMouseDown={handleResizeStart}
          style={{ width: 4, cursor: 'col-resize', backgroundColor: isResizing ? '#1890ff' : 'transparent', transition: 'background-color 0.15s', flexShrink: 0, zIndex: 10 }}
          onMouseEnter={(e) => { if (!isResizing) (e.currentTarget.style.backgroundColor = '#d9d9d9'); }}
          onMouseLeave={(e) => { if (!isResizing) (e.currentTarget.style.backgroundColor = 'transparent'); }}
        />

        {/* Center — Metadata */}
        <Card className="min-w-0 flex flex-1 flex-col overflow-hidden card-wrapper" size="small" variant="borderless">
          {renderMetadata()}
        </Card>

        {/* Right — Preview */}
        <Card className="min-w-[340px] flex-1 overflow-hidden card-wrapper" size="small" variant="borderless" title={<Text type="secondary" className="text-12px">Preview</Text>}>
          {renderPreview()}
        </Card>
      </div>

      {/* Modals and Drawers */}
      {renderImportModal()}
      {renderEditDrawer()}
    </div>
  );
};

export default TemplateLibrary;
