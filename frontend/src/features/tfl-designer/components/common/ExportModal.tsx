/**
 * TFL Builder - Export Modal
 *
 * Export dialog with format selection and page settings.
 * Supports Word (.docx), RTF, and PDF formats.
 */
import { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Switch,
  Space,
  Button,
  Typography,
  Divider,
  Radio,
  message,
  Empty
} from 'antd';
import {
  DownloadOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { downloadAsWord, downloadAsRTF, generatePDFDocument } from '../../utils/exportUtils';
import type { IARSDocument } from '../../types';

const { Text, Title } = Typography;

// ==================== Types ====================

interface ExportPageOptions {
  format: 'word' | 'rtf' | 'pdf' | 'json';
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  includePageNumbers: boolean;
  fontSize: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  document: IARSDocument | null;
}

// ==================== Constants ====================

const defaultPageOptions: ExportPageOptions = {
  format: 'word',
  pageSize: 'A4',
  orientation: 'portrait',
  margins: { top: 25, bottom: 25, left: 20, right: 20 },
  includePageNumbers: true,
  fontSize: 10
};

// ==================== Component ====================

export default function ExportModal({ open, onClose, document }: Props) {
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
        top: values.marginTop ?? 25,
        bottom: values.marginBottom ?? 25,
        left: values.marginLeft ?? 20,
        right: values.marginRight ?? 20
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
          const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(document, null, 2));
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
      message.error('Export failed: ' + (error as Error).message);
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
      title="Export TFL"
      open={open}
      onCancel={handleClose}
      width={640}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={<DownloadOutlined />}
          loading={exporting}
          onClick={handleExport}
        >
          Export
        </Button>
      ]}
    >
      {exported && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <Space>
            <CheckCircleOutlined className="text-green-500" />
            <Text className="text-green-700">Document exported successfully</Text>
          </Space>
        </div>
      )}

      {!document ? (
        <Empty description="No document loaded" className="py-10" />
      ) : (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <Text strong>Document Summary:</Text>
          <div className="mt-1">
            <Text type="secondary">{displayName}</Text>
          </div>
          <div className="mt-1 flex gap-4">
            <Text type="secondary">{displayCount} display{displayCount !== 1 ? 's' : ''}</Text>
            <Text type="secondary">{outputCount} output{outputCount !== 1 ? 's' : ''}</Text>
          </div>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={defaultPageOptions}
      >
        {/* Format Selection */}
        <Form.Item name="format" label="Export Format">
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

        <Space direction="vertical" size="small" className="w-full">
          <div className="flex gap-4">
            <Form.Item name="pageSize" label="Paper Size" className="flex-1">
              <Select
                options={[
                  { value: 'A4', label: 'A4 (210 x 297 mm)' },
                  { value: 'Letter', label: 'Letter (8.5 x 11 in)' }
                ]}
              />
            </Form.Item>

            <Form.Item name="orientation" label="Orientation" className="flex-1">
              <Select
                options={[
                  { value: 'portrait', label: 'Portrait' },
                  { value: 'landscape', label: 'Landscape' }
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item label="Margins (mm)">
            <Space>
              <Form.Item name="marginTop" noStyle>
                <InputNumber min={0} max={50} placeholder="Top" addonAfter="mm" className="w-24" />
              </Form.Item>
              <Form.Item name="marginBottom" noStyle>
                <InputNumber min={0} max={50} placeholder="Bottom" addonAfter="mm" className="w-24" />
              </Form.Item>
              <Form.Item name="marginLeft" noStyle>
                <InputNumber min={0} max={50} placeholder="Left" addonAfter="mm" className="w-24" />
              </Form.Item>
              <Form.Item name="marginRight" noStyle>
                <InputNumber min={0} max={50} placeholder="Right" addonAfter="mm" className="w-24" />
              </Form.Item>
            </Space>
          </Form.Item>

          <div className="flex gap-4">
            <Form.Item name="fontSize" label="Font Size" className="flex-1">
              <Select
                options={[
                  { value: 8, label: '8pt' },
                  { value: 9, label: '9pt' },
                  { value: 10, label: '10pt' },
                  { value: 11, label: '11pt' },
                  { value: 12, label: '12pt' }
                ]}
              />
            </Form.Item>

            <Form.Item name="includePageNumbers" label="Page Numbers" valuePropName="checked" className="flex-1">
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </div>
        </Space>

        <Divider />

        {/* Export Options */}
        <Title level={5}>Export Options</Title>
        <div className="p-3 bg-gray-50 rounded text-xs text-gray-500">
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
