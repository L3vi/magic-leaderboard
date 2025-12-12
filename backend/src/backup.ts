import 'dotenv/config';
import { db } from './firebase';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DOWNLOAD DATA FROM FIREBASE
 * 
 * Direction: Firebase (live) ← local files
 * 
 * What it does:
 * - Fetches ALL data from Firebase Firestore
 * - Saves to archived-data/firebase-snapshot.json
 * - Saves fallback copies to backend/data/ for API offline mode
 * 
 * Usage:
 * npm run download-from-firebase
 * 
 * Output files created:
 * 1. archived-data/firebase-snapshot.json
 *    → Complete snapshot of everything currently in Firebase
 *    → Use this to verify Firebase state or as recovery backup
 * 
 * 2. backend/data/players.json
 *    → Player list (used if Firebase is down)
 * 
 * 3. backend/data/games.json
 *    → Games from latest session (used if Firebase is down)
 * 
 * When to use:
 * - After uploading new data to Firebase (npm run upload-to-firebase)
 * - To verify what's actually stored in Firebase
 * - Before pushing to production, verify current Firebase state
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
    console.log('💾 Backing up data from Firebase...\n');

    // Step 1: Fetch all players
    console.log('👥 Fetching players...');
    const playersSnapshot = await db.collection('players').get();
    const players: Player[] = playersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Player));
    console.log(`   ✓ Downloaded ${players.length} players\n`);

    // Step 2: Fetch all sessions and their games
    console.log('📚 Fetching sessions...');
    const sessionsSnapshot = await db.collection('sessions').get();
    const sessions: { [sessionId: string]: Session } = {};

    for (const sessionDoc of sessionsSnapshot.docs) {
      const sessionId = sessionDoc.id;
      const sessionData = sessionDoc.data();
      
      console.log(`   • Session: ${sessionId}`);

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

    // Step 3: Create backup structure
    const backupData: BackupData = {
      backupDate: new Date().toISOString(),
      players,
      sessions
    };

    // Step 4: Save to archived-data/firebase-snapshot.json
    const backupDir = path.join(__dirname, '../../archived-data');
    const backupPath = path.join(backupDir, 'firebase-snapshot.json');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`✓ Backup saved to: archived-data/firebase-snapshot.json\n`);

    // Step 5: Save fallback files for frontend/backend
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save players.json
    fs.writeFileSync(
      path.join(dataDir, 'players.json'),
      JSON.stringify(players, null, 2)
    );
    console.log(`✓ Fallback players saved to: backend/data/players.json`);

    // Save games.json (latest session or December 2025)
    const latestSessionId = Object.keys(sessions).sort().reverse()[0];
    const latestGames = sessions[latestSessionId]?.games || [];
    fs.writeFileSync(
      path.join(dataDir, 'games.json'),
      JSON.stringify(latestGames, null, 2)
    );
    console.log(`✓ Fallback games saved to: backend/data/games.json (from ${latestSessionId})\n`);

    // Summary
    console.log('✅ Backup complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Players: ${players.length}`);
    console.log(`   - Sessions: ${Object.keys(sessions).length}`);
    Object.entries(sessions).forEach(([sessionId, session]) => {
      console.log(`     • ${sessionId}: ${session.games.length} games`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

backup();
