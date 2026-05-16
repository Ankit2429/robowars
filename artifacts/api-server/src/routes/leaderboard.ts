import { Router } from "express";
import { db } from "@workspace/db";
import { leaderboardTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/leaderboard", async (req, res) => {
  try {
    const entries = await db.select().from(leaderboardTable)
      .orderBy(desc(leaderboardTable.wins), desc(leaderboardTable.winRate))
      .limit(20);

    const ranked = entries.map((e: any, i: number) => ({
      rank: i + 1,
      playerName: e.playerName,
      wins: e.wins,
      losses: e.losses,
      winRate: e.winRate,
      totalBattles: e.totalBattles,
      favoriteRobot: e.favoriteRobot,
    }));

    res.json(ranked);
  } catch (err) {
    req.log.error({ err }, "Failed to get leaderboard");
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
});

export default router;
