import 'dotenv/config';
import { db } from './firebase';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Convert old ranking-based format to new game-based format
 * 
 * Old format: { scores: { players: [ { name, first, second, third, fourth, score } ] } }
 * New format: Array of games with individual placements
 */

function convertOldFormatToGames(oldData: any): { players: any[]; games: any[] } {
  const players = oldData.scores?.players || [];
  const games: any[] = [];
  
  // Create a "ranking summary" game entry to preserve historical data
  // This represents the aggregate rankings from the old system
  if (players.length > 0) {
    const rankingGame = {
      id: `ranking-summary-${Date.now()}`,
      dateCreated: new Date(Date.now() - 86400000 * 7).toISOString(), // ~1 week ago as placeholder
      notes: 'Historical ranking data imported from previous leaderboard system',
      players: players.map((p: any) => ({
        playerId: `player-${p.name.toLowerCase().replace(/\s+/g, '-')}`,
        placement: 1, // This is a summary, not individual games
        commander: 'Unknown' // Old format didn't track commanders
      }))
    };
    games.push(rankingGame);
  }

  // Convert players to new format
  const playersList = players.map((p: any) => ({
    id: `player-${p.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: p.name,
    // Store the old ranking stats as metadata
    _legacyStats: {
      first: p.first,
      second: p.second,
      third: p.third,
      fourth: p.fourth,
      score: p.score
    }
  }));

  return { players: playersList, games };
}

async function importSession(sessionId: string, dataFile: string) {
  try {
    console.log(`\n📥 Importing session: ${sessionId}`);
    console.log(`   From file: ${dataFile}\n`);

    if (!fs.existsSync(dataFile)) {
      throw new Error(`File not found: ${dataFile}`);
    }

    const fileContent = fs.readFileSync(dataFile, 'utf-8');
    const oldData = JSON.parse(fileContent);
    const { players, games } = convertOldFormatToGames(oldData);

    // Create session
    const sessionRef = db.collection('sessions').doc(sessionId);
    await sessionRef.set({
      createdAt: new Date().toISOString(),
      name: sessionId,
      description: `Magic Leaderboard session for ${sessionId}`
    });
    console.log(`✓ Session created\n`);

    // Import players
    if (players.length > 0) {
      console.log(`👥 Importing ${players.length} players...`);
      const playersCollection = sessionRef.collection('players');
      for (const player of players) {
        await playersCollection.doc(player.id).set(player);
      }
      console.log(`✓ Players imported\n`);
    }

    // Import games
    if (games.length > 0) {
      console.log(`🎮 Importing ${games.length} game records...`);
      const gamesCollection = sessionRef.collection('games');
      for (const game of games) {
        const { id, ...gameData } = game;
        await gamesCollection.doc(id).set(gameData);
      }
      console.log(`✓ Games imported\n`);
    }

    console.log(`✅ Session "${sessionId}" ready!`);
  } catch (error) {
    console.error(`❌ Import failed: ${error}`);
    throw error;
  }
}

async function main() {
  try {
    // Create 2025-May session from old data
    await importSession('2025-May', path.join(__dirname, '../../archived-data/2025-may.json'));
    
    // Create empty 2025-December session for current games
    console.log(`\n📥 Creating session: 2025-December`);
    const sessionRef = db.collection('sessions').doc('2025-December');
    await sessionRef.set({
      createdAt: new Date().toISOString(),
      name: '2025-December',
      description: 'Magic Leaderboard session for 2025-December'
    });
    console.log(`✓ Session created`);
    console.log(`✅ Session "2025-December" ready!\n`);

    console.log('✨ All sessions imported successfully!\n');
    console.log('Available sessions:');
    console.log('  - 2025-May (historical data)');
    console.log('  - 2025-December (current)\n');
    console.log('API defaults to 2025-December. Use ?session=2025-May to view old data\n');

    process.exit(0);
  } catch (error) {
    console.error('Failed to import sessions:', error);
    process.exit(1);
  }
}

main();
