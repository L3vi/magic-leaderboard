import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { db } from "../firebase";

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
    const newGame = {
      players,
      notes: notes || "",
      dateCreated: dateCreated || new Date().toISOString()
    };
    
    // Try to save to Firebase first
    try {
      const docRef = await db
        .collection("sessions")
        .doc(sessionId)
        .collection("games")
        .add(newGame);
      return res.status(201).json({ success: true, game: { id: docRef.id, ...newGame } });
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
      
      const gameWithId = {
        id: Date.now().toString(),
        ...newGame
      };
      
      games.push(gameWithId);
      fs.writeFileSync(filePath, JSON.stringify(games, null, 2));
      
      return res.status(201).json({ success: true, game: gameWithId });
    }
  } catch (err) {
    console.error("Error creating game:", err);
    res.status(500).json({ error: "Could not save game." });
  }
}
