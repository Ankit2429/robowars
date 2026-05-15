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
    console.warn(`[PGlite] Warning: Initializing PGlite in a worker thread. This is not recommended for production.`);
  }

  if (globalForPglite._pgliteInstance) {
    return globalForPglite._pgliteInstance;
  }

  // Normalize path to absolute
  const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

  try {
    console.log(`[PGlite] STARTUP: Attempting initialization`);
    console.log(`[PGlite] PATH: ${resolvedPath}`);
    console.log(`[PGlite] CWD: ${process.cwd()}`);
    console.log(`[PGlite] ENV: ${process.env.NODE_ENV}`);

    // Verify directory writability for the actual dbPath, not just parent
    if (resolvedPath !== "memory") {
       try {
         if (!fs.existsSync(resolvedPath)) {
           console.log(`[PGlite] Creating data directory: ${resolvedPath}`);
           fs.mkdirSync(resolvedPath, { recursive: true });
         }
         const testFile = path.join(resolvedPath, ".lock-test");
         fs.writeFileSync(testFile, Date.now().toString());
         fs.unlinkSync(testFile);
       } catch (err: any) {
         console.error(`[PGlite] DISK ERROR: Cannot write to ${resolvedPath}. Falling back to memory. Error: ${err.message}`);
         // Fallback to memory if disk is not writable
         const memoryInstance = new PGlite();
         globalForPglite._pgliteInstance = memoryInstance;
         globalForPglite._pgliteReady = (async () => {
           if (memoryInstance.waitReady) await memoryInstance.waitReady;
           console.log(`[PGlite] IN-MEMORY FALLBACK READY (Data will not persist)`);
         })();
         return memoryInstance;
       }
    }

    // Initialize with relaxed durability to help with container filesystem locks/latency
    const instance = new PGlite(resolvedPath, {
      relaxedDurability: true,
    });
    
    globalForPglite._pgliteInstance = instance;

    globalForPglite._pgliteReady = (async () => {
      try {
        console.log(`[PGlite] Awaiting readiness...`);
        // Use a timeout for the readiness check to prevent infinite hanging
        const readyPromise = instance.waitReady || (instance as any);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("PGlite readiness TIMEOUT after 15s")), 15000)
        );

        await Promise.race([readyPromise, timeoutPromise]);
        console.log(`[PGlite] Database READY at ${resolvedPath}`);
      } catch (err: any) {
        console.error(`[PGlite] READINESS FAILED: ${err.message}`);
        if (err.message.includes("mutex") || err.message.includes("lock")) {
           console.error(`[PGlite] LOCK CONTENTION DETECTED. This usually means another process is accessing the DB.`);
        }
        // If it hangs or fails, we're in trouble, but let's not crash the boot
      }
    })();

    return instance;
  } catch (err: any) {
    console.error(`[PGlite] CRITICAL BOOT ERROR: ${err.message}`);
    if (err.stack) console.error(err.stack);
    
    // Last ditch fallback to memory so the server can at least start
    console.log(`[PGlite] Falling back to IN-MEMORY due to boot failure`);
    const fallback = new PGlite();
    globalForPglite._pgliteInstance = fallback;
    globalForPglite._pgliteReady = Promise.resolve();
    return fallback;
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
