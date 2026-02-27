import { Request, Response } from "express";
import { db } from "../firebase";
import type { CubeEvent, Draft, Match, ManaColor } from "../types";

const VALID_COLORS: ManaColor[] = ['W', 'U', 'B', 'R', 'G'];

/**
 * Get the active cube event. Returns the first document in the cube-events collection.
 */
export async function getActiveCubeEvent(req: Request, res: Response) {
  try {
    const snapshot = await db.collection("cube-events").limit(1).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: "No active cube event found." });
    }
    const doc = snapshot.docs[0];
    return res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error fetching cube event:", error);
    return res.status(500).json({ error: "Could not fetch cube event." });
  }
}

/**
 * Create a new draft within a cube event.
 */
export async function createDraft(req: Request, res: Response) {
  const eventId = req.params.eventId;
  const { cubeId, players } = req.body;

  if (!cubeId || typeof cubeId !== "string") {
    return res.status(400).json({ error: "cubeId is required." });
  }
  if (!players || !Array.isArray(players) || players.length < 2) {
    return res.status(400).json({ error: "Draft must have at least 2 players." });
  }

  try {
    const docRef = db.collection("cube-events").doc(eventId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Cube event not found." });
    }

    const event = docSnap.data() as CubeEvent;

    // Validate cubeId exists
    if (!event.cubes.find(c => c.id === cubeId)) {
      return res.status(400).json({ error: "Invalid cubeId." });
    }

    // Generate draft ID
    const draftCount = event.drafts.length;
    const draftId = `draft-${String(draftCount + 1).padStart(3, "0")}`;

    const newDraft: Draft = {
      id: draftId,
      cubeId,
      date: new Date().toISOString(),
      players,
      status: "in-progress",
    };

    const updatedDrafts = [...event.drafts, newDraft];
    await docRef.update({ drafts: updatedDrafts });

    return res.status(201).json({ success: true, draft: newDraft });
  } catch (error) {
    console.error("Error creating draft:", error);
    return res.status(500).json({ error: "Could not create draft." });
  }
}

/**
 * Update a draft (e.g., toggle status).
 */
export async function updateDraft(req: Request, res: Response) {
  const { eventId, draftId } = req.params;
  const { status } = req.body;

  if (status && status !== "in-progress" && status !== "complete") {
    return res.status(400).json({ error: "Invalid status. Must be 'in-progress' or 'complete'." });
  }

  try {
    const docRef = db.collection("cube-events").doc(eventId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Cube event not found." });
    }

    const event = docSnap.data() as CubeEvent;
    const draftIndex = event.drafts.findIndex(d => d.id === draftId);
    if (draftIndex === -1) {
      return res.status(404).json({ error: "Draft not found." });
    }

    if (status) {
      event.drafts[draftIndex].status = status;
    }

    await docRef.update({ drafts: event.drafts });

    return res.json({ success: true, draft: event.drafts[draftIndex] });
  } catch (error) {
    console.error("Error updating draft:", error);
    return res.status(500).json({ error: "Could not update draft." });
  }
}

/**
 * Create a new match within a cube event.
 */
export async function createMatch(req: Request, res: Response) {
  const eventId = req.params.eventId;
  const { draftId, players, notes } = req.body;

  // Validate draftId
  if (!draftId || typeof draftId !== "string") {
    return res.status(400).json({ error: "draftId is required." });
  }

  // Validate players
  if (!players || !Array.isArray(players) || players.length !== 2) {
    return res.status(400).json({ error: "Match must have exactly 2 players." });
  }

  for (const player of players) {
    if (!player.playerId || typeof player.playerId !== "string") {
      return res.status(400).json({ error: "Each player must have a playerId." });
    }
    if (typeof player.wins !== "number" || player.wins < 0 || player.wins > 2) {
      return res.status(400).json({ error: "Each player's wins must be 0, 1, or 2." });
    }
    if (!Array.isArray(player.deckColors) || !player.deckColors.every((c: string) => VALID_COLORS.includes(c as ManaColor))) {
      return res.status(400).json({ error: "deckColors must be an array of valid mana colors (W, U, B, R, G)." });
    }
    // deckStrategy is optional string, no strict validation needed
  }

  // At most one player can have 2 wins
  const winnersCount = players.filter((p: any) => p.wins === 2).length;
  if (winnersCount > 1) {
    return res.status(400).json({ error: "At most one player can have 2 wins." });
  }

  try {
    const docRef = db.collection("cube-events").doc(eventId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Cube event not found." });
    }

    const event = docSnap.data() as CubeEvent;

    // Validate draftId exists
    if (!event.drafts.find(d => d.id === draftId)) {
      return res.status(400).json({ error: "Invalid draftId." });
    }

    // Generate match ID
    const matchCount = event.matches.length;
    const matchId = `match-${String(matchCount + 1).padStart(3, "0")}`;

    const newMatch: Match = {
      id: matchId,
      draftId,
      date: new Date().toISOString(),
      players: [
        { ...players[0], deckStrategy: players[0].deckStrategy || "" },
        { ...players[1], deckStrategy: players[1].deckStrategy || "" },
      ],
      notes: typeof notes === "string" ? notes : "",
    };

    const updatedMatches = [...event.matches, newMatch];
    await docRef.update({ matches: updatedMatches });

    return res.status(201).json({ success: true, match: newMatch });
  } catch (error) {
    console.error("Error creating match:", error);
    return res.status(500).json({ error: "Could not create match." });
  }
}

/**
 * Update an existing match.
 */
export async function updateMatch(req: Request, res: Response) {
  const { eventId, matchId } = req.params;
  const { draftId, players } = req.body;

  // Validate players if provided
  if (players) {
    if (!Array.isArray(players) || players.length !== 2) {
      return res.status(400).json({ error: "Match must have exactly 2 players." });
    }
    for (const player of players) {
      if (!player.playerId || typeof player.playerId !== "string") {
        return res.status(400).json({ error: "Each player must have a playerId." });
      }
      if (typeof player.wins !== "number" || player.wins < 0 || player.wins > 2) {
        return res.status(400).json({ error: "Each player's wins must be 0, 1, or 2." });
      }
      if (!Array.isArray(player.deckColors) || !player.deckColors.every((c: string) => VALID_COLORS.includes(c as ManaColor))) {
        return res.status(400).json({ error: "deckColors must be an array of valid mana colors." });
      }
    }
  }

  try {
    const docRef = db.collection("cube-events").doc(eventId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Cube event not found." });
    }

    const event = docSnap.data() as CubeEvent;
    const matchIndex = event.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      return res.status(404).json({ error: "Match not found." });
    }

    if (draftId) event.matches[matchIndex].draftId = draftId;
    if (players) event.matches[matchIndex].players = [players[0], players[1]];

    await docRef.update({ matches: event.matches });

    return res.json({ success: true, match: event.matches[matchIndex] });
  } catch (error) {
    console.error("Error updating match:", error);
    return res.status(500).json({ error: "Could not update match." });
  }
}

/**
 * Delete a match.
 */
export async function deleteMatch(req: Request, res: Response) {
  const { eventId, matchId } = req.params;

  try {
    const docRef = db.collection("cube-events").doc(eventId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Cube event not found." });
    }

    const event = docSnap.data() as CubeEvent;
    const matchIndex = event.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      return res.status(404).json({ error: "Match not found." });
    }

    event.matches.splice(matchIndex, 1);
    await docRef.update({ matches: event.matches });

    return res.json({ success: true, message: "Match deleted." });
  } catch (error) {
    console.error("Error deleting match:", error);
    return res.status(500).json({ error: "Could not delete match." });
  }
}
