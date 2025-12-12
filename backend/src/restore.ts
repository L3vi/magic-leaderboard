import 'dotenv/config';
import { db } from './firebase';
import * as fs from 'fs';
import * as path from 'path';

/**
 * UPLOAD DATA TO FIREBASE
 * 
 * Direction: Firebase (live) → local files
 * 
 * What it does:
 * - Reads from local JSON file (master-leaderboard.json or custom file)
 * - Uploads ALL data to Firebase Firestore
 * - Overwrites whatever is currently in Firebase
 * 
 * This script supports multiple input files:
 * 1. archived-data/master-leaderboard.json (PRIMARY)
 *    → Use this for your "known good" data
 *    → Contains historical sessions + current season
 * 
 * 2. archived-data/firebase-snapshot.json (RECOVERY)
 *    → Use this to restore from a previous Firebase download
 *    → Only use if you need to undo recent changes
 * 
 * 3. Custom file via --file parameter
 *    → npm run upload-to-firebase -- --file=path/to/file.json
 * 
 * Usage:
 * npm run upload-to-firebase                              # Uses master-leaderboard.json
 * npm run upload-to-firebase -- --file=path/to/file.json # Uses custom file
 * 
 * When to use:
 * - After updating archived-data/master-leaderboard.json locally
 * - To sync changes from local files to Firebase
 * - To restore from a backup (use firebase-snapshot.json)
 * 
 * After uploading:
 * 1. Run: npm run download-from-firebase (to verify upload worked)
 * 2. Copy backend/data files to frontend/src/data files
 * 3. Test the app to verify data looks correct
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

interface RestoreData {
  players: Player[];
  sessions?: {
    [sessionId: string]: Session;
  };
}

async function restore() {
  try {
    // Check for custom file argument
    const fileArg = process.argv.find(arg => arg.startsWith('--file='));
    let restoreFilePath: string;

    if (fileArg) {
      restoreFilePath = fileArg.split('=')[1];
    } else {
      // Try default locations in order (master-leaderboard first for cleaner data)
      const defaultFiles = [
        path.join(__dirname, '../../archived-data/master-leaderboard.json'),
        path.join(__dirname, '../../archived-data/firebase-snapshot.json'),
      ];

      restoreFilePath = '';
      for (const file of defaultFiles) {
        if (fs.existsSync(file)) {
          restoreFilePath = file;
          break;
        }
      }
    }

    if (!restoreFilePath || !fs.existsSync(restoreFilePath)) {
      console.error(`❌ Restore file not found: ${restoreFilePath}`);
      console.error('\nTry one of:');
      console.error('  1. npm run upload-to-firebase (auto-detects firebase-snapshot.json or master-leaderboard.json)');
      console.error('  2. npm run upload-to-firebase -- --file=path/to/file.json');
      process.exit(1);
    }

    const fileContent = fs.readFileSync(restoreFilePath, 'utf-8');
    const restoreData: RestoreData = JSON.parse(fileContent);

    console.log('📥 Restore Starting...\n');
    console.log(`📂 Source: ${restoreFilePath}\n`);

    // Step 1: Restore global players
    console.log(`📝 Restoring ${restoreData.players.length} global players...`);
    const playersCollection = db.collection('players');

    for (const player of restoreData.players) {
      await playersCollection.doc(player.id).set({
        id: player.id,
        name: player.name
      });
    }
    console.log(`✓ ${restoreData.players.length} players restored to /players\n`);

    // Step 2: Restore sessions and their games (if sessions exist)
    if (restoreData.sessions) {
      const sessionIds = Object.keys(restoreData.sessions);
      console.log(`📚 Restoring ${sessionIds.length} session(s)...\n`);

      for (const sessionId of sessionIds) {
        const session = restoreData.sessions[sessionId];
        const games = session.games || [];

        console.log(`📌 Session: "${sessionId}"`);
        console.log(`   Name: ${session.name}`);
        console.log(`   Games: ${games.length}`);
        console.log(`   Created: ${session.createdAt}`);

        // Create session document
        const sessionRef = db.collection('sessions').doc(sessionId);
        const sessionData: any = {
          name: session.name,
          createdAt: session.createdAt,
          description: session.description,
          updatedAt: new Date().toISOString()
        };
        
        // Include players array if it exists
        if (session.players && session.players.length > 0) {
          sessionData.players = session.players;
        }
        
        await sessionRef.set(sessionData);

        // Restore games for this session
        if (games.length > 0) {
          const gamesCollection = sessionRef.collection('games');

          for (const game of games) {
            await gamesCollection.doc(game.id).set({
              id: game.id,
              dateCreated: game.dateCreated,
              notes: game.notes,
              players: game.players,
              createdAt: new Date().toISOString()
            });
          }
          console.log(`   ✓ ${games.length} games restored\n`);
        } else {
          console.log(`   ✓ Session created (empty)\n`);
        }
      }

      console.log('✅ Restore complete!');
      console.log('\n📊 Summary:');
      console.log(`   - Global Players: ${restoreData.players.length}`);
      console.log(`   - Sessions: ${sessionIds.length}`);

      for (const sessionId of sessionIds) {
        const gameCount = restoreData.sessions[sessionId].games?.length || 0;
        console.log(`     • ${sessionId}: ${gameCount} games`);
      }
    } else {
      console.log('✅ Restore complete!');
      console.log(`\n📊 Summary:`);
      console.log(`   - Global Players: ${restoreData.players.length}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  }
}

restore();
