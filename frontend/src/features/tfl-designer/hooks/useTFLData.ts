/**
 * useTFLData - TFL Shell Data Management Hook
 *
 * Connects TFL Designer to backend ARSDisplay API. Uses clinical context pattern to get scopeNodeId from analysis
 * selection.
 */
import { useCallback, useEffect, useState } from 'react';

import {
  createTFLFigure,
  createTFLListing,
  createTFLTable,
  deleteTFLFigure,
  deleteTFLListing,
  deleteTFLTable,
  getTFLShells,
  updateTFLFigure,
  updateTFLListing,
  updateTFLTable
} from '@/service/api/mdr';
import {
  type BackendTFLListResponse,
  transformBackendTFLList,
  transformFigureToBackend,
  transformListingToBackend,
  transformTableToBackend
} from '@/service/transforms/tfl';

import type { FigureShell, ListingShell, TableShell } from '../types';

interface UseTFLDataReturn {
  deleteFigure: (figureId: string) => Promise<boolean>;
  deleteListing: (listingId: string) => Promise<boolean>;
  deleteTable: (tableId: string) => Promise<boolean>;
  error: string | null;
  figures: FigureShell[];
  listings: ListingShell[];
  loading: boolean;
  refresh: () => Promise<void>;
  saveFigure: (figure: FigureShell, userId: string) => Promise<boolean>;
  saveListing: (listing: ListingShell, userId: string) => Promise<boolean>;
  saveTable: (table: TableShell, userId: string) => Promise<boolean>;
  saving: boolean;
  tables: TableShell[];
}

/**
 * Hook to manage TFL data for a given scope (analysis)
 *
 * @param scopeNodeId - The analysis scope node ID (from clinical context)
 * @returns TFL data and CRUD operations
 */
export function useTFLData(scopeNodeId: number | null): UseTFLDataReturn {
  const [tables, setTables] = useState<TableShell[]>([]);
  const [figures, setFigures] = useState<FigureShell[]>([]);
  const [listings, setListings] = useState<ListingShell[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all TFL shells for the current scope
  const refresh = useCallback(async () => {
    if (!scopeNodeId) {
      setTables([]);
      setFigures([]);
      setListings([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getTFLShells(scopeNodeId);
      const transformed = transformBackendTFLList(response as BackendTFLListResponse);
      setTables(transformed.tables);
      setFigures(transformed.figures);
      setListings(transformed.listings);
    } catch (err) {
      console.error('Failed to fetch TFL shells:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch TFL data');
      setTables([]);
      setFigures([]);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [scopeNodeId]);

  // Auto-refresh when scope changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Save table shell (create or update)
  const saveTable = useCallback(
    async (table: TableShell, userId: string): Promise<boolean> => {
      if (!scopeNodeId) return false;
      setSaving(true);
      try {
        const backendData = transformTableToBackend(table, scopeNodeId, userId);
        const isNew = table.id.includes('_'); // New items have temp IDs like 'table_abc123'

        if (isNew) {
          await createTFLTable(backendData as Parameters<typeof createTFLTable>[0]);
        } else {
          await updateTFLTable(table.id, {
            display_config: backendData.display_config as Record<string, unknown> | null,
            display_id: table.shellNumber,
            footnote: table.programmingNotes,
            title: table.title,
            updated_by: userId
          });
        }
        await refresh();
        return true;
      } catch (err) {
        console.error('Failed to save table:', err);
        setError(err instanceof Error ? err.message : 'Failed to save table');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [scopeNodeId, refresh]
  );

  // Save figure shell (create or update)
  const saveFigure = useCallback(
    async (figure: FigureShell, userId: string): Promise<boolean> => {
      if (!scopeNodeId) return false;
      setSaving(true);
      try {
        const backendData = transformFigureToBackend(figure, scopeNodeId, userId);
        const isNew = figure.id.includes('_');

        if (isNew) {
          await createTFLFigure(backendData as Parameters<typeof createTFLFigure>[0]);
        } else {
          await updateTFLFigure(figure.id, {
            display_config: backendData.display_config as Record<string, unknown> | null,
            display_id: figure.figureNumber,
            footnote: figure.programmingNotes,
            title: figure.title,
            updated_by: userId
          });
        }
        await refresh();
        return true;
      } catch (err) {
        console.error('Failed to save figure:', err);
        setError(err instanceof Error ? err.message : 'Failed to save figure');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [scopeNodeId, refresh]
  );

  // Save listing shell (create or update)
  const saveListing = useCallback(
    async (listing: ListingShell, userId: string): Promise<boolean> => {
      if (!scopeNodeId) return false;
      setSaving(true);
      try {
        const backendData = transformListingToBackend(listing, scopeNodeId, userId);
        const isNew = listing.id.includes('_');

        if (isNew) {
          await createTFLListing(backendData as Parameters<typeof createTFLListing>[0]);
        } else {
          await updateTFLListing(listing.id, {
            display_config: backendData.display_config as Record<string, unknown> | null,
            display_id: listing.listingNumber,
            footnote: listing.programmingNotes,
            title: listing.title,
            updated_by: userId
          });
        }
        await refresh();
        return true;
      } catch (err) {
        console.error('Failed to save listing:', err);
        setError(err instanceof Error ? err.message : 'Failed to save listing');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [scopeNodeId, refresh]
  );

  // Delete table shell
  const deleteTable = useCallback(
    async (tableId: string): Promise<boolean> => {
      try {
        if (!tableId.includes('_')) {
          await deleteTFLTable(tableId);
        }
        await refresh();
        return true;
      } catch (err) {
        console.error('Failed to delete table:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete table');
        return false;
      }
    },
    [refresh]
  );

  // Delete figure shell
  const deleteFigure = useCallback(
    async (figureId: string): Promise<boolean> => {
      try {
        if (!figureId.includes('_')) {
          await deleteTFLFigure(figureId);
        }
        await refresh();
        return true;
      } catch (err) {
        console.error('Failed to delete figure:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete figure');
        return false;
      }
    },
    [refresh]
  );

  // Delete listing shell
  const deleteListing = useCallback(
    async (listingId: string): Promise<boolean> => {
      try {
        if (!listingId.includes('_')) {
          await deleteTFLListing(listingId);
        }
        await refresh();
        return true;
      } catch (err) {
        console.error('Failed to delete listing:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete listing');
        return false;
      }
    },
    [refresh]
  );

  return {
    deleteFigure,
    deleteListing,
    deleteTable,
    error,
    figures,
    listings,
    loading,
    refresh,
    saveFigure,
    saveListing,
    saveTable,
    saving,
    tables
  };
}

export default useTFLData;
