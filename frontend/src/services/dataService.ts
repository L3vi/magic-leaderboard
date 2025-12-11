import playersData from '../data/players.json';
import gamesData from '../data/games.json';

const API_BASE = 'http://localhost:3001';

// Cache configuration per data type
const CACHE_CONFIG = {
  players: 1 * 60 * 60 * 1000, // 1 hour
  games: 2.5 * 60 * 1000,      // 2.5 minutes
};

// Cache storage
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

export interface PlayerScore {
  id: string;
  name: string;
  score: number;
  placement: number;
  gameCount: number;
  average: number;
}

/**
 * Check if cached data is still valid
 */
function getCachedData<T>(key: string, ttlMs: number): T | null {
  const cached = cache[key];
  if (!cached) return null;

  const isExpired = Date.now() - cached.timestamp > ttlMs;
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
 * Get last refresh time for a data type
 */
function getLastRefreshTime(key: string): Date | null {
  const cached = cache[key];
  return cached ? new Date(cached.timestamp) : null;
}

/**
 * Retry logic with exponential backoff
 */
async function fetchWithRetry<T>(
  url: string,
  maxAttempts: number = 5,
  baseDelayMs: number = 500
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}

/**
 * Fetch all players with caching
 */
export async function fetchPlayers(forceRefresh: boolean = false): Promise<Player[]> {
  const cacheKey = 'players';
  const ttl = CACHE_CONFIG.players;

  // Return cached data if available and not force refreshing
  if (!forceRefresh) {
    const cached = getCachedData<Player[]>(cacheKey, ttl);
    if (cached) return cached;
  }

  try {
    const data = await fetchWithRetry<Player[]>(`${API_BASE}/api/players`);
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching players, using local fallback:', error);
    return playersData as Player[];
  }
}

/**
 * Fetch games for a session with caching
 */
export async function fetchGames(
  session: string = '2025-December',
  forceRefresh: boolean = false
): Promise<Game[]> {
  const cacheKey = `games:${session}`;
  const ttl = CACHE_CONFIG.games;

  // Return cached data if available and not force refreshing
  if (!forceRefresh) {
    const cached = getCachedData<Game[]>(cacheKey, ttl);
    if (cached) return cached;
  }

  try {
    const data = await fetchWithRetry<Game[]>(
      `${API_BASE}/api/games?session=${encodeURIComponent(session)}`
    );
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching games, using local fallback:', error);
    return gamesData as Game[];
  }
}

/**
 * Calculate player scores from games
 */
export function calculatePlayerScores(players: Player[], games: Game[]): PlayerScore[] {
  const scoreMap: Record<string, { score: number; gameCount: number; placements: number[] }> = {};

  // Initialize score map
  players.forEach(player => {
    scoreMap[player.id] = { score: 0, gameCount: 0, placements: [] };
  });

  // Calculate scores from games
  games.forEach(game => {
    game.players.forEach(playerInGame => {
      if (scoreMap[playerInGame.playerId]) {
        // Placement scoring: 1st = 3 pts, 2nd = 2 pts, 3rd+ = 1 pt
        const points =
          playerInGame.placement === 1 ? 3 :
          playerInGame.placement === 2 ? 2 : 1;

        scoreMap[playerInGame.playerId].score += points;
        scoreMap[playerInGame.playerId].gameCount += 1;
        scoreMap[playerInGame.playerId].placements.push(playerInGame.placement);
      }
    });
  });

  // Convert to PlayerScore array with placement ranking
  const scores = players
    .map(player => ({
      id: player.id,
      name: player.name,
      score: scoreMap[player.id].score,
      gameCount: scoreMap[player.id].gameCount,
      placements: scoreMap[player.id].placements,
    }))
    .sort((a, b) => b.score - a.score);

  // Add placement ranking and calculate average placement
  return scores.map((score, index) => ({
    id: score.id,
    name: score.name,
    score: score.score,
    placement: index + 1,
    gameCount: score.gameCount,
    average: score.gameCount > 0 
      ? score.placements.reduce((a, b) => a + b, 0) / score.gameCount 
      : 0,
  }));
}

/**
 * Manually refresh games cache
 */
export async function refreshGames(session: string = '2025-December'): Promise<Game[]> {
  return fetchGames(session, true);
}

/**
 * Invalidate cache for a specific data type
 */
export function invalidateCache(type: 'players' | 'games', session?: string): void {
  if (type === 'players') {
    delete cache['players'];
  } else if (type === 'games' && session) {
    delete cache[`games:${session}`];
  }
}

/**
 * Get last refresh time for games
 */
export function getGamesLastRefreshTime(session: string = '2025-December'): Date | null {
  return getLastRefreshTime(`games:${session}`);
}

/**
 * Add a new game
 */
export async function addGame(
  gameData: any,
  session: string = '2025-December'
): Promise<Game> {
  try {
    const response = await fetch(`${API_BASE}/api/games?session=${encodeURIComponent(session)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const newGame = await response.json();

    // Invalidate games cache so next fetch gets fresh data
    invalidateCache('games', session);

    return newGame;
  } catch (error) {
    console.error('Error adding game:', error);
    throw error;
  }
}

/**
 * Update an existing game
 */
export async function updateGame(
  gameId: string,
  gameData: any,
  session: string = '2025-December'
): Promise<Game> {
  try {
    const response = await fetch(`${API_BASE}/api/games/${gameId}?session=${encodeURIComponent(session)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const updatedGame = await response.json();

    // Invalidate games cache so next fetch gets fresh data
    invalidateCache('games', session);

    return updatedGame;
  } catch (error) {
    console.error('Error updating game:', error);
    throw error;
  }
}
