import playersData from "../data/players.json";
import gamesData from "../data/games.json";
import { getCacheKey, getFromCache, setCache, clearCache } from "./queryCache";
import { compareArrays, DeltaResult } from "../utils/deltaCompare";
import { db } from "../firebase";
import type {
  CommanderArtPreference,
  Player,
  GamePlayer,
  Game,
  SessionMetadata,
  PlayerScore,
} from "../types";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
} from "firebase/firestore";

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
 * Fetch session metadata (name, description, player roster, etc.) directly from Firebase
 */
export async function fetchSessionMetadata(
  session: string = "2025-December"
): Promise<SessionMetadata | null> {
  try {
    const sessionDocRef = doc(db, "sessions", session);
    const docSnapshot = await getDoc(sessionDocRef);

    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      return {
        name: data.name,
        description: data.description,
        players: data.players,
        createdAt: data.createdAt
      } as SessionMetadata;
    }

    console.warn(`Session metadata for ${session} not found`);
    return null;
  } catch (error) {
    console.warn(`Could not fetch session metadata for ${session}:`, error);
    return null;
  }
}

/**
 * Fetch players for a specific session (filters by session's player roster if available)
 */
export async function fetchPlayersForSession(
  allPlayers: Player[],
  session: string = "2025-December"
): Promise<Player[]> {
  try {
    const sessionMetadata = await fetchSessionMetadata(session);

    if (sessionMetadata?.players && sessionMetadata.players.length > 0) {
      // Filter to only players in this session
      const sessionPlayerIds = new Set(sessionMetadata.players);
      return allPlayers.filter((p) => sessionPlayerIds.has(p.id));
    }

    // If no session roster, return all players
    return allPlayers;
  } catch (error) {
    console.warn(
      `Error filtering players for session ${session}, returning all:`,
      error
    );
    return allPlayers;
  }
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
 * Includes Bayesian weighted average to account for sample size
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
        // Placement scoring: 1st = 4 pts, 2nd = 3 pts, 3rd = 2 pts, 4th+ = 1 pt
        const points =
          playerInGame.placement === 1
            ? 4
            : playerInGame.placement === 2
            ? 3
            : playerInGame.placement === 3
            ? 2
            : 1;

        scoreMap[playerInGame.playerId].score += points;
        scoreMap[playerInGame.playerId].gameCount += 1;
        scoreMap[playerInGame.playerId].placements.push(playerInGame.placement);
      }
    });
  });

  // Calculate league average
  let totalScore = 0;
  let totalGames = 0;
  Object.values(scoreMap).forEach((stats) => {
    totalScore += stats.score;
    totalGames += stats.gameCount;
  });
  const leagueAverage = totalGames > 0 ? totalScore / totalGames : 2.5;

  // Minimum games threshold for weighted average (helps stabilize ratings)
  const minGamesThreshold = 5;

  // Convert to PlayerScore array with placement ranking
  const scores = players
    .map((player) => {
      const average =
        scoreMap[player.id].gameCount > 0
          ? scoreMap[player.id].score / scoreMap[player.id].gameCount
          : 0;

      // Bayesian weighted average formula:
      // (gameCount * average + minGamesThreshold * leagueAverage) / (gameCount + minGamesThreshold)
      const weightedAverage =
        scoreMap[player.id].gameCount > 0
          ? (scoreMap[player.id].gameCount * average +
              minGamesThreshold * leagueAverage) /
            (scoreMap[player.id].gameCount + minGamesThreshold)
          : 0;

      return {
        id: player.id,
        name: player.name,
        score: scoreMap[player.id].score,
        gameCount: scoreMap[player.id].gameCount,
        placements: scoreMap[player.id].placements,
        average,
        weightedAverage,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Add placement ranking
  return scores.map((score, index) => ({
    id: score.id,
    name: score.name,
    score: score.score,
    placement: index + 1,
    gameCount: score.gameCount,
    average: score.average,
    weightedAverage: score.weightedAverage,
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

/**
 * Asynchronously refresh games with delta detection
 * Only updates data if there are actual changes
 * Returns delta information about what changed
 */
export async function refreshGamesWithDelta(
  currentGames: Game[],
  session: string = "2025-December"
): Promise<{
  hasChanges: boolean;
  newGames: Game[];
  delta: DeltaResult<Game>;
}> {
  const freshGames = await refetchGames(session);
  const delta = compareArrays(currentGames, freshGames);

  return {
    hasChanges: delta.hasChanges,
    newGames: freshGames,
    delta,
  };
}

/**
 * Asynchronously refresh players with delta detection
 * Only updates data if there are actual changes
 * Returns delta information about what changed
 */
export async function refreshPlayersWithDelta(
  currentPlayers: Player[]
): Promise<{
  hasChanges: boolean;
  newPlayers: Player[];
  delta: DeltaResult<Player>;
}> {
  const freshPlayers = await refetchPlayers();
  const delta = compareArrays(currentPlayers, freshPlayers);

  return {
    hasChanges: delta.hasChanges,
    newPlayers: freshPlayers,
    delta,
  };
}

/**
 * Asynchronously refresh session players with delta detection
 * Filters players by session and detects changes
 */
export async function refreshSessionPlayersWithDelta(
  currentPlayers: Player[],
  session: string = "2025-December"
): Promise<{
  hasChanges: boolean;
  newPlayers: Player[];
  delta: DeltaResult<Player>;
}> {
  const allFreshPlayers = await refetchPlayers();
  const freshSessionPlayers = await fetchPlayersForSession(allFreshPlayers, session);
  const delta = compareArrays(currentPlayers, freshSessionPlayers);

  return {
    hasChanges: delta.hasChanges,
    newPlayers: freshSessionPlayers,
    delta,
  };
}

// Re-export types for backwards compatibility
export type { CommanderArtPreference, Player, GamePlayer, Game, SessionMetadata, PlayerScore };
