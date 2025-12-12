import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { db } from "../firebase";

// Generate organized game ID: game-YYYY-MM-###
function generateGameId(sessionId: string, gameCount: number): string {
  const paddedNumber = String(gameCount + 1).padStart(3, '0');
  return `game-${sessionId}-${paddedNumber}`;
}

// Fetch available sessions from Firebase, sorted by creation date (newest first)
async function fetchSessionsFromFirebase(): Promise<Array<{id: string, createdAt: string}> | null> {
  try {
    const snapshot = await db.collection("sessions").get();
    if (snapshot.empty) {
      return null;
    }
    const sessions = snapshot.docs
      .map(doc => ({
        id: doc.id,
        createdAt: doc.data().createdAt || new Date().toISOString()
      }))
      .sort((a, b) => {
        const aDate = new Date(a.createdAt).getTime();
        const bDate = new Date(b.createdAt).getTime();
        return bDate - aDate; // Most recent first
      });
    return sessions;
  } catch (error) {
    console.error("Firebase error:", error);
    return null;
  }
}

export async function getSessions(req: Request, res: Response) {
  let sessions: Array<{id: string, createdAt: string}> | null = null;
  try {
    sessions = await fetchSessionsFromFirebase();
  } catch (e) {
    // Firebase error, fallback below
  }
  
  if (!sessions) {
    // Fallback with known sessions
    sessions = [
      { id: '2025-December', createdAt: '2025-12-10T00:00:00.000Z' },
      { id: '2025-May', createdAt: '2025-05-31T23:59:59.000Z' }
    ];
  }
  
  // Filter out archived sessions from UI
  const archivedSessions = ['2025-May'];
  const activeSessions = sessions.filter(s => !archivedSessions.includes(s.id));
  
  // Return just the IDs for now, but the first one is the latest
  res.json(activeSessions.map(s => s.id));
}

// Fetch games from Firebase Firestore for a specific session
async function fetchGamesFromFirebase(sessionId: string): Promise<any[] | null> {
  try {
    const snapshot = await db
      .collection("sessions")
      .doc(sessionId)
      .collection("games")
      .get();
    if (snapshot.empty) {
      return null; // No games in Firestore, use fallback
    }
    const games: any[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // Sort by dateCreated in descending order
    games.sort((a: any, b: any) => {
      const aDate = new Date(a.dateCreated || 0).getTime();
      const bDate = new Date(b.dateCreated || 0).getTime();
      return bDate - aDate;
    });
    return games;
  } catch (error) {
    console.error("Firebase error:", error);
    return null; // Fallback to local file
  }
}

export async function getGames(req: Request, res: Response) {
  const sessionId = req.query.session as string || "2025-December";
  
  let games: any[] | null = null;
  try {
    games = await fetchGamesFromFirebase(sessionId);
    console.log(`Firebase returned ${games?.length || 0} games for session ${sessionId}`);
  } catch (e) {
    console.log(`Firebase fetch failed for session ${sessionId}, using local fallback:`, e);
  }
  if (!games) {
    // Fallback to local file
    const filePath = path.join(__dirname, "../../data/games.json");
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const allGames = JSON.parse(raw);
      console.log(`Local file has ${allGames.length} total games, filtering for session ${sessionId}`);
      // Filter to only games from the requested session
      games = allGames.filter((g: any) => g.id && g.id.includes(sessionId));
      console.log(`Filtered to ${games?.length || 0} games for session ${sessionId}`);
    } catch (err) {
      return res.status(500).json({ error: "Could not load games data." });
    }
  }
  res.json(games);
}

export async function createGame(req: Request, res: Response) {
  const sessionId = req.query.session as string || "2025-December";
  const { players, notes, dateCreated } = req.body;
  
  // Validate required fields
  if (!players || !Array.isArray(players) || players.length < 2) {
    return res.status(400).json({ error: "Game must have at least 2 players." });
  }
  
  for (const player of players) {
    if (!player.playerId || !player.commander || player.placement === undefined) {
      return res.status(400).json({ error: "Each player must have playerId, commander (string or array for partners), and placement." });
    }
    // Validate commander format: string or array of strings
    if (typeof player.commander !== 'string' && !Array.isArray(player.commander)) {
      return res.status(400).json({ error: "Commander must be a string or array of strings for partners." });
    }
    if (Array.isArray(player.commander) && !player.commander.every((c: any) => typeof c === 'string')) {
      return res.status(400).json({ error: "All partner commanders must be strings." });
    }
  }
  
  try {
    // Fetch current games and local file to determine next ID
    let allGames: any[] = [];
    
    // Try Firebase first
    try {
      const firebaseGames = await fetchGamesFromFirebase(sessionId);
      if (firebaseGames) {
        allGames = firebaseGames;
      }
    } catch (e) {
      // Will try local file
    }
    
    // Also check local file to ensure we don't duplicate IDs
    const filePath = path.join(__dirname, "../../data/games.json");
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const localGames = JSON.parse(raw) as any[];
      // Filter to only games from this session
      const sessionGames = localGames.filter((g: any) => g.id && g.id.includes(sessionId));
      // Merge with Firebase games, avoiding duplicates by ID
      const gameIds = new Set(allGames.map((g: any) => g.id));
      for (const game of sessionGames) {
        if (!gameIds.has(game.id)) {
          allGames.push(game);
        }
      }
    } catch (err) {
      // Local file doesn't exist or is invalid, continue with Firebase games
    }
    
    // Generate ID based on actual game count
    const gameCount = allGames.length;
    let gameId = generateGameId(sessionId, gameCount);
    
    // Safety check: if ID already exists, increment until we find a unique one
    const existingIds = new Set(allGames.map((g: any) => g.id));
    let counter = gameCount;
    while (existingIds.has(gameId)) {
      counter++;
      gameId = generateGameId(sessionId, counter);
    }
    
    const newGame = {
      id: gameId,
      players,
      notes: notes || "",
      dateCreated: dateCreated || new Date().toISOString()
    };
    
    // Try to save to Firebase first
    try {
      await db
        .collection("sessions")
        .doc(sessionId)
        .collection("games")
        .doc(gameId)
        .set(newGame);
      return res.status(201).json({ success: true, game: newGame });
    } catch (firebaseError) {
      console.warn("Firebase write failed, falling back to local file:", firebaseError);
      // Fallback: write to local file
      let games: any[] = [];
      
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        games = JSON.parse(raw);
      } catch (err) {
        games = [];
      }
      
      // Filter to only games from this session, add the new game, then write back
      const sessionGames = games.filter((g: any) => g.id && g.id.includes(sessionId));
      const gameIds = new Set(sessionGames.map((g: any) => g.id));
      
      // Only add if not already in session games (extra safety check)
      if (!gameIds.has(gameId)) {
        sessionGames.push(newGame);
      }
      
      // If file had games from other sessions, preserve them; otherwise just use session games
      const otherSessionGames = games.filter((g: any) => !g.id || !g.id.includes(sessionId));
      const finalGames = [...otherSessionGames, ...sessionGames];
      
      fs.writeFileSync(filePath, JSON.stringify(finalGames, null, 2));
      
      return res.status(201).json({ success: true, game: newGame });
    }
  } catch (err) {
    console.error("Error creating game:", err);
    res.status(500).json({ error: "Could not save game." });
  }
}

export async function updateGame(req: Request, res: Response) {
  const sessionId = req.query.session as string || "2025-December";
  const gameId = req.params.gameId as string;
  const { players, notes, dateCreated } = req.body;
  
  // Validate required fields
  if (!players || !Array.isArray(players) || players.length < 2) {
    return res.status(400).json({ error: "Game must have at least 2 players." });
  }
  
  for (const player of players) {
    if (!player.playerId || !player.commander || player.placement === undefined) {
      return res.status(400).json({ error: "Each player must have playerId, commander (string or array for partners), and placement." });
    }
    // Validate commander format: string or array of strings
    if (typeof player.commander !== 'string' && !Array.isArray(player.commander)) {
      return res.status(400).json({ error: "Commander must be a string or array of strings for partners." });
    }
    if (Array.isArray(player.commander) && !player.commander.every((c: any) => typeof c === 'string')) {
      return res.status(400).json({ error: "All partner commanders must be strings." });
    }
  }
  
  try {
    const updatedGame = {
      id: gameId,
      players,
      notes: notes || "",
      dateCreated: dateCreated || new Date().toISOString()
    };
    
    // Try to update in Firebase first
    try {
      await db
        .collection("sessions")
        .doc(sessionId)
        .collection("games")
        .doc(gameId)
        .set(updatedGame);
      return res.status(200).json({ success: true, game: updatedGame });
    } catch (firebaseError) {
      console.warn("Firebase write failed, falling back to local file:", firebaseError);
      // Fallback: update in local file
      const filePath = path.join(__dirname, "../../data/games.json");
      let games: any[] = [];
      
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        games = JSON.parse(raw);
      } catch (err) {
        return res.status(404).json({ error: "Game not found." });
      }
      
      const gameIndex = games.findIndex((g: any) => g.id === gameId);
      if (gameIndex === -1) {
        return res.status(404).json({ error: "Game not found." });
      }
      
      games[gameIndex] = updatedGame;
      fs.writeFileSync(filePath, JSON.stringify(games, null, 2));
      
      return res.status(200).json({ success: true, game: updatedGame });
    }
  } catch (err) {
    console.error("Error updating game:", err);
    res.status(500).json({ error: "Could not update game." });
  }
}

export async function deleteGame(req: Request, res: Response) {
  const sessionId = req.query.session as string || "2025-December";
  const gameId = req.params.gameId as string;

  try {
    // Try to delete from Firebase first
    try {
      await db
        .collection("sessions")
        .doc(sessionId)
        .collection("games")
        .doc(gameId)
        .delete();
      return res.status(200).json({ success: true, message: "Game deleted successfully." });
    } catch (firebaseError) {
      console.warn("Firebase delete failed, falling back to local file:", firebaseError);
      // Fallback: delete from local file
      const filePath = path.join(__dirname, "../../data/games.json");
      let games: any[] = [];

      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        games = JSON.parse(raw);
      } catch (err) {
        return res.status(404).json({ error: "Game not found." });
      }

      const gameIndex = games.findIndex((g: any) => g.id === gameId);
      if (gameIndex === -1) {
        return res.status(404).json({ error: "Game not found." });
      }

      games.splice(gameIndex, 1);
      fs.writeFileSync(filePath, JSON.stringify(games, null, 2));

      return res.status(200).json({ success: true, message: "Game deleted successfully." });
    }
  } catch (err) {
    console.error("Error deleting game:", err);
    res.status(500).json({ error: "Could not delete game." });
  }
}
