/**
 * TFL Builder - Export Modal
 *
 * Export dialog with format selection and page settings. Supports Word (.docx), RTF, and PDF formats.
 */
import {
  CheckCircleOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import {
  Button,
  Divider,
  Empty,
  Form,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  Typography,
  message
} from 'antd';
import { useState } from 'react';

import type { IARSDocument } from '../../types';
import { downloadAsRTF, downloadAsWord, generatePDFDocument } from '../../utils/exportUtils';

const { Text, Title } = Typography;

// ==================== Types ====================

interface ExportPageOptions {
  fontSize: number;
  format: 'json' | 'pdf' | 'rtf' | 'word';
  includePageNumbers: boolean;
  margins: {
    bottom: number;
    left: number;
    right: number;
    top: number;
  };
  orientation: 'landscape' | 'portrait';
  pageSize: 'A4' | 'Letter';
}

interface Props {
  document: IARSDocument | null;
  onClose: () => void;
  open: boolean;
}

// ==================== Constants ====================

const defaultPageOptions: ExportPageOptions = {
  fontSize: 10,
  format: 'word',
  includePageNumbers: true,
  margins: { bottom: 25, left: 20, right: 20, top: 25 },
  orientation: 'portrait',
  pageSize: 'A4'
};

// ==================== Component ====================

export default function ExportModal({ document, onClose, open }: Props) {
  const [form] = Form.useForm();
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
    if (!document) {
      message.warning('No document to export');
      return;
    }

    const values = await form.validateFields();
    const options: ExportPageOptions = {
      ...defaultPageOptions,
      ...values,
      margins: {
        bottom: values.marginBottom ?? 25,
        left: values.marginLeft ?? 20,
        right: values.marginRight ?? 20,
        top: values.marginTop ?? 25
      }
    };

    setExporting(true);

    try {
      switch (options.format) {
        case 'word': {
          const filename = `TFL_${document.studyId || 'export'}_${Date.now()}.doc`;
          downloadAsWord(document, filename);
          break;
        }
        case 'rtf': {
          const filename = `TFL_${document.studyId || 'export'}_${Date.now()}.rtf`;
          downloadAsRTF(document, filename);
          break;
        }
        case 'pdf': {
          generatePDFDocument(document);
          message.info('PDF export opens in a new window for printing');
          break;
        }
        case 'json': {
          const filename = `TFL_${document.studyId || 'export'}_${Date.now()}.json`;
          const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(document, null, 2))}`;
          const downloadAnchorNode = window.document.createElement('a');
          downloadAnchorNode.setAttribute('href', dataStr);
          downloadAnchorNode.setAttribute('download', filename);
          window.document.body.appendChild(downloadAnchorNode);
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
          break;
        }
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      setExported(true);
      message.success('Export successful');
    } catch (error) {
      message.error(`Export failed: ${(error as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleClose = () => {
    setExported(false);
    form.resetFields();
    onClose();
  };

  const formatIcon = (format: string) => {
    switch (format) {
      case 'word':
        return <FileWordOutlined className="text-[#2b579a]" />;
      case 'pdf':
        return <FilePdfOutlined className="text-[#d93025]" />;
      case 'rtf':
        return <FileTextOutlined className="text-gray-500" />;
      case 'json':
        return <FolderOpenOutlined className="text-[#faad14]" />;
      default:
        return null;
    }
  };

  const displayName = document?.studyInfo?.studyTitle || document?.studyId || 'TFL Document';
  const displayCount = document?.displays?.length || 0;
  const outputCount = document?.outputs?.length || 0;

  return (
    <Modal
      open={open}
      title="Export TFL"
      width={640}
      footer={[
        <Button
          key="cancel"
          onClick={handleClose}
        >
          Cancel
        </Button>,
        <Button
          icon={<DownloadOutlined />}
          key="export"
          loading={exporting}
          type="primary"
          onClick={handleExport}
        >
          Export
        </Button>
      ]}
      onCancel={handleClose}
    >
      {exported && (
        <div className="mb-4 border border-green-200 rounded bg-green-50 p-3">
          <Space>
            <CheckCircleOutlined className="text-green-500" />
            <Text className="text-green-700">Document exported successfully</Text>
          </Space>
        </div>
      )}

      {!document ? (
        <Empty
          className="py-10"
          description="No document loaded"
        />
      ) : (
        <div className="mb-4 rounded bg-gray-50 p-3">
          <Text strong>Document Summary:</Text>
          <div className="mt-1">
            <Text type="secondary">{displayName}</Text>
          </div>
          <div className="mt-1 flex gap-4">
            <Text type="secondary">
              {displayCount} display{displayCount !== 1 ? 's' : ''}
            </Text>
            <Text type="secondary">
              {outputCount} output{outputCount !== 1 ? 's' : ''}
            </Text>
          </div>
        </div>
      )}

      <Form
        form={form}
        initialValues={defaultPageOptions}
        layout="vertical"
      >
        {/* Format Selection */}
        <Form.Item
          label="Export Format"
          name="format"
        >
          <Radio.Group>
            <Radio.Button value="word">
              <Space>
                {formatIcon('word')}
                Word (.doc)
              </Space>
            </Radio.Button>
            <Radio.Button value="rtf">
              <Space>
                {formatIcon('rtf')}
                RTF (.rtf)
              </Space>
            </Radio.Button>
            <Radio.Button value="pdf">
              <Space>
                {formatIcon('pdf')}
                PDF (.pdf)
              </Space>
            </Radio.Button>
            <Radio.Button value="json">
              <Space>
                {formatIcon('json')}
                CDISC ARS (.json)
              </Space>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Divider />

        {/* Page Settings */}
        <Title level={5}>Page Settings</Title>

        <Space
          className="w-full"
          direction="vertical"
          size="small"
        >
          <div className="flex gap-4">
            <Form.Item
              className="flex-1"
              label="Paper Size"
              name="pageSize"
            >
              <Select
                options={[
                  { label: 'A4 (210 x 297 mm)', value: 'A4' },
                  { label: 'Letter (8.5 x 11 in)', value: 'Letter' }
                ]}
              />
            </Form.Item>

            <Form.Item
              className="flex-1"
              label="Orientation"
              name="orientation"
            >
              <Select
                options={[
                  { label: 'Portrait', value: 'portrait' },
                  { label: 'Landscape', value: 'landscape' }
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item label="Margins (mm)">
            <Space>
              <Form.Item
                noStyle
                name="marginTop"
              >
                <InputNumber
                  addonAfter="mm"
                  className="w-24"
                  max={50}
                  min={0}
                  placeholder="Top"
                />
              </Form.Item>
              <Form.Item
                noStyle
                name="marginBottom"
              >
                <InputNumber
                  addonAfter="mm"
                  className="w-24"
                  max={50}
                  min={0}
                  placeholder="Bottom"
                />
              </Form.Item>
              <Form.Item
                noStyle
                name="marginLeft"
              >
                <InputNumber
                  addonAfter="mm"
                  className="w-24"
                  max={50}
                  min={0}
                  placeholder="Left"
                />
              </Form.Item>
              <Form.Item
                noStyle
                name="marginRight"
              >
                <InputNumber
                  addonAfter="mm"
                  className="w-24"
                  max={50}
                  min={0}
                  placeholder="Right"
                />
              </Form.Item>
            </Space>
          </Form.Item>

          <div className="flex gap-4">
            <Form.Item
              className="flex-1"
              label="Font Size"
              name="fontSize"
            >
              <Select
                options={[
                  { label: '8pt', value: 8 },
                  { label: '9pt', value: 9 },
                  { label: '10pt', value: 10 },
                  { label: '11pt', value: 11 },
                  { label: '12pt', value: 12 }
                ]}
              />
            </Form.Item>

            <Form.Item
              className="flex-1"
              label="Page Numbers"
              name="includePageNumbers"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="Yes"
                unCheckedChildren="No"
              />
            </Form.Item>
          </div>
        </Space>

        <Divider />

        {/* Export Options */}
        <Title level={5}>Export Options</Title>
        <div className="rounded bg-gray-50 p-3 text-xs text-gray-500">
          <ul className="list-disc pl-4 space-y-1">
            <li>Word and RTF exports generate formatted documents ready for submission.</li>
            <li>PDF export opens a browser window where you can print to PDF.</li>
            <li>Page settings apply to Word and RTF formats.</li>
          </ul>
        </div>
      </Form>
    </Modal>
  );
}
