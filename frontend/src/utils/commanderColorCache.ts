/**
 * Commander color cache utility
 * Uses centralized cacheService for persistence and deduplication
 */

import {
  getColorCache,
  setColorCache,
  setColorCacheBatch,
  getInflightRequest,
  setInflightRequest,
  clearInflightRequest,
} from '../services/cacheService';

/**
 * Fetch commander color identity from Scryfall API
 * @param commanderName - The commander card name
 * @returns Array of color codes (e.g., ['W', 'B', 'R'])
 */
export async function getCommanderColorsFromScryfall(
  commanderName: string
): Promise<string[]> {
  const requestKey = `colors_${commanderName}`;

  // Return cached value if available
  const cached = getColorCache(commanderName);
  if (cached !== null) {
    return cached;
  }

  // Return existing fetch promise if already in-flight
  const inflightPromise = getInflightRequest(requestKey);
  if (inflightPromise) {
    return inflightPromise;
  }

  // Create fetch promise
  const promise = (async () => {
    try {
      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
          `!"${commanderName}"`
        )}&unique=prints`
      );

      if (!response.ok) {
        console.warn(`Scryfall API error for "${commanderName}": ${response.status}`);
        setColorCache(commanderName, []);
        return [];
      }

      const data = await response.json();

      if (data.data && data.data.length > 0) {
        const card = data.data[0];
        const colors = card.color_identity || [];
        setColorCache(commanderName, colors);
        return colors;
      }

      console.warn(`No Scryfall results for "${commanderName}"`);
      setColorCache(commanderName, []);
      return [];
    } catch (error) {
      console.error(`Error fetching colors for "${commanderName}":`, error);
      setColorCache(commanderName, []);
      return [];
    } finally {
      clearInflightRequest(requestKey);
    }
  })();

  setInflightRequest(requestKey, promise);
  return promise;
}

/**
 * Synchronously get cached commander colors (won't fetch if not cached)
 * @param commanderName - The commander card name
 * @returns Cached color codes or empty array if not cached
 */
export function getCachedCommanderColors(commanderName: string): string[] {
  const cached = getColorCache(commanderName);
  return cached || [];
}

/**
 * Pre-fetch colors for multiple commanders at once
 * @param commanderNames - Array of commander names to fetch
 */
export async function preFetchCommanderColors(
  commanderNames: string[]
): Promise<void> {
  const promises = commanderNames.map((name) =>
    getCommanderColorsFromScryfall(name).catch(() => [])
  );
  await Promise.all(promises);
}

/**
 * Clear the color cache (clears through cacheService)
 */
export function clearColorCache(): void {
  // This is handled by cacheService.clearCache()
  const cacheService = require('../services/cacheService');
  cacheService.clearCache();
}
