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
  plays: number;
  wins: number;
  winRate: number;
}

export interface ColorStatsData {
  color: string;
  totalPlays: number;
  totalWins: number;
  winRate: number;
  commanders: CommanderColorStats[];
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
