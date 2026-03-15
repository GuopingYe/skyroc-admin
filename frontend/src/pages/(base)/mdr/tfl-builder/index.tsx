/**
 * TFL Builder - Professional WYSIWYG Editor
 *
 * 基于 CDISC ARS 标准的专业 TFL Mock Shell 编辑器
 *
 * 四区域布局：
 *
 * - 顶部工具栏：富文本排版控制
 * - 左侧边栏：Outputs Tree (目录树)
 * - 中间画布：WYSIWYG 编辑器 + 块级选中
 * - 右侧面板：动态属性面板
 */
import {
  BoldOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileAddOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FolderOutlined,
  FunctionOutlined,
  ItalicOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MinusOutlined,
  OrderedListOutlined,
  PlusOutlined,
  RedoOutlined,
  SaveOutlined,
  SearchOutlined,
  SettingOutlined,
  StrikethroughOutlined,
  TableOutlined,
  UnderlineOutlined,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined
} from '@ant-design/icons';
import {
  DndContext,
  type DragEndEvent,
  type DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MenuProps } from 'antd';
import {
  Button,
  Card,
  Divider,
  Dropdown,
  Empty,
  Input,
  Menu,
  Modal,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Tree,
  Typography,
  message
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useClinicalContext } from '@/features/clinical-context';
import type {
  IAnalysisGrouping,
  IBodyRow,
  IDisplay,
  IMethod,
  IOutput,
  ISelectedElement,
  OutputType
} from '@/features/tfl-builder';
import {
  PRESET_METHODS,
  createDefaultDisplay,
  createDefaultOutput,
  serializeToARS,
  useTflBuilderStore
} from '@/features/tfl-builder';

const { Text, Title } = Typography;

// ==================== 块级选中高亮组件 ====================

interface SelectableBlockProps {
  children: React.ReactNode;
  className?: string;
  displayId?: string;
  elementId: string;
  elementType: ISelectedElement['type'];
  isSelected: boolean;
  onSelect: (element: ISelectedElement) => void;
  style?: React.CSSProperties;
}

/** 可选中的块组件 核心交互：鼠标悬停/点击时显示高亮边框 */
const SelectableBlock: React.FC<SelectableBlockProps> = ({
  children,
  className = '',
  displayId,
  elementId,
  elementType,
  isSelected,
  onSelect,
  style
}) => {
  const { ui } = useTflBuilderStore();

  return (
    <div
      className={`selectable-block ${className} ${isSelected ? 'selected' : ''}`}
      style={{
        backgroundColor: isSelected ? 'rgba(24, 144, 255, 0.05)' : 'transparent',
        cursor: 'pointer',
        outline: isSelected && ui.showBoundingBoxes ? '2px solid #1890ff' : 'none',
        outlineOffset: '-1px',
        position: 'relative',
        transition: 'all 0.15s ease',
        ...style
      }}
      onClick={e => {
        e.stopPropagation();
        onSelect({ displayId, id: elementId, type: elementType });
      }}
      onMouseEnter={e => {
        if (!isSelected && ui.showBoundingBoxes) {
          e.currentTarget.style.outline = '1px dashed rgba(24, 144, 255, 0.5)';
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          e.currentTarget.style.outline = 'none';
        }
      }}
    >
      {children}
      {/* 选中指示器 */}
      {isSelected && ui.showBoundingBoxes && (
        <div
          style={{
            backgroundColor: '#1890ff',
            borderRadius: '50%',
            height: 8,
            left: -8,
            position: 'absolute',
            top: -8,
            width: 8
          }}
        />
      )}
    </div>
  );
};

// ==================== 可排序的数据行组件 ====================

interface SortableBodyRowProps {
  displayId: string;
  groupings: IAnalysisGrouping[];
  indentLevel?: number;
  isSelected: boolean;
  onDelete: (rowId: string) => void;
  onSelect: (element: ISelectedElement) => void;
  onUpdate: (rowId: string, updates: Partial<IBodyRow>) => void;
  row: IBodyRow;
}

/** 可拖拽排序的数据行 */
const SortableBodyRow: React.FC<SortableBodyRowProps> = ({
  displayId,
  groupings,
  indentLevel = 0,
  isSelected,
  onDelete,
  onSelect,
  onUpdate,
  row
}) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: row.id });

  const style: React.CSSProperties = {
    backgroundColor: isDragging ? '#e6f7ff' : undefined,
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
    >
      <SelectableBlock
        displayId={displayId}
        elementId={row.id}
        elementType="bodyRow"
        isSelected={isSelected}
        onSelect={onSelect}
      >
        <tr
          className="body-row hover:bg-gray-50"
          style={{
            cursor: 'grab',
            paddingLeft: `${indentLevel * 20}px`
          }}
        >
          {/* 拖拽手柄 */}
          <td
            className="border-b border-r border-gray-300 p-0"
            style={{ width: 24 }}
            {...attributes}
            {...listeners}
          >
            <div className="h-full flex cursor-grab items-center justify-center text-gray-400 hover:text-blue-500">
              <span className="i-mdi-drag-vertical" />
            </div>
          </td>
          {/* 行标签 */}
          <td
            className="border-b border-r border-gray-300 p-8px"
            style={{ paddingLeft: `${row.indentLevel * 16 + 8}px` }}
          >
            <Text>{row.label}</Text>
            {row.children && row.children.length > 0 && (
              <Tag
                className="ml-4px text-10px"
                color="blue"
              >
                {row.children.length}
              </Tag>
            )}
          </td>
          {/* 数据单元格 */}
          {row.cells.map(cell => (
            <td
              className="border-b border-r border-gray-300 p-8px text-center last:border-r-0"
              key={cell.id}
            >
              <Text className="text-11px text-gray-500 font-mono">{cell.text}</Text>
            </td>
          ))}
        </tr>
      </SelectableBlock>

      {/* 子行 */}
      {row.children && row.children.length > 0 && row.isExpanded && (
        <>
          {row.children.map(childRow => (
            <SortableBodyRow
              displayId={displayId}
              groupings={groupings}
              indentLevel={indentLevel + 1}
              isSelected={isSelected}
              key={childRow.id}
              row={childRow}
              onDelete={onDelete}
              onSelect={onSelect}
              onUpdate={onUpdate}
            />
          ))}
        </>
      )}
    </div>
  );
};

// ==================== 左侧边栏 - Outputs Tree ====================

interface LeftSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ collapsed, onToggle }) => {
  const { t } = useTranslation();
  const {
    addOutput,
    groupings,
    methods,
    outputs,
    selectElement,
    setActiveDisplay,
    setOutputFilter,
    setSearchKeyword,
    ui
  } = useTflBuilderStore();

  const [searchValue, setSearchValue] = useState('');

  // 过滤输出
  const filteredOutputs = useMemo(() => {
    let result = outputs;
    if (ui.outputFilter !== 'all') {
      const typeMap: Record<string, OutputType> = {
        figures: 'Figure',
        listings: 'Listing',
        tables: 'Table'
      };
      result = result.filter(o => o.type === typeMap[ui.outputFilter]);
    }
    if (searchValue) {
      result = result.filter(
        o =>
          o.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          o.outputId.toLowerCase().includes(searchValue.toLowerCase())
      );
    }
    return result;
  }, [outputs, ui.outputFilter, searchValue]);

  // 构建树形数据
  const treeData: DataNode[] = useMemo(() => {
    const typeGroups: Record<string, IOutput[]> = {
      Figure: filteredOutputs.filter(o => o.type === 'Figure'),
      Listing: filteredOutputs.filter(o => o.type === 'Listing'),
      Table: filteredOutputs.filter(o => o.type === 'Table')
    };

    return Object.entries(typeGroups)
      .filter(([, items]) => items.length > 0)
      .map(([type, items]) => ({
        children: items.map(output => ({
          isLeaf: true,
          key: output.id,
          title: (
            <div className="flex items-center justify-between">
              <Space size={4}>
                <span className="text-12px text-gray-500 font-mono">{output.outputId}</span>
                <span className="text-12px">{output.name}</span>
              </Space>
            </div>
          )
        })),
        icon: <FolderOutlined />,
        key: `type-${type}`,
        title: (
          <Space>
            <TableOutlined className="text-blue-500" />
            <span>{type}s</span>
            <Tag
              className="text-10px"
              color="blue"
            >
              {items.length}
            </Tag>
          </Space>
        )
      }));
  }, [filteredOutputs]);

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const key = selectedKeys[0] as string;
      if (key.startsWith('type-')) return;
      const output = outputs.find(o => o.id === key);
      if (output) {
        setActiveDisplay(output.displayId);
        selectElement({ displayId: output.displayId, id: key, type: 'output' });
      }
    }
  };

  if (collapsed) {
    return (
      <div className="w-40px flex flex-col items-center border-r border-gray-200 bg-white py-8px">
        <Button
          icon={<MenuUnfoldOutlined />}
          type="text"
          onClick={onToggle}
        />
      </div>
    );
  }

  return (
    <div className="w-280px flex flex-col overflow-hidden border-r border-gray-200 bg-white">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-gray-100 p-8px">
        <Text
          strong
          className="text-12px"
        >
          <FolderOutlined className="mr-4px" />
          {t('page.mdr.tflBuilder.leftPanel.outputs')}
        </Text>
        <Button
          icon={<MenuFoldOutlined />}
          size="small"
          type="text"
          onClick={onToggle}
        />
      </div>

      {/* 过滤 Tab */}
      <div className="px-8px py-4px">
        <Tabs
          activeKey={ui.outputFilter}
          size="small"
          items={[
            { key: 'all', label: 'All' },
            { key: 'tables', label: 'Tables' },
            { key: 'figures', label: 'Figures' },
            { key: 'listings', label: 'Listings' }
          ]}
          onChange={key => setOutputFilter(key as any)}
        />
      </div>

      {/* 搜索 */}
      <div className="px-8px pb-8px">
        <Input
          allowClear
          placeholder={t('page.mdr.tflBuilder.leftPanel.searchOutputs')}
          prefix={<SearchOutlined />}
          size="small"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
        />
      </div>

      {/* 树形列表 */}
      <div className="flex-1 overflow-auto px-8px">
        <Tree
          blockNode
          defaultExpandAll
          showIcon
          className="text-12px"
          treeData={treeData}
          onSelect={handleSelect}
        />
      </div>

      {/* 底部操作 */}
      <div className="border-t border-gray-100 p-8px">
        <Button
          block
          icon={<PlusOutlined />}
          size="small"
          type="dashed"
          onClick={() => {
            // TODO: 创建新 Output
            message.info('Create new output dialog');
          }}
        >
          {t('page.mdr.tflBuilder.canvas.addOutput')}
        </Button>
      </div>
    </div>
  );
};

// ==================== 右侧属性面板 ====================

interface RightSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ collapsed, onToggle }) => {
  const { t } = useTranslation();
  const {
    activeDisplay,
    deleteBodyRow,
    document,
    selectedElement,
    updateAnalysisGrouping,
    updateBodyRow,
    updateTitle
  } = useTflBuilderStore();

  // 获取选中元素的详细数据
  const selectedData = useMemo(() => {
    if (!document || !selectedElement.id) return null;

    switch (selectedElement.type) {
      case 'output':
        return document.outputs.find(o => o.id === selectedElement.id);
      case 'title': {
        const display = document.displays.find(d => d.id === selectedElement.displayId);
        const section = display?.displaySections.find(s => s.type === 'Title');
        return section;
      }
      case 'bodyRow': {
        const display = document.displays.find(d => d.id === selectedElement.displayId);
        const bodySection = display?.displaySections.find(s => s.type === 'Body');
        if (bodySection && 'rows' in bodySection.content) {
          const findRow = (rows: IBodyRow[]): IBodyRow | null => {
            for (const row of rows) {
              if (row.id === selectedElement.id) return row;
              if (row.children) {
                const found = findRow(row.children);
                if (found) return found;
              }
            }
            return null;
          };
          return findRow(bodySection.content.rows);
        }
        return null;
      }
      case 'columnHeader': {
        return document.analysisGroupings.find(g => g.id === selectedElement.id);
      }
      default:
        return null;
    }
  }, [document, selectedElement]);

  if (collapsed) {
    return (
      <div className="w-40px flex flex-col items-center border-l border-gray-200 bg-white py-8px">
        <Button
          icon={<MenuUnfoldOutlined />}
          type="text"
          onClick={onToggle}
        />
      </div>
    );
  }

  return (
    <div className="w-320px flex flex-col overflow-hidden border-l border-gray-200 bg-white">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-gray-100 p-8px">
        <Text
          strong
          className="text-12px"
        >
          <SettingOutlined className="mr-4px" />
          {t('page.mdr.tflBuilder.rightPanel.title')}
        </Text>
        <Button
          icon={<MenuFoldOutlined />}
          size="small"
          type="text"
          onClick={onToggle}
        />
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-12px">
        {!selectedElement.id || selectedElement.type === 'none' ? (
          <Empty
            description={t('page.mdr.tflBuilder.rightPanel.selectHint')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <>
            {/* 显示元素类型 */}
            <div className="mb-12px">
              <Tag color="blue">{selectedElement.type}</Tag>
              <Tag>{selectedElement.id}</Tag>
            </div>

            {/* Title 属性 */}
            {selectedElement.type === 'title' && selectedData && 'content' in selectedData && (
              <div className="space-y-8px">
                <div className="text-12px text-gray-500">{t('page.mdr.tflBuilder.props.titleText')}</div>
                <Input
                  value={(selectedData as { content: { text: string } }).content?.text}
                  onChange={e => updateTitle(selectedElement.displayId!, e.target.value)}
                />
              </div>
            )}

            {/* Body Row 属性 */}
            {selectedElement.type === 'bodyRow' && selectedData && (
              <div className="space-y-12px">
                <div>
                  <div className="mb-4px text-12px text-gray-500">{t('page.mdr.tflBuilder.props.label')}</div>
                  <Input
                    value={(selectedData as IBodyRow).label}
                    onChange={e =>
                      updateBodyRow(selectedElement.displayId!, selectedElement.id!, { label: e.target.value })
                    }
                  />
                </div>
                <div>
                  <div className="mb-4px text-12px text-gray-500">{t('page.mdr.tflBuilder.props.indentLevel')}</div>
                  <Select
                    className="w-full"
                    options={[0, 1, 2, 3, 4].map(i => ({ label: `Level ${i}`, value: i }))}
                    value={(selectedData as IBodyRow).indentLevel}
                    onChange={v => updateBodyRow(selectedElement.displayId!, selectedElement.id!, { indentLevel: v })}
                  />
                </div>
                <Divider />
                <Button
                  block
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => deleteBodyRow(selectedElement.displayId!, selectedElement.id!)}
                >
                  {t('page.mdr.tflBuilder.props.deleteRow')}
                </Button>
              </div>
            )}

            {/* Column Header 属性 */}
            {selectedElement.type === 'columnHeader' && selectedData && (
              <div className="space-y-12px">
                <div>
                  <div className="mb-4px text-12px text-gray-500">{t('page.mdr.tflBuilder.props.columnName')}</div>
                  <Input
                    value={(selectedData as IAnalysisGrouping).name}
                    onChange={e => updateAnalysisGrouping(selectedElement.id!, { name: e.target.value })}
                  />
                </div>
                <div>
                  <div className="mb-4px text-12px text-gray-500">{t('page.mdr.tflBuilder.props.columnCode')}</div>
                  <Input.TextArea
                    className="text-11px font-mono"
                    rows={2}
                    value={(selectedData as IAnalysisGrouping).code}
                    onChange={e => updateAnalysisGrouping(selectedElement.id!, { code: e.target.value })}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ==================== 顶部工具栏 ====================

const TopToolbar: React.FC = () => {
  const { t } = useTranslation();
  const {
    activeDisplay,
    addBodyRow,
    addFootnote,
    canRedo,
    canUndo,
    document,
    redo,
    saveToHistory,
    setZoomLevel,
    togglePreviewMode,
    ui,
    undo
  } = useTflBuilderStore();

  const handleSave = useCallback(() => {
    saveToHistory('Manual save');
    message.success(t('page.mdr.tflBuilder.messages.saved'));
  }, [saveToHistory, t]);

  const handleExportRTF = useCallback(() => {
    if (document) {
      const ars = serializeToARS({
        document,
        dragState: { dragData: null, dragType: null, isDragging: false },
        history: { future: [], past: [] },
        selectedElement: { id: null, type: 'none' },
        ui
      });
      message.info('RTF export will be implemented with backend API');
      console.log('ARS JSON for RTF:', ars);
    }
  }, [document]);

  const handleExportPDF = useCallback(() => {
    message.info('PDF export will be implemented with backend API');
  }, []);

  const handleExportJSON = useCallback(() => {
    if (document) {
      const ars = serializeToARS({
        document,
        dragState: { dragData: null, dragType: null, isDragging: false },
        history: { future: [], past: [] },
        selectedElement: { id: null, type: 'none' },
        ui
      });
      const json = JSON.stringify(ars, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `tfl-${document.studyId}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [document]);

  // File 菜单
  const fileMenuItems: MenuProps['items'] = [
    { icon: <FileAddOutlined />, key: 'new', label: 'New Shell' },
    { icon: <SaveOutlined />, key: 'save', label: 'Save', onClick: handleSave },
    { type: 'divider' },
    { icon: <FileExcelOutlined />, key: 'export-rtf', label: 'Export to RTF', onClick: handleExportRTF },
    { icon: <FilePdfOutlined />, key: 'export-pdf', label: 'Export to PDF', onClick: handleExportPDF },
    { icon: <DownloadOutlined />, key: 'export-json', label: 'Export to JSON', onClick: handleExportJSON }
  ];

  return (
    <div className="h-40px flex items-center justify-between border-b border-gray-200 bg-white px-12px">
      {/* 左侧：文件操作 */}
      <div className="flex items-center gap-4px">
        <Dropdown
          menu={{ items: fileMenuItems }}
          trigger={['click']}
        >
          <Button
            size="small"
            type="text"
          >
            File
          </Button>
        </Dropdown>

        <Divider type="vertical" />

        <Tooltip title={t('page.mdr.tflBuilder.toolbar.undo')}>
          <Button
            disabled={!canUndo}
            icon={<UndoOutlined />}
            size="small"
            type="text"
            onClick={undo}
          />
        </Tooltip>
        <Tooltip title={t('page.mdr.tflBuilder.toolbar.redo')}>
          <Button
            disabled={!canRedo}
            icon={<RedoOutlined />}
            size="small"
            type="text"
            onClick={redo}
          />
        </Tooltip>

        <Divider type="vertical" />

        {/* 富文本排版 */}
        <Button
          icon={<BoldOutlined />}
          size="small"
          type="text"
        />
        <Button
          icon={<ItalicOutlined />}
          size="small"
          type="text"
        />
        <Button
          icon={<UnderlineOutlined />}
          size="small"
          type="text"
        />
        <Select
          className="w-80px"
          defaultValue="center"
          size="small"
          options={[
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' }
          ]}
        />
      </div>

      {/* 中间：显示信息 */}
      <div className="flex items-center gap-8px">
        {activeDisplay && (
          <>
            <Tag color="blue">{activeDisplay.name}</Tag>
            <Tag>{activeDisplay.type}</Tag>
          </>
        )}
      </div>

      {/* 右侧：视图控制 */}
      <div className="flex items-center gap-4px">
        <Button
          icon={<ZoomOutOutlined />}
          size="small"
          type="text"
          onClick={() => setZoomLevel(ui.zoomLevel - 10)}
        />
        <Text className="text-11px">{ui.zoomLevel}%</Text>
        <Button
          icon={<ZoomInOutlined />}
          size="small"
          type="text"
          onClick={() => setZoomLevel(ui.zoomLevel + 10)}
        />
        <Divider type="vertical" />
        <Button
          icon={ui.isPreviewMode ? <EditOutlined /> : <EyeOutlined />}
          size="small"
          type="text"
          onClick={togglePreviewMode}
        >
          {ui.isPreviewMode ? 'Edit' : 'Preview'}
        </Button>
      </div>
    </div>
  );
};

// ==================== 中间主画布 ====================

interface MainCanvasProps {
  onElementSelect: (element: ISelectedElement) => void;
}

const MainCanvas: React.FC<MainCanvasProps> = ({ onElementSelect }) => {
  const { t } = useTranslation();
  const { activeDisplay, addBodyRow, document, groupings, reorderBodyRows, selectedElement, selectElement, ui } =
    useTflBuilderStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // 获取 Body 行
  const bodyRows = useMemo(() => {
    if (!activeDisplay) return [];
    const bodySection = activeDisplay.displaySections.find(s => s.type === 'Body');
    if (bodySection && 'rows' in bodySection.content) {
      return bodySection.content.rows;
    }
    return [];
  }, [activeDisplay]);

  // 获取列头
  const columnHeaders = useMemo(() => {
    if (!activeDisplay) return groupings;
    const colHeader = activeDisplay.displaySections.find(s => s.type === 'ColumnHeader');
    if (colHeader && 'cells' in colHeader.content) {
      return colHeader.content.cells.map(cell => ({
        id: cell.groupingId,
        name: cell.text,
        order: 0
      }));
    }
    return groupings;
  }, [activeDisplay, groupings]);

  // 拖拽处理
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id && activeDisplay) {
        const oldIndex = bodyRows.findIndex(r => r.id === active.id);
        const newIndex = bodyRows.findIndex(r => r.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          reorderBodyRows(activeDisplay.id, oldIndex, newIndex);
        }
      }
    },
    [activeDisplay, bodyRows, reorderBodyRows]
  );

  if (!document) {
    return (
      <div className="h-full flex-center bg-gray-50">
        <Empty description={t('page.mdr.tflBuilder.canvas.emptyHint')} />
      </div>
    );
  }

  if (!activeDisplay) {
    return (
      <div className="h-full flex-center bg-gray-50">
        <Empty description="Select an output from the left panel" />
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-auto bg-gray-100 p-16px"
      style={{ transform: `scale(${ui.zoomLevel / 100})`, transformOrigin: 'top left' }}
    >
      {/* Mock Shell 卡片 */}
      <Card
        className="shadow-sm"
        size="small"
      >
        {/* 标题区 */}
        {activeDisplay.displaySections
          .filter(s => s.type === 'Title' || s.type === 'Subtitle')
          .sort((a, b) => a.order - b.order)
          .map(section => (
            <SelectableBlock
              displayId={activeDisplay.id}
              elementId={section.id}
              elementType="title"
              isSelected={selectedElement.type === 'title' && selectedElement.id === section.id}
              key={section.id}
              onSelect={onElementSelect}
            >
              <div
                className="p-8px hover:bg-blue-50"
                style={{
                  textAlign: (section.content as any).alignment || 'center'
                }}
              >
                <Text
                  italic={(section.content as any).italic}
                  strong={(section.content as any).bold}
                  style={{ fontSize: (section.content as any).fontSize || 12 }}
                >
                  {(section.content as any).text}
                </Text>
              </div>
            </SelectableBlock>
          ))}

        {/* 表格 */}
        <div className="overflow-hidden border border-gray-300 rounded bg-white">
          <DndContext
            collisionDetection={closestCenter}
            sensors={sensors}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full border-collapse">
              {/* 列头 */}
              <thead>
                <tr className="bg-gray-100">
                  <th className="w-24px border-b border-r border-gray-300 bg-blue-50 p-8px" />
                  <th className="w-200px border-b border-r border-gray-300 bg-blue-50 p-8px text-left">
                    <Text strong>{t('page.mdr.tflBuilder.canvas.parameter')}</Text>
                  </th>
                  {columnHeaders.map(col => (
                    <SelectableBlock
                      displayId={activeDisplay.id}
                      elementId={col.id}
                      elementType="columnHeader"
                      isSelected={selectedElement.type === 'columnHeader' && selectedElement.id === col.id}
                      key={col.id}
                      onSelect={onElementSelect}
                    >
                      <th className="border-b border-r border-gray-300 p-8px text-center last:border-r-0">
                        <Text strong>{col.name}</Text>
                      </th>
                    </SelectableBlock>
                  ))}
                </tr>
              </thead>

              {/* 表体 */}
              <tbody>
                <SortableContext
                  items={bodyRows.map(r => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {bodyRows.length === 0 ? (
                    <tr>
                      <td
                        className="border-b border-gray-300 p-32px text-center text-gray-400"
                        colSpan={columnHeaders.length + 2}
                      >
                        <div className="i-mdi-drag mx-auto mb-8px text-28px opacity-50" />
                        <div className="text-12px">{t('page.mdr.tflBuilder.canvas.dragHint')}</div>
                      </td>
                    </tr>
                  ) : (
                    bodyRows.map(row => (
                      <SortableBodyRow
                        displayId={activeDisplay.id}
                        groupings={groupings}
                        isSelected={selectedElement.type === 'bodyRow' && selectedElement.id === row.id}
                        key={row.id}
                        row={row}
                        onSelect={onElementSelect}
                        onDelete={rowId => {
                          // TODO: implement
                        }}
                        onUpdate={(rowId, updates) => {
                          // TODO: implement
                        }}
                      />
                    ))
                  )}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        </div>

        {/* 脚注区 */}
        {activeDisplay.displaySections
          .filter(s => s.type === 'Footnote')
          .map(section => (
            <SelectableBlock
              displayId={activeDisplay.id}
              elementId={section.id}
              elementType="footnote"
              isSelected={selectedElement.type === 'footnote' && selectedElement.id === section.id}
              key={section.id}
              onSelect={onElementSelect}
            >
              <div className="mt-12px p-4px text-10px text-gray-500">{(section.content as any).text}</div>
            </SelectableBlock>
          ))}

        {/* 操作按钮 */}
        <div className="mt-12px flex gap-8px">
          <Button
            icon={<PlusOutlined />}
            size="small"
            onClick={() => {
              if (activeDisplay) {
                addBodyRow(activeDisplay.id, {
                  indentLevel: 0,
                  isDraggable: true,
                  isExpanded: true,
                  label: 'New Row',
                  rowType: 'data'
                });
              }
            }}
          >
            {t('page.mdr.tflBuilder.canvas.addRow')}
          </Button>
        </div>
      </Card>
    </div>
  );
};

// ==================== 主组件 ====================

const TFLBuilder: React.FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  // 从 BaseLayout 提供的 GlobalContextSelector 获取上下文
  const { analysisId, isAnalysisReady, studyId } = useClinicalContext();

  // Store
  const { clearSelection, document, initDocument, selectedElement, selectElement } = useTflBuilderStore();

  // UI 状态
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // 初始化文档
  useEffect(() => {
    if (isAnalysisReady && studyId && analysisId && !document) {
      initDocument(studyId, analysisId);
    }
  }, [isAnalysisReady, studyId, analysisId, document, initDocument]);

  // 元素选中处理
  const handleElementSelect = useCallback(
    (element: ISelectedElement) => {
      selectElement(element);
    },
    [selectElement]
  );

  // 点击空白处清除选择
  const handleCanvasClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // 上下文未就绪
  if (!isAnalysisReady || !studyId || !analysisId) {
    return (
      <div className="h-full flex-center">
        <Empty
          description={t('page.mdr.tflBuilder.context.selectAnalysisHint')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Text
            className="text-12px"
            type="secondary"
          >
            {t('page.mdr.tflBuilder.context.selectAnalysisForTfl')}
          </Text>
        </Empty>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {contextHolder}

      {/* 顶部工具栏 */}
      <TopToolbar />

      {/* 主体区域：三栏布局 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 */}
        <LeftSidebar
          collapsed={leftCollapsed}
          onToggle={() => setLeftCollapsed(!leftCollapsed)}
        />

        {/* 中间画布 */}
        <div
          className="flex-1 overflow-hidden"
          onClick={handleCanvasClick}
        >
          <MainCanvas onElementSelect={handleElementSelect} />
        </div>

        {/* 右侧属性面板 */}
        <RightSidebar
          collapsed={rightCollapsed}
          onToggle={() => setRightCollapsed(!rightCollapsed)}
        />
      </div>
    </div>
  );
};

export const handle = {
  i18nKey: 'route.(base)_mdr_tfl-builder',
  icon: 'mdi:table',
  title: 'TFL Builder'
};

export default TFLBuilder;
