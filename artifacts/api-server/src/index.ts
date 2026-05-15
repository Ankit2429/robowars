import { createServer } from "http";
import app from "./app";
import { setupSocketIO } from "./socket";
import { logger } from "./lib/logger";
// ── Global Error Handlers ───────────────────────────────────────────────────
// Catch unhandled errors that would otherwise crash the process silently
process.on("uncaughtException", (err) => {
  logger.error({ err: err.message, stack: err.stack }, "UNCAUGHT EXCEPTION — Process exiting");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "UNHANDLED REJECTION");
});

async function boot() {
  try {
    logger.info("Starting backend boot sequence...");

    const port = Number(process.env["PORT"]) || 8080;
    logger.info({ port }, "Configuration loaded");

    const server = createServer(app);
    
    // Ensure database schema exists before starting
    await ensureSchema();
    logger.info("Database schema verified");

    setupSocketIO(server);
    logger.info("Socket.IO initialized");

    server.listen(port, "0.0.0.0", () => {
      logger.info({ port }, "Server successfully listening on 0.0.0.0");
    });

    server.on("error", (err: Error) => {
      logger.error({ err }, "Server runtime error");
    });

  } catch (err: any) {
    logger.error({ err: err.message, stack: err.stack }, "FATAL BOOT FAILURE");
    process.exit(1);
  }
}

async function ensureSchema() {
  const { client } = await import("@workspace/db");

  // PGlite must be fully initialized before queries
  try {
    if (typeof client.waitReady === "function") {
      logger.info("Waiting for PGlite to be ready...");
      await client.waitReady;
      logger.info("PGlite is ready");
    } else {
      // Try a simple query to ensure connection
      logger.info("Testing PGlite connection...");
      await client.query("SELECT 1");
      logger.info("PGlite connection verified");
    }
  } catch (err: any) {
    logger.error({ err: err.message, stack: err.stack }, "PGlite NOT READY — waiting and retrying...");
    // Wait a bit and try again
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
      await client.query("SELECT 1");
      logger.info("PGlite connection verified on retry");
    } catch (err2: any) {
      logger.error({ err: err2.message }, "PGlite STILL NOT READY after retry — schema creation may fail");
    }
  }

  const tables = [
    {
      name: "players",
      sql: `CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        usn TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        branch TEXT NOT NULL,
        access_code TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Registered',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
    },
    {
      name: "access_codes",
      sql: `CREATE TABLE IF NOT EXISTS access_codes (
        code TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
    },
    {
      name: "settings",
      sql: `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
    },
    {
      name: "robots",
      sql: `CREATE TABLE IF NOT EXISTS robots (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        player_name TEXT NOT NULL,
        body_part_id TEXT NOT NULL,
        attack_part_id TEXT NOT NULL,
        defense_part_id TEXT NOT NULL,
        secondary_weapon_id TEXT,
        total_stats JSONB NOT NULL,
        special_ability TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
    },
    {
      name: "rooms",
      sql: `CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        host_name TEXT,
        status TEXT NOT NULL DEFAULT 'waiting',
        player_count INTEGER NOT NULL DEFAULT 1,
        max_players INTEGER NOT NULL DEFAULT 2,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
    },
    {
      name: "leaderboard",
      sql: `CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        player_name TEXT NOT NULL UNIQUE,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        total_battles INTEGER NOT NULL DEFAULT 0,
        win_rate REAL NOT NULL DEFAULT 0,
        favorite_robot TEXT,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
    },
  ];

  for (const table of tables) {
    try {
      await client.query(table.sql);
      logger.info({ table: table.name }, "Table ensured");
    } catch (err: any) {
      logger.error({ table: table.name, err: err.message, stack: err.stack }, "FAILED to create table");
    }
  }
}


boot();
