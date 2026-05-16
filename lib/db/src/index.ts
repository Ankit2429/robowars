import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import * as schema from "./schema";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { isMainThread } from "node:worker_threads";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DATABASE_URL is the primary connection string for Supabase/PostgreSQL
const databaseUrl = process.env.DATABASE_URL;
const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, "../../../database-pglite");

// Singleton instance container
const globalForDb = globalThis as unknown as {
  _instance: any | undefined;
  _drizzle: any | undefined;
  _ready: Promise<void> | undefined;
  _type: "pglite" | "postgres" | undefined;
};

function initDb() {
  if (globalForDb._instance) return;

  if (databaseUrl) {
    console.log(`[DB] Using PostgreSQL connection (Supabase)`);
    try {
      const client = postgres(databaseUrl, {
        ssl: { rejectUnauthorized: false }, // Common for Supabase/Render
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      globalForDb._instance = client;
      globalForDb._drizzle = drizzlePostgres(client, { schema });
      globalForDb._type = "postgres";
      globalForDb._ready = Promise.resolve();
      console.log(`[DB] PostgreSQL client initialized`);
    } catch (err: any) {
      console.error(`[DB] FAILED to initialize PostgreSQL: ${err.message}`);
      throw err;
    }
  } else {
    console.log(`[DB] Using local PGlite storage`);
    const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
    
    // Ensure dir exists
    try {
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}

    const instance = new PGlite(resolvedPath, { relaxedDurability: true });
    globalForDb._instance = instance;
    globalForDb._drizzle = drizzlePglite(instance, { schema });
    globalForDb._type = "pglite";
    globalForDb._ready = (async () => {
      if (instance.waitReady) await instance.waitReady;
      console.log(`[DB] PGlite storage ready at ${resolvedPath}`);
    })();
  }
}

initDb();

export const client = globalForDb._instance;
export const db = globalForDb._drizzle;

export async function waitForDB(): Promise<void> {
  if (globalForDb._ready) {
    await globalForDb._ready;
  }
}

export async function checkDatabaseConnection() {
  try {
    await waitForDB();
    if (globalForDb._type === "postgres") {
      await client`SELECT 1`;
    } else {
      await client.query("SELECT 1");
    }
    return true;
  } catch (err) {
    console.error("[DB] Connection check failed", err);
    return false;
  }
}

export function isPostgres() {
  return globalForDb._type === "postgres";
}

export * from "./schema";
