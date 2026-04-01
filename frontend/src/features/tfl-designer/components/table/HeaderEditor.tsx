/**
 * TFL Builder - Header Editor
 *
 * Configure layered table column headers with support for spanning, placeholders ($1, $2, ^). Provides a UI to create
 * layers and define cells mapped to the data columns. Supports reordering of layers and cells.
 */
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, Form, Input, InputNumber, Popconfirm, Row, Space, Tag, Tooltip, Typography } from 'antd';
import { useState } from 'react';

import { useTableStore } from '../../stores';
import type { TableHeaderCell, TableHeaderLayer } from '../../types';
import { generateId } from '../../types';

const { Text } = Typography;

export default function HeaderEditor() {
  const currentTable = useTableStore(s => s.currentTable);
  const updateHeaderLayers = useTableStore(s => s.updateHeaderLayers);

  if (!currentTable) return null;

  const headerLayers = currentTable.headerLayers || [];

  const handleAddLayer = () => {
    const newLayer: TableHeaderLayer = {
      cells: [{ colspan: 1, id: generateId('cell'), text: 'New Header' }],
      id: generateId('layer')
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

  const handleMoveLayer = (layerIndex: number, direction: 'down' | 'up') => {
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
      cells: [...newLayers[layerIndex].cells, { colspan: 1, id: generateId('cell'), text: 'New Header' }]
    };
    updateHeaderLayers(newLayers);
  };

  const handleDeleteCell = (layerIndex: number, cellIndex: number) => {
    const newLayers = [...headerLayers];
    newLayers[layerIndex] = {
      ...newLayers[layerIndex],
      cells: newLayers[layerIndex].cells.filter((_, i) => i !== cellIndex)
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

  const handleMoveCell = (layerIndex: number, cellIndex: number, direction: 'down' | 'up') => {
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
      <div className="flex items-center justify-between border border-gray-200 rounded-md bg-gray-50 p-12px">
        <div>
          <Text strong>Custom Header Layers</Text>
          <div className="mt-4px text-12px text-gray-500">
            Define nested/spanned column headers. Use <code>$1</code>, <code>$2</code> etc. to reference Header Styles.
            Use <code>^</code> for <code>(N=XX)</code>.
          </div>
        </div>
        <Button
          icon={<PlusOutlined />}
          size="small"
          type="primary"
          onClick={handleAddLayer}
        >
          Add Layer
        </Button>
      </div>

      <div className="max-h-[500px] flex flex-col gap-12px overflow-y-auto pr-8px">
        {headerLayers.map((layer, layerIdx) => (
          <Card
            key={layer.id}
            size="small"
            styles={{ body: { padding: 8 } }}
            extra={
              <Space>
                <Tooltip title="Move layer up">
                  <Button
                    disabled={layerIdx === 0}
                    icon={<ArrowUpOutlined />}
                    size="small"
                    onClick={() => handleMoveLayer(layerIdx, 'up')}
                  />
                </Tooltip>
                <Tooltip title="Move layer down">
                  <Button
                    disabled={layerIdx === headerLayers.length - 1}
                    icon={<ArrowDownOutlined />}
                    size="small"
                    onClick={() => handleMoveLayer(layerIdx, 'down')}
                  />
                </Tooltip>
                <Button
                  icon={<PlusOutlined />}
                  size="small"
                  onClick={() => handleAddCell(layerIdx)}
                >
                  Add Cell
                </Button>
                <Popconfirm
                  title="Delete this layer?"
                  onConfirm={() => handleDeleteLayer(layerIdx)}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    type="text"
                  />
                </Popconfirm>
              </Space>
            }
            title={
              <Space>
                <Text strong>Layer {layerIdx + 1}</Text>
                {layerIdx === headerLayers.length - 1 && (
                  <Text
                    className="text-12px italic"
                    type="secondary"
                  >
                    (Data mapped layer)
                  </Text>
                )}
                <Tag color="blue">{layer.cells.length} cells</Tag>
              </Space>
            }
          >
            <Row gutter={[8, 8]}>
              {layer.cells.map((cell, cellIdx) => (
                <Col
                  key={cell.id}
                  span={24}
                >
                  <div className="flex items-center gap-8px border border-gray-200 rounded bg-white p-8px">
                    <div className="flex flex-col gap-2px">
                      <Tooltip title="Move up">
                        <Button
                          disabled={cellIdx === 0}
                          icon={<ArrowUpOutlined />}
                          size="small"
                          type="text"
                          onClick={() => handleMoveCell(layerIdx, cellIdx, 'up')}
                        />
                      </Tooltip>
                      <Tooltip title="Move down">
                        <Button
                          disabled={cellIdx === layer.cells.length - 1}
                          icon={<ArrowDownOutlined />}
                          size="small"
                          type="text"
                          onClick={() => handleMoveCell(layerIdx, cellIdx, 'down')}
                        />
                      </Tooltip>
                    </div>
                    <div className="flex flex-col flex-1 gap-4px">
                      <div className="flex items-center gap-8px">
                        <span className="w-[60px] text-12px text-gray-500">Text:</span>
                        <Input
                          placeholder="e.g. $1 ^"
                          size="small"
                          value={cell.text}
                          onChange={e => handleUpdateCell(layerIdx, cellIdx, { ...cell, text: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-8px">
                        <span className="w-[60px] text-12px text-gray-500">ColSpan:</span>
                        <InputNumber
                          min={1}
                          size="small"
                          value={cell.colspan || 1}
                          onChange={val => handleUpdateCell(layerIdx, cellIdx, { ...cell, colspan: val || 1 })}
                        />
                      </div>
                    </div>
                    <Tooltip title="Remove Cell">
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        type="text"
                        onClick={() => handleDeleteCell(layerIdx, cellIdx)}
                      />
                    </Tooltip>
                  </div>
                </Col>
              ))}
              {layer.cells.length === 0 && (
                <div className="w-full p-16px text-center text-gray-400 italic">No cells in this layer</div>
              )}
            </Row>
          </Card>
        ))}
        {headerLayers.length === 0 && (
          <div className="border border-gray-300 rounded border-dashed bg-gray-50 p-32px text-center text-gray-400">
            No custom header layers defined. Table will use default Header Styles.
          </div>
        )}
      </div>
    </div>
  );
}
