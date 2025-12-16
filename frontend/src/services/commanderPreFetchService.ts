/**
 * Commander pre-fetch service
 * Efficiently batches and caches commander image data from Scryfall API
 */

import { getImageCache, setImageCacheBatch, getUncachedCommanders } from './cacheService';
import type { CardImageCache } from '../types';

/**
 * Pre-fetch commander images for all unique commanders in games
 * Only fetches uncached commanders, skipping already-cached ones
 * @param games - Array of game objects
 */
export async function preFetchCommandersFromGames(games: any[]): Promise<void> {
  // Extract all unique commanders from games
  const uniqueCommanders = new Set<string>();

  for (const game of games) {
    if (game.players && Array.isArray(game.players)) {
      for (const player of game.players) {
        if (player.commander) {
          if (Array.isArray(player.commander)) {
            player.commander.forEach((cmd: string) => {
              if (cmd && cmd.trim().length > 0 && cmd !== "Unknown") {
                uniqueCommanders.add(cmd.trim());
              }
            });
          } else if (typeof player.commander === "string" && player.commander.trim().length > 0 && player.commander !== "Unknown") {
            uniqueCommanders.add(player.commander.trim());
          }
        }
      }
    }
  }

  // Filter to only commanders not already cached
  const commandersToFetch = getUncachedCommanders(Array.from(uniqueCommanders));

  if (commandersToFetch.length === 0) {
    console.log("All commanders already cached");
    return;
  }

  console.log(`Pre-fetching ${commandersToFetch.length} unique commanders from Scryfall`);

  // Batch fetch with rate limiting
  const batchSize = 10; // Fetch 10 at a time, but spaced out to respect rate limits
  const batchCache: Record<string, CardImageCache> = {};

  for (let i = 0; i < commandersToFetch.length; i += batchSize) {
    const batch = commandersToFetch.slice(i, i + batchSize);
    
    // Fetch all in batch in parallel
    const fetchPromises = batch.map(async (commander) => {
      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(commander)}`
        );
        const data = await response.json();

        let art = "";
        let full = "";

        if (data.image_uris) {
          art = data.image_uris.art_crop || "";
          full = data.image_uris.normal || data.image_uris.large || "";
        } else if (data.card_faces?.[0]?.image_uris) {
          art = data.card_faces[0].image_uris.art_crop || "";
          full = data.card_faces[0].image_uris.normal || data.card_faces[0].image_uris.large || "";
        }

        batchCache[commander] = { art, full };
        console.log(`Cached: ${commander}`);
      } catch (error) {
        // Cache failed attempts
        batchCache[commander] = { art: "", full: "" };
        console.warn(`Failed to fetch ${commander}:`, error);
      }
    });

    await Promise.all(fetchPromises);

    // Rate limiting: wait before next batch
    if (i + batchSize < commandersToFetch.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second between batches
    }
  }

  // Persist entire batch to cache once
  setImageCacheBatch(batchCache);
  console.log("Pre-fetch complete");
}
