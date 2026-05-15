/**
 * weaponKeybinds.ts
 * ──────────────────────────────────────────────────────────────
 * Input mapping layer — completely decoupled from game logic.
 * Provides a clean InputState snapshot each frame.
 * Never modifies game state directly.
 */

// ─────────────────────────────────────────────────────────────
// KEY BINDINGS REGISTRY
// ─────────────────────────────────────────────────────────────
export const KEYBIND = {
  // Movement (already handled in battle.tsx — listed for reference)
  MOVE_FORWARD:  ["KeyW", "ArrowUp"],
  MOVE_BACKWARD: ["KeyS", "ArrowDown"],
  MOVE_LEFT:     ["KeyA", "ArrowLeft"],
  MOVE_RIGHT:    ["KeyD", "ArrowRight"],

  // Combat
  PRIMARY_WEAPON:   ["Space"],          // SPACE — all primary weapons
  SECONDARY_WEAPON: ["KeyQ"],           // Q     — secondary / defense active
  CHASSIS_SPECIAL:  ["KeyE"],           // E     — chassis unique special
  CHASSIS_BOOST:    ["ShiftLeft", "ShiftRight"], // SHIFT — chassis boost
} as const;

export type ActionKey = keyof typeof KEYBIND;

// ─────────────────────────────────────────────────────────────
// INPUT STATE — snapshot for one game tick
// ─────────────────────────────────────────────────────────────
export interface InputState {
  // Movement
  forward:  boolean;
  backward: boolean;
  left:     boolean;
  right:    boolean;

  // Ability presses (true = pressed this frame, NOT held)
  primaryPressed:   boolean;
  secondaryPressed: boolean;
  specialPressed:   boolean;
  boostPressed:     boolean;

  // Ability holds (true = held down)
  primaryHeld:   boolean;
  secondaryHeld: boolean;
  boostHeld:     boolean;

  // Ability releases (true = released this frame)
  primaryReleased:   boolean;
  secondaryReleased: boolean;
}

// ─────────────────────────────────────────────────────────────
// INPUT MANAGER — attach to window, read each frame
// ─────────────────────────────────────────────────────────────
export class InputManager {
  private held:     Set<string> = new Set();
  private pressed:  Set<string> = new Set(); // just this frame
  private released: Set<string> = new Set(); // just this frame

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.held.has(e.code)) return; // already held — not a new press
    this.held.add(e.code);
    this.pressed.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
    this.released.add(e.code);
  };

  attach(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup",   this.onKeyUp);
  }

  detach(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup",   this.onKeyUp);
  }

  /** Call ONCE per frame to get current input snapshot, then clear transient state */
  consume(): InputState {
    const isHeld    = (codes: readonly string[]) => codes.some(c => this.held.has(c));
    const isPressed = (codes: readonly string[]) => codes.some(c => this.pressed.has(c));
    const isReleased = (codes: readonly string[]) => codes.some(c => this.released.has(c));

    const snap: InputState = {
      forward:  isHeld(KEYBIND.MOVE_FORWARD),
      backward: isHeld(KEYBIND.MOVE_BACKWARD),
      left:     isHeld(KEYBIND.MOVE_LEFT),
      right:    isHeld(KEYBIND.MOVE_RIGHT),

      primaryPressed:   isPressed(KEYBIND.PRIMARY_WEAPON),
      secondaryPressed: isPressed(KEYBIND.SECONDARY_WEAPON),
      specialPressed:   isPressed(KEYBIND.CHASSIS_SPECIAL),
      boostPressed:     isPressed(KEYBIND.CHASSIS_BOOST),

      primaryHeld:   isHeld(KEYBIND.PRIMARY_WEAPON),
      secondaryHeld: isHeld(KEYBIND.SECONDARY_WEAPON),
      boostHeld:     isHeld(KEYBIND.CHASSIS_BOOST),

      primaryReleased:   isReleased(KEYBIND.PRIMARY_WEAPON),
      secondaryReleased: isReleased(KEYBIND.SECONDARY_WEAPON),
    };

    // Clear transient sets
    this.pressed.clear();
    this.released.clear();

    return snap;
  }

  /** Check if any key is held without consuming */
  peek(code: string): boolean {
    return this.held.has(code);
  }
}

// ─────────────────────────────────────────────────────────────
// CHASSIS SPECIAL ABILITY STATE MACHINE
// ─────────────────────────────────────────────────────────────
export type SpecialPhase =
  | "idle"
  | "charge"    // pre-activation buildup
  | "active"    // ability executing
  | "recovery"  // post-ability recovery
  | "cooldown"; // waiting for next use

export interface SpecialAbilityState {
  phase:   SpecialPhase;
  timer:   number;  // time in current phase
  data:    Record<string, number | boolean | string>; // per-ability scratch data
}

export function createSpecialState(): SpecialAbilityState {
  return { phase: "idle", timer: 0, data: {} };
}

// Phase durations per chassis (seconds)
export const SPECIAL_PHASE_DURATIONS: Record<string, {
  charge: number; active: number; recovery: number;
}> = {
  titan:    { charge: 0.50, active: 0.80, recovery: 0.20 }, // Ground Slam
  wasp:     { charge: 0.20, active: 3.00, recovery: 0.50 }, // Afterburner
  goliath:  { charge: 0.30, active: 1.80, recovery: 0.30 }, // Goliath Charge
  phantom:  { charge: 0.05, active: 0.20, recovery: 0.10 }, // Phase Dash
  fortress: { charge: 0.30, active: 4.00, recovery: 0.30 }, // Lockdown
  viper:    { charge: 0.20, active: 0.45, recovery: 0.10 }, // Viper Strike
  colossus: { charge: 0.40, active: 1.20, recovery: 0.50 }, // Body Slam
  wraith:   { charge: 0.10, active: 4.00, recovery: 0.50 }, // Spectral Surge
  bulwark:  { charge: 0.20, active: 3.00, recovery: 0.30 }, // Shield Wall
  lynx:     { charge: 0.25, active: 0.65, recovery: 0.30 }, // Pounce
  rhino:    { charge: 0.40, active: 2.00, recovery: 0.30 }, // Rhino Charge
  shadow:   { charge: 0.10, active: 3.10, recovery: 0.10 }, // Shadow Clone
};

export function tickSpecialState(
  state: SpecialAbilityState,
  chassisKey: string,
  dt: number,
): SpecialPhase {
  const dur = SPECIAL_PHASE_DURATIONS[chassisKey];
  if (!dur) return state.phase;

  state.timer += dt;

  switch (state.phase) {
    case "charge":
      if (state.timer >= dur.charge) {
        state.phase = "active";
        state.timer = 0;
      }
      break;
    case "active":
      if (state.timer >= dur.active) {
        state.phase = "recovery";
        state.timer = 0;
      }
      break;
    case "recovery":
      if (state.timer >= dur.recovery) {
        state.phase = "idle";
        state.timer = 0;
      }
      break;
    default:
      break;
  }
  return state.phase;
}

export function activateSpecial(state: SpecialAbilityState): boolean {
  if (state.phase !== "idle") return false;
  state.phase = "charge";
  state.timer = 0;
  state.data  = {};
  return true;
}

// ─────────────────────────────────────────────────────────────
// BOOST STATE MACHINE
// ─────────────────────────────────────────────────────────────
export interface BoostState {
  active:      boolean;
  timer:       number;
  speedMult:   number;
}

export const BOOST_CONFIG: Record<string, { duration: number; speedMult: number }> = {
  titan:    { duration: 1.5, speedMult: 1.8 },
  wasp:     { duration: 0.3, speedMult: 2.0 }, // dodge roll
  goliath:  { duration: 0.8, speedMult: 2.0 },
  phantom:  { duration: 1.5, speedMult: 1.5 }, // ghost step
  fortress: { duration: 0.3, speedMult: 1.5 }, // reverse burst
  viper:    { duration: 1.0, speedMult: 1.6 }, // serpentine
  colossus: { duration: 0.5, speedMult: 1.8 }, // tremor stomp
  wraith:   { duration: 0.4, speedMult: 2.5 }, // ghost dash
  bulwark:  { duration: 0.3, speedMult: 1.5 }, // shield bash
  lynx:     { duration: 1.2, speedMult: 1.9 }, // predator sprint
  rhino:    { duration: 0.5, speedMult: 1.8 }, // horn thrust
  shadow:   { duration: 1.0, speedMult: 1.6 }, // vanish sprint
};

export function createBoostState(): BoostState {
  return { active: false, timer: 0, speedMult: 1 };
}

export function activateBoost(state: BoostState, chassisKey: string): boolean {
  if (state.active) return false;
  const cfg = BOOST_CONFIG[chassisKey];
  if (!cfg) return false;
  state.active    = true;
  state.timer     = cfg.duration;
  state.speedMult = cfg.speedMult;
  return true;
}

export function tickBoost(state: BoostState, dt: number): number {
  if (!state.active) return 1;
  state.timer -= dt;
  if (state.timer <= 0) {
    state.active    = false;
    state.speedMult = 1;
    return 1;
  }
  return state.speedMult;
}
