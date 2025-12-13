#!/usr/bin/env node
/**
 * Sync data from master-leaderboard.json to frontend data directory
 * Usage: node sync-data.js [--session SESSION_NAME]
 * 
 * This script extracts player and game data for the specified session
 * and writes it to the frontend src/data directory.
 * 
 * Source of truth: archived-data/master-leaderboard.json
 */

const fs = require('fs');
const path = require('path');

// Get session from CLI args or default to 2025-December
const args = process.argv.slice(2);
const sessionArg = args.find(arg => arg.startsWith('--session='));
const SESSION = sessionArg ? sessionArg.split('=')[1] : '2025-December';

const MASTER_FILE = path.join(__dirname, 'archived-data', 'master-leaderboard.json');
const FRONTEND_DATA_DIR = path.join(__dirname, 'frontend', 'src', 'data');
const FRONTEND_GAMES = path.join(FRONTEND_DATA_DIR, 'games.json');
const FRONTEND_PLAYERS = path.join(FRONTEND_DATA_DIR, 'players.json');

try {
  console.log(`📂 Reading master leaderboard from ${MASTER_FILE}`);
  const masterData = JSON.parse(fs.readFileSync(MASTER_FILE, 'utf8'));

  // Extract players (same for all sessions)
  const players = masterData.players;
  console.log(`👥 Found ${players.length} players`);

  // Extract games for the specified session
  const sessionData = masterData.sessions[SESSION];
  if (!sessionData) {
    const availableSessions = Object.keys(masterData.sessions);
    console.error(
      `❌ Session "${SESSION}" not found in master file.\n` +
      `Available sessions: ${availableSessions.join(', ')}`
    );
    process.exit(1);
  }

  const games = sessionData.games || [];
  console.log(`🎮 Found ${games.length} games for session "${SESSION}"\n`);

  // Ensure frontend data directory exists
  if (!fs.existsSync(FRONTEND_DATA_DIR)) {
    fs.mkdirSync(FRONTEND_DATA_DIR, { recursive: true });
  }

  // Write to frontend
  console.log('📝 Writing to frontend...');
  fs.writeFileSync(FRONTEND_PLAYERS, JSON.stringify(players, null, 2));
  console.log(`   ✓ ${FRONTEND_PLAYERS}`);
  fs.writeFileSync(FRONTEND_GAMES, JSON.stringify(games, null, 2));
  console.log(`   ✓ ${FRONTEND_GAMES}`);

  console.log('\n✅ Data synced successfully!');
  console.log(`Session: "${SESSION}"`);
  console.log(`Players: ${players.length}`);
  console.log(`Games: ${games.length}`);
} catch (error) {
  console.error('❌ Error syncing data:', error.message);
  process.exit(1);
}
