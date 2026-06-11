import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { db } from './firebase';
import {
  loadDataFromFile,
  fetchAllDataFromFirebase,
  saveDataToFile,
} from './firebaseUtils';

/**
 * Restore data from JSON file to Firebase
 *
 * Supports:
 * - archived-data/master-leaderboard.json (primary)
 * - archived-data/firebase-snapshot.json (backup)
 * - Custom file via --file parameter
 *
 * Safety:
 * - Always downloads the current Firebase state to a timestamped backup
 *   under archived-data/ before writing anything.
 * - Prints a diff of what will be overwritten / added, and warns about live
 *   docs that are absent from the file (they are LEFT IN PLACE, never deleted).
 * - `--dry-run` prints the diff and exits without writing.
 *
 * IMPORTANT: this is an additive, OVERWRITE restore. Docs present in the file
 * replace the live doc; docs absent from the file are never deleted. Player
 * writes use { merge: true } so live `commanderArt` preferences survive even
 * when the file doesn't carry them.
 *
 * Usage:
 * npm run restore
 * npm run restore -- --file=path/to/file.json
 * npm run restore -- --dry-run
 */
async function restore() {
  try {
    const dryRun = process.argv.includes('--dry-run');

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

    console.log(`📥 Restore ${dryRun ? '(DRY RUN) ' : ''}Starting...\n`);
    console.log(`📂 Source: ${restoreFilePath}\n`);

    // --- Fetch current live state for the safety backup + diff ---------------
    console.log('🔍 Reading current Firebase state for diff + backup...');
    const liveData = await fetchAllDataFromFirebase();

    const livePlayerIds = new Set(liveData.players.map(p => p.id));
    const filePlayerIds = new Set(restoreData.players.map(p => p.id));
    const playersOverwritten = restoreData.players.filter(p => livePlayerIds.has(p.id));
    const playersAdded = restoreData.players.filter(p => !livePlayerIds.has(p.id));
    const playersUntouched = liveData.players.filter(p => !filePlayerIds.has(p.id));

    console.log('\n📊 Players:');
    console.log(`   • ${playersAdded.length} new, ${playersOverwritten.length} overwritten`);
    if (playersUntouched.length > 0) {
      console.log(`   ⚠️  ${playersUntouched.length} live player(s) NOT in file — left in place (not deleted):`);
      console.log(`      ${playersUntouched.map(p => p.id).join(', ')}`);
    }

    console.log('\n📊 Sessions:');
    const fileSessionIds = Object.keys(restoreData.sessions);
    for (const sessionId of fileSessionIds) {
      const incoming = restoreData.sessions[sessionId].games || [];
      const liveSession = liveData.sessions[sessionId];
      if (!liveSession) {
        console.log(`   • ${sessionId}: NEW (${incoming.length} games)`);
        continue;
      }
      const liveGameIds = new Set(liveSession.games.map(g => g.id));
      const incomingIds = new Set(incoming.map(g => g.id));
      const overwritten = incoming.filter(g => liveGameIds.has(g.id)).length;
      const added = incoming.filter(g => !liveGameIds.has(g.id)).length;
      const orphaned = liveSession.games.filter(g => !incomingIds.has(g.id));
      console.log(`   • ${sessionId}: ${added} new game(s), ${overwritten} overwritten`);
      if (orphaned.length > 0) {
        console.log(`      ⚠️  ${orphaned.length} live game(s) NOT in file — left in place (not deleted): ${orphaned.map(g => g.id).join(', ')}`);
      }
    }
    const liveOnlySessions = Object.keys(liveData.sessions).filter(s => !fileSessionIds.includes(s));
    if (liveOnlySessions.length > 0) {
      console.log(`   ⚠️  ${liveOnlySessions.length} live session(s) NOT in file — left in place (not deleted): ${liveOnlySessions.join(', ')}`);
    }

    if (dryRun) {
      console.log('\n🚫 Dry run — no changes written. Re-run without --dry-run to apply.');
      process.exit(0);
    }

    // --- Safety backup of current live state --------------------------------
    const archivedDir = path.join(__dirname, '../../archived-data');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').split('Z')[0];
    const backupPath = path.join(archivedDir, `pre-restore-backup-${stamp}.json`);
    saveDataToFile(liveData, backupPath);
    console.log(`\n💾 Safety backup of current Firebase saved: archived-data/${path.basename(backupPath)}\n`);

    // --- Restore global players (merge to preserve commanderArt) -------------
    console.log(`📝 Restoring ${restoreData.players.length} global players...`);
    const playersCollection = db.collection('players');

    for (const player of restoreData.players) {
      // Full object + merge: keeps live fields (e.g. commanderArt) the file
      // doesn't carry, while still applying any fields the file does provide.
      await playersCollection.doc(player.id).set(player, { merge: true });
    }
    console.log(`✓ ${restoreData.players.length} players restored to /players\n`);

    // --- Restore sessions and their games -----------------------------------
    console.log(`📚 Restoring ${fileSessionIds.length} session(s)...\n`);

    for (const sessionId of fileSessionIds) {
      const session = restoreData.sessions[sessionId];
      const games = session.games || [];

      console.log(`📌 Session: "${sessionId}"`);
      console.log(`   Name: ${session.name}`);
      console.log(`   Games: ${games.length}`);

      // Create session document (omit undefined fields — Firestore rejects them)
      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionData: any = {
        name: session.name,
        createdAt: session.createdAt,
        updatedAt: new Date().toISOString(),
      };
      if (session.description !== undefined) {
        sessionData.description = session.description;
      }
      if (session.players && session.players.length > 0) {
        sessionData.players = session.players;
      }

      await sessionRef.set(sessionData, { merge: true });

      // Restore games for this session
      if (games.length > 0) {
        const gamesCollection = sessionRef.collection('games');

        for (const game of games) {
          await gamesCollection.doc(game.id).set({
            id: game.id,
            dateCreated: game.dateCreated,
            notes: game.notes,
            players: game.players,
            createdAt: new Date().toISOString(),
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
    console.log(`   - Sessions: ${fileSessionIds.length}`);
    for (const sessionId of fileSessionIds) {
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
