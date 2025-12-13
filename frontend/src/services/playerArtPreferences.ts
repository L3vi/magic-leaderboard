import { CardVariant } from "../hooks/useCommanderArt";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface PlayerCommanderArt {
  commanderName: string;
  variantId: string;
  artUrl: string;
  fullImageUrl: string;
  timestamp: number | string;
}

/**
 * Get all saved art preferences for a player from Firebase
 */
export async function getPlayerArtPreferences(
  playerId: string
): Promise<Record<string, PlayerCommanderArt>> {
  try {
    const playerRef = doc(db, "players", playerId);
    const playerDoc = await getDoc(playerRef);

    if (!playerDoc.exists()) {
      return {};
    }

    const preferences = playerDoc.data()?.commanderArt || {};
    return preferences;
  } catch (error) {
    console.error("Failed to load player art preferences:", error);
    return {};
  }
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
    const playerRef = doc(db, "players", playerId);
    
    await setDoc(
      playerRef,
      {
        commanderArt: {},
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Failed to clear all player art preferences:", error);
    throw error;
  }
}
