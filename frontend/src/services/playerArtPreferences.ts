import { CardVariant } from "../hooks/useCommanderArt";

export interface PlayerCommanderArt {
  commanderName: string;
  variantId: string;
  artUrl: string;
  fullImageUrl: string;
  timestamp: number;
}

// Store preferences in localStorage with player ID as key
const STORAGE_KEY_PREFIX = "player-commander-art-";

/**
 * Get all saved art preferences for a player
 */
export function getPlayerArtPreferences(
  playerId: string
): Record<string, PlayerCommanderArt> {
  try {
    const key = STORAGE_KEY_PREFIX + playerId;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Failed to load player art preferences:", error);
    return {};
  }
}

/**
 * Get the saved art preference for a specific commander
 */
export function getCommanderArtPreference(
  playerId: string,
  commanderName: string
): PlayerCommanderArt | undefined {
  const preferences = getPlayerArtPreferences(playerId);
  return preferences[commanderName];
}

/**
 * Save art preference for a player's commander
 */
export function saveCommanderArtPreference(
  playerId: string,
  commanderName: string,
  variant: CardVariant
): void {
  try {
    const key = STORAGE_KEY_PREFIX + playerId;
    const preferences = getPlayerArtPreferences(playerId);

    preferences[commanderName] = {
      commanderName,
      variantId: variant.id,
      artUrl: variant.art,
      fullImageUrl: variant.full,
      timestamp: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(preferences));
    console.log(
      `Saved art preference for ${playerId}'s ${commanderName}: ${variant.set}`
    );
  } catch (error) {
    console.error("Failed to save player art preference:", error);
    throw error;
  }
}

/**
 * Clear a player's art preference for a commander
 */
export function clearCommanderArtPreference(
  playerId: string,
  commanderName: string
): void {
  try {
    const key = STORAGE_KEY_PREFIX + playerId;
    const preferences = getPlayerArtPreferences(playerId);
    delete preferences[commanderName];
    localStorage.setItem(key, JSON.stringify(preferences));
  } catch (error) {
    console.error("Failed to clear player art preference:", error);
  }
}

/**
 * Clear all art preferences for a player
 */
export function clearAllPlayerArtPreferences(playerId: string): void {
  try {
    const key = STORAGE_KEY_PREFIX + playerId;
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear all player art preferences:", error);
  }
}

/**
 * Export all preferences for a player (useful for backup/sync)
 */
export function exportPlayerArtPreferences(
  playerId: string
): Record<string, PlayerCommanderArt> {
  return getPlayerArtPreferences(playerId);
}

/**
 * Import preferences for a player (useful for restore/sync)
 */
export function importPlayerArtPreferences(
  playerId: string,
  preferences: Record<string, PlayerCommanderArt>
): void {
  try {
    const key = STORAGE_KEY_PREFIX + playerId;
    localStorage.setItem(key, JSON.stringify(preferences));
  } catch (error) {
    console.error("Failed to import player art preferences:", error);
    throw error;
  }
}
