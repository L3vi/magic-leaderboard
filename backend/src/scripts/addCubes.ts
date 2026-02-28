import 'dotenv/config';
import { db } from '../firebase';

/**
 * Add new cubes to the active cube event.
 *
 * Usage:
 *   npx ts-node src/scripts/addCubes.ts
 */

const EVENT_ID = "2026-February";

const NEW_CUBES = [
  { id: "cube-commander", name: "Commander Cube", description: "Commander Cube" },
  { id: "cube-fair-vintage", name: "Fair Vintage? Cube", description: "Fair Vintage? Cube" },
  { id: "cube-final-fantasy", name: "Final Fantasy Draft", description: "Final Fantasy Draft" },
  { id: "cube-avatar", name: "Avatar Draft", description: "Avatar Draft" },
  { id: "cube-mtgo", name: "MTGO Cube", description: "MTGO Cube" },
];

async function addCubes() {
  try {
    const eventRef = db.collection("cube-events").doc(EVENT_ID);
    const docSnap = await eventRef.get();

    if (!docSnap.exists) {
      console.error(`Cube event "${EVENT_ID}" not found.`);
      process.exit(1);
    }

    const data = docSnap.data()!;
    const existingCubes: { id: string; name: string }[] = data.cubes || [];

    console.log(`Current cubes: ${existingCubes.map(c => c.name).join(", ")}`);

    const cubesToAdd = NEW_CUBES.filter(
      nc => !existingCubes.some(ec => ec.id === nc.id)
    );

    if (cubesToAdd.length === 0) {
      console.log("\nAll cubes already exist — nothing to add.");
      process.exit(0);
    }

    const updatedCubes = [...existingCubes, ...cubesToAdd];
    await eventRef.update({ cubes: updatedCubes });

    console.log(`\nAdded ${cubesToAdd.length} cubes:`);
    cubesToAdd.forEach(c => console.log(`  + ${c.name}`));
    console.log(`\nTotal cubes: ${updatedCubes.length}`);

    process.exit(0);
  } catch (error) {
    console.error("Failed to add cubes:", error);
    process.exit(1);
  }
}

addCubes();
