import { useState, useEffect, useRef } from 'react';
import { getCommanderArtPreference } from '../services/playerArtPreferences';
import { useArtPreferenceRefresh } from '../context/ArtPreferenceContext';

// Global cache for commander images
interface CardImageCache {
  art: string;
  full: string;
}

export interface CardVariant {
  id: string;
  name: string;
  art: string;
  full: string;
  set: string;
  setName: string;
}

const commanderImageCache: Record<string, CardImageCache> = {};
const commanderVariantsCache: Record<string, CardVariant[]> = {};

/**
 * Clear cache for a specific commander to force re-fetch
 * Useful after saving a new art preference
 */
export function clearCommanderCache(commander: string): void {
  delete commanderImageCache[commander];
  delete commanderVariantsCache[commander];
}

/**
 * Hook to fetch and cache commander card art from Scryfall API
 * Debounced to avoid rate limiting on rapid input changes (e.g., typing in autocomplete)
 * @param commander - The commander card name
 * @returns URL of the card art image, or empty string if not found
 */
export function useCommanderArt(commander: string): string {
  const [imgUrl, setImgUrl] = useState(
    commanderImageCache[commander]?.art || ""
  );
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Don't fetch if commander is empty
    if (!commander || commander.trim() === "") {
      setImgUrl("");
      return;
    }

    // Return cached value if available
    if (commanderImageCache[commander]) {
      setImgUrl(commanderImageCache[commander].art);
      return;
    }

    // Debounce the API call (500ms delay to match typical typing speed)
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
          let art = "";
          let full = "";

          // Try to get art crop from image_uris
          if (data.image_uris && data.image_uris.art_crop) {
            art = data.image_uris.art_crop;
            full = data.image_uris.normal || data.image_uris.large || "";
          }
          // Fall back to card faces for double-faced cards
          else if (
            data.card_faces &&
            data.card_faces[0]?.image_uris?.art_crop
          ) {
            art = data.card_faces[0].image_uris.art_crop;
            full = data.card_faces[0].image_uris.normal || data.card_faces[0].image_uris.large || "";
          }

          commanderImageCache[commander] = { art, full };
          if (isMounted) setImgUrl(art);
        })
        .catch(() => {
          commanderImageCache[commander] = { art: "", full: "" }; // cache failure
          if (isMounted) setImgUrl("");
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

  return imgUrl;

/**
 * Hook to fetch and cache full commander card images from Scryfall API
 * Debounced to avoid rate limiting on rapid input changes (e.g., typing in autocomplete)
 * @param commander - The commander card name
 * @returns URL of the full card image, or empty string if not found
 */
export function useCommanderFullImage(commander: string): string {
  const [imgUrl, setImgUrl] = useState(
    commanderImageCache[commander]?.full || ""
  );
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Don't fetch if commander is empty
    if (!commander || commander.trim() === "") {
      setImgUrl("");
      return;
    }

    // Return cached value if available
    if (commanderImageCache[commander]) {
      setImgUrl(commanderImageCache[commander].full);
      return;
    }

    // Debounce the API call (500ms delay to match typical typing speed)
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
          let art = "";
          let full = "";

          // Try to get art crop from image_uris
          if (data.image_uris && data.image_uris.art_crop) {
            art = data.image_uris.art_crop;
            full = data.image_uris.normal || data.image_uris.large || "";
          }
          // Fall back to card faces for double-faced cards
          else if (
            data.card_faces &&
            data.card_faces[0]?.image_uris?.art_crop
          ) {
            art = data.card_faces[0].image_uris.art_crop;
            full = data.card_faces[0].image_uris.normal || data.card_faces[0].image_uris.large || "";
          }

          commanderImageCache[commander] = { art, full };
          if (isMounted) setImgUrl(full);
        })
        .catch(() => {
          commanderImageCache[commander] = { art: "", full: "" }; // cache failure
          if (isMounted) setImgUrl("");
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
    // Don't fetch if commander is empty
    if (!commander || commander.trim() === "") {
      setVariants([]);
      return;
    }

    // Return cached value if available
    if (commanderVariantsCache[commander]) {
      setVariants(commanderVariantsCache[commander]);
      return;
    }

    let isMounted = true;

    // First get the card to find all printings
    fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
        commander
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        // Get the card's name for searching all printings
        const cardName = data.name;
        
        // Search for all printings of this card
        return fetch(
          `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(cardName)}"&unique=prints`
        ).then((res) => res.json());
      })
      .then((searchData) => {
        if (!isMounted) return;

        const cardVariants: CardVariant[] = [];

        // Process search results
        if (searchData.data && Array.isArray(searchData.data)) {
          searchData.data.forEach((card: any) => {
            let art = "";
            let full = "";

            // Extract art and full image URLs
            if (card.image_uris) {
              art = card.image_uris.art_crop || "";
              full = card.image_uris.normal || card.image_uris.large || "";
            } else if (card.card_faces?.[0]?.image_uris) {
              art = card.card_faces[0].image_uris.art_crop || "";
              full = card.card_faces[0].image_uris.normal || card.card_faces[0].image_uris.large || "";
            }

            // Only add if we have images
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

    return () => {
      isMounted = false;
    };
  }, [commander]);

  return variants;
}

/**
 * Hook to fetch commander art with player preference fallback
 * If the player has saved an art preference, it returns that instead
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
    if (!commander || commander.trim() === "") {
      setImgUrl("");
      return;
    }

    let isMounted = true;

    const loadArt = async () => {
      // Check if player has a saved preference
      if (playerId) {
        try {
          const preference = await getCommanderArtPreference(playerId, commander);
          if (preference && isMounted) {
            setImgUrl(preference.artUrl);
            return;
          }
        } catch (error) {
          console.error("Failed to load art preference:", error);
        }
      }

      // Fall back to default art from cache or fetch
      if (commanderImageCache[commander]) {
        if (isMounted) setImgUrl(commanderImageCache[commander].art);
        return;
      }

      // Fetch from API
      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
            commander
          )}`
        );
        const data = await response.json();
        
        let art = "";
        let full = "";

        if (data.image_uris && data.image_uris.art_crop) {
          art = data.image_uris.art_crop;
          full = data.image_uris.normal || data.image_uris.large || "";
        } else if (
          data.card_faces &&
          data.card_faces[0]?.image_uris?.art_crop
        ) {
          art = data.card_faces[0].image_uris.art_crop;
          full = data.card_faces[0].image_uris.normal || data.card_faces[0].image_uris.large || "";
        }

        commanderImageCache[commander] = { art, full };
        if (isMounted) setImgUrl(art);
      } catch (error) {
        commanderImageCache[commander] = { art: "", full: "" };
        if (isMounted) setImgUrl("");
      }
    };

    loadArt();

    return () => {
      isMounted = false;
    };
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
    if (!commander || commander.trim() === "") {
      setImgUrl("");
      return;
    }

    let isMounted = true;

    const loadArt = async () => {
      // Check if player has a saved preference
      if (playerId) {
        try {
          const preference = await getCommanderArtPreference(playerId, commander);
          if (preference && isMounted) {
            setImgUrl(preference.fullImageUrl);
            return;
          }
        } catch (error) {
          console.error("Failed to load art preference:", error);
        }
      }

      // Fall back to default art from cache or fetch
      if (commanderImageCache[commander]) {
        if (isMounted) setImgUrl(commanderImageCache[commander].full);
        return;
      }

      // Fetch from API
      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
            commander
          )}`
        );
        const data = await response.json();
        
        let art = "";
        let full = "";

        if (data.image_uris && data.image_uris.art_crop) {
          art = data.image_uris.art_crop;
          full = data.image_uris.normal || data.image_uris.large || "";
        } else if (
          data.card_faces &&
          data.card_faces[0]?.image_uris?.art_crop
        ) {
          art = data.card_faces[0].image_uris.art_crop;
          full = data.card_faces[0].image_uris.normal || data.card_faces[0].image_uris.large || "";
        }

        commanderImageCache[commander] = { art, full };
        if (isMounted) setImgUrl(full);
      } catch (error) {
        commanderImageCache[commander] = { art: "", full: "" };
        if (isMounted) setImgUrl("");
      }
    };

    loadArt();

    return () => {
      isMounted = false;
    };
  }, [commander, playerId, refreshTrigger]);

  return imgUrl;
}
