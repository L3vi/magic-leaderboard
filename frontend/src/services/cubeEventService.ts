import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import type {
  CubeEvent,
  Draft,
  Match,
  MatchPlayer,
  Player,
} from "../types";

const COLLECTION = "cube-events";

/**
 * Fetch the active cube event (first document in cube-events collection).
 * Returns the event data plus its document ID.
 */
export async function fetchCubeEvent(): Promise<{ id: string; event: CubeEvent } | null> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    if (snapshot.empty) {
      console.warn("No cube events found in Firestore");
      return null;
    }
    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      event: docSnap.data() as CubeEvent,
    };
  } catch (error) {
    console.error("Error fetching cube event:", error);
    return null;
  }
}

/**
 * Fetch all players from the global players collection.
 */
export async function fetchPlayers(): Promise<Player[]> {
  try {
    const snapshot = await getDocs(collection(db, "players"));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player));
  } catch (error) {
    console.error("Error fetching players:", error);
    return [];
  }
}

/**
 * Add a new draft to the cube event.
 */
export async function addDraft(
  eventId: string,
  draft: Omit<Draft, "id">
): Promise<Draft> {
  const docRef = doc(db, COLLECTION, eventId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error("Cube event not found");

  const event = docSnap.data() as CubeEvent;
  const draftCount = event.drafts.length;
  const newDraft: Draft = {
    ...draft,
    id: `draft-${String(draftCount + 1).padStart(3, "0")}`,
  };

  await updateDoc(docRef, { drafts: [...event.drafts, newDraft] });
  return newDraft;
}

/**
 * Update a draft's status (toggle complete/in-progress).
 */
export async function updateDraftStatus(
  eventId: string,
  draftId: string,
  status: "in-progress" | "complete"
): Promise<void> {
  const docRef = doc(db, COLLECTION, eventId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error("Cube event not found");

  const event = docSnap.data() as CubeEvent;
  const drafts = event.drafts.map(d =>
    d.id === draftId ? { ...d, status } : d
  );

  await updateDoc(docRef, { drafts });
}

/**
 * Add a new match to the cube event.
 */
export async function addMatch(
  eventId: string,
  matchData: { draftId: string; players: [MatchPlayer, MatchPlayer] }
): Promise<Match> {
  const docRef = doc(db, COLLECTION, eventId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error("Cube event not found");

  const event = docSnap.data() as CubeEvent;
  const matchCount = event.matches.length;
  const newMatch: Match = {
    id: `match-${String(matchCount + 1).padStart(3, "0")}`,
    draftId: matchData.draftId,
    date: new Date().toISOString(),
    players: matchData.players,
  };

  await updateDoc(docRef, { matches: [...event.matches, newMatch] });
  return newMatch;
}

/**
 * Update an existing match.
 */
export async function updateMatch(
  eventId: string,
  matchId: string,
  matchData: Partial<Pick<Match, "draftId" | "players">>
): Promise<void> {
  const docRef = doc(db, COLLECTION, eventId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error("Cube event not found");

  const event = docSnap.data() as CubeEvent;
  const matches = event.matches.map(m => {
    if (m.id !== matchId) return m;
    return {
      ...m,
      ...(matchData.draftId && { draftId: matchData.draftId }),
      ...(matchData.players && { players: matchData.players }),
    };
  });

  await updateDoc(docRef, { matches });
}

/**
 * Delete a match.
 */
export async function deleteMatch(
  eventId: string,
  matchId: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, eventId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error("Cube event not found");

  const event = docSnap.data() as CubeEvent;
  const matches = event.matches.filter(m => m.id !== matchId);

  await updateDoc(docRef, { matches });
}
