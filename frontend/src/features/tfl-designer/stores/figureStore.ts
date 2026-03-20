/**
 * TFL Designer - Figure Store (Zustand + Immer)
 *
 * Manages figure shells with chart type, axes, series, legend, and style.
 * Follows the POC store pattern with immer middleware.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { FigureShell, ChartType, AxisConfig, ChartSeries, LegendConfig, FigureStyle } from '../types';
import { generateId } from '../types';

// ==================== State Interface ====================

interface FigureState {
  figures: FigureShell[];
  currentFigure: FigureShell | null;
  isDirty: boolean;

  // Selection
  setFigure: (figure: FigureShell) => void;
  setCurrentFigure: (figure: FigureShell | null) => void;

  // Metadata
  updateMetadata: (updates: Partial<Pick<FigureShell, 'figureNumber' | 'title' | 'population' | 'programmingNotes'>>) => void;

  // Chart type
  setChartType: (type: ChartType) => void;

  // Axes
  updateXAxis: (config: Partial<AxisConfig>) => void;
  updateYAxis: (config: Partial<AxisConfig>) => void;

  // Series
  addSeries: (series?: Partial<ChartSeries>) => void;
  updateSeries: (id: string, updates: Partial<ChartSeries>) => void;
  removeSeries: (id: string) => void;
  reorderSeries: (fromIndex: number, toIndex: number) => void;

  // Legend & Style
  updateLegend: (config: Partial<LegendConfig>) => void;
  updateStyle: (style: Partial<FigureStyle>) => void;

  // CRUD
  addFigure: (figure: FigureShell) => void;
  deleteFigure: (id: string) => void;

  // Reset
  resetFigure: () => void;
  markClean: () => void;
}

// ==================== Defaults ====================

const DEFAULT_AXIS_CONFIG: AxisConfig = {
  label: '',
  type: 'continuous',
  tickFormat: '',
  logScale: false,
};

const DEFAULT_LEGEND_CONFIG: LegendConfig = {
  position: 'right',
  orientation: 'vertical',
};

const DEFAULT_STYLE: FigureStyle = {
  width: 800,
  height: 600,
  fontFamily: 'Arial',
  fontSize: 12,
};

const COLORS = [
  '#1890ff', // blue
  '#52c41a', // green
  '#ff4d4f', // red
  '#faad14', // gold
  '#722ed1', // purple
  '#13c2c2', // cyan
  '#eb2f96', // magenta
  '#fa8c16', // orange
];

const createDefaultSeries = (index: number): ChartSeries => ({
  id: generateId('series'),
  name: `Series ${index + 1}`,
  color: COLORS[index % COLORS.length],
  marker: {
    symbol: 'circle',
    size: 8,
  },
  line: {
    width: 2,
    dash: 'solid',
  },
});

// ==================== Factory ====================

export function createNewFigure(figureNumber: string = 'Figure 14.1.1'): FigureShell {
  return {
    id: generateId('figure'),
    figureNumber,
    title: 'New Figure',
    population: 'ITT',
    chartType: 'line',
    xAxis: { ...DEFAULT_AXIS_CONFIG, label: 'X-Axis' },
    yAxis: { ...DEFAULT_AXIS_CONFIG, label: 'Y-Axis', range: [0, 100] },
    series: [createDefaultSeries(0)],
    legend: { ...DEFAULT_LEGEND_CONFIG },
    style: { ...DEFAULT_STYLE },
  };
}

export { DEFAULT_AXIS_CONFIG, DEFAULT_LEGEND_CONFIG, DEFAULT_STYLE, COLORS };

// ==================== Mock Figures ====================

const mockFigures: FigureShell[] = [
  {
    id: 'fig1',
    figureNumber: 'Figure 14.1.1',
    title: 'Kaplan-Meier Plot of Overall Survival',
    population: 'ITT',
    chartType: 'km_curve',
    xAxis: { label: 'Time (Months)', type: 'continuous', tickFormat: '', logScale: false },
    yAxis: { label: 'Survival Probability', type: 'continuous', range: [0, 1], tickFormat: '', logScale: false },
    series: [
      { ...createDefaultSeries(0), name: 'Placebo' },
      { ...createDefaultSeries(1), name: 'Drug X 10mg' },
      { ...createDefaultSeries(2), name: 'Drug X 20mg' },
    ],
    legend: { ...DEFAULT_LEGEND_CONFIG },
    style: { ...DEFAULT_STYLE },
  },
  {
    id: 'fig2',
    figureNumber: 'Figure 14.2.1',
    title: 'Mean Change from Baseline in Primary Endpoint',
    population: 'ITT',
    chartType: 'bar',
    xAxis: { label: 'Visit', type: 'categorical', tickFormat: '', logScale: false },
    yAxis: { label: 'Mean Change from Baseline', type: 'continuous', range: [-10, 10], tickFormat: '', logScale: false },
    series: [
      { ...createDefaultSeries(0), name: 'Placebo' },
      { ...createDefaultSeries(1), name: 'Treatment' },
    ],
    legend: { ...DEFAULT_LEGEND_CONFIG },
    style: { ...DEFAULT_STYLE },
  },
  {
    id: 'fig3',
    figureNumber: 'Figure 14.3.1',
    title: 'Forest Plot of Subgroup Analysis',
    population: 'ITT',
    chartType: 'forest',
    xAxis: { label: 'Hazard Ratio (95% CI)', type: 'continuous', tickFormat: '', logScale: true },
    yAxis: { label: 'Subgroup', type: 'categorical', tickFormat: '', logScale: false },
    series: [{ ...createDefaultSeries(0), name: 'HR (95% CI)' }],
    legend: { ...DEFAULT_LEGEND_CONFIG },
    style: { ...DEFAULT_STYLE },
  },
];

// ==================== Store ====================

export const useFigureStore = create<FigureState>()(
  immer((set) => ({
    figures: mockFigures,
    currentFigure: null,
    isDirty: false,

    setFigure: (figure) =>
      set((state) => {
        state.currentFigure = figure;
        state.isDirty = false;
      }),

    setCurrentFigure: (figure) =>
      set((state) => {
        state.currentFigure = figure;
      }),

    updateMetadata: (updates) =>
      set((state) => {
        if (state.currentFigure) {
          Object.assign(state.currentFigure, updates);
          state.isDirty = true;
        }
      }),

    setChartType: (type) =>
      set((state) => {
        if (state.currentFigure) {
          state.currentFigure.chartType = type;
          state.isDirty = true;
        }
      }),

    updateXAxis: (config) =>
      set((state) => {
        if (state.currentFigure) {
          Object.assign(state.currentFigure.xAxis, config);
          state.isDirty = true;
        }
      }),

    updateYAxis: (config) =>
      set((state) => {
        if (state.currentFigure) {
          Object.assign(state.currentFigure.yAxis, config);
          state.isDirty = true;
        }
      }),

    addSeries: (series) =>
      set((state) => {
        if (!state.currentFigure) return;

        const newSeries = { ...createDefaultSeries(state.currentFigure.series.length), ...series };
        state.currentFigure.series.push(newSeries);
        state.isDirty = true;
      }),

    updateSeries: (id, updates) =>
      set((state) => {
        if (!state.currentFigure) return;

        const series = state.currentFigure.series.find((s) => s.id === id);
        if (series) {
          Object.assign(series, updates);
          state.isDirty = true;
        }
      }),

    removeSeries: (id) =>
      set((state) => {
        if (!state.currentFigure) return;

        state.currentFigure.series = state.currentFigure.series.filter((s) => s.id !== id);
        state.isDirty = true;
      }),

    reorderSeries: (fromIndex, toIndex) =>
      set((state) => {
        if (!state.currentFigure) return;

        const seriesList = state.currentFigure.series;
        const [removed] = seriesList.splice(fromIndex, 1);
        seriesList.splice(toIndex, 0, removed);
        state.isDirty = true;
      }),

    updateLegend: (config) =>
      set((state) => {
        if (!state.currentFigure) return;

        if (!state.currentFigure.legend) {
          state.currentFigure.legend = { ...DEFAULT_LEGEND_CONFIG };
        }
        Object.assign(state.currentFigure.legend, config);
        state.isDirty = true;
      }),

    updateStyle: (style) =>
      set((state) => {
        if (!state.currentFigure) return;

        if (!state.currentFigure.style) {
          state.currentFigure.style = { ...DEFAULT_STYLE };
        }
        Object.assign(state.currentFigure.style, style);
        state.isDirty = true;
      }),

    addFigure: (figure) =>
      set((state) => {
        state.figures.push(figure);
      }),

    deleteFigure: (id) =>
      set((state) => {
        state.figures = state.figures.filter((f) => f.id !== id);
        if (state.currentFigure?.id === id) {
          state.currentFigure = null;
        }
      }),

    resetFigure: () =>
      set((state) => {
        state.currentFigure = null;
        state.isDirty = false;
      }),

    markClean: () =>
      set((state) => {
        state.isDirty = false;
      }),
  }))
);
