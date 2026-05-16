import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable, accessCodesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { globalEvents, EVENTS } from "../lib/events";

const router = Router();

router.get("/settings", async (req, res) => {
  try {
    const settings = await db.select().from(settingsTable);
    const result: Record<string, string> = {};
    settings.forEach((s: any) => { result[s.key] = s.value; });
    
    const codes = await db.select().from(accessCodesTable);
    
    res.json({
      matchmakingActive: result["matchmakingActive"] === "true",
      codes: codes.map((c: any) => c.code)
    });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Failed to get settings");
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.post("/settings/matchmaking", async (req, res) => {
  const { active } = req.body;
  req.log.info({ active }, "Matchmaking status change requested");
  try {
    await db.insert(settingsTable)
      .values({ key: "matchmakingActive", value: String(active) })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: String(active) } });
    
    // Notify socket server to broadcast
    globalEvents.emit(EVENTS.MATCHMAKING_STATUS_CHANGED, active === true || active === "true");
    
    res.json({ success: true, matchmakingActive: active });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Failed to update matchmaking status");
    res.status(500).json({ error: "Failed to update matchmaking status" });
  }
});

router.post("/settings/codes", async (req, res) => {
  const { code, action } = req.body;
  req.log.info({ code, action }, "Access code update requested");
  try {
    if (action === 'add') {
      await db.insert(accessCodesTable).values({ code }).onConflictDoNothing();
    } else {
      await db.delete(accessCodesTable).where(eq(accessCodesTable.code, code));
    }
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Failed to update access codes");
    res.status(500).json({ error: "Failed to update access codes" });
  }
});

export default router;
