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

      if (!playerDoc.exists()) {
        return {};
      }

      return playerDoc.data()?.commanderArt || {};
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
    
    await setDoc(
      playerRef,
      {
        commanderArt: {
          [commanderName]: artData,
        },
      },
      { merge: true }
    );

    // Stale-read guard: the memoized map no longer reflects Firestore.
    invalidatePlayerArtPreferences(playerId);

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
  } catch (error) {
    console.error("Failed to clear all player art preferences:", error);
    throw error;
  }
}

// Re-export types for backwards compatibility
export type { PlayerCommanderArt };

