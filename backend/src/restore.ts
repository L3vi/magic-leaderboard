import 'dotenv/config';
import { db } from './firebase';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Restore data from local JSON file to Firebase
 * 
 * This script supports multiple input formats:
 * 1. archived-data/firebase-backup.json (complete backup with sessions)
 * 2. archived-data/master-leaderboard.json (historical data)
 * 3. Custom JSON file via --file parameter
 * 
 * Usage:
 * npm run restore                    # Uses firebase-backup.json or master-leaderboard.json
 * npm run restore -- --file=path/to/file.json
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
        path.join(__dirname, '../../archived-data/firebase-backup.json'),
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
      console.error('  1. npm run restore (auto-detects firebase-backup.json or master-leaderboard.json)');
      console.error('  2. npm run restore -- --file=path/to/file.json');
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
        await sessionRef.set({
          name: session.name,
          createdAt: session.createdAt,
          description: session.description,
          updatedAt: new Date().toISOString()
        });

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
