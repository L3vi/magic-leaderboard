import { useState, useEffect } from 'react';

// Global cache for commander images
const commanderImageCache: Record<string, string> = {};

/**
 * Hook to fetch and cache commander card art from Scryfall API
 * @param commander - The commander card name
 * @returns URL of the card art image, or empty string if not found
 */
export function useCommanderArt(commander: string): string {
  const [imgUrl, setImgUrl] = useState(
    commanderImageCache[commander] || ""
  );

  useEffect(() => {
    // Return cached value if available
    if (commanderImageCache[commander]) {
      setImgUrl(commanderImageCache[commander]);
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
        // Try to get art crop from image_uris
        if (data.image_uris && data.image_uris.art_crop) {
          art = data.image_uris.art_crop;
        }
        // Fall back to card faces for double-faced cards
        else if (
          data.card_faces &&
          data.card_faces[0]?.image_uris?.art_crop
        ) {
          art = data.card_faces[0].image_uris.art_crop;
        }

        commanderImageCache[commander] = art;
        if (isMounted) setImgUrl(art);
      })
      .catch(() => {
        commanderImageCache[commander] = ""; // cache failure
        if (isMounted) setImgUrl("");
      });

    return () => {
      isMounted = false;
    };
  }, [commander]);

  return imgUrl;
}
