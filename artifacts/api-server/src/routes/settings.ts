import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { globalEvents, EVENTS } from "../lib/events";

const router = Router();

router.get("/settings", async (req, res) => {
  try {
    const settings = await db.select().from(settingsTable);
    const result: Record<string, string> = {};
    settings.forEach((s: any) => { result[s.key] = s.value; });
    
    res.json({
      matchmakingActive: result["matchmakingActive"] === "true",
      codes: ["bot123"] // Hardcoded fallback for UI
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

// Removed /settings/codes route as access codes are hardcoded now

export default router;
