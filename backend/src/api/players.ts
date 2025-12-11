import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { db } from "../firebase";

// Fetch players from shared global collection
async function fetchPlayersFromFirebase(): Promise<any[] | null> {
  try {
    const snapshot = await db
      .collection("players")
      .orderBy("name")
      .get();
    if (snapshot.empty) {
      return null; // No players in Firestore, use fallback
    }
    const players = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return players;
  } catch (error) {
    console.error("Firebase error:", error);
    return null; // Fallback to local file
  }
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
