import 'dotenv/config';
import { db } from './firebase';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Import data from local JSON file to Firebase
 * 
 * This script supports multiple input formats:
 * 1. archived-data/firebase-backup.json (complete backup with sessions)
 * 2. archived-data/master-leaderboard.json (historical data)
 * 3. Custom JSON file via --file parameter
 * 
 * Usage:
 * npm run import-firebase                    # Uses firebase-backup.json or master-leaderboard.json
 * npm run import-firebase -- --file=path/to/file.json
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

interface ImportData {
  players: Player[];
  sessions?: {
    [sessionId: string]: Session;
  };
}

async function importFromFirebase() {
  try {
    // Check for custom file argument
    const fileArg = process.argv.find(arg => arg.startsWith('--file='));
    let importFilePath: string;

    if (fileArg) {
      importFilePath = fileArg.split('=')[1];
    } else {
      // Try default locations in order
      const defaultFiles = [
        path.join(__dirname, '../../archived-data/firebase-backup.json'),
        path.join(__dirname, '../../archived-data/master-leaderboard.json'),
      ];

      importFilePath = '';
      for (const file of defaultFiles) {
        if (fs.existsSync(file)) {
          importFilePath = file;
          break;
        }
      }
    }

    if (!importFilePath || !fs.existsSync(importFilePath)) {
      console.error(`❌ Import file not found: ${importFilePath}`);
      console.error('\nTry one of:');
      console.error('  1. npm run import-firebase (auto-detects firebase-backup.json or master-leaderboard.json)');
      console.error('  2. npm run import-firebase -- --file=path/to/file.json');
      process.exit(1);
    }

    const fileContent = fs.readFileSync(importFilePath, 'utf-8');
    const importData: ImportData = JSON.parse(fileContent);

    console.log('📥 Import Starting...\n');
    console.log(`📂 Source: ${importFilePath}\n`);

    // Step 1: Import global players
    console.log(`📝 Importing ${importData.players.length} global players...`);
    const playersCollection = db.collection('players');

    for (const player of importData.players) {
      await playersCollection.doc(player.id).set({
        id: player.id,
        name: player.name
      });
    }
    console.log(`✓ ${importData.players.length} players imported to /players\n`);

    // Step 2: Import sessions and their games (if sessions exist)
    if (importData.sessions) {
      const sessionIds = Object.keys(importData.sessions);
      console.log(`📚 Importing ${sessionIds.length} session(s)...\n`);

      for (const sessionId of sessionIds) {
        const session = importData.sessions[sessionId];
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

        // Import games for this session
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
          console.log(`   ✓ ${games.length} games imported\n`);
        } else {
          console.log(`   ✓ Session created (empty)\n`);
        }
      }

      console.log('✅ Import complete!');
      console.log('\n📊 Summary:');
      console.log(`   - Global Players: ${importData.players.length}`);
      console.log(`   - Sessions: ${sessionIds.length}`);

      for (const sessionId of sessionIds) {
        const gameCount = importData.sessions[sessionId].games?.length || 0;
        console.log(`     • ${sessionId}: ${gameCount} games`);
      }
    } else {
      console.log('✅ Import complete!');
      console.log(`\n📊 Summary:`);
      console.log(`   - Global Players: ${importData.players.length}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importFromFirebase();
