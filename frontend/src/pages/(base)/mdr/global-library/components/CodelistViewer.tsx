/**
 * CodelistViewer - CT专用Master-Detail视图
 *
 * 布局:
 *
 * - 左侧: Codelist列表 (支持搜索和分页)
 * - 右侧: Terms表格 (选中Codelist后显示)
 *
 * 特性:
 *
 * - 响应式布局，适应小屏幕
 * - 用户可调整列宽
 */
import { SearchOutlined } from '@ant-design/icons';
import { Card, Empty, Input, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Resizable } from 'react-resizable';

import { useCodelistTerms, useCtCodelists } from '@/service/hooks';

const { Text } = Typography;
const { Search } = Input;

// 可调整宽度的表头组件
interface ResizableTitleProps {
  onResize: (e: React.SyntheticEvent, data: { size: { width: number } }) => void;
  width: number;
  [key: string]: unknown;
}

const ResizableTitle: React.FC<ResizableTitleProps> = props => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      draggableOpts={{ enableUserSelectHack: false }}
      height={0}
      width={width}
      handle={
        <span
          className="react-resizable-handle"
          style={{
            bottom: 0,
            cursor: 'col-resize',
            height: '100%',
            position: 'absolute',
            right: -5,
            width: 10,
            zIndex: 1
          }}
          onClick={e => e.stopPropagation()}
        />
      }
      onResize={onResize}
    >
      <th {...restProps} />
    </Resizable>
  );
};

interface CodelistViewerProps {
  scopeNodeId: number;
}

const CodelistViewer: React.FC<CodelistViewerProps> = ({ scopeNodeId }) => {
  const { i18n, t } = useTranslation();
  const locale = i18n.language.startsWith('zh') ? 'zh' : 'en';

  // 状态管理
  const [selectedCodelistId, setSelectedCodelistId] = useState<number | null>(null);
  const [codelistSearch, setCodelistSearch] = useState('');
  const [termSearch, setTermSearch] = useState('');
  const [codelistPagination, setCodelistPagination] = useState({ current: 1, pageSize: 20 });
  const [termPagination, setTermPagination] = useState({ current: 1, pageSize: 50 });

  // 列宽状态
  const [termColumnWidths, setTermColumnWidths] = useState<Record<string, number>>({
    definition: 300,
    name: 250,
    ncit_code: 120,
    sort_order: 60,
    term_value: 120
  });

  // API Hooks
  const { data: codelistsData, isLoading: codelistsLoading } = useCtCodelists(scopeNodeId, {
    limit: codelistPagination.pageSize,
    offset: (codelistPagination.current - 1) * codelistPagination.pageSize,
    search: codelistSearch || undefined
  });

  const { data: termsData, isLoading: termsLoading } = useCodelistTerms(selectedCodelistId, {
    limit: termPagination.pageSize,
    offset: (termPagination.current - 1) * termPagination.pageSize,
    search: termSearch || undefined
  });

  // 选中第一个 Codelist
  useEffect(() => {
    if (codelistsData?.items?.length && !selectedCodelistId) {
      setSelectedCodelistId(codelistsData.items[0].id);
    }
  }, [codelistsData, selectedCodelistId]);

  // 处理列宽调整
  const handleResize = useCallback((dataIndex: string) => {
    return (_e: React.SyntheticEvent, data: { size: { width: number } }) => {
      setTermColumnWidths(prev => ({
        ...prev,
        [dataIndex]: data.size.width
      }));
    };
  }, []);

  // Codelist 表格列定义
  const codelistColumns: ColumnsType<Api.GlobalLibrary.CodelistListItem> = [
    {
      dataIndex: 'name',
      ellipsis: true,
      key: 'name',
      render: (text: string, record) => (
        <Tooltip title={text}>
          <Text
            className={selectedCodelistId === record.id ? 'text-blue-600' : ''}
            strong={selectedCodelistId === record.id}
          >
            {text}
          </Text>
        </Tooltip>
      ),
      title: locale === 'zh' ? '名称' : 'Name'
    },
    {
      dataIndex: 'ncit_code',
      key: 'ncit_code',
      render: (code: string | null) =>
        code ? (
          <Tag
            className="text-10px"
            color="blue"
          >
            {code}
          </Tag>
        ) : (
          '-'
        ),
      title: locale === 'zh' ? 'NCI编码' : 'NCI Code',
      width: 100
    },
    {
      align: 'center',
      dataIndex: 'term_count',
      key: 'term_count',
      render: (count: number | null) => (
        <Tag
          className="text-10px"
          color="green"
        >
          {count ?? 0}
        </Tag>
      ),
      title: locale === 'zh' ? '术语数' : 'Terms',
      width: 60
    }
  ];

  // Term 表格列定义 (可调整宽度)
  const termColumns: ColumnsType<Api.GlobalLibrary.TermListItem> = [
    {
      align: 'center',
      dataIndex: 'sort_order',
      ellipsis: true,
      key: 'sort_order',
      onHeaderCell: () =>
        ({
          onResize: handleResize('sort_order'),
          width: termColumnWidths.sort_order
        }) as unknown as React.HTMLAttributes<HTMLElement>,
      render: (order: number) => order ?? '-',
      title: locale === 'zh' ? '序号' : 'Ord',
      width: termColumnWidths.sort_order
    },
    {
      dataIndex: 'term_value',
      ellipsis: true,
      key: 'term_value',
      onHeaderCell: () =>
        ({
          onResize: handleResize('term_value'),
          width: termColumnWidths.term_value
        }) as unknown as React.HTMLAttributes<HTMLElement>,
      render: (value: string) => <Tag color="blue">{value}</Tag>,
      title: locale === 'zh' ? '值' : 'Value',
      width: termColumnWidths.term_value
    },
    {
      dataIndex: 'ncit_code',
      ellipsis: true,
      key: 'ncit_code',
      onHeaderCell: () =>
        ({
          onResize: handleResize('ncit_code'),
          width: termColumnWidths.ncit_code
        }) as unknown as React.HTMLAttributes<HTMLElement>,
      render: (code: string | null) =>
        code ? (
          <Tag
            className="text-10px"
            color="geekblue"
          >
            {code}
          </Tag>
        ) : (
          '-'
        ),
      title: locale === 'zh' ? 'NCI编码' : 'NCI Code',
      width: termColumnWidths.ncit_code
    },
    {
      dataIndex: 'name',
      ellipsis: true,
      key: 'name',
      onHeaderCell: () =>
        ({
          onResize: handleResize('name'),
          width: termColumnWidths.name
        }) as unknown as React.HTMLAttributes<HTMLElement>,
      render: (text: string | null) => (
        <Tooltip title={text}>
          <Text>{text || '-'}</Text>
        </Tooltip>
      ),
      title: locale === 'zh' ? '名称' : 'Name',
      width: termColumnWidths.name
    },
    {
      dataIndex: 'definition',
      ellipsis: true,
      key: 'definition',
      onHeaderCell: () =>
        ({
          onResize: handleResize('definition'),
          width: termColumnWidths.definition
        }) as unknown as React.HTMLAttributes<HTMLElement>,
      render: (text: string | null) => (
        <Tooltip title={text}>
          <Text
            className="text-12px"
            type="secondary"
          >
            {text || '-'}
          </Text>
        </Tooltip>
      ),
      title: locale === 'zh' ? '定义' : 'Definition',
      width: termColumnWidths.definition
    }
  ];

  // 事件处理
  const handleCodelistTableChange = useCallback((paginationConfig: TablePaginationConfig) => {
    setCodelistPagination({
      current: paginationConfig.current || 1,
      pageSize: paginationConfig.pageSize || 20
    });
  }, []);

  const handleTermTableChange = useCallback((paginationConfig: TablePaginationConfig) => {
    setTermPagination({
      current: paginationConfig.current || 1,
      pageSize: paginationConfig.pageSize || 50
    });
  }, []);

  const selectedCodelist = codelistsData?.items?.find(c => c.id === selectedCodelistId);

  return (
    <div
      className="h-full flex gap-12px"
      style={{ minHeight: 0 }}
    >
      {/* 左侧: Codelist列表 */}
      <Card
        className="flex-shrink-0"
        size="small"
        style={{ display: 'flex', flexDirection: 'column', minWidth: 280, width: 320 }}
        extra={
          <Search
            allowClear
            className="w-120px"
            placeholder={locale === 'zh' ? '搜索...' : 'Search...'}
            size="small"
            value={codelistSearch}
            onChange={e => {
              setCodelistSearch(e.target.value);
              setCodelistPagination(prev => ({ ...prev, current: 1 }));
            }}
          />
        }
        styles={{
          body: { display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden', padding: '8px' }
        }}
        title={
          <div className="flex items-center justify-between">
            <Text
              strong
              className="text-13px"
            >
              {locale === 'zh' ? '代码表列表' : 'Codelists'}
            </Text>
            {codelistsData && <Tag color="cyan">{codelistsData.total} items</Tag>}
          </div>
        }
      >
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            showHeader
            columns={codelistColumns}
            dataSource={codelistsData?.items}
            loading={codelistsLoading}
            rowKey="id"
            size="small"
            pagination={{
              current: codelistPagination.current,
              pageSize: codelistPagination.pageSize,
              showSizeChanger: false,
              showTotal: total => `${total} items`,
              size: 'small',
              total: codelistsData?.total ?? 0
            }}
            onChange={handleCodelistTableChange}
            onRow={record => ({
              onClick: () => {
                setSelectedCodelistId(record.id);
                setTermSearch('');
                setTermPagination({ current: 1, pageSize: 50 });
              },
              style: { backgroundColor: selectedCodelistId === record.id ? '#e6f7ff' : undefined, cursor: 'pointer' }
            })}
          />
        </div>
      </Card>

      {/* 右侧: Terms表格 */}
      <Card
        className="min-w-0 flex-1"
        size="small"
        style={{ display: 'flex', flexDirection: 'column', minWidth: 400 }}
        extra={
          selectedCodelistId && (
            <Search
              allowClear
              className="w-160px"
              placeholder={locale === 'zh' ? '搜索术语...' : 'Search terms...'}
              size="small"
              value={termSearch}
              onChange={e => {
                setTermSearch(e.target.value);
                setTermPagination(prev => ({ ...prev, current: 1 }));
              }}
            />
          )
        }
        styles={{
          body: { display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden', padding: '8px' }
        }}
        title={
          selectedCodelist ? (
            <div className="flex flex-wrap items-center gap-8px">
              <Text
                strong
                className="text-13px"
              >
                {locale === 'zh' ? '术语列表' : 'Terms'}
              </Text>
              <Tag color="blue">{selectedCodelist.name}</Tag>
              <Text
                className="text-11px"
                type="secondary"
              >
                {selectedCodelist.codelist_id}
              </Text>
              {termsData && <Tag color="green">{termsData.total} terms</Tag>}
            </div>
          ) : (
            <Text
              strong
              className="text-13px"
            >
              {locale === 'zh' ? '术语列表' : 'Terms'}
            </Text>
          )
        }
      >
        {!selectedCodelistId ? (
          <div className="h-full flex-center">
            <Empty
              description={locale === 'zh' ? '请选择一个代码表' : 'Select a Codelist to view terms'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : termsLoading ? (
          <div className="h-full flex-center">
            <Text type="secondary">{locale === 'zh' ? '加载中...' : 'Loading...'}</Text>
          </div>
        ) : termsData?.items?.length ? (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Table
              columns={termColumns}
              dataSource={termsData.items}
              rowKey="id"
              scroll={{ x: 600 }}
              size="small"
              components={{
                header: {
                  cell: ResizableTitle
                }
              }}
              pagination={{
                current: termPagination.current,
                pageSize: termPagination.pageSize,
                pageSizeOptions: ['20', '50', '100'],
                showQuickJumper: true,
                showSizeChanger: true,
                showTotal: total => `${total} terms`,
                size: 'small',
                total: termsData.total
              }}
              onChange={handleTermTableChange}
            />
          </div>
        ) : (
          <div className="h-full flex-center">
            <Empty
              description={locale === 'zh' ? '暂无术语数据' : 'No terms found'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default CodelistViewer;
