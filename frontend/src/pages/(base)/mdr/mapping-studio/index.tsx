import type { UploadFile, UploadProps } from 'antd';
import { Button, Card, Form, Input, Modal, Select, Tag, Upload, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useClinicalContext } from '@/features/clinical-context';

// 引入 Study Spec 数据源 - 架构纠偏：Mapping Studio 不再有"创世权"
import { specDatasets } from '../study-spec/mockData';

import { MappingCard } from './components';
import {
  type MappingItem,
  type MappingStatus,
  type SourceField,
  createEmptyMapping,
  mappingDetailsMap,
  sourceFields as originalSourceFields,
  statusConfig
} from './mockData';

/** 筛选状态类型 */
type FilterStatus = 'all' | 'unmapped' | MappingStatus;

/** 元数据映射工作室 Metadata Mapping Studio - SDR to SDTM 可视化映射编辑器 支持 1:N 映射关系：一个源字段可映射到多个目标域/变量 */
const MappingStudio = () => {
  const { t } = useTranslation();

  // 使用全局临床上下文
  const { context, isReady } = useClinicalContext();

  // ========== 状态管理 ==========
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedFormName, setSelectedFormName] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // ========== 导入 SDR 相关状态 ==========
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // ========== 动态源字段数据（支持导入后更新） ==========
  const [sourceFields, setSourceFields] = useState<SourceField[]>(originalSourceFields);

  // 当前选中的源字段
  const selectedField = sourceFields.find(f => f.id === selectedFieldId);

  // 当前选中字段对应的映射数据数组
  const currentMappings = selectedFieldId ? mappingDetailsMap[selectedFieldId] || [] : [];

  // ========== 获取所有唯一的表单名称 ==========
  const formNames = useMemo(() => {
    const uniqueNames = [...new Set(sourceFields.map(f => f.form_name))];
    return uniqueNames.sort().map(name => ({
      label: name,
      value: name
    }));
  }, [sourceFields]);

  // ========== 获取字段的主要状态 ==========
  const getFieldStatus = (fieldId: string): MappingStatus | null => {
    const mappings = mappingDetailsMap[fieldId];
    if (!mappings || mappings.length === 0) return null;
    const priority: MappingStatus[] = ['In_Production', 'QCing', 'Draft', 'Locked'];
    for (const status of priority) {
      if (mappings.some(m => m.status === status)) {
        return status;
      }
    }
    return null;
  };

  // ========== Step 1: 第一级过滤 (仅搜索和表单筛选) ==========
  const baseFilteredFields = useMemo(() => {
    return sourceFields.filter(field => {
      // 表单筛选
      if (selectedFormName && field.form_name !== selectedFormName) {
        return false;
      }
      // 文本搜索
      if (searchValue) {
        const searchLower = searchValue.toLowerCase();
        return (
          field.field_name.toLowerCase().includes(searchLower) ||
          field.field_label.toLowerCase().includes(searchLower) ||
          field.form_name.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [sourceFields, selectedFormName, searchValue]);

  // ========== Step 2: 基于第一级数据动态计算数量 ==========
  const statusCounts = useMemo(() => {
    let unmapped = 0;
    let draft = 0;
    let qcing = 0;
    let inProduction = 0;
    let locked = 0;

    baseFilteredFields.forEach(field => {
      const mappings = mappingDetailsMap[field.id];
      if (!mappings || mappings.length === 0) {
        unmapped++;
      } else {
        const status = getFieldStatus(field.id);
        if (status === 'Draft') draft++;
        else if (status === 'QCing') qcing++;
        else if (status === 'In_Production') inProduction++;
        else if (status === 'Locked') locked++;
        else unmapped++;
      }
    });

    return {
      all: baseFilteredFields.length,
      Draft: draft,
      In_Production: inProduction,
      Locked: locked,
      mapped: draft + qcing + inProduction + locked,
      QCing: qcing,
      unmapped
    };
  }, [baseFilteredFields]);

  // ========== Step 3: 第二级过滤 (应用状态筛选) ==========
  const finalFilteredFields = useMemo(() => {
    if (filterStatus === 'all') {
      return baseFilteredFields;
    }

    return baseFilteredFields.filter(field => {
      if (filterStatus === 'unmapped') {
        const mappings = mappingDetailsMap[field.id];
        return !mappings || mappings.length === 0;
      }
      const fieldStatus = getFieldStatus(field.id);
      return fieldStatus === filterStatus;
    });
  }, [baseFilteredFields, filterStatus]);

  // ========== useEffect: 表单数据回显 ==========
  useEffect(() => {
    if (selectedFieldId) {
      const mappings = mappingDetailsMap[selectedFieldId] || [];
      if (mappings.length > 0) {
        form.setFieldsValue({
          mappings: mappings.map(m => ({
            derivation: m.derivation,
            id: m.id,
            programmer_name: m.programmer_name,
            status: m.status,
            target_domain: m.target_domain,
            target_variable: m.target_variable
          }))
        });
      } else {
        form.setFieldsValue({ mappings: [] });
      }
    }
  }, [selectedFieldId, form]);

  // ========== 保存映射 ==========
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      console.log('保存映射数据:', {
        mappings: values.mappings,
        source_field: selectedField?.field_name,
        source_id: selectedFieldId
      });
      messageApi.success(t('page.mdr.mapping.saveSuccess'));
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // ========== 提交 QC ==========
  const handleSubmitQC = () => {
    messageApi.info(t('page.mdr.mapping.submittedToQC'));
  };

  // ========== 打开导入弹窗 ==========
  const handleOpenUploadModal = () => {
    setIsUploadModalVisible(true);
    setFileList([]);
  };

  // ========== 关闭导入弹窗 ==========
  const handleCloseUploadModal = () => {
    setIsUploadModalVisible(false);
    setFileList([]);
    setIsUploading(false);
  };

  // ========== 自定义上传逻辑 ==========
  const customRequest: UploadProps['customRequest'] = options => {
    const { file, onError, onSuccess } = options;

    // 模拟上传成功
    setIsUploading(true);

    // 立即调用 onSuccess 模拟上传成功
    setTimeout(() => {
      onSuccess?.('ok');
    }, 500);

    // 模拟后端解析过程
    setTimeout(() => {
      try {
        // 模拟解析成功
        const importCount = Math.floor(Math.random() * 10) + 40; // 随机 40-50 条

        // 动态添加几条模拟数据（使用当前上下文的 analysisId）
        const currentAnalysisId = context.analysisId || 'analysis-001';
        const newFields: SourceField[] = [
          {
            analysisId: currentAnalysisId,
            description: 'Imported from Excel',
            field_label: 'Imported Field 1',
            field_name: 'IMP_FLD1',
            form_name: 'Imported Data',
            id: `src-import-${Date.now()}-1`,
            type: 'Num'
          },
          {
            analysisId: currentAnalysisId,
            description: 'Imported from Excel',
            field_label: 'Imported Field 2',
            field_name: 'IMP_FLD2',
            form_name: 'Imported Data',
            id: `src-import-${Date.now()}-2`,
            type: 'Char'
          },
          {
            analysisId: currentAnalysisId,
            description: 'Imported from Excel',
            field_label: 'Imported Field 3',
            field_name: 'IMP_FLD3',
            form_name: 'Imported Data',
            id: `src-import-${Date.now()}-3`,
            type: 'Date'
          }
        ];

        // 更新源字段列表
        setSourceFields(prev => [...prev, ...newFields]);

        messageApi.success(t('page.mdr.mapping.importSDRSuccess', { count: importCount }));
        handleCloseUploadModal();
      } catch (error) {
        messageApi.error(t('page.mdr.mapping.importSDRError'));
        setIsUploading(false);
      }
    }, 1500);
  };

  // ========== 上传配置 ==========
  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    beforeUpload: file => {
      const isValidType = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      if (!isValidType) {
        messageApi.error('只支持 .xlsx 和 .xls 格式的文件！');
        return Upload.LIST_IGNORE;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        messageApi.error('文件大小不能超过 10MB！');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    customRequest,
    fileList,
    maxCount: 1,
    multiple: false,
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
    },
    onRemove: () => {
      setFileList([]);
    }
  };

  // ========== 获取字段映射数量 ==========
  const getMappingCount = (fieldId: string): number => {
    return mappingDetailsMap[fieldId]?.length || 0;
  };

  // ========== 状态筛选按钮配置 (动态数字) ==========
  const statusFilterOptions: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: `${t('page.mdr.mapping.filterAll')} (${statusCounts.all})` },
    { key: 'unmapped', label: `${t('page.mdr.mapping.filterUnmapped')} (${statusCounts.unmapped})` },
    { key: 'Draft', label: `${t('page.mdr.mapping.filterDraft')} (${statusCounts.Draft})` },
    { key: 'QCing', label: `${t('page.mdr.mapping.filterQCing')} (${statusCounts.QCing})` },
    { key: 'In_Production', label: `${t('page.mdr.mapping.filterInProduction')} (${statusCounts.In_Production})` }
  ];

  // ========== 渲染源字段列表项 ==========
  const renderFieldItem = (field: SourceField) => {
    const isSelected = selectedFieldId === field.id;
    const status = getFieldStatus(field.id);
    const mappingCount = getMappingCount(field.id);

    return (
      <div
        key={field.id}
        className={`
          flex items-center gap-12px p-12px rounded-8px cursor-pointer
          transition-all duration-200 border-2px border-transparent
          ${isSelected ? 'bg-blue-50 border-blue-500 shadow-sm' : 'hover:bg-gray-50 hover:border-gray-200'}
        `}
        onClick={() => setSelectedFieldId(field.id)}
      >
        {/* 图标 */}
        <div
          className={`
          w-40px h-40px rounded-8px flex items-center justify-center flex-shrink-0
          ${field.type === 'Num' ? 'bg-blue-100 text-blue-600' : ''}
          ${field.type === 'Char' ? 'bg-green-100 text-green-600' : ''}
          ${field.type === 'Date' ? 'bg-orange-100 text-orange-600' : ''}
          ${field.type === 'DateTime' ? 'bg-purple-100 text-purple-600' : ''}
        `}
        >
          <div
            className={`text-20px ${field.type === 'Num' ? 'i-mdi-numeric' : ''} ${
              field.type === 'Char' ? 'i-mdi-format-text' : ''
            } ${field.type === 'Date' ? 'i-mdi-calendar' : ''} ${
              field.type === 'DateTime' ? 'i-mdi-calendar-clock' : ''
            }`}
          />
        </div>

        {/* 字段信息 */}
        <div className="min-w-0 flex-1">
          <div
            className={`text-14px truncate ${isSelected ? 'font-semibold text-blue-700' : 'font-medium text-gray-800'}`}
          >
            {field.field_name}
          </div>
          <div className="truncate text-12px text-gray-500">{field.field_label}</div>
          <div className="mt-2px text-10px text-gray-400">{field.form_name}</div>
        </div>

        {/* 映射数量 & 状态 */}
        <div className="flex flex-col flex-shrink-0 items-end gap-4px">
          {mappingCount > 0 && (
            <div className="flex items-center gap-4px text-12px">
              <div className="i-mdi-vector-line text-blue-500" />
              <span className="text-blue-600 font-medium">{mappingCount}</span>
            </div>
          )}
          {status && (
            <div
              className={`px-6px py-1px rounded-4px text-10px font-medium
              ${status === 'Draft' ? 'bg-blue-100 text-blue-700' : ''}
              ${status === 'QCing' ? 'bg-orange-100 text-orange-700' : ''}
              ${status === 'In_Production' ? 'bg-green-100 text-green-700' : ''}
              ${status === 'Locked' ? 'bg-purple-100 text-purple-700' : ''}
            `}
            >
              {t(`page.mdr.mapping.status.${status}`)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ========== Domain 选项（从 Study Spec 获取） ==========
  const domainOptions = useMemo(() => {
    return specDatasets.map(d => ({
      disabled: false,
      label: `${d.name} - ${d.label}`,
      value: d.name
    }));
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {contextHolder}

      {/* 未选择完整上下文时的提示 */}
      {!isReady && (
        <div className="border border-yellow-100 rounded-lg bg-yellow-50 px-16px py-12px text-center text-gray-500">
          <div className="text-14px">{t('page.mdr.mapping.selectRequired')}</div>
          <div className="mt-4px text-12px">{t('page.mdr.mapping.selectHint')}</div>
        </div>
      )}

      {/* 顶部标题栏 */}
      <div className="flex-none border-b border-gray-200 bg-white px-24px py-16px">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12px">
            <div className="i-mdi-database-edit text-24px text-blue-600" />
            <h1 className="m-0 text-20px font-semibold">{t('page.mdr.mapping.title')}</h1>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">{t('page.mdr.mapping.subtitle')}</span>
          </div>
          <div className="flex items-center gap-8px text-gray-500">
            <div className="i-mdi-information-outline" />
            <span className="text-12px">{t('page.mdr.mapping.supportOneToN')}</span>
          </div>
        </div>
      </div>

      {/* 主内容区 - 左右分栏布局 */}
      <div className="min-h-0 flex flex-1">
        {/* 左侧栏 - 源字段列表 (30%) */}
        <div className="min-w-300px w-30% flex flex-col border-r border-gray-200 bg-white">
          {/* 导入按钮区域 */}
          <div className="border-b border-gray-100 p-16px">
            <Button
              block
              className="h-40px"
              icon={<div className="i-mdi-file-excel" />}
              type="primary"
              onClick={handleOpenUploadModal}
            >
              {t('page.mdr.mapping.importSDR')}
            </Button>
          </div>

          {/* 筛选区域 */}
          <div className="border-b border-gray-100 p-16px space-y-12px">
            {/* 搜索框 */}
            <Input
              allowClear
              className="w-full"
              placeholder={t('page.mdr.mapping.searchPlaceholder')}
              prefix={<div className="i-mdi-magnify text-gray-400" />}
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
            />

            {/* 表单筛选下拉 */}
            <Select
              allowClear
              showSearch
              className="w-full"
              optionFilterProp="label"
              options={formNames}
              placeholder={t('page.mdr.mapping.filterByForm')}
              suffixIcon={<div className="i-mdi-folder-outline text-gray-400" />}
              value={selectedFormName}
              onChange={setSelectedFormName}
            />

            {/* 状态筛选按钮组 */}
            <div className="flex flex-wrap gap-4px">
              {statusFilterOptions.map(opt => (
                <Button
                  className="text-11px"
                  key={opt.key}
                  size="small"
                  type={filterStatus === opt.key ? 'primary' : 'default'}
                  onClick={() => setFilterStatus(opt.key)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 字段列表 */}
          <div className="flex-1 overflow-auto p-12px">
            <div className="space-y-8px">{finalFilteredFields.map(renderFieldItem)}</div>
            {finalFilteredFields.length === 0 && (
              <div className="h-200px flex-center text-gray-400">
                <div className="text-center">
                  <div className="i-mdi-database-off mb-8px text-48px opacity-30" />
                  <div>{t('page.mdr.mapping.noFieldsFound')}</div>
                </div>
              </div>
            )}
          </div>

          {/* 底部统计 */}
          <div className="border-t border-gray-100 bg-gray-50 p-12px">
            <div className="flex justify-between text-12px text-gray-500">
              <span>
                {t('page.mdr.mapping.showCount', { count: finalFilteredFields.length, total: sourceFields.length })}
              </span>
              <span>{t('page.mdr.mapping.mappedCount', { count: Object.keys(mappingDetailsMap).length })}</span>
            </div>
          </div>
        </div>

        {/* 右侧栏 - 映射编辑器 (70%) */}
        <div className="flex flex-col flex-1 bg-gray-50">
          {selectedFieldId ? (
            <>
              {/* 编辑器标题 */}
              <div className="border-b border-gray-200 bg-white px-24px py-12px">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-12px">
                    <span className="text-gray-500">{t('page.mdr.mapping.editing')}:</span>
                    <span className="text-blue-600 font-semibold">{selectedField?.field_name}</span>
                    <span className="text-gray-400">({selectedField?.field_label})</span>
                  </div>
                  <div className="flex items-center gap-8px">
                    <span className="text-12px text-gray-500">{t('page.mdr.mapping.sourceForm')}:</span>
                    <Tag>{selectedField?.form_name}</Tag>
                    <span className="ml-16px text-12px text-gray-500">{t('page.mdr.mapping.mappingCount')}:</span>
                    <Tag color="blue">{currentMappings.length}</Tag>
                  </div>
                </div>
              </div>

              {/* 表单区域 */}
              <div className="flex-1 overflow-auto p-24px">
                <div className="mx-auto max-w-900px">
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                  >
                    <Form.List name="mappings">
                      {(fields, { add, remove }) => (
                        <div className="flex flex-col gap-16px">
                          {/* 渲染所有映射卡片 */}
                          {fields.map((field, index) => {
                            const mapping = currentMappings[index] || createEmptyMapping();
                            return (
                              <MappingCard
                                domainOptions={domainOptions}
                                form={form}
                                index={index}
                                key={field.key}
                                mapping={mapping}
                                onRemove={remove}
                              />
                            );
                          })}

                          {/* 添加新映射按钮 */}
                          <Button
                            block
                            className="h-48px"
                            icon={<div className="i-mdi-plus" />}
                            type="dashed"
                            onClick={() => {
                              const newMapping = createEmptyMapping();
                              add({
                                derivation: {
                                  nl: '',
                                  r: '',
                                  sas: ''
                                },
                                id: newMapping.id,
                                programmer_name: 'Admin',
                                status: 'Draft',
                                target_domain: '',
                                target_variable: ''
                              });
                            }}
                          >
                            {t('page.mdr.mapping.addMapping')}
                          </Button>
                        </div>
                      )}
                    </Form.List>
                  </Form>
                </div>
              </div>

              {/* 底部操作栏 */}
              <div className="border-t border-gray-200 bg-white px-24px py-12px">
                <div className="flex items-center justify-end gap-8px">
                  <Button onClick={handleSubmitQC}>{t('page.mdr.mapping.submitQC')}</Button>
                  <Button
                    type="primary"
                    onClick={handleSave}
                  >
                    {t('page.mdr.mapping.save')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* 空状态提示 */
            <div className="flex-center flex-1">
              <div className="text-center">
                <div className="i-mdi-cursor-default-click mb-16px text-80px text-gray-300" />
                <div className="mb-8px text-18px text-gray-500">{t('page.mdr.mapping.selectFieldPrompt')}</div>
                <div className="text-14px text-gray-400">{t('page.mdr.mapping.clickToStart')}</div>
                <div className="mt-16px rounded-8px bg-blue-50 p-16px text-12px text-blue-600">
                  <div className="i-mdi-lightbulb-on-outline mr-4px inline-block" />
                  {t('page.mdr.mapping.oneToNHint')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 导入 SDR 弹窗 */}
      <Modal
        destroyOnClose
        footer={null}
        open={isUploadModalVisible}
        width={520}
        title={
          <div className="flex items-center gap-8px">
            <div className="i-mdi-file-excel text-green-600" />
            <span>{t('page.mdr.mapping.importSDRTitle')}</span>
          </div>
        }
        onCancel={handleCloseUploadModal}
      >
        <div className="py-16px">
          <Upload.Dragger {...uploadProps}>
            <div className="flex flex-col items-center justify-center py-24px">
              <div className="i-mdi-cloud-upload mb-16px text-56px text-blue-400" />
              <p className="mb-8px text-16px text-gray-700">{t('page.mdr.mapping.importSDRDesc')}</p>
              <p className="text-12px text-gray-400">{t('page.mdr.mapping.importSDRHint')}</p>
            </div>
          </Upload.Dragger>

          {isUploading && (
            <div className="mt-16px flex items-center justify-center gap-8px text-blue-600">
              <div className="i-mdi-loading animate-spin text-16px" />
              <span className="text-14px">{t('page.mdr.mapping.importSDRParsing')}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MappingStudio;
