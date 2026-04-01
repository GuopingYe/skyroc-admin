/**
 * TFL Designer 数据转换层
 *
 * 负责前后端数据格式转换：
 *
 * - Backend fields: display_id, display_type, display_config
 * - Frontend fields: shellNumber, shellType, shellData
 */

import type { AnalysisCategory, FigureShell, ListingShell, TableShell } from '@/features/tfl-designer';

// Backend uses display_id, display_type, display_config
export interface BackendTFLShell {
  created_at: string;
  created_by: string;
  display_config: Record<string, unknown> | null;
  display_id: string;
  display_type: 'Figure' | 'Listing' | 'Table';
  extra_attrs: Record<string, unknown> | null;
  footnote: string | null;
  id: number;
  is_deleted: boolean;
  scope_node_id: number;
  sort_order: number;
  subtitle: string | null;
  title: string;
  updated_at: string;
  updated_by: string | null;
}

export interface BackendTFLListResponse {
  items: BackendTFLShell[];
  total: number;
}

export function transformBackendTable(backend: BackendTFLShell): TableShell {
  const config = backend.display_config || {};
  const shellData = (config.shell_data as Record<string, unknown>) || {};
  return {
    analysisSubset: shellData.analysisSubset as string | undefined,
    category: (config.category as AnalysisCategory) || 'Other',
    columnHeaderSetId: shellData.columnHeaderSetId as string | undefined,
    dataset: (config.dataset as string) || 'ADSL',
    footer: (shellData.footer as TableShell['footer']) || { notes: [], source: '' },
    headerLayers: shellData.headerLayers as TableShell['headerLayers'],
    id: String(backend.id),
    labelColumns: shellData.labelColumns as TableShell['labelColumns'],
    population: (config.population as string) || '',
    programmingNotes: backend.footnote || undefined,
    rows: (shellData.rows as TableShell['rows']) || [],
    shellNumber: backend.display_id,
    statisticsSetId: (shellData.statisticsSetId as string) || 'ss1',
    title: backend.title,
    treatmentArmSetId: (shellData.treatmentArmSetId as string) || 'tas1',
    whereClause: shellData.whereClause as string | undefined
  };
}

export function transformBackendFigure(backend: BackendTFLShell): FigureShell {
  const config = backend.display_config || {};
  const shellData = (config.shell_data as Record<string, unknown>) || {};
  return {
    chartType: (shellData.chartType as FigureShell['chartType']) || 'line',
    figureNumber: backend.display_id,
    id: String(backend.id),
    legend: shellData.legend as FigureShell['legend'],
    population: (config.population as string) || '',
    programmingNotes: backend.footnote || undefined,
    series: (shellData.series as FigureShell['series']) || [],
    style: shellData.style as FigureShell['style'],
    title: backend.title,
    xAxis: (shellData.xAxis as FigureShell['xAxis']) || { label: '', type: 'continuous' },
    yAxis: (shellData.yAxis as FigureShell['yAxis']) || { label: '', type: 'continuous' }
  };
}

export function transformBackendListing(backend: BackendTFLShell): ListingShell {
  const config = backend.display_config || {};
  const shellData = (config.shell_data as Record<string, unknown>) || {};
  return {
    analysisSubset: shellData.analysisSubset as string | undefined,
    columnHeaderSetId: shellData.columnHeaderSetId as string | undefined,
    columns: (shellData.columns as ListingShell['columns']) || [],
    dataset: (config.dataset as string) || 'ADSL',
    filter: shellData.filter as ListingShell['filter'],
    id: String(backend.id),
    listingNumber: backend.display_id,
    pageSize: (shellData.pageSize as number) || 20,
    population: (config.population as string) || '',
    programmingNotes: backend.footnote || undefined,
    sortBy: shellData.sortBy as ListingShell['sortBy'],
    title: backend.title,
    whereClause: shellData.whereClause as string | undefined
  };
}

export function transformTableToBackend(
  table: TableShell,
  scopeNodeId: number,
  createdBy: string
): Record<string, unknown> {
  return {
    display_config: {
      category: table.category,
      dataset: table.dataset,
      population: table.population,
      shell_data: {
        analysisSubset: table.analysisSubset,
        columnHeaderSetId: table.columnHeaderSetId,
        footer: table.footer,
        headerLayers: table.headerLayers,
        labelColumns: table.labelColumns,
        rows: table.rows,
        statisticsSetId: table.statisticsSetId,
        treatmentArmSetId: table.treatmentArmSetId,
        whereClause: table.whereClause
      }
    },
    display_id: table.shellNumber,
    display_type: 'Table',
    extra_attrs: null,
    footnote: table.programmingNotes,
    scope_node_id: scopeNodeId,
    title: table.title
  };
}

export function transformFigureToBackend(
  figure: FigureShell,
  scopeNodeId: number,
  createdBy: string
): Record<string, unknown> {
  return {
    display_config: {
      category: null,
      dataset: null,
      population: figure.population,
      shell_data: {
        chartType: figure.chartType,
        legend: figure.legend,
        series: figure.series,
        style: figure.style,
        xAxis: figure.xAxis,
        yAxis: figure.yAxis
      }
    },
    display_id: figure.figureNumber,
    display_type: 'Figure',
    extra_attrs: null,
    footnote: figure.programmingNotes,
    scope_node_id: scopeNodeId,
    title: figure.title
  };
}

export function transformListingToBackend(
  listing: ListingShell,
  scopeNodeId: number,
  createdBy: string
): Record<string, unknown> {
  return {
    display_config: {
      category: null,
      dataset: listing.dataset,
      population: listing.population,
      shell_data: {
        analysisSubset: listing.analysisSubset,
        columnHeaderSetId: listing.columnHeaderSetId,
        columns: listing.columns,
        filter: listing.filter,
        pageSize: listing.pageSize,
        sortBy: listing.sortBy,
        whereClause: listing.whereClause
      }
    },
    display_id: listing.listingNumber,
    display_type: 'Listing',
    extra_attrs: null,
    footnote: listing.programmingNotes,
    scope_node_id: scopeNodeId,
    title: listing.title
  };
}

export function transformBackendTFLList(response: BackendTFLListResponse): {
  figures: FigureShell[];
  listings: ListingShell[];
  tables: TableShell[];
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
  return { figures, listings, tables };
}
