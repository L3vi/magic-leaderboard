import { useState, useEffect } from 'react';

// Global cache for commander images
interface CardImageCache {
  art: string;
  full: string;
}

const commanderImageCache: Record<string, CardImageCache> = {};

/**
 * Hook to fetch and cache commander card art from Scryfall API
 * @param commander - The commander card name
 * @returns URL of the card art image, or empty string if not found
 */
export function useCommanderArt(commander: string): string {
  const [imgUrl, setImgUrl] = useState(
    commanderImageCache[commander]?.art || ""
  );

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
  }, [commander]);

  return imgUrl;
}

/**
 * Hook to fetch and cache full commander card images from Scryfall API
 * @param commander - The commander card name
 * @returns URL of the full card image, or empty string if not found
 */
export function useCommanderFullImage(commander: string): string {
  const [imgUrl, setImgUrl] = useState(
    commanderImageCache[commander]?.full || ""
  );

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
  }, [commander]);

  return imgUrl;
}
