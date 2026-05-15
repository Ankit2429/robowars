/**
 * secondaryWeapons.ts
 * ──────────────────────────────────────────────────────────────
 * State machines for all 12 secondary weapons + all 12 defense
 * active abilities. Each exports a state type, factory, and tick.
 * No React/Three.js imports — pure logic.
 */

// ─────────────────────────────────────────────────────────────
// SECONDARY WEAPON BASE TYPES
// ─────────────────────────────────────────────────────────────
export type SecondaryPhase =
  | "idle" | "deploying" | "active" | "retracting"
  | "cooldown" | "fired" | "empty";

export interface SecondaryOutput {
  phase:          SecondaryPhase;
  intensity:      number;  // 0-1 visual intensity
  deployOffset:   number;  // arm extension offset
  usesRemaining:  number | undefined;
  effectActive:   boolean;
  statusEffect?:  StatusEffect;
}

export interface StatusEffect {
  type:     "fire" | "stun" | "poison" | "slow" | "entangle";
  duration: number;
  value:    number; // damage/s or speed reduction etc.
}

function defaultSecOut(usesRemaining?: number): SecondaryOutput {
  return {
    phase: "idle", intensity: 0, deployOffset: 0,
    usesRemaining, effectActive: false,
  };
}

// ─────────────────────────────────────────────────────────────
// SEC 1 — FLAMETHROWER
// ─────────────────────────────────────────────────────────────
export interface FlamethrowerState {
  phase:     SecondaryPhase;
  intensity: number;
  fireTimer: number; // enemy fire stack duration
}

export function createFlamethrowerState(): FlamethrowerState {
  return { phase: "idle", intensity: 0, fireTimer: 0 };
}

export function tickFlamethrower(
  state: FlamethrowerState,
  dt: number,
  qHeld: boolean,
  inRange: boolean,
): SecondaryOutput {
  const out = defaultSecOut();
  switch (state.phase) {
    case "idle":
      state.intensity = Math.max(0, state.intensity - 3 * dt);
      if (qHeld) { state.phase = "deploying"; }
      break;
    case "deploying":
      state.intensity = Math.min(1, state.intensity + 5 * dt);
      if (state.intensity >= 1) state.phase = "active";
      if (!qHeld) state.phase = "retracting";
      break;
    case "active":
      state.intensity = 1;
      if (inRange) state.fireTimer = 5;
      if (!qHeld) state.phase = "retracting";
      break;
    case "retracting":
      state.intensity = Math.max(0, state.intensity - 3 * dt);
      if (state.intensity <= 0) state.phase = "cooldown";
      break;
    case "cooldown":
      break;
  }
  state.fireTimer = Math.max(0, state.fireTimer - dt);
  out.phase        = state.phase;
  out.intensity    = state.intensity;
  out.effectActive = state.phase === "active";
  if (state.fireTimer > 0) {
    out.statusEffect = { type: "fire", duration: state.fireTimer, value: 8 };
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// SEC 2 — EMP PULSE
// ─────────────────────────────────────────────────────────────
export interface EmpPulseState {
  phase:     SecondaryPhase;
  uses:      number;
  timer:     number;
  stunTimer: number;
}

export function createEmpPulseState(): EmpPulseState {
  return { phase: "idle", uses: 1, timer: 0, stunTimer: 0 };
}

export function tickEmpPulse(
  state: EmpPulseState,
  dt: number,
  qPressed: boolean,
  enemyEnergy: number,
): SecondaryOutput {
  const out = defaultSecOut(state.uses);
  state.timer += dt;

  switch (state.phase) {
    case "idle":
      if (qPressed && state.uses > 0) {
        state.phase = "deploying";
        state.timer = 0;
        state.uses--;
      }
      break;
    case "deploying": // charge 0.3s
      if (state.timer >= 0.3) {
        state.phase    = "fired";
        // EMP duration scales with enemy energy
        state.stunTimer = enemyEnergy > 80 ? 1.5 : 3.0;
        state.timer     = 0;
      }
      break;
    case "fired":
      state.stunTimer = Math.max(0, state.stunTimer - dt);
      if (state.stunTimer <= 0) state.phase = "cooldown";
      break;
    case "cooldown":
      // managed externally
      break;
  }

  out.phase        = state.phase;
  out.intensity    = state.phase === "deploying" ? state.timer / 0.3 : (state.phase === "fired" ? 1 : 0);
  out.effectActive = state.phase === "fired";
  if (state.stunTimer > 0) {
    out.statusEffect = { type: "stun", duration: state.stunTimer, value: 0 };
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// SEC 3 — SMOKE SCREEN
// ─────────────────────────────────────────────────────────────
export interface SmokeScreenState {
  phase:     SecondaryPhase;
  cloudLife: number;
  active:    boolean;
}

export function createSmokeScreenState(): SmokeScreenState {
  return { phase: "idle", cloudLife: 0, active: false };
}

export function tickSmokeScreen(
  state: SmokeScreenState,
  dt: number,
  qPressed: boolean,
): SecondaryOutput {
  const out = defaultSecOut();
  if (qPressed && state.phase === "idle") {
    state.cloudLife = 8.0;
    state.active    = true;
    state.phase     = "active";
  }
  if (state.active) {
    state.cloudLife = Math.max(0, state.cloudLife - dt);
    if (state.cloudLife <= 0) { state.active = false; state.phase = "cooldown"; }
  }
  out.phase        = state.phase;
  out.effectActive = state.active;
  out.intensity    = Math.min(1, state.cloudLife / 2); // ramps up then stays
  return out;
}

// ─────────────────────────────────────────────────────────────
// SEC 4 — SELF-RIGHTING ARM
// ─────────────────────────────────────────────────────────────
export interface SelfRightingState {
  phase:     SecondaryPhase;
  uses:      number;
  armAngle:  number;  // 0 = folded, 1.57 = perpendicular (deployed)
  pistonExt: number;  // 0 = retracted, 1 = full
  timer:     number;
}

export function createSelfRightingState(): SelfRightingState {
  return { phase: "idle", uses: 3, armAngle: 0, pistonExt: 0, timer: 0 };
}

export function tickSelfRighting(
  state: SelfRightingState,
  dt: number,
  isInverted: boolean,
  invertedTime: number,
): SecondaryOutput {
  const out = defaultSecOut(state.uses);
  state.timer += dt;

  switch (state.phase) {
    case "idle":
      if (isInverted && invertedTime >= 1.0 && state.uses > 0) {
        state.phase = "deploying";
        state.timer = 0;
        state.uses--;
      }
      break;
    case "deploying": // 0.4s arm extend
      state.armAngle  = Math.min(1.57, state.armAngle + (1.57 / 0.4) * dt);
      state.pistonExt = Math.min(1, state.pistonExt + dt / 0.4);
      if (state.timer >= 0.4) { state.phase = "active"; state.timer = 0; }
      break;
    case "active": // 0.3s push
      if (state.timer >= 0.3) { state.phase = "retracting"; state.timer = 0; }
      break;
    case "retracting":
      state.armAngle  = Math.max(0, state.armAngle - (1.57 / 0.3) * dt);
      state.pistonExt = Math.max(0, state.pistonExt - dt / 0.3);
      if (state.armAngle <= 0) { state.phase = "idle"; }
      break;
  }

  out.phase       = state.phase;
  out.deployOffset = state.pistonExt;
  out.intensity   = state.pistonExt;
  out.effectActive = state.phase === "active";
  return out;
}

// ─────────────────────────────────────────────────────────────
// SEC 5 — SAWBLADE SIDE MOUNT
// ─────────────────────────────────────────────────────────────
export interface SawbladeSideState {
  phase:      SecondaryPhase;
  extended:   boolean;
  armOffset:  number;  // 0-1
  spinRotZ:   number;
  spinSpeed:  number;
}

export function createSawbladeSideState(): SawbladeSideState {
  return { phase: "idle", extended: false, armOffset: 0, spinRotZ: 0, spinSpeed: 0 };
}

export function tickSawbladeSide(
  state: SawbladeSideState,
  dt: number,
  qPressed: boolean,
  inContact: boolean,
): SecondaryOutput {
  const out = defaultSecOut();
  const TARGET_SPEED = 15;

  if (qPressed && !state.extended && state.phase === "idle") {
    state.extended = true;
    state.phase    = "deploying";
  } else if (qPressed && state.extended) {
    state.extended = false;
    state.phase    = "retracting";
  }

  switch (state.phase) {
    case "deploying":
      state.armOffset  = Math.min(1, state.armOffset + dt / 0.3);
      state.spinSpeed  = Math.min(TARGET_SPEED, state.spinSpeed + (TARGET_SPEED / 0.3) * dt);
      if (state.armOffset >= 1) state.phase = "active";
      break;
    case "active":
      state.spinSpeed = TARGET_SPEED;
      break;
    case "retracting":
      state.armOffset = Math.max(0, state.armOffset - dt / 0.5);
      state.spinSpeed = Math.max(0, state.spinSpeed - (TARGET_SPEED / 0.5) * dt);
      if (state.armOffset <= 0) { state.phase = "cooldown"; }
      break;
  }

  state.spinRotZ += state.spinSpeed * dt;

  out.phase        = state.phase;
  out.deployOffset = state.armOffset;
  out.intensity    = state.armOffset;
  out.effectActive = state.phase === "active" && inContact;
  return out;
}

// ─────────────────────────────────────────────────────────────
// SEC 6 — NET LAUNCHER
// ─────────────────────────────────────────────────────────────
export interface NetLauncherState {
  phase:     SecondaryPhase;
  uses:      number;
  netActive: boolean;
  netTimer:  number;
  netX:      number; netZ: number; // net world position
  travelT:   number; // 0-1 net travel progress
}

export function createNetLauncherState(): NetLauncherState {
  return { phase: "idle", uses: 2, netActive: false, netTimer: 0, netX: 0, netZ: 0, travelT: 0 };
}

export function tickNetLauncher(
  state: NetLauncherState,
  dt: number,
  qPressed: boolean,
  botX: number, botZ: number,
  facingX: number, facingZ: number,
): SecondaryOutput {
  const out = defaultSecOut(state.uses);

  if (qPressed && state.uses > 0 && state.phase === "idle") {
    state.phase    = "deploying";
    state.uses--;
    state.netX     = botX + facingX * 6;
    state.netZ     = botZ + facingZ * 6;
    state.travelT  = 0;
  }

  switch (state.phase) {
    case "deploying":
      state.travelT += dt / 0.4; // travels in 0.4s
      if (state.travelT >= 1) {
        state.netActive = true;
        state.netTimer  = 5.0;
        state.phase     = "active";
      }
      break;
    case "active":
      state.netTimer -= dt;
      if (state.netTimer <= 0) { state.netActive = false; state.phase = "cooldown"; }
      break;
    case "cooldown":
      break;
  }

  out.phase        = state.phase;
  out.effectActive = state.netActive;
  if (state.netActive) {
    out.statusEffect = { type: "entangle", duration: state.netTimer, value: 0.6 };
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// SEC 7 — SPIKE MINE DROPPER
// ─────────────────────────────────────────────────────────────
export interface Mine { x: number; z: number; active: boolean; id: number; }

export interface SpikeMinState {
  mines:     Mine[];
  nextId:    number;
  phase:     SecondaryPhase;
  dropTimer: number;
}

export function createSpikeMineState(): SpikeMinState {
  return { mines: [], nextId: 0, phase: "idle", dropTimer: 0 };
}

export function tickSpikeMine(
  state: SpikeMinState,
  dt: number,
  qPressed: boolean,
  botX: number, botZ: number,
  enemyX: number, enemyZ: number,
): { triggered: Mine | null; output: SecondaryOutput } {
  const out = defaultSecOut();
  state.dropTimer = Math.max(0, state.dropTimer - dt);

  if (qPressed && state.dropTimer <= 0 && state.mines.length < 5) {
    state.mines.push({ x: botX, z: botZ, active: true, id: state.nextId++ });
    state.dropTimer = 3.0;
  }

  let triggered: Mine | null = null;
  state.mines = state.mines.filter(m => {
    if (!m.active) return false;
    const dx = enemyX - m.x, dz = enemyZ - m.z;
    if (Math.sqrt(dx*dx + dz*dz) < 0.4) {
      m.active  = false;
      triggered = m;
      return false;
    }
    return true;
  });

  out.phase        = state.mines.length > 0 ? "active" : "idle";
  out.effectActive = !!triggered;
  return { triggered, output: out };
}

// ─────────────────────────────────────────────────────────────
// SEC 9 — TASER PRONGS
// ─────────────────────────────────────────────────────────────
export interface TaserProngsState {
  phase:      SecondaryPhase;
  stackCount: number;
  timer:      number;
  arcTimer:   number;
}

export function createTaserState(): TaserProngsState {
  return { phase: "idle", stackCount: 0, timer: 0, arcTimer: 0 };
}

export function tickTaserProngs(
  state: TaserProngsState,
  dt: number,
  qPressed: boolean,
  inRange: boolean,
): SecondaryOutput {
  const out = defaultSecOut();
  state.timer     = Math.max(0, state.timer - dt);
  state.arcTimer  = Math.max(0, state.arcTimer - dt);

  if (qPressed && inRange && state.timer <= 0) {
    state.stackCount = Math.min(3, state.stackCount + 1);
    state.timer      = 4.0; // cooldown
    state.arcTimer   = 0.5; // arc visible duration
    state.phase      = "fired";
  }
  if (state.arcTimer <= 0) state.phase = "idle";

  const speedReduction = state.stackCount * 0.20; // -20% per stack

  out.phase        = state.phase;
  out.intensity    = state.arcTimer / 0.5;
  out.effectActive = state.arcTimer > 0;
  if (state.stackCount > 0) {
    out.statusEffect = { type: "slow", duration: 4.0, value: speedReduction };
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// SEC 10 — DRILL ATTACHMENT
// ─────────────────────────────────────────────────────────────
export interface DrillState {
  phase:     SecondaryPhase;
  spinSpeed: number;
  spinRotZ:  number;
  timer:     number;
}

export function createDrillState(): DrillState {
  return { phase: "idle", spinSpeed: 0, spinRotZ: 0, timer: 0 };
}

export function tickDrill(
  state: DrillState,
  dt: number,
  qHeld: boolean,
  inContact: boolean,
): SecondaryOutput {
  const out = defaultSecOut();
  const TARGET_SPEED = 6;
  state.timer += dt;

  if (qHeld && inContact) {
    state.spinSpeed = Math.min(TARGET_SPEED, state.spinSpeed + TARGET_SPEED * dt);
    state.phase     = state.spinSpeed >= TARGET_SPEED ? "active" : "deploying";
  } else {
    state.spinSpeed = Math.max(0, state.spinSpeed - TARGET_SPEED * dt * 2);
    if (state.spinSpeed <= 0) state.phase = state.phase === "active" ? "cooldown" : "idle";
  }

  state.spinRotZ += state.spinSpeed * dt;

  out.phase        = state.phase;
  out.intensity    = state.spinSpeed / TARGET_SPEED;
  out.effectActive = state.phase === "active";
  return out;
}

// ─────────────────────────────────────────────────────────────
// SEC 12 — CONCUSSION CANNON
// ─────────────────────────────────────────────────────────────
export interface ConcussionCannonState {
  phase:     SecondaryPhase;
  uses:      number;
  timer:     number;
  projectileT: number;  // 0-1 travel progress
  fired:     boolean;
}

export function createConcussionState(): ConcussionCannonState {
  return { phase: "idle", uses: 1, timer: 0, projectileT: 0, fired: false };
}

export function tickConcussionCannon(
  state: ConcussionCannonState,
  dt: number,
  qPressed: boolean,
): SecondaryOutput {
  const out = defaultSecOut(state.uses);
  state.timer += dt;

  switch (state.phase) {
    case "idle":
      if (qPressed && state.uses > 0 && !state.fired) {
        state.phase = "deploying";
        state.timer = 0;
        state.uses--;
      }
      break;
    case "deploying": // 0.5s pre-fire
      if (state.timer >= 0.5) { state.phase = "fired"; state.projectileT = 0; state.timer = 0; }
      break;
    case "fired":
      state.projectileT = Math.min(1, state.projectileT + dt / 0.3);
      if (state.projectileT >= 1) { state.fired = true; state.phase = "empty"; }
      break;
    case "empty":
      // No recharge
      break;
  }

  out.phase        = state.phase;
  out.intensity    = state.phase === "deploying" ? state.timer / 0.5 : (state.phase === "fired" ? 1 : 0);
  out.effectActive = state.phase === "fired";
  return out;
}

// ─────────────────────────────────────────────────────────────
// DEFENSE ACTIVE STATES (Q key)
// ─────────────────────────────────────────────────────────────
export interface DefenseActiveState {
  phase:     SecondaryPhase;
  timer:     number;
  intensity: number;
}

export function createDefenseState(): DefenseActiveState {
  return { phase: "idle", timer: 0, intensity: 0 };
}

export function tickDefenseActive(
  state: DefenseActiveState,
  dt: number,
  qPressed: boolean,
  activeDuration: number,
): { active: boolean; damageMult: number; output: SecondaryOutput } {
  const out = defaultSecOut();
  state.timer += dt;

  switch (state.phase) {
    case "idle":
      state.intensity = Math.max(0, state.intensity - 2 * dt);
      if (qPressed) { state.phase = "deploying"; state.timer = 0; }
      break;
    case "deploying":
      state.intensity = Math.min(1, state.intensity + 5 * dt);
      if (state.timer >= 0.2) { state.phase = "active"; state.timer = 0; }
      break;
    case "active":
      state.intensity = 1;
      if (state.timer >= activeDuration) { state.phase = "retracting"; state.timer = 0; }
      break;
    case "retracting":
      state.intensity = Math.max(0, state.intensity - 3 * dt);
      if (state.intensity <= 0) { state.phase = "cooldown"; }
      break;
  }

  const isActive   = state.phase === "active";
  const damageMult = isActive ? 0.25 : 1.0; // 75% damage reduction

  out.phase        = state.phase;
  out.intensity    = state.intensity;
  out.effectActive = isActive;
  return { active: isActive, damageMult, output: out };
}

// ─────────────────────────────────────────────────────────────
// GRINDER (passive — auto-activates on side contact)
// ─────────────────────────────────────────────────────────────
export interface GrinderState {
  spinSpeed:  number;
  spinRotZ:   number;
  contactTime: number;   // cumulative contact seconds
  armorReduced: number;  // total armor points removed
}

export function createGrinderState(): GrinderState {
  return { spinSpeed: 0, spinRotZ: 0, contactTime: 0, armorReduced: 0 };
}

export function tickGrinder(
  state: GrinderState,
  dt: number,
  sideContact: boolean,
): { armorDelta: number; output: SecondaryOutput } {
  const out  = defaultSecOut();
  const RATE = 8.0;  // rad/s at full contact

  if (sideContact) {
    state.spinSpeed  = Math.min(RATE, state.spinSpeed + RATE * dt * 2);
    state.contactTime += dt;
    state.armorReduced = Math.floor(state.contactTime * 5);
  } else {
    state.spinSpeed = Math.max(0, state.spinSpeed - RATE * dt);
  }

  state.spinRotZ += state.spinSpeed * dt;

  const armorDelta = sideContact ? 5 * dt : 0; // -5 armor/second

  out.phase        = sideContact ? "active" : "idle";
  out.intensity    = state.spinSpeed / RATE;
  out.effectActive = sideContact;
  return { armorDelta, output: out };
}
