import 'dotenv/config';
import { db } from './firebase';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Backup all data from Firebase to local JSON files
 * This creates a backup of your Firestore database
 * 
 * Usage:
 * npm run backup
 * 
 * Output files:
 * - archived-data/firebase-backup.json (complete backup)
 * - backend/data/players.json (for fallback)
 * - backend/data/games.json (for fallback)
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

    // Step 4: Save to archived-data/firebase-backup.json
    const backupDir = path.join(__dirname, '../../archived-data');
    const backupPath = path.join(backupDir, 'firebase-backup.json');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`✓ Backup saved to: archived-data/firebase-backup.json\n`);

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
