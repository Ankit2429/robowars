import { Router } from "express";
import { db } from "@workspace/db";
import { robotsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateRobotBody } from "@workspace/api-zod";

const router = Router();

const ROBOT_PARTS: Record<string, { armor: number; power: number; speed: number; energy: number; specialAbility?: string }> = {
  // Chassis
  "body-titan":    { armor: 90, power: 60, speed: 30, energy: 70, specialAbility: "Iron Fortress" },
  "body-wasp":     { armor: 30, power: 50, speed: 95, energy: 80, specialAbility: "Afterburner" },
  "body-goliath":  { armor: 75, power: 80, speed: 40, energy: 60, specialAbility: "Overcharge" },
  "body-phantom":  { armor: 45, power: 70, speed: 75, energy: 65, specialAbility: "Phase Shift" },
  "body-fortress": { armor: 100, power: 40, speed: 20, energy: 50, specialAbility: "Siege Mode" },
  "body-viper":    { armor: 40, power: 65, speed: 90, energy: 70, specialAbility: "Venom Strike" },
  "body-colossus": { armor: 85, power: 75, speed: 25, energy: 55, specialAbility: "Seismic Slam" },
  "body-wraith":   { armor: 35, power: 80, speed: 85, energy: 60, specialAbility: "Spectral Rush" },
  "body-bulwark":  { armor: 95, power: 45, speed: 15, energy: 45, specialAbility: "Last Stand" },
  "body-lynx":     { armor: 50, power: 55, speed: 88, energy: 75, specialAbility: "Pounce" },
  "body-rhino":    { armor: 80, power: 85, speed: 35, energy: 50, specialAbility: "Gore Charge" },
  "body-shadow":   { armor: 25, power: 60, speed: 100, energy: 90, specialAbility: "Ghost Step" },
  // Weapons
  "attack-titan-disc":         { armor: 40, power: 95, speed: 25, energy: 30, specialAbility: "Full Spin Shred" },
  "attack-hammerhead":         { armor: 50, power: 85, speed: 35, energy: 38, specialAbility: "Piston Crush" },
  "attack-vertical-spinner":   { armor: 45, power: 90, speed: 30, energy: 32, specialAbility: "Launch Uppercut" },
  "attack-lifter-fork":        { armor: 50, power: 55, speed: 45, energy: 45, specialAbility: "Flip Over" },
  "attack-flail-chain":        { armor: 50, power: 75, speed: 40, energy: 40, specialAbility: "Chain Lash" },
  "attack-crusher-claw":       { armor: 50, power: 80, speed: 35, energy: 38, specialAbility: "Death Grip" },
  "attack-horizontal-spinner": { armor: 42, power: 88, speed: 32, energy: 32, specialAbility: "Floor Shredder" },
  "attack-spike-ramrod":       { armor: 50, power: 65, speed: 50, energy: 50, specialAbility: "Impale" },
  "attack-pneumatic-lance":    { armor: 50, power: 78, speed: 42, energy: 40, specialAbility: "Armor Pierce" },
  "attack-drum-spinner":       { armor: 45, power: 82, speed: 38, energy: 34, specialAbility: "Continuous Grind" },
  "attack-wedge-slicer":       { armor: 50, power: 50, speed: 50, energy: 50, specialAbility: "Undercut" },
  "attack-plasma-torch":       { armor: 50, power: 70, speed: 45, energy: 28, specialAbility: "Melt Through" },
  // Defense
  "defense-titanium-shell":      { armor: 90, power: 50, speed: 30, energy: 35, specialAbility: "Titan Skin" },
  "defense-reactive-panels":     { armor: 85, power: 50, speed: 40, energy: 30, specialAbility: "Counterburst" },
  "defense-carbon-weave":        { armor: 65, power: 50, speed: 48, energy: 45, specialAbility: "Light Frame" },
  "defense-ceramic-composite":   { armor: 80, power: 50, speed: 38, energy: 40, specialAbility: "Heat Shield" },
  "defense-steel-fortress-wrap": { armor: 95, power: 45, speed: 22, energy: 30, specialAbility: "Welded Wall" },
  "defense-ablative-foam":       { armor: 70, power: 50, speed: 45, energy: 45, specialAbility: "Spinner Soak" },
  "defense-polycarbonate-shield":{ armor: 75, power: 50, speed: 42, energy: 42, specialAbility: "Front Guard" },
  "defense-self-healing-polymer":{ armor: 72, power: 50, speed: 44, energy: 25, specialAbility: "Auto-Repair" },
  "defense-chain-mail-skirt":    { armor: 68, power: 50, speed: 40, energy: 47, specialAbility: "Underbelly Guard" },
  "defense-deflector-wedge":     { armor: 78, power: 50, speed: 42, energy: 45, specialAbility: "Spinner Deflect" },
  "defense-nano-ceramic":        { armor: 62, power: 50, speed: 50, energy: 42, specialAbility: "Iridescent Guard" },
  "defense-iron-fortress":       { armor: 100, power: 40, speed: 15, energy: 25, specialAbility: "Impenetrable" },
};

function computeStats(bodyId: string, attackId: string, defenseId: string, secondaryId?: string | null) {
  const b = ROBOT_PARTS[bodyId]    ?? { armor: 50, power: 50, speed: 50, energy: 50 };
  const a = ROBOT_PARTS[attackId]  ?? { armor: 50, power: 50, speed: 50, energy: 50 };
  const d = ROBOT_PARTS[defenseId] ?? { armor: 50, power: 50, speed: 50, energy: 50 };
  const s = secondaryId ? ROBOT_PARTS[secondaryId] : { armor: 0, power: 0, speed: 0, energy: 0 };
  
  return {
    armor:  Math.min(100, Math.round((b.armor  + a.armor  + d.armor + (s?.armor ?? 0))  / 3)),
    power:  Math.min(100, Math.round((b.power  + a.power  + d.power + (s?.power ?? 0))  / 3)),
    speed:  Math.min(100, Math.round((b.speed  + a.speed  + d.speed + (s?.speed ?? 0))  / 3)),
    energy: Math.min(100, Math.round((b.energy + a.energy + d.energy + (s?.energy ?? 0)) / 3)),
  };
}

router.get("/robots", async (req, res) => {
  try {
    const robots = await db.select().from(robotsTable).orderBy(robotsTable.createdAt);
    res.json(robots.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list robots");
    res.status(500).json({ error: "Failed to list robots" });
  }
});

router.post("/robots", async (req, res): Promise<void> => {
  const parsed = CreateRobotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid robot data", details: parsed.error.issues });
    return;
  }

  const { name, playerName, bodyPartId, attackPartId, defensePartId, secondaryWeaponId } = parsed.data;
  const totalStats = computeStats(bodyPartId, attackPartId, defensePartId, secondaryWeaponId);
  const attackPart = ROBOT_PARTS[attackPartId];
  const specialAbility = attackPart?.specialAbility ?? null;

  try {
    const [robot] = await db.insert(robotsTable).values({
      name,
      playerName,
      bodyPartId,
      attackPartId,
      defensePartId,
      secondaryWeaponId,
      totalStats,
      specialAbility,
    }).returning();

    res.status(201).json({ ...robot, createdAt: robot.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create robot");
    res.status(500).json({ error: "Failed to create robot" });
  }
});

router.get("/robots/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const [robot] = await db.select().from(robotsTable).where(eq(robotsTable.id, id));
    if (!robot) {
      res.status(404).json({ error: "Robot not found" });
      return;
    }
    res.json({ ...robot, createdAt: robot.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get robot");
    res.status(500).json({ error: "Failed to get robot" });
  }
});

export default router;
