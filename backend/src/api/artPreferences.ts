import { Request, Response } from "express";
import { db } from "../firebase";

export interface PlayerCommanderArt {
  commanderName: string;
  variantId: string;
  artUrl: string;
  fullImageUrl: string;
  timestamp: number;
}

/**
 * Get all art preferences for a player
 */
export async function getPlayerArtPreferences(
  req: Request,
  res: Response
) {
  try {
    const { playerId } = req.params;

    if (!playerId) {
      return res.status(400).json({ error: "playerId is required" });
    }

    const docRef = db.collection("players").doc(playerId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.json({}); // No preferences yet
    }

    const data = doc.data();
    const preferences = data?.commanderArt || {};

    res.json(preferences);
  } catch (error) {
    console.error("Error fetching art preferences:", error);
    res.status(500).json({ error: "Failed to fetch art preferences" });
  }
}

/**
 * Save art preference for a player's commander
 */
export async function saveCommanderArtPreference(
  req: Request,
  res: Response
) {
  try {
    const { playerId } = req.params;
    const { commanderName, variantId, artUrl, fullImageUrl } = req.body;

    if (!playerId || !commanderName) {
      return res
        .status(400)
        .json({ error: "playerId and commanderName are required" });
    }

    const docRef = db.collection("players").doc(playerId);

    await docRef.set(
      {
        commanderArt: {
          [commanderName]: {
            commanderName,
            variantId,
            artUrl,
            fullImageUrl,
            timestamp: Date.now(),
          } as PlayerCommanderArt,
        },
      },
      { merge: true }
    );

    res.json({
      success: true,
      message: `Saved art preference for ${commanderName}`,
    });
  } catch (error) {
    console.error("Error saving art preference:", error);
    res.status(500).json({ error: "Failed to save art preference" });
  }
}

/**
 * Clear art preference for a player's commander
 */
export async function clearCommanderArtPreference(
  req: Request,
  res: Response
) {
  try {
    const { playerId, commanderName } = req.params;

    if (!playerId || !commanderName) {
      return res
        .status(400)
        .json({ error: "playerId and commanderName are required" });
    }

    const docRef = db.collection("players").doc(playerId);

    await docRef.set(
      {
        commanderArt: {
          [commanderName]: null,
        },
      },
      { merge: true }
    );

    res.json({
      success: true,
      message: `Cleared art preference for ${commanderName}`,
    });
  } catch (error) {
    console.error("Error clearing art preference:", error);
    res.status(500).json({ error: "Failed to clear art preference" });
  }
}

/**
 * Clear all art preferences for a player
 */
export async function clearAllPlayerArtPreferences(
  req: Request,
  res: Response
) {
  try {
    const { playerId } = req.params;

    if (!playerId) {
      return res.status(400).json({ error: "playerId is required" });
    }

    const docRef = db.collection("players").doc(playerId);

    await docRef.set(
      {
        commanderArt: {},
      },
      { merge: true }
    );

    res.json({
      success: true,
      message: "Cleared all art preferences",
    });
  } catch (error) {
    console.error("Error clearing all art preferences:", error);
    res.status(500).json({ error: "Failed to clear all art preferences" });
  }
}
