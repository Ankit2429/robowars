import { Router } from "express";
import { db, client } from "@workspace/db";
import { playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const RegisterBody = z.object({
  name: z.string().min(2),
  usn: z.string().min(2),
  branch: z.string(),
  code: z.string(),
});

// Ensure the players table exists — called once on first request
let tableEnsured = false;
async function ensurePlayersTable() {
  if (tableEnsured) return;
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        usn TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        branch TEXT NOT NULL,
        access_code TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Registered',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    tableEnsured = true;
    console.log("[Players] players table ensured");
  } catch (err: any) {
    console.error("[Players] FAILED to ensure players table:", err.message);
  }
}

router.post("/players/register", async (req, res): Promise<void> => {
  req.log.info({ body: req.body }, "Registration attempt received");

  // Step 1: Validate request body
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.issues }, "Registration validation failed");
    res.status(400).json({ error: "Invalid registration data", details: parsed.error.issues });
    return;
  }

  const { name, usn, branch, code } = parsed.data;
  req.log.info({ name, usn, branch, code }, "Parsed registration data");

  // Step 2: Validate access code (hardcoded — no DB dependency)
  const validCodes = ['bot123'];
  if (!validCodes.includes(code)) {
    req.log.warn({ code }, "Invalid access code — rejected");
    res.status(403).json({ error: "Invalid Access Code" });
    return;
  }
  req.log.info({ code }, "Access code accepted");

  // Step 2.5: Ensure table exists before any DB query
  await ensurePlayersTable();

  // Step 3: Check for duplicate USN using raw SQL (bypasses Drizzle ORM issues)
  try {
    req.log.info({ usn }, "Checking for existing USN via raw SQL...");
    const result = await client.query("SELECT id FROM players WHERE usn = $1", [usn]);
    req.log.info({ rowCount: result.rows.length, usn }, "USN lookup result");
    if (result.rows.length > 0) {
      req.log.warn({ usn }, "USN already registered — rejected");
      res.status(409).json({ error: "USN already registered" });
      return;
    }
  } catch (err: any) {
    req.log.error({ err: err.message, stack: err.stack, usn }, "FAILED to check USN — DB error");
    res.status(500).json({ error: "Database error checking USN", detail: err.message });
    return;
  }

  // Step 4: Insert new player using raw SQL
  try {
    req.log.info({ name, usn, branch, code }, "Inserting new player via raw SQL...");
    const result = await client.query(
      "INSERT INTO players (usn, name, branch, access_code, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [usn, name, branch, code, "Registered"]
    );
    const player = result.rows[0] as any;
    req.log.info({ playerId: player.id, usn, name }, "Player registered successfully");
    res.status(201).json(player);
  } catch (err: any) {
    req.log.error({ err: err.message, stack: err.stack, name, usn }, "FAILED to insert player — DB error");
    res.status(500).json({ error: "Database error inserting player", detail: err.message });
  }
});

router.get("/players", async (req, res) => {
  await ensurePlayersTable();
  try {
    const result = await client.query("SELECT * FROM players ORDER BY id DESC");
    res.json(result.rows);
  } catch (err: any) {
    req.log.error({ err: err.message, stack: err.stack }, "FAILED to list players");
    res.status(500).json({ error: "Failed to list players", detail: err.message });
  }
});

export default router;
