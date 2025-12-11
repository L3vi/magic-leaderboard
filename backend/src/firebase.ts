import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin SDK
// Look for service account in multiple locations:
// 1. FIREBASE_SERVICE_ACCOUNT env variable (path to JSON file)
// 2. Default location in project root: firebase-service-account.json

let serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;

// Try default locations if not specified
if (!serviceAccountPath) {
  const projectRoot = path.resolve(__dirname, '../../');
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  
  const defaultPaths = [
    path.join(projectRoot, 'firebase-service-account.json'),
    path.join(homeDir, 'firebase-service-account.json'),
  ];
  
  for (const tryPath of defaultPaths) {
    if (fs.existsSync(tryPath)) {
      serviceAccountPath = tryPath;
      break;
    }
  }
}

if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
  console.warn('⚠️  Firebase service account not found.');
  console.warn('   Place firebase-service-account.json in project root, or');
  console.warn('   Set FIREBASE_SERVICE_ACCOUNT to the full path');
  process.exit(1);
} else {
  try {
    const serviceAccountRaw = fs.readFileSync(serviceAccountPath, 'utf-8');
    const serviceAccount = JSON.parse(serviceAccountRaw);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });
    console.log('✓ Firebase initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    process.exit(1);
  }
}

export const db = admin.firestore();
export default admin;
