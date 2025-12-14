/**
 * Shared type definitions for backend scripts
 * Consolidated to reduce duplication across multiple files
 */

export interface Player {
  id: string;
  name: string;
}

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
