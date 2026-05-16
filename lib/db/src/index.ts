import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// DATABASE_URL is the primary connection string for Supabase/PostgreSQL
const databaseUrl = process.env.DATABASE_URL;

// Singleton instance container
const globalForDb = globalThis as unknown as {
  _instance: any | undefined;
  _drizzle: any | undefined;
};

function initDb() {
  if (globalForDb._instance) return;

  if (!databaseUrl) {
    const errorMsg = "[DB] FATAL ERROR: DATABASE_URL is not set. Supabase connection string is required.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  console.log(`[DB] Using PostgreSQL connection (Supabase)`);
  try {
    const client = postgres(databaseUrl, {
      ssl: { rejectUnauthorized: false }, // Common for Supabase/Render
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    globalForDb._instance = client;
    globalForDb._drizzle = drizzle(client, { schema });
    console.log(`[DB] PostgreSQL client initialized`);
  } catch (err: any) {
    console.error(`[DB] FAILED to initialize PostgreSQL: ${err.message}`);
    throw err;
  }
}

initDb();

export const client = globalForDb._instance;
export const db = globalForDb._drizzle;

export async function waitForDB(): Promise<void> {
  // DB connects synchronously for postgres
  return Promise.resolve();
}

export async function checkDatabaseConnection() {
  try {
    await client`SELECT 1`;
    return true;
  } catch (err) {
    console.error("[DB] Connection check failed", err);
    return false;
  }
}

export function isPostgres() {
  return true;
}

export * from "./schema";
