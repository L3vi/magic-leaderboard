import 'dotenv/config';
import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Migration Script: Export old Firebase data and restructure for session-based system
 * 
 * Usage:
 * 1. Set FIREBASE_SERVICE_ACCOUNT to point to your Firebase service account JSON
 * 2. Run: npm run migrate
 * 
 * This will:
 * - Export data from your old Firebase project
 * - Save it to archived-data/old-firebase-export.json
 * - Output instructions for importing into new structure
 */

async function migrateData() {
  try {
    // Initialize Firebase with the current service account (old project)
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountPath) {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT environment variable not set');
      console.log('Set it to point to your old Firebase project service account JSON');
      process.exit(1);
    }

    const serviceAccount = require(serviceAccountPath);
    const oldApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    }, 'old-project');

    const oldDb = admin.firestore(oldApp);

    console.log('📦 Starting data migration...\n');

    // Detect which collections exist in the old project
    const collections = ['games', 'players', 'sessions'];
    const exportedData: any = {};

    for (const collectionName of collections) {
      try {
        const snapshot = await oldDb.collection(collectionName).get();
        if (!snapshot.empty) {
          exportedData[collectionName] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log(`✓ Exported ${snapshot.size} documents from "${collectionName}"`);
        }
      } catch (error) {
        console.log(`⚠️  Collection "${collectionName}" not found or empty`);
      }
    }

    // Create archived-data directory if it doesn't exist
    const archiveDir = path.join(__dirname, '../../archived-data');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Save raw export
    const exportPath = path.join(archiveDir, 'old-firebase-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportedData, null, 2));
    console.log(`\n💾 Exported data saved to: ${exportPath}\n`);

    // Generate migration instructions
    console.log('📋 NEXT STEPS:\n');
    console.log('1. Create a NEW Firebase project (or use existing with fresh database)');
    console.log('2. Download the service account for the NEW project');
    console.log('3. Set FIREBASE_SERVICE_ACCOUNT to point to the NEW project');
    console.log('4. Run: npm run seed-session -- --session="2024-Fall" --import-file=' + exportPath);
    console.log('\nThis will:');
    console.log('  - Create a session called "2024-Fall" in your new database');
    console.log('  - Import all old games and players into that session');
    console.log('  - Leave 2025-December empty for fresh data\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
