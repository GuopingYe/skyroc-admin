/**
 * TFL Designer - Template Picker Modal
 *
 * Modal shown when creating a new shell at analysis level. Shows templates from multiple sources:
 *
 * - Global Library (from shellLibraryStore, scopeLevel='global')
 * - TA Library (from shellLibraryStore, scopeLevel='ta')
 * - Study Library (from studyStore.studyTemplates) User selects a template OR starts blank.
 */
import { SearchOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Input, Modal, Select, Space, Tabs, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { useFigureStore, useListingStore, useShellLibraryStore, useStudyStore, useTableStore } from '../../stores';
import { createNewFigure } from '../../stores/figureStore';
import { categoryOptions, generateId } from '../../types';
import type { AnalysisCategory, FigureShell, ListingShell, TableShell } from '../../types';

const { Text, Title } = Typography;
const { Search } = Input;

const DISPLAY_TYPE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'Table', label: 'Tables' },
  { key: 'Figure', label: 'Figures' },
  { key: 'Listing', label: 'Listings' }
];

const SOURCE_FILTER_OPTIONS = [
  { label: 'All Sources', value: 'all' },
  { label: 'Global Library', value: 'global' },
  { label: 'TA Library', value: 'ta' },
  { label: 'Study Library', value: 'study' }
];

interface Props {
  onClose: () => void;
  open: boolean;
}

export default function TemplatePickerModal({ onClose, open }: Props) {
  const studyTemplates = useStudyStore(s => s.studyTemplates);
  const statisticsSets = useStudyStore(s => s.statisticsSets);
  const tableStore = useTableStore();
  const figureStore = useFigureStore();
  const listingStore = useListingStore();

  const [activeTab, setActiveTab] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'global' | 'study' | 'ta'>('all');

  // Access library templates (global/TA) from shellLibraryStore
  const shellLibraryTemplates = useShellLibraryStore(s => s.templates);

  interface TemplateItem {
    category: AnalysisCategory;
    displayType: 'Figure' | 'Listing' | 'Table';
    id: string;
    name: string;
    shellSchema: TableShell | FigureShell | ListingShell;
    source: 'global' | 'study' | 'ta';
    statisticsSetId?: string;
    version?: number;
  }

  // Combine library templates (global/TA) and study templates into unified list
  const allTemplates = useMemo<TemplateItem[]>(() => {
    // Library templates (global and TA) from shellLibraryStore
    const libraryTemplates = shellLibraryTemplates
      .filter(t => !t.isDeleted)
      .map(t => ({
        category: t.category,
        displayType: t.displayType,
        id: String(t.id),
        name: t.templateName,
        shellSchema: t.shellSchema,
        source: t.scopeLevel as 'global' | 'ta',
        statisticsSetId: t.statisticsSetId ? String(t.statisticsSetId) : undefined,
        version: t.version
      }));

    // Study templates from studyStore
    const study: TemplateItem[] = studyTemplates.map(t => ({
      category: t.category,
      displayType: t.displayType,
      id: String(t.id),
      name: t.templateName,
      shellSchema: t.shellSchema,
      source: 'study' as const,
      statisticsSetId: t.statisticsSetId ? String(t.statisticsSetId) : undefined,
      version: t.version
    }));

    return [...libraryTemplates, ...study];
  }, [shellLibraryTemplates, studyTemplates]);

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [selectedBlank, setSelectedBlank] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    let templates = allTemplates;

    // Filter by source
    if (sourceFilter === 'global') {
      templates = templates.filter(t => t.source === 'global');
    } else if (sourceFilter === 'ta') {
      templates = templates.filter(t => t.source === 'ta');
    } else if (sourceFilter === 'study') {
      templates = templates.filter(t => t.source === 'study');
    }

    // Filter by search
    if (searchValue) {
      const q = searchValue.toLowerCase();
      templates = templates.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }

    // Filter by display type tab
    if (activeTab !== 'all') {
      templates = templates.filter(t => t.displayType === activeTab);
    }

    return templates;
  }, [allTemplates, sourceFilter, searchValue, activeTab]);

  const getCategoryLabel = (cat: AnalysisCategory) =>
    categoryOptions.find(o => o.value === cat)?.label ?? cat.replace(/_/g, ' ');

  const handleApply = () => {
    if (selectedBlank) {
      // Start blank
      if (selectedBlank === 'Table') {
        const newTable: TableShell = {
          category: 'Demographics',
          dataset: 'ADSL',
          footer: { notes: [], source: '' },
          id: generateId('table'),
          population: 'Safety',
          rows: [],
          shellNumber: `Table 14.${tableStore.tables.length + 1}.1`,
          statisticsSetId: '',
          title: 'New Table',
          treatmentArmSetId: ''
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
      window.$message?.success(
        `Shell created from ${selectedTemplate.source === 'global' ? 'global' : selectedTemplate.source === 'ta' ? 'TA' : 'study'} template "${selectedTemplate.name}"`
      );
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
      open={open}
      width={800}
      footer={
        <Space className="w-full justify-between">
          <Text type="secondary">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
            {sourceFilter === 'all' && (
              <span>
                {' '}
                ({shellLibraryTemplates.filter(t => !t.isDeleted && t.scopeLevel === 'global').length} Global,{' '}
                {shellLibraryTemplates.filter(t => !t.isDeleted && t.scopeLevel === 'ta').length} TA,{' '}
                {studyTemplates.length} Study)
              </span>
            )}
          </Text>
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              disabled={!canApply}
              type="primary"
              onClick={handleApply}
            >
              Create Shell
            </Button>
          </Space>
        </Space>
      }
      title={
        <Space>
          <ThunderboltOutlined />
          <span>New Shell from Template</span>
        </Space>
      }
      onCancel={handleClose}
    >
      {/* Start Blank Options */}
      <div style={{ marginBottom: 16 }}>
        <Text
          strong
          style={{ display: 'block', marginBottom: 8 }}
        >
          Start Blank
        </Text>
        <Space>
          {(['Table', 'Figure', 'Listing'] as const).map(type => (
            <Card
              hoverable
              key={type}
              size="small"
              style={{
                border: selectedBlank === type && !selectedTemplate ? '2px solid #1890ff' : undefined,
                cursor: 'pointer',
                textAlign: 'center',
                width: 120
              }}
              onClick={() => {
                setSelectedBlank(type);
                setSelectedTemplate(null);
              }}
            >
              <Tag color={type === 'Table' ? 'blue' : type === 'Figure' ? 'green' : 'orange'}>{type}</Tag>
            </Card>
          ))}
        </Space>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Filter and Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <Select
          options={SOURCE_FILTER_OPTIONS}
          size="small"
          style={{ width: 150 }}
          value={sourceFilter}
          onChange={v => setSourceFilter(v as 'all' | 'global' | 'study' | 'ta')}
        />
        <Search
          allowClear
          placeholder="Search templates..."
          prefix={<SearchOutlined />}
          style={{ flex: 1 }}
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
        />
      </div>

      {/* Type filter tabs */}
      <Tabs
        activeKey={activeTab}
        className="mb-12px"
        items={DISPLAY_TYPE_TABS}
        size="small"
        onChange={setActiveTab}
      />

      {/* Study Templates Grid */}
      <div style={{ maxHeight: 350, overflowY: 'auto', paddingRight: 4 }}>
        {filteredTemplates.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <Text type="secondary">
              {sourceFilter === 'global' &&
              shellLibraryTemplates.filter(t => !t.isDeleted && t.scopeLevel === 'global').length === 0
                ? 'No global templates available.'
                : sourceFilter === 'ta' &&
                    shellLibraryTemplates.filter(t => !t.isDeleted && t.scopeLevel === 'ta').length === 0
                  ? 'No TA templates available.'
                  : sourceFilter === 'study' && studyTemplates.length === 0
                    ? 'No study templates defined yet. Add templates in Study Settings > Shell Templates.'
                    : 'No templates match your search.'}
            </Text>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
            {filteredTemplates.map(tpl => {
              const isSelected = selectedTemplate?.id === tpl.id;
              const ssName = tpl.statisticsSetId
                ? statisticsSets.find(s => s.id === tpl.statisticsSetId)?.name
                : undefined;
              return (
                <Card
                  hoverable
                  key={`${tpl.source}-${tpl.id}`}
                  size="small"
                  style={{
                    border: isSelected ? '2px solid #1890ff' : undefined,
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedTemplate(tpl);
                    setSelectedBlank(null);
                  }}
                >
                  <Space
                    direction="vertical"
                    size={4}
                    style={{ width: '100%' }}
                  >
                    <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
                      <Text
                        strong
                        style={{ fontSize: 13 }}
                      >
                        {tpl.name}
                      </Text>
                      <Tag
                        color={tpl.displayType === 'Table' ? 'blue' : tpl.displayType === 'Figure' ? 'green' : 'orange'}
                      >
                        {tpl.displayType}
                      </Tag>
                    </div>
                    <div>
                      <Tag color={tpl.source === 'global' ? 'geekblue' : tpl.source === 'ta' ? 'purple' : 'green'}>
                        {tpl.source === 'study' ? 'Study' : tpl.source === 'global' ? 'Global' : 'TA'}
                      </Tag>
                      <Tag style={{ fontSize: 11 }}>{getCategoryLabel(tpl.category)}</Tag>
                      {ssName && (
                        <Tag
                          color="purple"
                          style={{ fontSize: 11 }}
                        >
                          {ssName}
                        </Tag>
                      )}
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
            <Title
              level={5}
              style={{ marginTop: 0 }}
            >
              Selected: {selectedTemplate.name}
            </Title>
            <Space size="large">
              <span>
                <Text type="secondary">Source:</Text>{' '}
                <Tag
                  color={
                    selectedTemplate.source === 'global'
                      ? 'geekblue'
                      : selectedTemplate.source === 'ta'
                        ? 'purple'
                        : 'green'
                  }
                >
                  {selectedTemplate.source === 'study'
                    ? 'Study'
                    : selectedTemplate.source === 'global'
                      ? 'Global'
                      : 'TA'}
                </Tag>
              </span>
              <span>
                <Text type="secondary">Category:</Text> {getCategoryLabel(selectedTemplate.category)}
              </span>
              <span>
                <Text type="secondary">Type:</Text> {selectedTemplate.displayType}
              </span>
              {selectedTemplate.version && (
                <span>
                  <Text type="secondary">Version:</Text> v{selectedTemplate.version}
                </span>
              )}
            </Space>
          </div>
        </>
      )}
    </Modal>
  );
}
