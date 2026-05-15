import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable, accessCodesTable } from "@workspace/db";
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

  // Step 2: Validate access code
  try {
    req.log.info({ code }, "Checking access code against database...");
    const codes = await db.select().from(accessCodesTable).where(eq(accessCodesTable.code, code));
    req.log.info({ foundCodes: codes.length, code }, "Access code DB lookup result");

    if (codes.length === 0) {
      // Fallback default codes if none exist in the database yet
      const defaultCodes = ['bot123'];
      req.log.info({ defaultCodes, providedCode: code, match: defaultCodes.includes(code) }, "No DB code found, checking defaults");
      if (!defaultCodes.includes(code)) {
        req.log.warn({ code }, "Invalid access code — rejected");
        res.status(403).json({ error: "Invalid Access Code" });
        return;
      }
    }
  } catch (err: any) {
    req.log.error({ err: err.message, stack: err.stack, code }, "FAILED to check access code — DB error");
    res.status(500).json({ error: "Database error checking access code", detail: err.message });
    return;
  }

  // Step 3: Check for duplicate USN
  try {
    req.log.info({ usn }, "Checking for existing USN...");
    const existing = await db.select().from(playersTable).where(eq(playersTable.usn, usn));
    req.log.info({ existingCount: existing.length, usn }, "USN lookup result");
    if (existing.length > 0) {
      req.log.warn({ usn }, "USN already registered — rejected");
      res.status(409).json({ error: "USN already registered" });
      return;
    }
  } catch (err: any) {
    req.log.error({ err: err.message, stack: err.stack, usn }, "FAILED to check USN — DB error");
    res.status(500).json({ error: "Database error checking USN", detail: err.message });
    return;
  }

  // Step 4: Insert new player
  try {
    req.log.info({ name, usn, branch, code }, "Inserting new player...");
    const [player] = await db.insert(playersTable).values({
      name,
      usn,
      branch,
      accessCode: code,
      status: "Registered",
    }).returning();

    req.log.info({ playerId: player.id, usn, name }, "Player registered successfully");
    res.status(201).json(player);
  } catch (err: any) {
    req.log.error({ err: err.message, stack: err.stack, name, usn }, "FAILED to insert player — DB error");
    res.status(500).json({ error: "Database error inserting player", detail: err.message });
  }
});

router.get("/players", async (req, res) => {
  try {
    const players = await db.select().from(playersTable);
    res.json(players);
  } catch (err: any) {
    req.log.error({ err: err.message, stack: err.stack }, "FAILED to list players");
    res.status(500).json({ error: "Failed to list players", detail: err.message });
  }
});

export default router;
