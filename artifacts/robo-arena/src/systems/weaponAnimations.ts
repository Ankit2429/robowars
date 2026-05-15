/**
 * weaponAnimations.ts
 * ──────────────────────────────────────────────────────────────
 * State machines for all 12 primary weapon animations.
 * Each weapon has its own animation state + tick function.
 * Outputs visual parameters (rotations, offsets, opacities, etc.)
 * that a Three.js scene can consume directly.
 */

import { HeatState, addHeat, tickHeat } from "./weaponPhysics";

// ─────────────────────────────────────────────────────────────
// SHARED WEAPON ANIMATION TYPES
// ─────────────────────────────────────────────────────────────
export type WeaponAnimPhase =
  | "idle"
  | "spinup"      // acceleration to full speed
  | "active"      // full speed / deployed
  | "spindown"    // deceleration
  | "cooldown"    // waiting
  | "charging"    // hold-to-charge
  | "firing"      // instant fire
  | "retract"     // retracting mechanism
  | "grabbed";    // enemy grabbed in claw

export interface WeaponAnimOutput {
  // Rotation angles for spinning weapons (radians)
  spinRotY: number;
  spinRotZ: number;
  // Offset of weapon part from base position
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  // Visual flags
  sparksActive:    boolean;
  sparksIntensity: number;  // 0-1
  glowIntensity:   number;  // 0-1 emissive
  glowColor:       string;
  heatRatio:       number;  // 0-1 for heat bar
  isOverheated:    boolean;
  // Contact response
  contactFlash:    boolean;
  contactAge:      number;  // seconds since last contact
  // Misc
  chargeLevel:     number;  // 0-1 for ramrod charge
}

function defaultOutput(): WeaponAnimOutput {
  return {
    spinRotY: 0, spinRotZ: 0,
    offsetX: 0, offsetY: 0, offsetZ: 0,
    sparksActive: false, sparksIntensity: 0,
    glowIntensity: 0, glowColor: "#ffffff",
    heatRatio: 0, isOverheated: false,
    contactFlash: false, contactAge: 99,
    chargeLevel: 0,
  };
}

// ─────────────────────────────────────────────────────────────
// WEAPON 1 — TITAN DISC (horizontal spinner)
// ─────────────────────────────────────────────────────────────
export interface TitanDiscState {
  phase:       WeaponAnimPhase;
  spinSpeed:   number;     // current rad/s
  spinRotY:    number;     // accumulated rotation
  heat:        HeatState;
  firstHit:    boolean;    // for slow-motion trigger
  contactAge:  number;
}

const DISC_MAX_SPEED   = 8.0;  // rad/s
const DISC_SPINUP_TIME = 1.5;  // seconds

export function createTitanDiscState(): TitanDiscState {
  return {
    phase: "idle", spinSpeed: 0, spinRotY: 0,
    heat: { value: 0, locked: false, lockTimer: 0 },
    firstHit: true, contactAge: 99,
  };
}

export function tickTitanDisc(
  state: TitanDiscState,
  dt: number,
  spaceHeld: boolean,
  inContact: boolean,
): WeaponAnimOutput {
  const out = defaultOutput();

  tickHeat(state.heat, dt, !inContact);
  out.heatRatio    = state.heat.value / 100;
  out.isOverheated = state.heat.locked;

  if (state.heat.locked && state.phase === "active") {
    state.phase = "spindown";
  }

  switch (state.phase) {
    case "idle":
      if (spaceHeld && !state.heat.locked) state.phase = "spinup";
      break;
    case "spinup":
      state.spinSpeed = Math.min(DISC_MAX_SPEED, state.spinSpeed + (DISC_MAX_SPEED / DISC_SPINUP_TIME) * dt);
      if (state.spinSpeed >= DISC_MAX_SPEED) state.phase = "active";
      if (!spaceHeld) state.phase = "spindown";
      break;
    case "active":
      state.spinSpeed = DISC_MAX_SPEED;
      if (!spaceHeld) state.phase = "spindown";
      if (inContact) {
        addHeat(state.heat, 25 * dt);
        state.contactAge = 0;
      }
      break;
    case "spindown":
      state.spinSpeed = Math.max(0, state.spinSpeed - (DISC_MAX_SPEED / 3.0) * dt);
      if (state.spinSpeed === 0) state.phase = "cooldown";
      break;
    case "cooldown":
      // cooldown managed externally by CooldownManager
      break;
  }

  state.spinRotY  += state.spinSpeed * dt;
  state.contactAge = Math.min(99, state.contactAge + dt);

  out.spinRotY       = state.spinRotY;
  out.sparksActive   = state.phase === "active";
  out.sparksIntensity = state.spinSpeed / DISC_MAX_SPEED;
  out.glowIntensity  = state.spinSpeed / DISC_MAX_SPEED * 0.3;
  out.glowColor      = "#ff8800";
  out.contactFlash   = state.contactAge < 0.1;
  out.contactAge     = state.contactAge;
  return out;
}

// ─────────────────────────────────────────────────────────────
// WEAPON 3 — VERTICAL SPINNER
// ─────────────────────────────────────────────────────────────
export interface VertSpinState {
  phase:      WeaponAnimPhase;
  spinSpeed:  number;
  spinRotZ:   number;
  heat:       HeatState;
  contactAge: number;
}

const VERT_MAX_SPEED   = 10.0;
const VERT_SPINUP_TIME = 1.0;

export function createVertSpinState(): VertSpinState {
  return {
    phase: "idle", spinSpeed: 0, spinRotZ: 0,
    heat: { value: 0, locked: false, lockTimer: 0 },
    contactAge: 99,
  };
}

export function tickVertSpinner(
  state: VertSpinState,
  dt: number,
  spaceHeld: boolean,
  inContact: boolean,
): WeaponAnimOutput {
  const out = defaultOutput();

  tickHeat(state.heat, dt, !inContact);
  out.heatRatio    = state.heat.value / 100;
  out.isOverheated = state.heat.locked;

  if (state.heat.locked && state.phase === "active") state.phase = "spindown";

  switch (state.phase) {
    case "idle":
      if (spaceHeld && !state.heat.locked) state.phase = "spinup";
      break;
    case "spinup":
      state.spinSpeed = Math.min(VERT_MAX_SPEED, state.spinSpeed + (VERT_MAX_SPEED / VERT_SPINUP_TIME) * dt);
      if (state.spinSpeed >= VERT_MAX_SPEED) state.phase = "active";
      if (!spaceHeld) state.phase = "spindown";
      break;
    case "active":
      state.spinSpeed = VERT_MAX_SPEED;
      if (!spaceHeld) state.phase = "spindown";
      if (inContact) { addHeat(state.heat, 22 * dt); state.contactAge = 0; }
      break;
    case "spindown":
      state.spinSpeed = Math.max(0, state.spinSpeed - (VERT_MAX_SPEED / 2.0) * dt);
      if (state.spinSpeed === 0) state.phase = "cooldown";
      break;
  }

  state.spinRotZ  += state.spinSpeed * dt;
  state.contactAge = Math.min(99, state.contactAge + dt);

  out.spinRotZ        = state.spinRotZ;
  out.sparksActive    = state.phase === "active";
  out.sparksIntensity = state.spinSpeed / VERT_MAX_SPEED;
  out.glowIntensity   = out.sparksIntensity * 0.25;
  out.glowColor       = "#ff6600";
  out.contactFlash    = state.contactAge < 0.1;
  out.contactAge      = state.contactAge;
  return out;
}

// ─────────────────────────────────────────────────────────────
// WEAPON 4 — LIFTER FORK
// ─────────────────────────────────────────────────────────────
export interface LifterForkState {
  phase:     WeaponAnimPhase;
  forkAngle: number;  // current rotation (radians) — 0 = stored, -0.52 = extended
  liftY:     number;  // enemy lift offset in Y
  extended:  boolean;
  floorSpark: number; // timer
}

const FORK_EXTEND_ANGLE = -0.52; // radians (~30 deg)

export function createLifterForkState(): LifterForkState {
  return { phase: "idle", forkAngle: 0, liftY: 0, extended: false, floorSpark: 0 };
}

export function tickLifterFork(
  state: LifterForkState,
  dt: number,
  spaceHeld: boolean,
  inContact: boolean,
): WeaponAnimOutput {
  const out = defaultOutput();

  switch (state.phase) {
    case "idle":
      if (spaceHeld) { state.phase = "active"; state.extended = false; }
      break;
    case "active":
      // Extend fork toward floor
      state.forkAngle = Math.max(FORK_EXTEND_ANGLE, state.forkAngle - 3.0 * dt);
      state.extended  = state.forkAngle <= FORK_EXTEND_ANGLE + 0.02;
      if (!spaceHeld) { state.phase = "retract"; }
      if (inContact && state.extended) { state.phase = "grabbed"; state.liftY = 0; }
      break;
    case "grabbed":
      state.liftY = Math.min(2.0, state.liftY + 5.0 * dt);
      out.offsetY  = state.liftY;
      if (!spaceHeld) { state.phase = "retract"; }
      break;
    case "retract":
      state.forkAngle = Math.min(0, state.forkAngle + 3.0 * dt);
      state.liftY     = Math.max(0, state.liftY - 4.0 * dt);
      if (state.forkAngle >= -0.01) { state.phase = "cooldown"; }
      break;
  }

  state.floorSpark = Math.max(0, state.floorSpark - dt);

  out.spinRotZ       = state.forkAngle;
  out.sparksActive   = state.extended && (Math.random() < 0.4);
  out.glowIntensity  = state.extended ? 0.15 : 0;
  out.glowColor      = "#ffffff";
  return out;
}

// ─────────────────────────────────────────────────────────────
// WEAPON 6 — CRUSHER CLAW
// ─────────────────────────────────────────────────────────────
export interface CrusherClawState {
  phase:       WeaponAnimPhase;
  armAngle:    number;   // how far claw is closed (0=open, 0.61=shut)
  grabTimer:   number;   // seconds holding enemy
  heat:        HeatState;
  escaped:     boolean;
}

export function createCrusherClawState(): CrusherClawState {
  return {
    phase: "idle", armAngle: 0, grabTimer: 0,
    heat: { value: 0, locked: false, lockTimer: 0 },
    escaped: false,
  };
}

export function tickCrusherClaw(
  state: CrusherClawState,
  dt: number,
  spacePressed: boolean,
  inContactRange: boolean,
  enemyEscapeProgress: number, // 0-1
): WeaponAnimOutput {
  const out = defaultOutput();
  tickHeat(state.heat, dt, state.phase === "idle");

  switch (state.phase) {
    case "idle":
      // Hold arms open
      state.armAngle = Math.max(0, state.armAngle - 4.0 * dt);
      if (spacePressed) state.phase = "active"; // open claw
      break;
    case "active":
      // Arms open wider
      state.armAngle = Math.max(-0.61, state.armAngle - 6.0 * dt);
      if (spacePressed && inContactRange) {
        // CLAMP
        state.phase = "grabbed";
        state.grabTimer = 0;
        state.escaped   = false;
      }
      if (!spacePressed && !inContactRange) state.phase = "retract";
      break;
    case "grabbed":
      // Slowly close further
      state.armAngle  = Math.min(0.61, state.armAngle + 0.17 * dt);
      state.grabTimer += dt;
      addHeat(state.heat, 10 * dt);
      if (enemyEscapeProgress >= 1 || state.grabTimer > 4.0) {
        state.phase   = "retract";
        state.escaped = true;
      }
      break;
    case "retract":
      state.armAngle = Math.max(0, state.armAngle - 5.0 * dt);
      if (state.armAngle <= 0) state.phase = "cooldown";
      break;
  }

  out.spinRotZ      = state.armAngle; // upper arms rotate by this
  out.glowIntensity = state.phase === "grabbed" ? 0.25 : 0;
  out.glowColor     = "#ff2200";
  out.sparksActive  = state.phase === "grabbed" && Math.random() < 0.3;
  out.heatRatio     = state.heat.value / 100;
  return out;
}

// ─────────────────────────────────────────────────────────────
// WEAPON 7 — HORIZONTAL SPINNER
// ─────────────────────────────────────────────────────────────
export interface HorizontalSpinState {
  spinSpeed:  number;
  spinRotY:   number;
  phase:      WeaponAnimPhase;
  heat:       HeatState;
  wallComboTimer: number;
  contactAge: number;
}

const HBAR_MAX_SPEED   = 12.0;
const HBAR_SPINUP_TIME = 0.8;

export function createHorizontalSpinState(): HorizontalSpinState {
  return {
    spinSpeed: 0, spinRotY: 0, phase: "idle",
    heat: { value: 0, locked: false, lockTimer: 0 },
    wallComboTimer: 0, contactAge: 99,
  };
}

export function tickHorizontalSpinner(
  state: HorizontalSpinState,
  dt: number,
  spaceHeld: boolean,
  inContact: boolean,
): WeaponAnimOutput {
  const out = defaultOutput();
  tickHeat(state.heat, dt, !inContact);

  if (state.heat.locked && state.phase === "active") state.phase = "spindown";

  switch (state.phase) {
    case "idle":
      if (spaceHeld && !state.heat.locked) state.phase = "spinup";
      break;
    case "spinup":
      state.spinSpeed = Math.min(HBAR_MAX_SPEED, state.spinSpeed + (HBAR_MAX_SPEED / HBAR_SPINUP_TIME) * dt);
      if (state.spinSpeed >= HBAR_MAX_SPEED) state.phase = "active";
      if (!spaceHeld) state.phase = "spindown";
      break;
    case "active":
      if (!spaceHeld) state.phase = "spindown";
      if (inContact) { addHeat(state.heat, 20 * dt); state.contactAge = 0; state.wallComboTimer = 0.8; }
      break;
    case "spindown":
      state.spinSpeed = Math.max(0, state.spinSpeed - (HBAR_MAX_SPEED / 1.5) * dt);
      if (state.spinSpeed === 0) state.phase = "cooldown";
      break;
  }

  state.spinRotY     += state.spinSpeed * dt;
  state.contactAge    = Math.min(99, state.contactAge + dt);
  state.wallComboTimer = Math.max(0, state.wallComboTimer - dt);

  out.spinRotY        = state.spinRotY;
  out.sparksActive    = state.phase === "active";
  out.sparksIntensity = state.spinSpeed / HBAR_MAX_SPEED;
  out.heatRatio       = state.heat.value / 100;
  out.isOverheated    = state.heat.locked;
  out.glowIntensity   = out.sparksIntensity * 0.2;
  out.glowColor       = "#ff6600";
  out.contactFlash    = state.wallComboTimer > 0;
  out.contactAge      = state.contactAge;
  return out;
}

// ─────────────────────────────────────────────────────────────
// WEAPON 8 — SPIKE RAMROD (momentum charge)
// ─────────────────────────────────────────────────────────────
export interface SpikeRamState {
  chargeLevel: number;  // 0-1
  phase:       WeaponAnimPhase;
  heat:        HeatState;
}

export function createSpikeRamState(): SpikeRamState {
  return { chargeLevel: 0, phase: "idle", heat: { value: 0, locked: false, lockTimer: 0 } };
}

export function tickSpikeRam(
  state: SpikeRamState,
  dt: number,
  spaceHeld: boolean,
  speedPct: number, // 0-100 from chassis speed
): WeaponAnimOutput {
  const out = defaultOutput();
  tickHeat(state.heat, dt, !spaceHeld);

  if (spaceHeld) {
    // Charge builds over 1s
    state.chargeLevel = Math.min(1, state.chargeLevel + dt);
    state.phase       = "charging";
  } else if (state.chargeLevel > 0) {
    // Released — fire
    state.phase       = "firing";
    addHeat(state.heat, 2);
    state.chargeLevel = 0;
  } else {
    state.phase = "idle";
  }

  const momentumGlow = speedPct / 100;
  const chargeGlow   = state.chargeLevel;
  const totalGlow    = Math.max(momentumGlow * 0.3, chargeGlow * 0.8);

  // Spike tip glow: dark → orange → white
  const glowColors = ["#553300", "#ff8800", "#ffffff"];
  const glowIdx    = Math.floor(totalGlow * 2);
  out.glowColor    = glowColors[Math.min(2, glowIdx)];
  out.glowIntensity  = totalGlow;
  out.chargeLevel    = state.chargeLevel;
  out.heatRatio      = state.heat.value / 100;
  out.sparksActive   = state.chargeLevel > 0.66;
  out.sparksIntensity = state.chargeLevel;
  return out;
}

// ─────────────────────────────────────────────────────────────
// WEAPON 9 — PNEUMATIC LANCE
// ─────────────────────────────────────────────────────────────
export interface PneumaticLanceState {
  phase:       WeaponAnimPhase;
  extendOffset: number;  // 0 = retracted, 0.5 = full extend
  timer:        number;
  heat:         HeatState;
}

export function createPneumaticLanceState(): PneumaticLanceState {
  return {
    phase: "idle", extendOffset: 0, timer: 0,
    heat: { value: 0, locked: false, lockTimer: 0 },
  };
}

export function tickPneumaticLance(
  state: PneumaticLanceState,
  dt: number,
  spacePressed: boolean,
  canFire: boolean,
): WeaponAnimOutput {
  const out = defaultOutput();
  tickHeat(state.heat, dt, state.phase === "idle");

  state.timer += dt;

  switch (state.phase) {
    case "idle":
      state.extendOffset = 0;
      if (spacePressed && canFire && !state.heat.locked) {
        state.phase = "charging";
        state.timer = 0;
      }
      break;
    case "charging":
      // Pressurize 0.15s
      if (state.timer >= 0.15) { state.phase = "firing"; state.timer = 0; }
      break;
    case "firing":
      // Snap extend in 0.05s
      state.extendOffset = 0.5;
      addHeat(state.heat, 8);
      if (state.timer >= 0.05) { state.phase = "retract"; state.timer = 0; }
      break;
    case "retract":
      state.extendOffset = Math.max(0, state.extendOffset - 5.0 * dt);
      if (state.extendOffset <= 0) { state.phase = "cooldown"; state.timer = 0; }
      break;
    case "cooldown":
      // managed by CooldownManager
      break;
  }

  out.offsetZ        = state.extendOffset;
  out.glowIntensity  = state.phase === "charging" ? state.timer / 0.15 * 0.4 : 0;
  out.glowColor      = "#ffffff";
  out.heatRatio      = state.heat.value / 100;
  out.sparksActive   = state.phase === "firing";
  return out;
}

// ─────────────────────────────────────────────────────────────
// WEAPON 10 — DRUM SPINNER
// ─────────────────────────────────────────────────────────────
export interface DrumSpinState {
  spinSpeed:  number;
  spinRotZ:   number;
  phase:      WeaponAnimPhase;
  heat:       HeatState;
  contactAge: number;
  armorShredTimer: number;
}

const DRUM_MAX_SPEED   = 9.0;
const DRUM_SPINUP_TIME = 0.6;

export function createDrumSpinState(): DrumSpinState {
  return {
    spinSpeed: 0, spinRotZ: 0, phase: "idle",
    heat: { value: 0, locked: false, lockTimer: 0 },
    contactAge: 99, armorShredTimer: 0,
  };
}

export function tickDrumSpinner(
  state: DrumSpinState,
  dt: number,
  spaceHeld: boolean,
  inContact: boolean,
): WeaponAnimOutput {
  const out = defaultOutput();
  tickHeat(state.heat, dt, !inContact);

  if (state.heat.locked && state.phase === "active") state.phase = "spindown";

  switch (state.phase) {
    case "idle":
      if (spaceHeld && !state.heat.locked) state.phase = "spinup";
      break;
    case "spinup":
      state.spinSpeed = Math.min(DRUM_MAX_SPEED, state.spinSpeed + (DRUM_MAX_SPEED / DRUM_SPINUP_TIME) * dt);
      if (state.spinSpeed >= DRUM_MAX_SPEED) state.phase = "active";
      if (!spaceHeld) state.phase = "spindown";
      break;
    case "active":
      if (!spaceHeld) state.phase = "spindown";
      if (inContact) {
        addHeat(state.heat, 18 * dt);
        state.contactAge      = 0;
        state.armorShredTimer += dt;
      } else {
        state.armorShredTimer = 0;
      }
      break;
    case "spindown":
      state.spinSpeed = Math.max(0, state.spinSpeed - (DRUM_MAX_SPEED / 1.5) * dt);
      if (state.spinSpeed === 0) state.phase = "cooldown";
      break;
  }

  state.spinRotZ   += state.spinSpeed * dt;
  state.contactAge  = Math.min(99, state.contactAge + dt);

  out.spinRotZ          = state.spinRotZ;
  out.sparksActive      = state.phase === "active" && inContact;
  out.sparksIntensity   = state.spinSpeed / DRUM_MAX_SPEED;
  out.heatRatio         = state.heat.value / 100;
  out.isOverheated      = state.heat.locked;
  out.glowColor         = "#ff6600";
  out.glowIntensity     = out.sparksIntensity * 0.15;
  return out;
}

// ─────────────────────────────────────────────────────────────
// WEAPON 12 — PLASMA TORCH
// ─────────────────────────────────────────────────────────────
export interface PlasmaTorchState {
  phase:     WeaponAnimPhase;
  flameIntensity: number;  // 0-1
  heat:      HeatState;
  fireTimer: number;       // time enemy has been on fire
}

export function createPlasmaTorchState(): PlasmaTorchState {
  return {
    phase: "idle", flameIntensity: 0,
    heat: { value: 0, locked: false, lockTimer: 0 }, fireTimer: 0,
  };
}

export function tickPlasmaTorch(
  state: PlasmaTorchState,
  dt: number,
  spaceHeld: boolean,
  inContact: boolean,
): WeaponAnimOutput {
  const out = defaultOutput();
  tickHeat(state.heat, dt, state.phase === "idle");

  if (state.heat.locked) {
    state.phase          = "idle";
    state.flameIntensity = 0;
  }

  switch (state.phase) {
    case "idle":
      state.flameIntensity = Math.max(0, state.flameIntensity - 4.0 * dt);
      if (spaceHeld && !state.heat.locked) { state.phase = "charging"; }
      break;
    case "charging":
      // 0.2s ignition
      state.flameIntensity = Math.min(1, state.flameIntensity + 5.0 * dt);
      if (state.flameIntensity >= 1) state.phase = "active";
      if (!spaceHeld) state.phase = "idle";
      break;
    case "active":
      state.flameIntensity = 1;
      addHeat(state.heat, 30 * dt);
      if (inContact) state.fireTimer += dt;
      if (!spaceHeld || state.heat.locked) { state.phase = "retract"; }
      break;
    case "retract":
      state.flameIntensity = Math.max(0, state.flameIntensity - 3.0 * dt);
      if (state.flameIntensity <= 0) state.phase = "cooldown";
      break;
  }

  out.glowIntensity  = state.flameIntensity * 2.0;  // bright blue-white
  out.glowColor      = "#88ccff";
  out.sparksActive   = state.phase === "active";
  out.sparksIntensity = state.flameIntensity;
  out.heatRatio      = state.heat.value / 100;
  out.isOverheated   = state.heat.locked;
  // Scale glow on pilot flames (pulsing)
  out.offsetY        = Math.sin(Date.now() * 0.003) * 0.05 * state.flameIntensity;
  return out;
}

// ─────────────────────────────────────────────────────────────
// COMBO SYSTEM (Lynx passive)
// ─────────────────────────────────────────────────────────────
export interface ComboState {
  count:     number; // 1-4+
  timer:     number; // seconds since last hit
  readonly RESET_AFTER: number; // 3 seconds
}

export function createComboState(): ComboState {
  return { count: 0, timer: 0, RESET_AFTER: 3 };
}

export function tickCombo(state: ComboState, dt: number): void {
  state.timer += dt;
  if (state.timer >= state.RESET_AFTER) {
    state.count = 0;
    state.timer = 0;
  }
}

export function registerHit(state: ComboState): number {
  state.count = Math.min(state.count + 1, 4);
  state.timer = 0;
  return getComboMultiplier(state);
}

export function getComboMultiplier(state: ComboState): number {
  switch (state.count) {
    case 0: case 1: return 1.0;
    case 2: return 1.2;
    case 3: return 1.5;
    default: return 2.0;
  }
}
