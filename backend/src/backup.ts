import 'dotenv/config';
import { db } from './firebase';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DOWNLOAD DATA FROM FIREBASE
 * 
 * Direction: Firebase → local snapshot
 * 
 * What it does:
 * - Fetches ALL data from Firebase Firestore
 * - Saves to archived-data/firebase-snapshot.json (single source of truth)
 * 
 * Usage:
 * npm run download-from-firebase
 * 
 * Output files created:
 * 1. archived-data/firebase-snapshot.json
 *    → Current snapshot of everything in Firebase
 *    → Single source of truth for all backed up data
 * 
 * When to use:
 * - After verifying what's stored in Firebase
 * - To create updated backup of all data
 */

interface Player {
  id: string;
  name: string;
}

interface GamePlayer {
  playerId: string;
  placement: number;
  commander: string;
}

interface Game {
  id: string;
  dateCreated: string;
  notes: string;
  players: GamePlayer[];
}

interface Session {
  name: string;
  createdAt: string;
  description: string;
  players?: string[];
  games: Game[];
}

interface BackupData {
  backupDate: string;
  players: Player[];
  sessions: {
    [sessionId: string]: Session;
  };
}

async function backup() {
  try {
    console.log('💾 Creating Firebase snapshot...\n');

    // Fetch all players
    console.log('👥 Fetching players...');
    const playersSnapshot = await db.collection('players').get();
    const players: Player[] = playersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Player));
    console.log(`   ✓ Downloaded ${players.length} players\n`);

    // Fetch all sessions with their games
    console.log('📚 Fetching sessions...');
    const sessionsSnapshot = await db.collection('sessions').get();
    const sessions: { [sessionId: string]: Session } = {};

    for (const sessionDoc of sessionsSnapshot.docs) {
      const sessionId = sessionDoc.id;
      const sessionData = sessionDoc.data();
      
      console.log(`   • ${sessionId}`);

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

      console.log(`     ${games.length} games`);
    }
    console.log('');

    // Create backup structure
    const backupData: BackupData = {
      backupDate: new Date().toISOString(),
      players,
      sessions
    };

    // Save to archived-data/firebase-snapshot.json
    const backupDir = path.join(__dirname, '../../archived-data');
    const backupPath = path.join(backupDir, 'firebase-snapshot.json');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`✓ Snapshot saved: archived-data/firebase-snapshot.json\n`);

    // Summary
    console.log('✅ Snapshot complete!\n');
    console.log('📊 Summary:');
    console.log(`   Players: ${players.length}`);
    console.log(`   Sessions: ${Object.keys(sessions).length}`);
    Object.entries(sessions).forEach(([sessionId, session]) => {
      console.log(`     • ${sessionId}: ${session.games.length} games`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Snapshot failed:', error);
    process.exit(1);
  }
}

backup();
