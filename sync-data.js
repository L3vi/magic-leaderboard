#!/usr/bin/env node
/**
 * Sync data from master-leaderboard.json to frontend and backend data directories
 * Usage: node sync-data.js [--session SESSION_NAME]
 * 
 * This script extracts player and game data for the specified session
 * and writes it to both frontend and backend data directories.
 */

const fs = require('fs');
const path = require('path');

// Get session from CLI args or default to 2025-December
const args = process.argv.slice(2);
const sessionArg = args.find(arg => arg.startsWith('--session='));
const SESSION = sessionArg ? sessionArg.split('=')[1] : '2025-December';

const MASTER_FILE = path.join(__dirname, 'archived-data', 'master-leaderboard.json');
const FRONTEND_GAMES = path.join(__dirname, 'frontend', 'src', 'data', 'games.json');
const FRONTEND_PLAYERS = path.join(__dirname, 'frontend', 'src', 'data', 'players.json');
const BACKEND_GAMES = path.join(__dirname, 'backend', 'data', 'games.json');
const BACKEND_PLAYERS = path.join(__dirname, 'backend', 'data', 'players.json');

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

  // Write to frontend
  console.log('📝 Writing to frontend...');
  fs.writeFileSync(FRONTEND_PLAYERS, JSON.stringify(players, null, 2));
  console.log(`   ✓ ${FRONTEND_PLAYERS}`);
  fs.writeFileSync(FRONTEND_GAMES, JSON.stringify(games, null, 2));
  console.log(`   ✓ ${FRONTEND_GAMES}`);

  // Write to backend (for dev parity)
  console.log('📝 Writing to backend...');
  fs.writeFileSync(BACKEND_PLAYERS, JSON.stringify(players, null, 2));
  console.log(`   ✓ ${BACKEND_PLAYERS}`);
  fs.writeFileSync(BACKEND_GAMES, JSON.stringify(games, null, 2));
  console.log(`   ✓ ${BACKEND_GAMES}`);

  console.log('\n✅ Data synced successfully!');
  console.log(`Session: "${SESSION}"`);
  console.log(`Players: ${players.length}`);
  console.log(`Games: ${games.length}`);
} catch (error) {
  console.error('❌ Error syncing data:', error.message);
  process.exit(1);
}
