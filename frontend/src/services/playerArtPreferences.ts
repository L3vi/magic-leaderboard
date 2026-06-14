import type { CardVariant, PlayerCommanderArt } from "../types";
import { db, authReady } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// In-memory cache of each player's full art-preferences map, keyed by playerId.
// The whole map lives on a single player doc, so one getDoc serves every
// commander on the page instead of one Firestore round-trip per thumbnail
// (a 4-player game fires 4 thumbnails × 4 hooks = 16 reads of the same docs
// otherwise). Stored as the in-flight promise so concurrent callers — every
// thumbnail mounting at once — share a single read. Invalidated on any write.
const preferencesCache = new Map<string, Promise<Record<string, PlayerCommanderArt>>>();

// Synchronously-readable copy of each player's resolved preference map, mirrored
// to localStorage. This lets a thumbnail know the player's chosen art on the
// very first render — including right after a reload — so it can paint the
// correct art immediately instead of flashing the default and then swapping, or
// stalling on a Firestore read. Firestore still refreshes it in the background.
const PREFS_STORAGE_KEY = 'magicLeaderboard_artPrefs_v1';
const resolvedPreferences = new Map<string, Record<string, PlayerCommanderArt>>();

(function loadResolvedFromStorage() {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, Record<string, PlayerCommanderArt>>;
    for (const [pid, map] of Object.entries(obj)) resolvedPreferences.set(pid, map);
  } catch {
    // Ignore a corrupt cache — Firestore will repopulate it.
  }
})();

function persistResolvedPreferences(): void {
  try {
    const obj: Record<string, Record<string, PlayerCommanderArt>> = {};
    for (const [pid, map] of resolvedPreferences) obj[pid] = map;
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Storage full / unavailable — non-fatal, we just lose the warm cache.
  }
}

function setResolvedPreferences(playerId: string, map: Record<string, PlayerCommanderArt>): void {
  resolvedPreferences.set(playerId, map);
  persistResolvedPreferences();
}

/**
 * Synchronously read a player's saved art preference for a commander, if we've
 * already loaded that player's map (this session or from the persisted cache).
 * `known: false` means "not loaded yet — caller should fall back and resolve
 * asynchronously"; `known: true` with `pref: undefined` means "loaded, and this
 * commander has no custom art".
 */
export function peekCommanderArtPreference(
  playerId: string,
  commanderName: string
): { known: boolean; pref?: PlayerCommanderArt } {
  const map = resolvedPreferences.get(playerId);
  if (!map) return { known: false };
  return { known: true, pref: map[commanderName] };
}

/** Drop a player's cached preferences so the next read re-fetches from Firestore. */
export function invalidatePlayerArtPreferences(playerId: string): void {
  preferencesCache.delete(playerId);
}

/**
 * Get all saved art preferences for a player from Firebase.
 * Memoized per playerId (see preferencesCache) so the player page's many
 * thumbnails don't each trigger their own getDoc.
 */
export async function getPlayerArtPreferences(
  playerId: string
): Promise<Record<string, PlayerCommanderArt>> {
  const cached = preferencesCache.get(playerId);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const playerRef = doc(db, "players", playerId);
      const playerDoc = await getDoc(playerRef);

      const map = playerDoc.exists() ? (playerDoc.data()?.commanderArt || {}) : {};
      // Mirror into the synchronous + persisted cache for instant first paints.
      setResolvedPreferences(playerId, map);
      return map;
    } catch (error) {
      // Don't cache transient failures — let the next call retry.
      preferencesCache.delete(playerId);
      console.error("Failed to load player art preferences:", error);
      return {};
    }
  })();

  preferencesCache.set(playerId, promise);
  return promise;
}

/**
 * Get the saved art preference for a specific commander
 */
export async function getCommanderArtPreference(
  playerId: string,
  commanderName: string
): Promise<PlayerCommanderArt | undefined> {
  const preferences = await getPlayerArtPreferences(playerId);
  return preferences[commanderName];
}

/**
 * Save art preference for a player's commander to Firebase
 */
export async function saveCommanderArtPreference(
  playerId: string,
  commanderName: string,
  variant: CardVariant
): Promise<void> {
  try {
    await authReady;
    const playerRef = doc(db, "players", playerId);

    const artData = {
      commanderName,
      variantId: variant.id,
      artUrl: variant.art,
      fullImageUrl: variant.full,
      timestamp: Date.now(),
    };

    console.log(`📝 Saving art preference:`, { playerId, commanderName, variant: variant.set });

    // The security rule requires every players/* doc to carry a `name`. An
    // existing doc already has one (merge preserves it), but a player who isn't
    // persisted yet — e.g. a brand-new player added in the New Game form before
    // the game is saved — has no doc, so a bare { commanderArt } merge would
    // create a nameless doc and be rejected. In that case seed `name` too. The
    // New Game form uses the player's name as their id, so playerId is the name.
    const payload: Record<string, any> = {
      commanderArt: {
        [commanderName]: artData,
      },
    };
    const existing = await getDoc(playerRef);
    if (!existing.exists()) {
      payload.name = playerId;
    }

    await setDoc(playerRef, payload, { merge: true });

    // Stale-read guard: the memoized promise no longer reflects Firestore. Keep
    // the synchronous cache current with the new art so it paints immediately.
    invalidatePlayerArtPreferences(playerId);
    setResolvedPreferences(playerId, { ...(resolvedPreferences.get(playerId) || {}), [commanderName]: artData });

    console.log(
      `✅ Saved art preference for ${playerId}'s ${commanderName}: ${variant.set}`
    );
  } catch (error) {
    console.error("❌ Failed to save player art preference:", error);
    throw error;
  }
}

/**
 * Clear a player's art preference for a commander
 */
export async function clearCommanderArtPreference(
  playerId: string,
  commanderName: string
): Promise<void> {
  try {
    await authReady;
    const playerRef = doc(db, "players", playerId);
    const preferences = await getPlayerArtPreferences(playerId);
    
    delete preferences[commanderName];

    await setDoc(
      playerRef,
      {
        commanderArt: preferences,
      },
      { merge: true }
    );

    invalidatePlayerArtPreferences(playerId);
    setResolvedPreferences(playerId, { ...preferences });
  } catch (error) {
    console.error("Failed to clear player art preference:", error);
    throw error;
  }
}

/**
 * Clear all art preferences for a player
 */
export async function clearAllPlayerArtPreferences(playerId: string): Promise<void> {
  try {
    await authReady;
    const playerRef = doc(db, "players", playerId);
    
    await setDoc(
      playerRef,
      {
        commanderArt: {},
      },
      { merge: true }
    );

    invalidatePlayerArtPreferences(playerId);
    setResolvedPreferences(playerId, {});
  } catch (error) {
    console.error("Failed to clear all player art preferences:", error);
    throw error;
  }
}

// Re-export types for backwards compatibility
export type { PlayerCommanderArt };

