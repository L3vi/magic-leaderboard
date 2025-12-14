/**
 * Commander color identity cache and fetching utility
 * Uses Scryfall API to get accurate color identities
 */

const colorCache: Record<string, string[]> = {};
const fetchingPromises: Record<string, Promise<string[]>> = {};

/**
 * Fetch commander color identity from Scryfall API
 * Uses local cache and deduplicates in-flight requests
 * @param commanderName - The commander card name (e.g., "Atreus, Impulsive Son")
 * @returns Array of color codes (e.g., ['W', 'B', 'R'])
 */
export async function getCommanderColorsFromScryfall(
  commanderName: string
): Promise<string[]> {
  // Return cached value if available
  if (colorCache[commanderName]) {
    return colorCache[commanderName];
  }

  // Return existing fetch promise if already in-flight
  if (fetchingPromises[commanderName]) {
    return fetchingPromises[commanderName];
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
        return [];
      }

      const data = await response.json();

      if (data.data && data.data.length > 0) {
        const card = data.data[0];
        const colors = card.color_identity || [];
        
        // Cache the result
        colorCache[commanderName] = colors;
        return colors;
      }

      // No results found
      console.warn(`No Scryfall results for "${commanderName}"`);
      colorCache[commanderName] = [];
      return [];
    } catch (error) {
      console.error(`Error fetching colors for "${commanderName}":`, error);
      colorCache[commanderName] = [];
      return [];
    } finally {
      // Clean up in-flight promise after completion
      delete fetchingPromises[commanderName];
    }
  })();

  fetchingPromises[commanderName] = promise;
  return promise;
}

/**
 * Synchronously get cached commander colors (won't fetch if not cached)
 * @param commanderName - The commander card name
 * @returns Cached color codes or empty array if not cached
 */
export function getCachedCommanderColors(commanderName: string): string[] {
  return colorCache[commanderName] || [];
}

/**
 * Pre-fetch colors for multiple commanders at once
 * Useful for loading a batch of commanders on component mount
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
 * Clear the color cache
 */
export function clearColorCache(): void {
  Object.keys(colorCache).forEach((key) => delete colorCache[key]);
}
