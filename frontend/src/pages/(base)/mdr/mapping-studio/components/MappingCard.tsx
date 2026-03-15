/**
 * MappingCard - 单个映射卡片组件
 *
 * 从 renderMappingCard 函数提取为独立组件，以正确使用 Form.useWatch hooks
 */
import { Button, Card, Form, Input, Select, Space, Tabs, Tag, Tooltip } from 'antd';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { type SpecVariable, getMappableVariables, getVariableDef, originConfig } from '../../study-spec/mockData';
import { type MappingItem, statusConfig } from '../mockData';

interface MappingCardProps {
  domainOptions: { disabled: boolean; label: string; value: string }[];
  form: ReturnType<typeof Form.useForm>[0];
  index: number;
  mapping: MappingItem;
  onRemove: (index: number) => void;
}

const MappingCard: React.FC<MappingCardProps> = ({ domainOptions, form, index, mapping, onRemove }) => {
  const { t } = useTranslation();

  // ✅ 在组件顶层正确调用 hooks
  const currentDomain = Form.useWatch(['mappings', index, 'target_domain'], form);
  const currentVariable = Form.useWatch(['mappings', index, 'target_variable'], form);

  // 获取当前 Domain 的变量选项
  const variableOptions = useMemo(() => {
    if (!currentDomain) return [];
    const variables = getMappableVariables(currentDomain);
    return variables.map(v => ({
      core: v.core,
      label: v.name,
      origin: v.origin,
      originColor: originConfig[v.origin].color,
      originLabel: originConfig[v.origin].label,
      value: v.name,
      variableLabel: v.label
    }));
  }, [currentDomain]);

  // 获取选中变量的详细信息
  const selectedVariableDef = useMemo(() => {
    return currentDomain && currentVariable ? getVariableDef(currentDomain, currentVariable) : null;
  }, [currentDomain, currentVariable]);

  // Tabs items 配置
  const derivationTabs = [
    {
      children: (
        <Form.Item
          className="mb-0"
          name={[index, 'derivation', 'sas']}
        >
          <Input.TextArea
            className="text-13px font-mono"
            placeholder={`-- SAS 推导逻辑 --\n例: IF AGE > 0 THEN DO;\n  AGE = SDR_AGE;\nEND;`}
            rows={8}
            style={{ fontFamily: 'JetBrains Mono, Consolas, monospace' }}
          />
        </Form.Item>
      ),
      key: 'sas',
      label: (
        <div className="flex items-center gap-4px">
          <div className="i-mdi-language-java text-orange-500" />
          <span>SAS</span>
        </div>
      )
    },
    {
      children: (
        <Form.Item
          className="mb-0"
          name={[index, 'derivation', 'r']}
        >
          <Input.TextArea
            className="text-13px font-mono"
            placeholder={`# R 推导逻辑\n例: df$AGE <- dplyr::if_else(df$SDR_AGE > 0, df$SDR_AGE, NA_real_)`}
            rows={8}
            style={{ fontFamily: 'JetBrains Mono, Consolas, monospace' }}
          />
        </Form.Item>
      ),
      key: 'r',
      label: (
        <div className="flex items-center gap-4px">
          <div className="i-mdi-language-r text-blue-500" />
          <span>R</span>
        </div>
      )
    },
    {
      children: (
        <Form.Item
          className="mb-0"
          name={[index, 'derivation', 'nl']}
        >
          <Input.TextArea
            className="text-13px"
            placeholder={`用自然语言描述推导逻辑，用于 AI 生成代码...\n例: 如果年龄大于0，则将源数据中的年龄赋值给目标变量`}
            rows={8}
          />
        </Form.Item>
      ),
      key: 'nl',
      label: (
        <div className="flex items-center gap-4px">
          <div className="i-mdi-text-box-outline text-green-500" />
          <span>Natural Language</span>
        </div>
      )
    }
  ];

  return (
    <Card
      className="shadow-sm"
      key={mapping.id}
      size="small"
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8px">
            <div className="i-mdi-vector-line text-purple-500" />
            <span>{t('page.mdr.mapping.mappingCard', { index: index + 1 })}</span>
            <Tag color={statusConfig[mapping.status].color}>{t(`page.mdr.mapping.status.${mapping.status}`)}</Tag>
          </div>
          <Button
            danger
            icon={<div className="i-mdi-delete-outline" />}
            size="small"
            type="text"
            onClick={() => onRemove(index)}
          >
            {t('page.mdr.mapping.delete')}
          </Button>
        </div>
      }
    >
      {/* 目标域和变量 - 级联选择器 */}
      <div className="grid grid-cols-2 mb-16px gap-16px">
        <Form.Item
          label={t('page.mdr.mapping.targetDomain')}
          name={[index, 'target_domain']}
          rules={[{ message: t('page.mdr.mapping.selectDomain'), required: true }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={domainOptions}
            placeholder={t('page.mdr.mapping.selectDomain')}
            onChange={() => {
              // 清空变量选择（级联重置）
              form.setFieldValue(['mappings', index, 'target_variable'], undefined);
            }}
          />
        </Form.Item>

        <Form.Item
          label={t('page.mdr.mapping.targetVariable')}
          name={[index, 'target_variable']}
          rules={[{ message: t('page.mdr.mapping.enterVariable'), required: true }]}
        >
          <Select
            showSearch
            disabled={!currentDomain}
            optionFilterProp="label"
            options={variableOptions}
            placeholder={currentDomain ? t('page.mdr.mapping.enterVariable') : '请先选择目标域'}
            optionRender={option => {
              const data = option.data as {
                core: string;
                label: string;
                origin: string;
                originColor: string;
                originLabel: string;
                value: string;
                variableLabel: string;
              };
              return (
                <div className="w-full flex items-center justify-between">
                  <Space>
                    <Tag
                      className="m-0 text-10px"
                      color={data.originColor}
                    >
                      {data.originLabel}
                    </Tag>
                    <span className="font-mono">{data.value}</span>
                    <span className="text-12px text-gray-400">{data.variableLabel}</span>
                  </Space>
                  <Tag className="m-0 text-10px">{data.core}</Tag>
                </div>
              );
            }}
          />
        </Form.Item>
      </div>

      {/* 选中变量的标准定义（来自 Study Spec） */}
      {selectedVariableDef && (
        <div className="mb-16px rounded-8px bg-blue-50 p-12px">
          <div className="mb-4px text-12px text-gray-500">
            {t('page.mdr.globalLibrary.cols.description')} (Study Spec)
          </div>
          <div className="grid grid-cols-4 gap-8px text-12px">
            <div>
              <span className="text-gray-400">{t('page.mdr.studySpec.cols.label')}: </span>
              <span>{selectedVariableDef.label}</span>
            </div>
            <div>
              <span className="text-gray-400">{t('page.mdr.studySpec.cols.dataType')}: </span>
              <Tag
                className="m-0"
                color={selectedVariableDef.dataType === 'Num' ? 'orange' : 'default'}
              >
                {selectedVariableDef.dataType}
              </Tag>
            </div>
            <div>
              <span className="text-gray-400">{t('page.mdr.studySpec.cols.origin')}: </span>
              <Tooltip title={originConfig[selectedVariableDef.origin].description}>
                <Tag
                  className="m-0"
                  color={originConfig[selectedVariableDef.origin].color}
                >
                  {originConfig[selectedVariableDef.origin].label}
                </Tag>
              </Tooltip>
            </div>
            <div>
              <span className="text-gray-400">{t('page.mdr.studySpec.cols.core')}: </span>
              <Tag
                className="m-0"
                color={
                  selectedVariableDef.core === 'Req' ? 'red' : selectedVariableDef.core === 'Exp' ? 'orange' : 'default'
                }
              >
                {selectedVariableDef.core}
              </Tag>
            </div>
            {selectedVariableDef.comment && (
              <div className="col-span-4">
                <span className="text-gray-400">{t('page.mdr.studySpec.cols.comment')}: </span>
                <span>{selectedVariableDef.comment}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 多模态推导逻辑编辑器 - Tabs */}
      <div className="mb-8px">
        <div className="mb-8px text-14px text-gray-600 font-medium">{t('page.mdr.mapping.derivationLogic')}</div>
        <Tabs
          className="derivation-tabs"
          defaultActiveKey="sas"
          items={derivationTabs}
          size="small"
          type="card"
        />
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-12px text-gray-400">
        <div className="flex items-center gap-16px">
          <span>
            {t('page.mdr.mapping.programmer')}: {mapping.programmer_name}
          </span>
        </div>
        <Form.Item
          noStyle
          name={[index, 'status']}
        >
          <Select
            disabled
            size="small"
            style={{ width: 120 }}
          >
            {Object.entries(statusConfig).map(([key, { color }]) => (
              <Select.Option
                key={key}
                value={key}
              >
                <Tag
                  className="mr-0"
                  color={color}
                >
                  {t(`page.mdr.mapping.status.${key}`)}
                </Tag>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </div>
    </Card>
  );
};

export default MappingCard;
