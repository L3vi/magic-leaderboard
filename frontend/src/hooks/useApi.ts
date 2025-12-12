import { useSession } from '../context/SessionContext';
import {
  calculatePlayerScores,
  addGame as addGameToAPI,
  updateGame as updateGameToAPI,
  Player,
  Game,
  PlayerScore,
} from '../services/dataService';
import { useEffect, useState } from 'react';

/**
 * Hook to access players from the shared SessionContext
 * All components using this get the same player data (no duplicate fetches)
 */
export const usePlayers = () => {
  const { players, loading, error } = useSession();
  return { players, loading, error };
};

/**
 * Hook to access games from the shared SessionContext
 * All components using this get the same game data (no duplicate fetches)
 * Use the refreshGamesOnly() method from useSession() to refresh after mutations
 */
export const useGames = (sessionId?: string) => {
  const { games, loading, error } = useSession();
  // Note: sessionId param is ignored since we use context's activeSession
  return { games, loading, error };
};

/**
 * Hook to calculate player scores from games
 * Recalculates whenever games or players change (automatically uses context data)
 */
export const usePlayerScores = () => {
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const { players, games } = useSession();

  useEffect(() => {
    if (players.length === 0 || games.length === 0) {
      setScores([]);
      return;
    }

    try {
      const playerScores = calculatePlayerScores(players, games);
      setScores(playerScores);
    } catch (err) {
      console.error('Failed to calculate scores:', err);
      setScores([]);
    }
  }, [players, games]);

  return scores;
};

/**
 * Hook to add a new game and automatically refresh
 * Calls refreshGamesOnly() after successful creation
 */
export const useAddGame = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeSession, refreshGamesOnly } = useSession();

  const addGame = async (gameData: any) => {
    try {
      setLoading(true);
      const result = await addGameToAPI(gameData, activeSession);
      // Refresh games to get latest data
      await refreshGamesOnly();
      setError(null);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add game';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { addGame, loading, error };
};

/**
 * Hook to update an existing game and automatically refresh
 * Calls refreshGamesOnly() after successful update
 */
export const useUpdateGame = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeSession, refreshGamesOnly } = useSession();

  const updateGame = async (gameId: string, gameData: any) => {
    try {
      setLoading(true);
      const result = await updateGameToAPI(gameId, gameData, activeSession);
      // Refresh games to get latest data
      await refreshGamesOnly();
      setError(null);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update game';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateGame, loading, error };
};
