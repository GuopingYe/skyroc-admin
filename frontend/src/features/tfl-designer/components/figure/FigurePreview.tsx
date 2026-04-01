/**
 * TFL Builder - Figure Preview
 *
 * Interactive chart preview using ECharts (direct init for full control). Supports: line, bar, scatter, box, km_curve,
 * forest, waterfall
 *
 * Chart type switches are handled by destroying and re-initialising the ECharts instance (via React key) so no stale
 * series / axes remain.
 */
import { DownloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Space, Tag, Tooltip, Typography } from 'antd';
import { BarChart, BoxplotChart, LineChart, ScatterChart } from 'echarts/charts';
import { DatasetComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { ECOption } from '@/hooks/common/echarts';

import type { ChartType, IAxisConfig, IChartSeries, IFigureStyle, ILegendConfig } from '../../types';

const { Text } = Typography;

// Register ECharts modules for figure preview
echarts.use([
  TitleComponent,
  LegendComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  BarChart,
  BoxplotChart,
  LineChart,
  ScatterChart,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer
]);

// ==================== Types ====================

interface FigureConfig {
  chartType: ChartType;
  legend?: Partial<ILegendConfig>;
  series: IChartSeries[];
  style?: IFigureStyle;
  title?: string;
  xAxis: Partial<IAxisConfig>;
  yAxis: Partial<IAxisConfig>;
}

interface Props {
  config: FigureConfig | null;
  loading?: boolean;
  onStyleChange?: (style: Partial<IFigureStyle>) => void;
}

// ==================== Deterministic PRNG ====================
// Simple seeded random so chart data is stable between re-renders.

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ==================== Sample Data Generators ====================

function generateSampleX(type?: string, count: number = 20): (number | string)[] {
  if (type === 'categorical') return generateCategories(count);
  return Array.from({ length: count }, (_, i) => i * 2);
}

function generateSampleY(count: number, seriesIndex: number, wholeNumbers = false): number[] {
  const rng = seededRandom(seriesIndex * 1000 + 42);
  const base = 50 + seriesIndex * 15;
  return Array.from({ length: count }, () => {
    const value = base + (rng() - 0.5) * 40;
    return wholeNumbers ? Math.round(value) : Math.round(value * 100) / 100;
  });
}

function generateCategories(count: number): string[] {
  const categories = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H'];
  return categories.slice(0, Math.min(count, categories.length));
}

function generateBoxPlotData(count: number, groupIndex: number): number[] {
  const rng = seededRandom(groupIndex * 2000 + 99);
  const mean = 50 + groupIndex * 10;
  const std = 10 + rng() * 5;
  return Array.from({ length: count }, () => {
    const u1 = rng();
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  });
}

function generateKMCurve(
  _series: { color?: string; name?: string },
  index: number
): { xData: number[]; yData: number[] } {
  const rng = seededRandom(index * 3000 + 7);
  const n = 30;
  const times = Array.from({ length: n }, (_, i) => i * 3);
  const survivalRate = times.map(t => {
    const base = 1 - (t / 120) * (0.8 + index * 0.1);
    const noise = (rng() - 0.5) * 0.05;
    return Math.max(0, Math.min(1, base + noise));
  });
  return { xData: times, yData: survivalRate };
}

// ==================== Helpers ====================

function buildLegendData(series: IChartSeries[]): string[] {
  return series.map((s, i) => s.name || `Series ${i + 1}`).filter(Boolean);
}

function buildBoxPlotSummary(data: number[]): [number, number, number, number, number] {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  return [
    sorted[0],
    sorted[Math.floor(n * 0.25)],
    sorted[Math.floor(n * 0.5)],
    sorted[Math.floor(n * 0.75)],
    sorted[n - 1]
  ];
}

// ==================== ECharts Option Builders ====================

function buildLineOptions(config: FigureConfig): ECOption {
  const { legend, series = [], title = '', xAxis = {}, yAxis = {} } = config;
  const xValues = generateSampleX(xAxis.type, 20);

  return {
    grid: { bottom: 60, left: 80, right: 40, top: 50 },
    legend: {
      bottom: 0,
      data: buildLegendData(series),
      type: legend?.orientation === 'horizontal' ? 'scroll' : 'plain'
    },
    series: series.map((s, index) => ({
      data: generateSampleY(20, index),
      itemStyle: { color: s.color },
      lineStyle: {
        color: s.color,
        type:
          s.line?.dash === 'dash'
            ? ('dashed' as const)
            : s.line?.dash === 'dot'
              ? ('dotted' as const)
              : ('solid' as const),
        width: s.line?.width || 2
      },
      name: s.name || `Series ${index + 1}`,
      smooth: false,
      symbol: s.marker?.symbol || 'circle',
      symbolSize: s.marker?.size || 8,
      type: 'line' as const
    })),
    title: { left: 'center', text: title || 'Line Chart', textStyle: { fontFamily: 'Arial', fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: {
      axisLine: { lineStyle: { color: '#999' } },
      data: xAxis.type === 'categorical' ? (xValues as string[]) : undefined,
      name: xAxis.label || 'X-Axis',
      splitLine: { lineStyle: { color: '#eee' } },
      type: xAxis.type === 'categorical' ? 'category' : 'value'
    },
    yAxis: {
      axisLine: { lineStyle: { color: '#999' } },
      max: yAxis.range?.[1],
      min: yAxis.range?.[0],
      name: yAxis.label || 'Y-Axis',
      splitLine: { lineStyle: { color: '#eee' } },
      type: yAxis.type === 'categorical' ? 'category' : 'value'
    }
  };
}

function buildBarOptions(config: FigureConfig): ECOption {
  const { series = [], title = '', xAxis = {}, yAxis = {} } = config;
  const categories = generateCategories(5);

  return {
    grid: { bottom: 60, left: 80, right: 40, top: 50 },
    legend: { bottom: 0, data: buildLegendData(series), type: 'scroll' },
    series: series.map((s, index) => ({
      barCategoryGap: '30%',
      barGap: '20%',
      data: generateSampleY(5, index, true),
      itemStyle: { borderRadius: [4, 4, 0, 0], color: s.color },
      name: s.name || `Series ${index + 1}`,
      type: 'bar' as const
    })),
    title: { left: 'center', text: title || 'Bar Chart', textStyle: { fontFamily: 'Arial', fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { data: categories, name: xAxis.label || 'X-Axis', type: 'category' },
    yAxis: { max: yAxis.range?.[1], min: yAxis.range?.[0], name: yAxis.label || 'Y-Axis', type: 'value' }
  };
}

function buildScatterOptions(config: FigureConfig): ECOption {
  const { series = [], title = '', xAxis = {}, yAxis = {} } = config;

  return {
    grid: { bottom: 60, left: 80, right: 40, top: 50 },
    legend: { bottom: 0, data: buildLegendData(series), type: 'scroll' },
    series: series.map((s, index) => ({
      data: generateSampleX('continuous', 30).map((x, i) => [x, generateSampleY(30, index)[i]]),
      itemStyle: { color: s.color },
      name: s.name || `Series ${index + 1}`,
      symbolSize: s.marker?.size || 10,
      type: 'scatter' as const
    })),
    title: { left: 'center', text: title || 'Scatter Plot', textStyle: { fontFamily: 'Arial', fontSize: 14 } },
    tooltip: { trigger: 'item' },
    xAxis: { name: xAxis.label || 'X-Axis', type: 'value' },
    yAxis: { max: yAxis.range?.[1], min: yAxis.range?.[0], name: yAxis.label || 'Y-Axis', type: 'value' }
  };
}

function buildBoxPlotOptions(config: FigureConfig): ECOption {
  const { series = [], title = '', yAxis = {} } = config;
  const categories = generateCategories(series.length || 3);

  return {
    grid: { bottom: 60, left: 80, right: 40, top: 50 },
    legend: { bottom: 0, data: buildLegendData(series), type: 'scroll' },
    series: series.map((s, index) => {
      const rawData = generateBoxPlotData(50, index);
      const summary = buildBoxPlotSummary(rawData);
      return {
        data: [summary],
        itemStyle: { borderColor: s.color || '#1890ff', color: s.color || undefined },
        name: s.name || `Group ${index + 1}`,
        type: 'boxplot' as const
      };
    }),
    title: { left: 'center', text: title || 'Box Plot', textStyle: { fontFamily: 'Arial', fontSize: 14 } },
    tooltip: { trigger: 'item' },
    xAxis: { data: categories, type: 'category' },
    yAxis: { max: yAxis.range?.[1], min: yAxis.range?.[0], name: yAxis.label || 'Value', type: 'value' }
  };
}

function buildKMCurveOptions(config: FigureConfig): ECOption {
  const { series = [], title = '', xAxis = {}, yAxis = {} } = config;

  return {
    grid: { bottom: 60, left: 80, right: 40, top: 50 },
    legend: { bottom: 0, data: buildLegendData(series), type: 'scroll' },
    series: series.map((s, index) => {
      const { xData, yData } = generateKMCurve(s, index);
      const stepData: [number, number, number, number][] = [];
      for (let i = 0; i < xData.length; i++) {
        if (i < xData.length - 1) {
          stepData.push([xData[i], yData[i], xData[i + 1], yData[i]]);
        } else {
          stepData.push([xData[i], yData[i], xData[i], yData[i]]);
        }
      }
      return {
        areaStyle: { color: s.color, opacity: 0.05 },
        data: stepData,
        lineStyle: { color: s.color, width: 2 },
        name: s.name || `Treatment ${index + 1}`,
        showSymbol: false,
        step: 'end' as const,
        type: 'line' as const
      };
    }),
    title: {
      left: 'center',
      text: title || 'Kaplan-Meier Survival Curve',
      textStyle: { fontFamily: 'Arial', fontSize: 14 }
    },
    tooltip: { trigger: 'axis' },
    xAxis: { name: xAxis.label || 'Time (days)', type: 'value' },
    yAxis: { max: 1, min: 0, name: yAxis.label || 'Survival Probability', type: 'value' }
  };
}

// ==================== Forest Plot ====================
// Scatter for point estimates + line series with null-separated segments for CI whiskers.

function buildForestPlotOptions(config: FigureConfig): ECOption {
  const { series = [], title = '', xAxis = {}, yAxis = {} } = config;
  const subgroups = ['Age < 65', 'Age >= 65', 'Male', 'Female', 'Overall'];
  const rng = seededRandom(9999);

  // Generate HR and CI data for each subgroup
  const plotData = subgroups.map(() => {
    const hr = 0.7 + rng() * 0.6;
    const lo = Math.max(0.1, hr - 0.12 - rng() * 0.2);
    const hi = hr + 0.12 + rng() * 0.2;
    return { hi, hr, lo };
  });

  const refLine = 1; // null-effect line at HR = 1

  // Build CI whisker data: pairs of [x, y] separated by null
  // y uses numeric index matching the category axis position
  const ciLineData: (number[] | null)[] = [];
  plotData.forEach((d, i) => {
    ciLineData.push([d.lo, i]);
    ciLineData.push([d.hi, i]);
    ciLineData.push(null); // break before next segment
  });

  return {
    grid: { bottom: 60, left: 120, right: 40, top: 50 },
    legend: { bottom: 0, data: [...buildLegendData(series), '95% CI'] },
    series: [
      // Null-effect reference line at HR = 1
      {
        data: [
          [refLine, 0],
          [refLine, subgroups.length - 1]
        ],
        lineStyle: { color: '#ccc', type: 'dashed', width: 1 },
        name: 'Null effect',
        silent: true,
        symbol: 'none' as const,
        tooltip: { show: false },
        type: 'line' as const
      },
      // Point estimates (scatter)
      ...(series.length > 0
        ? series.map((s, _sIdx) => ({
            data: plotData.map((d, i) => [d.hr, i]),
            itemStyle: { color: s.color || '#1890ff' },
            name: s.name || 'HR',
            symbolSize: 10,
            type: 'scatter' as const,
            z: 10
          }))
        : [
            {
              data: plotData.map((d, i) => [d.hr, i]),
              itemStyle: { color: '#1890ff' },
              name: 'HR',
              symbolSize: 10,
              type: 'scatter' as const,
              z: 10
            }
          ]),
      // CI whisker lines
      {
        data: ciLineData,
        lineStyle: { color: '#666', width: 2 },
        name: '95% CI',
        showSymbol: false,
        silent: true,
        symbol: 'none' as const,
        tooltip: { show: false },
        type: 'line' as const,
        z: 5
      }
    ],
    title: { left: 'center', text: title || 'Forest Plot', textStyle: { fontFamily: 'Arial', fontSize: 14 } },
    tooltip: {
      formatter: (params: any) => {
        if (params.seriesName === '95% CI' || params.componentType !== 'series') return '';
        const d = plotData[params.dataIndex as number];
        if (!d) return params.name;
        return `${subgroups[params.dataIndex]}<br/>HR = ${d.hr.toFixed(2)} [${d.lo.toFixed(2)}, ${d.hi.toFixed(2)}]`;
      },
      trigger: 'item'
    },
    xAxis: {
      axisLine: { lineStyle: { color: '#999' } },
      max: xAxis.range?.[1] ?? 2.5,
      min: xAxis.range?.[0] ?? 0.3,
      name: xAxis.label || 'Hazard Ratio (95% CI)',
      type: 'value'
    },
    yAxis: {
      axisLine: { lineStyle: { color: '#999' } },
      data: subgroups,
      splitLine: { show: false },
      type: 'category'
    }
  };
}

// ==================== Waterfall Plot ====================
// Simulated using stacked bar: transparent base + positive bars + negative bars.
// Per official ECharts cookbook: https://echarts.apache.org/handbook/en/how-to/chart-types/bar/waterfall/

function buildWaterfallOptions(config: FigureConfig): ECOption {
  const { series = [], title = '', xAxis = {}, yAxis = {} } = config;
  const rng = seededRandom(5555);

  // Clinical waterfall categories (tumor response)
  const categories = ['Screening', 'Cycle 1', 'Cycle 2', 'Cycle 3', 'Cycle 4', 'Cycle 5', 'Cycle 6', 'End of Tx'];

  // Generate change values (positive = increase, negative = decrease)
  const data = categories.map((_, i) => {
    if (i === 0) return 100; // baseline
    if (i === categories.length - 1) return -(10 + rng() * 20); // end treatment drop
    return (rng() - 0.5) * 40; // random change
  });

  // Compute stacked-bar helper arrays
  const help: number[] = [];
  const positive: (number | string)[] = [];
  const negative: (number | string)[] = [];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    if (data[i] >= 0) {
      positive.push(data[i]);
      negative.push('-');
    } else {
      positive.push('-');
      negative.push(-data[i]);
    }
    if (i === 0) {
      help.push(0);
    } else if (data[i] < 0) {
      help.push(sum + data[i]);
    } else {
      help.push(sum);
    }
    sum += data[i];
  }

  const seriesColor = series.length > 0 ? series[0].color : '#1890ff';

  return {
    grid: { bottom: 60, left: 80, right: 40, top: 50 },
    series: [
      // Transparent helper — creates the floating bar effect
      {
        data: help,
        emphasis: { itemStyle: { borderColor: 'rgba(0,0,0,0)', color: 'rgba(0,0,0,0)' } },
        itemStyle: { borderColor: 'rgba(0,0,0,0)', color: 'rgba(0,0,0,0)' },
        name: 'Helper',
        stack: 'all',
        tooltip: { show: false },
        type: 'bar' as const
      },
      // Positive changes
      {
        data: positive,
        itemStyle: { borderRadius: [4, 4, 0, 0], color: '#52c41a' },
        name: 'Increase',
        stack: 'all',
        type: 'bar' as const
      },
      // Negative changes
      {
        data: negative,
        itemStyle: { borderRadius: [0, 0, 4, 4], color: '#ff4d4f' },
        name: 'Decrease',
        stack: 'all',
        type: 'bar' as const
      }
    ],
    title: { left: 'center', text: title || 'Waterfall Plot', textStyle: { fontFamily: 'Arial', fontSize: 14 } },
    tooltip: { axisPointer: { type: 'shadow' }, trigger: 'axis' },
    xAxis: {
      axisLine: { lineStyle: { color: '#999' } },
      data: categories,
      name: xAxis.label || 'Visit',
      splitLine: { show: false },
      type: 'category'
    },
    yAxis: {
      axisLine: { lineStyle: { color: '#999' } },
      name: yAxis.label || 'Sum (%)',
      splitLine: { lineStyle: { color: '#eee' } },
      type: 'value'
    }
  };
}

// ==================== Dispatcher ====================

function buildChartOptions(config: FigureConfig): ECOption {
  switch (config.chartType) {
    case 'line':
      return buildLineOptions(config);
    case 'bar':
      return buildBarOptions(config);
    case 'scatter':
      return buildScatterOptions(config);
    case 'box':
      return buildBoxPlotOptions(config);
    case 'km_curve':
      return buildKMCurveOptions(config);
    case 'forest':
      return buildForestPlotOptions(config);
    case 'waterfall':
      return buildWaterfallOptions(config);
    default:
      return buildLineOptions(config);
  }
}

const SUPPORTED_CHART_TYPES = new Set<ChartType>(['line', 'bar', 'scatter', 'box', 'km_curve', 'forest', 'waterfall']);
const UNSUPPORTED_CHART_TYPES: Partial<Record<ChartType, string>> = {
  violin: 'Violin Plot'
};

// ==================== Component ====================

export default function FigurePreview({ config, loading = false, onStyleChange }: Props) {
  const { t } = useTranslation();
  const domRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const chartType = config?.chartType || '';
  const isUnsupported = Boolean(UNSUPPORTED_CHART_TYPES[chartType as ChartType]);

  const chartOptions = useMemo(() => {
    if (!config || !config.chartType || isUnsupported) return null;
    return buildChartOptions(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config?.chartType,
    config?.title,
    config?.xAxis?.label,
    config?.xAxis?.type,
    config?.yAxis?.label,
    config?.yAxis?.range,
    config?.series?.length,
    isUnsupported
  ]);

  // Init / update chart — key ensures full re-init on chart type switch
  useEffect(() => {
    if (!domRef.current) return;

    // Dispose previous instance (key change = new mount)
    chartRef.current?.dispose();
    chartRef.current = null;

    if (!chartOptions) return;

    chartRef.current = echarts.init(domRef.current, 'light');
    chartRef.current.setOption({ ...chartOptions, backgroundColor: 'transparent' });

    const ro = new ResizeObserver(() => chartRef.current?.resize());
    ro.observe(domRef.current);
    return () => {
      ro.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [chartOptions, chartType]);

  // Configuration hints
  const hints = useMemo(() => {
    const items: string[] = [];
    if (!config) return items;
    if (!config.chartType) items.push(t('page.mdr.tflDesigner.figureHints.selectChartType'));
    if (config.chartType && config.series.length === 0) items.push(t('page.mdr.tflDesigner.figureHints.addSeries'));
    if (config.chartType && !config.xAxis?.label) items.push(t('page.mdr.tflDesigner.figureHints.configureXAxis'));
    if (config.chartType && !config.yAxis?.label) items.push(t('page.mdr.tflDesigner.figureHints.configureYAxis'));
    if (UNSUPPORTED_CHART_TYPES[config.chartType]) items.push(t('page.mdr.tflDesigner.figureHints.unsupportedType'));
    return items;
  }, [config, t]);

  if (!config || !config.chartType) {
    return (
      <div className="h-full min-h-[300px] flex items-center justify-center">
        <Empty description={t('page.mdr.tflDesigner.figureHints.selectChartType')} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-8px overflow-auto">
      {/* Hints */}
      {hints.length > 0 && (
        <Alert
          showIcon
          icon={<InfoCircleOutlined />}
          type={isUnsupported ? 'warning' : 'info'}
          message={
            <div className="flex flex-col gap-2px">
              {hints.map((hint, i) => (
                <Text
                  className="text-12px"
                  key={i}
                >
                  {hint}
                </Text>
              ))}
            </div>
          }
        />
      )}

      {/* Chart type tag + export */}
      <div className="flex flex-shrink-0 items-center justify-between">
        <Space>
          <Tag>{config.chartType}</Tag>
          {config.xAxis?.logScale && <Tag color="blue">Log Scale (X)</Tag>}
          {config.yAxis?.logScale && <Tag color="blue">Log Scale (Y)</Tag>}
        </Space>
        <Tooltip title="Export as PNG">
          <Button
            icon={<DownloadOutlined />}
            size="small"
            type="text"
            onClick={() => {
              const canvas = domRef.current?.querySelector('canvas');
              if (canvas) {
                const url = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url;
                a.download = `${config.title || 'figure'}.png`;
                a.click();
              }
            }}
          />
        </Tooltip>
      </div>

      {/* Chart container — key forces re-mount on chart type change */}
      {isUnsupported ? (
        <div className="min-h-[300px] flex flex-1 items-center justify-center rounded bg-gray-50">
          <Empty
            description={`${UNSUPPORTED_CHART_TYPES[config.chartType]} — coming soon`}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : (
        <div
          className="min-h-[300px] w-full flex-1 rounded bg-gray-50"
          key={chartType}
          ref={domRef}
        />
      )}
    </div>
  );
}
