import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";
import path from "path";
import { fileURLToPath } from "url";

import { isMainThread } from "node:worker_threads";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from "fs";

// Allow overriding via environment variable for Render Persistent Disks
const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, "../../../database-pglite");

// Verify directory is writable
try {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    console.log(`[PGlite] Creating database directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
  // Try to write a test file
  const testFile = path.join(dir, ".write-test");
  fs.writeFileSync(testFile, "test");
  fs.unlinkSync(testFile);
  console.log(`[PGlite] Database directory is writable: ${dir}`);
} catch (err: any) {
  console.error(`[PGlite] WARNING: Database directory may not be writable: ${err.message}`);
}

// Production-safe singleton pattern using globalThis to prevent multiple initializations
const globalForPglite = globalThis as unknown as {
  _pgliteInstance: PGlite | undefined;
  _pgliteReady: Promise<void> | undefined;
};

function createClient(): PGlite {
  if (!isMainThread) {
    console.warn(`[PGlite] Warning: Initializing PGlite in a worker thread.`);
  }

  if (globalForPglite._pgliteInstance) {
    return globalForPglite._pgliteInstance;
  }

  try {
    console.log(`[PGlite] Attempting to initialize database at: ${dbPath}`);
    const instance = new PGlite(dbPath);
    globalForPglite._pgliteInstance = instance;

    // PGlite constructor is async — store the readiness promise
    // The instance itself implements PromiseLike, so we can await it
    globalForPglite._pgliteReady = (async () => {
      try {
        // PGlite v0.2.x: the instance is a PromiseLike that resolves when ready
        if (instance.waitReady) {
          await instance.waitReady;
        } else {
          // Fallback: await the instance itself (it implements PromiseLike)
          await (instance as any);
        }
        console.log(`[PGlite] Database READY and accepting queries`);
      } catch (err: any) {
        console.error(`[PGlite] waitReady FAILED: ${err.message}`);
        // Try to recover by just waiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    })();

    console.log(`[PGlite] Database instance created (awaiting readiness...)`);
    return instance;
  } catch (err: any) {
    console.error(`[PGlite] CRITICAL INITIALIZATION ERROR: ${err.message}`);
    if (err.stack) console.error(err.stack);
    throw err;
  }
}

// Initialize PGlite with persistent storage on disk
export const client = createClient();
export const db = drizzle(client, { schema });

/**
 * Wait for PGlite to be fully initialized.
 * MUST be called before the first query in production.
 */
export async function waitForDB(): Promise<void> {
  if (globalForPglite._pgliteReady) {
    await globalForPglite._pgliteReady;
  }
}

/**
 * Simple connectivity check for health endpoints
 */
export async function checkDatabaseConnection() {
  try {
    await waitForDB();
    await client.query("SELECT 1");
    return true;
  } catch (err) {
    console.error("[PGlite] Connection check failed", err);
    return false;
  }
}

export * from "./schema";
