/**
 * TFL Designer - Template Picker Modal
 *
 * Modal shown when creating a new shell at analysis level.
 * Shows study templates (from studyStore.studyTemplates) + built-in templates.
 * User selects a template OR starts blank.
 */
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

const { Text, Title } = Typography;
const { Search } = Input;

const DISPLAY_TYPE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'Table', label: 'Tables' },
  { key: 'Figure', label: 'Figures' },
  { key: 'Listing', label: 'Listings' },
];

const SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Templates' },
  { value: 'global', label: 'Global Templates' },
  { value: 'study', label: 'Study Templates' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function TemplatePickerModal({ open, onClose }: Props) {
  const studyTemplates = useStudyStore((s) => s.studyTemplates);
  const statisticsSets = useStudyStore((s) => s.statisticsSets);
  const tableStore = useTableStore();
  const figureStore = useFigureStore();
  const listingStore = useListingStore();

  const [activeTab, setActiveTab] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'global' | 'study'>('all');

  // Access global templates and initialize on mount
  const globalTemplates = useTemplateStore((s) => s.templates);
  const initTemplates = useTemplateStore((s) => s.initTemplates);

  useEffect(() => {
    initTemplates();
  }, [initTemplates]);

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
      statisticsSetId: t.statisticsSetId as string | undefined,
      version: t.version,
    }));

    return [...global, ...study];
  }, [globalTemplates, studyTemplates]);

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [selectedBlank, setSelectedBlank] = useState<string | null>(null);

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

  const getCategoryLabel = (cat: AnalysisCategory) =>
    categoryOptions.find((o) => o.value === cat)?.label ?? cat.replace(/_/g, ' ');

  const handleApply = () => {
    if (selectedBlank) {
      // Start blank
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
      // Clone from study template
      const schema = selectedTemplate.shellSchema;
      if (selectedTemplate.displayType === 'Table') {
        const shell = JSON.parse(JSON.stringify(schema)) as TableShell;
        shell.id = generateId('table');
        shell.statisticsSetId = (selectedTemplate.statisticsSetId as string) || shell.statisticsSetId || '';
        tableStore.addTable(shell);
        tableStore.setCurrentTable(shell);
        figureStore.setCurrentFigure(null);
        listingStore.setCurrentListing(null);
      } else if (selectedTemplate.displayType === 'Figure') {
        const shell = JSON.parse(JSON.stringify(schema)) as FigureShell;
        shell.id = generateId('figure');
        figureStore.addFigure(shell);
        figureStore.setCurrentFigure(shell);
        tableStore.setCurrentTable(null);
        listingStore.setCurrentListing(null);
      } else if (selectedTemplate.displayType === 'Listing') {
        const shell = JSON.parse(JSON.stringify(schema)) as ListingShell;
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

  const handleClose = () => {
    setSelectedTemplate(null);
    setSelectedBlank(null);
    setSearchValue('');
    setActiveTab('all');
    onClose();
  };

  const canApply = selectedTemplate !== null || selectedBlank !== null;

  return (
    <Modal
      title={
        <Space>
          <ThunderboltOutlined />
          <span>New Shell from Template</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={800}
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
    >
      {/* Start Blank Options */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>Start Blank</Text>
        <Space>
          {(['Table', 'Figure', 'Listing'] as const).map((type) => (
            <Card
              key={type}
              hoverable
              size="small"
              style={{
                width: 120,
                cursor: 'pointer',
                border: selectedBlank === type && !selectedTemplate ? '2px solid #1890ff' : undefined,
                textAlign: 'center',
              }}
              onClick={() => {
                setSelectedBlank(type);
                setSelectedTemplate(null);
              }}
            >
              <Tag color={type === 'Table' ? 'blue' : type === 'Figure' ? 'green' : 'orange'}>
                {type}
              </Tag>
            </Card>
          ))}
        </Space>
      </div>

      <Divider style={{ margin: '12px 0' }} />

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

      {/* Type filter tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={DISPLAY_TYPE_TABS}
        size="small"
        className="mb-12px"
      />

      {/* Study Templates Grid */}
      <div style={{ maxHeight: 350, overflowY: 'auto', paddingRight: 4 }}>
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
        )}
      </div>

      {/* Selected preview */}
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
    </Modal>
  );
}
