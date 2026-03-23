/**
 * TFL Designer Feature Module
 *
 * Public API for the TFL Designer feature.
 * All stores use Zustand + Immer (NOT Redux).
 */

// Types
export * from './types';
// Hooks
export { useTFLData, useTFLDesignerData } from './hooks';


// Zustand stores
export {
  useStudyStore,
  useTableStore,
  useFigureStore,
  useListingStore,
  useTemplateStore,
  createNewFigure,
  DEFAULT_AXIS_CONFIG,
  DEFAULT_LEGEND_CONFIG,
  DEFAULT_STYLE,
  COLORS,
  mockPreviewData,
  filterOperatorOptions,
} from './stores';
export type { ExtendedFilterConfig } from './stores';

// Components (selective export to avoid name collision with types FilterConfig/SortConfig)
export { default as NestedRowEditor } from './components/table/NestedRowEditor';
export { default as TablePreview } from './components/table/TablePreview';
export { default as TreatmentArmEditor } from './components/table/TreatmentArmEditor';
export { default as TemplateSelector } from './components/table/TemplateSelector';
export { default as HeaderEditor } from './components/table/HeaderEditor';
export { default as ColumnSourceEditor } from './components/table/ColumnSourceEditor';
export { default as FigurePreview } from './components/figure/FigurePreview';
export { default as ChartTypeSelector } from './components/figure/ChartTypeSelector';
export { default as AxesConfig } from './components/figure/AxesConfig';
export { default as SeriesConfig } from './components/figure/SeriesConfig';
export { default as ListingPreview } from './components/listing/ListingPreview';
export { default as ColumnEditor } from './components/listing/ColumnEditor';
export { default as SortConfigEditor } from './components/listing/SortConfig';
export { default as FilterConfigEditor } from './components/listing/FilterConfig';
export { default as StudyMetadata } from './components/study/StudyMetadata';
export { default as PopulationManager } from './components/study/PopulationManager';
export { default as HeaderStyleSelector } from './components/study/HeaderStyleSelector';
export { default as StatisticsSetManager } from './components/study/StatisticsSetManager';
export { default as ColumnHeaderSetEditor } from './components/study/ColumnHeaderSetEditor';
export { default as ExportModal } from './components/common/ExportModal';
export { default as TemplateEditor } from './components/shared/TemplateEditor';
export { default as InteractiveOutputEditor } from './components/shared/InteractiveOutputEditor';
export type { InteractiveOutputEditorRef } from './components/shared/InteractiveOutputEditor';

// Data
export * from './data/templates';

// Utils
export * from './utils/exportUtils';
export * from './utils/importUtils';
export {
  applyTemplate,
  applyTableTemplate,
  applyFigureTemplate,
  applyListingTemplate,
  importMultipleJSONFiles,
  importAllTemplatesFromJSON,
  importARSJSONToTemplates,
} from './utils/templateUtils';
