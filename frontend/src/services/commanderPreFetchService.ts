/**
 * Commander pre-fetch service
 * Efficiently batches and caches commander image data from Scryfall API
 */

import { getImageCache, setImageCacheBatch, getUncachedCommanders } from './cacheService';
import { scryfallFetch } from './scryfallClient';
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

  // Rate limiting is handled centrally by scryfallFetch (serialized + spaced),
  // so we can simply fire all requests and let the shared queue pace them.
  const batchCache: Record<string, CardImageCache> = {};

  await Promise.all(
    commandersToFetch.map(async (commander) => {
      try {
        const response = await scryfallFetch(
          `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(commander)}`
        );
        // 429 (rate limit) / 5xx / 404: don't cache — let it retry next load.
        if (!response.ok) {
          throw new Error(`Scryfall responded ${response.status}`);
        }
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

        // Only cache real hits; an empty result would persist forever (no TTL).
        if (art) {
          batchCache[commander] = { art, full };
          console.log(`Cached: ${commander}`);
        }
      } catch (error) {
        // Don't cache failed attempts — leave uncached so they retry.
        console.warn(`Failed to fetch ${commander}:`, error);
      }
    })
  );

  // Persist entire batch to cache once
  setImageCacheBatch(batchCache);
  console.log("Pre-fetch complete");
}
