import { useState, useEffect, useRef } from 'react';
import { getColorCache, setColorCache } from '../services/cacheService';
import { scryfallFetch } from '../services/scryfallClient';

// Map color codes to color names
const COLOR_NAMES: Record<string, string> = {
  'W': 'White',
  'U': 'Blue',
  'B': 'Black',
  'R': 'Red',
  'G': 'Green',
};

/**
 * Hook to fetch and cache commander color identity from Scryfall API
 * Debounced to avoid rate limiting on rapid input changes
 * @param commander - The commander card name
 * @returns Array of color codes (e.g., ['U', 'B'] for Dimir)
 */
export function useCommanderColors(commander: string): string[] {
  // Reads from the shared color cache, which preFetchCommanderData populates in
  // bulk; only falls back to a (throttled) single fetch on a genuine cache miss.
  const [colors, setColors] = useState<string[]>(() => getColorCache(commander) || []);
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Don't fetch if commander is empty
    if (!commander || commander.trim() === '') {
      setColors([]);
      return;
    }

    // Return cached value if available (null = not cached; [] = colorless)
    const cached = getColorCache(commander);
    if (cached !== null) {
      setColors(cached);
      return;
    }

    // Debounce the API call (500ms delay)
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    let isMounted = true;
    debounceTimer.current = setTimeout(() => {
      scryfallFetch(
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(commander)}`
      )
        .then((res) => res.json())
        .then((data) => {
          const colorIdentity = data.color_identity || [];
          setColorCache(commander, colorIdentity);
          if (isMounted) setColors(colorIdentity);
        })
        .catch((err) => {
          // Don't poison the cache on failure — let it retry next time.
          console.error('Error fetching commander colors:', err);
          if (isMounted) setColors([]);
        });
    }, 500);

    return () => {
      isMounted = false;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [commander]);

  return colors;
}

/**
 * Determine the color combination type
 */
export function getColorCombinationType(colors: string[]): string {
  const count = colors.length;
  
  if (count === 0) return 'Colorless';
  if (count === 1) return 'Mono';
  if (count === 2) return 'Dual';
  if (count === 3) return 'Tri';
  if (count === 4) return 'Quad';
  return 'Five-Color';
}

/**
 * Get color names from color codes
 */
export function getColorNames(colors: string[]): string[] {
  return colors.map((c) => COLOR_NAMES[c] || c).sort();
}
