import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable, accessCodesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/settings", async (req, res) => {
  try {
    const settings = await db.select().from(settingsTable);
    const result: Record<string, string> = {};
    settings.forEach(s => { result[s.key] = s.value; });
    
    // Include access codes if needed
    const codes = await db.select().from(accessCodesTable);
    
    res.json({
      matchmakingActive: result["matchmakingActive"] === "true",
      codes: codes.map(c => c.code)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.post("/settings/matchmaking", async (req, res) => {
  const { active } = req.body;
  try {
    await db.insert(settingsTable)
      .values({ key: "matchmakingActive", value: String(active) })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: String(active) } });
    
    res.json({ success: true, matchmakingActive: active });
  } catch (err) {
    res.status(500).json({ error: "Failed to update matchmaking status" });
  }
});

router.post("/settings/codes", async (req, res) => {
  const { code, action } = req.body; // action: 'add' | 'remove'
  try {
    if (action === 'add') {
      await db.insert(accessCodesTable).values({ code }).onConflictDoNothing();
    } else {
      await db.delete(accessCodesTable).where(eq(accessCodesTable.code, code));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update access codes" });
  }
});

export default router;
