/**
 * TFL Designer - Figure Store (Zustand + Immer)
 *
 * Manages figure shells with chart type, axes, series, legend, and style. Follows the POC store pattern with immer
 * middleware.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { AxisConfig, ChartSeries, ChartType, FigureShell, FigureStyle, LegendConfig } from '../types';
import { generateId } from '../types';

// ==================== State Interface ====================

interface FigureState {
  // CRUD
  addFigure: (figure: FigureShell) => void;
  // Series
  addSeries: (series?: Partial<ChartSeries>) => void;
  currentFigure: FigureShell | null;

  deleteFigure: (id: string) => void;
  figures: FigureShell[];

  isDirty: boolean;
  markClean: () => void;

  removeSeries: (id: string) => void;

  reorderSeries: (fromIndex: number, toIndex: number) => void;

  // Reset
  resetFigure: () => void;
  // Chart type
  setChartType: (type: ChartType) => void;

  setCurrentFigure: (figure: FigureShell | null) => void;
  setDirty: (dirty: boolean) => void;
  // Selection
  setFigure: (figure: FigureShell) => void;
  // Batch update from server
  setFigures: (figures: FigureShell[]) => void;

  // Legend & Style
  updateLegend: (config: Partial<LegendConfig>) => void;
  // Metadata
  updateMetadata: (
    updates: Partial<Pick<FigureShell, 'figureNumber' | 'population' | 'programmingNotes' | 'title'>>
  ) => void;

  updateSeries: (id: string, updates: Partial<ChartSeries>) => void;
  updateStyle: (style: Partial<FigureStyle>) => void;

  // Axes
  updateXAxis: (config: Partial<AxisConfig>) => void;
  updateYAxis: (config: Partial<AxisConfig>) => void;
}

// ==================== Defaults ====================

const DEFAULT_AXIS_CONFIG: AxisConfig = {
  label: '',
  logScale: false,
  tickFormat: '',
  type: 'continuous'
};

const DEFAULT_LEGEND_CONFIG: LegendConfig = {
  orientation: 'vertical',
  position: 'right'
};

const DEFAULT_STYLE: FigureStyle = {
  fontFamily: 'Arial',
  fontSize: 12,
  height: 600,
  width: 800
};

const COLORS = [
  '#1890ff', // blue
  '#52c41a', // green
  '#ff4d4f', // red
  '#faad14', // gold
  '#722ed1', // purple
  '#13c2c2', // cyan
  '#eb2f96', // magenta
  '#fa8c16' // orange
];

const createDefaultSeries = (index: number): ChartSeries => ({
  color: COLORS[index % COLORS.length],
  id: generateId('series'),
  line: {
    dash: 'solid',
    width: 2
  },
  marker: {
    size: 8,
    symbol: 'circle'
  },
  name: `Series ${index + 1}`
});

// ==================== Factory ====================

export function createNewFigure(figureNumber: string = 'Figure 14.1.1'): FigureShell {
  return {
    chartType: 'line',
    figureNumber,
    id: generateId('figure'),
    legend: { ...DEFAULT_LEGEND_CONFIG },
    population: 'ITT',
    series: [createDefaultSeries(0)],
    style: { ...DEFAULT_STYLE },
    title: 'New Figure',
    xAxis: { ...DEFAULT_AXIS_CONFIG, label: 'X-Axis' },
    yAxis: { ...DEFAULT_AXIS_CONFIG, label: 'Y-Axis', range: [0, 100] }
  };
}

export { COLORS, DEFAULT_AXIS_CONFIG, DEFAULT_LEGEND_CONFIG, DEFAULT_STYLE };

// ==================== Mock Figures ====================

const mockFigures: FigureShell[] = [
  {
    chartType: 'km_curve',
    figureNumber: 'Figure 14.1.1',
    id: 'fig1',
    legend: { ...DEFAULT_LEGEND_CONFIG },
    population: 'ITT',
    series: [
      { ...createDefaultSeries(0), name: 'Placebo' },
      { ...createDefaultSeries(1), name: 'Drug X 10mg' },
      { ...createDefaultSeries(2), name: 'Drug X 20mg' }
    ],
    style: { ...DEFAULT_STYLE },
    title: 'Kaplan-Meier Plot of Overall Survival',
    xAxis: { label: 'Time (Months)', logScale: false, tickFormat: '', type: 'continuous' },
    yAxis: { label: 'Survival Probability', logScale: false, range: [0, 1], tickFormat: '', type: 'continuous' }
  },
  {
    chartType: 'bar',
    figureNumber: 'Figure 14.2.1',
    id: 'fig2',
    legend: { ...DEFAULT_LEGEND_CONFIG },
    population: 'ITT',
    series: [
      { ...createDefaultSeries(0), name: 'Placebo' },
      { ...createDefaultSeries(1), name: 'Treatment' }
    ],
    style: { ...DEFAULT_STYLE },
    title: 'Mean Change from Baseline in Primary Endpoint',
    xAxis: { label: 'Visit', logScale: false, tickFormat: '', type: 'categorical' },
    yAxis: { label: 'Mean Change from Baseline', logScale: false, range: [-10, 10], tickFormat: '', type: 'continuous' }
  },
  {
    chartType: 'forest',
    figureNumber: 'Figure 14.3.1',
    id: 'fig3',
    legend: { ...DEFAULT_LEGEND_CONFIG },
    population: 'ITT',
    series: [{ ...createDefaultSeries(0), name: 'HR (95% CI)' }],
    style: { ...DEFAULT_STYLE },
    title: 'Forest Plot of Subgroup Analysis',
    xAxis: { label: 'Hazard Ratio (95% CI)', logScale: true, tickFormat: '', type: 'continuous' },
    yAxis: { label: 'Subgroup', logScale: false, tickFormat: '', type: 'categorical' }
  }
];

// ==================== Store ====================

export const useFigureStore = create<FigureState>()(
  immer(set => ({
    addFigure: figure =>
      set(state => {
        state.figures.push(figure);
      }),
    addSeries: series =>
      set(state => {
        if (!state.currentFigure) return;

        const newSeries = { ...createDefaultSeries(state.currentFigure.series.length), ...series };
        state.currentFigure.series.push(newSeries);
        state.isDirty = true;
      }),
    currentFigure: null,

    deleteFigure: id =>
      set(state => {
        state.figures = state.figures.filter(f => f.id !== id);
        if (state.currentFigure?.id === id) {
          state.currentFigure = null;
        }
      }),

    figures: mockFigures,

    isDirty: false,

    markClean: () =>
      set(state => {
        state.isDirty = false;
      }),

    removeSeries: id =>
      set(state => {
        if (!state.currentFigure) return;

        state.currentFigure.series = state.currentFigure.series.filter(s => s.id !== id);
        state.isDirty = true;
      }),

    reorderSeries: (fromIndex, toIndex) =>
      set(state => {
        if (!state.currentFigure) return;

        const seriesList = state.currentFigure.series;
        const [removed] = seriesList.splice(fromIndex, 1);
        seriesList.splice(toIndex, 0, removed);
        state.isDirty = true;
      }),

    resetFigure: () =>
      set(state => {
        state.currentFigure = null;
        state.isDirty = false;
      }),

    setChartType: type =>
      set(state => {
        if (state.currentFigure) {
          state.currentFigure.chartType = type;
          state.isDirty = true;
        }
      }),

    setCurrentFigure: figure =>
      set(state => {
        state.currentFigure = figure;
      }),

    setDirty: dirty =>
      set(state => {
        state.isDirty = dirty;
      }),

    setFigure: figure =>
      set(state => {
        state.currentFigure = figure;
        state.isDirty = false;
      }),

    setFigures: figures =>
      set(state => {
        state.figures = figures;
      }),

    updateLegend: config =>
      set(state => {
        if (!state.currentFigure) return;

        if (!state.currentFigure.legend) {
          state.currentFigure.legend = { ...DEFAULT_LEGEND_CONFIG };
        }
        Object.assign(state.currentFigure.legend, config);
        state.isDirty = true;
      }),

    updateMetadata: updates =>
      set(state => {
        if (state.currentFigure) {
          Object.assign(state.currentFigure, updates);
          state.isDirty = true;
        }
      }),

    updateSeries: (id, updates) =>
      set(state => {
        if (!state.currentFigure) return;

        const series = state.currentFigure.series.find(s => s.id === id);
        if (series) {
          Object.assign(series, updates);
          state.isDirty = true;
        }
      }),

    updateStyle: style =>
      set(state => {
        if (!state.currentFigure) return;

        if (!state.currentFigure.style) {
          state.currentFigure.style = { ...DEFAULT_STYLE };
        }
        Object.assign(state.currentFigure.style, style);
        state.isDirty = true;
      }),

    updateXAxis: config =>
      set(state => {
        if (state.currentFigure) {
          Object.assign(state.currentFigure.xAxis, config);
          state.isDirty = true;
        }
      }),

    updateYAxis: config =>
      set(state => {
        if (state.currentFigure) {
          Object.assign(state.currentFigure.yAxis, config);
          state.isDirty = true;
        }
      })
  }))
);
