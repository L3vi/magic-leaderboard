import { Request, Response } from "express";
import path from "path";
import fs from "fs";

// Placeholder for Firebase fetch
async function fetchPlayersFromFirebase(): Promise<any[] | null> {
  // TODO: Replace with actual Firebase logic
  return null; // Simulate Firebase unavailable
}

export async function getPlayers(req: Request, res: Response) {
  let players: any[] | null = null;
  try {
    players = await fetchPlayersFromFirebase();
  } catch (e) {
    // Firebase error, fallback below
  }
  if (!players) {
    // Fallback to local file
    const filePath = path.join(__dirname, "../../data/players.json");
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      players = JSON.parse(raw);
    } catch (err) {
      return res.status(500).json({ error: "Could not load players data." });
    }
  }
  res.json(players);
}
