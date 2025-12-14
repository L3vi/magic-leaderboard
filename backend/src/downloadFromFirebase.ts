import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fetchAllDataFromFirebase, saveDataToFile } from './firebaseUtils';

/**
 * Download data from Firebase and create fallback JSON files
 * 
 * Creates:
 * - archived-data/firebase-backup.json (complete backup)
 * - backend/data/players.json (fallback)
 * - backend/data/games.json (fallback)
 * 
 * Usage: npm run download-from-firebase
 */
async function downloadFromFirebase() {
  try {
    console.log('📥 Downloading data from Firebase...\n');

    console.log('👥 Fetching players...');
    console.log('📚 Fetching sessions...');
    const data = await fetchAllDataFromFirebase();

    // Save complete backup
    const backupPath = path.join(__dirname, '../../archived-data/firebase-backup.json');
    saveDataToFile(data, backupPath);
    console.log(`💾 Backup saved to: archived-data/firebase-backup.json\n`);

    // Save fallback files
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dataDir, 'players.json'),
      JSON.stringify(data.players, null, 2)
    );
    console.log(`✓ Fallback players saved to: backend/data/players.json`);

    // Save games from latest session
    const latestSessionId = Object.keys(data.sessions).sort().reverse()[0];
    const latestGames = data.sessions[latestSessionId]?.games || [];
    fs.writeFileSync(
      path.join(dataDir, 'games.json'),
      JSON.stringify(latestGames, null, 2)
    );
    console.log(`✓ Fallback games saved to: backend/data/games.json (from ${latestSessionId})\n`);

    // Summary
    console.log('✅ Download complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Players: ${data.players.length}`);
    console.log(`   - Sessions: ${Object.keys(data.sessions).length}`);
    Object.entries(data.sessions).forEach(([sessionId, session]) => {
      console.log(`     • ${sessionId}: ${session.games.length} games`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Download failed:', error);
    process.exit(1);
  }
}

downloadFromFirebase();
