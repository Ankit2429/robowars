/**
 * particleEffects.ts
 * ──────────────────────────────────────────────────────────────
 * Pure data definitions for all particle effects used in combat.
 * Particle systems are described as config objects that any
 * renderer (Three.js Points, instanced meshes, etc.) can consume.
 * No React/Three.js imports — pure config & math.
 */

// ─────────────────────────────────────────────────────────────
// CORE PARTICLE TYPES
// ─────────────────────────────────────────────────────────────
export interface ParticleConfig {
  count:         number;        // max live particles in burst
  rate?:         number;        // particles per second (continuous)
  lifetime:      [number, number]; // [min, max] seconds
  speed:         [number, number]; // [min, max] units/s
  size:          [number, number]; // [min, max]
  gravity:       number;        // units/s² downward (usually 9.8)
  colors:        string[];      // gradient stops or random pick
  spread:        number;        // cone half-angle radians
  fadeIn:        number;        // 0-1 fraction of lifetime for fade in
  fadeOut:       number;        // 0-1 fraction of lifetime for fade out
  shrink:        boolean;       // shrink toward 0 at end of life
  glow:          boolean;       // emissive/additive blending
}

// ─────────────────────────────────────────────────────────────
// ALL PARTICLE EFFECT DEFINITIONS
// ─────────────────────────────────────────────────────────────
export const PARTICLES = {

  // ── Weapon impacts ──────────────────────────────────────────

  SPARK_LIGHT: {
    count: 60, lifetime: [0.2, 0.6], speed: [2, 6],
    size: [0.02, 0.05], gravity: 9.8,
    colors: ["#ffcc44", "#ff8800", "#ff4400"],
    spread: Math.PI * 0.6, fadeIn: 0, fadeOut: 0.4, shrink: true, glow: true,
  } satisfies ParticleConfig,

  SPARK_MEDIUM: {
    count: 150, lifetime: [0.3, 0.8], speed: [3, 9],
    size: [0.03, 0.07], gravity: 9.8,
    colors: ["#ffee66", "#ffaa00", "#ff5500"],
    spread: Math.PI * 0.7, fadeIn: 0, fadeOut: 0.3, shrink: true, glow: true,
  } satisfies ParticleConfig,

  SPARK_HEAVY: {
    count: 300, lifetime: [0.4, 1.0], speed: [4, 12],
    size: [0.04, 0.09], gravity: 9.8,
    colors: ["#ffffff", "#ffee44", "#ff8800", "#ff3300"],
    spread: Math.PI, fadeIn: 0, fadeOut: 0.25, shrink: true, glow: true,
  } satisfies ParticleConfig,

  SPARK_EXPLOSION: {
    count: 400, lifetime: [0.5, 1.2], speed: [5, 15],
    size: [0.05, 0.12], gravity: 9.8,
    colors: ["#ffffff", "#ffff88", "#ffaa00", "#ff4400"],
    spread: Math.PI, fadeIn: 0, fadeOut: 0.2, shrink: true, glow: true,
  } satisfies ParticleConfig,

  CONCUSSION_BURST: {
    count: 500, lifetime: [0.6, 1.5], speed: [6, 18],
    size: [0.06, 0.15], gravity: 9.8,
    colors: ["#ffffff", "#ccddff", "#ffff88", "#ff6600"],
    spread: Math.PI, fadeIn: 0, fadeOut: 0.2, shrink: true, glow: true,
  } satisfies ParticleConfig,

  KO_EXPLOSION: {
    count: 600, lifetime: [0.8, 2.0], speed: [4, 16],
    size: [0.08, 0.18], gravity: 9.8,
    colors: ["#ffffff", "#ffff44", "#ff8800", "#ff2200", "#cc0000"],
    spread: Math.PI, fadeIn: 0, fadeOut: 0.15, shrink: true, glow: true,
  } satisfies ParticleConfig,

  // ── Disc / spinner ──────────────────────────────────────────

  DISC_SPIN_CONTINUOUS: {
    count: 50, rate: 50, lifetime: [0.1, 0.3], speed: [1, 4],
    size: [0.02, 0.04], gravity: 1.0,
    colors: ["#ffcc44", "#ff8800"],
    spread: 0.3, fadeIn: 0, fadeOut: 0.5, shrink: true, glow: true,
  } satisfies ParticleConfig,

  DISC_OVERHEAT: {
    count: 80, lifetime: [0.3, 0.6], speed: [2, 5],
    size: [0.04, 0.08], gravity: 2.0,
    colors: ["#ff8800", "#ff4400", "#cc2200"],
    spread: Math.PI * 0.4, fadeIn: 0.1, fadeOut: 0.3, shrink: true, glow: true,
  } satisfies ParticleConfig,

  DRUM_METAL_CHIPS: {
    count: 100, rate: 100, lifetime: [0.15, 0.4], speed: [1, 3],
    size: [0.015, 0.035], gravity: 12.0,
    colors: ["#cccccc", "#aaaaaa", "#888888"],
    spread: 1.0, fadeIn: 0, fadeOut: 0.4, shrink: false, glow: false,
  } satisfies ParticleConfig,

  DRILL_CHIPS: {
    count: 80, rate: 80, lifetime: [0.2, 0.5], speed: [1.5, 4],
    size: [0.015, 0.04], gravity: 10.0,
    colors: ["#dddddd", "#bbbbbb", "#999999"],
    spread: 0.8, fadeIn: 0, fadeOut: 0.3, shrink: true, glow: false,
  } satisfies ParticleConfig,

  GRINDER_SPARKS: {
    count: 80, rate: 80, lifetime: [0.15, 0.4], speed: [2, 5],
    size: [0.02, 0.05], gravity: 8.0,
    colors: ["#ffff88", "#ffaa00", "#cccccc"],
    spread: 0.5, fadeIn: 0, fadeOut: 0.4, shrink: true, glow: true,
  } satisfies ParticleConfig,

  // ── Fire & flame ────────────────────────────────────────────

  FLAME_CONTINUOUS: {
    count: 60, rate: 60, lifetime: [0.4, 0.9], speed: [2, 5],
    size: [0.05, 0.15], gravity: -2.0, // rises
    colors: ["#ffffff", "#aaffff", "#0066ff", "#cc2200", "#440000"],
    spread: 0.3, fadeIn: 0.2, fadeOut: 0.4, shrink: true, glow: true,
  } satisfies ParticleConfig,

  FIRE_ON_ENEMY: {
    count: 40, rate: 40, lifetime: [0.3, 0.7], speed: [0.5, 1.5],
    size: [0.04, 0.10], gravity: -1.5,
    colors: ["#ffff44", "#ff8800", "#ff4400", "#cc2200"],
    spread: 0.6, fadeIn: 0.1, fadeOut: 0.4, shrink: true, glow: true,
  } satisfies ParticleConfig,

  FLAMETHROWER_SCORCH: {
    count: 20, rate: 20, lifetime: [0.6, 1.2], speed: [0.5, 2],
    size: [0.08, 0.20], gravity: 0.5,
    colors: ["#333333", "#222222", "#111111"],
    spread: 0.4, fadeIn: 0.3, fadeOut: 0.5, shrink: false, glow: false,
  } satisfies ParticleConfig,

  VENT_FLAME: {
    count: 30, lifetime: [0.3, 0.6], speed: [1, 3],
    size: [0.04, 0.10], gravity: -2.0,
    colors: ["#ffffff", "#ff8800", "#ff4400"],
    spread: 0.2, fadeIn: 0.1, fadeOut: 0.4, shrink: true, glow: true,
  } satisfies ParticleConfig,

  // ── Electric / EMP ──────────────────────────────────────────

  EMP_RING_BURST: {
    count: 80, lifetime: [0.3, 0.6], speed: [4, 8],
    size: [0.03, 0.07], gravity: 0,
    colors: ["#88aaff", "#aaccff", "#ffffff"],
    spread: Math.PI * 0.1, // near-flat outward burst
    fadeIn: 0, fadeOut: 0.5, shrink: true, glow: true,
  } satisfies ParticleConfig,

  ELECTRIC_ON_ENEMY: {
    count: 30, rate: 30, lifetime: [0.1, 0.25], speed: [0.3, 0.8],
    size: [0.02, 0.05], gravity: 0,
    colors: ["#aaccff", "#88aaff", "#ffffff"],
    spread: Math.PI, fadeIn: 0, fadeOut: 0.5, shrink: true, glow: true,
  } satisfies ParticleConfig,

  // ── Smoke / dust ────────────────────────────────────────────

  DUST_KICK: {
    count: 30, rate: 20, lifetime: [0.5, 1.2], speed: [0.5, 1.5],
    size: [0.06, 0.18], gravity: -0.5,
    colors: ["#888888", "#666666", "#444444"],
    spread: 1.2, fadeIn: 0.2, fadeOut: 0.6, shrink: false, glow: false,
  } satisfies ParticleConfig,

  SMOKE_SCREEN: {
    count: 100, rate: 100, lifetime: [3, 5], speed: [0.3, 0.8],
    size: [0.20, 0.60], gravity: -0.2,
    colors: ["#222222", "#333333", "#111111"],
    spread: 1.5, fadeIn: 0.4, fadeOut: 0.5, shrink: false, glow: false,
  } satisfies ParticleConfig,

  GROUND_SLAM_DUST: {
    count: 300, lifetime: [0.5, 1.0], speed: [2, 7],
    size: [0.06, 0.16], gravity: 2.0,
    colors: ["#888888", "#aaaaaa", "#666666"],
    spread: Math.PI * 0.8, fadeIn: 0, fadeOut: 0.4, shrink: false, glow: false,
  } satisfies ParticleConfig,

  BODY_SLAM_DUST: {
    count: 400, lifetime: [0.6, 1.2], speed: [3, 8],
    size: [0.07, 0.18], gravity: 1.5,
    colors: ["#999999", "#bbbbbb", "#777777"],
    spread: Math.PI, fadeIn: 0, fadeOut: 0.35, shrink: false, glow: false,
  } satisfies ParticleConfig,

  // ── Poison (Viper) ──────────────────────────────────────────

  POISON_BURST: {
    count: 80, lifetime: [0.4, 0.8], speed: [2, 5],
    size: [0.04, 0.10], gravity: -0.5,
    colors: ["#00ff44", "#00cc33", "#008822"],
    spread: Math.PI, fadeIn: 0.1, fadeOut: 0.4, shrink: true, glow: true,
  } satisfies ParticleConfig,

  POISON_CONTINUOUS: {
    count: 15, rate: 15, lifetime: [0.5, 1.0], speed: [0.3, 0.8],
    size: [0.03, 0.07], gravity: -0.8,
    colors: ["#00ff66", "#00dd44", "#006622"],
    spread: 0.8, fadeIn: 0.2, fadeOut: 0.4, shrink: true, glow: true,
  } satisfies ParticleConfig,

  // ── Blue / Phase effects ─────────────────────────────────────

  PHASE_DASH_TRAIL: {
    count: 60, lifetime: [0.2, 0.4], speed: [0.5, 1.5],
    size: [0.04, 0.10], gravity: 0,
    colors: ["#88ccff", "#0077ff", "#0044aa"],
    spread: 0.4, fadeIn: 0, fadeOut: 0.6, shrink: true, glow: true,
  } satisfies ParticleConfig,

  GHOST_DAMAGE_HIT: {
    count: 15, lifetime: [0.2, 0.4], speed: [1, 3],
    size: [0.03, 0.07], gravity: 0,
    colors: ["#6688ff", "#4466dd", "#2244aa"],
    spread: Math.PI, fadeIn: 0, fadeOut: 0.5, shrink: true, glow: true,
  } satisfies ParticleConfig,

  // ── Mine explosion ───────────────────────────────────────────

  MINE_EXPLOSION: {
    count: 100, lifetime: [0.4, 0.9], speed: [2, 8],
    size: [0.05, 0.12], gravity: 5.0,
    colors: ["#ffff88", "#ff8800", "#ff4400", "#666666"],
    spread: Math.PI, fadeIn: 0, fadeOut: 0.3, shrink: true, glow: true,
  } satisfies ParticleConfig,

  // ── Net impact ───────────────────────────────────────────────

  NET_HIT: {
    count: 30, lifetime: [0.3, 0.6], speed: [1, 3],
    size: [0.03, 0.07], gravity: 4.0,
    colors: ["#aaaaaa", "#cccccc", "#888888"],
    spread: 1.5, fadeIn: 0, fadeOut: 0.4, shrink: true, glow: false,
  } satisfies ParticleConfig,

  // ── Foam chunks (ablative) ──────────────────────────────────

  FOAM_CHUNKS: {
    count: 5, lifetime: [0.5, 1.0], speed: [2, 5],
    size: [0.08, 0.14], gravity: 9.8,
    colors: ["#555555", "#444444", "#666666"],
    spread: 1.0, fadeIn: 0, fadeOut: 0.3, shrink: false, glow: false,
  } satisfies ParticleConfig,

  // ── Afterburner trail ────────────────────────────────────────

  AFTERBURNER_TRAIL: {
    count: 40, rate: 40, lifetime: [0.2, 0.5], speed: [3, 6],
    size: [0.04, 0.10], gravity: 0.5,
    colors: ["#ffffff", "#ffee44", "#ffaa00", "#ff5500"],
    spread: 0.15, fadeIn: 0, fadeOut: 0.5, shrink: true, glow: true,
  } satisfies ParticleConfig,

  BOOST_SMOKE: {
    count: 25, lifetime: [0.4, 0.8], speed: [1, 2.5],
    size: [0.06, 0.14], gravity: 0,
    colors: ["#888888", "#666666", "#444444"],
    spread: 0.5, fadeIn: 0.2, fadeOut: 0.5, shrink: false, glow: false,
  } satisfies ParticleConfig,

} as const;

export type ParticleEffectKey = keyof typeof PARTICLES;

// ─────────────────────────────────────────────────────────────
// PARTICLE INSTANCE (runtime state per live particle)
// ─────────────────────────────────────────────────────────────
export interface LiveParticle {
  x: number; y: number; z: number;   // position
  vx: number; vy: number; vz: number; // velocity
  life: number;    // remaining lifetime
  maxLife: number; // initial lifetime
  size: number;
  color: string;
  opacity: number;
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function randomInRange([min, max]: [number, number]): number {
  return lerp(min, max, Math.random());
}

/** Emit a burst of particles from a world position, return array of LiveParticle */
export function emitBurst(
  cfg: ParticleConfig,
  ox: number, oy: number, oz: number,
  dirX = 0, dirZ = 0,
): LiveParticle[] {
  const particles: LiveParticle[] = [];
  for (let i = 0; i < cfg.count; i++) {
    const life  = randomInRange(cfg.lifetime);
    const speed = randomInRange(cfg.speed);
    // Spread cone around direction
    const theta = (Math.random() * 2 - 1) * cfg.spread;
    const phi   = Math.random() * Math.PI * 2;
    const baseAngle = Math.atan2(dirX, dirZ);
    const vx = Math.sin(baseAngle + theta) * speed * Math.cos(phi * 0.5);
    const vy = Math.sin(phi) * speed * 0.5 + 1; // slight upward bias
    const vz = Math.cos(baseAngle + theta) * speed * Math.cos(phi * 0.5);
    const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
    particles.push({
      x: ox, y: oy, z: oz,
      vx, vy, vz,
      life, maxLife: life,
      size: randomInRange(cfg.size),
      color,
      opacity: 1,
    });
  }
  return particles;
}

/** Tick all live particles — returns filtered (alive) array */
export function tickParticles(particles: LiveParticle[], dt: number, gravity = 9.8): LiveParticle[] {
  return particles
    .map(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt - gravity * dt * dt * 0.5;
      p.z += p.vz * dt;
      p.vy -= gravity * dt;
      p.life -= dt;
      const progress = 1 - p.life / p.maxLife;
      // Opacity
      p.opacity = Math.min(
        progress < 0.1 ? progress / 0.1 : 1,
        progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1,
      );
      return p;
    })
    .filter(p => p.life > 0);
}

// ─────────────────────────────────────────────────────────────
// SHOCKWAVE RING DEFINITION (floor-level expanding ring)
// ─────────────────────────────────────────────────────────────
export interface ShockwaveConfig {
  maxRadius:   number;
  duration:    number;  // seconds to expand
  color:       string;
  height:      number;  // Y above floor
  thickness:   number;
}

export const SHOCKWAVES = {
  GROUND_SLAM: { maxRadius: 4, duration: 0.4, color: "#ff6600", height: 0.1, thickness: 0.12 } satisfies ShockwaveConfig,
  BODY_SLAM:   { maxRadius: 3, duration: 0.4, color: "#ff8800", height: 0.1, thickness: 0.10 } satisfies ShockwaveConfig,
  TREMOR_STOMP:{ maxRadius: 2, duration: 0.3, color: "#884400", height: 0.08, thickness: 0.08 } satisfies ShockwaveConfig,
  EMP_LARGE:   { maxRadius: 5, duration: 0.5, color: "#88aaff", height: 0.15, thickness: 0.15 } satisfies ShockwaveConfig,
} as const;

export interface ShockwaveState {
  radius:   number;
  progress: number; // 0-1
  config:   ShockwaveConfig;
  active:   boolean;
  x: number; z: number;
}

export function createShockwave(cfg: ShockwaveConfig, x: number, z: number): ShockwaveState {
  return { radius: 0, progress: 0, config: cfg, active: true, x, z };
}

export function tickShockwave(s: ShockwaveState, dt: number): void {
  if (!s.active) return;
  s.progress = Math.min(1, s.progress + dt / s.config.duration);
  s.radius   = s.progress * s.config.maxRadius;
  if (s.progress >= 1) s.active = false;
}

export function getShockwaveOpacity(s: ShockwaveState): number {
  return 1 - s.progress; // fades as it expands
}
