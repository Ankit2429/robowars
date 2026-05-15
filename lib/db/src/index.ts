import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";
import path from "path";
import { fileURLToPath } from "url";

import { isMainThread } from "node:worker_threads";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow overriding via environment variable for Render Persistent Disks
const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, "../../../database-pglite");

// Production-safe singleton pattern using globalThis to prevent multiple initializations
// especially useful if the module is re-loaded or bundled in a way that creates duplicates.
const globalForPglite = globalThis as unknown as {
  _pgliteInstance: PGlite | undefined;
};

function createClient(): PGlite {
  // Guard against non-main thread initialization (e.g. pino workers)
  // which can cause lock contention if they don't actually need DB access.
  if (!isMainThread) {
    console.warn(`[PGlite] Warning: Initializing PGlite in a worker thread. This may cause lock contention.`);
  }

  if (globalForPglite._pgliteInstance) {
    return globalForPglite._pgliteInstance;
  }

  try {
    console.log(`[PGlite] Attempting to initialize database at: ${dbPath}`);
    const instance = new PGlite(dbPath);
    globalForPglite._pgliteInstance = instance;
    console.log(`[PGlite] Database successfully initialized`);
    return instance;
  } catch (err: any) {
    console.error(`[PGlite] CRITICAL INITIALIZATION ERROR: ${err.message}`);
    if (err.stack) console.error(err.stack);
    // On Render, we might want to fail fast so it can restart
    throw err;
  }
}

// Initialize PGlite with persistent storage on disk
export const client = createClient();
export const db = drizzle(client, { schema });

/**
 * Simple connectivity check for health endpoints
 */
export async function checkDatabaseConnection() {
  try {
    await client.query("SELECT 1");
    return true;
  } catch (err) {
    console.error("[PGlite] Connection check failed", err);
    return false;
  }
}

export * from "./schema";
