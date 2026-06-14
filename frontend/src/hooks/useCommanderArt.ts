import { useState, useEffect, useRef } from 'react';
import { getCommanderArtPreference } from '../services/playerArtPreferences';
import { useArtPreferenceRefresh } from '../context/ArtPreferenceContext';
import {
  getImageCache,
  setImageCache,
  getInflightRequest,
  setInflightRequest,
  clearInflightRequest,
  getAllImageCache,
  clearCommanderCache as clearCommanderCacheInService,
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

    // Use cached value if available — already resolved, no shimmer.
    const cached = getImageCache(commander);
    if (cached) {
      setState({ url: cached.art, loading: false });
      return;
    }

    // Resolving: shimmer through the debounce window and the fetch.
    setState({ url: "", loading: true });

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    let isMounted = true;
    debounceTimer.current = setTimeout(() => {
      fetchCommanderImages(commander).then((result) => {
        // Settle regardless of hit/miss so a genuine miss stops shimmering.
        if (isMounted) setState({ url: result.art, loading: false });
      });
    }, 500);

    return () => {
      isMounted = false;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [commander]);

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
  // Seed the first frame. With a playerId the player's saved art may override
  // the cached default, so we hold the shimmer (no url) until that's resolved
  // rather than painting the default and then visibly swapping to the selected
  // art. Without a playerId the cached art is final, so paint it immediately.
  const [state, setState] = useState<CommanderArtState>(() => {
    const seed = getImageCache(commander)?.art || "";
    const valid = !!commander && commander.trim().length >= 3;
    if (playerId) {
      return { url: "", loading: valid };
    }
    return { url: seed, loading: !seed && valid };
  });
  const { refreshTrigger } = useArtPreferenceRefresh();

  useEffect(() => {
    if (!commander || commander.trim().length < 3) {
      // Too short to ever match a card — resolved as "no art", show "?".
      setState({ url: "", loading: false });
      return;
    }

    let isMounted = true;
    const cached = getImageCache(commander);

    if (playerId) {
      // Keep shimmering until the preference check settles, so the thumbnail
      // never flickers from the default art to the player's selected art.
      setState({ url: "", loading: true });
    } else if (cached) {
      // No preference possible — the cached art is final, paint it now.
      setState({ url: cached.art, loading: false });
    } else {
      setState({ url: "", loading: true });
    }

    const loadArt = async () => {
      if (playerId) {
        try {
          const preference = await getCommanderArtPreference(playerId, commander);
          if (!isMounted) return;
          if (preference) {
            setState({ url: preference.artUrl, loading: false });
            return;
          }
        } catch (error) {
          // Silently fall through to default
        }
        if (!isMounted) return;
      }

      // No preference (or no playerId): use cached art, else fetch it.
      if (cached) {
        if (isMounted) setState({ url: cached.art, loading: false });
        return;
      }
      if (!isMounted) return;

      const result = await fetchCommanderImages(commander);
      // Settle regardless of hit/miss so a genuine miss stops shimmering.
      if (isMounted) setState({ url: result.art, loading: false });
    };

    loadArt();
    return () => { isMounted = false; };
  }, [commander, playerId, refreshTrigger]);

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
  // With a playerId the player's saved art may override the default, so hold
  // back the URL (don't paint the default first) until the preference resolves
  // — same anti-flicker rule as useCommanderArtStateWithPreference. Without a
  // playerId the cached image is final, so seed it immediately.
  const [imgUrl, setImgUrl] = useState<string>(() =>
    playerId ? "" : (getImageCache(commander)?.full || "")
  );
  const { refreshTrigger } = useArtPreferenceRefresh();

  useEffect(() => {
    if (!commander || commander.trim().length < 3) {
      setImgUrl("");
      return;
    }

    let isMounted = true;
    const cached = getImageCache(commander);

    if (!playerId && cached) {
      // No preference possible — the cached image is final, paint it now.
      setImgUrl(cached.full);
    }
    // With a playerId we keep whatever's already shown (don't blank it) and let
    // loadArt settle to the final image, so it never flickers default→selected.

    const loadArt = async () => {
      if (playerId) {
        try {
          const preference = await getCommanderArtPreference(playerId, commander);
          if (!isMounted) return;
          if (preference) {
            setImgUrl(preference.fullImageUrl);
            return;
          }
        } catch (error) {
          // Silently fall through to default
        }
        if (!isMounted) return;
      }

      if (cached) {
        if (isMounted) setImgUrl(cached.full);
        return;
      }
      if (!isMounted) return;

      const result = await fetchCommanderImages(commander);
      if (isMounted) setImgUrl(result.full);
    };

    loadArt();
    return () => { isMounted = false; };
  }, [commander, playerId, refreshTrigger]);

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

