import 'dotenv/config';
import { db } from '../firebase';

/**
 * Reset Script: Clear all drafts and matches from the active cube event.
 * Keeps players, cubes, and event metadata intact.
 *
 * Usage:
 *   npx ts-node src/scripts/resetCubeEvent.ts
 */

const EVENT_ID = "2026-February";

async function resetCubeEvent() {
  try {
    const eventRef = db.collection("cube-events").doc(EVENT_ID);
    const docSnap = await eventRef.get();

    if (!docSnap.exists) {
      console.error(`Cube event "${EVENT_ID}" not found.`);
      process.exit(1);
    }

    const data = docSnap.data()!;
    const draftCount = (data.drafts || []).length;
    const matchCount = (data.matches || []).length;

    console.log(`Found cube event: ${data.name}`);
    console.log(`  Current drafts: ${draftCount}`);
    console.log(`  Current matches: ${matchCount}`);

    if (draftCount === 0 && matchCount === 0) {
      console.log("\nAlready clean — nothing to reset.");
      process.exit(0);
    }

    console.log("\nClearing drafts and matches...");
    await eventRef.update({ drafts: [], matches: [] });

    console.log("Done! Drafts and matches cleared.");
    console.log(`  Players kept: ${(data.players || []).length}`);
    console.log(`  Cubes kept: ${(data.cubes || []).map((c: { name: string }) => c.name).join(", ")}`);

    process.exit(0);
  } catch (error) {
    console.error("Reset failed:", error);
    process.exit(1);
  }
}

resetCubeEvent();
