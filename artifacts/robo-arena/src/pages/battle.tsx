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
const ARENA_X = 16.0;  // was 9.0 — 1.8× scale
const ARENA_Z = 12.5;  // was 7.0 — 1.8× scale

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

// ─── Hazard: Screw drums (north wall) ────────────────────────────────────────
function HazardScrews() {
  const refs = [useRef<THREE.Group>(null!), useRef<THREE.Group>(null!), useRef<THREE.Group>(null!), useRef<THREE.Group>(null!), useRef<THREE.Group>(null!)];
  useFrame((_,dt) => refs.forEach(r => { if(r.current) r.current.rotation.z += dt*3; }));
  return <group>{([-7,-3.5,0,3.5,7] as number[]).map((x,i) => (
    <group key={i} position={[x, 0.55, -ARENA_Z-0.1]}>
      <group ref={refs[i]}>
        <mesh castShadow><cylinderGeometry args={[0.55,0.55,1.1,20]}/><meshStandardMaterial color="#333" metalness={0.9} roughness={0.3}/></mesh>
        {[0,1,2].map(j=><mesh key={j} position={[0,0,0]} rotation={[j*Math.PI/3,0,0]}><boxGeometry args={[1.12,0.12,0.12]}/><meshStandardMaterial color="#555" metalness={0.85} roughness={0.2}/></mesh>)}
      </group>
      <mesh position={[0,0.75,0]}><boxGeometry args={[1.2,0.3,0.6]}/><meshStandardMaterial color="#222" metalness={0.8} roughness={0.4}/></mesh>
      {[0,1].map(j=><mesh key={j} position={[(j-.5)*0.6,0.9,0.05]}><boxGeometry args={[0.18,0.14,0.02]}/><meshBasicMaterial color={j%2?"#111":"#ffcc00"}/></mesh>)}
    </group>
  ))}</group>;
}

// ─── Hazard: Floor spikes (center strip) ─────────────────────────────────────
function HazardSpikes() {
  const t = useRef(0);
  const refs = Array.from({length:6},()=>useRef<THREE.Group>(null!));
  useFrame((_,dt) => {
    t.current += dt;
    const cycle = t.current % 7;
    const up = cycle > 4 && cycle < 7;
    const h = up ? Math.min((cycle-4)/0.3,1)*1.5 : 0;
    refs.forEach(r => { if(r.current) r.current.position.y = h; });
  });
  return <group>{([-5,-3,-1,1,3,5] as number[]).map((x,i)=>(
    <group key={i} position={[x,0,0]}>
      <group ref={refs[i]}>
        <mesh castShadow><cylinderGeometry args={[0,0.18,1.5,6]}/><meshStandardMaterial color="#2a2a2a" metalness={0.92} roughness={0.15}/></mesh>
      </group>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]}><circleGeometry args={[0.28,6]}/><meshBasicMaterial color="#ffcc00" transparent opacity={0.5}/></mesh>
    </group>
  ))}</group>;
}

// ─── Hazard: Rotating hammer (west wall) ─────────────────────────────────────
function HazardHammer() {
  const arm = useRef<THREE.Group>(null!);
  const t = useRef(0);
  useFrame((_,dt) => {
    t.current += dt;
    const cycle = t.current % 6;
    const angle = cycle < 1 ? (cycle/0.8)*-Math.PI/2 : Math.max(-Math.PI/2, (-Math.PI/2)*(1-(cycle-1)/1.5));
    if(arm.current) arm.current.rotation.z = angle;
  });
  return <group position={[-ARENA_X-0.2,1.2,0]}>
    <mesh><cylinderGeometry args={[0.28,0.28,0.5,12]}/><meshStandardMaterial color="#222" metalness={0.9} roughness={0.2}/></mesh>
    <group ref={arm}>
      <mesh position={[0.9,0,0]}><boxGeometry args={[1.8,0.18,0.18]}/><meshStandardMaterial color="#2a2a2a" metalness={0.88} roughness={0.25}/></mesh>
      <mesh position={[1.85,0,0]} castShadow><boxGeometry args={[0.42,0.55,0.42]}/><meshStandardMaterial color="#333" metalness={0.9} roughness={0.18}/></mesh>
      {[-0.12,0,0.12].map((z,i)=><mesh key={i} position={[1.85,0,z]}><boxGeometry args={[0.44,0.06,0.04]}/><meshBasicMaterial color={i%2?"#111":"#ffcc00"}/></mesh>)}
    </group>
  </group>;
}

// ─── Hazard: Pneumatic ram (east wall) ────────────────────────────────────────
function HazardRam() {
  const ram = useRef<THREE.Group>(null!);
  const t = useRef(0);
  useFrame((_,dt) => {
    t.current += dt;
    const cycle = t.current % 8;
    const ext = cycle < 0.2 ? (cycle/0.2)*-3 : cycle < 1.7 ? THREE.MathUtils.lerp(-3,0,(cycle-0.2)/1.5) : 0;
    if(ram.current) ram.current.position.x = ext;
  });
  return <group position={[ARENA_X+0.3,1.0,0]}>
    <mesh><boxGeometry args={[0.5,0.8,0.8]}/><meshStandardMaterial color="#222" metalness={0.9} roughness={0.2}/></mesh>
    {[-0.15,0,0.15].map((z,i)=><mesh key={i} position={[0,0.42,z]}><boxGeometry args={[0.52,0.06,0.04]}/><meshBasicMaterial color={i%2?"#111":"#ffcc00"}/></mesh>)}
    <group ref={ram}>
      <mesh position={[-0.8,0,0]}><cylinderGeometry args={[0.3,0.3,1.6,14]} /><meshStandardMaterial color="#444" metalness={0.88} roughness={0.22}/></mesh>
      <mesh position={[-1.62,0,0]}><cylinderGeometry args={[0.36,0.36,0.14,14]}/><meshStandardMaterial color="#888" metalness={0.95} roughness={0.08}/></mesh>
    </group>
  </group>;
}

// ─── Hazard: Wrecking ball ────────────────────────────────────────────────────
function HazardWreckingBall() {
  const ball = useRef<THREE.Group>(null!);
  const t = useRef(0);
  useFrame((_,dt) => {
    t.current += dt;
    if(ball.current) ball.current.rotation.z = Math.sin(t.current*0.8)*0.7;
  });
  return <group position={[0,7.5,0]} ref={ball}>
    <mesh position={[0,-3.2,0]} castShadow>
      <sphereGeometry args={[0.65,16,16]}/>
      <meshStandardMaterial color="#555" metalness={0.78} roughness={0.42}/>
    </mesh>
    {Array.from({length:8}).map((_,i)=>{
      const a=i*Math.PI/4;
      return <mesh key={i} position={[Math.cos(a)*0.65,Math.sin(a)*0.65-3.2,0]} castShadow>
        <sphereGeometry args={[0.07,8,8]}/>
        <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1}/>
      </mesh>;
    })}
    {Array.from({length:6}).map((_,i)=><mesh key={i} position={[0,-i*0.42-0.7,0]}><torusGeometry args={[0.14,0.04,8,12]}/><meshStandardMaterial color="#666" metalness={0.85} roughness={0.25}/></mesh>)}
  </group>;
}

// ─── 3D: Minimal Industrial Battle Arena ─────────────────────────────────────
function ProcArena() {
  const W = ARENA_X * 2 + 2, D = ARENA_Z * 2 + 2;
  const flameRef = useRef<THREE.Group[]>([]);
  const flameT = useRef(0);
  useFrame((_, dt) => {
    flameT.current += dt;
    flameRef.current.forEach((g, i) => {
      if (!g) return;
      const cycle = (flameT.current + i * 2.5) % 10;
      const active = cycle > 8;
      g.visible = active;
      if (active) g.scale.y = 0.4 + Math.sin(flameT.current * 12 + i) * 0.15;
    });
  });
  // Panel seam positions across the large floor
  const seamsX = [-12,-8,-4,0,4,8,12];
  const seamsZ = [-8,-4,0,4,8];
  return (
    <group>
      {/* ── FLOOR: Dark industrial steel ── */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.01,0]} receiveShadow>
        <planeGeometry args={[W+4, D+4]}/>
        <meshStandardMaterial color="#181a1c" metalness={0.82} roughness={0.52}/>
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
      {/* ── RED START ZONE (north) ── */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.012,-ARENA_Z+2]}>
        <planeGeometry args={[14, 3.5]}/><meshStandardMaterial color="#8a1000" metalness={0.5} roughness={0.65}/>
      </mesh>
      {/* ── BLUE START ZONE (south) ── */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.012, ARENA_Z-2]}>
        <planeGeometry args={[14, 3.5]}/><meshStandardMaterial color="#082270" metalness={0.5} roughness={0.65}/>
      </mesh>
      {/* ── WALLS: Steel base ── */}
      <mesh position={[0,1.8,-ARENA_Z-0.7]} castShadow receiveShadow>
        <boxGeometry args={[W+3, 3.6, 0.55]}/><meshStandardMaterial color="#0c0c0e" metalness={0.92} roughness={0.18}/>
      </mesh>
      <mesh position={[0,1.8, ARENA_Z+0.7]} castShadow receiveShadow>
        <boxGeometry args={[W+3, 3.6, 0.55]}/><meshStandardMaterial color="#0c0c0e" metalness={0.92} roughness={0.18}/>
      </mesh>
      <mesh position={[-ARENA_X-0.7,1.8,0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 3.6, D+3]}/><meshStandardMaterial color="#0c0c0e" metalness={0.92} roughness={0.18}/>
      </mesh>
      <mesh position={[ ARENA_X+0.7,1.8,0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 3.6, D+3]}/><meshStandardMaterial color="#0c0c0e" metalness={0.92} roughness={0.18}/>
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
      {/* Corner pillars */}
      {([[-ARENA_X-0.6,-ARENA_Z-0.6],[ARENA_X+0.6,-ARENA_Z-0.6],[-ARENA_X-0.6,ARENA_Z+0.6],[ARENA_X+0.6,ARENA_Z+0.6]] as [number,number][]).map(([x,z],i)=>(
        <group key={`cp-${i}`} position={[x,0,z]}>
          <mesh position={[0,2,0]} castShadow><boxGeometry args={[1.2,4.2,1.2]}/><meshStandardMaterial color="#0a0a0c" metalness={0.95} roughness={0.15}/></mesh>
          <mesh position={[0,4.25,0]}><boxGeometry args={[1.35,0.18,1.35]}/><meshBasicMaterial color={i<2?"#cc1100":"#0044cc"}/></mesh>
          <pointLight position={[0,3.8,0]} color={i<2?"#ff2200":"#0055ff"} intensity={1.5} distance={8}/>
        </group>
      ))}
      {/* ── INDUSTRIAL LIGHTING RIG ── */}
      {/* Cross beams */}
      <mesh position={[0,8.5,0]}><boxGeometry args={[W+6,0.2,0.2]}/><meshStandardMaterial color="#0e0e10" metalness={0.9} roughness={0.2}/></mesh>
      <mesh position={[0,8.5,0]}><boxGeometry args={[0.2,0.2,D+6]}/><meshStandardMaterial color="#0e0e10" metalness={0.9} roughness={0.2}/></mesh>
      <mesh position={[-ARENA_X*0.5,8.5,0]}><boxGeometry args={[0.2,0.2,D+6]}/><meshStandardMaterial color="#0e0e10" metalness={0.9} roughness={0.2}/></mesh>
      <mesh position={[ ARENA_X*0.5,8.5,0]}><boxGeometry args={[0.2,0.2,D+6]}/><meshStandardMaterial color="#0e0e10" metalness={0.9} roughness={0.2}/></mesh>
      {/* Spotlight housings — 6 positions */}
      {([[-10,8],[-10,-8],[0,10],[0,-10],[10,8],[10,-8]] as [number,number][]).map(([x,z],i)=>(
        <group key={`spot-${i}`} position={[x,8.2,z]}>
          <mesh><cylinderGeometry args={[0.25,0.32,0.45,12]}/><meshStandardMaterial color="#0e0e10" metalness={0.9} roughness={0.2}/></mesh>
          <mesh position={[0,-0.28,0]}><cylinderGeometry args={[0.1,0.24,0.18,12]}/><meshBasicMaterial color="#e8f0ff"/></mesh>
          <pointLight position={[0,-0.5,0]} color="#ddeeff" intensity={12} distance={30} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}/>
        </group>
      ))}
      {/* Centre overhead fill */}
      <pointLight position={[0,9,0]} color="#ffffff" intensity={5} distance={40}/>
      {/* Zone-tint lights */}
      <pointLight position={[0,5,-ARENA_Z+3]} color="#ff2200" intensity={4} distance={14}/>
      <pointLight position={[0,5, ARENA_Z-3]} color="#2255ff" intensity={4} distance={14}/>
      {/* ── HAZARD 1: OVERHEAD CRUSHER (west side) ── */}
      <HazardHammer/>
      {/* ── HAZARD 2: PNEUMATIC RAM (east wall) ── */}
      <HazardRam/>
      {/* ── HAZARD 3: FLAME VENTS (4 corners only) ── */}
      {([[-ARENA_X+3,-ARENA_Z+3],[ARENA_X-3,-ARENA_Z+3],[-ARENA_X+3,ARENA_Z-3],[ARENA_X-3,ARENA_Z-3]] as [number,number][]).map(([x,z],i)=>(
        <group key={`vent-${i}`} position={[x,0,z]}>
          {/* Grate */}
          <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]}>
            <planeGeometry args={[1.8,1.8]}/><meshStandardMaterial color="#151518" metalness={0.88} roughness={0.35}/>
          </mesh>
          {/* Vent slits */}
          {[-0.5,-0.25,0,0.25,0.5].map((s,j)=>(
            <mesh key={j} rotation={[-Math.PI/2,0,0]} position={[s,0.015,0]}>
              <planeGeometry args={[0.06,1.75]}/><meshBasicMaterial color="#050506"/>
            </mesh>
          ))}
          {/* Scorch ring around vent */}
          <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.002,0]}>
            <ringGeometry args={[0.92,1.4,24]}/><meshBasicMaterial color="#0a0808" transparent opacity={0.7}/>
          </mesh>
          {/* Flame column — hidden by default, shown on cycle */}
          <group ref={el=>{ if(el) flameRef.current[i]=el; }} visible={false} position={[0,0.1,0]}>
            <mesh><cylinderGeometry args={[0.15,0.35,2.0,10]}/><meshBasicMaterial color="#ff5500" transparent opacity={0.7}/></mesh>
            <mesh position={[0,1.2,0]}><sphereGeometry args={[0.3,10,8]}/><meshBasicMaterial color="#ff8800" transparent opacity={0.5}/></mesh>
            <pointLight color="#ff6600" intensity={8} distance={5}/>
          </group>
        </group>
      ))}
      <fog attach="fog" args={["#08080a", 30, 75]}/>
    </group>
  );
}


      {/* Scratch marks */}
      {[[-4,2,0.6],[3,-1,1.2],[-1,-3,0.3],[5,1,2.1]].map(([x,z,r],i)=><mesh key={`sc-${i}`} rotation={[-Math.PI/2,0,r]} position={[x,0.008,z]}><planeGeometry args={[0.03,2.2]}/><meshBasicMaterial color="#111"/></mesh>)}
      {/* Scorch marks */}
      {[[-6,3],[-4,-4],[5,-2],[2,5],[-7,-1],[6,2]].map(([x,z],i)=><mesh key={`sc2-${i}`} rotation={[-Math.PI/2,0,0]} position={[x,0.009,z]}><circleGeometry args={[0.5+i*0.1,18]}/><meshBasicMaterial color="#0a0a0a" transparent opacity={0.85}/></mesh>)}
      {/* Center wear plate (lighter) */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.007,0]}><circleGeometry args={[3.5,32]}/><meshBasicMaterial color="#242424" transparent opacity={0.6}/></mesh>
      {/* ── START ZONES ── */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.012,-ARENA_Z+1.2]}><planeGeometry args={[8,2.4]}/><meshStandardMaterial color="#bb1a00" metalness={0.55} roughness={0.7}/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.013,-ARENA_Z+1.2]}><planeGeometry args={[7.6,2.0]}/><meshBasicMaterial color="#880000" transparent opacity={0.4}/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.012, ARENA_Z-1.2]}><planeGeometry args={[8,2.4]}/><meshStandardMaterial color="#0d44aa" metalness={0.55} roughness={0.7}/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.013, ARENA_Z-1.2]}><planeGeometry args={[7.6,2.0]}/><meshBasicMaterial color="#0033aa" transparent opacity={0.4}/></mesh>
      {/* Center shockwave plate */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.012,0]}><planeGeometry args={[3,3]}/><meshStandardMaterial color="#1e1e1e" metalness={0.88} roughness={0.3}/></mesh>
      <mesh ref={warningRef} rotation={[-Math.PI/2,0,0]} position={[0,0.015,0]}><ringGeometry args={[1.4,1.55,32]}/><meshBasicMaterial color="#ffcc00" transparent opacity={0.35}/></mesh>
      {/* ── WALLS — black steel base ── */}
      <mesh position={[0,1.8,-ARENA_Z-0.6]} castShadow><boxGeometry args={[W+2.5,3.6,0.55]}/><meshStandardMaterial color="#0d0d0d" metalness={0.92} roughness={0.18}/></mesh>
      <mesh position={[0,1.8, ARENA_Z+0.6]} castShadow><boxGeometry args={[W+2.5,3.6,0.55]}/><meshStandardMaterial color="#0d0d0d" metalness={0.92} roughness={0.18}/></mesh>
      <mesh position={[-ARENA_X-0.6,1.8,0]} castShadow><boxGeometry args={[0.55,3.6,D+2.5]}/><meshStandardMaterial color="#0d0d0d" metalness={0.92} roughness={0.18}/></mesh>
      <mesh position={[ ARENA_X+0.6,1.8,0]} castShadow><boxGeometry args={[0.55,3.6,D+2.5]}/><meshStandardMaterial color="#0d0d0d" metalness={0.92} roughness={0.18}/></mesh>
      {/* Glass panels */}
      <mesh position={[0,1.6,-ARENA_Z-0.32]}><boxGeometry args={[W+1.8,2.8,0.06]}/><meshStandardMaterial color="#334455" metalness={0.1} roughness={0.05} transparent opacity={0.15}/></mesh>
      <mesh position={[0,1.6, ARENA_Z+0.32]}><boxGeometry args={[W+1.8,2.8,0.06]}/><meshStandardMaterial color="#334455" metalness={0.1} roughness={0.05} transparent opacity={0.15}/></mesh>
      <mesh position={[-ARENA_X-0.32,1.6,0]}><boxGeometry args={[0.06,2.8,D+1.8]}/><meshStandardMaterial color="#334455" metalness={0.1} roughness={0.05} transparent opacity={0.15}/></mesh>
      <mesh position={[ ARENA_X+0.32,1.6,0]}><boxGeometry args={[0.06,2.8,D+1.8]}/><meshStandardMaterial color="#334455" metalness={0.1} roughness={0.05} transparent opacity={0.15}/></mesh>
      {/* Top rail - dark grey with rivets */}
      <mesh position={[0,3.55,-ARENA_Z-0.6]}><boxGeometry args={[W+2.7,0.22,0.7]}/><meshStandardMaterial color="#222" metalness={0.88} roughness={0.28}/></mesh>
      <mesh position={[0,3.55, ARENA_Z+0.6]}><boxGeometry args={[W+2.7,0.22,0.7]}/><meshStandardMaterial color="#222" metalness={0.88} roughness={0.28}/></mesh>
      <mesh position={[-ARENA_X-0.6,3.55,0]}><boxGeometry args={[0.7,0.22,D+2.7]}/><meshStandardMaterial color="#222" metalness={0.88} roughness={0.28}/></mesh>
      <mesh position={[ ARENA_X+0.6,3.55,0]}><boxGeometry args={[0.7,0.22,D+2.7]}/><meshStandardMaterial color="#222" metalness={0.88} roughness={0.28}/></mesh>
      {/* Yellow bumper rails — front/back */}
      {[-6,-3,0,3,6].map((x,i)=>[
        <mesh key={`yf-${i}`} position={[x,0.55,-ARENA_Z-0.28]}><boxGeometry args={[2.4,0.45,0.32]}/><meshStandardMaterial color="#ffcc00" metalness={0.62} roughness={0.4}/></mesh>,
        <mesh key={`yb-${i}`} position={[x,0.55, ARENA_Z+0.28]}><boxGeometry args={[2.4,0.45,0.32]}/><meshStandardMaterial color="#ffcc00" metalness={0.62} roughness={0.4}/></mesh>
      ])}
      {/* Yellow bumper rails — sides */}
      {[-4,0,4].map((z,i)=>[
        <mesh key={`yl-${i}`} position={[-ARENA_X-0.28,0.55,z]}><boxGeometry args={[0.32,0.45,4.0]}/><meshStandardMaterial color="#ffcc00" metalness={0.62} roughness={0.4}/></mesh>,
        <mesh key={`yr-${i}`} position={[ ARENA_X+0.28,0.55,z]}><boxGeometry args={[0.32,0.45,4.0]}/><meshStandardMaterial color="#ffcc00" metalness={0.62} roughness={0.4}/></mesh>
      ])}
      {/* Yellow corner bumpers — angled 45° */}
      {([[-ARENA_X-0.25,-ARENA_Z-0.25],[ARENA_X+0.25,-ARENA_Z-0.25],[-ARENA_X-0.25,ARENA_Z+0.25],[ARENA_X+0.25,ARENA_Z+0.25]] as [number,number][]).map(([x,z],i)=>(
        <mesh key={`cb-${i}`} position={[x,0.55,z]} rotation={[0,Math.PI/4,0]}><boxGeometry args={[1.2,0.5,0.45]}/><meshStandardMaterial color="#ffcc00" metalness={0.6} roughness={0.45}/></mesh>
      ))}
      {/* Corner pillars */}
      {([[-ARENA_X-0.5,-ARENA_Z-0.5],[ARENA_X+0.5,-ARENA_Z-0.5],[-ARENA_X-0.5,ARENA_Z+0.5],[ARENA_X+0.5,ARENA_Z+0.5]] as [number,number][]).map(([x,z],i)=>(
        <group key={`cp-${i}`} position={[x,0,z]}>
          <mesh position={[0,2,0]} castShadow><boxGeometry args={[1.1,4,1.1]}/><meshStandardMaterial color="#0a0a0a" metalness={0.95} roughness={0.15}/></mesh>
          <mesh position={[0,4.1,0]}><boxGeometry args={[1.25,0.2,1.25]}/><meshBasicMaterial color={i<2?"#ff2200":"#0055ff"}/></mesh>
          <pointLight position={[0,3.8,0]} color={i<2?"#ff2200":"#0055ff"} intensity={1.2} distance={6}/>
        </group>
      ))}
      {/* ── OVERHEAD LIGHTING RIG ── */}
      <mesh position={[0,7.2,0]}><boxGeometry args={[W+4,0.18,0.18]}/><meshStandardMaterial color="#111" metalness={0.9} roughness={0.2}/></mesh>
      <mesh position={[0,7.2,0]}><boxGeometry args={[0.18,0.18,D+4]}/><meshStandardMaterial color="#111" metalness={0.9} roughness={0.2}/></mesh>
      {/* Spotlight housings */}
      {([[-6,6],[-6,-6],[6,6],[6,-6]] as [number,number][]).map(([x,z],i)=>(
        <group key={`light-${i}`} position={[x,6.8,z]}>
          <mesh><cylinderGeometry args={[0.22,0.28,0.4,10]}/><meshStandardMaterial color="#111" metalness={0.9} roughness={0.2}/></mesh>
          <mesh position={[0,-0.25,0]}><cylinderGeometry args={[0.1,0.22,0.2,10]}/><meshBasicMaterial color="#ddeeff"/></mesh>
          <pointLight position={[0,-0.4,0]} color="#ddeeff" intensity={8} distance={22} castShadow/>
        </group>
      ))}
      {/* Center overhead wash */}
      <pointLight position={[0,8,0]} color="#ffffff" intensity={3} distance={28}/>
      {/* Zone colored lights */}
      <pointLight position={[0,4,-ARENA_Z+1]} color="#ff2200" intensity={4} distance={10}/>
      <pointLight position={[0,4, ARENA_Z-1]} color="#2255ff" intensity={4} distance={10}/>
      {/* ── SPINNING SAWS (corners) ── */}
      <SpinningSaw pos={[-ARENA_X+2.5,0.1,-ARENA_Z+2.5]} color="#FF3300"/>
      <SpinningSaw pos={[ ARENA_X-2.5,0.1,-ARENA_Z+2.5]} color="#FF3300"/>
      <SpinningSaw pos={[-ARENA_X+2.5,0.1, ARENA_Z-2.5]} color="#00CCFF"/>
      <SpinningSaw pos={[ ARENA_X-2.5,0.1, ARENA_Z-2.5]} color="#00CCFF"/>
      {/* ── HAZARDS ── */}
      <HazardScrews/>
      <HazardSpikes/>
      <HazardHammer/>
      <HazardRam/>
      <HazardWreckingBall/>
      {/* Flame vent grates (4 corners) */}
      {([[-ARENA_X+1.5,-ARENA_Z+1.5],[ARENA_X-1.5,-ARENA_Z+1.5],[-ARENA_X+1.5,ARENA_Z-1.5],[ARENA_X-1.5,ARENA_Z-1.5]] as [number,number][]).map(([x,z],i)=>(
        <mesh key={`vent-${i}`} rotation={[-Math.PI/2,0,0]} position={[x,0.01,z]}><planeGeometry args={[1.2,1.2]}/><meshBasicMaterial color="#111" transparent opacity={0.9}/></mesh>
      ))}
      {/* Hazard warning stripes on floor around screws */}
      {([-7,-3.5,0,3.5,7] as number[]).map((x,i)=>(
        <mesh key={`hs-${i}`} rotation={[-Math.PI/2,0,0]} position={[x,0.011,-ARENA_Z+0.55]}><planeGeometry args={[1.1,1.0]}/><meshBasicMaterial color={i%2?"#ffcc00":"#111100"} transparent opacity={0.6}/></mesh>
      ))}
      <fog attach="fog" args={["#060408",24,60]}/>
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

function RealisticEnvironment() {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTexture = pmrem.fromScene(new RoomEnvironment()).texture; 
    scene.environment = envTexture;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        child.material.envMap = envTexture;
        child.material.envMapIntensity = 1.3;
        child.material.needsUpdate = true;
      }
    });
  }, [gl, scene]);
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
      <HighFidelityRobotMesh 
        bodyPart={{ id: config.bodyPartId || "body-titan" }}
        attackPart={{ id: config.attackPartId || "attack-crusher" }}
        defensePart={{ id: config.defensePartId || "defense-titanium" }}
        secondaryPart={{ id: config.secondaryWeaponId }}
        isHit={isHit}
        isAttacking={isAttacking}
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
  const DAMPING  = 0.88;  // raised from 0.80 — heavy traction, no sliding

  useFrame((_, delta) => {
    if (!gameActive) return;
    const dt = Math.min(delta, 0.05);
    p1PosRef.current.x = THREE.MathUtils.clamp(p1PosRef.current.x + p1VelRef.current.x * dt, -ARENA_X, ARENA_X);
    p1PosRef.current.z = THREE.MathUtils.clamp(p1PosRef.current.z + p1VelRef.current.z * dt, -ARENA_Z, ARENA_Z);
    p2PosRef.current.x = THREE.MathUtils.clamp(p2PosRef.current.x + p2VelRef.current.x * dt, -ARENA_X, ARENA_X);
    p2PosRef.current.z = THREE.MathUtils.clamp(p2PosRef.current.z + p2VelRef.current.z * dt, -ARENA_Z, ARENA_Z);
    if (Math.abs(p1PosRef.current.x) >= ARENA_X) p1VelRef.current.x *= -0.25;
    if (Math.abs(p1PosRef.current.z) >= ARENA_Z) p1VelRef.current.z *= -0.25;
    if (Math.abs(p2PosRef.current.x) >= ARENA_X) p2VelRef.current.x *= -0.25;
    if (Math.abs(p2PosRef.current.z) >= ARENA_Z) p2VelRef.current.z *= -0.25;
    const damp = Math.pow(DAMPING, dt * 60);
    // Apply strong lateral damping to kill sideways drift
    p1VelRef.current.x *= damp; p1VelRef.current.z *= damp;
    if (!keysRef.current.has("KeyA") && !keysRef.current.has("ArrowLeft") && !keysRef.current.has("KeyD") && !keysRef.current.has("ArrowRight")) {
      p1VelRef.current.x *= Math.pow(0.78, dt * 60);
    }
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
              gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
              dpr={[1, 2]}
              shadows
            >
              <RealisticEnvironment />
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
