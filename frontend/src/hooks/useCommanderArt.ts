import { useState, useEffect, useRef } from 'react';
import { getCommanderArtPreference } from '../services/playerArtPreferences';
import { useArtPreferenceRefresh } from '../context/ArtPreferenceContext';
import {
  getImageCache,
  setImageCache,
  getInflightRequest,
  setInflightRequest,
  clearInflightRequest,
} from '../services/cacheService';
import type { CardVariant, CardImageCache } from '../types';

// Local variants cache (doesn't need persistence as much)
const commanderVariantsCache: Record<string, CardVariant[]> = {};

/**
 * Fetch commander image data from Scryfall API
 * Reused for both art and full image queries
 */
async function fetchCommanderImages(commander: string): Promise<CardImageCache> {
  const requestKey = `image_${commander}`;
  
  // Check if this request is already in-flight
  const inflightPromise = getInflightRequest(requestKey);
  if (inflightPromise) {
    return inflightPromise;
  }

  const promise = (async () => {
    try {
      const response = await fetch(
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(commander)}`
      );
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
      setImageCache(commander, result);
      return result;
    } catch (error) {
      console.error(`Failed to fetch images for ${commander}:`, error);
      const emptyResult = { art: "", full: "" };
      setImageCache(commander, emptyResult);
      return emptyResult;
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
export function useCommanderArt(commander: string): string {
  const cached = getImageCache(commander);
  const [imgUrl, setImgUrl] = useState<string>(cached?.art || "");
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!commander || commander.trim().length < 3) {
      setImgUrl("");
      return;
    }

    // Use cached value if available
    const cached = getImageCache(commander);
    if (cached) {
      setImgUrl(cached.art);
      return;
    }

    // Debounce the fetch
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      let isMounted = true;
      fetchCommanderImages(commander).then((result) => {
        if (isMounted) setImgUrl(result.art);
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

    fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(commander)}`)
      .then((res) => res.json())
      .then((data) => {
        return fetch(
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
 * Hook to fetch commander art with player preference fallback
 * @param commander - The commander card name
 * @param playerId - Optional player ID to check for saved preferences
 * @returns URL of the card art image
 */
export function useCommanderArtWithPreference(
  commander: string,
  playerId?: string
): string {
  const [imgUrl, setImgUrl] = useState<string>("");
  const { refreshTrigger } = useArtPreferenceRefresh();

  useEffect(() => {
    if (!commander || commander.trim().length < 3) {
      setImgUrl("");
      return;
    }

    let isMounted = true;

    const loadArt = async () => {
      if (playerId) {
        try {
          const preference = await getCommanderArtPreference(playerId, commander);
          if (preference && isMounted) {
            setImgUrl(preference.artUrl);
            return;
          }
        } catch (error) {
          // Silently fall through to default
        }
      }

      const cached = getImageCache(commander);
      if (cached && isMounted) {
        setImgUrl(cached.art);
        return;
      }

      const result = await fetchCommanderImages(commander);
      if (isMounted) setImgUrl(result.art);
    };

    loadArt();
    return () => { isMounted = false; };
  }, [commander, playerId, refreshTrigger]);

  return imgUrl;
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
  const [imgUrl, setImgUrl] = useState<string>("");
  const { refreshTrigger } = useArtPreferenceRefresh();

  useEffect(() => {
    if (!commander || commander.trim().length < 3) {
      setImgUrl("");
      return;
    }

    let isMounted = true;

    const loadArt = async () => {
      if (playerId) {
        try {
          const preference = await getCommanderArtPreference(playerId, commander);
          if (preference && isMounted) {
            setImgUrl(preference.fullImageUrl);
            return;
          }
        } catch (error) {
          // Silently fall through to default
        }
      }

      const cached = getImageCache(commander);
      if (cached && isMounted) {
        setImgUrl(cached.full);
        return;
      }

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
  const cacheService = require('../services/cacheService');
  return cacheService.getAllImageCache();
}

/**
 * Clear cache for a specific commander to force re-fetch
 */
export function clearCommanderCache(commander: string): void {
  const cacheService = require('../services/cacheService');
  cacheService.clearCommanderCache(commander);
}

// Re-export types for backwards compatibility
export type { CardVariant, CardImageCache };

