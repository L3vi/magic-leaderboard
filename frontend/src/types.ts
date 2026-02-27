/**
 * Centralized TypeScript type definitions for the frontend
 * This file serves as the single source of truth for all types
 */

// ============================================================================
// CORE PLAYER TYPE
// ============================================================================

export interface Player {
  id: string;
  name: string;
}

// ============================================================================
// CUBE DRAFT EVENT TYPES
// ============================================================================

export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G';

export const MANA_COLORS: ManaColor[] = ['W', 'U', 'B', 'R', 'G'];

export const MANA_COLOR_NAMES: Record<ManaColor, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};

export interface Cube {
  id: string;
  name: string;
  description: string;
}

export interface Draft {
  id: string;
  cubeId: string;
  date: string;
  players: string[];
  status: 'in-progress' | 'complete';
}

export interface MatchPlayer {
  playerId: string;
  deckColors?: ManaColor[];
  deckStrategy?: string; // e.g. "B/W Flyers", "Red Aggro"
  wins: number; // 0, 1, or 2
}

export interface Match {
  id: string;
  draftId: string;
  date: string;
  players: [MatchPlayer, MatchPlayer]; // always exactly 2
  notes?: string; // notable plays, memorable moments, etc.
}

export interface CubeEvent {
  name: string;
  date: string;
  description: string;
  players: string[];
  cubes: Cube[];
  drafts: Draft[];
  matches: Match[];
}

// ============================================================================
// STANDINGS & STATISTICS TYPES
// ============================================================================

export interface DraftStanding {
  playerId: string;
  playerName: string;
  matchPoints: number;
  matchRecord: { wins: number; losses: number; draws: number };
  gameRecord: { wins: number; losses: number };
  matchWinPct: number;
  gameWinPct: number;
  omwPct: number;
  ogwPct: number;
}

export interface PlayerOverallStats {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  gameWins: number;
  gameLosses: number;
  matchWinPct: number;
  gameWinPct: number;
  draftsPlayed: number;
  colorBreakdown: Record<ManaColor, number>;
  favoriteColor: ManaColor | null;
  cubesPlayed: string[];
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
