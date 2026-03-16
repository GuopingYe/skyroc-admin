import { useMemo } from 'react'
import Plot from 'react-plotly.js'
import { Card, Spin, Empty, Row, Col, InputNumber, Space } from 'antd'
import { FullscreenOutlined, ZoomOutOutlined } from '@ant-design/icons'
import type { FigureShell } from '../../types'

interface FigurePreviewProps {
  figure: FigureShell
  loading?: boolean
  onStyleChange?: (style: Partial<NonNullable<FigureShell['style']>>) => void
}

export default function FigurePreview({ 
  figure, 
  loading = false,
  onStyleChange 
}: FigurePreviewProps) {
  const plotData = useMemo(() => {
    return generatePlotData(figure)
  }, [figure])

  const plotLayout = useMemo(() => {
    return generatePlotLayout(figure)
  }, [figure])

  const plotConfig = useMemo(() => {
    return {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      toImageButtonOptions: {
        format: 'png' as const,
        filename: figure.figureNumber || 'figure',
        height: figure.style?.height || 600,
        width: figure.style?.width || 800,
        scale: 2,
      },
    }
  }, [figure])

  if (loading) {
    return (
      <Card title="Preview (预览)" style={{ minHeight: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <Spin size="large" tip="Loading..." />
        </div>
      </Card>
    )
  }

  if (!figure || !figure.chartType) {
    return (
      <Card title="Preview (预览)" style={{ minHeight: 500 }}>
        <Empty description="No figure to preview" />
      </Card>
    )
  }

  return (
    <Card 
      title={
        <Space>
          <span>Preview</span>
          <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal' }}>
            (预览)
          </span>
        </Space>
      }
      extra={
        <Space size="small">
          <ZoomOutOutlined style={{ cursor: 'pointer', color: '#1890ff' }} />
          <FullscreenOutlined style={{ cursor: 'pointer', color: '#1890ff' }} />
        </Space>
      }
      size="small"
    >
      {/* Size Controls */}
      {onStyleChange && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <label style={{ fontSize: 12, color: '#999' }}>Width (px)</label>
            <InputNumber
              value={figure.style?.width || 800}
              onChange={(width) => width && onStyleChange({ width })}
              min={400}
              max={2000}
              step={50}
              style={{ width: '100%', marginTop: 4 }}
            />
          </Col>
          <Col span={6}>
            <label style={{ fontSize: 12, color: '#999' }}>Height (px)</label>
            <InputNumber
              value={figure.style?.height || 600}
              onChange={(height) => height && onStyleChange({ height })}
              min={300}
              max={1500}
              step={50}
              style={{ width: '100%', marginTop: 4 }}
            />
          </Col>
        </Row>
      )}

      {/* Plotly Chart */}
      <div style={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center',
        background: '#fafafa',
        borderRadius: 4,
        padding: 16
      }}>
        <Plot
          data={plotData}
          layout={plotLayout}
          config={plotConfig}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler
        />
      </div>
    </Card>
  )
}

// Helper function to generate Plotly data traces
function generatePlotData(figure: FigureShell) {
  const { chartType, series, xAxis } = figure

  return series.map((s, index) => {
    const baseTrace = {
      name: s.name || `Series ${index + 1}`,
      marker: { color: s.color },
    }

    switch (chartType) {
      case 'line':
        return {
          ...baseTrace,
          type: 'scatter' as const,
          mode: 'lines+markers' as const,
          x: generateSampleX(xAxis.type, 20),
          y: generateSampleY(20, index),
          line: {
            width: s.line?.width || 2,
            dash: s.line?.dash || 'solid',
          },
          marker: {
            ...baseTrace.marker,
            symbol: s.marker?.symbol || 'circle',
            size: s.marker?.size || 8,
          },
        }

      case 'scatter':
        return {
          ...baseTrace,
          type: 'scatter' as const,
          mode: 'markers' as const,
          x: generateSampleX('continuous', 30),
          y: generateSampleY(30, index),
          marker: {
            ...baseTrace.marker,
            symbol: s.marker?.symbol || 'circle',
            size: s.marker?.size || 10,
          },
        }

      case 'bar':
        return {
          ...baseTrace,
          type: 'bar' as const,
          x: generateCategories(5),
          y: generateSampleY(5, index, true),
        }

      case 'box':
        return {
          ...baseTrace,
          type: 'box' as const,
          name: s.name || `Group ${index + 1}`,
          y: generateBoxPlotData(50, index),
          boxpoints: 'outliers' as const,
          marker: {
            ...baseTrace.marker,
            outliercolor: 'rgba(0,0,0,1)',
          },
        }

      case 'km_curve':
        return generateKMCurve(s, index)

      default:
        return {
          ...baseTrace,
          type: 'scatter' as const,
          x: generateSampleX('continuous', 20),
          y: generateSampleY(20, index),
        }
    }
  })
}

// Helper function to generate Plotly layout
function generatePlotLayout(figure: FigureShell) {
  const { xAxis, yAxis, title, legend, style, series } = figure

  const axisType = xAxis.logScale ? 'log' : undefined
  
  return {
    title: {
      text: title || 'Figure Title',
      font: {
        size: 16,
        family: style?.fontFamily || 'Arial',
      },
    },
    xaxis: {
      title: { text: xAxis.label || 'X-Axis' },
      type: axisType as 'log' | 'linear' | undefined,
      range: xAxis.range,
      tickformat: xAxis.tickFormat,
      gridcolor: '#e0e0e0',
      linecolor: '#999',
      ticks: 'outside' as const,
      ticklen: 5,
    },
    yaxis: {
      title: { text: yAxis.label || 'Y-Axis' },
      type: (yAxis.logScale ? 'log' : undefined) as 'log' | 'linear' | undefined,
      range: yAxis.range,
      tickformat: yAxis.tickFormat,
      gridcolor: '#e0e0e0',
      linecolor: '#999',
      ticks: 'outside' as const,
      ticklen: 5,
    },
    showlegend: series.length > 1,
    legend: {
      x: legend?.position === 'right' ? 1.02 : legend?.position === 'left' ? -0.2 : 0.5,
      y: legend?.position === 'top' ? 1.1 : legend?.position === 'bottom' ? -0.2 : 0.5,
      xanchor: 'center' as const,
      yanchor: 'middle' as const,
      orientation: (legend?.orientation === 'horizontal' ? 'h' : 'v') as 'h' | 'v',
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#e0e0e0',
      borderwidth: 1,
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: '#fafafa',
    autosize: true,
    margin: { t: 60, r: 120, b: 60, l: 80 },
    font: {
      family: style?.fontFamily || 'Arial',
      size: style?.fontSize || 12,
    },
  }
}

// Sample data generators
function generateSampleX(type: string, count: number): number[] | string[] {
  if (type === 'categorical') {
    return generateCategories(count)
  }
  return Array.from({ length: count }, (_, i) => i * 2)
}

function generateSampleY(count: number, seriesIndex: number, wholeNumbers = false): number[] {
  const base = 50 + seriesIndex * 15
  return Array.from({ length: count }, () => {
    const value = base + (Math.random() - 0.5) * 40
    return wholeNumbers ? Math.round(value) : Math.round(value * 100) / 100
  })
}

function generateCategories(count: number): string[] {
  const categories = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H']
  return categories.slice(0, Math.min(count, categories.length))
}

function generateBoxPlotData(count: number, groupIndex: number): number[] {
  const mean = 50 + groupIndex * 10
  const std = 10 + Math.random() * 5
  return Array.from({ length: count }, () => {
    const u1 = Math.random()
    const u2 = Math.random()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return mean + z * std
  })
}

function generateKMCurve(series: { name?: string; color?: string }, index: number) {
  // Generate Kaplan-Meier style curve
  const n = 30
  const times = Array.from({ length: n }, (_, i) => i * 3)
  const survivalRate = times.map((t) => {
    const base = 1 - (t / 120) * (0.8 + index * 0.1)
    const noise = (Math.random() - 0.5) * 0.05
    return Math.max(0, Math.min(1, base + noise))
  })

  return {
    type: 'scatter' as const,
    mode: 'lines' as const,
    name: series.name || `Treatment ${index + 1}`,
    x: times,
    y: survivalRate,
    line: {
      color: series.color,
      width: 2,
      shape: 'hv' as const, // Step function for KM curves
    },
    marker: { color: series.color },
  }
}