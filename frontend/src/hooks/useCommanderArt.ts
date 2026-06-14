import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { getCommanderArtPreference, peekCommanderArtPreference } from '../services/playerArtPreferences';
import { useArtPreferenceRefresh } from '../context/ArtPreferenceContext';
import {
  getImageCache,
  setImageCache,
  getInflightRequest,
  setInflightRequest,
  clearInflightRequest,
  getAllImageCache,
  clearCommanderCache as clearCommanderCacheInService,
  subscribeImageCache,
  getImageCacheVersion,
} from '../services/cacheService';
import { scryfallFetch } from '../services/scryfallClient';
import type { CardVariant, CardImageCache } from '../types';

// Local variants cache (doesn't need persistence as much)
const commanderVariantsCache: Record<string, CardVariant[]> = {};

/**
 * Fetch commander image data from Scryfall API
 * Reused for both art and full image queries
 */
async function fetchCommanderImages(commander: string): Promise<CardImageCache> {
  // Cache is authoritative: never hit the network for a commander we already have.
  // Callers (the *WithPreference hooks) gate their own cache check behind an
  // isMounted flag, which a StrictMode/re-mount race can flip false mid-await,
  // letting them fall through to here — so this guard prevents the redundant call.
  const cached = getImageCache(commander);
  if (cached) {
    return cached;
  }

  const requestKey = `image_${commander}`;

  // Check if this request is already in-flight
  const inflightPromise = getInflightRequest(requestKey);
  if (inflightPromise) {
    return inflightPromise;
  }

  const promise = (async () => {
    try {
      const response = await scryfallFetch(
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(commander)}`
      );
      if (!response.ok) {
        // 404 = no card matches that name. Expected for partial / misspelled /
        // ambiguous input, so it's a normal miss, not an error worth logging.
        // 429/5xx are real problems — surface those. Either way return empty
        // without caching, so a transient failure can retry later.
        if (response.status !== 404) {
          console.error(`Scryfall responded ${response.status} for "${commander}"`);
        }
        return { art: "", full: "" };
      }
      const data = await response.json();

      let art = "";
      let full = "";

      if (data.image_uris && data.image_uris.art_crop) {
        art = data.image_uris.art_crop;
        full = data.image_uris.normal || data.image_uris.large || "";
      } else if (data.card_faces?.[0]?.image_uris) {
        art = data.card_faces[0].image_uris.art_crop || "";
        full = data.card_faces[0].image_uris.normal || data.card_faces[0].image_uris.large || "";
      }

      const result = { art, full };
      // Only persist real hits. Caching an empty result on a transient failure
      // would permanently blank this commander's art (the cache has no TTL).
      if (art) setImageCache(commander, result);
      return result;
    } catch (error) {
      console.error(`Failed to fetch images for ${commander}:`, error);
      return { art: "", full: "" };
    } finally {
      clearInflightRequest(requestKey);
    }
  })();

  setInflightRequest(requestKey, promise);
  return promise;
}

/**
 * Hook to fetch and cache commander card art from Scryfall API
 * @param commander - The commander card name
 * @returns URL of the card art image, or empty string if not found
 */
export function useCommanderArtState(commander: string): CommanderArtState {
  // Re-render when art lands in the shared cache (e.g. the batch pre-fetch) so
  // we paint from cache without each caller firing its own request.
  const cacheVersion = useSyncExternalStore(subscribeImageCache, getImageCacheVersion);
  const cachedSeed = getImageCache(commander)?.art || "";
  const [state, setState] = useState<CommanderArtState>(() => ({
    url: cachedSeed,
    loading: !cachedSeed && !!commander && commander.trim().length >= 3,
  }));
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!commander || commander.trim().length < 3) {
      setState({ url: "", loading: false });
      return;
    }

    // Prefer the shared cache (populated up front by the batch pre-fetch).
    const cached = getImageCache(commander);
    if (cached) {
      setState({ url: cached.art, loading: false });
      return;
    }

    // Not cached yet: shimmer. Most commanders arrive via the batch pre-fetch
    // (this effect re-runs on cacheVersion and paints them). Only fetch directly
    // as a fallback — debounced — for one-off names the batch won't cover (e.g.
    // a commander typed into the New Game form).
    setState({ url: "", loading: true });

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    let isMounted = true;
    debounceTimer.current = setTimeout(() => {
      if (!isMounted || getImageCache(commander)) return; // batch may have filled it
      fetchCommanderImages(commander).then((result) => {
        if (isMounted) setState({ url: result.art, loading: false });
      });
    }, 600);

    return () => {
      isMounted = false;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [commander, cacheVersion]);

  return state;
}

export function useCommanderArt(commander: string): string {
  return useCommanderArtState(commander).url;
}

/**
 * Hook to fetch and cache full commander card images from Scryfall API
 * @param commander - The commander card name
 * @returns URL of the full card image, or empty string if not found
 */
export function useCommanderFullImage(commander: string): string {
  const cached = getImageCache(commander);
  const [imgUrl, setImgUrl] = useState<string>(cached?.full || "");
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!commander || commander.trim().length < 3) {
      setImgUrl("");
      return;
    }

    const cached = getImageCache(commander);
    if (cached) {
      setImgUrl(cached.full);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      let isMounted = true;
      fetchCommanderImages(commander).then((result) => {
        if (isMounted) setImgUrl(result.full);
      });
      return () => { isMounted = false; };
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [commander]);

  return imgUrl;
}

/**
 * Hook to fetch all card variants from Scryfall API
 * @param commander - The commander card name
 * @returns Array of available card variants
 */
export function useCommanderVariants(commander: string): CardVariant[] {
  const [variants, setVariants] = useState<CardVariant[]>(
    commanderVariantsCache[commander] || []
  );

  useEffect(() => {
    if (!commander || commander.trim() === "") {
      setVariants([]);
      return;
    }

    if (commanderVariantsCache[commander]) {
      setVariants(commanderVariantsCache[commander]);
      return;
    }

    let isMounted = true;

    scryfallFetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(commander)}`)
      .then((res) => res.json())
      .then((data) => {
        return scryfallFetch(
          `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(data.name)}"&unique=prints`
        ).then((res) => res.json());
      })
      .then((searchData) => {
        if (!isMounted) return;

        const cardVariants: CardVariant[] = [];

        if (searchData.data && Array.isArray(searchData.data)) {
          searchData.data.forEach((card: any) => {
            let art = "";
            let full = "";

            if (card.image_uris) {
              art = card.image_uris.art_crop || "";
              full = card.image_uris.normal || card.image_uris.large || "";
            } else if (card.card_faces?.[0]?.image_uris) {
              art = card.card_faces[0].image_uris.art_crop || "";
              full = card.card_faces[0].image_uris.normal || card.card_faces[0].image_uris.large || "";
            }

            if (art && full) {
              cardVariants.push({
                id: `${card.id}-${card.set}`,
                name: card.name,
                art,
                full,
                set: card.set.toUpperCase(),
                setName: card.set_name || card.set,
              });
            }
          });
        }

        commanderVariantsCache[commander] = cardVariants;
        setVariants(cardVariants);
      })
      .catch((error) => {
        console.error("Failed to fetch card variants:", error);
        if (isMounted) {
          commanderVariantsCache[commander] = [];
          setVariants([]);
        }
      });

    return () => { isMounted = false; };
  }, [commander]);

  return variants;
}

/**
 * State returned while resolving commander art: the resolved URL plus whether
 * resolution is still in flight. `loading` lets callers show a shimmer until
 * the URL is known, and distinguish that from a genuine miss (loading=false,
 * url="") which should render the "?" placeholder.
 */
export interface CommanderArtState {
  url: string;
  loading: boolean;
}

/**
 * Hook to fetch commander art with player preference fallback, exposing a
 * loading flag. `useCommanderArtWithPreference` wraps this for the common
 * url-only case.
 */
export function useCommanderArtStateWithPreference(
  commander: string,
  playerId?: string
): CommanderArtState {
  // Resolve the art to show *right now*, synchronously, so there's no shimmer
  // hold and no flicker:
  //   - If we already know the player's preference (this session or from the
  //     persisted cache), use it (or the cached default if they have none).
  //   - If we don't know it yet, paint the cached default immediately and let
  //     the effect swap in a preference if one turns up (only happens on a cold
  //     first load — every later visit/refresh knows it up front).
  const resolveImmediate = (): CommanderArtState => {
    const valid = !!commander && commander.trim().length >= 3;
    if (!valid) return { url: "", loading: false };
    const cachedArt = getImageCache(commander)?.art || "";
    if (playerId) {
      const peek = peekCommanderArtPreference(playerId, commander);
      if (peek.known) {
        const art = peek.pref?.artUrl || cachedArt;
        return { url: art, loading: !art };
      }
    }
    return { url: cachedArt, loading: !cachedArt };
  };

  // Repaint when art lands in the shared cache (the batch pre-fetch streaming
  // in). This is what lets every thumbnail read straight from cache instead of
  // firing its own Scryfall request — the cause of the cold-load request storm.
  const cacheVersion = useSyncExternalStore(subscribeImageCache, getImageCacheVersion);
  const [state, setState] = useState<CommanderArtState>(resolveImmediate);
  const { refreshTrigger } = useArtPreferenceRefresh();

  useEffect(() => {
    if (!commander || commander.trim().length < 3) {
      setState({ url: "", loading: false });
      return;
    }

    let isMounted = true;

    // Reflect the current commander from the caches immediately. This NEVER
    // fetches art — the app-wide batch pre-fetch (see SessionContext) is the
    // sole fetcher, so thumbnails never storm Scryfall. We shimmer until the
    // batch fills the cache (this effect re-runs on cacheVersion).
    setState(resolveImmediate());

    // Resolve the player's preference (Firestore, memoized per player) so the
    // first cold load can swap a default to the player's chosen art once known.
    if (playerId && peekCommanderArtPreference(playerId, commander).known === false) {
      getCommanderArtPreference(playerId, commander)
        .then((preference) => {
          if (!isMounted) return;
          if (preference) setState({ url: preference.artUrl, loading: false });
          else setState(resolveImmediate());
        })
        .catch(() => { /* keep showing the cached default */ });
    }

    return () => { isMounted = false; };
  }, [commander, playerId, refreshTrigger, cacheVersion]);

  return state;
}

/**
 * Hook to fetch commander art with player preference fallback
 * @param commander - The commander card name
 * @param playerId - Optional player ID to check for saved preferences
 * @returns URL of the card art image
 */
export function useCommanderArtWithPreference(
  commander: string,
  playerId?: string
): string {
  return useCommanderArtStateWithPreference(commander, playerId).url;
}

/**
 * Hook to fetch full commander art with player preference fallback
 * @param commander - The commander card name
 * @param playerId - Optional player ID to check for saved preferences
 * @returns URL of the full card image
 */
export function useCommanderFullImageWithPreference(
  commander: string,
  playerId?: string
): string {
  // Resolve synchronously like useCommanderArtStateWithPreference: use the known
  // preference if we have it (session/persisted cache), else the cached default,
  // and let the effect swap in a preference only when one turns up cold.
  const resolveImmediate = (): string => {
    const cachedFull = getImageCache(commander)?.full || "";
    if (playerId) {
      const peek = peekCommanderArtPreference(playerId, commander);
      if (peek.known) return peek.pref?.fullImageUrl || cachedFull;
    }
    return cachedFull;
  };
  const cacheVersion = useSyncExternalStore(subscribeImageCache, getImageCacheVersion);
  const [imgUrl, setImgUrl] = useState<string>(resolveImmediate);
  const { refreshTrigger } = useArtPreferenceRefresh();

  useEffect(() => {
    if (!commander || commander.trim().length < 3) {
      setImgUrl("");
      return;
    }

    let isMounted = true;

    // Cache-only (the batch pre-fetch is the sole fetcher); repaint on cacheVersion.
    setImgUrl(resolveImmediate());

    if (playerId && peekCommanderArtPreference(playerId, commander).known === false) {
      getCommanderArtPreference(playerId, commander)
        .then((preference) => {
          if (!isMounted) return;
          if (preference) setImgUrl(preference.fullImageUrl);
          else setImgUrl(resolveImmediate());
        })
        .catch(() => { /* keep cached default */ });
    }

    return () => { isMounted = false; };
  }, [commander, playerId, refreshTrigger, cacheVersion]);

  return imgUrl;
}

/**
 * Export cache reference for backwards compatibility with pre-fetch service
 */
export function getCommanderImageCache(): Record<string, CardImageCache> {
  // Return all cached images in the format expected by pre-fetch service
  return getAllImageCache();
}

/**
 * Clear cache for a specific commander to force re-fetch
 */
export function clearCommanderCache(commander: string): void {
  clearCommanderCacheInService(commander);
}

// Re-export types for backwards compatibility
export type { CardVariant, CardImageCache };

