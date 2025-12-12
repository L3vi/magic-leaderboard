import playersData from "../data/players.json";
import gamesData from "../data/games.json";
import { getCacheKey, getFromCache, setCache, clearCache } from "./queryCache";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";

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
 * Simple fetch with basic error handling (kept for backwards compatibility)
 */
async function fetchAPI<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

/**
 * Fetch all players from local fallback data
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

  const fallback = playersData as Player[];
  setCache(cacheKey, fallback);
  return fallback;
}

/**
 * Fetch games for a session from Firebase or fallback to local data
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

  try {
    const gamesCollection = collection(db, "sessions", session, "games");
    const snapshot = await getDocs(gamesCollection);
    const games: Game[] = snapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    } as Game));

    setCache(cacheKey, games);
    return games;
  } catch (error) {
    console.error("Error fetching games from Firebase, using local fallback:", error);
    const fallback = gamesData as Game[];
    setCache(cacheKey, fallback);
    return fallback;
  }
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
 * Add a new game to Firebase
 */
export async function addGame(
  gameData: any,
  session: string = "2025-December"
): Promise<Game> {
  try {
    const gamesCollection = collection(db, "sessions", session, "games");
    const docRef = await addDoc(gamesCollection, {
      ...gameData,
      dateCreated: gameData.dateCreated || new Date().toISOString(),
    });

    // Refetch games to update cache
    await refetchGames(session);

    return {
      id: docRef.id,
      ...gameData,
    };
  } catch (error) {
    console.error("Error adding game:", error);
    throw error;
  }
}

/**
 * Update an existing game in Firebase
 */
export async function updateGame(
  gameId: string,
  gameData: any,
  session: string = "2025-December"
): Promise<Game> {
  try {
    const gameDocRef = doc(db, "sessions", session, "games", gameId);
    await updateDoc(gameDocRef, gameData);

    // Refetch games to update cache
    await refetchGames(session);

    return {
      id: gameId,
      ...gameData,
    };
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
  try {
    const gameDocRef = doc(db, "sessions", session, "games", gameId);
    await deleteDoc(gameDocRef);

    // Refetch games to update cache
    await refetchGames(session);
  } catch (error) {
    console.error("Error deleting game:", error);
    throw error;
  }
}
