/**
 * TFL Designer 数据转换层
 *
 * 负责前后端数据格式转换：
 * - Backend fields: display_id, display_type, display_config
 * - Frontend fields: shellNumber, shellType, shellData
 */

import type {
  TableShell,
  FigureShell,
  ListingShell,
  AnalysisCategory,
} from '@/features/tfl-designer';

// Backend uses display_id, display_type, display_config
export interface BackendTFLShell {
  id: number;
  scope_node_id: number;
  display_id: string;
  display_type: 'Table' | 'Figure' | 'Listing';
  title: string;
  subtitle: string | null;
  footnote: string | null;
  sort_order: number;
  display_config: Record<string, unknown> | null;
  extra_attrs: Record<string, unknown> | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface BackendTFLListResponse {
  total: number;
  items: BackendTFLShell[];
}

export function transformBackendTable(backend: BackendTFLShell): TableShell {
  const config = backend.display_config || {};
  const shellData = (config.shell_data as Record<string, unknown>) || {};
  return {
    id: String(backend.id),
    shellNumber: backend.display_id,
    title: backend.title,
    population: (config.population as string) || '',
    category: (config.category as AnalysisCategory) || 'Other',
    dataset: (config.dataset as string) || 'ADSL',
    treatmentArmSetId: (shellData.treatmentArmSetId as string) || 'tas1',
    statisticsSetId: (shellData.statisticsSetId as string) || 'ss1',
    columnHeaderSetId: shellData.columnHeaderSetId as string | undefined,
    headerLayers: shellData.headerLayers as TableShell['headerLayers'],
    rows: (shellData.rows as TableShell['rows']) || [],
    footer: (shellData.footer as TableShell['footer']) || { source: '', notes: [] },
    labelColumns: shellData.labelColumns as TableShell['labelColumns'],
    whereClause: shellData.whereClause as string | undefined,
    analysisSubset: shellData.analysisSubset as string | undefined,
    programmingNotes: backend.footnote || undefined,
  };
}

export function transformBackendFigure(backend: BackendTFLShell): FigureShell {
  const config = backend.display_config || {};
  const shellData = (config.shell_data as Record<string, unknown>) || {};
  return {
    id: String(backend.id),
    figureNumber: backend.display_id,
    title: backend.title,
    population: (config.population as string) || '',
    chartType: (shellData.chartType as FigureShell['chartType']) || 'line',
    xAxis: (shellData.xAxis as FigureShell['xAxis']) || { label: '', type: 'continuous' },
    yAxis: (shellData.yAxis as FigureShell['yAxis']) || { label: '', type: 'continuous' },
    series: (shellData.series as FigureShell['series']) || [],
    legend: shellData.legend as FigureShell['legend'],
    style: shellData.style as FigureShell['style'],
    programmingNotes: backend.footnote || undefined,
  };
}

export function transformBackendListing(backend: BackendTFLShell): ListingShell {
  const config = backend.display_config || {};
  const shellData = (config.shell_data as Record<string, unknown>) || {};
  return {
    id: String(backend.id),
    listingNumber: backend.display_id,
    title: backend.title,
    population: (config.population as string) || '',
    dataset: (config.dataset as string) || 'ADSL',
    columns: (shellData.columns as ListingShell['columns']) || [],
    columnHeaderSetId: shellData.columnHeaderSetId as string | undefined,
    sortBy: shellData.sortBy as ListingShell['sortBy'],
    filter: shellData.filter as ListingShell['filter'],
    pageSize: (shellData.pageSize as number) || 20,
    whereClause: shellData.whereClause as string | undefined,
    analysisSubset: shellData.analysisSubset as string | undefined,
    programmingNotes: backend.footnote || undefined,
  };
}

export function transformTableToBackend(
  table: TableShell,
  scopeNodeId: number,
  createdBy: string
): Record<string, unknown> {
  return {
    scope_node_id: scopeNodeId,
    display_id: table.shellNumber,
    display_type: 'Table',
    title: table.title,
    footnote: table.programmingNotes,
    display_config: {
      population: table.population,
      dataset: table.dataset,
      category: table.category,
      shell_data: {
        treatmentArmSetId: table.treatmentArmSetId,
        statisticsSetId: table.statisticsSetId,
        columnHeaderSetId: table.columnHeaderSetId,
        headerLayers: table.headerLayers,
        rows: table.rows,
        footer: table.footer,
        labelColumns: table.labelColumns,
        whereClause: table.whereClause,
        analysisSubset: table.analysisSubset,
      },
    },
    extra_attrs: null,
  };
}

export function transformFigureToBackend(
  figure: FigureShell,
  scopeNodeId: number,
  createdBy: string
): Record<string, unknown> {
  return {
    scope_node_id: scopeNodeId,
    display_id: figure.figureNumber,
    display_type: 'Figure',
    title: figure.title,
    footnote: figure.programmingNotes,
    display_config: {
      population: figure.population,
      dataset: null,
      category: null,
      shell_data: {
        chartType: figure.chartType,
        xAxis: figure.xAxis,
        yAxis: figure.yAxis,
        series: figure.series,
        legend: figure.legend,
        style: figure.style,
      },
    },
    extra_attrs: null,
  };
}

export function transformListingToBackend(
  listing: ListingShell,
  scopeNodeId: number,
  createdBy: string
): Record<string, unknown> {
  return {
    scope_node_id: scopeNodeId,
    display_id: listing.listingNumber,
    display_type: 'Listing',
    title: listing.title,
    footnote: listing.programmingNotes,
    display_config: {
      population: listing.population,
      dataset: listing.dataset,
      category: null,
      shell_data: {
        columns: listing.columns,
        columnHeaderSetId: listing.columnHeaderSetId,
        sortBy: listing.sortBy,
        filter: listing.filter,
        pageSize: listing.pageSize,
        whereClause: listing.whereClause,
        analysisSubset: listing.analysisSubset,
      },
    },
    extra_attrs: null,
  };
}

export function transformBackendTFLList(response: BackendTFLListResponse): {
  tables: TableShell[];
  figures: FigureShell[];
  listings: ListingShell[];
} {
  const tables: TableShell[] = [];
  const figures: FigureShell[] = [];
  const listings: ListingShell[] = [];

  for (const item of response.items) {
    if (item.is_deleted) continue;
    switch (item.display_type) {
      case 'Table':
        tables.push(transformBackendTable(item));
        break;
      case 'Figure':
        figures.push(transformBackendFigure(item));
        break;
      case 'Listing':
        listings.push(transformBackendListing(item));
        break;
    }
  }
  return { tables, figures, listings };
}
