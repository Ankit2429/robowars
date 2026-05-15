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
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.issues }, "Registration validation failed");
    res.status(400).json({ error: "Invalid registration data", details: parsed.error.issues });
    return;
  }

  const { name, usn, branch, code } = parsed.data;

  try {
    // Check access code
    const codes = await db.select().from(accessCodesTable).where(eq(accessCodesTable.code, code));
    if (codes.length === 0) {
      // Fallback default codes if none exist in the database yet
      const defaultCodes = ['bot123'];
      if (!defaultCodes.includes(code)) {
        res.status(403).json({ error: "Invalid Access Code" });
        return;
      }
    }

    // Check if USN exists
    const existing = await db.select().from(playersTable).where(eq(playersTable.usn, usn));
    if (existing.length > 0) {
      res.status(409).json({ error: "USN already registered" });
      return;
    }

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
    req.log.error({ err: err.message }, "Failed to register player");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/players", async (req, res) => {
  try {
    const players = await db.select().from(playersTable);
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: "Failed to list players" });
  }
});

export default router;
