import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { WebGLErrorBoundary } from "@/components/WebGLErrorBoundary";
import { useWebGLSupported } from "@/hooks/useWebGL";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, Zap, Trophy } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useSession } from "@/context/SessionContext";
import { RageQuitModal } from "@/components/RageQuitModal";

// ─── Types ───────────────────────────────────────────────────────────────────
interface StoredRobot {
  playerName: string;
  robotName: string;
  bodyColor: string;
  attackColor: string;
  defenseColor: string;
  attackPartId?: string;
  stats: { armor: number; power: number; speed: number; energy: number };
}
interface PosRef { x: number; z: number }
interface VelRef { x: number; z: number }
interface SparkBurst { id: number; x: number; y: number; z: number; color: string }

const DEFAULT_P1: StoredRobot = {
  playerName: "PLAYER 1", robotName: "STRIKER",
  bodyColor: "#FF4500", attackColor: "#FF6030", defenseColor: "#AA3300",
  attackPartId: "attack-crusher",
  stats: { armor: 100, power: 100, speed: 50, energy: 60 },
};
const DEFAULT_AI: StoredRobot = {
  playerName: "CPU RIVAL", robotName: "NEMESIS",
  bodyColor: "#00FFFF", attackColor: "#00CCFF", defenseColor: "#0066AA",
  attackPartId: "attack-plasma",
  stats: { armor: 80, power: 85, speed: 70, energy: 80 },
};

// ─── Arena constants ──────────────────────────────────────────────────────────
const ARENA_X = 9.0;
const ARENA_Z = 7.0;

// ─── 3D: Spinning saw blade ───────────────────────────────────────────────────
function SpinningSaw({ pos, color }: { pos: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => { ref.current.rotation.y += dt * 3.5; });
  return (
    <group position={pos}>
      <mesh ref={ref}>
        <cylinderGeometry args={[1.1, 1.1, 0.12, 10]} />
        <meshStandardMaterial color="#111" metalness={0.95} roughness={0.05}
          emissive={color} emissiveIntensity={0.6} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} ref={ref}
            position={[Math.cos(a) * 1.1, 0.07, Math.sin(a) * 1.1]}
            rotation={[0, -a, 0]}>
            <boxGeometry args={[0.24, 0.12, 0.18]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── 3D: Procedural Battle Arena ─────────────────────────────────────────────
function ProcArena() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[ARENA_X * 2 + 4, ARENA_Z * 2 + 4]} />
        <meshStandardMaterial color="#1c1c1e" metalness={0.85} roughness={0.25} />
      </mesh>
      <gridHelper args={[ARENA_X * 2 + 2, 22, "#3a0000", "#1a0a0a"]} position={[0, 0.015, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[2.2, 3.2, 24]} />
        <meshBasicMaterial color="#FF2200" transparent opacity={0.65} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <circleGeometry args={[2.1, 24]} />
        <meshBasicMaterial color="#FF0000" transparent opacity={0.12} />
      </mesh>
      <mesh position={[0, 0.03, -ARENA_Z - 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ARENA_X * 2 + 2, 0.22]} />
        <meshBasicMaterial color="#FF2200" transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.03, ARENA_Z + 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ARENA_X * 2 + 2, 0.22]} />
        <meshBasicMaterial color="#00DDFF" transparent opacity={0.9} />
      </mesh>
      <mesh position={[-ARENA_X - 0.3, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.22, ARENA_Z * 2 + 2]} />
        <meshBasicMaterial color="#FF4400" transparent opacity={0.7} />
      </mesh>
      <mesh position={[ARENA_X + 0.3, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.22, ARENA_Z * 2 + 2]} />
        <meshBasicMaterial color="#0099FF" transparent opacity={0.7} />
      </mesh>
      {/* Walls */}
      <mesh position={[0, 1.6, -ARENA_Z - 0.5]}>
        <boxGeometry args={[ARENA_X * 2 + 3, 3.2, 0.5]} />
        <meshStandardMaterial color="#0d0d0d" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 3.2, -ARENA_Z - 0.5]}>
        <boxGeometry args={[ARENA_X * 2 + 3, 0.18, 0.6]} />
        <meshBasicMaterial color="#FF2200" />
      </mesh>
      <mesh position={[0, 1.6, ARENA_Z + 0.5]}>
        <boxGeometry args={[ARENA_X * 2 + 3, 3.2, 0.5]} />
        <meshStandardMaterial color="#0d0d0d" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 3.2, ARENA_Z + 0.5]}>
        <boxGeometry args={[ARENA_X * 2 + 3, 0.18, 0.6]} />
        <meshBasicMaterial color="#00AAFF" />
      </mesh>
      <mesh position={[ARENA_X + 0.5, 1.6, 0]}>
        <boxGeometry args={[0.5, 3.2, ARENA_Z * 2 + 3]} />
        <meshStandardMaterial color="#0d0d0d" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[ARENA_X + 0.5, 3.2, 0]}>
        <boxGeometry args={[0.6, 0.18, ARENA_Z * 2 + 3]} />
        <meshBasicMaterial color="#FF4400" />
      </mesh>
      <mesh position={[-ARENA_X - 0.5, 1.6, 0]}>
        <boxGeometry args={[0.5, 3.2, ARENA_Z * 2 + 3]} />
        <meshStandardMaterial color="#0d0d0d" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-ARENA_X - 0.5, 3.2, 0]}>
        <boxGeometry args={[0.6, 0.18, ARENA_Z * 2 + 3]} />
        <meshBasicMaterial color="#0066FF" />
      </mesh>
      {/* Corner pillars */}
      {([ [-ARENA_X + 0.5, -ARENA_Z + 0.5], [ARENA_X - 0.5, -ARENA_Z + 0.5],
          [-ARENA_X + 0.5,  ARENA_Z - 0.5], [ARENA_X - 0.5,  ARENA_Z - 0.5] ] as [number,number][]).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[1.2, 4, 1.2]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.95} roughness={0.15} />
          </mesh>
          <mesh position={[0, 4.15, 0]}>
            <boxGeometry args={[1.4, 0.22, 1.4]} />
            <meshBasicMaterial color={i < 2 ? "#FF2200" : "#00AAFF"} />
          </mesh>
          <mesh position={[0, 3.3, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.8, 6]} />
            <meshBasicMaterial color={i < 2 ? "#FF4400" : "#0099FF"} />
          </mesh>
        </group>
      ))}
      <SpinningSaw pos={[-ARENA_X + 2, 0.1, -ARENA_Z + 2]} color="#FF3300" />
      <SpinningSaw pos={[ ARENA_X - 2, 0.1, -ARENA_Z + 2]} color="#FF3300" />
      <SpinningSaw pos={[-ARENA_X + 2, 0.1,  ARENA_Z - 2]} color="#00CCFF" />
      <SpinningSaw pos={[ ARENA_X - 2, 0.1,  ARENA_Z - 2]} color="#00CCFF" />
      {[-3, 0, 3].map((z, i) => (
        <mesh key={i} position={[-ARENA_X - 0.4, 1.5, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 2.2, 6]} />
          <meshStandardMaterial color="#222" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      {[-3, 0, 3].map((z, i) => (
        <mesh key={i} position={[ARENA_X + 0.4, 1.5, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 2.2, 6]} />
          <meshStandardMaterial color="#222" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      {([-5, -2.5, 2.5, 5] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.016, ARENA_Z - 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 2.5]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#FF4400" : "#FFAA00"} transparent opacity={0.55} />
        </mesh>
      ))}
      {([-5, -2.5, 2.5, 5] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.016, -ARENA_Z + 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 2.5]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#FF4400" : "#FFAA00"} transparent opacity={0.55} />
        </mesh>
      ))}
      {([-5, 0, 5] as number[]).map((x, i) => (
        <group key={i} position={[x, 5.5, 0]}>
          <mesh>
            <boxGeometry args={[0.5, 0.15, 0.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
      <fog attach="fog" args={["#080510", 22, 55]} />
    </group>
  );
}

// ─── 3D: Impact flash ────────────────────────────────────────────────────────
function ImpactFlash({ x, y, z, color }: { x: number; y: number; z: number; color: string }) {
  return (
    <group position={[x, y, z]}>
      <mesh><sphereGeometry args={[0.5, 6, 4]} /><meshBasicMaterial color={color} transparent opacity={0.75} /></mesh>
      <mesh><sphereGeometry args={[1.0, 6, 4]} /><meshBasicMaterial color={color} transparent opacity={0.3} /></mesh>
      <mesh><sphereGeometry args={[1.8, 6, 4]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.08} /></mesh>
    </group>
  );
}

// ─── 3D: Vehicle weapon ───────────────────────────────────────────────────────
function VehicleWeapon({ atkColor, attackPartId, isAttacking }: {
  atkColor: string; attackPartId: string; isAttacking: boolean;
}) {
  const lc  = (attackPartId || "").toLowerCase();
  const isCannon = lc.includes("plasma") || lc.includes("rocket") || lc.includes("cannon");
  const isSaw    = lc.includes("saw");
  const glow     = isAttacking ? 3.0 : 0.8;

  if (isCannon) return (
    <group position={[0, 0.42, 1.62]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.2, 1.3, 8]} />
        <meshStandardMaterial color={atkColor} metalness={0.3} roughness={0.3} emissive={atkColor} emissiveIntensity={glow} />
      </mesh>
      <mesh position={[0, 0.64, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshBasicMaterial color={atkColor} />
      </mesh>
    </group>
  );

  if (isSaw) return (
    <group position={[0, 0.35, 1.62]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.58, 0.58, 0.18, 12]} />
        <meshStandardMaterial color={atkColor} metalness={0.2} roughness={0.2} emissive={atkColor} emissiveIntensity={glow} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i}
          position={[Math.cos(i * Math.PI / 4) * 0.59, 0, Math.sin(i * Math.PI / 4) * 0.59]}
          rotation={[0, i * Math.PI / 4, 0]}>
          <boxGeometry args={[0.18, 0.14, 0.16]} />
          <meshStandardMaterial color={atkColor} emissive={atkColor} emissiveIntensity={glow * 1.1} />
        </mesh>
      ))}
    </group>
  );

  return (
    <group position={[0, 0.3, 1.5]}>
      <mesh position={[0, 0.06, -0.1]}>
        <boxGeometry args={[1.1, 0.22, 0.28]} />
        <meshStandardMaterial color={atkColor} metalness={0.4} roughness={0.35} emissive={atkColor} emissiveIntensity={glow * 0.65} />
      </mesh>
      {([-0.5, -0.16, 0.16, 0.5] as const).map((x, j) => (
        <mesh key={j} position={[x, 0, j % 2 === 0 ? 0.33 : 0.48]}>
          <boxGeometry args={[0.15, 0.22, 0.85]} />
          <meshStandardMaterial color={atkColor} metalness={0.35} roughness={0.3} emissive={atkColor} emissiveIntensity={glow * 0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── 3D: Robot body ───────────────────────────────────────────────────────────
function RobotBody({ bodyColor, atkColor, defColor, attackPartId, isHit, isAttacking }: {
  bodyColor: string; atkColor: string; defColor: string;
  attackPartId: string; isHit: boolean; isAttacking: boolean;
}) {
  const bc = isHit ? "#ffffff" : bodyColor;
  const bi = isHit ? 4.0 : 0.4;
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.9, 0.5, 2.8]} />
        <meshStandardMaterial color={bc} metalness={0.5} roughness={0.35} emissive={bc} emissiveIntensity={bi} />
      </mesh>
      <mesh position={[0, 0.47, 1.42]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[1.65, 0.5, 0.2]} />
        <meshStandardMaterial color={bc} metalness={0.55} roughness={0.3} emissive={bc} emissiveIntensity={bi * 1.1} />
      </mesh>
      {([-1.02, 1.02] as const).map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.42, 0]}>
            <boxGeometry args={[0.16, 0.64, 2.5]} />
            <meshStandardMaterial color={defColor} metalness={0.4} roughness={0.38} emissive={defColor} emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.71, -0.32]}>
        <boxGeometry args={[1.0, 0.42, 1.28]} />
        <meshStandardMaterial color={bc} metalness={0.5} roughness={0.35} emissive={bc} emissiveIntensity={bi * 1.3} />
      </mesh>
      <mesh position={[0, 0.95, -0.32]}>
        <cylinderGeometry args={[0.22, 0.22, 0.1, 8]} />
        <meshStandardMaterial color={bc} metalness={0.7} roughness={0.3} emissive={bc} emissiveIntensity={bi * 1.5} />
      </mesh>
      {([-0.55, 0.55] as const).map((x, i) => (
        <mesh key={i} position={[x, 0.35, 1.41]}>
          <boxGeometry args={[0.2, 0.1, 0.05]} />
          <meshBasicMaterial color={isHit ? "#ff4444" : atkColor} />
        </mesh>
      ))}
      {([[-0.96, 0.25, 0.97], [0.96, 0.25, 0.97], [-0.96, 0.25, -0.97], [0.96, 0.25, -0.97]] as const).map(([x, y, z], i) => (
        <group key={i}>
          <mesh position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.32, 0.32, 0.28, 8]} />
            <meshStandardMaterial color="#0d0d0d" metalness={0.85} roughness={0.4} />
          </mesh>
          <mesh position={[x + (x > 0 ? 0.16 : -0.16), y, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 0.06, 6]} />
            <meshStandardMaterial color={defColor} metalness={0.7} emissive={defColor} emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.4, -1.48]}>
        <boxGeometry args={[1.7, 0.58, 0.16]} />
        <meshStandardMaterial color={defColor} metalness={0.45} roughness={0.35} emissive={defColor} emissiveIntensity={0.45} />
      </mesh>
      {([-0.47, 0.47] as const).map((x, i) => (
        <mesh key={i} position={[x, 0.52, -1.5]}>
          <cylinderGeometry args={[0.085, 0.065, 0.38, 6]} />
          <meshStandardMaterial color="#111" emissive={atkColor} emissiveIntensity={0.65} />
        </mesh>
      ))}
      <VehicleWeapon atkColor={atkColor} attackPartId={attackPartId} isAttacking={isAttacking} />
    </group>
  );
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
      g.position.y = Math.abs(Math.sin(timeRef.current * 20)) * 0.2;
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.1, 1.6, 20]} />
        <meshBasicMaterial color={config.bodyColor} transparent opacity={isHit ? 0.7 : 0.25} />
      </mesh>
      <RobotBody
        bodyColor={config.bodyColor} atkColor={config.attackColor} defColor={config.defenseColor}
        attackPartId={config.attackPartId || "attack-crusher"}
        isHit={isHit} isAttacking={isAttacking}
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
}) {
  const aiAttackTimer = useRef(0);
  const moveEmitTimer = useRef(0);
  const aiStateTimer  = useRef(0);
  const aiStateRef    = useRef<AIState>("chase");
  const collisionCool = useRef(0);
  const MIN_DIST = 3.2;
  const DAMPING  = 0.80;

  useFrame((_, delta) => {
    if (!gameActive) return;
    const dt = Math.min(delta, 0.05);
    p1PosRef.current.x = THREE.MathUtils.clamp(p1PosRef.current.x + p1VelRef.current.x * dt, -ARENA_X, ARENA_X);
    p1PosRef.current.z = THREE.MathUtils.clamp(p1PosRef.current.z + p1VelRef.current.z * dt, -ARENA_Z, ARENA_Z);
    p2PosRef.current.x = THREE.MathUtils.clamp(p2PosRef.current.x + p2VelRef.current.x * dt, -ARENA_X, ARENA_X);
    p2PosRef.current.z = THREE.MathUtils.clamp(p2PosRef.current.z + p2VelRef.current.z * dt, -ARENA_Z, ARENA_Z);
    if (Math.abs(p1PosRef.current.x) >= ARENA_X) p1VelRef.current.x *= -0.4;
    if (Math.abs(p1PosRef.current.z) >= ARENA_Z) p1VelRef.current.z *= -0.4;
    if (Math.abs(p2PosRef.current.x) >= ARENA_X) p2VelRef.current.x *= -0.4;
    if (Math.abs(p2PosRef.current.z) >= ARENA_Z) p2VelRef.current.z *= -0.4;
    const damp = Math.pow(DAMPING, dt * 60);
    p1VelRef.current.x *= damp; p1VelRef.current.z *= damp;
    p2VelRef.current.x *= damp; p2VelRef.current.z *= damp;
    const spd = (p1Speed / 100) * 9;
    const k   = keysRef.current;
    let inputX = 0, inputZ = 0;
    if (k.has("KeyW") || k.has("ArrowUp"))    inputZ -= 1;
    if (k.has("KeyS") || k.has("ArrowDown"))  inputZ += 1;
    if (k.has("KeyA") || k.has("ArrowLeft"))  inputX -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) inputX += 1;
    if (inputX !== 0 || inputZ !== 0) {
      const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
      p1VelRef.current.x = (inputX / len) * spd;
      p1VelRef.current.z = (inputZ / len) * spd;
    }
    if (isAI) {
      const aiSpd = (p2Speed / 100) * 8;
      const ddx   = p1PosRef.current.x - p2PosRef.current.x;
      const ddz   = p1PosRef.current.z - p2PosRef.current.z;
      const dist  = Math.sqrt(ddx * ddx + ddz * ddz);
      const dirX  = dist > 0.001 ? ddx / dist : 1;
      const dirZ  = dist > 0.001 ? ddz / dist : 0;
      aiStateTimer.current += dt;
      if (aiStateTimer.current > 2.2) {
        aiStateTimer.current = 0;
        const roll = Math.random();
        if (dist > 6)      aiStateRef.current = roll < 0.5 ? "chase" : "charge";
        else if (dist < 4) aiStateRef.current = roll < 0.35 ? "retreat" : roll < 0.65 ? "strafe" : "circle";
        else               aiStateRef.current = roll < 0.4 ? "chase" : roll < 0.7 ? "circle" : "charge";
      }
      const st = aiStateRef.current;
      if (st === "chase" || (st === "charge" && dist > MIN_DIST + 0.5)) {
        const sm = st === "charge" ? 1.6 : 1.0;
        p2VelRef.current.x = dirX * aiSpd * sm;
        p2VelRef.current.z = dirZ * aiSpd * sm;
      } else if (st === "retreat") {
        p2VelRef.current.x = -dirX * aiSpd * 1.2;
        p2VelRef.current.z = -dirZ * aiSpd * 1.2;
      } else if (st === "strafe" || st === "circle") {
        const perpX = -dirZ, perpZ = dirX;
        const orb   = Math.sin(aiStateTimer.current) > 0 ? 1 : -1;
        p2VelRef.current.x = perpX * aiSpd * orb + dirX * aiSpd * 0.3;
        p2VelRef.current.z = perpZ * aiSpd * orb + dirZ * aiSpd * 0.3;
      }
      aiAttackTimer.current += dt;
      const atkInterval = 1.4 + (1 - p2Speed / 100) * 1.5;
      if (aiAttackTimer.current >= atkInterval && dist < 5.5) {
        aiAttackTimer.current = 0;
        onAIAttack();
        p2VelRef.current.x += dirX * 5;
        p2VelRef.current.z += dirZ * 5;
      }
    }
    collisionCool.current = Math.max(0, collisionCool.current - dt);
    const cdx  = p1PosRef.current.x - p2PosRef.current.x;
    const cdz  = p1PosRef.current.z - p2PosRef.current.z;
    const cdist = Math.sqrt(cdx * cdx + cdz * cdz);
    if (cdist < MIN_DIST && cdist > 0.001) {
      const nx  = cdx / cdist, nz = cdz / cdist;
      const sep = (MIN_DIST - cdist) * 0.5;
      p1PosRef.current.x = THREE.MathUtils.clamp(p1PosRef.current.x + nx * sep, -ARENA_X, ARENA_X);
      p1PosRef.current.z = THREE.MathUtils.clamp(p1PosRef.current.z + nz * sep, -ARENA_Z, ARENA_Z);
      p2PosRef.current.x = THREE.MathUtils.clamp(p2PosRef.current.x - nx * sep, -ARENA_X, ARENA_X);
      p2PosRef.current.z = THREE.MathUtils.clamp(p2PosRef.current.z - nz * sep, -ARENA_Z, ARENA_Z);
      if (collisionCool.current <= 0) {
        collisionCool.current = 0.25;
        const relVN = (p1VelRef.current.x - p2VelRef.current.x) * nx + (p1VelRef.current.z - p2VelRef.current.z) * nz;
        if (relVN > 0) {
          const imp = relVN * 1.2;
          p1VelRef.current.x -= imp * nx; p1VelRef.current.z -= imp * nz;
          p2VelRef.current.x += imp * nx; p2VelRef.current.z += imp * nz;
        }
        onSparks((p1PosRef.current.x + p2PosRef.current.x) / 2, 0.8, (p1PosRef.current.z + p2PosRef.current.z) / 2, "#FF8844");
      }
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

  const [p1Hp, setP1Hp]             = useState(100);
  const [p2Hp, setP2Hp]             = useState(100);
  const [timeLeft, setTimeLeft]     = useState(180);
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
  const p1PosRef = useRef<PosRef>({ x: -4, z: 0 });
  const p2PosRef = useRef<PosRef>({ x:  4, z: 0 });
  const p1VelRef = useRef<VelRef>({ x:  0, z: 0 });
  const p2VelRef = useRef<VelRef>({ x:  0, z: 0 });
  const p1LungeDirRef   = useRef({ x: 0, z: 0, active: false });
  const keysRef         = useRef<Set<string>>(new Set());
  const gameStatusRef   = useRef<"waiting"|"starting"|"playing"|"ended">("waiting");
  const attackCooldownRef = useRef(false);
  const socketRef         = useRef<Socket | null>(null);
  const resultRecordedRef = useRef(false);

  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
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

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (e.code === "Space") { e.preventDefault(); triggerP1Attack("punch"); }
      if (e.code === "KeyE")  triggerP1Attack("kick");
      if (e.code === "KeyQ")  triggerP1Attack("special");
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
    const socket = io(import.meta.env.BASE_URL.replace(/\/$/, ""), {
      path: `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/socket.io`,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.on("connect", () => { socket.emit("joinRoom", { roomId, playerName: myRobot.playerName }); });
    socket.on("battleStart", ({ players }: any) => {
      const opp = players.find((p: any) => p.playerName !== myRobot.playerName);
      if (opp) setP2Name(opp.playerName);
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

  const flashHit = (who: "p1" | "p2") => {
    if (who === "p1") {
      setP1Hit(true); setTimeout(() => setP1Hit(false), 220);
      const dx = p1PosRef.current.x - p2PosRef.current.x;
      const dz = p1PosRef.current.z - p2PosRef.current.z;
      const d  = Math.sqrt(dx * dx + dz * dz) || 1;
      p1VelRef.current.x += (dx / d) * 9;
      p1VelRef.current.z += (dz / d) * 9;
    } else {
      setP2Hit(true); setTimeout(() => setP2Hit(false), 220);
      const dx = p2PosRef.current.x - p1PosRef.current.x;
      const dz = p2PosRef.current.z - p1PosRef.current.z;
      const d  = Math.sqrt(dx * dx + dz * dz) || 1;
      p2VelRef.current.x += (dx / d) * 9;
      p2VelRef.current.z += (dz / d) * 9;
    }
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 200);
    spawnSparks(
      (p1PosRef.current.x + p2PosRef.current.x) / 2, 1.0,
      (p1PosRef.current.z + p2PosRef.current.z) / 2,
      who === "p1" ? myRobot.bodyColor : aiRobot.bodyColor
    );
  };

  const calcDmg = (type: "punch" | "kick" | "special", power: number) => {
    const base = type === "punch" ? 8 : type === "kick" ? 14 : 28;
    return base + Math.floor(Math.random() * (power / 10));
  };

  const inRange = () => {
    const dx = p1PosRef.current.x - p2PosRef.current.x;
    const dz = p1PosRef.current.z - p2PosRef.current.z;
    return Math.sqrt(dx * dx + dz * dz) < 7;
  };

  const triggerP1Attack = useCallback((type: "punch" | "kick" | "special") => {
    if (gameStatusRef.current !== "playing" || attackCooldownRef.current) return;
    attackCooldownRef.current = true;
    setP1Attacking(true);
    const dx = p2PosRef.current.x - p1PosRef.current.x;
    const dz = p2PosRef.current.z - p1PosRef.current.z;
    const d  = Math.sqrt(dx * dx + dz * dz) || 1;
    p1LungeDirRef.current = { x: dx / d, z: dz / d, active: true };
    p1VelRef.current.x += (dx / d) * 5;
    p1VelRef.current.z += (dz / d) * 5;
    const dmg = calcDmg(type, myRobot.stats.power);
    setTimeout(() => {
      if (isAI) {
        if (inRange()) { setP2Hp(prev => Math.max(0, prev - dmg)); flashHit("p2"); addDmgText(dmg, false); }
      } else {
        socketRef.current?.emit("attack", { roomId, attackType: type, damage: dmg });
      }
      p1LungeDirRef.current.active = false;
      setTimeout(() => { setP1Attacking(false); attackCooldownRef.current = false; }, 320);
    }, 160);
  }, [isAI, myRobot.stats.power]);

  const handleAIAttack = useCallback(() => {
    if (gameStatus !== "playing" || p2Attacking) return;
    setP2Attacking(true);
    const dmg = calcDmg("punch", aiRobot.stats.power);
    setTimeout(() => {
      if (inRange()) { setP1Hp(prev => Math.max(0, prev - dmg)); flashHit("p1"); addDmgText(dmg, true); }
      setTimeout(() => setP2Attacking(false), 350);
    }, 160);
  }, [gameStatus, p2Attacking]);

  const handleP1Move = useCallback((x: number, z: number) => {
    if (!isAI) socketRef.current?.emit("move", { roomId, x, z });
  }, [isAI, roomId]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const p1Speed = myRobot.stats.speed;
  const p2Speed = aiRobot.stats.speed;

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
      {/* ── 3D Canvas ── */}
      <div className="absolute inset-0 z-0">
        {webGLSupported ? (
          <WebGLErrorBoundary>
            <Canvas
              camera={{ fov: 58, position: [0, 11, 15], near: 0.1, far: 200 }}
              gl={{ antialias: false, powerPreference: "high-performance" }}
              dpr={[1, 1.5]}
            >
              <ambientLight intensity={3.5} color="#ffffff" />
              <directionalLight position={[0, 20, 5]} intensity={4.0} color="#ffffff" />
              <pointLight position={[-7, 4, 0]} intensity={6} color="#FF4400" distance={25} />
              <pointLight position={[7,  4, 0]} intensity={6} color="#00CCFF" distance={25} />
              <pointLight position={[0,  6, 0]} intensity={3} color="#ffffff"  distance={30} />
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
              />
              <ArenaRobot
                posRef={p1PosRef} targetPosRef={p2PosRef} velRef={p1VelRef}
                config={myRobot} isAttacking={p1Attacking} isHit={p1Hit}
                lungeDirRef={p1LungeDirRef}
              />
              <ArenaRobot
                posRef={p2PosRef} targetPosRef={p1PosRef} velRef={p2VelRef}
                config={isAI ? aiRobot : { ...myRobot, playerName: p2Name, bodyColor: "#00FFFF", attackColor: "#00CCFF", defenseColor: "#0066AA" }}
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
        <div className="absolute bottom-6 inset-x-0 z-10 flex justify-center gap-4">
          {[
            { label: "ATTACK", key: "Space", type: "punch"   as const, color: myRobot.attackColor },
            { label: "KICK",   key: "E",     type: "kick"    as const, color: myRobot.bodyColor   },
            { label: "SPECIAL",key: "Q",     type: "special" as const, color: "#FFD700"           },
          ].map(btn => (
            <button key={btn.type}
              onPointerDown={() => triggerP1Attack(btn.type)}
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
                <button onClick={() => setLocation("/battle/ai")}
                  className="brutal-border px-6 py-3 font-display font-bold uppercase tracking-widest text-primary border-primary hover:bg-primary hover:text-black transition-colors">
                  Rematch
                </button>
                <button onClick={() => setLocation("/")}
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
