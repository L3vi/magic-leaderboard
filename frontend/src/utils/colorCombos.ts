/**
 * Color identity & combination helpers.
 *
 * Shared between the stats overview (GameStats) and the drill-down pages
 * (ColorStatsPage / ComboStatsPage) so combination names, tier labels, and the
 * WUBRG-canonical keying all stay in one place.
 */

export const COLOR_MAP: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

// Pip colors for the small color-identity dots next to a combination name.
export const COLOR_HEX: Record<string, string> = {
  W: "#f7f3d8",
  U: "#0ea5e9",
  B: "#6b7280",
  R: "#ef4444",
  G: "#22c55e",
};

export const TIER_LABELS: Record<number, string> = {
  1: "Mono",
  2: "2-color",
  3: "3-color",
  4: "4-color",
  5: "5-color",
};

// A deck's color identity, normalized to canonical WUBRG order so it maps to a
// single combination key regardless of the order colors were encountered.
export const WUBRG = "WUBRG";
export const colorKey = (colors: string[]): string =>
  [...new Set(colors)].sort((a, b) => WUBRG.indexOf(a) - WUBRG.indexOf(b)).join("");

// Canonical Commander color-combination names. Built from WUBRG-ordered keys so
// e.g. Boros (R,W) and any "W,R" both resolve to the same "WR" → "Boros".
export const COMBO_NAMES: Record<string, string> = (() => {
  const defs: Record<string, string> = {
    // Guilds (2-color)
    WU: "Azorius", UB: "Dimir", BR: "Rakdos", RG: "Gruul", GW: "Selesnya",
    WB: "Orzhov", UR: "Izzet", BG: "Golgari", RW: "Boros", GU: "Simic",
    // Shards (allied 3-color)
    WUB: "Esper", UBR: "Grixis", BRG: "Jund", RGW: "Naya", GWU: "Bant",
    // Wedges (enemy 3-color)
    WBG: "Abzan", URW: "Jeskai", BGU: "Sultai", RWB: "Mardu", GUR: "Temur",
    // Nephilim (4-color, named by the missing color)
    WUBR: "Yore-Tiller", UBRG: "Glint-Eye", WBRG: "Dune-Brood", WURG: "Ink-Treader", WUBG: "Witch-Maw",
    // 5-color
    WUBRG: "Five-Color",
  };
  const out: Record<string, string> = {};
  for (const [colors, name] of Object.entries(defs)) out[colorKey(colors.split(""))] = name;
  return out;
})();

/**
 * Display label for a color-combination key. Mono colors get their full color
 * name (e.g. "R" → "Red"); multi-color keys get the canonical combination name
 * (e.g. "RWB" → "Mardu"), falling back to the raw key if unnamed.
 */
export const comboLabel = (key: string): string => {
  if (key.length === 1) return COLOR_MAP[key] || key;
  return COMBO_NAMES[key] || key;
};
