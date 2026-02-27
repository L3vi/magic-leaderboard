/**
 * Shared type definitions for backend
 * Consolidated to reduce duplication across multiple files
 */

export interface Player {
  id: string;
  name: string;
}

// ============================================================================
// LEGACY COMMANDER TYPES (kept for data integrity)
// ============================================================================

export interface GamePlayer {
  playerId: string;
  placement: number;
  commander: string | string[];
}

export interface Game {
  id: string;
  dateCreated: string;
  notes: string;
  players: GamePlayer[];
}

export interface Session {
  name: string;
  createdAt: string;
  description: string;
  players?: string[];
  games: Game[];
}

export interface FirebaseData {
  backupDate: string;
  players: Player[];
  sessions: {
    [sessionId: string]: Session;
  };
}

// ============================================================================
// CUBE DRAFT EVENT TYPES
// ============================================================================

export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G';

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
  deckStrategy?: string;
  wins: number;
}

export interface Match {
  id: string;
  draftId: string;
  date: string;
  players: [MatchPlayer, MatchPlayer];
  notes?: string;
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
