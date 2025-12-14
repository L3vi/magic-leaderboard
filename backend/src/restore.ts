import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { db } from './firebase';
import { loadDataFromFile } from './firebaseUtils';

/**
 * Restore data from JSON file to Firebase
 * 
 * Supports:
 * - archived-data/master-leaderboard.json (primary)
 * - archived-data/firebase-snapshot.json (backup)
 * - Custom file via --file parameter
 * 
 * Usage:
 * npm run restore
 * npm run restore -- --file=path/to/file.json
 */
async function restore() {
  try {
    // Determine restore file path
    const fileArg = process.argv.find(arg => arg.startsWith('--file='));
    let restoreFilePath: string;

    if (fileArg) {
      restoreFilePath = fileArg.split('=')[1];
    } else {
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
      console.error('  1. npm run restore (auto-detects master-leaderboard.json or firebase-snapshot.json)');
      console.error('  2. npm run restore -- --file=path/to/file.json');
      process.exit(1);
    }

    const restoreData = loadDataFromFile(restoreFilePath);

    console.log('📥 Restore Starting...\n');
    console.log(`📂 Source: ${restoreFilePath}\n`);

    // Restore global players
    console.log(`📝 Restoring ${restoreData.players.length} global players...`);
    const playersCollection = db.collection('players');

    for (const player of restoreData.players) {
      await playersCollection.doc(player.id).set({
        id: player.id,
        name: player.name
      });
    }
    console.log(`✓ ${restoreData.players.length} players restored to /players\n`);

    // Restore sessions and their games
    const sessionIds = Object.keys(restoreData.sessions);
    console.log(`📚 Restoring ${sessionIds.length} session(s)...\n`);

    for (const sessionId of sessionIds) {
      const session = restoreData.sessions[sessionId];
      const games = session.games || [];

      console.log(`📌 Session: "${sessionId}"`);
      console.log(`   Name: ${session.name}`);
      console.log(`   Games: ${games.length}`);

      // Create session document
      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionData: any = {
        name: session.name,
        createdAt: session.createdAt,
        description: session.description,
        updatedAt: new Date().toISOString()
      };
      
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

    // Summary
    console.log('✅ Restore complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Global Players: ${restoreData.players.length}`);
    console.log(`   - Sessions: ${sessionIds.length}`);
    for (const sessionId of sessionIds) {
      const gameCount = restoreData.sessions[sessionId].games?.length || 0;
      console.log(`     • ${sessionId}: ${gameCount} games`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  }
}

restore();
