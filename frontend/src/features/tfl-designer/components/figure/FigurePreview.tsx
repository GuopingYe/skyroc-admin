/**
 * TFL Builder - Figure Preview
 *
 * Interactive chart preview using ECharts (direct init for full control).
 * Supports: line, bar, scatter, box, km_curve, forest, waterfall
 *
 * Chart type switches are handled by destroying and re-initialising the
 * ECharts instance (via React key) so no stale series / axes remain.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Space, Button, Tag, Tooltip, Empty, Alert, Typography } from 'antd';
import { DownloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import * as echarts from 'echarts/core';
import { BarChart, BoxplotChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent, LegendComponent, TitleComponent, TooltipComponent, DatasetComponent,
} from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import type { ECOption } from '@/hooks/common/echarts';
import type { IAxisConfig, IChartSeries, ChartType, IFigureStyle, ILegendConfig } from '../../types';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

// Register ECharts modules for figure preview
echarts.use([
  TitleComponent, LegendComponent, TooltipComponent, GridComponent,
  DatasetComponent, BarChart, BoxplotChart, LineChart, ScatterChart,
  LabelLayout, UniversalTransition, CanvasRenderer,
]);

// ==================== Types ====================

interface FigureConfig {
  chartType: ChartType;
  xAxis: Partial<IAxisConfig>;
  yAxis: Partial<IAxisConfig>;
  series: IChartSeries[];
  title?: string;
  legend?: Partial<ILegendConfig>;
  style?: IFigureStyle;
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
  _series: { name?: string; color?: string },
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
  return [sorted[0], sorted[Math.floor(n * 0.25)], sorted[Math.floor(n * 0.5)], sorted[Math.floor(n * 0.75)], sorted[n - 1]];
}

// ==================== ECharts Option Builders ====================

function buildLineOptions(config: FigureConfig): ECOption {
  const { series = [], xAxis = {}, yAxis = {}, title = '', legend } = config;
  const xValues = generateSampleX(xAxis.type, 20);

  return {
    title: { text: title || 'Line Chart', left: 'center', textStyle: { fontSize: 14, fontFamily: 'Arial' } },
    tooltip: { trigger: 'axis' },
    legend: { data: buildLegendData(series), bottom: 0, type: legend?.orientation === 'horizontal' ? 'scroll' : 'plain' },
    grid: { left: 80, right: 40, top: 50, bottom: 60 },
    xAxis: {
      type: xAxis.type === 'categorical' ? 'category' : 'value',
      name: xAxis.label || 'X-Axis',
      data: xAxis.type === 'categorical' ? (xValues as string[]) : undefined,
      axisLine: { lineStyle: { color: '#999' } },
      splitLine: { lineStyle: { color: '#eee' } },
    },
    yAxis: {
      type: yAxis.type === 'categorical' ? 'category' : 'value',
      name: yAxis.label || 'Y-Axis',
      min: yAxis.range?.[0],
      max: yAxis.range?.[1],
      axisLine: { lineStyle: { color: '#999' } },
      splitLine: { lineStyle: { color: '#eee' } },
    },
    series: series.map((s, index) => ({
      name: s.name || `Series ${index + 1}`,
      type: 'line' as const,
      data: generateSampleY(20, index),
      smooth: false,
      symbol: s.marker?.symbol || 'circle',
      symbolSize: s.marker?.size || 8,
      lineStyle: {
        width: s.line?.width || 2,
        type: s.line?.dash === 'dash' ? 'dashed' as const : s.line?.dash === 'dot' ? 'dotted' as const : 'solid' as const,
        color: s.color,
      },
      itemStyle: { color: s.color },
    })),
  };
}

function buildBarOptions(config: FigureConfig): ECOption {
  const { series = [], xAxis = {}, yAxis = {}, title = '' } = config;
  const categories = generateCategories(5);

  return {
    title: { text: title || 'Bar Chart', left: 'center', textStyle: { fontSize: 14, fontFamily: 'Arial' } },
    tooltip: { trigger: 'axis' },
    legend: { data: buildLegendData(series), bottom: 0, type: 'scroll' },
    grid: { left: 80, right: 40, top: 50, bottom: 60 },
    xAxis: { type: 'category', name: xAxis.label || 'X-Axis', data: categories },
    yAxis: { type: 'value', name: yAxis.label || 'Y-Axis', min: yAxis.range?.[0], max: yAxis.range?.[1] },
    series: series.map((s, index) => ({
      name: s.name || `Series ${index + 1}`,
      type: 'bar' as const,
      data: generateSampleY(5, index, true),
      itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0] },
      barGap: '20%',
      barCategoryGap: '30%',
    })),
  };
}

function buildScatterOptions(config: FigureConfig): ECOption {
  const { series = [], xAxis = {}, yAxis = {}, title = '' } = config;

  return {
    title: { text: title || 'Scatter Plot', left: 'center', textStyle: { fontSize: 14, fontFamily: 'Arial' } },
    tooltip: { trigger: 'item' },
    legend: { data: buildLegendData(series), bottom: 0, type: 'scroll' },
    grid: { left: 80, right: 40, top: 50, bottom: 60 },
    xAxis: { type: 'value', name: xAxis.label || 'X-Axis' },
    yAxis: { type: 'value', name: yAxis.label || 'Y-Axis', min: yAxis.range?.[0], max: yAxis.range?.[1] },
    series: series.map((s, index) => ({
      name: s.name || `Series ${index + 1}`,
      type: 'scatter' as const,
      data: generateSampleX('continuous', 30).map((x, i) => [x, generateSampleY(30, index)[i]]),
      symbolSize: s.marker?.size || 10,
      itemStyle: { color: s.color },
    })),
  };
}

function buildBoxPlotOptions(config: FigureConfig): ECOption {
  const { series = [], yAxis = {}, title = '' } = config;
  const categories = generateCategories(series.length || 3);

  return {
    title: { text: title || 'Box Plot', left: 'center', textStyle: { fontSize: 14, fontFamily: 'Arial' } },
    tooltip: { trigger: 'item' },
    legend: { data: buildLegendData(series), bottom: 0, type: 'scroll' },
    grid: { left: 80, right: 40, top: 50, bottom: 60 },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value', name: yAxis.label || 'Value', min: yAxis.range?.[0], max: yAxis.range?.[1] },
    series: series.map((s, index) => {
      const rawData = generateBoxPlotData(50, index);
      const summary = buildBoxPlotSummary(rawData);
      return {
        name: s.name || `Group ${index + 1}`,
        type: 'boxplot' as const,
        data: [summary],
        itemStyle: { color: s.color || undefined, borderColor: s.color || '#1890ff' },
      };
    }),
  };
}

function buildKMCurveOptions(config: FigureConfig): ECOption {
  const { series = [], xAxis = {}, yAxis = {}, title = '' } = config;

  return {
    title: { text: title || 'Kaplan-Meier Survival Curve', left: 'center', textStyle: { fontSize: 14, fontFamily: 'Arial' } },
    tooltip: { trigger: 'axis' },
    legend: { data: buildLegendData(series), bottom: 0, type: 'scroll' },
    grid: { left: 80, right: 40, top: 50, bottom: 60 },
    xAxis: { type: 'value', name: xAxis.label || 'Time (days)' },
    yAxis: { type: 'value', name: yAxis.label || 'Survival Probability', min: 0, max: 1 },
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
        name: s.name || `Treatment ${index + 1}`,
        type: 'line' as const,
        data: stepData,
        step: 'end' as const,
        showSymbol: false,
        lineStyle: { width: 2, color: s.color },
        areaStyle: { opacity: 0.05, color: s.color },
      };
    }),
  };
}

// ==================== Forest Plot ====================
// Scatter for point estimates + line series with null-separated segments for CI whiskers.

function buildForestPlotOptions(config: FigureConfig): ECOption {
  const { series = [], xAxis = {}, yAxis = {}, title = '' } = config;
  const subgroups = ['Age < 65', 'Age >= 65', 'Male', 'Female', 'Overall'];
  const rng = seededRandom(9999);

  // Generate HR and CI data for each subgroup
  const plotData = subgroups.map(() => {
    const hr = 0.7 + rng() * 0.6;
    const lo = Math.max(0.1, hr - 0.12 - rng() * 0.2);
    const hi = hr + 0.12 + rng() * 0.2;
    return { hr, lo, hi };
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
    title: { text: title || 'Forest Plot', left: 'center', textStyle: { fontSize: 14, fontFamily: 'Arial' } },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.seriesName === '95% CI' || params.componentType !== 'series') return '';
        const d = plotData[params.dataIndex as number];
        if (!d) return params.name;
        return `${subgroups[params.dataIndex]}<br/>HR = ${d.hr.toFixed(2)} [${d.lo.toFixed(2)}, ${d.hi.toFixed(2)}]`;
      },
    },
    legend: { data: [...buildLegendData(series), '95% CI'], bottom: 0 },
    grid: { left: 120, right: 40, top: 50, bottom: 60 },
    xAxis: {
      type: 'value',
      name: xAxis.label || 'Hazard Ratio (95% CI)',
      min: xAxis.range?.[0] ?? 0.3,
      max: xAxis.range?.[1] ?? 2.5,
      axisLine: { lineStyle: { color: '#999' } },
    },
    yAxis: {
      type: 'category',
      data: subgroups,
      axisLine: { lineStyle: { color: '#999' } },
      splitLine: { show: false },
    },
    series: [
      // Null-effect reference line at HR = 1
      {
        name: 'Null effect',
        type: 'line' as const,
        data: [[refLine, 0], [refLine, subgroups.length - 1]],
        lineStyle: { type: 'dashed', color: '#ccc', width: 1 },
        symbol: 'none' as const,
        silent: true,
        tooltip: { show: false },
      },
      // Point estimates (scatter)
      ...(series.length > 0 ? series.map((s, _sIdx) => ({
        name: s.name || 'HR',
        type: 'scatter' as const,
        data: plotData.map((d, i) => [d.hr, i]),
        symbolSize: 10,
        itemStyle: { color: s.color || '#1890ff' },
        z: 10,
      })) : [{
        name: 'HR',
        type: 'scatter' as const,
        data: plotData.map((d, i) => [d.hr, i]),
        symbolSize: 10,
        itemStyle: { color: '#1890ff' },
        z: 10,
      }]),
      // CI whisker lines
      {
        name: '95% CI',
        type: 'line' as const,
        data: ciLineData,
        lineStyle: { width: 2, color: '#666' },
        symbol: 'none' as const,
        showSymbol: false,
        silent: true,
        tooltip: { show: false },
        z: 5,
      },
    ],
  };
}

// ==================== Waterfall Plot ====================
// Simulated using stacked bar: transparent base + positive bars + negative bars.
// Per official ECharts cookbook: https://echarts.apache.org/handbook/en/how-to/chart-types/bar/waterfall/

function buildWaterfallOptions(config: FigureConfig): ECOption {
  const { xAxis = {}, yAxis = {}, title = '', series = [] } = config;
  const rng = seededRandom(5555);

  // Clinical waterfall categories (tumor response)
  const categories = [
    'Screening', 'Cycle 1', 'Cycle 2', 'Cycle 3', 'Cycle 4', 'Cycle 5', 'Cycle 6', 'End of Tx',
  ];

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
    } else {
      if (data[i] < 0) {
        help.push(sum + data[i]);
      } else {
        help.push(sum);
      }
    }
    sum += data[i];
  }

  const seriesColor = series.length > 0 ? series[0].color : '#1890ff';

  return {
    title: { text: title || 'Waterfall Plot', left: 'center', textStyle: { fontSize: 14, fontFamily: 'Arial' } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 80, right: 40, top: 50, bottom: 60 },
    xAxis: {
      type: 'category',
      name: xAxis.label || 'Visit',
      data: categories,
      axisLine: { lineStyle: { color: '#999' } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: yAxis.label || 'Sum (%)',
      axisLine: { lineStyle: { color: '#999' } },
      splitLine: { lineStyle: { color: '#eee' } },
    },
    series: [
      // Transparent helper — creates the floating bar effect
      {
        name: 'Helper',
        type: 'bar' as const,
        stack: 'all',
        itemStyle: { borderColor: 'rgba(0,0,0,0)', color: 'rgba(0,0,0,0)' },
        emphasis: { itemStyle: { borderColor: 'rgba(0,0,0,0)', color: 'rgba(0,0,0,0)' } },
        data: help,
        tooltip: { show: false },
      },
      // Positive changes
      {
        name: 'Increase',
        type: 'bar' as const,
        stack: 'all',
        itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] },
        data: positive,
      },
      // Negative changes
      {
        name: 'Decrease',
        type: 'bar' as const,
        stack: 'all',
        itemStyle: { color: '#ff4d4f', borderRadius: [0, 0, 4, 4] },
        data: negative,
      },
    ],
  };
}

// ==================== Dispatcher ====================

function buildChartOptions(config: FigureConfig): ECOption {
  switch (config.chartType) {
    case 'line': return buildLineOptions(config);
    case 'bar': return buildBarOptions(config);
    case 'scatter': return buildScatterOptions(config);
    case 'box': return buildBoxPlotOptions(config);
    case 'km_curve': return buildKMCurveOptions(config);
    case 'forest': return buildForestPlotOptions(config);
    case 'waterfall': return buildWaterfallOptions(config);
    default: return buildLineOptions(config);
  }
}

const SUPPORTED_CHART_TYPES = new Set<ChartType>(['line', 'bar', 'scatter', 'box', 'km_curve', 'forest', 'waterfall']);
const UNSUPPORTED_CHART_TYPES: Partial<Record<ChartType, string>> = {
  violin: 'Violin Plot',
};

// ==================== Component ====================

export default function FigurePreview({ config, loading = false, onStyleChange }: Props) {
  const { t } = useTranslation();
  const domRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const chartType = config?.chartType || '';
  const isUnsupported = !!UNSUPPORTED_CHART_TYPES[chartType as ChartType];

  const chartOptions = useMemo(() => {
    if (!config || !config.chartType || isUnsupported) return null;
    return buildChartOptions(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.chartType, config?.title, config?.xAxis?.label, config?.xAxis?.type,
    config?.yAxis?.label, config?.yAxis?.range, config?.series?.length, isUnsupported]);

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
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <Empty description={t('page.mdr.tflDesigner.figureHints.selectChartType')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8px h-full overflow-auto">
      {/* Hints */}
      {hints.length > 0 && (
        <Alert
          type={isUnsupported ? 'warning' : 'info'}
          showIcon
          icon={<InfoCircleOutlined />}
          message={
            <div className="flex flex-col gap-2px">
              {hints.map((hint, i) => <Text key={i} className="text-12px">{hint}</Text>)}
            </div>
          }
        />
      )}

      {/* Chart type tag + export */}
      <div className="flex items-center justify-between flex-shrink-0">
        <Space>
          <Tag>{config.chartType}</Tag>
          {config.xAxis?.logScale && <Tag color="blue">Log Scale (X)</Tag>}
          {config.yAxis?.logScale && <Tag color="blue">Log Scale (Y)</Tag>}
        </Space>
        <Tooltip title="Export as PNG">
          <Button
            type="text" size="small" icon={<DownloadOutlined />}
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
        <div className="flex items-center justify-center bg-gray-50 rounded flex-1 min-h-[300px]">
          <Empty description={`${UNSUPPORTED_CHART_TYPES[config.chartType]} — coming soon`} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <div
          key={chartType}
          ref={domRef}
          className="w-full bg-gray-50 rounded flex-1 min-h-[300px]"
        />
      )}
    </div>
  );
}
