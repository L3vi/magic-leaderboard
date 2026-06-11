/**
 * Commander color cache utility
 *
 * Read-side accessor for cached color identity. Fetching/populating the cache is
 * handled by commanderPreFetchService (batched via Scryfall /cards/collection),
 * which loads art and colors together — so there's no per-name color fetcher here.
 */

import { getColorCache } from '../services/cacheService';

/**
 * Synchronously get cached commander colors (won't fetch if not cached)
 * @param commanderName - The commander card name
 * @returns Cached color codes, or empty array if not cached
 */
export function getCachedCommanderColors(commanderName: string): string[] {
  const cached = getColorCache(commanderName);
  return cached || [];
}

/**
 * Clear the color cache (clears through cacheService)
 */
export function clearColorCache(): void {
  // This is handled by cacheService.clearCache()
  const cacheService = require('../services/cacheService');
  cacheService.clearCache();
}
