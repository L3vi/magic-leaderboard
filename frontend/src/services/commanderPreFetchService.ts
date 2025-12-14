import { CardImageCache } from "../hooks/useCommanderArt";

/**
 * Pre-fetch commander data from Scryfall API for all unique commanders in games
 * This populates the cache so commander images/data are available instantly without API calls
 * Respects rate limiting with delays between requests
 */
export async function preFetchCommandersFromGames(
  games: any[],
  commanderImageCache: Record<string, CardImageCache>
): Promise<void> {
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

  // Convert to array and filter out commanders already in cache
  const commandersToFetch = Array.from(uniqueCommanders).filter(
    (cmd) => !commanderImageCache[cmd]
  );

  if (commandersToFetch.length === 0) {
    console.log("All commanders already cached");
    return;
  }

  console.log(`Pre-fetching ${commandersToFetch.length} unique commanders from Scryfall`);

  // Fetch commanders with rate limiting (100ms between requests = ~10 req/sec)
  for (let i = 0; i < commandersToFetch.length; i++) {
    const commander = commandersToFetch[i];
    
    try {
      const response = await fetch(
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(commander)}`
      );
      const data = await response.json();

      let art = "";
      let full = "";

      // Extract art and full image
      if (data.image_uris) {
        art = data.image_uris.art_crop || "";
        full = data.image_uris.normal || data.image_uris.large || "";
      } else if (data.card_faces && data.card_faces[0]?.image_uris) {
        art = data.card_faces[0].image_uris.art_crop || "";
        full = data.card_faces[0].image_uris.normal || data.card_faces[0].image_uris.large || "";
      }

      commanderImageCache[commander] = { art, full };
      console.log(`Cached: ${commander}`);
    } catch (error) {
      // Cache failed attempts so we don't retry
      commanderImageCache[commander] = { art: "", full: "" };
      console.warn(`Failed to fetch ${commander}:`, error);
    }

    // Rate limiting: wait 100ms between requests (respects Scryfall's ~10 req/sec limit)
    if (i < commandersToFetch.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log("Pre-fetch complete");
}
