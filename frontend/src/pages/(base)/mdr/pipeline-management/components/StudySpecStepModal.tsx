import { useState } from 'react'
import { Alert, Form, Radio, Select, Space, Typography } from 'antd'
import type { FormInstance } from 'antd'

const { Text } = Typography

export interface StudySpecFormValues {
  createSpec: 'yes' | 'no' | 'later'
  specInitMethod?: 'build' | 'copy_study' | 'copy_analysis'
  copyFromSpecId?: number
}

interface Props {
  form: FormInstance
  cdiscVersionConfigured: boolean
}

/**
 * Steps 3-4 of study creation modal:
 * - Step 3: Create spec? (yes / no / later)
 * - Step 4: If yes, how? (build from sources / copy from study / copy from analysis)
 */
export function StudySpecStepModal({ form, cdiscVersionConfigured }: Props) {
  const [createSpec, setCreateSpec] = useState<string>('later')
  const [initMethod, setInitMethod] = useState<string>('build')

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {!cdiscVersionConfigured && (
        <Alert
          type="warning"
          showIcon
          message="CDISC versions not configured for this study. Please configure them in the Study Configuration tab before or after creation."
        />
      )}

      <Form.Item
        label="Create Study Spec now?"
        name="createSpec"
        initialValue="later"
      >
        <Radio.Group onChange={(e) => setCreateSpec(e.target.value)}>
          <Space direction="vertical">
            <Radio value="yes">Yes — set up spec now</Radio>
            <Radio value="later">Later — I'll set it up after creation</Radio>
            <Radio value="no">No — this study won't have a spec</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>

      {createSpec === 'yes' && (
        <Form.Item
          label="Initialization method"
          name="specInitMethod"
          initialValue="build"
        >
          <Radio.Group onChange={(e) => setInitMethod(e.target.value)}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="build">
                <Text strong>Build from sources</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Open the domain picker after creation — select domains from CDISC Library, TA Spec, or Product Spec.
                </Text>
              </Radio>
              <Radio value="copy_study">
                <Text strong>Copy from existing study</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Clone all domains and variables from another study's spec.
                </Text>
              </Radio>
              <Radio value="copy_analysis">
                <Text strong>Copy from existing analysis</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Clone from a specific analysis spec snapshot.
                </Text>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>
      )}

      {createSpec === 'yes' && initMethod === 'copy_study' && (
        <Form.Item
          label="Select study to copy from"
          name="copyFromSpecId"
          rules={[{ required: true, message: 'Please select a study' }]}
        >
          <Select placeholder="Search and select a study..." showSearch optionFilterProp="label" />
        </Form.Item>
      )}

      {createSpec === 'yes' && initMethod === 'copy_analysis' && (
        <Form.Item
          label="Select analysis to copy from"
          name="copyFromSpecId"
          rules={[{ required: true, message: 'Please select an analysis' }]}
        >
          <Select placeholder="Search and select an analysis..." showSearch optionFilterProp="label" />
        </Form.Item>
      )}
    </Space>
  )
}
