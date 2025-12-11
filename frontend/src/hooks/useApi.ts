import { useState, useEffect, useRef } from 'react';
import {
  fetchPlayers,
  fetchGames,
  calculatePlayerScores,
  addGame as addGameToAPI,
  updateGame as updateGameToAPI,
  refetchGames,
  Player,
  Game,
  PlayerScore,
} from '../services/dataService';

/**
 * Hook to fetch players from the API with fallback to local data
 * Caches results for 1 hour
 */
export const usePlayers = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadPlayers = async () => {
      try {
        setLoading(true);
        const data = await fetchPlayers();
        setPlayers(data);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load players';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, []);

  return { players, loading, error };
};

/**
 * Hook to fetch games for the current session
 * Provides manual refresh function - call it when you need fresh data
 */
export const useGames = (sessionId: string = '2025-December') => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  // Initial load
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadGames = async () => {
      try {
        setLoading(true);
        const data = await fetchGames(sessionId);
        setGames(data);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load games';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, [sessionId]);

  // Manual refresh function - call this to get fresh data
  const refresh = async () => {
    try {
      setLoading(true);
      const freshGames = await refetchGames(sessionId);
      setGames(freshGames);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh games';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return { games, loading, error, refresh };
};

/**
 * Hook to calculate player scores from games
 * Recalculates whenever games change
 */
export const usePlayerScores = (sessionId: string = '2025-December') => {
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { players } = usePlayers();
  const { games } = useGames(sessionId);

  // Calculate scores when games or players change
  useEffect(() => {
    if (players.length === 0 || games.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const playerScores = calculatePlayerScores(players, games);
      setScores(playerScores);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate scores';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [players, games]);

  return { scores, loading, error };
};

/**
 * Hook to add a new game
 * Optionally refreshes games after successful creation
 */
export const useAddGame = (sessionId: string = '2025-December') => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useGames(sessionId);

  const addGame = async (gameData: any) => {
    try {
      setLoading(true);
      const result = await addGameToAPI(gameData, sessionId);
      // Refresh games to get latest data
      await refresh();
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
 * Hook to update an existing game
 * Optionally refreshes games after successful update
 */
export const useUpdateGame = (sessionId: string = '2025-December') => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useGames(sessionId);

  const updateGame = async (gameId: string, gameData: any) => {
    try {
      setLoading(true);
      const result = await updateGameToAPI(gameId, gameData, sessionId);
      // Refresh games to get latest data
      await refresh();
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
