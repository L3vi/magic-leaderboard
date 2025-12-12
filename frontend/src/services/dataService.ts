import playersData from "../data/players.json";
import gamesData from "../data/games.json";
import { getCacheKey, getFromCache, setCache, clearCache } from "./queryCache";

// Get API base URL from environment or construct it from current origin
const getAPIBase = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3001';
  }
  // In production, API would be on same origin or use environment variable
  return process.env.VITE_API_BASE || window.location.origin;
};

const API_BASE = getAPIBase();

// Only try API calls if running on localhost
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

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

export interface PlayerScore {
  id: string;
  name: string;
  score: number;
  placement: number;
  gameCount: number;
  average: number;
}

/**
 * Simple fetch with basic error handling
 */
async function fetchAPI<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

/**
 * Fetch all players from API or fallback to local data
 * Caches results to avoid redundant fetches during navigation
 * Call refetchPlayers() to bypass cache and get fresh data
 */
export async function fetchPlayers(): Promise<Player[]> {
  const cacheKey = getCacheKey("players");
  const cached = getFromCache<Player[]>(cacheKey);

  if (cached) {
    console.log("Using cached players");
    return cached;
  }

  // Only try API on localhost
  if (isLocalhost) {
    try {
      const data = await fetchAPI<Player[]>(`${API_BASE}/api/players`);
      setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error("Error fetching players from API, using local fallback:", error);
    }
  }

  const fallback = playersData as Player[];
  setCache(cacheKey, fallback);
  return fallback;
}

/**
 * Fetch games for a session from API or fallback to local data
 * Caches results to avoid redundant fetches during navigation
 * Call refetchGames() to bypass cache and get fresh data
 */
export async function fetchGames(session: string = "2025-December"): Promise<Game[]> {
  const cacheKey = getCacheKey("games", session);
  const cached = getFromCache<Game[]>(cacheKey);

  if (cached) {
    console.log("Using cached games for session:", session);
    return cached;
  }

  // Only try API on localhost
  if (isLocalhost) {
    try {
      const data = await fetchAPI<Game[]>(
        `${API_BASE}/api/games?session=${encodeURIComponent(session)}`
      );
      setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error("Error fetching games from API, using local fallback:", error);
    }
  }

  const fallback = gamesData as Game[];
  setCache(cacheKey, fallback);
  return fallback;
}

/**
 * Calculate player scores from games
 */
export function calculatePlayerScores(
  players: Player[],
  games: Game[]
): PlayerScore[] {
  const scoreMap: Record<
    string,
    { score: number; gameCount: number; placements: number[] }
  > = {};

  // Initialize score map
  players.forEach((player) => {
    scoreMap[player.id] = { score: 0, gameCount: 0, placements: [] };
  });

  // Calculate scores from games
  games.forEach((game) => {
    game.players.forEach((playerInGame) => {
      if (scoreMap[playerInGame.playerId]) {
        // Placement scoring: 1st = 3 pts, 2nd = 2 pts, 3rd+ = 1 pt
        const points =
          playerInGame.placement === 1
            ? 3
            : playerInGame.placement === 2
            ? 2
            : 1;

        scoreMap[playerInGame.playerId].score += points;
        scoreMap[playerInGame.playerId].gameCount += 1;
        scoreMap[playerInGame.playerId].placements.push(playerInGame.placement);
      }
    });
  });

  // Convert to PlayerScore array with placement ranking
  const scores = players
    .map((player) => ({
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
    average:
      score.gameCount > 0
        ? score.placements.reduce((a, b) => a + b, 0) / score.gameCount
        : 0,
  }));
}

/**
 * Manually refresh all player data - bypasses cache and gets fresh data from API
 * Call this after creating/updating players or when user explicitly requests refresh
 */
export async function refetchPlayers(): Promise<Player[]> {
  const cacheKey = getCacheKey("players");
  clearCache(cacheKey);
  return fetchPlayers();
}

/**
 * Manually refresh game data - bypasses cache and gets fresh data from API
 * Call this after creating/updating a game or when user explicitly requests refresh
 */
export async function refetchGames(session: string = "2025-December"): Promise<Game[]> {
  const cacheKey = getCacheKey("games", session);
  clearCache(cacheKey);
  return fetchGames(session);
}

/**
 * Add a new game
 */
export async function addGame(
  gameData: any,
  session: string = "2025-December"
): Promise<Game> {
  if (!isLocalhost) {
    throw new Error("Cannot add game in production mode. API is only available on localhost.");
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/games?session=${encodeURIComponent(session)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameData),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    return result.game || result;
  } catch (error) {
    console.error("Error adding game:", error);
    throw error;
  }
}

/**
 * Update an existing game
 */
export async function updateGame(
  gameId: string,
  gameData: any,
  session: string = "2025-December"
): Promise<Game> {
  if (!isLocalhost) {
    throw new Error("Cannot update game in production mode. API is only available on localhost.");
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/games/${gameId}?session=${encodeURIComponent(session)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameData),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    return result.game || result;
  } catch (error) {
    console.error("Error updating game:", error);
    throw error;
  }
}

/**
 * Delete an existing game
 */
export async function deleteGame(
  gameId: string,
  session: string = "2025-December"
): Promise<void> {
  if (!isLocalhost) {
    throw new Error("Cannot delete game in production mode. API is only available on localhost.");
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/games/${gameId}?session=${encodeURIComponent(session)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error("Error deleting game:", error);
    throw error;
  }
}
