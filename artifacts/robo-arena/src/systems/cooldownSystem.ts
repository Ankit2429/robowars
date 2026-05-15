/**
 * cooldownSystem.ts
 * ──────────────────────────────────────────────────────────────
 * Manages ALL cooldowns: chassis special (E), boost (SHIFT),
 * primary weapon (SPACE), secondary/defense (Q).
 * Each ability slot is tracked independently.
 */

export type AbilitySlot = "special" | "boost" | "primary" | "secondary";

export interface CooldownEntry {
  max:       number;  // seconds
  remaining: number;  // seconds
  active:    boolean; // currently executing (not cooling)
  uses?:     number;  // if limited uses (undefined = unlimited)
  maxUses?:  number;
}

export type CooldownMap = Record<AbilitySlot, CooldownEntry>;

// ─────────────────────────────────────────────────────────────
// PER-CHASSIS COOLDOWN DEFINITIONS
// ─────────────────────────────────────────────────────────────
export const CHASSIS_COOLDOWNS: Record<string, Partial<CooldownMap>> = {
  titan:    { special: { max: 20, remaining: 0, active: false }, boost: { max: 8,  remaining: 0, active: false } },
  wasp:     { special: { max: 15, remaining: 0, active: false }, boost: { max: 4,  remaining: 0, active: false } },
  goliath:  { special: { max: 18, remaining: 0, active: false }, boost: { max: 10, remaining: 0, active: false } },
  phantom:  { special: { max: 12, remaining: 0, active: false }, boost: { max: 6,  remaining: 0, active: false } },
  fortress: { special: { max: 20, remaining: 0, active: false }, boost: { max: 12, remaining: 0, active: false } },
  viper:    { special: { max: 10, remaining: 0, active: false }, boost: { max: 5,  remaining: 0, active: false } },
  colossus: { special: { max: 22, remaining: 0, active: false }, boost: { max: 8,  remaining: 0, active: false } },
  wraith:   { special: { max: 16, remaining: 0, active: false }, boost: { max: 5,  remaining: 0, active: false } },
  bulwark:  { special: { max: 18, remaining: 0, active: false }, boost: { max: 10, remaining: 0, active: false } },
  lynx:     { special: { max: 14, remaining: 0, active: false }, boost: { max: 6,  remaining: 0, active: false } },
  rhino:    { special: { max: 20, remaining: 0, active: false }, boost: { max: 7,  remaining: 0, active: false } },
  shadow:   { special: { max: 12, remaining: 0, active: false }, boost: { max: 5,  remaining: 0, active: false } },
};

// ─────────────────────────────────────────────────────────────
// PER-WEAPON COOLDOWN DEFINITIONS
// ─────────────────────────────────────────────────────────────
export const WEAPON_COOLDOWNS: Record<string, CooldownEntry> = {
  "attack-titan-disc":        { max: 8,   remaining: 0, active: false },
  "attack-hammerhead":        { max: 5,   remaining: 0, active: false },
  "attack-vertical-spinner":  { max: 6,   remaining: 0, active: false },
  "attack-lifter-fork":       { max: 1.5, remaining: 0, active: false },
  "attack-flail-chain":       { max: 1.0, remaining: 0, active: false },
  "attack-crusher-claw":      { max: 3.0, remaining: 0, active: false },
  "attack-horizontal-spinner":{ max: 5,   remaining: 0, active: false },
  "attack-spike-ramrod":      { max: 0,   remaining: 0, active: false }, // momentum-based
  "attack-pneumatic-lance":   { max: 2.0, remaining: 0, active: false },
  "attack-drum-spinner":      { max: 4,   remaining: 0, active: false },
  "attack-wedge-slicer":      { max: 0,   remaining: 0, active: false }, // passive
  "attack-plasma-torch":      { max: 3.0, remaining: 0, active: false },
};

// ─────────────────────────────────────────────────────────────
// PER-SECONDARY COOLDOWN DEFINITIONS
// ─────────────────────────────────────────────────────────────
export const SECONDARY_COOLDOWNS: Record<string, CooldownEntry> = {
  "secondary-flamethrower":      { max: 3,   remaining: 0, active: false },
  "secondary-emp-pulse":         { max: 15,  remaining: 0, active: false, uses: 1, maxUses: 1 },
  "secondary-smoke-screen":      { max: 5,   remaining: 0, active: false },
  "secondary-self-righting-arm": { max: 0,   remaining: 0, active: false, uses: 3, maxUses: 3 },
  "secondary-sawblade-side":     { max: 2,   remaining: 0, active: false },
  "secondary-net-launcher":      { max: 20,  remaining: 0, active: false, uses: 2, maxUses: 2 },
  "secondary-spike-mine":        { max: 3,   remaining: 0, active: false },
  "secondary-wedge-ram":         { max: 4,   remaining: 0, active: false },
  "secondary-taser-prongs":      { max: 4,   remaining: 0, active: false },
  "secondary-drill":             { max: 5,   remaining: 0, active: false },
  "secondary-grinder":           { max: 0,   remaining: 0, active: false }, // passive
  "secondary-concussion-cannon": { max: 9999, remaining: 0, active: false, uses: 1, maxUses: 1 },
};

// ─────────────────────────────────────────────────────────────
// COOLDOWN MANAGER CLASS
// ─────────────────────────────────────────────────────────────
export class CooldownManager {
  private slots: Map<string, CooldownEntry> = new Map();

  register(key: string, entry: CooldownEntry): void {
    this.slots.set(key, { ...entry });
  }

  /** Returns true if ability can be used right now */
  isReady(key: string): boolean {
    const s = this.slots.get(key);
    if (!s) return false;
    if (s.remaining > 0) return false;
    if (s.uses !== undefined && s.uses <= 0) return false;
    return true;
  }

  /** Trigger ability — starts cooldown, decrements uses */
  trigger(key: string): boolean {
    if (!this.isReady(key)) return false;
    const s = this.slots.get(key)!;
    s.remaining = s.max;
    s.active    = true;
    if (s.uses !== undefined) s.uses--;
    return true;
  }

  /** Call every frame to advance timers */
  tick(dt: number): void {
    this.slots.forEach(s => {
      if (s.remaining > 0) {
        s.remaining = Math.max(0, s.remaining - dt);
        if (s.remaining === 0) s.active = false;
      }
    });
  }

  /** 0.0 = ready, 1.0 = just triggered (for HUD arc fill) */
  getProgress(key: string): number {
    const s = this.slots.get(key);
    if (!s || s.max === 0) return 0;
    return s.remaining / s.max;
  }

  getRemainingSeconds(key: string): number {
    return this.slots.get(key)?.remaining ?? 0;
  }

  getUsesRemaining(key: string): number | undefined {
    return this.slots.get(key)?.uses;
  }

  /** HUD data for rendering a cooldown arc */
  getHUDData(key: string): CooldownHUDData {
    const s = this.slots.get(key);
    if (!s) return { progress: 0, remainingSec: 0, ready: true, uses: undefined };
    return {
      progress:     this.getProgress(key),
      remainingSec: Math.ceil(s.remaining),
      ready:        this.isReady(key),
      uses:         s.uses,
    };
  }

  resetUses(key: string): void {
    const s = this.slots.get(key);
    if (s && s.maxUses !== undefined) s.uses = s.maxUses;
  }
}

export interface CooldownHUDData {
  progress:     number;        // 0 = ready, 1 = just used
  remainingSec: number;
  ready:        boolean;
  uses?:        number;
}

// ─────────────────────────────────────────────────────────────
// FACTORY — build a CooldownManager for a given bot loadout
// ─────────────────────────────────────────────────────────────
export function buildCooldownManager(
  chassisId:   string,
  weaponId:    string,
  secondaryId: string,
): CooldownManager {
  const mgr = new CooldownManager();

  const chassisKey = chassisId.toLowerCase().replace("chassis-", "").split("-")[0];
  const cd = CHASSIS_COOLDOWNS[chassisKey];
  if (cd) {
    if (cd.special) mgr.register("E_special", cd.special);
    if (cd.boost)   mgr.register("SHIFT_boost", cd.boost);
  }

  const wcd = WEAPON_COOLDOWNS[weaponId];
  if (wcd) mgr.register("SPACE_weapon", wcd);

  const scd = SECONDARY_COOLDOWNS[secondaryId];
  if (scd) mgr.register("Q_secondary", scd);

  return mgr;
}

// ─────────────────────────────────────────────────────────────
// DEFENSE COOLDOWNS (Q key when defense is equipped)
// ─────────────────────────────────────────────────────────────
export const DEFENSE_COOLDOWNS: Record<string, CooldownEntry> = {
  "defense-titanium-shell":       { max: 15, remaining: 0, active: false },
  "defense-reactive-panels":      { max: 20, remaining: 0, active: false },
  "defense-carbon-weave":         { max: 10, remaining: 0, active: false },
  "defense-ceramic-composite":    { max: 18, remaining: 0, active: false },
  "defense-steel-fortress-wrap":  { max: 22, remaining: 0, active: false },
  "defense-ablative-foam":        { max: 14, remaining: 0, active: false },
  "defense-polycarbonate-shield": { max: 12, remaining: 0, active: false },
  "defense-self-healing-polymer": { max: 25, remaining: 0, active: false },
  "defense-chain-mail-skirt":     { max: 8,  remaining: 0, active: false },
  "defense-deflector-wedge":      { max: 10, remaining: 0, active: false },
  "defense-nano-ceramic":         { max: 12, remaining: 0, active: false },
  "defense-iron-fortress":        { max: 30, remaining: 0, active: false },
};
