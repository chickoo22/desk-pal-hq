import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Playwright/Node can't read Vite's import.meta.env, so load .env files ourselves.
function parseEnvFile(path: string): Record<string, string> {
  try {
    const text = readFileSync(path, "utf8");
    const out: Record<string, string> = {};
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[m[1]] = val;
    }
    return out;
  } catch {
    return {};
  }
}

const root = resolve(__dirname, "..", "..");
const merged: Record<string, string> = {
  ...parseEnvFile(resolve(root, ".env")),
  ...parseEnvFile(resolve(root, ".env.local")),
  ...(process.env as Record<string, string>),
};

export const env = {
  SUPABASE_URL: merged.VITE_SUPABASE_URL,
  ANON_KEY: merged.VITE_SUPABASE_PUBLISHABLE_KEY,
  SERVICE_ROLE_KEY: merged.SUPABASE_SERVICE_ROLE_KEY,
  BASE_URL: merged.E2E_BASE_URL || "http://localhost:8080",
};

export function requireServiceRole(): string {
  if (!env.SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your .env (it is git-ignored). " +
        "Find it in Supabase → Project Settings → API → service_role (secret).",
    );
  }
  if (!env.SUPABASE_URL || !env.ANON_KEY) {
    throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing from .env");
  }
  return env.SERVICE_ROLE_KEY;
}
