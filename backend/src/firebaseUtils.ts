/**
 * Unified Firebase backup utility
 * Consolidates duplicate backup logic from multiple scripts
 * Used by: backup.ts, restore.ts, backup-master.ts
 */

import { db } from './firebase';
import * as fs from 'fs';
import * as path from 'path';
import { Player, Game, Session, FirebaseData } from './types';

/**
 * Fetch all data from Firebase Firestore
 */
export async function fetchAllDataFromFirebase(): Promise<FirebaseData> {
  // Fetch all players
  const playersSnapshot = await db.collection('players').get();
  const players: Player[] = playersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Player));

  // Fetch all sessions with their games
  const sessionsSnapshot = await db.collection('sessions').get();
  const sessions: { [sessionId: string]: Session } = {};

  for (const sessionDoc of sessionsSnapshot.docs) {
    const sessionId = sessionDoc.id;
    const sessionData = sessionDoc.data();
    
    // Fetch games for this session
    const gamesSnapshot = await sessionDoc.ref.collection('games').get();
    const games: Game[] = gamesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Game));

    sessions[sessionId] = {
      name: sessionData.name,
      createdAt: sessionData.createdAt,
      description: sessionData.description,
      ...(sessionData.players && { players: sessionData.players }),
      games
    };
  }

  return {
    backupDate: new Date().toISOString(),
    players,
    sessions
  };
}

/**
 * Save Firebase data to a JSON file
 */
export function saveDataToFile(data: FirebaseData, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Print backup summary
 */
export function printBackupSummary(data: FirebaseData): void {
  console.log('✅ Complete!\n');
  console.log('📊 Summary:');
  console.log(`   Players: ${data.players.length}`);
  console.log(`   Sessions: ${Object.keys(data.sessions).length}`);
  Object.entries(data.sessions).forEach(([sessionId, session]) => {
    console.log(`     • ${sessionId}: ${session.games.length} games`);
  });
  console.log('');
}

/**
 * Load Firebase data from a JSON file
 */
export function loadDataFromFile(filePath: string): FirebaseData {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as FirebaseData;
}

/**
 * Upload data to Firebase Firestore
 */
export async function uploadDataToFirebase(data: FirebaseData): Promise<void> {
  // Upload all players
  const playersCollection = db.collection('players');
  for (const player of data.players) {
    await playersCollection.doc(player.id).set(player);
  }

  // Upload all sessions with games
  const sessionsCollection = db.collection('sessions');
  for (const [sessionId, session] of Object.entries(data.sessions)) {
    const sessionRef = sessionsCollection.doc(sessionId);
    
    // Set session document (without games array, it's a subcollection)
    const { games, ...sessionData } = session;
    await sessionRef.set(sessionData);

    // Upload games as subcollection
    const gamesCollection = sessionRef.collection('games');
    for (const game of games) {
      await gamesCollection.doc(game.id).set(game);
    }
  }
}
