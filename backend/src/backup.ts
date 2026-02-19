import 'dotenv/config';
import * as path from 'path';
import { fetchAllDataFromFirebase, saveDataToFile, printBackupSummary } from './firebaseUtils';

/**
 * Download data from Firebase to firebase-snapshot.json
 * 
 * Usage: npm run download-from-firebase
 */
async function backup() {
  try {
    console.log('💾 Creating Firebase snapshot...\n');

    console.log('👥 Fetching players...');
    console.log('📚 Fetching sessions...');
    const data = await fetchAllDataFromFirebase();

    const snapshotPath = path.join(__dirname, '../../archived-data/firebase-snapshot.json');
    saveDataToFile(data, snapshotPath);
    console.log(`✓ Snapshot saved: archived-data/firebase-snapshot.json\n`);

    printBackupSummary(data);
    process.exit(0);
  } catch (error) {
    console.error('❌ Snapshot failed:', error);
    process.exit(1);
  }
}

backup();
