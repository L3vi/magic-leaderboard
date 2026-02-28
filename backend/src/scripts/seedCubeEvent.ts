import 'dotenv/config';
import { db } from '../firebase';

/**
 * Seed Script: Create initial cube event and players in Firestore
 *
 * Usage:
 *   npx ts-node src/scripts/seedCubeEvent.ts
 */

const PLAYERS = [
  { id: "player-matt", name: "Matt" },
  { id: "player-levi", name: "Levi" },
  { id: "player-ben", name: "Ben" },
  { id: "player-4", name: "Jim" },
  { id: "player-5", name: "Player 5" },
  { id: "player-6", name: "Player 6" },
  { id: "player-7", name: "Player 7" },
  { id: "player-8", name: "Player 8" },
  { id: "player-9", name: "Player 9" },
  { id: "player-10", name: "Player 10" },
  { id: "player-11", name: "Player 11" },
  { id: "player-12", name: "Player 12" },
  { id: "player-13", name: "Player 13" },
  { id: "player-14", name: "Player 14" },
  { id: "player-15", name: "Player 15" },
  { id: "player-16", name: "Player 16" },
];

async function seedCubeEvent() {
  try {
    // 1. Seed players into global players collection
    console.log("Seeding players...");
    const playersCollection = db.collection("players");
    for (const player of PLAYERS) {
      await playersCollection.doc(player.id).set({ name: player.name });
    }
    console.log(`  ${PLAYERS.length} players seeded`);

    // 2. Create the cube event
    const eventId = "2026-February";
    const cubeEvent = {
      name: "February 2026 Cube Weekend",
      date: "2026-02-27T00:00:00.000Z",
      description: "Cube Draft weekend - February 2026",
      players: PLAYERS.map(p => p.id),
      cubes: [
        { id: "cube-jims", name: "DNS Cube", description: "DNS Cube" },
        { id: "cube-matts", name: "Vintage Cube", description: "Vintage Cube" },
        { id: "cube-commander", name: "Commander Cube", description: "Commander Cube" },
        { id: "cube-fair-vintage", name: "Fair Vintage? Cube", description: "Fair Vintage? Cube" },
        { id: "cube-final-fantasy", name: "Final Fantasy Draft", description: "Final Fantasy Draft" },
        { id: "cube-avatar", name: "Avatar Draft", description: "Avatar Draft" },
        { id: "cube-mtgo", name: "MTGO Cube", description: "MTGO Cube" },
      ],
      drafts: [],
      matches: [],
    };

    console.log(`Seeding cube event: ${eventId}`);
    const eventRef = db.collection("cube-events").doc(eventId);
    await eventRef.set(cubeEvent);

    console.log(`Cube event "${eventId}" created successfully`);
    console.log(`  Players: ${cubeEvent.players.length}`);
    console.log(`  Cubes: ${cubeEvent.cubes.map(c => c.name).join(", ")}`);

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedCubeEvent();
