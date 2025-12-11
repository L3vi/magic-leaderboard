import { useState, useEffect, useRef } from 'react';
import playersData from '../data/players.json';
import gamesData from '../data/games.json';

const API_BASE = 'http://localhost:3001';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Simple cache for API responses
const cache: Record<string, { data: any; timestamp: number }> = {};

export interface Player {
  id: string;
  name: string;
}

export interface GamePlayer {
  playerId: string;
  placement: number;
  commander: string;
}

export interface Game {
  id: string;
  dateCreated: string;
  notes: string;
  players: GamePlayer[];
}

/**
 * Check if cached data is still valid
 */
function getCachedData<T>(key: string): T | null {
  const cached = cache[key];
  if (!cached) return null;
  
  const isExpired = Date.now() - cached.timestamp > CACHE_DURATION_MS;
  if (isExpired) {
    delete cache[key];
    return null;
  }
  
  return cached.data as T;
}

/**
 * Store data in cache
 */
function setCachedData<T>(key: string, data: T): void {
  cache[key] = { data, timestamp: Date.now() };
}

/**
 * Retry fetch with exponential backoff
 * Tries up to maxAttempts times with increasing delays
 */
async function fetchWithRetry(
  url: string,
  maxAttempts: number = 5,
  initialDelayMs: number = 500
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(5000) 
      });
      
      if (response.ok) {
        return response; // Success on first try or retry
      }
      
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Don't retry on timeout if it's the last attempt
      if (attempt < maxAttempts && lastError.name !== 'AbortError') {
        // Wait before retrying, with exponential backoff
        const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
    }
  }
  
  // All retries exhausted
  throw lastError || new Error('Failed to fetch after retries');
}

/**
 * Hook to fetch players from the API with fallback to local data
 * Caches results for 5 minutes
 */
export const usePlayers = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const hasAttemptedFetch = useRef(false);

  useEffect(() => {
    // Check cache first
    const cachedPlayers = getCachedData<Player[]>('players');
    if (cachedPlayers) {
      setPlayers(cachedPlayers);
      setLoading(false);
      return;
    }

    // Don't refetch if already attempted
    if (hasAttemptedFetch.current) {
      setLoading(false);
      return;
    }

    const fetchPlayers = async () => {
      hasAttemptedFetch.current = true;
      try {
        setLoading(true);
        const response = await fetchWithRetry(`${API_BASE}/api/players`);
        const data = await response.json();
        setPlayers(data);
        setCachedData('players', data);
        setError(null);
        setIsOffline(false);
      } catch (err) {
        // Fall back to local data
        console.warn('Could not fetch from API after retries, using local data:', err);
        setPlayers(playersData);
        setCachedData('players', playersData);
        setIsOffline(true);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  return { players, loading, error, isOffline };
};

/**
 * Hook to fetch games for a specific session with fallback to local data
 * Caches results for 5 minutes
 */
export const useGames = (sessionId: string) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const hasAttemptedFetch = useRef(false);

  useEffect(() => {
    // Check cache first
    const cacheKey = `games-${sessionId}`;
    const cachedGames = getCachedData<Game[]>(cacheKey);
    if (cachedGames) {
      setGames(cachedGames);
      setLoading(false);
      return;
    }

    // Don't refetch if already attempted
    if (hasAttemptedFetch.current) {
      setLoading(false);
      return;
    }

    const fetchGames = async () => {
      hasAttemptedFetch.current = true;
      try {
        setLoading(true);
        const response = await fetchWithRetry(`${API_BASE}/api/games?session=${sessionId}`);
        const data = await response.json();
        setGames(data);
        setCachedData(cacheKey, data);
        setError(null);
        setIsOffline(false);
      } catch (err) {
        // Fall back to local data
        console.warn('Could not fetch from API after retries, using local data:', err);
        // For now, only support December 2025
        setGames(gamesData);
        setCachedData(cacheKey, gamesData);
        setIsOffline(true);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [sessionId]);

  return { games, loading, error };
};

/**
 * Hook to add a new game
 */
export const useAddGame = (sessionId: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addGame = async (gameData: Omit<Game, 'id'>) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/games?session=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create game');
      }
      
      const result = await response.json();
      setError(null);
      return result.game;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { addGame, loading, error };
};
