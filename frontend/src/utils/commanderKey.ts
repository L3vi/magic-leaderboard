/**
 * Canonical identity for a "deck" — a single commander or a partner/companion
 * pair. Partner pairs are sorted and joined with " // " so the same two
 * commanders always resolve to one key regardless of input order.
 *
 * This MUST match the deckName built in ComboStatsPage so that a commander
 * clicked from any view (game detail, player detail, color/combo drill-down)
 * lands on the same CommanderStatsPage.
 */
export function commanderDeckName(commander: string | string[]): string {
  const list = (Array.isArray(commander) ? commander : [commander]).filter(
    (c) => c && c.trim() !== "" && c !== "Unknown"
  );
  if (list.length === 0) return "";
  return list.length >= 2 ? [...list].sort().join(" // ") : list[0];
}

/** Split a canonical deck name back into its individual commander names. */
export function splitDeckName(deckName: string): string[] {
  return deckName
    .split(" // ")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * URL-safe encode/decode for the route param. encodeURIComponent turns the
 * "/" in partner names into "%2F", so the deck name stays a single path
 * segment (and spaces, commas, apostrophes, accents all survive intact).
 */
export function encodeCommanderKey(deckName: string): string {
  return encodeURIComponent(deckName);
}

export function decodeCommanderKey(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}
