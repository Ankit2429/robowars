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
    
    // Wait for PGlite to be fully initialized (it's async)
    const { waitForDB } = await import("@workspace/db");
    logger.info("Waiting for PGlite to be ready...");
    await waitForDB();
    logger.info("PGlite is ready");

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

  const { isPostgres } = await import("@workspace/db");
  const usePostgres = isPostgres();

  try {
    if (usePostgres) {
      logger.info("Verifying PostgreSQL connection...");
      await client`SELECT 1`;
      logger.info("PostgreSQL connection verified");
    } else if (client.waitReady && typeof client.waitReady.then === "function") {
      logger.info("Awaiting PGlite waitReady promise...");
      await client.waitReady;
      logger.info("PGlite waitReady resolved");
    } else {
      logger.info("Testing PGlite connection...");
      await client.query("SELECT 1");
      logger.info("PGlite connection verified");
    }
  } catch (err: any) {
    logger.error({ err: err.message }, "Database initial readiness check failed, retrying in 3s...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      if (usePostgres) {
        await client`SELECT 1`;
      } else {
        await client.query("SELECT 1");
      }
      logger.info("Database retry query succeeded");
    } catch (err2: any) {
      logger.error({ err: err2.message }, "Database STILL failing after retry");
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
    {
      name: "tournaments",
      sql: `CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'RoboWars Tournament',
        status TEXT NOT NULL DEFAULT 'pending',
        current_round INTEGER NOT NULL DEFAULT 0,
        total_rounds INTEGER NOT NULL DEFAULT 0,
        winner_id INTEGER,
        active_match_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
    },

    {
      name: "tournament_players",
      sql: `CREATE TABLE IF NOT EXISTS tournament_players (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL,
        pilot_name TEXT NOT NULL,
        robot_name TEXT NOT NULL DEFAULT 'Unknown Robot',
        seed INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
    },
    {
      name: "tournament_rounds",
      sql: `CREATE TABLE IF NOT EXISTS tournament_rounds (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL,
        round_number INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
    },
    {
      name: "tournament_matches",
      sql: `CREATE TABLE IF NOT EXISTS tournament_matches (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL,
        round_id INTEGER NOT NULL,
        round_number INTEGER NOT NULL,
        match_number INTEGER NOT NULL,
        player1_id INTEGER,
        player2_id INTEGER,
        player1_name TEXT,
        player2_name TEXT,
        player1_robot_name TEXT,
        player2_robot_name TEXT,
        winner_id INTEGER,
        winner_name TEXT,
        is_bye BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
    },
  ];


  for (const table of tables) {
    try {
      if (usePostgres) {
        await client.unsafe(table.sql);
      } else {
        await client.query(table.sql);
      }
      logger.info({ table: table.name }, "Table ensured");
    } catch (err: any) {
      logger.error({ table: table.name, err: err.message, stack: err.stack }, "FAILED to create table");
    }
  }

  // ── Column migrations: add new columns to existing tables ──────────────────
  // ALTER TABLE ADD COLUMN IF NOT EXISTS is idempotent — safe to run every boot
  const migrations = [
    {
      desc: "tournaments.active_match_id",
      sql: `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS active_match_id INTEGER`,
    },
    {
      desc: "tournaments.winner_id",
      sql: `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS winner_id INTEGER`,
    },
    {
      desc: "tournament_matches.winner_id",
      sql: `ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS winner_id INTEGER`,
    },
    {
      desc: "tournament_matches.winner_name",
      sql: `ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS winner_name TEXT`,
    },
    {
      desc: "tournament_matches.is_bye",
      sql: `ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS is_bye BOOLEAN NOT NULL DEFAULT false`,
    },
    {
      desc: "tournament_matches.side",
      sql: `ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS side TEXT NOT NULL DEFAULT 'L'`,
    },
    {
      desc: "tournament_matches.battle_room_id",
      sql: `ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS battle_room_id TEXT`,
    },
    {
      desc: "leaderboard.points",
      sql: `ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 1000`,
    },
    {
      desc: "leaderboard.credits",
      sql: `ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0`,
    },
  ];


  for (const m of migrations) {
    try {
      if (usePostgres) {
        await client.unsafe(m.sql);
      } else {
        await client.query(m.sql);
      }
      logger.info({ migration: m.desc }, "Migration applied");
    } catch (err: any) {
      logger.warn({ migration: m.desc, err: err.message }, "Migration skipped (may already exist)");
    }
  }
}



boot();
