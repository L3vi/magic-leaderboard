import { useState, useEffect, useRef } from 'react';

interface CommanderColorCache {
  colors: string[];
  colorIdentity: string;
}

const commanderColorCache: Record<string, CommanderColorCache> = {};

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
  const [colors, setColors] = useState<string[]>(
    commanderColorCache[commander]?.colors || []
  );
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Don't fetch if commander is empty
    if (!commander || commander.trim() === '') {
      setColors([]);
      return;
    }

    // Return cached value if available
    if (commanderColorCache[commander]) {
      setColors(commanderColorCache[commander].colors);
      return;
    }

    // Debounce the API call (500ms delay)
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      let isMounted = true;

      fetch(
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
          commander
        )}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (isMounted) {
            const colorIdentity = data.color_identity || [];
            commanderColorCache[commander] = {
              colors: colorIdentity,
              colorIdentity: colorIdentity.join(''),
            };
            setColors(colorIdentity);
          }
        })
        .catch((err) => {
          console.error('Error fetching commander colors:', err);
          if (isMounted) {
            commanderColorCache[commander] = { colors: [], colorIdentity: '' };
            setColors([]);
          }
        });

      return () => {
        isMounted = false;
      };
    }, 500);

    return () => {
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
