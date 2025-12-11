import 'dotenv/config';
import { db } from './firebase';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Seed Script: Initialize sessions with data
 * 
 * Usage:
 * npm run seed -- --session="2024-Fall" --import-file=path/to/data.json
 * npm run seed -- --session="2025-December"  # Create empty session
 */

async function seedSession() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const sessionId = args.find(arg => arg.startsWith('--session='))?.split('=')[1] || '2025-December';
    const importFile = args.find(arg => arg.startsWith('--import-file='))?.split('=')[1];

    console.log(`🌱 Seeding session: ${sessionId}\n`);

    let playersToImport: any[] = [];
    let gamesToImport: any[] = [];

    // If import file is provided, load data
    if (importFile) {
      if (!fs.existsSync(importFile)) {
        console.error(`❌ Import file not found: ${importFile}`);
        process.exit(1);
      }

      const fileContent = fs.readFileSync(importFile, 'utf-8');
      const importedData = JSON.parse(fileContent);

      // Handle both direct arrays and nested structure
      if (Array.isArray(importedData)) {
        playersToImport = importedData.filter((item: any) => item.name);
        gamesToImport = importedData.filter((item: any) => item.players);
      } else if (importedData.players) {
        playersToImport = importedData.players;
        gamesToImport = importedData.games || [];
      } else if (importedData.games) {
        gamesToImport = importedData.games;
        playersToImport = importedData.players || [];
      }

      console.log(`📥 Loading data from: ${importFile}`);
      console.log(`   - Players: ${playersToImport.length}`);
      console.log(`   - Games: ${gamesToImport.length}\n`);
    }

    // Create/initialize session
    const sessionRef = db.collection('sessions').doc(sessionId);
    await sessionRef.set({
      createdAt: new Date().toISOString(),
      name: sessionId,
      description: `Magic Leaderboard session for ${sessionId}`
    });
    console.log(`✓ Session "${sessionId}" created\n`);

    // Import players
    if (playersToImport.length > 0) {
      console.log(`📝 Importing ${playersToImport.length} players...`);
      const playersCollection = sessionRef.collection('players');

      for (const player of playersToImport) {
        const playerId = player.id || `player-${player.name?.toLowerCase().replace(/\s+/g, '-')}`;
        await playersCollection.doc(playerId).set({
          name: player.name,
          ...player
        });
      }
      console.log(`✓ ${playersToImport.length} players imported\n`);
    }

    // Import games
    if (gamesToImport.length > 0) {
      console.log(`🎮 Importing ${gamesToImport.length} games...`);
      const gamesCollection = sessionRef.collection('games');

      for (const game of gamesToImport) {
        const gameId = game.id || `game-${Date.now()}`;
        await gamesCollection.doc(gameId).set({
          players: game.players,
          notes: game.notes || '',
          dateCreated: game.dateCreated || new Date().toISOString()
        });
      }
      console.log(`✓ ${gamesToImport.length} games imported\n`);
    }

    if (playersToImport.length === 0 && gamesToImport.length === 0) {
      console.log(`📌 Empty session created. Ready for new data!\n`);
    }

    console.log(`✅ Session "${sessionId}" is ready!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedSession();
