/**
 * TFL Designer - Template Selector
 *
 * Browse and apply templates from the template library. Rewritten to use Zustand stores instead of Redux.
 */
import { SearchOutlined, ThunderboltOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Input, Modal, Space, Tabs, Tag, Typography, Upload } from 'antd';
import { useMemo, useState } from 'react';

import { allTemplates, getTemplatesByType, searchTemplates } from '../../data/templates';
import { useFigureStore, useListingStore, useTableStore } from '../../stores';
import { createNewFigure } from '../../stores/figureStore';
import type { FigureShell, IARSDocument, ListingShell, TableShell, Template } from '../../types';
import { categoryOptions, generateId } from '../../types';
import { importAllTemplatesFromJSON } from '../../utils/templateUtils';

const { Text, Title } = Typography;
const { Search } = Input;

const TYPE_LABELS: Record<string, string> = {
  figure: 'Figure',
  listing: 'Listing',
  table: 'Table'
};

interface Props {
  onClose: () => void;
  open: boolean;
}

export default function TemplateSelector({ onClose, open }: Props) {
  const tableStore = useTableStore();
  const figureStore = useFigureStore();
  const listingStore = useListingStore();

  const [activeTab, setActiveTab] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [importedTemplates, setImportedTemplates] = useState<Template[]>([]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = [...allTemplates, ...importedTemplates];

    if (searchValue) {
      const lowerQuery = searchValue.toLowerCase();
      templates = templates.filter(
        t =>
          t.name.toLowerCase().includes(lowerQuery) ||
          t.description?.toLowerCase().includes(lowerQuery) ||
          t.category.toLowerCase().includes(lowerQuery)
      );
    }

    if (activeTab === 'tables') {
      templates = getTemplatesByType('table');
    } else if (activeTab === 'figures') {
      templates = getTemplatesByType('figure');
    } else if (activeTab === 'listings') {
      templates = getTemplatesByType('listing');
    }

    // Add Blank Templates at the top
    const blankTemplates: Template[] = [];
    if (!searchValue) {
      if (activeTab === 'all' || activeTab === 'tables') {
        blankTemplates.push({
          category: 'Other',
          // Will be initialized on apply
          createdAt: new Date().toISOString(),
          description: 'Start from an empty table shell and build from scratch.',
          id: 'blank_table',
          name: 'Blank Table',
          shell: {} as TableShell,
          type: 'table'
        });
      }
      if (activeTab === 'all' || activeTab === 'figures') {
        blankTemplates.push({
          category: 'Other',
          createdAt: new Date().toISOString(),
          description: 'Start from an empty figure shell and build from scratch.',
          id: 'blank_figure',
          name: 'Blank Figure',
          shell: {} as any,
          type: 'figure'
        });
      }
      if (activeTab === 'all' || activeTab === 'listings') {
        blankTemplates.push({
          category: 'Other',
          createdAt: new Date().toISOString(),
          description: 'Start from an empty listing shell and build from scratch.',
          id: 'blank_listing',
          name: 'Blank Listing',
          shell: {} as any,
          type: 'listing'
        });
      }
    }

    return [...blankTemplates, ...templates];
  }, [activeTab, searchValue]);

  // Counts by type
  const tableTemplates = useMemo(() => getTemplatesByType('table'), []);
  const figureTemplates = useMemo(() => getTemplatesByType('figure'), []);
  const listingTemplates = useMemo(() => getTemplatesByType('listing'), []);

  // Category tabs derived from categoryOptions
  const categoryTabs = useMemo(() => {
    const allTpls = [...allTemplates, ...importedTemplates];
    const categories = [...new Set(allTpls.map(t => t.category))];
    return categories.map(cat => {
      const opt = categoryOptions.find(o => o.value === cat);
      return {
        key: cat,
        label: `${opt?.label || cat.replace(/_/g, ' ')} (${allTpls.filter(t => t.category === cat).length})`
      };
    });
  }, [importedTemplates]);

  // Handle json upload
  const handleUpload = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const { templates } = await importAllTemplatesFromJSON(json);
      if (templates && templates.length > 0) {
        setImportedTemplates(prev => [...prev, ...templates]);
        window.$message?.success(`Imported ${templates.length} templates from JSON.`);
      } else {
        window.$message?.warning('No valid templates found in the JSON file.');
      }
    } catch (err: any) {
      window.$message?.error(`Failed to parse JSON file: ${err.message}`);
    }
    return false; // Prevent default upload behavior
  };

  // Handle apply template
  const handleApply = () => {
    if (!selectedTemplate) return;

    if (selectedTemplate.type === 'table') {
      let newTable: TableShell;
      if (selectedTemplate.id === 'blank_table') {
        newTable = {
          category: 'Other',
          dataset: 'ADSL',
          footer: {},
          id: generateId('table'),
          population: 'Safety',
          rows: [],
          shellNumber: 'Table X.X.X',
          statisticsSetId: '',
          title: 'New Table',
          treatmentArmSetId: ''
        };
      } else {
        const shell = selectedTemplate.shell as TableShell;
        newTable = {
          ...JSON.parse(JSON.stringify(shell)),
          id: generateId('table')
        };
      }
      tableStore.addTable(newTable);
      tableStore.setCurrentTable(newTable);
      figureStore.setCurrentFigure(null);
      listingStore.setCurrentListing(null);
      window.$message?.success('Table created from template');
    } else if (selectedTemplate.type === 'figure') {
      let newFigure: FigureShell;
      if (selectedTemplate.id === 'blank_figure') {
        newFigure = createNewFigure('Figure X.X.X');
      } else {
        const shell = selectedTemplate.shell as FigureShell;
        newFigure = {
          ...JSON.parse(JSON.stringify(shell)),
          id: generateId('figure')
        };
      }
      figureStore.addFigure(newFigure);
      figureStore.setCurrentFigure(newFigure);
      tableStore.setCurrentTable(null);
      listingStore.setCurrentListing(null);
      window.$message?.success('Figure created from template');
    } else if (selectedTemplate.type === 'listing') {
      let newListing: ListingShell;
      if (selectedTemplate.id === 'blank_listing') {
        newListing = {
          columns: [],
          dataset: 'ADAE',
          id: generateId('listing'),
          listingNumber: 'Listing X.X.X',
          pageSize: 20,
          population: 'Safety',
          title: 'New Listing'
        };
      } else {
        const shell = selectedTemplate.shell as ListingShell;
        newListing = {
          ...JSON.parse(JSON.stringify(shell)),
          id: generateId('listing')
        };
      }
      listingStore.addListing(newListing);
      listingStore.setCurrentListing(newListing);
      tableStore.setCurrentTable(null);
      figureStore.setCurrentFigure(null);
      window.$message?.success('Listing created from template');
    }

    setSelectedTemplate(null);
    handleClose();
  };

  // Handle close
  const handleClose = () => {
    setSelectedTemplate(null);
    setSearchValue('');
    setActiveTab('all');
    onClose();
  };

  // Category label helper
  const getCategoryLabel = (category: string) => {
    const opt = categoryOptions.find(o => o.value === category);
    return opt?.label || category.replace(/_/g, ' ');
  };

  // Template card component
  const TemplateCard = ({ template }: { template: Template }) => {
    const isSelected = selectedTemplate?.id === template.id;

    return (
      <Card
        hoverable
        className="mb-12px"
        size="small"
        style={{
          border: isSelected ? '2px solid #1890ff' : undefined,
          cursor: 'pointer'
        }}
        onClick={() => setSelectedTemplate(template)}
      >
        <Space
          className="w-full"
          direction="vertical"
          size="small"
        >
          <div className="w-full flex items-center justify-between">
            <Text
              strong
              className="text-13px"
            >
              {template.name}
            </Text>
            {template.id.startsWith('blank_') ? (
              <Tag color="purple">From Scratch</Tag>
            ) : (
              <Tag color={template.type === 'table' ? 'blue' : template.type === 'figure' ? 'green' : 'orange'}>
                {TYPE_LABELS[template.type] || template.type}
              </Tag>
            )}
          </div>
          {template.description && (
            <Text
              className="text-11px"
              type="secondary"
            >
              {template.description}
            </Text>
          )}
          <div className="flex gap-4px text-11px">
            <Tag>{getCategoryLabel(template.category)}</Tag>
            <Text
              className="text-10px"
              type="secondary"
            >
              {new Date(template.createdAt).toLocaleDateString()}
            </Text>
          </div>
        </Space>
      </Card>
    );
  };

  return (
    <Modal
      open={open}
      width={900}
      footer={
        <Space className="w-full justify-between">
          <Text type="secondary">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
          </Text>
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              disabled={!selectedTemplate}
              type="primary"
              onClick={handleApply}
            >
              Apply Template
            </Button>
          </Space>
        </Space>
      }
      title={
        <Space>
          <ThunderboltOutlined />
          <span>Template Library</span>
        </Space>
      }
      onCancel={handleClose}
    >
      {/* Search and Upload */}
      <div className="mb-16px flex gap-12px">
        <div className="flex-1">
          <Search
            allowClear
            placeholder="Search templates by name, description, or category..."
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
          />
        </div>
        <Upload
          accept=".json"
          beforeUpload={handleUpload}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />}>Import CDISC ARS</Button>
        </Upload>
      </div>

      {/* Type Filter Tabs */}
      <Tabs
        activeKey={activeTab}
        className="mb-16px"
        items={[
          { key: 'all', label: 'All Types' },
          { key: 'tables', label: `Tables (${tableTemplates.length})` },
          { key: 'figures', label: `Figures (${figureTemplates.length})` },
          { key: 'listings', label: `Listings (${listingTemplates.length})` }
        ]}
        onChange={setActiveTab}
      />

      {/* Category Filter (only when "all" type tab is active) */}
      {activeTab === 'all' && categoryTabs.length > 0 && (
        <Tabs
          activeKey={activeTab}
          className="mb-16px"
          items={categoryTabs}
          size="small"
          type="card"
          onChange={setActiveTab}
        />
      )}

      {/* Templates Grid */}
      <div className="max-h-500px overflow-y-auto pr-8px">
        {filteredTemplates.length === 0 ? (
          <div className="px-40px py-40px text-center text-gray-400">
            <Text type="secondary">No templates found matching your criteria.</Text>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-12px sm:grid-cols-2">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected Template Preview */}
      {selectedTemplate && (
        <>
          <Divider />
          <div className="rounded bg-gray-50 p-16px">
            <Title level={5}>Selected Template</Title>
            <Space
              className="w-full"
              direction="vertical"
              size="small"
            >
              <div>
                <Text strong>Name:</Text>
                <Text className="ml-8px">{selectedTemplate.name}</Text>
              </div>
              <div>
                <Text strong>Type:</Text>
                <Tag
                  className="ml-8px"
                  color={
                    selectedTemplate.type === 'table' ? 'blue' : selectedTemplate.type === 'figure' ? 'green' : 'orange'
                  }
                >
                  {TYPE_LABELS[selectedTemplate.type] || selectedTemplate.type}
                </Tag>
              </div>
              <div>
                <Text strong>Category:</Text>
                <Text className="ml-8px">{getCategoryLabel(selectedTemplate.category)}</Text>
              </div>
              <div>
                <Text strong>Description:</Text>
                <Text className="ml-8px">{selectedTemplate.description || '-'}</Text>
              </div>
              <div>
                <Text strong>Created:</Text>
                <Text className="ml-8px">{new Date(selectedTemplate.createdAt).toLocaleString()}</Text>
              </div>
            </Space>
          </div>
        </>
      )}
    </Modal>
  );
}
