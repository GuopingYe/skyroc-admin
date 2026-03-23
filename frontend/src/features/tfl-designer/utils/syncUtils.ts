/**
 * TFL Designer Sync Utilities
 * 
 * Helper functions for syncing fetched data to Zustand stores.
 */

/**
 * Checks if store items need to be updated with fetched items.
 * Uses ID comparison to detect changes.
 */
export function needsSync<T extends { id: string }>(
  fetchedItems: T[],
  storeItems: T[]
): boolean {
  // If store is empty and we have data, sync is needed
  if (storeItems.length === 0 && fetchedItems.length > 0) return true;
  
  // If counts differ, sync is needed
  if (fetchedItems.length !== storeItems.length) return true;
  
  // Compare IDs
  const storeIds = new Set(storeItems.map(i => i.id));
  const fetchedIds = new Set(fetchedItems.map(i => i.id));
  
  // Check if any IDs are different
  for (const id of fetchedIds) {
    if (!storeIds.has(id)) return true;
  }
  
  return false;
}
