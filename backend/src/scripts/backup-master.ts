import 'dotenv/config';
import { db } from '../firebase';
import * as fs from 'fs';
import * as path from 'path';

/**
 * BACKUP FIREBASE TO MASTER LEADERBOARD
 * 
 * Direction: Firebase → archived-data/master-leaderboard.json
 * 
 * What it does:
 * - Fetches ALL data from Firebase Firestore
 * - Saves to archived-data/master-leaderboard.json (master backup)
 * - Creates timestamped backup copy for version history
 * 
 * Usage:
 * npm run backup-firebase
 * 
 * This ensures we always have a safe, current backup of all Firebase data
 * that can be restored or synced if needed.
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

async function backupToMaster() {
  try {
    console.log('💾 Backing up Firebase to master-leaderboard.json...\n');

    // Fetch all players
    console.log('👥 Fetching players...');
    const playersSnapshot = await db.collection('players').get();
    const players: Player[] = playersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Player));
    console.log(`   ✓ Downloaded ${players.length} players`);

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

    // Ensure archived-data directory exists at project root
    const projectRoot = path.join(__dirname, '../../..');
    const archivedDir = path.join(projectRoot, 'archived-data');
    if (!fs.existsSync(archivedDir)) {
      fs.mkdirSync(archivedDir, { recursive: true });
    }

    // Save to master-leaderboard.json at root level
    const masterPath = path.join(archivedDir, 'master-leaderboard.json');
    fs.writeFileSync(masterPath, JSON.stringify(backupData, null, 2));
    console.log(`✓ Master backup saved: archived-data/master-leaderboard.json`);

    // Create timestamped backup for version history
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('Z')[0];
    const timestampedPath = path.join(archivedDir, `master-leaderboard-${timestamp}.json`);
    fs.writeFileSync(timestampedPath, JSON.stringify(backupData, null, 2));
    console.log(`✓ Timestamped backup: archived-data/master-leaderboard-${timestamp}.json\n`);

    // Summary
    console.log('✅ Backup complete!\n');
    console.log('📊 Summary:');
    console.log(`   Players: ${players.length}`);
    console.log(`   Sessions: ${Object.keys(sessions).length}`);
    Object.entries(sessions).forEach(([sessionId, session]) => {
      console.log(`     • ${sessionId}: ${session.games.length} games`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

backupToMaster();
