/**
 * Template Editor Panel — Shared tabbed editor for Table/Figure/Listing templates.
 *
 * Renders type-specific tabs matching the TFL Designer's editing experience.
 * All sub-editors are props-driven (no direct store access), making this reusable
 * across both the Template Library and the TFL Designer.
 */
import {
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import React, { useCallback } from 'react';

import { useReferenceOptions } from '@/service/hooks/useReferenceData';

import AxesConfig from '../figure/AxesConfig';
import ChartTypeSelector from '../figure/ChartTypeSelector';
import SeriesConfig from '../figure/SeriesConfig';
import ListingColumnEditor from '../listing/ColumnEditor';
import ListingFilterConfig from '../listing/FilterConfig';
import ListingSortConfig from '../listing/SortConfig';

import { categoryOptions } from '../../types';
import type {
  AnalysisCategory,
  AxisConfig as AxisConfigType,
  ChartSeries,
  ChartType,
  FilterConfig,
  FigureShell,
  ListingColumn,
  ListingShell,
  SortConfig,
  TableFooter,
  TableShell,
  Template
} from '../../types';

const { Text } = Typography;

const POPULATION_DEFAULTS = [
  { label: 'Safety', value: 'Safety' },
  { label: 'ITT', value: 'ITT' },
  { label: 'FAS', value: 'FAS' },
  { label: 'PPS', value: 'PPS' },
  { label: 'Efficacy', value: 'Efficacy' },
  { label: 'All Enrolled', value: 'All Enrolled' }
];

/** Hook that returns population options from the API, falling back to defaults when unavailable */
function usePopulationOptions() {
  const { options: populationApiOptions } = useReferenceOptions('POPULATION');
  return populationApiOptions.length > 0 ? populationApiOptions : POPULATION_DEFAULTS;
}

// ==================== Props ====================

interface TemplateEditorPanelProps {
  editable?: boolean;
  onChange: (template: Template) => void;
  template: Template | null;
}

// ==================== Metadata Tab ====================

/** Common metadata fields shared across all template types */
const TemplateMetadataTab: React.FC<{
  editable: boolean;
  onChange: (updates: Partial<Template>) => void;
  template: Template;
}> = ({ editable, onChange, template }) => (
  <div className="flex flex-col gap-12px p-4px">
    <Form layout="vertical" size="small">
      <Form.Item label="Name" className="mb-8px">
        <Input
          disabled={!editable}
          value={template.name}
          onChange={e => onChange({ name: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="Description" className="mb-8px">
        <Input.TextArea
          autoSize={{ maxRows: 4, minRows: 2 }}
          disabled={!editable}
          value={template.description || ''}
          onChange={e => onChange({ description: e.target.value })}
        />
      </Form.Item>
      <div className="grid grid-cols-2 gap-12px">
        <Form.Item label="Category" className="mb-8px">
          <Select
            disabled={!editable}
            options={categoryOptions}
            value={template.category}
            onChange={v => onChange({ category: v as AnalysisCategory })}
          />
        </Form.Item>
        <Form.Item label="Type" className="mb-8px">
          <Input disabled value={template.type.toUpperCase()} />
        </Form.Item>
      </div>
    </Form>
  </div>
);

// ==================== Table Tabs ====================

const TableMetadataTab: React.FC<{
  editable: boolean;
  onChange: (updates: Partial<Template>) => void;
  template: Template;
}> = ({ editable, onChange, template }) => {
  const shell = template.shell as TableShell;
  const POPULATION_OPTIONS = usePopulationOptions();
  const handleShellUpdate = useCallback(
    (updates: Partial<TableShell>) => {
      onChange({ shell: { ...shell, ...updates } });
    },
    [shell, onChange]
  );

  return (
    <div className="flex flex-col gap-12px p-4px">
      <TemplateMetadataTab editable={editable} onChange={onChange} template={template} />
      <Card size="small" title="Table Settings">
        <Form layout="vertical" size="small">
          <div className="grid grid-cols-2 gap-12px">
            <Form.Item label="Shell Number" className="mb-8px">
              <Input
                disabled={!editable}
                value={shell.shellNumber}
                onChange={e => handleShellUpdate({ shellNumber: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="Population" className="mb-8px">
              <Select
                disabled={!editable}
                options={POPULATION_OPTIONS}
                value={shell.population}
                onChange={v => handleShellUpdate({ population: v })}
              />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-12px">
            <Form.Item label="Dataset" className="mb-8px">
              <Input
                disabled={!editable}
                value={shell.dataset}
                onChange={e => handleShellUpdate({ dataset: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="Title" className="mb-8px">
              <Input
                disabled={!editable}
                value={shell.title}
                onChange={e => handleShellUpdate({ title: e.target.value })}
              />
            </Form.Item>
          </div>
          <Form.Item label="Where Clause" className="mb-8px">
            <Input.TextArea
              autoSize={{ maxRows: 3, minRows: 1 }}
              disabled={!editable}
              placeholder="e.g. AGE >= 18 AND SEX='M'"
              value={shell.whereClause || ''}
              onChange={e => handleShellUpdate({ whereClause: e.target.value })}
            />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

const TableFooterTab: React.FC<{
  editable: boolean;
  onChange: (updates: Partial<Template>) => void;
  template: Template;
}> = ({ editable, onChange, template }) => {
  const shell = template.shell as TableShell;
  const footer: TableFooter = shell.footer || { notes: [], source: '' };

  const handleFooterUpdate = useCallback(
    (updates: Partial<TableFooter>) => {
      onChange({ shell: { ...shell, footer: { ...footer, ...updates } } });
    },
    [shell, footer, onChange]
  );

  const handleNoteChange = useCallback(
    (index: number, value: string) => {
      const newNotes = [...(footer.notes || [])];
      newNotes[index] = value;
      handleFooterUpdate({ notes: newNotes });
    },
    [footer.notes, handleFooterUpdate]
  );

  const handleAddNote = useCallback(() => {
    handleFooterUpdate({ notes: [...(footer.notes || []), ''] });
  }, [footer.notes, handleFooterUpdate]);

  const handleDeleteNote = useCallback(
    (index: number) => {
      const newNotes = (footer.notes || []).filter((_, i) => i !== index);
      handleFooterUpdate({ notes: newNotes });
    },
    [footer.notes, handleFooterUpdate]
  );

  return (
    <div className="flex flex-col gap-12px p-4px">
      <Form layout="vertical" size="small">
        <Form.Item label="Source" className="mb-8px">
          <Input
            disabled={!editable}
            value={footer.source || ''}
            onChange={e => handleFooterUpdate({ source: e.target.value })}
          />
        </Form.Item>
      </Form>
      <Card
        size="small"
        title={
          <div className="flex items-center justify-between">
            <span>Footer Notes</span>
            {editable && (
              <Button icon={<PlusOutlined />} size="small" type="dashed" onClick={handleAddNote}>
                Add Note
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4px">
          {(footer.notes || []).map((note, idx) => (
            <div key={idx} className="flex items-center gap-4px">
              <Input.TextArea
                autoSize={{ maxRows: 3, minRows: 1 }}
                disabled={!editable}
                value={note}
                onChange={e => handleNoteChange(idx, e.target.value)}
              />
              {editable && (
                <Button danger icon={<DeleteOutlined />} size="small" type="text" onClick={() => handleDeleteNote(idx)} />
              )}
            </div>
          ))}
          {(!footer.notes || footer.notes.length === 0) && (
            <Text className="text-12px text-gray-400">No footer notes</Text>
          )}
        </div>
      </Card>
    </div>
  );
};

const ProgrammingNotesTab: React.FC<{
  editable: boolean;
  onChange: (updates: Partial<Template>) => void;
  template: Template;
}> = ({ editable, onChange, template }) => {
  const shell = template.shell as TableShell | FigureShell | ListingShell;
  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ shell: { ...shell, programmingNotes: e.target.value } });
    },
    [shell, onChange]
  );

  return (
    <div className="p-4px">
      <Input.TextArea
        autoSize={{ maxRows: 20, minRows: 8 }}
        disabled={!editable}
        placeholder="Programming notes, instructions, or comments..."
        style={{ fontFamily: 'monospace' }}
        value={shell.programmingNotes || ''}
        onChange={handleNotesChange}
      />
    </div>
  );
};

// ==================== Figure Tabs ====================

const FigureMetadataTab: React.FC<{
  editable: boolean;
  onChange: (updates: Partial<Template>) => void;
  template: Template;
}> = ({ editable, onChange, template }) => {
  const shell = template.shell as FigureShell;
  const POPULATION_OPTIONS = usePopulationOptions();
  const handleShellUpdate = useCallback(
    (updates: Partial<FigureShell>) => {
      onChange({ shell: { ...shell, ...updates } });
    },
    [shell, onChange]
  );

  const handleChartTypeChange = useCallback(
    (type: ChartType) => {
      handleShellUpdate({ chartType: type });
    },
    [handleShellUpdate]
  );

  return (
    <div className="flex flex-col gap-12px p-4px">
      <TemplateMetadataTab editable={editable} onChange={onChange} template={template} />
      <Card size="small" title="Figure Settings">
        <Form layout="vertical" size="small">
          <div className="grid grid-cols-2 gap-12px">
            <Form.Item label="Figure Number" className="mb-8px">
              <Input
                disabled={!editable}
                value={shell.figureNumber}
                onChange={e => handleShellUpdate({ figureNumber: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="Population" className="mb-8px">
              <Select
                disabled={!editable}
                options={POPULATION_OPTIONS}
                value={shell.population}
                onChange={v => handleShellUpdate({ population: v })}
              />
            </Form.Item>
          </div>
          <Form.Item label="Title" className="mb-8px">
            <Input
              disabled={!editable}
              value={shell.title}
              onChange={e => handleShellUpdate({ title: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="Chart Type" className="mb-8px">
            <ChartTypeSelector disabled={!editable} value={shell.chartType} onChange={handleChartTypeChange} />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

const FigureAxesTab: React.FC<{
  editable: boolean;
  onChange: (updates: Partial<Template>) => void;
  template: Template;
}> = ({ editable, onChange, template }) => {
  const shell = template.shell as FigureShell;
  const handleShellUpdate = useCallback(
    (updates: Partial<FigureShell>) => {
      onChange({ shell: { ...shell, ...updates } });
    },
    [shell, onChange]
  );

  return (
    <AxesConfig
      disabled={!editable}
      xAxis={shell.xAxis}
      yAxis={shell.yAxis}
      onXAxisChange={config => handleShellUpdate({ xAxis: { ...shell.xAxis, ...config } })}
      onYAxisChange={config => handleShellUpdate({ yAxis: { ...shell.yAxis, ...config } })}
    />
  );
};

const FigureSeriesTab: React.FC<{
  editable: boolean;
  onChange: (updates: Partial<Template>) => void;
  template: Template;
}> = ({ editable, onChange, template }) => {
  const shell = template.shell as FigureShell;
  const series = shell.series || [];

  const handleShellUpdate = useCallback(
    (updates: Partial<FigureShell>) => {
      onChange({ shell: { ...shell, ...updates } });
    },
    [shell, onChange]
  );

  const handleAdd = useCallback(() => {
    const newSeries: ChartSeries = {
      color: undefined,
      id: `series_${Date.now()}`,
      name: `Series ${series.length + 1}`
    };
    handleShellUpdate({ series: [...series, newSeries] });
  }, [series, handleShellUpdate]);

  const handleDelete = useCallback(
    (id: string) => {
      handleShellUpdate({ series: series.filter(s => s.id !== id) });
    },
    [series, handleShellUpdate]
  );

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newSeries = [...series];
      const [removed] = newSeries.splice(fromIndex, 1);
      newSeries.splice(toIndex, 0, removed);
      handleShellUpdate({ series: newSeries });
    },
    [series, handleShellUpdate]
  );

  const handleUpdate = useCallback(
    (id: string, updates: Partial<ChartSeries>) => {
      handleShellUpdate({
        series: series.map(s => (s.id === id ? { ...s, ...updates } : s))
      });
    },
    [series, handleShellUpdate]
  );

  return (
    <SeriesConfig
      chartType={shell.chartType}
      disabled={!editable}
      series={series}
      onAdd={handleAdd}
      onDelete={handleDelete}
      onReorder={handleReorder}
      onUpdate={handleUpdate}
    />
  );
};

// ==================== Listing Tabs ====================

const ListingMetadataTab: React.FC<{
  editable: boolean;
  onChange: (updates: Partial<Template>) => void;
  template: Template;
}> = ({ editable, onChange, template }) => {
  const shell = template.shell as ListingShell;
  const POPULATION_OPTIONS = usePopulationOptions();
  const handleShellUpdate = useCallback(
    (updates: Partial<ListingShell>) => {
      onChange({ shell: { ...shell, ...updates } });
    },
    [shell, onChange]
  );

  return (
    <div className="flex flex-col gap-12px p-4px">
      <TemplateMetadataTab editable={editable} onChange={onChange} template={template} />
      <Card size="small" title="Listing Settings">
        <Form layout="vertical" size="small">
          <div className="grid grid-cols-2 gap-12px">
            <Form.Item label="Listing Number" className="mb-8px">
              <Input
                disabled={!editable}
                value={shell.listingNumber}
                onChange={e => handleShellUpdate({ listingNumber: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="Population" className="mb-8px">
              <Select
                disabled={!editable}
                options={POPULATION_OPTIONS}
                value={shell.population}
                onChange={v => handleShellUpdate({ population: v })}
              />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-12px">
            <Form.Item label="Dataset" className="mb-8px">
              <Input
                disabled={!editable}
                value={shell.dataset}
                onChange={e => handleShellUpdate({ dataset: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="Title" className="mb-8px">
              <Input
                disabled={!editable}
                value={shell.title}
                onChange={e => handleShellUpdate({ title: e.target.value })}
              />
            </Form.Item>
          </div>
          <Form.Item label="Where Clause" className="mb-8px">
            <Input.TextArea
              autoSize={{ maxRows: 3, minRows: 1 }}
              disabled={!editable}
              placeholder="e.g. AGE >= 18 AND SEX='M'"
              value={shell.whereClause || ''}
              onChange={e => handleShellUpdate({ whereClause: e.target.value })}
            />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

const ListingColumnsTab: React.FC<{
  editable: boolean;
  onChange: (updates: Partial<Template>) => void;
  template: Template;
}> = ({ editable, onChange, template }) => {
  const shell = template.shell as ListingShell;
  const columns = shell.columns || [];

  const handleColumnsChange = useCallback(
    (newColumns: ListingColumn[]) => {
      onChange({ shell: { ...shell, columns: newColumns } });
    },
    [shell, onChange]
  );

  return (
    <ListingColumnEditor
      columns={columns}
      disabled={!editable}
      displayId={shell.id}
      onChange={handleColumnsChange}
    />
  );
};

const ListingSortTab: React.FC<{
  editable: boolean;
  onChange: (updates: Partial<Template>) => void;
  template: Template;
}> = ({ editable, onChange, template }) => {
  const shell = template.shell as ListingShell;
  const columns = (shell.columns || []).map(c => ({ id: c.id, label: c.label, name: c.name || c.label }));
  const sortRules = shell.sortBy || [];

  const handleShellUpdate = useCallback(
    (updates: Partial<ListingShell>) => {
      onChange({ shell: { ...shell, ...updates } });
    },
    [shell, onChange]
  );

  return (
    <ListingSortConfig
      columns={columns}
      disabled={!editable}
      displayId={shell.id}
      sortRules={sortRules}
      onAdd={() => {
        const newSort: SortConfig = {
          columnId: columns[0]?.id || '',
          order: 'asc',
          priority: sortRules.length + 1
        };
        handleShellUpdate({ sortBy: [...sortRules, newSort] });
      }}
      onDelete={index => {
        handleShellUpdate({ sortBy: sortRules.filter((_, i) => i !== index) });
      }}
      onReorder={(from, to) => {
        const newSorts = [...sortRules];
        const [removed] = newSorts.splice(from, 1);
        newSorts.splice(to, 0, removed);
        handleShellUpdate({ sortBy: newSorts });
      }}
      onUpdate={(index, updates) => {
        const newSorts = sortRules.map((s, i) => (i === index ? { ...s, ...updates } : s));
        handleShellUpdate({ sortBy: newSorts });
      }}
    />
  );
};

const ListingFilterTab: React.FC<{
  editable: boolean;
  onChange: (updates: Partial<Template>) => void;
  template: Template;
}> = ({ editable, onChange, template }) => {
  const shell = template.shell as ListingShell;
  const columns = (shell.columns || []).map(c => ({ id: c.id, label: c.label, name: c.name || c.label }));
  const filters = shell.filter || [];

  const handleShellUpdate = useCallback(
    (updates: Partial<ListingShell>) => {
      onChange({ shell: { ...shell, ...updates } });
    },
    [shell, onChange]
  );

  return (
    <ListingFilterConfig
      columns={columns}
      disabled={!editable}
      displayId={shell.id}
      filters={filters}
      onAdd={() => {
        const newFilter: FilterConfig = {
          columnId: columns[0]?.id || '',
          operator: 'eq',
          value: ''
        };
        handleShellUpdate({ filter: [...filters, newFilter] });
      }}
      onDelete={index => {
        handleShellUpdate({ filter: filters.filter((_, i) => i !== index) });
      }}
      onUpdate={(index, updates) => {
        const newFilters = filters.map((f, i) => (i === index ? { ...f, ...updates } : f));
        handleShellUpdate({ filter: newFilters });
      }}
    />
  );
};

// ==================== Main Component ====================

const TemplateEditorPanel: React.FC<TemplateEditorPanelProps> = ({ editable = true, onChange, template }) => {
  // Adapter: sub-tabs call onChange(updates: Partial<Template>), panel's onChange expects full Template
  const handleChange = useCallback(
    (updates: Partial<Template>) => {
      if (!template) return;
      onChange({ ...template, ...updates } as Template);
    },
    [onChange, template]
  );

  if (!template) {
    return (
      <div className="h-full flex items-center justify-center">
        <Text type="secondary">Select a template to edit</Text>
      </div>
    );
  }

  const tabItems = getTabItems(template, editable, handleChange);

  return (
    <Tabs
      defaultActiveKey="metadata"
      size="small"
      type="card"
      items={tabItems}
      className="h-full"
    />
  );
};

function getTabItems(template: Template, editable: boolean, onChange: (updates: Partial<Template>) => void) {
  const metadataTab = {
    children: <TemplateMetadataTab editable={editable} onChange={onChange} template={template} />,
    key: 'metadata',
    label: 'Metadata'
  };

  const notesTab = {
    children: <ProgrammingNotesTab editable={editable} onChange={onChange} template={template} />,
    key: 'notes',
    label: 'Notes'
  };

  switch (template.type) {
    case 'table':
      return [
        {
          children: <TableMetadataTab editable={editable} onChange={onChange} template={template} />,
          key: 'metadata',
          label: 'Metadata'
        },
        {
          children: <TableFooterTab editable={editable} onChange={onChange} template={template} />,
          key: 'footer',
          label: 'Footer'
        },
        notesTab
      ];

    case 'figure':
      return [
        {
          children: <FigureMetadataTab editable={editable} onChange={onChange} template={template} />,
          key: 'metadata',
          label: 'Metadata'
        },
        {
          children: <FigureAxesTab editable={editable} onChange={onChange} template={template} />,
          key: 'axes',
          label: 'Axes'
        },
        {
          children: <FigureSeriesTab editable={editable} onChange={onChange} template={template} />,
          key: 'series',
          label: 'Series'
        },
        notesTab
      ];

    case 'listing':
      return [
        {
          children: <ListingMetadataTab editable={editable} onChange={onChange} template={template} />,
          key: 'metadata',
          label: 'Metadata'
        },
        {
          children: <ListingColumnsTab editable={editable} onChange={onChange} template={template} />,
          key: 'columns',
          label: 'Columns'
        },
        {
          children: <ListingSortTab editable={editable} onChange={onChange} template={template} />,
          key: 'sort',
          label: 'Sort'
        },
        {
          children: <ListingFilterTab editable={editable} onChange={onChange} template={template} />,
          key: 'filter',
          label: 'Filter'
        },
        notesTab
      ];

    default:
      return [metadataTab, notesTab];
  }
}

export default TemplateEditorPanel;
