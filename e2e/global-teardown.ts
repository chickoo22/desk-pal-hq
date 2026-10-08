import { teardownSeed } from "./helpers/seed";

export default async function globalTeardown() {
  if (process.env.E2E_KEEP_DATA === "1") {
    // eslint-disable-next-line no-console
    console.log("[e2e] E2E_KEEP_DATA=1 — leaving seeded data in place.");
    return;
  }
  await teardownSeed();
  // eslint-disable-next-line no-console
  console.log("[e2e] Seeded data removed.");
}
