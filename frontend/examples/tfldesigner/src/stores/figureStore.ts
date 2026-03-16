import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { FigureShell, ChartType, AxisConfig, ChartSeries, LegendConfig, FigureStyle } from '../types'

interface FigureState {
  figure: FigureShell | null
  isDirty: boolean
  
  // Actions
  setFigure: (figure: FigureShell) => void
  updateMetadata: (updates: Partial<Pick<FigureShell, 'figureNumber' | 'title' | 'population'>>) => void
  setChartType: (type: ChartType) => void
  updateXAxis: (config: Partial<AxisConfig>) => void
  updateYAxis: (config: Partial<AxisConfig>) => void
  addSeries: (series?: Partial<ChartSeries>) => void
  updateSeries: (id: string, updates: Partial<ChartSeries>) => void
  removeSeries: (id: string) => void
  reorderSeries: (fromIndex: number, toIndex: number) => void
  updateLegend: (config: Partial<LegendConfig>) => void
  updateStyle: (style: Partial<FigureStyle>) => void
  resetFigure: () => void
  markClean: () => void
}

const DEFAULT_AXIS_CONFIG: AxisConfig = {
  label: '',
  type: 'continuous',
  tickFormat: '',
  logScale: false,
}

const DEFAULT_LEGEND_CONFIG: LegendConfig = {
  position: 'right',
  orientation: 'vertical',
}

const DEFAULT_STYLE: FigureStyle = {
  width: 800,
  height: 600,
  fontFamily: 'Arial',
  fontSize: 12,
}

// 预定义颜色 palette
const COLORS = [
  '#1890ff', // blue
  '#52c41a', // green
  '#ff4d4f', // red
  '#faad14', // gold
  '#722ed1', // purple
  '#13c2c2', // cyan
  '#eb2f96', // magenta
  '#fa8c16', // orange
]

const createDefaultSeries = (index: number): ChartSeries => ({
  id: uuidv4(),
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
})

export const useFigureStore = create<FigureState>((set) => ({
  figure: null,
  isDirty: false,

  setFigure: (figure) => set({ figure, isDirty: false }),

  updateMetadata: (updates) => set((state) => ({
    figure: state.figure ? { ...state.figure, ...updates } : null,
    isDirty: true,
  })),

  setChartType: (type) => set((state) => ({
    figure: state.figure ? { ...state.figure, chartType: type } : null,
    isDirty: true,
  })),

  updateXAxis: (config) => set((state) => ({
    figure: state.figure
      ? { ...state.figure, xAxis: { ...state.figure.xAxis, ...config } }
      : null,
    isDirty: true,
  })),

  updateYAxis: (config) => set((state) => ({
    figure: state.figure
      ? { ...state.figure, yAxis: { ...state.figure.yAxis, ...config } }
      : null,
    isDirty: true,
  })),

  addSeries: (series) => set((state) => {
    if (!state.figure) return state
    const newSeries = { ...createDefaultSeries(state.figure.series.length), ...series }
    return {
      figure: {
        ...state.figure,
        series: [...state.figure.series, newSeries],
      },
      isDirty: true,
    }
  }),

  updateSeries: (id, updates) => set((state) => {
    if (!state.figure) return state
    return {
      figure: {
        ...state.figure,
        series: state.figure.series.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      },
      isDirty: true,
    }
  }),

  removeSeries: (id) => set((state) => {
    if (!state.figure) return state
    return {
      figure: {
        ...state.figure,
        series: state.figure.series.filter((s) => s.id !== id),
      },
      isDirty: true,
    }
  }),

  reorderSeries: (fromIndex, toIndex) => set((state) => {
    if (!state.figure) return state
    const seriesList = [...state.figure.series]
    const [removed] = seriesList.splice(fromIndex, 1)
    seriesList.splice(toIndex, 0, removed)
    return {
      figure: { ...state.figure, series: seriesList },
      isDirty: true,
    }
  }),

  updateLegend: (config) => set((state) => {
    if (!state.figure) return { figure: null, isDirty: true }
    const currentLegend = state.figure.legend || DEFAULT_LEGEND_CONFIG
    return {
      figure: { 
        ...state.figure, 
        legend: { 
          position: currentLegend.position,
          orientation: currentLegend.orientation,
          ...config 
        } as LegendConfig
      },
      isDirty: true,
    }
  }),

  updateStyle: (style) => set((state) => {
    if (!state.figure) return { figure: null, isDirty: true }
    return {
      figure: { 
        ...state.figure, 
        style: { ...state.figure.style, ...style } as FigureStyle 
      },
      isDirty: true,
    }
  }),

  resetFigure: () => set({ figure: null, isDirty: false }),

  markClean: () => set({ isDirty: false }),
}))

// 创建新的 Figure 模板
export function createNewFigure(figureNumber: string = 'Figure 14.1.1'): FigureShell {
  return {
    id: uuidv4(),
    figureNumber,
    title: 'New Figure',
    population: 'ITT',
    chartType: 'line',
    xAxis: { ...DEFAULT_AXIS_CONFIG, label: 'X-Axis' },
    yAxis: { ...DEFAULT_AXIS_CONFIG, label: 'Y-Axis', range: [0, 100] },
    series: [createDefaultSeries(0)],
    legend: { ...DEFAULT_LEGEND_CONFIG },
    style: { ...DEFAULT_STYLE },
  }
}

export { DEFAULT_AXIS_CONFIG, DEFAULT_LEGEND_CONFIG, DEFAULT_STYLE, COLORS }