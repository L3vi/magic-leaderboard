import { useState, useEffect, useRef } from 'react';
import {
  fetchPlayers,
  fetchGames,
  calculatePlayerScores,
  addGame as addGameToAPI,
  Player,
  Game,
  PlayerScore,
  invalidateCache,
  getGamesLastRefreshTime,
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
 * Hook to fetch games for the current session with fallback to local data
 * Caches results for 2.5 minutes and auto-refreshes every 2.5 minutes
 * Provides manual refresh capability via refresh() function
 */
export const useGames = (sessionId: string = '2025-December') => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const hasInitialized = useRef(false);
  const autoRefreshTimer = useRef<NodeJS.Timeout | null>(null);

  // Initial load and auto-refresh setup
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadGames = async () => {
      try {
        setLoading(true);
        const data = await fetchGames(sessionId);
        setGames(data);
        setLastRefreshed(getGamesLastRefreshTime(sessionId));
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load games';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadGames();

    // Set up auto-refresh every 2.5 minutes
    autoRefreshTimer.current = setInterval(async () => {
      try {
        const data = await fetchGames(sessionId, true); // Force refresh
        setGames(data);
        setLastRefreshed(getGamesLastRefreshTime(sessionId));
      } catch (err) {
        console.error('Auto-refresh failed:', err);
      }
    }, 2.5 * 60 * 1000);

    return () => {
      if (autoRefreshTimer.current) clearInterval(autoRefreshTimer.current);
    };
  }, [sessionId]);

  const refresh = async () => {
    try {
      setRefreshing(true);
      const data = await fetchGames(sessionId, true); // Force refresh
      setGames(data);
      setLastRefreshed(getGamesLastRefreshTime(sessionId));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh games';
      setError(message);
    } finally {
      setRefreshing(false);
    }
  };

  return { games, loading, error, refreshing, lastRefreshed, refresh };
};

/**
 * Hook to calculate player scores from games
 * Automatically recalculates when games change
 */
export const usePlayerScores = (sessionId: string = '2025-December') => {
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { players } = usePlayers();
  const { games } = useGames(sessionId);

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
 * Invalidates games cache after successful creation
 */
export const useAddGame = (sessionId: string = '2025-December') => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addGame = async (gameData: any) => {
    try {
      setLoading(true);
      const result = await addGameToAPI(gameData, sessionId);
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
