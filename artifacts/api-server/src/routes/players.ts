import { Router } from "express";
import { db, waitForDB } from "@workspace/db";
import { playersTable, leaderboardTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const RegisterBody = z.object({
  name: z.string().min(2),
  usn: z.string().min(2),
  branch: z.string(),
  code: z.string(),
});

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

  // Step 2: Validate access code (hardcoded)
  const validCodes = ['bot123'];
  if (!validCodes.includes(code)) {
    req.log.warn({ code }, "Invalid access code — rejected");
    res.status(403).json({ error: "Invalid Access Code" });
    return;
  }
  req.log.info({ code }, "Access code accepted");

  // Step 3: Ensure database readiness
  try {
    await waitForDB();
  } catch (err: any) {
    req.log.error({ err: err.message }, "Database not ready for registration");
    res.status(500).json({ error: "Database not ready", detail: err.message });
    return;
  }

  // Step 4: Check for existing USN (Login Flow)
  try {
    req.log.info({ usn }, "Checking for existing USN...");
    const existing = await db.select().from(playersTable).where(eq(playersTable.usn, usn));
    if (existing.length > 0) {
      req.log.info({ usn }, "USN found. Logging in pilot.");
      // Fetch leaderboard data
      const [lb] = await db.select().from(leaderboardTable).where(eq(leaderboardTable.playerName, usn));
      const points = lb?.points ?? 1000;
      const credits = lb?.credits ?? 0;
      const wins = lb?.wins ?? 0;
      const eliminated = existing[0].status === "Eliminated";
      
      res.status(200).json({ ...existing[0], points, credits, wins, eliminated });
      return;
    }
  } catch (err: any) {
    req.log.error({ err: err.message, stack: err.stack, usn }, "FAILED to check USN");
    res.status(500).json({ error: "Database error checking USN", detail: err.message });
    return;
  }

  // Step 5: Insert new player (Registration Flow)
  try {
    req.log.info({ name, usn, branch, code }, "Inserting new player...");
    const [player] = await db.insert(playersTable).values({
      name,
      usn,
      branch,
      accessCode: code,
      status: "Registered",
    }).returning();

    // Initialize leaderboard entry with default points
    await db.insert(leaderboardTable).values({
      playerName: usn,
      points: 1000,
      credits: 0,
      wins: 0,
      losses: 0,
      totalBattles: 0,
      winRate: 0,
    });

    req.log.info({ playerId: player.id, usn, name }, "Player registered successfully");
    res.status(201).json({ ...player, points: 1000, credits: 0, wins: 0, eliminated: false });
  } catch (err: any) {
    req.log.error({ err: err.message, stack: err.stack, name, usn }, "FAILED to insert player");
    res.status(500).json({ error: "Database error inserting player", detail: err.message });
  }
});

router.get("/players", async (req, res) => {
  try {
    await waitForDB();
    const players = await db.select().from(playersTable).orderBy(playersTable.id);
    res.json(players);
  } catch (err: any) {
    req.log.error({ err: err.message, stack: err.stack }, "FAILED to list players");
    res.status(500).json({ error: "Failed to list players", detail: err.message });
  }
});
// ── DELETE /api/players/clear — wipe ALL players ──────────────────────────────
router.delete("/players/clear", async (req, res) => {
  try {
    await waitForDB();
    req.log.warn("CLEARING all players from database — admin request");
    await db.delete(playersTable);
    req.log.info("All players cleared successfully");
    res.json({ success: true, message: "All players cleared" });
  } catch (err: any) {
    req.log.error({ err: err.message, stack: err.stack }, "FAILED to clear players");
    res.status(500).json({ error: "Failed to clear players", detail: err.message });
  }
});

export default router;
