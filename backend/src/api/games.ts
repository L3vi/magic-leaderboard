import { Request, Response } from "express";
import fs from "fs";
import path from "path";

// Placeholder for Firebase fetch
async function fetchGamesFromFirebase(): Promise<any[] | null> {
  // TODO: Replace with actual Firebase logic
  return null; // Simulate Firebase unavailable
}

export async function getGames(req: Request, res: Response) {
  let games: any[] | null = null;
  try {
    games = await fetchGamesFromFirebase();
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
    const filePath = path.join(__dirname, "../../data/games.json");
    let games: any[] = [];
    
    // Read existing games
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      games = JSON.parse(raw);
    } catch (err) {
      // File doesn't exist or is empty, start with empty array
      games = [];
    }
    
    // Create new game with ID
    const newGame = {
      id: Date.now().toString(),
      players,
      notes: notes || "",
      dateCreated: dateCreated || new Date().toISOString()
    };
    
    // Add to games array
    games.push(newGame);
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(games, null, 2));
    
    res.status(201).json({ success: true, game: newGame });
  } catch (err) {
    console.error("Error creating game:", err);
    res.status(500).json({ error: "Could not save game." });
  }
}
