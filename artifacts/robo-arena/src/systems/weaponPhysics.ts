/**
 * weaponPhysics.ts
 * ──────────────────────────────────────────────────────────────
 * Pure physics/math layer — no React, no Three.js imports.
 * All values are frame-independent and ready for useFrame().
 * Import into battle.tsx or GameController when wiring up.
 */

// ─────────────────────────────────────────────────────────────
// SCREEN SHAKE CONSTANTS
// ─────────────────────────────────────────────────────────────
export const SHAKE = {
  LIGHT:   { amplitude: 0.05, duration: 0.20 },
  MEDIUM:  { amplitude: 0.15, duration: 0.40 },
  HEAVY:   { amplitude: 0.30, duration: 0.60 },
  EXTREME: { amplitude: 0.50, duration: 1.00 },
  MAXIMUM: { amplitude: 0.80, duration: 1.50 },
} as const;

export type ShakeLevel = keyof typeof SHAKE;

export interface ShakeState {
  amplitude: number;
  duration: number;
  elapsed: number;
  active: boolean;
}

export function createShakeState(): ShakeState {
  return { amplitude: 0, duration: 0, elapsed: 0, active: false };
}

export function triggerShake(state: ShakeState, level: ShakeLevel): void {
  const s = SHAKE[level];
  // Only upgrade shake, never downgrade
  if (s.amplitude >= state.amplitude) {
    state.amplitude = s.amplitude;
    state.duration  = s.duration;
    state.elapsed   = 0;
    state.active    = true;
  }
}

export function tickShake(state: ShakeState, dt: number): { x: number; y: number } {
  if (!state.active) return { x: 0, y: 0 };
  state.elapsed += dt;
  if (state.elapsed >= state.duration) {
    state.active = false;
    return { x: 0, y: 0 };
  }
  const progress = state.elapsed / state.duration;
  const fade     = 1 - progress * progress; // ease-out quad
  const amp      = state.amplitude * fade;
  return {
    x: (Math.random() * 2 - 1) * amp,
    y: (Math.random() * 2 - 1) * amp * 0.5,
  };
}

// ─────────────────────────────────────────────────────────────
// SLOW MOTION SYSTEM
// ─────────────────────────────────────────────────────────────
export interface SlowMotionState {
  active:    boolean;
  timeScale: number;
  duration:  number;
  elapsed:   number;
}

export const SLOW_MOTION_TRIGGERS = {
  VERTICAL_SPINNER_HIT:   { duration: 0.60, timeScale: 0.20 },
  CONCUSSION_CANNON_HIT:  { duration: 1.00, timeScale: 0.15 },
  PERFECT_SPIKE_RAM:      { duration: 0.30, timeScale: 0.25 },
  TITAN_DISC_FIRST_HIT:   { duration: 0.50, timeScale: 0.30 },
  KO_FINAL_BLOW:          { duration: 2.00, timeScale: 0.10 },
} as const;

export type SlowMotionEvent = keyof typeof SLOW_MOTION_TRIGGERS;

export function createSlowMotionState(): SlowMotionState {
  return { active: false, timeScale: 1, duration: 0, elapsed: 0 };
}

export function triggerSlowMotion(state: SlowMotionState, event: SlowMotionEvent): void {
  const t = SLOW_MOTION_TRIGGERS[event];
  state.active    = true;
  state.timeScale = t.timeScale;
  state.duration  = t.duration;
  state.elapsed   = 0;
}

export function tickSlowMotion(state: SlowMotionState, rawDt: number): number {
  if (!state.active) return rawDt;
  state.elapsed += rawDt;
  if (state.elapsed >= state.duration) {
    state.active    = false;
    state.timeScale = 1;
    return rawDt;
  }
  return rawDt * state.timeScale;
}

// ─────────────────────────────────────────────────────────────
// HIT ZONE MULTIPLIERS
// ─────────────────────────────────────────────────────────────
export const HIT_ZONE_MULTIPLIER = {
  FRONT:        1.0,
  SIDES:        1.4,
  REAR:         2.0,
  WEAPON_MOUNT: 1.8,
} as const;

export type HitZone = keyof typeof HIT_ZONE_MULTIPLIER;

/** Determines which hit zone was struck based on attacker/defender facing angles */
export function getHitZone(
  attackerAngle: number, // radians — direction attacker faces
  defenderAngle: number, // radians — direction defender faces
): HitZone {
  // Angle from defender's perspective
  const relAngle = ((attackerAngle - defenderAngle + Math.PI) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI) - Math.PI;
  const abs = Math.abs(relAngle);
  if (abs < Math.PI * 0.25)  return "REAR";          // attacker behind defender
  if (abs > Math.PI * 0.75)  return "FRONT";         // attacker facing defender front
  return "SIDES";
}

// ─────────────────────────────────────────────────────────────
// DAMAGE FORMULA
// ─────────────────────────────────────────────────────────────
export interface DamageParams {
  weaponPower:       number; // 0-100 from stats
  hitZone:           HitZone;
  momentumBonus:     number; // 0.0 - 1.0 from momentum system
  armorRating:       number; // 0-100 from stats
  armorBypassFactor: number; // 0.0 - 1.0 (0 = no bypass, 1 = full bypass)
}

export function calculateDamage(p: DamageParams): number {
  const zoneMultiplier = HIT_ZONE_MULTIPLIER[p.hitZone];
  const momentumMult   = 1 + (p.momentumBonus * 0.6);  // up to 1.6× at full momentum
  const raw            = p.weaponPower * zoneMultiplier * momentumMult;
  const effectiveArmor = p.armorRating * (1 - p.armorBypassFactor);
  const final          = raw * (1 - effectiveArmor / 200);
  return Math.max(1, Math.round(final));
}

// ─────────────────────────────────────────────────────────────
// MOMENTUM SYSTEM
// ─────────────────────────────────────────────────────────────
export interface MomentumState {
  value:         number;  // 0 - 100
  lastDirX:      number;
  lastDirZ:      number;
  buildTimer:    number;
}

export function createMomentumState(): MomentumState {
  return { value: 0, lastDirX: 0, lastDirZ: 0, buildTimer: 0 };
}

export function tickMomentum(
  state: MomentumState,
  velX: number,
  velZ: number,
  dt: number,
): void {
  const speed = Math.sqrt(velX * velX + velZ * velZ);
  if (speed < 0.001) {
    state.value     = Math.max(0, state.value - 40 * dt);
    state.buildTimer = 0;
    return;
  }
  const nx = velX / speed;
  const nz = velZ / speed;
  const dot = nx * state.lastDirX + nz * state.lastDirZ;
  if (dot < 0.85) {
    // Direction changed sharply — reset momentum
    state.value      = 0;
    state.buildTimer = 0;
  } else {
    state.buildTimer += dt;
    // Momentum builds over 1.5s
    const buildRate = 100 / 1.5;
    state.value = Math.min(100, state.value + buildRate * dt);
  }
  state.lastDirX = nx;
  state.lastDirZ = nz;
}

export function getMomentumBonus(state: MomentumState): number {
  return state.value / 100; // 0.0 - 1.0
}

// ─────────────────────────────────────────────────────────────
// HEAT SYSTEM
// ─────────────────────────────────────────────────────────────
export interface HeatState {
  value:    number;  // 0 - 100
  locked:   boolean;
  lockTimer: number;
}

export const HEAT_IDLE_COOLDOWN   = 8;   // per second idle
export const HEAT_MOVING_COOLDOWN = 15;  // per second moving away

export function createHeatState(): HeatState {
  return { value: 0, locked: false, lockTimer: 0 };
}

export function addHeat(state: HeatState, amount: number): boolean {
  if (state.locked) return false;
  state.value = Math.min(100, state.value + amount);
  if (state.value >= 100) {
    state.locked    = true;
    state.lockTimer = 4.0;
    return false; // overheat triggered
  }
  return true;
}

export function tickHeat(state: HeatState, dt: number, isIdle: boolean): void {
  if (state.locked) {
    state.lockTimer -= dt;
    if (state.lockTimer <= 0) {
      state.locked = false;
      state.value  = 80; // reset to 80 after lockout
    }
    return;
  }
  const coolRate = isIdle ? HEAT_IDLE_COOLDOWN : HEAT_MOVING_COOLDOWN;
  state.value = Math.max(0, state.value - coolRate * dt);
}

export function getHeatColor(value: number): string {
  if (value < 40) return "#00ff44";
  if (value < 65) return "#ffcc00";
  if (value < 85) return "#ff6600";
  return "#ff0000";
}

// ─────────────────────────────────────────────────────────────
// INVINCIBILITY FRAME SYSTEM
// ─────────────────────────────────────────────────────────────
export interface InvincibilityState {
  active:  boolean;
  timer:   number;
  flicker: boolean;
}

export const IFRAMES_KNOCKBACK = 0.5;
export const IFRAMES_RESPAWN   = 2.0;

export function createInvincibilityState(): InvincibilityState {
  return { active: false, timer: 0, flicker: false };
}

export function grantInvincibility(state: InvincibilityState, duration: number): void {
  state.active = true;
  state.timer  = duration;
}

export function tickInvincibility(state: InvincibilityState, dt: number): void {
  if (!state.active) return;
  state.timer -= dt;
  // Flicker at 10Hz
  state.flicker = Math.floor(state.timer * 10) % 2 === 0;
  if (state.timer <= 0) {
    state.active  = false;
    state.flicker = false;
  }
}

// ─────────────────────────────────────────────────────────────
// PER-CHASSIS MOVEMENT CONSTANTS
// ─────────────────────────────────────────────────────────────
export interface ChassisPhysics {
  maxSpeed:     number; // units/frame at 60fps
  acceleration: number;
  deceleration: number;
  turnSpeed:    number; // rad/frame
  turnRadius:   number; // units minimum
  weight:       "feather" | "light" | "medium" | "heavy" | "tank";
  groundFriction: "very-low" | "low" | "medium" | "high" | "very-high";
  momentumCap:  number; // max momentum 0-100
}

export const CHASSIS_PHYSICS: Record<string, ChassisPhysics> = {
  titan: {
    maxSpeed: 0.036, acceleration: 0.0018, deceleration: 0.003,
    turnSpeed: 0.018, turnRadius: 3.5, weight: "tank",
    groundFriction: "high", momentumCap: 40,
  },
  wasp: {
    maxSpeed: 0.11, acceleration: 0.008, deceleration: 0.012,
    turnSpeed: 0.055, turnRadius: 0.3, weight: "feather",
    groundFriction: "low", momentumCap: 100,
  },
  goliath: {
    maxSpeed: 0.048, acceleration: 0.003, deceleration: 0.004,
    turnSpeed: 0.025, turnRadius: 2.5, weight: "heavy",
    groundFriction: "medium", momentumCap: 75,
  },
  phantom: {
    maxSpeed: 0.075, acceleration: 0.006, deceleration: 0.008,
    turnSpeed: 0.042, turnRadius: 1.0, weight: "medium",
    groundFriction: "medium", momentumCap: 90,
  },
  fortress: {
    maxSpeed: 0.022, acceleration: 0.001, deceleration: 0.002,
    turnSpeed: 0.008, turnRadius: 5.0, weight: "tank",
    groundFriction: "very-high", momentumCap: 20,
  },
  viper: {
    maxSpeed: 0.095, acceleration: 0.007, deceleration: 0.010,
    turnSpeed: 0.050, turnRadius: 0.5, weight: "light",
    groundFriction: "low", momentumCap: 100,
  },
  colossus: {
    maxSpeed: 0.030, acceleration: 0.0015, deceleration: 0.0025,
    turnSpeed: 0.014, turnRadius: 4.0, weight: "tank",
    groundFriction: "high", momentumCap: 30,
  },
  wraith: {
    maxSpeed: 0.088, acceleration: 0.007, deceleration: 0.009,
    turnSpeed: 0.048, turnRadius: 0.8, weight: "feather",
    groundFriction: "low", momentumCap: 95,
  },
  bulwark: {
    maxSpeed: 0.018, acceleration: 0.0008, deceleration: 0.002,
    turnSpeed: 0.010, turnRadius: 6.0, weight: "tank",
    groundFriction: "very-high", momentumCap: 15,
  },
  lynx: {
    maxSpeed: 0.085, acceleration: 0.007, deceleration: 0.009,
    turnSpeed: 0.050, turnRadius: 0.6, weight: "light",
    groundFriction: "medium", momentumCap: 90,
  },
  rhino: {
    maxSpeed: 0.055, acceleration: 0.004, deceleration: 0.005,
    turnSpeed: 0.022, turnRadius: 2.8, weight: "heavy",
    groundFriction: "medium", momentumCap: 80,
  },
  shadow: {
    maxSpeed: 0.12, acceleration: 0.010, deceleration: 0.014,
    turnSpeed: 0.062, turnRadius: 0.2, weight: "feather",
    groundFriction: "very-low", momentumCap: 100,
  },
};

export function getChassisPhysics(chassisId: string): ChassisPhysics {
  const key = chassisId.toLowerCase().replace("chassis-", "").split("-")[0];
  return CHASSIS_PHYSICS[key] ?? CHASSIS_PHYSICS["titan"];
}

// ─────────────────────────────────────────────────────────────
// KNOCKBACK FORMULA
// ─────────────────────────────────────────────────────────────
export interface KnockbackParams {
  force:          number; // base force in units
  dirX:           number; // normalized
  dirZ:           number;
  receiverWeight: ChassisPhysics["weight"];
  receiverKBReduction: number; // 0.0 - 1.0
}

const WEIGHT_RESISTANCE: Record<ChassisPhysics["weight"], number> = {
  feather: 1.0,
  light:   0.85,
  medium:  0.70,
  heavy:   0.50,
  tank:    0.35,
};

export function applyKnockback(
  velRef: { x: number; z: number },
  p: KnockbackParams,
): void {
  const resistance = WEIGHT_RESISTANCE[p.receiverWeight];
  const reduction  = 1 - p.receiverKBReduction;
  const effective  = p.force * resistance * reduction;
  velRef.x += p.dirX * effective;
  velRef.z += p.dirZ * effective;
}

// ─────────────────────────────────────────────────────────────
// SPEED-SCALED RHINO HORN DAMAGE
// ─────────────────────────────────────────────────────────────
export function getRhinoHornMultiplier(speedPct: number): number {
  if (speedPct <= 25) return 1.0;
  if (speedPct <= 50) return 1.5;
  if (speedPct <= 75) return 2.5;
  return 5.0;
}

// ─────────────────────────────────────────────────────────────
// VIPER POISON STACK SYSTEM
// ─────────────────────────────────────────────────────────────
export interface PoisonStack {
  count:     number; // 0-5
  timers:    number[]; // remaining seconds per stack
  dps:       number;  // computed: count * 3
}

export function createPoisonState(): PoisonStack {
  return { count: 0, timers: [], dps: 0 };
}

export function addPoisonStack(state: PoisonStack): void {
  if (state.count < 5) state.count++;
  state.timers.push(8.0);
  state.dps = state.count * 3;
}

export function tickPoison(state: PoisonStack, dt: number): number {
  state.timers = state.timers.map(t => t - dt).filter(t => t > 0);
  state.count  = state.timers.length;
  state.dps    = state.count * 3;
  return state.dps * dt;
}
