import { buildSeed, teardownSeed } from "./helpers/seed";

export default async function globalSetup() {
  // Clean any leftover seed from a crashed run, then build fresh.
  try {
    await teardownSeed();
  } catch {
    /* nothing to clean */
  }
  const seed = await buildSeed();
  // eslint-disable-next-line no-console
  console.log(`\n[e2e] Seeded company "${seed.companyName}" (${seed.companyId}) with 6 users.\n`);
}
