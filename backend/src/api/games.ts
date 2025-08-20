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
