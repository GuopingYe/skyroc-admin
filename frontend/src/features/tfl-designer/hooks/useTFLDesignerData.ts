/**
 * useTFLDesignerData - TFL Designer data integration hook
 * 
 * Bridges useTFLData (React Query) with Zustand stores for the TFL Designer page.
 * This pattern allows optimistic local updates while maintaining server sync.
 */
import { useCallback, useEffect } from 'react';

import { useAnalysisScopeNodeId } from '@/features/clinical-context';
import { useTFLData } from '@/features/tfl-designer/hooks';
import {
  useTableStore,
  useFigureStore,
  useListingStore,
} from '@/features/tfl-designer';
import { needsSync } from '../utils/syncUtils';

export function useTFLDesignerData() {
  const scopeNodeId = useAnalysisScopeNodeId();
  
  const {
    tables,
    figures,
    listings,
    loading,
    saving,
    error,
    refresh,
    saveTable,
    saveFigure,
    saveListing,
    deleteTable,
    deleteFigure,
    deleteListing,
  } = useTFLData(scopeNodeId);
  
  // Use selective store subscriptions to avoid unnecessary re-renders
  const tableStoreTables = useTableStore((s) => s.tables);
  const tableStoreCurrent = useTableStore((s) => s.currentTable);
  const tableStoreSetTables = useTableStore((s) => s.setTables);
  const tableStoreSetCurrent = useTableStore((s) => s.setCurrentTable);
  const tableStoreSetDirty = useTableStore((s) => s.setDirty);
  
  const figureStoreFigures = useFigureStore((s) => s.figures);
  const figureStoreCurrent = useFigureStore((s) => s.currentFigure);
  const figureStoreSetFigures = useFigureStore((s) => s.setFigures);
  const figureStoreSetCurrent = useFigureStore((s) => s.setCurrentFigure);
  const figureStoreSetDirty = useFigureStore((s) => s.setDirty);
  
  const listingStoreListings = useListingStore((s) => s.listings);
  const listingStoreCurrent = useListingStore((s) => s.currentListing);
  const listingStoreSetListings = useListingStore((s) => s.setListings);
  const listingStoreSetCurrent = useListingStore((s) => s.setCurrentListing);
  const listingStoreSetDirty = useListingStore((s) => s.setDirty);
  
  // Sync tables when fetched data changes
  useEffect(() => {
    if (!loading && needsSync(tables, tableStoreTables)) {
      tableStoreSetTables(tables);
    }
  }, [tables, loading, tableStoreTables, tableStoreSetTables]);
  
  // Sync figures when fetched data changes
  useEffect(() => {
    if (!loading && needsSync(figures, figureStoreFigures)) {
      figureStoreSetFigures(figures);
    }
  }, [figures, loading, figureStoreFigures, figureStoreSetFigures]);
  
  // Sync listings when fetched data changes
  useEffect(() => {
    if (!loading && needsSync(listings, listingStoreListings)) {
      listingStoreSetListings(listings);
    }
  }, [listings, loading, listingStoreListings, listingStoreSetListings]);
  
  const saveCurrentTable = useCallback(async (userId: string): Promise<boolean> => {
    if (!tableStoreCurrent) return false;
    const success = await saveTable(tableStoreCurrent, userId);
    if (success) tableStoreSetDirty(false);
    return success;
  }, [tableStoreCurrent, saveTable, tableStoreSetDirty]);
  
  const saveCurrentFigure = useCallback(async (userId: string): Promise<boolean> => {
    if (!figureStoreCurrent) return false;
    const success = await saveFigure(figureStoreCurrent, userId);
    if (success) figureStoreSetDirty(false);
    return success;
  }, [figureStoreCurrent, saveFigure, figureStoreSetDirty]);
  
  const saveCurrentListing = useCallback(async (userId: string): Promise<boolean> => {
    if (!listingStoreCurrent) return false;
    const success = await saveListing(listingStoreCurrent, userId);
    if (success) listingStoreSetDirty(false);
    return success;
  }, [listingStoreCurrent, saveListing, listingStoreSetDirty]);
  
  const deleteCurrentTable = useCallback(async (): Promise<boolean> => {
    if (!tableStoreCurrent) return false;
    const success = await deleteTable(tableStoreCurrent.id);
    if (success) tableStoreSetCurrent(null);
    return success;
  }, [tableStoreCurrent, deleteTable, tableStoreSetCurrent]);
  
  const deleteCurrentFigure = useCallback(async (): Promise<boolean> => {
    if (!figureStoreCurrent) return false;
    const success = await deleteFigure(figureStoreCurrent.id);
    if (success) figureStoreSetCurrent(null);
    return success;
  }, [figureStoreCurrent, deleteFigure, figureStoreSetCurrent]);
  
  const deleteCurrentListing = useCallback(async (): Promise<boolean> => {
    if (!listingStoreCurrent) return false;
    const success = await deleteListing(listingStoreCurrent.id);
    if (success) listingStoreSetCurrent(null);
    return success;
  }, [listingStoreCurrent, deleteListing, listingStoreSetCurrent]);
  
  return {
    loading,
    saving,
    error,
    refresh,
    saveCurrentTable,
    saveCurrentFigure,
    saveCurrentListing,
    deleteCurrentTable,
    deleteCurrentFigure,
    deleteCurrentListing,
    tables,
    figures,
    listings,
    scopeNodeId,
  };
}

export default useTFLDesignerData;
