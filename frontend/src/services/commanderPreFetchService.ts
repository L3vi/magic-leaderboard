/**
 * Commander pre-fetch service
 *
 * Loads commander art AND color identity for every commander in a set of games.
 * Both pieces of data live on the same Scryfall card object, so we fetch them
 * together in one pass instead of querying art and colors separately.
 *
 * Bulk path: Scryfall's POST /cards/collection returns up to 75 cards per
 * request, each carrying image_uris + color_identity. A whole season's ~75
 * unique commanders collapses into 1–2 requests instead of ~150.
 *
 * Fallback path: names Scryfall can't match exactly (e.g. "A // B" MDFC names,
 * or user typos) come back in `not_found`; those few are resolved one at a time
 * via the fuzzy /cards/named endpoint, which also returns art + colors together.
 *
 * Every request funnels through scryfallFetch, so pacing/retry is handled centrally.
 */

import {
  getImageCache,
  getColorCache,
  setImageCache,
  setColorCache,
  setImageCacheBatch,
  setColorCacheBatch,
} from './cacheService';
import { scryfallFetch } from './scryfallClient';
import type { CardImageCache } from '../types';

const COLLECTION_CHUNK = 75; // Scryfall's max identifiers per /cards/collection request

/** Pull art_crop + normal/large image URLs off a card (handles double-faced cards). */
function extractArt(card: any): CardImageCache {
  const uris = card?.image_uris || card?.card_faces?.[0]?.image_uris;
  if (!uris) return { art: "", full: "" };
  return { art: uris.art_crop || "", full: uris.normal || uris.large || "" };
}

/** Collect unique, cleaned commander names across all games. */
function collectCommanders(games: any[]): string[] {
  const unique = new Set<string>();
  for (const game of games) {
    if (!Array.isArray(game?.players)) continue;
    for (const player of game.players) {
      const commanders = Array.isArray(player.commander) ? player.commander : [player.commander];
      for (const cmd of commanders) {
        if (typeof cmd === "string" && cmd.trim().length > 0 && cmd !== "Unknown") {
          unique.add(cmd.trim());
        }
      }
    }
  }
  return Array.from(unique);
}

/** Fuzzy single-card fallback: caches both art and colors for one commander. */
async function fetchSingleCommander(name: string): Promise<void> {
  try {
    const response = await scryfallFetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`
    );
    if (!response.ok) {
      throw new Error(`Scryfall named responded ${response.status}`);
    }
    const card = await response.json();
    // color_identity is always present (empty array for colorless); cache it
    // even when there's no art so we don't re-query this commander next load.
    setColorCache(name, card.color_identity || []);
    const { art, full } = extractArt(card);
    if (art) setImageCache(name, { art, full });
  } catch (error) {
    // Leave uncached so it retries on the next load.
    console.warn(`Failed to fetch ${name}:`, error);
  }
}

/**
 * Pre-fetch art + color identity for all commanders in the given games.
 * Only fetches commanders missing image or color data; already-cached ones are skipped.
 *
 * onProgress fires whenever a batch of data lands in the cache (after each
 * collection chunk, and after the fuzzy fallback). Callers use it to re-render
 * as data streams in, so the UI isn't blocked on the slow serialized tail —
 * important on mobile, where the fallback crawl can be throttled or stall.
 */
export async function preFetchCommanderData(
  games: any[],
  onProgress?: () => void
): Promise<void> {
  const commanders = collectCommanders(games);

  // A commander needs fetching if EITHER its art or its colors are missing.
  const toFetch = commanders.filter(
    (name) => getImageCache(name) === null || getColorCache(name) === null
  );

  if (toFetch.length === 0) {
    console.log("All commander data already cached");
    return;
  }

  console.log(`Pre-fetching ${toFetch.length} commanders from Scryfall (collection)`);

  const matched = new Set<string>();

  for (let i = 0; i < toFetch.length; i += COLLECTION_CHUNK) {
    const chunk = toFetch.slice(i, i + COLLECTION_CHUNK);
    // Map lowercased name -> the exact string we'll cache under (what lookups use).
    const requestedByLower = new Map<string, string>();
    chunk.forEach((name) => requestedByLower.set(name.toLowerCase(), name));

    const imageBatch: Record<string, CardImageCache> = {};
    const colorBatch: Record<string, string[]> = {};

    try {
      const response = await scryfallFetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) }),
      });
      if (!response.ok) {
        throw new Error(`Scryfall collection responded ${response.status}`);
      }
      const data = await response.json();

      for (const card of data.data || []) {
        // Correlate the returned card back to the name we requested (and thus
        // will look it up by). Match on the card name or either face name.
        const candidates = [card.name, ...(card.card_faces?.map((f: any) => f.name) || [])];
        let original: string | undefined;
        for (const candidate of candidates) {
          const hit = candidate && requestedByLower.get(candidate.toLowerCase());
          if (hit) {
            original = hit;
            break;
          }
        }

        const colors: string[] = card.color_identity || [];
        const { art, full } = extractArt(card);
        // Cache under both the canonical name and the originally-requested name.
        const keys = new Set<string>([card.name]);
        if (original) {
          keys.add(original);
          matched.add(original);
        }
        for (const key of keys) {
          colorBatch[key] = colors;
          if (art) imageBatch[key] = { art, full };
        }
      }
    } catch (error) {
      // Whole chunk failed — its names fall through to the single fallback below.
      console.warn("Scryfall collection batch failed:", error);
    }

    // Commit this chunk and let the UI repaint with it — don't wait for the
    // remaining chunks or the slow fallback below.
    setImageCacheBatch(imageBatch);
    setColorCacheBatch(colorBatch);
    onProgress?.();
  }

  // Resolve anything the collection call didn't match (not_found, "//" names,
  // failed chunks) one at a time via fuzzy lookup.
  const remaining = toFetch.filter((name) => !matched.has(name));
  if (remaining.length > 0) {
    console.log(`Resolving ${remaining.length} commanders via fuzzy fallback`);
    await Promise.all(remaining.map((name) => fetchSingleCommander(name)));
    onProgress?.();
  }

  console.log("Pre-fetch complete");
}
