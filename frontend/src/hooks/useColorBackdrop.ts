import { useEffect, useState } from "react";
import { scryfallFetch } from "../services/scryfallClient";
import { COLOR_HEX } from "../utils/colorCombos";

/**
 * Backdrop art + overlay tint for the color / combination stats pages.
 *
 * There's no single card that represents a color, so we lean on iconic cards —
 * mostly full-art lands — that read instantly as that color identity:
 *   - Mono colors  → Unstable (`ust`) full-art basics: cleaner and more open
 *     than the busier Zendikar lands, so they stay legible behind page text.
 *   - 2-color guilds → the matching Ravnica Guildgate.
 *   - 3-color combos → the matching Triome (the full-art three-color lands).
 *   - 4-color combos → the matching Nephilim creature (the combos are literally
 *     named after them, e.g. Yore-Tiller), so the art is the thematic match.
 *   - 5-color → Command Tower (the classic Ryan Yee art with the rainbow column).
 * Art is pulled from Scryfall's exact-name endpoint and memoized per key for the
 * session. Tier pages (/stats/tiers/N) aggregate many identities, so no backdrop.
 */

interface LandSource {
  /** Exact card name to look up on Scryfall. */
  land: string;
  /** Optional set code to pin a specific printing (e.g. the full-art basics). */
  set?: string;
}

// Mono-color basics. Tints are nudged toward something visible on a dark navy
// overlay — pure black (B) would vanish, so it leans purple; white (W) leans
// warm parchment.
const MONO_BACKDROPS: Record<string, LandSource & { tint: string }> = {
  W: { land: "Plains", set: "ust", tint: "#e9d8a6" },
  U: { land: "Island", set: "ust", tint: "#3b82f6" },
  B: { land: "Swamp", set: "ust", tint: "#8b7cb0" },
  R: { land: "Mountain", set: "ust", tint: "#e2582a" },
  G: { land: "Forest", set: "ust", tint: "#2e9e5b" },
};

// Iconic card per multi-color identity, keyed by canonical WUBRG color key (see
// colorCombos.colorKey). Lands unless noted; the Nephilim (4-color) are creatures.
const COMBO_LANDS: Record<string, LandSource> = {
  // Guilds (2-color) → Ravnica Guildgates
  WU: { land: "Azorius Guildgate" },
  UB: { land: "Dimir Guildgate" },
  BR: { land: "Rakdos Guildgate" },
  RG: { land: "Gruul Guildgate" },
  WG: { land: "Selesnya Guildgate" },
  WB: { land: "Orzhov Guildgate" },
  UR: { land: "Izzet Guildgate" },
  BG: { land: "Golgari Guildgate" },
  WR: { land: "Boros Guildgate" },
  UG: { land: "Simic Guildgate" },
  // Shards/wedges (3-color) → Triomes
  WUB: { land: "Raffine's Tower" }, // Esper
  UBR: { land: "Xander's Lounge" }, // Grixis
  BRG: { land: "Ziatora's Proving Ground" }, // Jund
  WRG: { land: "Jetmir's Garden" }, // Naya
  WUG: { land: "Spara's Headquarters" }, // Bant
  WBG: { land: "Indatha Triome" }, // Abzan
  WUR: { land: "Raugrin Triome" }, // Jeskai
  UBG: { land: "Zagoth Triome" }, // Sultai
  WBR: { land: "Savai Triome" }, // Mardu
  URG: { land: "Ketria Triome" }, // Temur
  // Nephilim (4-color) → the creature the combo is named for
  WUBR: { land: "Yore-Tiller Nephilim" },
  UBRG: { land: "Glint-Eye Nephilim" },
  WBRG: { land: "Dune-Brood Nephilim" },
  WURG: { land: "Ink-Treader Nephilim" },
  WUBG: { land: "Witch-Maw Nephilim" },
  // 5-color → Command Tower (Commander 2011, the rainbow-column Ryan Yee art)
  WUBRG: { land: "Command Tower", set: "cmd" },
};

/** Average the mana colors of a combo key into a single overlay tint hex. */
function blendTint(key: string): string {
  const hexes = key
    .split("")
    .map((c) => COLOR_HEX[c])
    .filter(Boolean);
  if (hexes.length === 0) return "";
  const acc = [0, 0, 0];
  for (const hex of hexes) {
    acc[0] += parseInt(hex.slice(1, 3), 16);
    acc[1] += parseInt(hex.slice(3, 5), 16);
    acc[2] += parseInt(hex.slice(5, 7), 16);
  }
  const channel = (i: number) =>
    Math.round(acc[i] / hexes.length)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

// Resolved art_crop URLs, cached across mounts so we only hit Scryfall once.
const artCache: Record<string, string> = {};

/** Fetch + cache a land's art_crop, keyed by `cacheKey`. */
async function fetchLandArt(cacheKey: string, source: LandSource): Promise<string> {
  if (artCache[cacheKey]) return artCache[cacheKey];

  const setParam = source.set ? `&set=${source.set}` : "";
  const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(
    source.land
  )}${setParam}`;
  const response = await scryfallFetch(url);
  if (!response.ok) throw new Error(`Scryfall responded ${response.status} for ${source.land}`);

  const card = await response.json();
  const art = card?.image_uris?.art_crop || card?.card_faces?.[0]?.image_uris?.art_crop || "";
  if (art) artCache[cacheKey] = art;
  return art;
}

/** Shared loader: resolves the land art for a cache key, or "" if unsupported. */
function useLandBackdrop(
  cacheKey: string | undefined,
  source: LandSource | undefined,
  tint: string
): { image: string; tint: string } {
  const [image, setImage] = useState<string>(cacheKey ? artCache[cacheKey] || "" : "");

  useEffect(() => {
    if (!cacheKey || !source) {
      setImage("");
      return;
    }
    if (artCache[cacheKey]) {
      setImage(artCache[cacheKey]);
      return;
    }

    let isMounted = true;
    fetchLandArt(cacheKey, source)
      .then((art) => {
        if (isMounted) setImage(art);
      })
      .catch((error) => {
        // Non-fatal — the page just renders without a backdrop.
        console.warn(`Failed to load ${cacheKey} backdrop art:`, error);
      });
    return () => {
      isMounted = false;
    };
    // cacheKey uniquely determines `source`, so it alone drives the fetch (the
    // source object is rebuilt each render and would otherwise re-fire the effect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return { image, tint };
}

/**
 * Backdrop for a single-color stats page (W/U/B/R/G).
 * @returns `{ image, tint }` — the iconic basic-land art and overlay accent.
 */
export function useColorBackdrop(color: string | undefined): {
  image: string;
  tint: string;
} {
  const entry = color ? MONO_BACKDROPS[color] : undefined;
  return useLandBackdrop(entry ? color : undefined, entry, entry?.tint || "");
}

/**
 * Backdrop for a color-combination stats page (2- through 5-color). The overlay
 * tint is blended from the combo's mana colors.
 * @param comboKey - canonical WUBRG color key (e.g. "UBR" for Grixis).
 */
export function useComboBackdrop(comboKey: string | undefined): {
  image: string;
  tint: string;
} {
  const source = comboKey ? COMBO_LANDS[comboKey] : undefined;
  const cacheKey = source ? `combo_${comboKey}` : undefined;
  return useLandBackdrop(cacheKey, source, comboKey ? blendTint(comboKey) : "");
}
