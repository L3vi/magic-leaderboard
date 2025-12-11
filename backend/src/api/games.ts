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
  
  // Return just the IDs for now, but the first one is the latest
  res.json(sessions.map(s => s.id));
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
  } catch (e) {
    // Firebase error, fallback below
  }
  if (!games) {
    // Fallback to local file
    const filePath = path.join(__dirname, "../../data/games.json");
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      games = JSON.parse(raw);
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
      return res.status(400).json({ error: "Each player must have playerId, commander, and placement." });
    }
  }
  
  try {
    // Fetch current game count to generate next ID
    let currentGames: any[] | null = null;
    try {
      currentGames = await fetchGamesFromFirebase(sessionId);
    } catch (e) {
      // Error fetching, will fallback
    }
    const gameCount = currentGames ? currentGames.length : 0;
    const gameId = generateGameId(sessionId, gameCount);
    
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
      const filePath = path.join(__dirname, "../../data/games.json");
      let games: any[] = [];
      
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        games = JSON.parse(raw);
      } catch (err) {
        games = [];
      }
      
      games.push(newGame);
      fs.writeFileSync(filePath, JSON.stringify(games, null, 2));
      
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
      return res.status(400).json({ error: "Each player must have playerId, commander, and placement." });
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
