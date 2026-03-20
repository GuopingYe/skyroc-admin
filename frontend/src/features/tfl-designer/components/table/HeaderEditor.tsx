/**
 * TFL Builder - Header Editor
 *
 * Configure layered table column headers with support for spanning, placeholders ($1, $2, ^).
 * Provides a UI to create layers and define cells mapped to the data columns.
 * Supports reordering of layers and cells.
 */
import { useState } from 'react';
import { Card, Form, Input, Button, Space, Typography, Tag, Tooltip, InputNumber, Row, Col, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import type { TableHeaderLayer, TableHeaderCell } from '../../types';
import { generateId } from '../../types';
import { useTableStore } from '../../stores';

const { Text } = Typography;

export default function HeaderEditor() {
  const { t } = useTranslation();
  const currentTable = useTableStore(s => s.currentTable);
  const updateHeaderLayers = useTableStore(s => s.updateHeaderLayers);

  if (!currentTable) return null;

  const headerLayers = currentTable.headerLayers || [];

  const handleAddLayer = () => {
    const newLayer: TableHeaderLayer = {
      id: generateId('layer'),
      cells: [{ id: generateId('cell'), text: 'New Header', colspan: 1 }],
    };
    updateHeaderLayers([...headerLayers, newLayer]);
  };

  const handleUpdateLayer = (layerIndex: number, newLayer: TableHeaderLayer) => {
    const newLayers = [...headerLayers];
    newLayers[layerIndex] = newLayer;
    updateHeaderLayers(newLayers);
  };

  const handleDeleteLayer = (layerIndex: number) => {
    const newLayers = [...headerLayers];
    newLayers.splice(layerIndex, 1);
    updateHeaderLayers(newLayers);
  };

  const handleMoveLayer = (layerIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? layerIndex - 1 : layerIndex + 1;
    if (targetIndex < 0 || targetIndex >= headerLayers.length) return;
    const newLayers = [...headerLayers];
    [newLayers[layerIndex], newLayers[targetIndex]] = [newLayers[targetIndex], newLayers[layerIndex]];
    updateHeaderLayers(newLayers);
  };

  const handleAddCell = (layerIndex: number) => {
    const newLayers = [...headerLayers];
    newLayers[layerIndex] = {
      ...newLayers[layerIndex],
      cells: [...newLayers[layerIndex].cells, { id: generateId('cell'), text: 'New Header', colspan: 1 }],
    };
    updateHeaderLayers(newLayers);
  };

  const handleDeleteCell = (layerIndex: number, cellIndex: number) => {
    const newLayers = [...headerLayers];
    newLayers[layerIndex] = {
      ...newLayers[layerIndex],
      cells: newLayers[layerIndex].cells.filter((_, i) => i !== cellIndex),
    };
    updateHeaderLayers(newLayers);
  };

  const handleUpdateCell = (layerIndex: number, cellIndex: number, cell: TableHeaderCell) => {
    const newLayers = [...headerLayers];
    const cells = [...newLayers[layerIndex].cells];
    cells[cellIndex] = cell;
    newLayers[layerIndex] = { ...newLayers[layerIndex], cells };
    updateHeaderLayers(newLayers);
  };

  const handleMoveCell = (layerIndex: number, cellIndex: number, direction: 'up' | 'down') => {
    const layer = headerLayers[layerIndex];
    const targetIndex = direction === 'up' ? cellIndex - 1 : cellIndex + 1;
    if (targetIndex < 0 || targetIndex >= layer.cells.length) return;
    const newCells = [...layer.cells];
    [newCells[cellIndex], newCells[targetIndex]] = [newCells[targetIndex], newCells[cellIndex]];
    const newLayers = [...headerLayers];
    newLayers[layerIndex] = { ...newLayers[layerIndex], cells: newCells };
    updateHeaderLayers(newLayers);
  };

  return (
    <div className="flex flex-col gap-16px">
      <div className="flex justify-between items-center bg-gray-50 p-12px rounded-md border border-gray-200">
        <div>
          <Text strong>Custom Header Layers</Text>
          <div className="text-12px text-gray-500 mt-4px">
            Define nested/spanned column headers. Use <code>$1</code>, <code>$2</code> etc. to reference Header Styles. Use <code>^</code> for <code>(N=XX)</code>.
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddLayer}
          size="small"
        >
          Add Layer
        </Button>
      </div>

      <div className="flex flex-col gap-12px overflow-y-auto max-h-[500px] pr-8px">
        {headerLayers.map((layer, layerIdx) => (
          <Card
            key={layer.id}
            size="small"
            title={
              <Space>
                <Text strong>Layer {layerIdx + 1}</Text>
                {layerIdx === headerLayers.length - 1 && (
                  <Text type="secondary" className="text-12px italic">(Data mapped layer)</Text>
                )}
                <Tag color="blue">{layer.cells.length} cells</Tag>
              </Space>
            }
            extra={
              <Space>
                <Tooltip title="Move layer up">
                  <Button
                    size="small"
                    icon={<ArrowUpOutlined />}
                    disabled={layerIdx === 0}
                    onClick={() => handleMoveLayer(layerIdx, 'up')}
                  />
                </Tooltip>
                <Tooltip title="Move layer down">
                  <Button
                    size="small"
                    icon={<ArrowDownOutlined />}
                    disabled={layerIdx === headerLayers.length - 1}
                    onClick={() => handleMoveLayer(layerIdx, 'down')}
                  />
                </Tooltip>
                <Button size="small" icon={<PlusOutlined />} onClick={() => handleAddCell(layerIdx)}>
                  Add Cell
                </Button>
                <Popconfirm title="Delete this layer?" onConfirm={() => handleDeleteLayer(layerIdx)}>
                  <Button size="small" danger icon={<DeleteOutlined />} type="text" />
                </Popconfirm>
              </Space>
            }
            styles={{ body: { padding: 8 } }}
          >
            <Row gutter={[8, 8]}>
              {layer.cells.map((cell, cellIdx) => (
                <Col key={cell.id} span={24}>
                  <div className="flex items-center gap-8px p-8px bg-white border border-gray-200 rounded">
                    <div className="flex flex-col gap-2px">
                      <Tooltip title="Move up">
                        <Button
                          type="text"
                          size="small"
                          icon={<ArrowUpOutlined />}
                          disabled={cellIdx === 0}
                          onClick={() => handleMoveCell(layerIdx, cellIdx, 'up')}
                        />
                      </Tooltip>
                      <Tooltip title="Move down">
                        <Button
                          type="text"
                          size="small"
                          icon={<ArrowDownOutlined />}
                          disabled={cellIdx === layer.cells.length - 1}
                          onClick={() => handleMoveCell(layerIdx, cellIdx, 'down')}
                        />
                      </Tooltip>
                    </div>
                    <div className="flex-1 flex flex-col gap-4px">
                      <div className="flex items-center gap-8px">
                        <span className="text-12px text-gray-500 w-[60px]">Text:</span>
                        <Input
                          size="small"
                          value={cell.text}
                          onChange={(e) => handleUpdateCell(layerIdx, cellIdx, { ...cell, text: e.target.value })}
                          placeholder="e.g. $1 ^"
                        />
                      </div>
                      <div className="flex items-center gap-8px">
                        <span className="text-12px text-gray-500 w-[60px]">ColSpan:</span>
                        <InputNumber
                          size="small"
                          min={1}
                          value={cell.colspan || 1}
                          onChange={(val) => handleUpdateCell(layerIdx, cellIdx, { ...cell, colspan: val || 1 })}
                        />
                      </div>
                    </div>
                    <Tooltip title="Remove Cell">
                      <Button
                        danger
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteCell(layerIdx, cellIdx)}
                      />
                    </Tooltip>
                  </div>
                </Col>
              ))}
              {layer.cells.length === 0 && (
                <div className="p-16px text-center w-full text-gray-400 italic">No cells in this layer</div>
              )}
            </Row>
          </Card>
        ))}
        {headerLayers.length === 0 && (
          <div className="p-32px text-center bg-gray-50 border border-dashed border-gray-300 rounded text-gray-400">
            No custom header layers defined. Table will use default Header Styles.
          </div>
        )}
      </div>
    </div>
  );
}
