/**
 * Centralized TypeScript type definitions for the frontend
 * This file serves as the single source of truth for all types
 */

// ============================================================================
// GAME & PLAYER DATA TYPES
// ============================================================================

export interface Player {
  id: string;
  name: string;
}

export interface GamePlayer {
  playerId: string;
  placement: number;
  commander: string | string[];
  commanderArt?: CommanderArtPreference;
}

export interface Game {
  id: string;
  dateCreated: string;
  notes: string;
  players: GamePlayer[];
  /** Set only when aggregating across sessions (see fetchAllGames). */
  sessionId?: string;
}

export interface SessionMetadata {
  name: string;
  description?: string;
  players?: string[];
  createdAt: string;
}

// ============================================================================
// PLAYER STATISTICS & DISPLAY TYPES
// ============================================================================

export interface PlayerScore {
  id: string;
  name: string;
  score: number;
  placement: number;
  gameCount: number;
  average: number;
  weightedAverage: number;
}

export interface PlayerRowDisplay {
  name: string;
  score: number;
  average: number;
  gamesPlayed: number;
  weightedAverage?: number;
  mostCommonPlacement?: number;
  estimatedMinutesPlayed?: number;
}

// ============================================================================
// COMMANDER & ART TYPES
// ============================================================================

export interface CommanderArtPreference {
  commanderName: string;
  artVariantId: string;
  imageUrl: string;
}

export interface PlayerCommanderArt {
  commanderName: string;
  variantId: string;
  artUrl: string;
  fullImageUrl: string;
  timestamp: number | string;
}

export interface CardVariant {
  id: string;
  name: string;
  art: string;
  full: string;
  set: string;
  setName: string;
}

export interface CardImageCache {
  art: string;
  full: string;
}

// ============================================================================
// COLOR/META STATISTICS TYPES
// ============================================================================

export interface CommanderColorStats {
  color: string; // Single letter: W, U, B, R, G
  commanderName: string;
  plays: number; // game appearances (one per player-game)
  pilots: number; // distinct players who ran it = distinct decks of this commander
  wins: number;
  winRate: number;
}

export interface ColorStatsData {
  color: string;
  /** Game appearances (player-games). NOT distinct decks — see totalDecks. */
  totalPlays: number;
  /** Distinct (player + commander) decks in this color. */
  totalDecks: number;
  totalWins: number;
  winRate: number;
  commanders: CommanderColorStats[];
}

/**
 * Per-commander stats within a color combination (or color-count tier).
 * A commander aggregates every player who ran it; `pilots` is how many distinct
 * players did, i.e. how many distinct decks of this commander exist.
 */
export interface ComboCommanderStats {
  commanderName: string; // display name — "A // B" for partner decks
  plays: number; // game appearances (one per player-game)
  pilots: number; // distinct players who ran it = distinct decks of this commander
  wins: number;
  winRate: number;
}

export interface ComboStatsData {
  /** Combination key (WUBRG-ordered, e.g. "RWB") for a named combo, else "". */
  comboKey: string;
  /** Display heading, e.g. "Mardu" or "3-color". */
  label: string;
  /** Game appearances (player-games). NOT distinct decks — see totalDecks. */
  totalPlays: number;
  /** Distinct (player + commander) decks in this combination. */
  totalDecks: number;
  totalWins: number;
  winRate: number;
  commanders: ComboCommanderStats[];
}

/** One pilot's record with a single commander/deck. */
export interface CommanderPilotStats {
  playerName: string;
  plays: number;
  wins: number;
  winRate: number;
}

/** A single game in which the commander appeared, with that pilot's result. */
export interface CommanderGameAppearance {
  gameId: string;
  dateCreated: string;
  playerName: string;
  placement: number;
  playerCount: number;
}

/** Aggregated stats for one commander/deck across a session. */
export interface CommanderStatsData {
  /** Canonical deck name — "A // B" (sorted) for partner decks. */
  deckName: string;
  /** Individual commander names, for art display. */
  commanders: string[];
  totalPlays: number;
  totalWins: number;
  winRate: number;
  pilots: CommanderPilotStats[];
  appearances: CommanderGameAppearance[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface DeltaResult<T> {
  hasChanges: boolean;
  updated: T[];
  added: T[];
  removed: T[];
  unchanged: T[];
}
