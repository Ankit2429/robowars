import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { WebGLErrorBoundary } from "@/components/WebGLErrorBoundary";
import { useWebGLSupported } from "@/hooks/useWebGL";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, Zap, Trophy } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useSession } from "@/context/SessionContext";
import { getApiUrl } from "@/lib/api-url";
import { RageQuitModal } from "@/components/RageQuitModal";
import { HighFidelityRobotMesh } from "@/components/RobotParts3D";

// ─── Types ───────────────────────────────────────────────────────────────────
interface StoredRobot {
  playerName: string;
  robotName: string;
  bodyColor: string;
  attackColor: string;
  defenseColor: string;
  attackPartId?: string;
  bodyPartId?: string;
  defensePartId?: string;
  secondaryWeaponId?: string;
  stats: { armor: number; power: number; speed: number; energy: number };
}
interface PosRef { x: number; z: number }
interface VelRef { x: number; z: number }

interface SparkBurst { id: number; x: number; y: number; z: number; color: string }

const DEFAULT_P1: StoredRobot = {
  playerName: "PLAYER 1", robotName: "STRIKER",
  bodyColor: "#8B0000", attackColor: "#cc1100", defenseColor: "#550000",
  attackPartId: "attack-crusher",
  stats: { armor: 100, power: 100, speed: 50, energy: 60 },
};
const DEFAULT_AI: StoredRobot = {
  playerName: "CPU RIVAL", robotName: "NEMESIS",
  bodyColor: "#003380", attackColor: "#0055cc", defenseColor: "#001a55",
  attackPartId: "attack-plasma",
  stats: { armor: 80, power: 85, speed: 70, energy: 80 },
};

// ─── Arena constants ──────────────────────────────────────────────────────────
const ARENA_X = 16.0;  // was 9.0 — 1.8× scale
const ARENA_Z = 12.5;  // was 7.0 — 1.8× scale

// HazardWreckingBall and all hazard components removed — clean open arena

// ─── 3D: Minimal Industrial Battle Arena ─────────────────────────────────────
function ProcArena() {
  const W = ARENA_X * 2 + 2, D = ARENA_Z * 2 + 2;
  // Panel seam positions across the large floor
  const seamsX = [-12,-8,-4,0,4,8,12];
  const seamsZ = [-8,-4,0,4,8];
  return (
    <group>
      {/* ── FLOOR: Dark industrial steel ── */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.01,0]} receiveShadow>
        <planeGeometry args={[W+4, D+4]}/>
        <meshStandardMaterial
          color="#141618"
          metalness={0.88}
          roughness={0.38}
          envMapIntensity={2.2}
        />
      </mesh>
      {/* Secondary reflective mid-panel */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.005,0]} receiveShadow>
        <planeGeometry args={[W+2, D+2]}/>
        <meshStandardMaterial
          color="#0e1012"
          metalness={0.95}
          roughness={0.22}
          envMapIntensity={2.8}
        />
      </mesh>
      {/* Panel seams — subtle grid lines */}
      {seamsX.map(x=><mesh key={`px-${x}`} rotation={[-Math.PI/2,0,0]} position={[x,0.005,0]}>
        <planeGeometry args={[0.035, D+4]}/><meshBasicMaterial color="#242628"/>
      </mesh>)}
      {seamsZ.map(z=><mesh key={`pz-${z}`} rotation={[-Math.PI/2,0,0]} position={[0,0.005,z]}>
        <planeGeometry args={[W+4, 0.035]}/><meshBasicMaterial color="#242628"/>
      </mesh>)}
      {/* Tyre marks — wide dark streaks */}
      {[[-6,3,0.4],[-2,-5,1.8],[8,2,0.0],[4,-3,2.6],[-9,1,0.9]].map(([x,z,r],i)=>(
        <mesh key={`tyre-${i}`} rotation={[-Math.PI/2,0,r]} position={[x,0.008,z]}>
          <planeGeometry args={[0.18, 4.5]}/><meshBasicMaterial color="#101012" transparent opacity={0.7}/>
        </mesh>
      ))}
      {/* Scorch circles — 4 spots */}
      {[[-10,4],[7,-6],[-5,-8],[11,3]].map(([x,z],i)=>(
        <mesh key={`burn-${i}`} rotation={[-Math.PI/2,0,0]} position={[x,0.009,z]}>
          <circleGeometry args={[0.65+i*0.1, 20]}/><meshBasicMaterial color="#0c0c0e" transparent opacity={0.8}/>
        </mesh>
      ))}
      {/* Centre wear plate — lighter brushed area */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.007,0]}>
        <circleGeometry args={[5, 40]}/><meshBasicMaterial color="#202224" transparent opacity={0.55}/>
      </mesh>
      {/* Warning stripe — centre line (faint) */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]}>
        <planeGeometry args={[W+2, 0.08]}/><meshBasicMaterial color="#2a2000" transparent opacity={0.5}/>
      </mesh>
      {/* No start zones — clean open combat floor */}
      {/* ── WALLS: Steel base ── */}
      <mesh position={[0,1.8,-ARENA_Z-0.7]} castShadow receiveShadow>
        <boxGeometry args={[W+3, 3.6, 0.55]}/>
        <meshStandardMaterial color="#080a0c" metalness={0.96} roughness={0.14} envMapIntensity={2.0}/>
      </mesh>
      <mesh position={[0,1.8, ARENA_Z+0.7]} castShadow receiveShadow>
        <boxGeometry args={[W+3, 3.6, 0.55]}/>
        <meshStandardMaterial color="#080a0c" metalness={0.96} roughness={0.14} envMapIntensity={2.0}/>
      </mesh>
      <mesh position={[-ARENA_X-0.7,1.8,0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 3.6, D+3]}/>
        <meshStandardMaterial color="#080a0c" metalness={0.96} roughness={0.14} envMapIntensity={2.0}/>
      </mesh>
      <mesh position={[ ARENA_X+0.7,1.8,0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 3.6, D+3]}/>
        <meshStandardMaterial color="#080a0c" metalness={0.96} roughness={0.14} envMapIntensity={2.0}/>
      </mesh>
      {/* Glass panels — all 4 sides */}
      <mesh position={[0,1.6,-ARENA_Z-0.42]}>
        <boxGeometry args={[W+2.5, 2.8, 0.05]}/><meshStandardMaterial color="#2a3844" transparent opacity={0.12} roughness={0.04} metalness={0.1}/>
      </mesh>
      <mesh position={[0,1.6, ARENA_Z+0.42]}>
        <boxGeometry args={[W+2.5, 2.8, 0.05]}/><meshStandardMaterial color="#2a3844" transparent opacity={0.12} roughness={0.04} metalness={0.1}/>
      </mesh>
      <mesh position={[-ARENA_X-0.42,1.6,0]}>
        <boxGeometry args={[0.05, 2.8, D+2.5]}/><meshStandardMaterial color="#2a3844" transparent opacity={0.12} roughness={0.04} metalness={0.1}/>
      </mesh>
      <mesh position={[ ARENA_X+0.42,1.6,0]}>
        <boxGeometry args={[0.05, 2.8, D+2.5]}/><meshStandardMaterial color="#2a3844" transparent opacity={0.12} roughness={0.04} metalness={0.1}/>
      </mesh>
      {/* Top rails */}
      <mesh position={[0,3.6,-ARENA_Z-0.7]}><boxGeometry args={[W+3.5,0.22,0.75]}/><meshStandardMaterial color="#1e2022" metalness={0.9} roughness={0.25}/></mesh>
      <mesh position={[0,3.6, ARENA_Z+0.7]}><boxGeometry args={[W+3.5,0.22,0.75]}/><meshStandardMaterial color="#1e2022" metalness={0.9} roughness={0.25}/></mesh>
      <mesh position={[-ARENA_X-0.7,3.6,0]}><boxGeometry args={[0.75,0.22,D+3.5]}/><meshStandardMaterial color="#1e2022" metalness={0.9} roughness={0.25}/></mesh>
      <mesh position={[ ARENA_X+0.7,3.6,0]}><boxGeometry args={[0.75,0.22,D+3.5]}/><meshStandardMaterial color="#1e2022" metalness={0.9} roughness={0.25}/></mesh>
      {/* Yellow bumper rails — front/back, 7 segments */}
      {[-12,-8,-4,0,4,8,12].map((x,i)=>[
        <mesh key={`yf-${i}`} position={[x,0.5,-ARENA_Z-0.35]}><boxGeometry args={[3.2,0.42,0.3]}/><meshStandardMaterial color="#d4a800" metalness={0.6} roughness={0.42}/></mesh>,
        <mesh key={`yb-${i}`} position={[x,0.5, ARENA_Z+0.35]}><boxGeometry args={[3.2,0.42,0.3]}/><meshStandardMaterial color="#d4a800" metalness={0.6} roughness={0.42}/></mesh>
      ])}
      {/* Yellow bumper rails — sides, 5 segments */}
      {[-8,-4,0,4,8].map((z,i)=>[
        <mesh key={`yl-${i}`} position={[-ARENA_X-0.35,0.5,z]}><boxGeometry args={[0.3,0.42,4.5]}/><meshStandardMaterial color="#d4a800" metalness={0.6} roughness={0.42}/></mesh>,
        <mesh key={`yr-${i}`} position={[ ARENA_X+0.35,0.5,z]}><boxGeometry args={[0.3,0.42,4.5]}/><meshStandardMaterial color="#d4a800" metalness={0.6} roughness={0.42}/></mesh>
      ])}
      {/* Corner pillars — fully metallic, no colored blocks */}
      {([[-ARENA_X-0.6,-ARENA_Z-0.6],[ARENA_X+0.6,-ARENA_Z-0.6],[-ARENA_X-0.6,ARENA_Z+0.6],[ARENA_X+0.6,ARENA_Z+0.6]] as [number,number][]).map(([x,z],i)=>(
        <group key={`cp-${i}`} position={[x,0,z]}>
          <mesh position={[0,2,0]} castShadow>
            <boxGeometry args={[1.2,4.2,1.2]}/>
            <meshStandardMaterial color="#0a0a0c" metalness={0.95} roughness={0.15}/>
          </mesh>
          {/* Metallic cap with emissive team color accent strip */}
          <mesh position={[0,4.25,0]}>
            <boxGeometry args={[1.35,0.18,1.35]}/>
            <meshStandardMaterial
              color={i<2?"#330800":"#001133"}
              emissive={i<2?"#ff2200":"#0055ff"}
              emissiveIntensity={0.8}
              metalness={0.9} roughness={0.2}
            />
          </mesh>
          <pointLight position={[0,3.8,0]} color={i<2?"#ff2200":"#0055ff"} intensity={1.5} distance={8}/>
        </group>
      ))}
      {/* ── OVERHEAD LIGHTS — invisible, perimeter only, no visible geometry ── */}
      {/* Left wall lights */}
      <pointLight position={[-ARENA_X-0.5, 7, -ARENA_Z*0.4]} color="#ddeeff" intensity={12} distance={30}/>
      <pointLight position={[-ARENA_X-0.5, 7,  ARENA_Z*0.4]} color="#ddeeff" intensity={12} distance={30}/>
      {/* Right wall lights */}
      <pointLight position={[ ARENA_X+0.5, 7, -ARENA_Z*0.4]} color="#ddeeff" intensity={12} distance={30}/>
      <pointLight position={[ ARENA_X+0.5, 7,  ARENA_Z*0.4]} color="#ddeeff" intensity={12} distance={30}/>
      {/* Front/back wall lights */}
      <pointLight position={[0, 7, -ARENA_Z-0.5]} color="#ddeeff" intensity={12} distance={30}/>
      <pointLight position={[0, 7,  ARENA_Z+0.5]} color="#ddeeff" intensity={12} distance={30}/>
      {/* Centre overhead fill */}
      <pointLight position={[0,9,0]} color="#ffffff" intensity={5} distance={40}/>
      {/* Zone-tint lights */}
      <pointLight position={[0,5,-ARENA_Z+3]} color="#ff2200" intensity={4} distance={14}/>
      <pointLight position={[0,5, ARENA_Z-3]} color="#2255ff" intensity={4} distance={14}/>
      <fog attach="fog" args={["#08080a", 35, 80]}/>
    </group>
  );
}


// ─── 3D: Impact flash — flat ring burst (no floating polyhedron) ─────────────
function ImpactFlash({ x, y, z, color }: { x: number; y: number; z: number; color: string }) {
  return (
    <group position={[x, y, z]}>
      {/* Core flash — flat disc on floor */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[0.6, 20]}/>
        <meshBasicMaterial color={color} transparent opacity={0.8}/>
      </mesh>
      {/* Expanding ring */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.6, 1.4, 24]}/>
        <meshBasicMaterial color={color} transparent opacity={0.45}/>
      </mesh>
      {/* Outer glow ring */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[1.4, 2.2, 24]}/>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.10}/>
      </mesh>
      {/* Vertical spark upward — small cylinder */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.06, 0.18, 1.0, 8]}/>
        <meshBasicMaterial color={color} transparent opacity={0.5}/>
      </mesh>
    </group>
  );
}

function RealisticEnvironment() {
  const { gl, scene } = useThree();
  // Build environment map once
  const envTexture = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return tex;
  }, [gl]);

  useEffect(() => {
    scene.environment = envTexture;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.35;
    return () => { scene.environment = null; };
  }, [gl, scene, envTexture]);

  return null;
}

// ─── 3D: Arena robot ─────────────────────────────────────────────────────────
function ArenaRobot({ posRef, targetPosRef, velRef, config, isAttacking, isHit, lungeDirRef }: {
  posRef: React.MutableRefObject<PosRef>;
  targetPosRef: React.MutableRefObject<PosRef>;
  velRef: React.MutableRefObject<VelRef>;
  config: StoredRobot;
  isAttacking: boolean;
  isHit: boolean;
  lungeDirRef?: React.MutableRefObject<{ x: number; z: number; active: boolean }>;
}) {
  const groupRef  = useRef<THREE.Group>(null!);
  const timeRef   = useRef(0);
  const recoilRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    recoilRef.current = Math.max(0, recoilRef.current - delta * 6);
    if (isHit) recoilRef.current = 1.0;
    const g = groupRef.current;
    g.position.x = THREE.MathUtils.lerp(g.position.x, posRef.current.x, 0.28);
    g.position.z = THREE.MathUtils.lerp(g.position.z, posRef.current.z, 0.28);
    const dx = targetPosRef.current.x - posRef.current.x;
    const dz = targetPosRef.current.z - posRef.current.z;
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, Math.atan2(dx, dz), 0.18);
    if (isHit) {
      g.position.y = Math.sin(timeRef.current * 38) * 0.18 * recoilRef.current;
      g.rotation.z = Math.sin(timeRef.current * 32) * 0.14 * recoilRef.current;
    } else if (isAttacking) {
      g.position.y = THREE.MathUtils.lerp(g.position.y, 0, 0.2); // Keep grounded during advanced attacks
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, 0, 0.15);
    } else {
      g.position.y = Math.sin(timeRef.current * 2.2) * 0.04;
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, 0, 0.1);
    }
    if (lungeDirRef?.current.active && isAttacking) {
      g.position.x = THREE.MathUtils.lerp(g.position.x, posRef.current.x + lungeDirRef.current.x * 0.7, 0.35);
      g.position.z = THREE.MathUtils.lerp(g.position.z, posRef.current.z + lungeDirRef.current.z * 0.7, 0.35);
    }
  });

  return (
    <group ref={groupRef} position={[posRef.current.x, 0, posRef.current.z]}>
      {/* Contact shadow / player indicator — metallic disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[1.4, 32]} />
        <meshStandardMaterial
          color={isHit ? "#ff2200" : config.bodyColor}
          metalness={0.6} roughness={0.4}
          transparent opacity={isHit ? 0.55 : 0.18}
          emissive={config.bodyColor} emissiveIntensity={isHit ? 0.9 : 0.15}
        />
      </mesh>
      {/* Rim light that follows the robot — team-color fill */}
      <pointLight
        color={config.bodyColor}
        intensity={isHit ? 8 : 3.5}
        distance={7}
        position={[0, 2.5, 0]}
      />
      <HighFidelityRobotMesh
        bodyPart={{ id: config.bodyPartId || "body-titan" }}
        attackPart={{ id: config.attackPartId || "attack-crusher" }}
        defensePart={{ id: config.defensePartId || "defense-titanium" }}
        secondaryPart={{ id: config.secondaryWeaponId }}
        isHit={isHit}
        isAttacking={isAttacking}
        teamColor={config.bodyColor}
        velRef={velRef}
      />
    </group>
  );
}

// ─── 3D: Physics game controller ─────────────────────────────────────────────
type AIState = "chase" | "strafe" | "charge" | "retreat" | "circle";

function GameController({
  p1PosRef, p2PosRef, p1VelRef, p2VelRef,
  keysRef, p1Speed, p2Speed, gameActive, isAI,
  onP1Move, onAIAttack, onSparks, p1LungeDirRef,
  p1Attacking, p2Attacking, p1AttackPartId, p2AttackPartId,
  freezeTimerRef, onRamDamage,
}: {
  p1PosRef: React.MutableRefObject<PosRef>; p2PosRef: React.MutableRefObject<PosRef>;
  p1VelRef: React.MutableRefObject<VelRef>; p2VelRef: React.MutableRefObject<VelRef>;
  keysRef: React.MutableRefObject<Set<string>>;
  p1Speed: number; p2Speed: number;
  gameActive: boolean; isAI: boolean;
  onP1Move: (x: number, z: number) => void;
  onAIAttack: () => void;
  onSparks: (x: number, y: number, z: number, color: string) => void;
  p1LungeDirRef: React.MutableRefObject<{ x: number; z: number; active: boolean }>;
  p1Attacking: boolean; p2Attacking: boolean;
  p1AttackPartId?: string; p2AttackPartId?: string;
  freezeTimerRef: React.MutableRefObject<number>;
  onRamDamage?: (dmg: number) => void;
}) {
  const aiAttackTimer = useRef(0);
  const moveEmitTimer = useRef(0);
  const aiStateTimer  = useRef(0);
  const p1RpmRef      = useRef(0);
  const p2RpmRef      = useRef(0);
  const aiStateRef    = useRef<AIState>("chase");
  const collisionCool = useRef(0);
  const MIN_DIST = 3.4;   // robot collision radius — slightly larger to prevent overlap
  const DAMPING  = 0.72;  // tuned friction — responsive but grounded
  const WALL_BOUNCE = 0.65; // stronger wall rebound — robots bounce off walls
  const ROB_ELASTICITY = 4.0; // strong elastic impulse on collision
  const MAX_SPEED = 28;   // velocity magnitude cap
  const stuckTimerRef = useRef(0); // anti-stuck escalation timer

  useFrame((_, delta) => {
    if (!gameActive) return;
    const dt = Math.min(delta, 0.1);
    
    // ── Apply velocity → position
    p1PosRef.current.x += p1VelRef.current.x * dt;
    p1PosRef.current.z += p1VelRef.current.z * dt;
    p2PosRef.current.x += p2VelRef.current.x * dt;
    p2PosRef.current.z += p2VelRef.current.z * dt;

    // ── No Walls — removed bounds per request

    // ── Clamp max speed (prevents runaway velocities)
    const clampVel = (vel: VelRef) => {
      const spd = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
      if (spd > MAX_SPEED) { vel.x = (vel.x / spd) * MAX_SPEED; vel.z = (vel.z / spd) * MAX_SPEED; }
    };
    clampVel(p1VelRef.current);
    clampVel(p2VelRef.current);

    // ── Damping
    const damp = Math.pow(DAMPING, dt * 60);
    p1VelRef.current.x *= damp; p1VelRef.current.z *= damp;
    p2VelRef.current.x *= damp; p2VelRef.current.z *= damp;

    // ── Player 1 input (Momentum-based acceleration)
    const spd = (p1Speed / 100) * 10;
    const accel = spd * 24; // heavy drive motors acceleration
    const k   = keysRef.current;
    let inputX = 0, inputZ = 0;
    if (k.has("KeyW") || k.has("ArrowUp"))    inputZ -= 1;
    if (k.has("KeyS") || k.has("ArrowDown"))  inputZ += 1;
    if (k.has("KeyA") || k.has("ArrowLeft"))  inputX -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) inputX += 1;
    if (inputX !== 0 || inputZ !== 0) {
      const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
      p1VelRef.current.x += (inputX / len) * accel * dt;
      p1VelRef.current.z += (inputZ / len) * accel * dt;
    }

    // ── AI Player 2 — ultra-aggressive (Momentum-based)
    if (isAI) {
      const aiSpd = (p2Speed / 100) * 13;
      const ddx   = p1PosRef.current.x - p2PosRef.current.x;
      const ddz   = p1PosRef.current.z - p2PosRef.current.z;
      const dist  = Math.sqrt(ddx * ddx + ddz * ddz);
      const dirX  = dist > 0.001 ? ddx / dist : 1;
      const dirZ  = dist > 0.001 ? ddz / dist : 0;
      aiStateTimer.current += dt;
      if (aiStateTimer.current > 0.8) {
        aiStateTimer.current = 0;
        const roll = Math.random();
        if (dist > 8)      aiStateRef.current = roll < 0.8 ? "charge" : "chase";
        else if (dist < 3) aiStateRef.current = roll < 0.4 ? "strafe" : "charge";
        else               aiStateRef.current = roll < 0.5 ? "charge" : roll < 0.8 ? "chase" : "circle";
      }
      const st = aiStateRef.current;
      if (st === "chase" || st === "charge") {
        const sm = st === "charge" ? 2.8 : 1.6;
        const accel = aiSpd * sm * 24;
        p2VelRef.current.x += dirX * accel * dt;
        p2VelRef.current.z += dirZ * accel * dt;
      } else if (st === "strafe" || st === "circle") {
        const perpX = -dirZ, perpZ = dirX;
        const orb   = Math.sin(aiStateTimer.current * 3) > 0 ? 1 : -1;
        const tX = perpX * aiSpd * orb * 1.5 + dirX * aiSpd * 0.8;
        const tZ = perpZ * aiSpd * orb * 1.5 + dirZ * aiSpd * 0.8;
        p2VelRef.current.x += tX * 24 * dt;
        p2VelRef.current.z += tZ * 24 * dt;
      }
      aiAttackTimer.current += dt;
      const atkInterval = 0.4 + (1 - p2Speed / 100) * 0.2;
      if (aiAttackTimer.current >= atkInterval && dist < 6.5) {
        aiAttackTimer.current = 0;
        onAIAttack();
        p2VelRef.current.x += dirX * 20; // heavy lunging
        p2VelRef.current.z += dirZ * 20;
      }
    }

    // ── Robot–robot collision: iterative solver with anti-stuck ──────────────
    const cdx   = p1PosRef.current.x - p2PosRef.current.x;
    const cdz   = p1PosRef.current.z - p2PosRef.current.z;
    const cdist = Math.sqrt(cdx * cdx + cdz * cdz);
    if (cdist < MIN_DIST && cdist > 0.001) {
      const nx  = cdx / cdist, nz = cdz / cdist;
      const overlap = (MIN_DIST - cdist);

      // HARD position correction — push apart by FULL overlap immediately
      const pushFactor = 0.55;
      p1PosRef.current.x += nx * overlap * pushFactor;
      p1PosRef.current.z += nz * overlap * pushFactor;
      p2PosRef.current.x -= nx * overlap * pushFactor;
      p2PosRef.current.z -= nz * overlap * pushFactor;

      // Elastic velocity impulse along collision normal
      const relVN = (p1VelRef.current.x - p2VelRef.current.x) * nx +
                    (p1VelRef.current.z - p2VelRef.current.z) * nz;
      const imp = Math.max(relVN, 0) * ROB_ELASTICITY + 3.0; // minimum impulse always applied
      p1VelRef.current.x += nx * imp * 0.5;
      p1VelRef.current.z += nz * imp * 0.5;
      p2VelRef.current.x -= nx * imp * 0.5;
      p2VelRef.current.z -= nz * imp * 0.5;

      // Momentum Damage
      if (relVN > 15 && collisionCool.current <= 0) {
        // High-speed ramming deals damage
        const ramDmg = Math.floor(relVN * 0.5);
        if (isAI && onRamDamage) {
           onRamDamage(ramDmg);
           onSparks(p2PosRef.current.x, 1, p2PosRef.current.z, "#ff0000");
        } else {
           // In PvP, we rely on the attacker to report damage if they caused it.
           // For simplicity, we could just let both clients apply it locally or report it.
        }
      }

      // Anti-stuck: escalating separation force if overlapping for too long
      stuckTimerRef.current += dt;
      if (stuckTimerRef.current > 0.3) {
        const escalation = Math.min(stuckTimerRef.current * 30, 50); // ramps up to 50
        p1VelRef.current.x += nx * escalation;
        p1VelRef.current.z += nz * escalation;
        p2VelRef.current.x -= nx * escalation;
        p2VelRef.current.z -= nz * escalation;
      }


      // Sparks on collision
      collisionCool.current = Math.max(0, collisionCool.current - dt);
      if (collisionCool.current <= 0) {
        collisionCool.current = 0.1;
        const cx = (p1PosRef.current.x + p2PosRef.current.x) / 2;
        const cz = (p1PosRef.current.z + p2PosRef.current.z) / 2;
        onSparks(cx, 0.8, cz, "#FF8844");
      }
    } else {
      // Reset stuck timer when not overlapping
      stuckTimerRef.current = 0;
    }

    moveEmitTimer.current += dt;
    if (moveEmitTimer.current > 0.05) {
      moveEmitTimer.current = 0;
      onP1Move(p1PosRef.current.x, p1PosRef.current.z);
    }
  });
  return null;
}

// ─── 3D: Camera controller ───────────────────────────────────────────────────
function CameraController({ p1PosRef, p2PosRef }: {
  p1PosRef: React.MutableRefObject<PosRef>; p2PosRef: React.MutableRefObject<PosRef>;
}) {
  const { camera } = useThree();
  useFrame(() => {
    const midX = (p1PosRef.current.x + p2PosRef.current.x) * 0.5;
    const midZ = (p1PosRef.current.z + p2PosRef.current.z) * 0.5;
    const dx   = p2PosRef.current.x - p1PosRef.current.x;
    const dz   = p2PosRef.current.z - p1PosRef.current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const targetY  = THREE.MathUtils.clamp(8 + dist * 0.45, 8, 18);
    const targetZO = THREE.MathUtils.clamp(10 + dist * 0.55, 11, 20);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, midX * 0.4, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, midZ + targetZO, 0.05);
    camera.lookAt(midX, 1.0, midZ);
  });
  return null;
}

// ─── Keybinds modal ───────────────────────────────────────────────────────────
function KeybindsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key !== "F5") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  const binds = [
    { keys: ["W", "↑"], action: "Move Forward" },
    { keys: ["S", "↓"], action: "Move Backward" },
    { keys: ["A", "←"], action: "Strafe Left" },
    { keys: ["D", "→"], action: "Strafe Right" },
    { keys: ["Space"], action: "Primary Attack" },
    { keys: ["E"],     action: "Secondary Attack" },
    { keys: ["Q"],     action: "Special Attack" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 24 }}
        className="brutal-border bg-card p-8 w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="w-2 h-8 bg-primary" />
          <div>
            <h2 className="font-display text-xl font-bold text-white uppercase tracking-widest">Controls</h2>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Keyboard Bindings</p>
          </div>
        </div>
        <div className="space-y-3 mb-6">
          {binds.map(({ keys, action }) => (
            <div key={action} className="flex items-center justify-between">
              <span className="font-mono text-sm text-muted-foreground uppercase tracking-wider">{action}</span>
              <div className="flex gap-1.5">
                {keys.map(k => (
                  <kbd key={k} className="px-2.5 py-1 rounded bg-background border border-border font-mono text-xs text-white font-bold shadow-[0_2px_0_rgba(0,0,0,0.5)] min-w-[2rem] text-center">{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          className="w-full py-3 font-display font-bold text-sm uppercase tracking-widest text-white border-2 border-primary bg-transparent hover:bg-primary/20 transition-colors"
          onClick={onClose}
        >
          Got It — Start Battle
        </button>
        <p className="text-center font-mono text-xs text-muted-foreground mt-3 uppercase tracking-widest">Press any key to dismiss</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Battle component ────────────────────────────────────────────────────
export default function Battle() {
  const [, params]      = useRoute("/battle/:roomId");
  const roomId          = params?.roomId ?? "ai";
  const [, setLocation] = useLocation();
  const isAI            = roomId === "ai";
  const webGLSupported  = useWebGLSupported();
  const { session, recordWin, recordLoss, WIN_REWARD_AI, WIN_REWARD_PVP } = useSession();

  const myRobot = useMemo<StoredRobot>(() => {
    try { const s = localStorage.getItem("roboArena_robot"); return s ? JSON.parse(s) : DEFAULT_P1; }
    catch { return DEFAULT_P1; }
  }, []);
  const aiRobot = DEFAULT_AI;

  const [p1Hp, setP1Hp]             = useState(200);
  const [p2Hp, setP2Hp]             = useState(200);
  const [timeLeft, setTimeLeft]     = useState(120);
  const [opponentRobot, setOpponentRobot] = useState<StoredRobot>(DEFAULT_AI);
  const [gameStatus, setGameStatus] = useState<"waiting" | "starting" | "playing" | "ended">("waiting");
  const [winner, setWinner]         = useState<"p1" | "p2" | null>(null);
  const [p2Name, setP2Name]         = useState(isAI ? aiRobot.playerName : "OPPONENT");
  const [p1Attacking, setP1Attacking] = useState(false);
  const [p2Attacking, setP2Attacking] = useState(false);
  const [p1Hit, setP1Hit]           = useState(false);
  const [p2Hit, setP2Hit]           = useState(false);
  const [damageTexts, setDamageTexts] = useState<{ id: number; val: number; isP1: boolean }[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [countdown, setCountdown]   = useState(3);
  const [showKeybinds, setShowKeybinds] = useState(true);
  const [sparkBursts, setSparkBursts]   = useState<SparkBurst[]>([]);
  const [showRageQuit, setShowRageQuit] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  // Physics refs
  // Spread spawn positions to match 1.8× arena (arena is ±16 on X, ±12.5 on Z)
  const p1PosRef = useRef<PosRef>({ x: -10, z:  3 });
  const p2PosRef = useRef<PosRef>({ x:  10, z: -3 });
  const p1VelRef = useRef<VelRef>({ x:  0, z: 0 });
  const p2VelRef = useRef<VelRef>({ x:  0, z: 0 });
  const p1LungeDirRef     = useRef({ x: 0, z: 0, active: false });
  const freezeTimerRef     = useRef(0);
  const keysRef            = useRef<Set<string>>(new Set());
  const gameStatusRef      = useRef<"waiting"|"starting"|"playing"|"ended">("waiting");
  // ── Isolated per-weapon cooldown refs (true = on cooldown)
  const primaryCoolRef     = useRef(false);   // Space
  const secondaryCoolRef   = useRef(false);   // Q
  const specialCoolRef     = useRef(false);   // E
  const boostActiveRef     = useRef(false);   // Shift
  const socketRef          = useRef<Socket | null>(null);
  const resultRecordedRef  = useRef(false);
  // ── Cooldown durations (ms) — tight for arcade intensity
  const PRIMARY_CD   = 280;    // very fast swing
  const SECONDARY_CD = 1200;   // secondary weapon
  const SPECIAL_CD   = 2500;   // chassis special
  const BOOST_CD     = 2000;   // boost re-use

  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { 
      document.body.style.overflow = ""; 
    };
  }, []);

  // ── Record win/loss once when game ends ──
  useEffect(() => {
    if (gameStatus !== "ended" || !winner || resultRecordedRef.current) return;
    resultRecordedRef.current = true;
    if (winner === "p1") {
      const reward = isAI ? WIN_REWARD_AI : WIN_REWARD_PVP;
      setPointsEarned(reward);
      try { recordWin(isAI); } catch { /* no session */ }
    } else {
      try { recordLoss(); } catch { /* no session */ }
      setTimeout(() => setShowRageQuit(true), 800);
    }
  }, [gameStatus, winner, isAI]);

  // Countdown
  useEffect(() => {
    if (gameStatus !== "starting") return;
    let c = 3;
    setCountdown(3);
    const interval = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) { clearInterval(interval); setGameStatus("playing"); }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStatus]);

  // Timer
  useEffect(() => {
    if (gameStatus !== "playing") return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setGameStatus("ended"); setWinner(p1Hp > p2Hp ? "p1" : "p2"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStatus, p1Hp, p2Hp]);

  // Win detection
  useEffect(() => {
    if (gameStatus === "playing") {
      if (p1Hp <= 0) { setGameStatus("ended"); setWinner("p2"); }
      else if (p2Hp <= 0) { setGameStatus("ended"); setWinner("p1"); }
    }
  }, [p1Hp, p2Hp, gameStatus]);

  // ── Centralized Keyboard Input Manager
  // Uses e.repeat guard to prevent hold-key spam.
  // Each key routes to its own isolated handler with its own cooldown.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return; // prevent held-key spam
      keysRef.current.add(e.code);
      if (gameStatusRef.current !== "playing") return;
      if (e.code === "Space")      { e.preventDefault(); firePrimary(); }
      else if (e.code === "KeyQ")  fireSecondary();
      else if (e.code === "KeyE")  fireSpecial();
      else if (e.code === "ShiftLeft" || e.code === "ShiftRight") fireBoost();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Multiplayer socket
  useEffect(() => {
    if (isAI) return;
    const socket = io(getApiUrl(), {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: true,
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      // Send OUR full robot config so opponent receives it
      socket.emit("joinRoom", {
        roomId,
        playerName: myRobot.playerName,
        robotConfig: {
          playerName: myRobot.playerName,
          robotName: myRobot.robotName,
          bodyColor: myRobot.bodyColor,
          attackColor: myRobot.attackColor,
          defenseColor: myRobot.defenseColor,
          attackPartId: myRobot.attackPartId,
          bodyPartId: myRobot.bodyPartId,
          defensePartId: myRobot.defensePartId,
          secondaryWeaponId: myRobot.secondaryWeaponId,
          stats: myRobot.stats,
        },
      });
    });
    socket.on("battleStart", ({ players }: any) => {
      const opp = players.find((p: any) => p.playerName !== myRobot.playerName);
      if (opp) {
        setP2Name(opp.playerName);
        // Load opponent's REAL robot config if provided
        if (opp.robotConfig) {
          setOpponentRobot(opp.robotConfig);
        }
      }
    });
    socket.on("opponentMove", ({ x, z }: { x: number; z: number }) => { p2PosRef.current = { x, z }; });
    socket.on("attackResult", ({ defenderName, damage, defenderHp, hit }: any) => {
      if (!hit) return;
      if (defenderName === myRobot.playerName) { setP1Hp(Math.max(0, defenderHp)); flashHit("p1"); }
      else { setP2Hp(Math.max(0, defenderHp)); flashHit("p2"); }
    });
    socket.on("playerLeft", () => { setGameStatus("ended"); setWinner("p1"); });
    socket.on("battleEnd",  ({ winnerName }: { winnerName: string }) => {
      setGameStatus("ended"); setWinner(winnerName === myRobot.playerName ? "p1" : "p2");
    });
    return () => { socket.disconnect(); };
  }, [isAI, roomId]);

  const addDmgText = (val: number, isP1: boolean) => {
    const id = Date.now() + Math.random();
    setDamageTexts(t => [...t, { id, val, isP1 }]);
    setTimeout(() => setDamageTexts(t => t.filter(x => x.id !== id)), 1200);
  };

  const spawnSparks = useCallback((x: number, y: number, z: number, color: string) => {
    const burst: SparkBurst = { id: Date.now() + Math.random(), x, y, z, color };
    setSparkBursts(prev => [...prev.slice(-3), burst]);
    setTimeout(() => setSparkBursts(prev => prev.filter(b => b.id !== burst.id)), 600);
  }, []);

  const flashHit = (who: "p1" | "p2", intensity: "normal" | "heavy" = "normal") => {
    // Increased knockback to compensate for heavy high-friction damping
    const kb = intensity === "heavy" ? 36 : 22;
    const shakeMs = intensity === "heavy" ? 500 : 280;
    if (who === "p1") {
      setP1Hit(true); setTimeout(() => setP1Hit(false), 280);
      const dx = p1PosRef.current.x - p2PosRef.current.x;
      const dz = p1PosRef.current.z - p2PosRef.current.z;
      const d  = Math.sqrt(dx * dx + dz * dz) || 1;
      p1VelRef.current.x += (dx / d) * kb;
      p1VelRef.current.z += (dz / d) * kb;
    } else {
      setP2Hit(true); setTimeout(() => setP2Hit(false), 280);
      const dx = p2PosRef.current.x - p1PosRef.current.x;
      const dz = p2PosRef.current.z - p1PosRef.current.z;
      const d  = Math.sqrt(dx * dx + dz * dz) || 1;
      p2VelRef.current.x += (dx / d) * kb;
      p2VelRef.current.z += (dz / d) * kb;
    }
    // Reduced screen shake drastically
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), shakeMs * 0.3);
    
    const mx = (p1PosRef.current.x + p2PosRef.current.x) / 2;
    const mz = (p1PosRef.current.z + p2PosRef.current.z) / 2;
    const hitColor = who === "p1" ? myRobot.bodyColor : aiRobot.bodyColor;
    spawnSparks(mx,       1.2, mz,       hitColor);
    spawnSparks(mx + 0.8, 0.6, mz + 0.8, "#ffaa00");
    spawnSparks(mx - 0.8, 0.6, mz - 0.8, "#ffffff");
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const p1Speed = myRobot.stats.speed;
  const p2Speed = aiRobot.stats.speed;

  // ── Distance helper
  const inRange = (maxDist = 7) => {
    const dx = p1PosRef.current.x - p2PosRef.current.x;
    const dz = p1PosRef.current.z - p2PosRef.current.z;
    return Math.sqrt(dx * dx + dz * dz) < maxDist;
  };

  // ── Lunge helper - removed forced direction lock, just apply forward impulse
  const lungeTo = (power: number) => {
    // Apply impulse in the direction the player is already moving or facing, 
    // or towards opponent if they want, but don't lock the direction vector
    const dx = p2PosRef.current.x - p1PosRef.current.x;
    const dz = p2PosRef.current.z - p1PosRef.current.z;
    const d  = Math.sqrt(dx * dx + dz * dz) || 1;
    p1VelRef.current.x += (dx/d) * power;
    p1VelRef.current.z += (dz/d) * power;
  };

  // ── Damage calculator with Armor Scaling
  const calcDmg = (base: number, power: number, defenderArmor: number = 50) => {
    const raw = base + Math.floor(Math.random() * Math.max(1, power / 10));
    const reduction = Math.min(0.5, (defenderArmor / 200)); // Max 50% damage reduction
    return Math.floor(raw * (1 - reduction));
  };

  // ─────────────────────────────────────────────────────────────────────
  // PRIMARY WEAPON  [Space] — main weapon swing, fast cooldown
  // ─────────────────────────────────────────────────────────────────────
  const firePrimary = useCallback(() => {
    if (primaryCoolRef.current) return;
    primaryCoolRef.current = true;
    setP1Attacking(true);
    lungeTo(12); // scale lunge for heavy friction
    const oppArmor = isAI ? aiRobot.stats.armor : opponentRobot.stats.armor;
    const dmg = calcDmg(20, myRobot.stats.power, oppArmor);
    setTimeout(() => {
      if (isAI) {
        if (inRange(7)) { setP2Hp(p => Math.max(0, p - dmg)); flashHit("p2", "normal"); addDmgText(dmg, false); }
      } else {
        socketRef.current?.emit("attack", { roomId, attackType: "punch", damage: dmg });
      }
      setTimeout(() => { setP1Attacking(false); primaryCoolRef.current = false; }, PRIMARY_CD);
    }, 130);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAI, myRobot.stats.power, roomId]);

  // ─────────────────────────────────────────────────────────────────────
  // SECONDARY WEAPON  [Q] — area / ranged weapon, medium cooldown
  // ─────────────────────────────────────────────────────────────────────
  const fireSecondary = useCallback(() => {
    if (secondaryCoolRef.current) return;
    secondaryCoolRef.current = true;
    setP1Attacking(true);
    const oppArmor = isAI ? aiRobot.stats.armor : opponentRobot.stats.armor;
    const dmg = calcDmg(30, myRobot.stats.power, oppArmor);
    setTimeout(() => {
      if (isAI) {
        if (inRange(9)) { setP2Hp(p => Math.max(0, p - dmg)); flashHit("p2", "heavy"); addDmgText(dmg, false); }
      } else {
        socketRef.current?.emit("attack", { roomId, attackType: "kick", damage: dmg });
      }
      spawnSparks(
        (p1PosRef.current.x + p2PosRef.current.x) / 2, 1.5,
        (p1PosRef.current.z + p2PosRef.current.z) / 2, myRobot.attackColor
      );
      setTimeout(() => { setP1Attacking(false); secondaryCoolRef.current = false; }, SECONDARY_CD);
    }, 180);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAI, myRobot.stats.power, roomId]);

  // ─────────────────────────────────────────────────────────────────────
  // CHASSIS SPECIAL  [E] — high damage charge, long cooldown
  // ─────────────────────────────────────────────────────────────────────
  const fireSpecial = useCallback(() => {
    if (specialCoolRef.current) return;
    specialCoolRef.current = true;
    setP1Attacking(true);
    lungeTo(32); // massive charge impulse
    const oppArmor = isAI ? aiRobot.stats.armor : opponentRobot.stats.armor;
    const dmg = calcDmg(42, myRobot.stats.power, oppArmor);
    setTimeout(() => {
      if (isAI) {
        if (inRange(9)) { setP2Hp(p => Math.max(0, p - dmg)); flashHit("p2", "heavy"); addDmgText(dmg, false); }
      } else {
        socketRef.current?.emit("attack", { roomId, attackType: "special", damage: dmg });
      }
      p1LungeDirRef.current.active = false;
      spawnSparks(p1PosRef.current.x, 1.0, p1PosRef.current.z, "#ff4400");
      spawnSparks(p1PosRef.current.x + 1, 0.6, p1PosRef.current.z + 1, "#ffff00");
      setTimeout(() => { setP1Attacking(false); specialCoolRef.current = false; }, SPECIAL_CD);
    }, 240);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAI, myRobot.stats.power, roomId]);

  // ─────────────────────────────────────────────────────────────────────
  // BOOST  [Shift] — temporary speed boost, clears after duration
  // ─────────────────────────────────────────────────────────────────────
  const fireBoost = useCallback(() => {
    if (boostActiveRef.current) return;
    boostActiveRef.current = true;
    const dx = p2PosRef.current.x - p1PosRef.current.x;
    const dz = p2PosRef.current.z - p1PosRef.current.z;
    const d  = Math.sqrt(dx * dx + dz * dz) || 1;
    p1VelRef.current.x += (dx/d) * 36; // massive burst to counter friction
    p1VelRef.current.z += (dz/d) * 36;
    setTimeout(() => { boostActiveRef.current = false; }, BOOST_CD);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── triggerP1Attack kept for AI and button clicks (maps to isolated fns)
  const triggerP1Attack = useCallback((type: "punch" | "kick" | "special") => {
    if (gameStatusRef.current !== "playing") return;
    if (type === "punch")        firePrimary();
    else if (type === "kick")    fireSecondary();
    else if (type === "special") fireSpecial();
  }, [firePrimary, fireSecondary, fireSpecial]);

  const handleAIAttack = useCallback(() => {
    if (gameStatusRef.current !== "playing" || p2Attacking) return;
    setP2Attacking(true);
    const dmg = calcDmg(12, aiRobot.stats.power, myRobot.stats.armor);
    setTimeout(() => {
      const dx = p2PosRef.current.x - p1PosRef.current.x;
      const dz = p2PosRef.current.z - p1PosRef.current.z;
      if (Math.sqrt(dx*dx+dz*dz) < 7) { setP1Hp(p => Math.max(0, p - dmg)); flashHit("p1"); addDmgText(dmg, true); }
      setTimeout(() => setP2Attacking(false), 350);
    }, 160);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p2Attacking]);

  const handleP1Move = useCallback((x: number, z: number) => {
    if (!isAI) socketRef.current?.emit("move", { roomId, x, z });
  }, [isAI, roomId]);


  const handleModalClose = () => {
    setShowKeybinds(false);
    setGameStatus("starting");
  };

  const handleRageQuitLogout = () => {
    setLocation("/");
  };

  return (
    <div
      className={`w-screen h-screen bg-black overflow-hidden relative ${screenShake ? "animate-shake" : ""}`}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      {/* ── Hit vignette flash — red border blast on damage */}
      {screenShake && (
        <div
          className="absolute inset-0 z-50 pointer-events-none"
          style={{
            boxShadow: "inset 0 0 80px 20px rgba(255,30,0,0.65)",
            animation: "none",
          }}
        />
      )}
      {/* ── Low-HP danger ring — pulsing red edge when HP < 30 */}
      {p1Hp < 30 && gameStatus === "playing" && (
        <div
          className="absolute inset-0 z-40 pointer-events-none"
          style={{
            boxShadow: "inset 0 0 120px 40px rgba(220,0,0,0.35)",
            animation: "pulse 0.7s ease-in-out infinite alternate",
          }}
        />
      )}
      {/* ── 3D Canvas ── */}
      <div className="absolute inset-0 z-0">
        {webGLSupported ? (
          <WebGLErrorBoundary>
            <Canvas
              camera={{ fov: 58, position: [0, 11, 15], near: 0.1, far: 200 }}
              gl={{
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.35,
                powerPreference: "high-performance",
              }}
              dpr={[1, 2]}
              shadows={{ type: THREE.PCFSoftShadowMap }}
            >
              <RealisticEnvironment />
              {/* ── CINEMATIC INDUSTRIAL LIGHTING RIG ── */}
              {/* Key light — overhead hard industrial spot */}
              <directionalLight
                position={[8, 22, 10]}
                intensity={3.5}
                color="#f0f4ff"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-near={0.5}
                shadow-camera-far={80}
                shadow-camera-left={-25}
                shadow-camera-right={25}
                shadow-camera-top={25}
                shadow-camera-bottom={-25}
                shadow-bias={-0.001}
              />
              {/* Fill light — opposite soft blue */}
              <directionalLight position={[-10, 14, -8]} intensity={1.2} color="#8ab4ff" />
              {/* Ambient — very low, let reflections do the work */}
              <ambientLight intensity={0.45} color="#1a2030" />
              {/* Overhead area fill — cold white */}
              <pointLight position={[0, 18, 0]} intensity={6} color="#ddeeff" distance={50} />
              {/* Player 1 rim — warm red */}
              <pointLight position={[-14, 6, 0]} intensity={8} color="#ff3300" distance={22} />
              {/* Player 2 rim — cool cyan */}
              <pointLight position={[14, 6, 0]} intensity={8} color="#00ccff" distance={22} />
              {/* Floor bounce — subtle warm */}
              <pointLight position={[0, 1, 0]} intensity={2.5} color="#ff8844" distance={20} />
              <CameraController p1PosRef={p1PosRef} p2PosRef={p2PosRef} />
              <ProcArena />
              <GameController
                p1PosRef={p1PosRef} p2PosRef={p2PosRef}
                p1VelRef={p1VelRef} p2VelRef={p2VelRef}
                keysRef={keysRef}
                p1Speed={p1Speed} p2Speed={p2Speed}
                gameActive={gameStatus === "playing"}
                isAI={isAI}
                onP1Move={handleP1Move}
                onAIAttack={handleAIAttack}
                onSparks={spawnSparks}
                p1LungeDirRef={p1LungeDirRef}
                p1Attacking={p1Attacking} p2Attacking={p2Attacking}
                p1AttackPartId={myRobot.attackPartId} p2AttackPartId={aiRobot.attackPartId}
                freezeTimerRef={freezeTimerRef}
                onRamDamage={(dmg) => setP2Hp(p => Math.max(0, p - dmg))}
              />
              <ArenaRobot
                posRef={p1PosRef} targetPosRef={p2PosRef} velRef={p1VelRef}
                config={myRobot} isAttacking={p1Attacking} isHit={p1Hit}
                lungeDirRef={p1LungeDirRef}
              />
              <ArenaRobot
                posRef={p2PosRef} targetPosRef={p1PosRef} velRef={p2VelRef}
                config={isAI ? aiRobot : opponentRobot}
                isAttacking={p2Attacking} isHit={p2Hit}
              />
              {sparkBursts.map(b => <ImpactFlash key={b.id} x={b.x} y={b.y} z={b.z} color={b.color} />)}
            </Canvas>
          </WebGLErrorBoundary>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-[#080810]">
            <p className="font-mono text-muted-foreground text-sm uppercase tracking-widest">WebGL not supported — upgrade your browser</p>
          </div>
        )}
      </div>

      {/* ── HUD ── */}
      <div className="absolute inset-x-0 top-0 z-10 px-4 pt-3">
        <div className="flex items-start justify-between gap-2 max-w-5xl mx-auto">
          {/* P1 */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest" style={{ color: myRobot.bodyColor }}>{myRobot.playerName}</span>
              <span className="font-display text-xs font-bold text-white opacity-60">{myRobot.robotName}</span>
            </div>
            <div className="w-full h-4 bg-black/70 border border-white/10 rounded-sm overflow-hidden">
              <motion.div
                className="h-full transition-all duration-300"
                style={{ width: `${p1Hp}%`, background: `linear-gradient(90deg, ${myRobot.bodyColor}88, ${myRobot.bodyColor})` }}
                animate={{ width: `${p1Hp}%` }}
              />
            </div>
            <div className="text-xs font-mono" style={{ color: myRobot.bodyColor }}>{p1Hp} HP</div>
          </div>

          {/* Timer + points */}
          <div className="flex flex-col items-center gap-1 px-4">
            <div className="font-display text-xl font-bold text-white tabular-nums">{formatTime(timeLeft)}</div>
            {gameStatus === "starting" && (
              <div className="font-display text-4xl font-black text-primary animate-pulse">{countdown > 0 ? countdown : "GO!"}</div>
            )}
            {gameStatus === "waiting" && (
              <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Ready?</div>
            )}
            {/* Points badge */}
            {session && (
              <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground/60">
                <Zap className="h-3 w-3" />
                {session.points.toLocaleString()} pts
              </div>
            )}
          </div>

          {/* P2 */}
          <div className="flex-1 space-y-1 text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="font-display text-xs font-bold text-white opacity-60">{isAI ? aiRobot.robotName : "RIVAL"}</span>
              <span className="font-mono text-xs uppercase tracking-widest text-[#00FFFF]">{p2Name}</span>
            </div>
            <div className="w-full h-4 bg-black/70 border border-white/10 rounded-sm overflow-hidden flex flex-row-reverse">
              <motion.div
                className="h-full transition-all duration-300"
                style={{ width: `${p2Hp}%`, background: "linear-gradient(270deg, #00FFFF88, #00FFFF)" }}
                animate={{ width: `${p2Hp}%` }}
              />
            </div>
            <div className="text-xs font-mono text-[#00FFFF] text-right">{p2Hp} HP</div>
          </div>
        </div>
      </div>

      {/* Damage numbers */}
      <AnimatePresence>
        {damageTexts.map(d => (
          <motion.div key={d.id}
            initial={{ y: 0, opacity: 1 }} animate={{ y: -60, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }}
            className="absolute z-20 font-display font-black text-3xl pointer-events-none"
            style={{
              left: d.isP1 ? "25%" : "65%",
              top: "35%",
              color: d.isP1 ? myRobot.bodyColor : "#00FFFF",
              textShadow: `0 0 12px ${d.isP1 ? myRobot.bodyColor : "#00FFFF"}`,
            }}
          >
            -{d.val}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Attack buttons */}
      {gameStatus === "playing" && (
        <div className="absolute bottom-6 inset-x-0 z-10 flex justify-center gap-3">
          {[
            { label: "ATTACK",    key: "Space", fn: firePrimary,   color: myRobot.attackColor },
            { label: "SECONDARY", key: "Q",     fn: fireSecondary, color: myRobot.bodyColor   },
            { label: "SPECIAL",   key: "E",     fn: fireSpecial,   color: "#FFD700"           },
            { label: "BOOST",     key: "Shift", fn: fireBoost,     color: "#00ccff"           },
          ].map(btn => (
            <button key={btn.label}
              onPointerDown={() => btn.fn()}
              className="px-5 py-3 font-display font-bold text-sm uppercase tracking-widest text-white border-2 transition-all active:scale-95"
              style={{ borderColor: btn.color, boxShadow: `0 0 12px ${btn.color}55`, background: `${btn.color}18` }}
            >
              {btn.label} <span className="opacity-50 ml-1">[{btn.key}]</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Win screen ── */}
      <AnimatePresence>
        {gameStatus === "ended" && winner === "p1" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"
          >
            <motion.div initial={{ scale: 0.7, y: 32 }} animate={{ scale: 1, y: 0 }} className="text-center space-y-6">
              <Trophy className="w-16 h-16 mx-auto text-yellow-400" />
              <div className="font-display text-5xl font-black uppercase text-white tracking-widest">
                {myRobot.playerName}
              </div>
              <div className="font-mono text-primary uppercase tracking-[0.3em] text-lg">Victory!</div>

              {/* Points earned */}
              {pointsEarned > 0 && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="inline-flex items-center gap-3 border border-primary/40 bg-primary/10 px-6 py-3"
                >
                  <Zap className="h-6 w-6 text-primary" />
                  <div>
                    <div className="font-display font-black text-2xl text-primary">+{pointsEarned} pts</div>
                    <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Earned</div>
                  </div>
                  {session && (
                    <div className="border-l border-border pl-3">
                      <div className="font-display font-bold text-white text-lg">{session.points.toLocaleString()}</div>
                      <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Balance</div>
                    </div>
                  )}
                </motion.div>
              )}

              <div className="flex gap-4 mt-8">
                <button onClick={() => setLocation("/builder")}
                  className="brutal-border px-6 py-3 font-display font-bold uppercase tracking-widest text-white hover:bg-primary/20 transition-colors">
                  Upgrade Robot
                </button>
                <button onClick={() => setLocation("/builder")}
                  className="px-6 py-3 font-mono text-sm uppercase tracking-widest text-muted-foreground hover:text-white border border-border hover:border-primary transition-colors">
                  Menu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Keybinds modal ── */}
      <AnimatePresence>
        {showKeybinds && <KeybindsModal onClose={handleModalClose} />}
      </AnimatePresence>

      {/* ── Rage Quit Modal (loss) ── */}
      {showRageQuit && (
        <RageQuitModal
          playerName={myRobot.playerName}
          onLogout={handleRageQuitLogout}
        />
      )}
    </div>
  );
}
