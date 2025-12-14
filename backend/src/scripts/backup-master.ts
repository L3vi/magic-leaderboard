import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fetchAllDataFromFirebase, saveDataToFile, printBackupSummary } from '../firebaseUtils';

/**
 * Backup Firebase to archived-data/master-leaderboard.json
 * 
 * This is the primary backup location, also creates timestamped copies
 * Usage: npm run backup-firebase
 */
async function backupToMaster() {
  try {
    console.log('💾 Backing up Firebase to master-leaderboard.json...\n');

    console.log('👥 Fetching players...');
    console.log('📚 Fetching sessions...');
    const data = await fetchAllDataFromFirebase();

    // Save to master-leaderboard.json
    const archivedDir = path.join(__dirname, '../../..', 'archived-data');
    const masterPath = path.join(archivedDir, 'master-leaderboard.json');
    saveDataToFile(data, masterPath);
    console.log(`✓ Master backup saved: archived-data/master-leaderboard.json`);

    // Create timestamped backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('Z')[0];
    const timestampedPath = path.join(archivedDir, `master-leaderboard-${timestamp}.json`);
    saveDataToFile(data, timestampedPath);
    console.log(`✓ Timestamped backup: archived-data/master-leaderboard-${timestamp}.json\n`);

    printBackupSummary(data);
    process.exit(0);
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

backupToMaster();
