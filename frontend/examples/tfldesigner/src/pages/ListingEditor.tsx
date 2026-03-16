import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Tabs, Form, Input, Select, Button, Space, message, InputNumber, Badge, Typography, Spin, Empty } from 'antd'
import { SaveOutlined, ExportOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ListingColumn, SortConfig, FilterConfig } from '../types'
import { 
  useListingStore, 
  datasetOptions, 
  populationOptions 
} from '../stores/listingStore'
import ColumnEditor from '../components/listing/ColumnEditor'
import SortConfigEditor from '../components/listing/SortConfig'
import ListingPreview from '../components/listing/ListingPreview'
import './ListingEditor.css'

const { Title } = Typography

export default function ListingEditor() {
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('metadata')
  const [loading, setLoading] = useState(true)
  
  const { 
    currentListing, 
    isDirty, 
    setCurrentListing, 
    updateMetadata, 
    markClean,
    listings,
  } = useListingStore()
  
  // Local state for columns and sorts (to work with component callbacks)
  const [columns, setColumns] = useState<ListingColumn[]>([])
  const [sorts, setSorts] = useState<SortConfig[]>([])
  const [filters, setFilters] = useState<FilterConfig[]>([])
  
  // Load listing on mount
  useEffect(() => {
    if (id) {
      const listing = listings.find(l => l.id === id)
      if (listing) {
        setCurrentListing(listing)
        form.setFieldsValue(listing)
        setColumns(listing.columns)
        setSorts(listing.sortBy || [])
        setFilters(listing.filter || [])
      } else {
        // Create new listing
        const newListing = {
          id: id,
          listingNumber: `Listing 16.${listings.length + 1}.1`,
          title: 'New Listing',
          population: 'Safety',
          dataset: 'ADSL',
          columns: [
            { id: 'c1', name: 'SUBJID', label: 'Subject ID', width: 100, align: 'left' as const },
          ],
          sortBy: [],
          filter: [],
          pageSize: 20,
        }
        setCurrentListing(newListing)
        form.setFieldsValue({
          listingNumber: newListing.listingNumber,
          title: newListing.title,
          population: newListing.population,
          dataset: newListing.dataset,
          pageSize: newListing.pageSize,
        })
        setColumns(newListing.columns)
        setSorts([])
        setFilters([])
      }
    }
    setLoading(false)
    
    return () => {
      setCurrentListing(null)
    }
  }, [id, listings, setCurrentListing, form])
  
  // Sync local state to store
  useEffect(() => {
    if (currentListing) {
      updateMetadata({ columns, sortBy: sorts, filter: filters })
    }
  }, [columns, sorts, filters, currentListing, updateMetadata])
  
  // Handle form field changes
  const handleFieldChange = (field: string, value: unknown) => {
    updateMetadata({ [field]: value })
  }
  
  // Save listing
  const handleSave = () => {
    form.validateFields().then(() => {
      message.success('Listing saved successfully')
      markClean()
    })
  }
  
  // Export listing configuration
  const handleExport = () => {
    if (!currentListing) return
    
    const config = JSON.stringify(currentListing, null, 2)
    const blob = new Blob([config], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${currentListing.listingNumber.replace(/\s+/g, '_')}_config.json`
    link.click()
    URL.revokeObjectURL(url)
    message.success('Listing configuration exported')
  }
  
  // Reset to default
  const handleReset = () => {
    if (currentListing) {
      form.setFieldsValue(currentListing)
      setColumns(currentListing.columns)
      setSorts(currentListing.sortBy || [])
      setFilters(currentListing.filter || [])
      message.info('Form reset to current saved state')
    }
  }
  
  if (loading || !currentListing) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />
  }
  
  const tabItems = [
    {
      key: 'metadata',
      label: 'Metadata',
      children: (
        <Form 
          form={form} 
          layout="vertical"
          onValuesChange={(changedValues) => {
            Object.keys(changedValues).forEach(key => {
              handleFieldChange(key, changedValues[key])
            })
          }}
        >
          <div style={{ maxWidth: 600 }}>
            <Form.Item 
              name="listingNumber" 
              label="Listing Number"
              rules={[{ required: true, message: 'Please enter listing number' }]}
            >
              <Input placeholder="e.g., Listing 16.1.1" />
            </Form.Item>
            <Form.Item 
              name="title" 
              label="Title"
              rules={[{ required: true, message: 'Please enter title' }]}
            >
              <Input placeholder="e.g., Adverse Events Listing" />
            </Form.Item>
            <Form.Item 
              name="population" 
              label="Population"
            >
              <Select options={populationOptions} />
            </Form.Item>
            <Form.Item 
              name="dataset" 
              label="Dataset"
              rules={[{ required: true, message: 'Please select a dataset' }]}
            >
              <Select 
                options={datasetOptions}
                onChange={(value) => handleFieldChange('dataset', value)}
              />
            </Form.Item>
            <Form.Item 
              name="pageSize" 
              label="Default Page Size"
              tooltip="Number of rows per page in preview"
            >
              <InputNumber min={10} max={200} step={10} />
            </Form.Item>
          </div>
        </Form>
      ),
    },
    {
      key: 'columns',
      label: (
        <Badge count={columns.length} size="small" offset={[10, 0]}>
          Columns
        </Badge>
      ),
      children: (
        <ColumnEditor 
          columns={columns} 
          onChange={setColumns} 
        />
      ),
    },
    {
      key: 'sort',
      label: (
        <Badge count={sorts.length} size="small" offset={[10, 0]}>
          Sort Order
        </Badge>
      ),
      children: (
        <SortConfigEditor 
          sorts={sorts}
          onChange={setSorts}
          columns={columns}
        />
      ),
    },
    {
      key: 'preview',
      label: 'Preview',
      children: currentListing ? (
        <ListingPreview
          listingNumber={currentListing.listingNumber}
          title={currentListing.title}
          population={currentListing.population}
          dataset={currentListing.dataset}
          columns={currentListing.columns || []}
          sortBy={currentListing.sortBy || []}
          filter={currentListing.filter || []}
          pageSize={currentListing.pageSize}
        />
      ) : <Empty description="No listing" />,
    },
  ]
  
  return (
    <div className="listing-editor">
      {/* Header */}
      <Card
        className="editor-card"
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {currentListing.listingNumber}
            </Title>
            <span style={{ color: '#666' }}>-</span>
            <span>{currentListing.title}</span>
            {isDirty && (
              <Badge status="processing" text="Unsaved changes" />
            )}
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              Reset
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              Export Config
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={handleSave}
              disabled={!isDirty}
            >
              Save
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>
      
      {/* Quick Stats */}
      <Card size="small" style={{ marginTop: 16 }}>
        <Space split={<span style={{ color: '#ccc' }}>|</span>}>
          <span>
            <strong>Dataset:</strong> {currentListing.dataset}
          </span>
          <span>
            <strong>Columns:</strong> {columns.length}
          </span>
          <span>
            <strong>Sort Keys:</strong> {sorts.length}
          </span>
          <span>
            <strong>Page Size:</strong> {currentListing.pageSize || 20}
          </span>
        </Space>
      </Card>
    </div>
  )
}