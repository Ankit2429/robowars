import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RobotPart } from "@workspace/api-client-react";

// --- GLOBAL MATERIALS --- (metallic base layer)
const STEEL_DARK   = { color: "#1e1e22", metalness: 0.92, roughness: 0.18, envMapIntensity: 1.4 };
const STEEL_MID    = { color: "#3a3a42", metalness: 0.88, roughness: 0.22, envMapIntensity: 1.4 };
const STEEL_LIGHT  = { color: "#5a5a65", metalness: 0.82, roughness: 0.28, envMapIntensity: 1.3 };
const TITANIUM     = { color: "#7a7a88", metalness: 0.72, roughness: 0.38, envMapIntensity: 1.3 };
const CHROME       = { color: "#d0d4e0", metalness: 1.0,  roughness: 0.04, envMapIntensity: 1.6 };
const WORN_IRON    = { color: "#2a2428", metalness: 0.65, roughness: 0.68, envMapIntensity: 1.2 };
const CARBON_FIBER = { color: "#151518", metalness: 0.22, roughness: 0.82, envMapIntensity: 1.0 };
const TUNGSTEN     = { color: "#6a6875", metalness: 0.68, roughness: 0.55, envMapIntensity: 1.2 };
const RUBBER       = { color: "#0a0a0c", metalness: 0.0,  roughness: 1.0,  envMapIntensity: 0.3 };
const COPPER       = { color: "#b87333", metalness: 0.85, roughness: 0.35, envMapIntensity: 1.3 };

// --- PAINT ACCENT MATERIALS --- (bold game-style color over metal)
// Chassis identities
const PAINT_RED        = { color: "#cc1a00", metalness: 0.55, roughness: 0.42, envMapIntensity: 1.3 }; // Titan, aggressive
const PAINT_ORANGE     = { color: "#e05a00", metalness: 0.52, roughness: 0.44, envMapIntensity: 1.3 }; // Goliath, power
const PAINT_YELLOW     = { color: "#d4a000", metalness: 0.58, roughness: 0.40, envMapIntensity: 1.3 }; // Wasp, speed
const PAINT_GREEN      = { color: "#0d8040", metalness: 0.52, roughness: 0.44, envMapIntensity: 1.2 }; // Viper, toxic
const PAINT_BLUE       = { color: "#0a4fcc", metalness: 0.55, roughness: 0.42, envMapIntensity: 1.3 }; // Phantom, stealth
const PAINT_PURPLE     = { color: "#6a0fcc", metalness: 0.52, roughness: 0.44, envMapIntensity: 1.3 }; // Wraith, plasma
const PAINT_CYAN       = { color: "#0099bb", metalness: 0.60, roughness: 0.38, envMapIntensity: 1.4 }; // Lynx, energy
const PAINT_GREY_MED   = { color: "#4a5060", metalness: 0.80, roughness: 0.30, envMapIntensity: 1.3 }; // Fortress
const PAINT_DARK_STEEL = { color: "#2a3040", metalness: 0.88, roughness: 0.22, envMapIntensity: 1.4 }; // Colossus
const PAINT_CRIMSON    = { color: "#aa0022", metalness: 0.58, roughness: 0.40, envMapIntensity: 1.3 }; // Bulwark
const PAINT_TEAL       = { color: "#008888", metalness: 0.62, roughness: 0.36, envMapIntensity: 1.4 }; // Shadow/stealth
// Weapon colors
const PAINT_WEAPON_RED = { color: "#dd1100", metalness: 0.60, roughness: 0.38, envMapIntensity: 1.4 }; // Offensive weapons
const PAINT_WEAPON_ORG = { color: "#cc4400", metalness: 0.58, roughness: 0.40, envMapIntensity: 1.3 }; // Hammer/drum
const PAINT_WEAPON_YLW = { color: "#cc8800", metalness: 0.62, roughness: 0.36, envMapIntensity: 1.4 }; // Industrial/saw
// Defense colors
const PAINT_DEF_BLUE   = { color: "#0055cc", metalness: 0.60, roughness: 0.38, envMapIntensity: 1.4 }; // Shield armor
const PAINT_DEF_CYAN   = { color: "#006699", metalness: 0.62, roughness: 0.36, envMapIntensity: 1.4 }; // Energy defense

// Helpers for detail geometry
const boltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 6);
const Bolt = ({ position, rotation, mat = STEEL_MID }: { position: [number,number,number], rotation?: [number,number,number], mat?: any }) => (
  <mesh position={position} rotation={rotation || [0,0,0]} geometry={boltGeo} castShadow>
    <meshStandardMaterial {...mat} />
  </mesh>
);

// ==========================================
// --- 1. CHASSIS (12)
// ==========================================

export function TitanChassis({ intensity = 1 }: { intensity?: number }) {
  return (
    <group position={[0, 0.35, 0]}>
      {/* Main hull - thick forged iron base */}
      <mesh castShadow receiveShadow><boxGeometry args={[2.5, 0.7, 2.0]} /><meshStandardMaterial {...WORN_IRON} /></mesh>
      {/* Raised center command plate */}
      <mesh position={[0, 0.38, 0]} castShadow><boxGeometry args={[1.6, 0.06, 1.4]} /><meshStandardMaterial color="#8a1200" metalness={0.72} roughness={0.35} envMapIntensity={1.4} /></mesh>
      {/* Side armor skirts - angled outward */}
      {([-1.3, 1.3] as const).map(x => (
        <group key={`skirt-${x}`}>
          <mesh position={[x, 0.1, 0]} rotation={[0, 0, x > 0 ? 0.18 : -0.18]} castShadow receiveShadow>
            <boxGeometry args={[0.2, 0.5, 2.1]} /><meshStandardMaterial color="#aa1400" metalness={0.60} roughness={0.42} envMapIntensity={1.3} />
          </mesh>
          {/* Chrome edge banding */}
          <mesh position={[x + (x>0?0.12:-0.12), 0.32, 0]}><boxGeometry args={[0.03, 0.04, 2.1]} /><meshStandardMaterial {...CHROME} /></mesh>
        </group>
      ))}
      {/* Front ram plate */}
      <mesh position={[0, 0.15, 1.06]} castShadow><boxGeometry args={[2.5, 0.4, 0.12]} /><meshStandardMaterial color="#dd2200" metalness={0.68} roughness={0.32} envMapIntensity={1.4} /></mesh>
      {/* Rear engine housing */}
      <mesh position={[0, 0.25, -0.9]} castShadow><boxGeometry args={[1.8, 0.5, 0.3]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Exhaust cylinders */}
      {([-0.6, 0, 0.6] as const).map(x => (
        <mesh key={`exh-${x}`} position={[x, 0.55, -0.95]} rotation={[Math.PI/2,0,0]} castShadow>
          <cylinderGeometry args={[0.07, 0.1, 0.4, 10]} /><meshStandardMaterial color="#cc1a00" metalness={0.72} roughness={0.38} envMapIntensity={1.3} />
        </mesh>
      ))}
      {/* Panel groove lines */}
      {[-0.9, -0.3, 0.3, 0.9].map(x => (
        <mesh key={`groove-${x}`} position={[x, 0.36, 0]}><boxGeometry args={[0.03, 0.02, 2.0]} /><meshStandardMaterial color="#111" roughness={1} metalness={0} /></mesh>
      ))}
      {/* Hex bolt clusters */}
      {[-1.1, 1.1].map(x => [-0.7, 0, 0.7].map(z => (
        <mesh key={`bolt-${x}-${z}`} position={[x, 0.36, z]} rotation={[Math.PI/2,0,Math.PI/6]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 0.07, 6]} /><meshStandardMaterial color="#666" metalness={0.95} roughness={0.1} envMapIntensity={1.4} />
        </mesh>
      )))}
      {/* Chrome corner trim */}
      {[-1.26, 1.26].map(x => [-0.98, 0.98].map(z => (
        <mesh key={`corner-${x}-${z}`} position={[x, 0.2, z]} castShadow>
          <boxGeometry args={[0.06, 0.6, 0.06]} /><meshStandardMaterial {...CHROME} />
        </mesh>
      )))}
    </group>
  );
}

export function WaspChassis({ intensity = 1 }: { intensity?: number }) {
  return (
    <group position={[0, 0.18, 0]}>
      {/* Ultra-low carbon fiber main plate */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.22, 2.9]} /><meshStandardMaterial color="#1a1418" metalness={0.25} roughness={0.80} envMapIntensity={1.0} />
      </mesh>
      {/* Tapered nose cone */}
      <mesh position={[0, 0.04, 1.35]} rotation={[0.25, 0, 0]} castShadow>
        <boxGeometry args={[1.4, 0.18, 0.8]} /><meshStandardMaterial color="#c89000" metalness={0.60} roughness={0.40} envMapIntensity={1.3} />
      </mesh>
      {/* Speed stripe channels - glowing yellow */}
      {([-0.5, 0.5] as const).map(x => (
        <group key={`stripe-${x}`}>
          <mesh position={[x, 0.12, 0]}><boxGeometry args={[0.06, 0.01, 2.9]} /><meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={intensity * 1.5} toneMapped={false} /></mesh>
          <mesh position={[x, 0.12, 0]}><boxGeometry args={[0.12, 0.005, 2.9]} /><meshStandardMaterial color="#aa8800" metalness={0.6} roughness={0.4} /></mesh>
        </group>
      ))}
      {/* Vent grilles on sides */}
      {([-0.9, 0.9] as const).map(x => [-0.6, 0, 0.6].map(z => (
        <mesh key={`vent-${x}-${z}`} position={[x, 0.06, z]}>
          <boxGeometry args={[0.02, 0.16, 0.14]} /><meshStandardMaterial color="#050505" roughness={1} metalness={0} />
        </mesh>
      )))}
      {/* Lightweight titanium cross-brace */}
      <mesh position={[0, 0.12, 0]} castShadow><boxGeometry args={[1.82, 0.04, 0.08]} /><meshStandardMaterial {...TITANIUM} /></mesh>
      <mesh position={[0, 0.12, 0]} castShadow><boxGeometry args={[0.08, 0.04, 2.92]} /><meshStandardMaterial {...TITANIUM} /></mesh>
      {/* Front diffuser fins */}
      {[-0.6, -0.2, 0.2, 0.6].map(x => (
        <mesh key={`fin-${x}`} position={[x, 0.05, 1.42]} rotation={[-0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.15, 0.08, 0.25]} /><meshStandardMaterial color="#d4a000" metalness={0.58} roughness={0.42} />
        </mesh>
      ))}
    </group>
  );
}

export function GoliathChassis() {
  return (
    <group position={[0, 0.5, 0]}>
      {/* Massive layered hull */}
      <mesh castShadow receiveShadow><boxGeometry args={[2.4, 1.1, 2.3]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      {/* Outer armor shell layer — orange power panels */}
      <mesh castShadow><boxGeometry args={[2.5, 1.0, 2.4]} /><meshStandardMaterial color="#c04400" metalness={0.60} roughness={0.38} envMapIntensity={1.3} /></mesh>
      {/* Raised shoulder armor blocks */}
      {([-1.18, 1.18] as const).map(x => (
        <group key={`shoulder-${x}`}>
          <mesh position={[x, 0.58, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 0.25, 2.0]} /><meshStandardMaterial color="#dd5500" metalness={0.65} roughness={0.30} envMapIntensity={1.4} />
          </mesh>
          {/* Piston assemblies on sides */}
          {([-0.6, 0, 0.6] as const).map(z => (
            <group key={`piston-${x}-${z}`} position={[x + (x>0?0.14:-0.14), 0.42, z]}>
              <mesh rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[0.09, 0.09, 0.32, 12]} /><meshStandardMaterial {...CHROME} /></mesh>
              <mesh rotation={[0,0,Math.PI/2]} position={[x>0?0.2:-0.2, 0, 0]} castShadow><cylinderGeometry args={[0.12, 0.12, 0.1, 12]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
            </group>
          ))}
        </group>
      ))}
      {/* Top command deck with recessed panel */}
      <mesh position={[0, 0.56, 0]} castShadow><boxGeometry args={[1.8, 0.08, 1.8]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      <mesh position={[0, 0.61, 0]} castShadow><boxGeometry args={[1.2, 0.05, 1.2]} /><meshStandardMaterial color="#1a1a1a" metalness={0.95} roughness={0.12} envMapIntensity={1.5} /></mesh>
      {/* Bolt grid on top deck */}
      {[-0.5, 0, 0.5].map(x => [-0.5, 0, 0.5].map(z => (
        <mesh key={`bolt-${x}-${z}`} position={[x, 0.64, z]} rotation={[0,0,Math.PI/6]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 0.07, 6]} /><meshStandardMaterial {...CHROME} />
        </mesh>
      )))}
      {/* Front grill */}
      <mesh position={[0, 0.2, 1.21]} castShadow><boxGeometry args={[2.0, 0.6, 0.08]} /><meshStandardMaterial color="#111" metalness={0.8} roughness={0.5} /></mesh>
      {[-0.7, -0.3, 0.1, 0.5].map(x => (
        <mesh key={`grill-${x}`} position={[x+0.1, 0.2, 1.26]}><boxGeometry args={[0.12, 0.5, 0.04]} /><meshStandardMaterial color="#050505" roughness={1} /></mesh>
      ))}
    </group>
  );
}

export function PhantomChassis({ intensity = 1 }: { intensity?: number }) {
  return (
    <group position={[0, 0.38, 0]}>
      {/* Asymmetric stealth hull - offset spine */}
      <mesh castShadow receiveShadow position={[0.15, 0, 0]}><boxGeometry args={[1.8, 0.5, 2.7]} /><meshStandardMaterial color="#0a3aaa" metalness={0.62} roughness={0.32} envMapIntensity={1.4} /></mesh>
      {/* Heavy left sponson */}
      <mesh castShadow receiveShadow position={[-0.9, 0.14, 0]}><boxGeometry args={[0.55, 0.78, 2.9]} /><meshStandardMaterial color="#082888" metalness={0.68} roughness={0.28} envMapIntensity={1.4} /></mesh>
      {/* Spine ridge */}
      <mesh position={[0.15, 0.27, 0]} castShadow><boxGeometry args={[0.12, 0.06, 2.7]} /><meshStandardMaterial color="#0044ff" emissive="#0044ff" emissiveIntensity={1.8 * intensity} toneMapped={false} /></mesh>
      {/* Slanted side plates */}
      {([0.75, 1.08] as const).map(x => (
        <mesh key={`plate-${x}`} position={[x, 0.0, 0]} rotation={[0, 0, 0.28]} castShadow>
          <boxGeometry args={[0.2, 0.6, 2.6]} /><meshStandardMaterial color="#0a3aaa" metalness={0.62} roughness={0.36} envMapIntensity={1.3} />
        </mesh>
      ))}
      {/* Stealth vents - angled slits */}
      {[-0.9, -0.3, 0.3, 0.9].map(z => (
        <mesh key={`vent-${z}`} position={[-0.9, 0.55, z]} rotation={[0.15, 0, 0]}><boxGeometry args={[0.5, 0.03, 0.18]} /><meshStandardMaterial color="#000" roughness={1} /></mesh>
      ))}
      {/* Right edge chrome strip */}
      <mesh position={[1.12, 0.1, 0]}><boxGeometry args={[0.025, 0.55, 2.65]} /><meshStandardMaterial {...CHROME} /></mesh>
    </group>
  );
}

export function FortressChassis() {
  return (
    <group position={[0, 0.7, 0]}>
      {/* Triple-layered iron core */}
      <mesh castShadow receiveShadow><boxGeometry args={[2.1, 1.4, 2.1]} /><meshStandardMaterial color="#22304a" metalness={0.88} roughness={0.22} envMapIntensity={1.4} /></mesh>
      <mesh castShadow><boxGeometry args={[2.2, 1.2, 2.2]} /><meshStandardMaterial color="#3a4a6a" metalness={0.72} roughness={0.35} envMapIntensity={1.3} /></mesh>
      {/* Buttress columns at corners */}
      {([-1.0, 1.0] as const).map(x => ([-1.0, 1.0] as const).map(z => (
        <group key={`col-${x}-${z}`}>
          <mesh position={[x, 0.1, z]} castShadow><cylinderGeometry args={[0.18, 0.22, 1.6, 8]} /><meshStandardMaterial color="#1a1a1a" metalness={0.92} roughness={0.25} /></mesh>
          <mesh position={[x, 0.82, z]} castShadow><cylinderGeometry args={[0.22, 0.18, 0.12, 8]} /><meshStandardMaterial {...CHROME} /></mesh>
        </group>
      )))}
      {/* Siege plate on front */}
      <mesh position={[0, 0.15, 1.12]} castShadow><boxGeometry args={[2.2, 1.1, 0.16]} /><meshStandardMaterial color="#0f0f0f" metalness={0.95} roughness={0.15} envMapIntensity={1.5} /></mesh>
      <mesh position={[0, 0.15, 1.21]}><boxGeometry args={[2.2, 0.04, 0.04]} /><meshStandardMaterial color="#cc0000" emissive="#cc0000" emissiveIntensity={1.5} toneMapped={false} /></mesh>
      {/* Bolt rows on siege plate */}
      {[-0.8, -0.4, 0, 0.4, 0.8].map(x => [-0.3, 0.3].map(y => (
        <mesh key={`sbolt-${x}-${y}`} position={[x, y + 0.15, 1.2]} rotation={[Math.PI/2, 0, Math.PI/6]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.08, 6]} /><meshStandardMaterial {...STEEL_MID} />
        </mesh>
      )))}
    </group>
  );
}

export function ViperChassis({ intensity = 1 }: { intensity?: number }) {
  return (
    <group position={[0, 0.28, 0]}>
      {/* Narrow high-speed spine */}
      <mesh castShadow receiveShadow rotation={[0, 0, 0]}><boxGeometry args={[0.75, 0.55, 2.5]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Swept side pontoons */}
      {([-0.7, 0.7] as const).map(x => (
        <mesh key={`pontoon-${x}`} position={[x, -0.04, -0.1]} rotation={[0.04, 0, x > 0 ? -0.1 : 0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.38, 2.2]} /><meshStandardMaterial color="#082e12" metalness={0.72} roughness={0.42} envMapIntensity={1.3} />
        </mesh>
      ))}
      {/* Venom-green spine glow */}
      <mesh position={[0, 0.29, 0]}><boxGeometry args={[0.08, 0.02, 2.5]} /><meshStandardMaterial color="#00ff44" emissive="#00ff44" emissiveIntensity={2.0 * intensity} toneMapped={false} /></mesh>
      {/* Side vent slots */}
      {[-0.9, -0.45, 0, 0.45, 0.9].map(z => (
        <group key={`vent-${z}`}>
          <mesh position={[0.53, 0.06, z]}><boxGeometry args={[0.04, 0.3, 0.12]} /><meshStandardMaterial color="#000" roughness={1} /></mesh>
          <mesh position={[-0.53, 0.06, z]}><boxGeometry args={[0.04, 0.3, 0.12]} /><meshStandardMaterial color="#000" roughness={1} /></mesh>
        </group>
      ))}
      {/* Tapered nose wedge */}
      <mesh position={[0, 0.08, 1.3]} rotation={[-0.3, 0, 0]} castShadow><boxGeometry args={[0.6, 0.3, 0.7]} /><meshStandardMaterial color="#0d8040" metalness={0.60} roughness={0.32} /></mesh>
      {/* Chrome edge strips */}
      {([-0.98, 0.98] as const).map(x => (
        <mesh key={`strip-${x}`} position={[x * 0.38, 0.12, 0]}><boxGeometry args={[0.025, 0.5, 2.4]} /><meshStandardMaterial {...CHROME} /></mesh>
      ))}
    </group>
  );
}

export function ColossusChassis() {
  return (
    <group position={[0, 0.55, 0]}>
      {/* Massive wide forged iron body */}
      <mesh castShadow receiveShadow><boxGeometry args={[3.1, 1.1, 1.6]} /><meshStandardMaterial color="#1e2840" metalness={0.75} roughness={0.35} envMapIntensity={1.3} /></mesh>
      {/* Layered side skirt armor */}
      {([-1.55, 1.55] as const).map(x => (
        <group key={`skirt-${x}`}>
          <mesh position={[x, -0.18, 0]} castShadow receiveShadow><boxGeometry args={[0.22, 0.65, 1.85]} /><meshStandardMaterial color="#2e2820" metalness={0.7} roughness={0.6} /></mesh>
          {/* Hydraulic piston stacks */}
          {([-0.5, 0, 0.5] as const).map(z => (
            <group key={`hyd-${x}-${z}`} position={[x + (x>0?0.12:-0.12), 0.32, z]}>
              <mesh rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[0.1, 0.1, 0.4, 12]} /><meshStandardMaterial {...CHROME} /></mesh>
              <mesh rotation={[0,0,Math.PI/2]} position={[x>0?0.24:-0.24, 0, 0]} castShadow><cylinderGeometry args={[0.14, 0.14, 0.12, 12]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
            </group>
          ))}
        </group>
      ))}
      {/* Front siege plate */}
      <mesh position={[0, 0.08, 0.82]} castShadow><boxGeometry args={[3.1, 0.95, 0.18]} /><meshStandardMaterial color="#2a3a5a" metalness={0.80} roughness={0.28} envMapIntensity={1.4} /></mesh>
      {/* Top reinforcement ribs */}
      {[-1.0, -0.4, 0.2, 0.8].map(x => (
        <mesh key={`rib-${x}`} position={[x, 0.58, 0]} castShadow><boxGeometry args={[0.12, 0.08, 1.6]} /><meshStandardMaterial color="#333" metalness={0.88} roughness={0.25} /></mesh>
      ))}
      {/* Panel line grooves */}
      {[-0.7, 0, 0.7].map(z => (
        <mesh key={`groove-${z}`} position={[0, 0.56, z]}><boxGeometry args={[3.1, 0.02, 0.03]} /><meshStandardMaterial color="#0a0a0a" roughness={1} /></mesh>
      ))}
    </group>
  );
}

export function WraithChassis({ intensity = 1 }: { intensity?: number }) {
  return (
    <group position={[0, 0.45, 0]}>
      {/* Central narrow spine tube */}
      <mesh castShadow receiveShadow rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.22, 0.22, 2.7, 12]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Three swept cross-struts */}
      {([-1.0, 0, 1.0] as const).map(z => (
        <group key={`strut-${z}`} position={[0, 0, z]}>
          <mesh castShadow><boxGeometry args={[2.1, 0.12, 0.12]} /><meshStandardMaterial {...STEEL_LIGHT} /></mesh>
          {/* End caps on each strut */}
          {([-1.02, 1.02] as const).map(x => (
            <mesh key={`cap-${x}`} position={[x, 0, 0]} castShadow><cylinderGeometry args={[0.1, 0.08, 0.15, 8]} /><meshStandardMaterial {...TITANIUM} /></mesh>
          ))}
        </group>
      ))}
      {/* Energy-field body glow panel */}
      <mesh position={[0, -0.05, 0]}>​<boxGeometry args={[2.0, 0.18, 2.6]} /><meshStandardMaterial color="#6600dd" emissive="#6600dd" emissiveIntensity={intensity * 1.0} transparent opacity={0.60} toneMapped={false} /></mesh>
      {/* Spine attachment cylinders */}
      {([-0.9, -0.3, 0.3, 0.9] as const).map(z => (
        <mesh key={`att-${z}`} position={[0, 0, z]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.28, 0.28, 0.1, 12]} /><meshStandardMaterial color="#333" metalness={0.9} roughness={0.15} /></mesh>
      ))}
    </group>
  );
}

export function BulwarkChassis() {
  return (
    <group position={[0, 0.48, 0]}>
      {/* Massive titanium block hull */}
      <mesh castShadow receiveShadow position={[0, 0, 0.2]}><boxGeometry args={[2.5, 0.95, 1.4]} /><meshStandardMaterial color="#8a1020" metalness={0.65} roughness={0.38} envMapIntensity={1.3} /></mesh>
      {/* Angled front shield - semi-cylinder */}
      <mesh position={[0, 0.05, 1.05]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[0.52, 0.52, 2.5, 24, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#888" metalness={0.75} roughness={0.38} envMapIntensity={1.4} /></mesh>
      {/* Front shield chrome edge ring */}
      <mesh position={[0, 0.05, 1.05]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[0.52, 0.025, 12, 48, Math.PI]} /><meshStandardMaterial {...CHROME} /></mesh>
      {/* Reinforcement bolts on shield */}
      {[-0.9, -0.45, 0, 0.45, 0.9].map(x => (
        <mesh key={`b-${x}`} position={[x, 0.52, 1.07]} rotation={[Math.PI/2,0,Math.PI/6]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.07, 6]} /><meshStandardMaterial {...STEEL_MID} />
        </mesh>
      ))}
      {/* Side armor flanges */}
      {([-1.27, 1.27] as const).map(x => (
        <mesh key={`flange-${x}`} position={[x, 0.0, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.85, 1.55]} /><meshStandardMaterial color="#aa0022" metalness={0.65} roughness={0.38} />
        </mesh>
      ))}
    </group>
  );
}

export function LynxChassis() {
  return (
    <group position={[0, 0.38, 0]}>
      {/* Low-profile aerodynamic hull */}
      <mesh castShadow receiveShadow rotation={[0.08, 0, 0]}><boxGeometry args={[1.85, 0.52, 2.3]} /><meshStandardMaterial color="#006688" metalness={0.68} roughness={0.35} envMapIntensity={1.4} /></mesh>
      {/* Chamfered front leading edge */}
      <mesh position={[0, 0.12, 1.1]} rotation={[-0.45, 0, 0]} castShadow><boxGeometry args={[1.8, 0.35, 0.6]} /><meshStandardMaterial color="#0099bb" metalness={0.68} roughness={0.32} /></mesh>
      {/* Central dorsal spine */}
      <mesh position={[0, 0.3, -0.1]} castShadow><boxGeometry args={[0.18, 0.12, 2.1]} /><meshStandardMaterial color="#111" metalness={0.95} roughness={0.1} /></mesh>
      {/* Sensor eye sphere */}
      <mesh position={[0, 0.32, 1.12]} castShadow><sphereGeometry args={[0.14, 16, 16]} /><meshStandardMaterial color="#111" metalness={0.95} roughness={0.08} /></mesh>
      <mesh position={[0, 0.32, 1.12]}><sphereGeometry args={[0.1, 12, 12]} /><meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={2.0} toneMapped={false} /></mesh>
      {/* Suspension spring brackets */}
      {([-0.85, 0.85] as const).map(x => (
        <group key={`bracket-${x}`}>
          <mesh position={[x, -0.05, -0.6]} castShadow><cylinderGeometry args={[0.08, 0.08, 0.5, 10]} /><meshStandardMaterial {...CHROME} /></mesh>
          <mesh position={[x, -0.05, 0.6]} castShadow><cylinderGeometry args={[0.08, 0.08, 0.5, 10]} /><meshStandardMaterial {...CHROME} /></mesh>
        </group>
      ))}
      {/* Panel groove lines */}
      {[-0.6, 0, 0.6].map(x => <mesh key={`g-${x}`} position={[x, 0.28, 0]}><boxGeometry args={[0.02, 0.01, 2.3]} /><meshStandardMaterial color="#111" roughness={1} /></mesh>)}
    </group>
  );
}

export function RhinoChassis() {
  return (
    <group position={[0, 0.48, 0]}>
      {/* Heavy square brawler body */}
      <mesh castShadow receiveShadow position={[0, -0.04, -0.1]}><boxGeometry args={[1.8, 0.88, 2.0]} /><meshStandardMaterial {...WORN_IRON} /></mesh>
      {/* Curved front ram cowl */}
      <mesh position={[0, 0.08, 0.98]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.85, 0.85, 1.75, 28, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#aa2200" metalness={0.65} roughness={0.45} /></mesh>
      {/* Ram horn spike */}
      <mesh position={[0, 0.65, 1.22]} rotation={[-Math.PI/5,0,0]} castShadow><cylinderGeometry args={[0.04, 0.22, 0.9, 14]} /><meshStandardMaterial {...TUNGSTEN} /></mesh>
      {/* Outer chrome rim on cowl */}
      <mesh position={[0, 0.08, 0.98]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.85, 0.028, 12, 48, Math.PI]} /><meshStandardMaterial {...CHROME} /></mesh>
      {/* Side armor plates with rivets */}
      {([-0.92, 0.92] as const).map(x => (
        <group key={`armor-${x}`}>
          <mesh position={[x, 0, -0.1]} castShadow receiveShadow><boxGeometry args={[0.18, 0.85, 2.1]} /><meshStandardMaterial color="#2c2418" metalness={0.72} roughness={0.58} /></mesh>
          {[-0.7, 0, 0.7].map(z => (
            <mesh key={`rivet-${x}-${z}`} position={[x + (x>0?0.1:-0.1), 0.1, z]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[0.04, 0.04, 0.06, 6]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function ShadowChassis({ intensity = 1 }: { intensity?: number }) {
  return (
    <group position={[0, 0.12, 0]}>
      {/* Flat ultra-low matte-black plate */}
      <mesh castShadow receiveShadow><boxGeometry args={[2.1, 0.2, 2.5]} /><meshStandardMaterial color="#0a1418" metalness={0.35} roughness={0.75} /></mesh>
      {/* Angled nose wedge */}
      <mesh position={[0, 0.02, 1.22]} rotation={[-0.45, 0, 0]} castShadow><boxGeometry args={[2.0, 0.18, 0.6]} /><meshStandardMaterial color="#0f0f0f" metalness={0.08} roughness={0.92} /></mesh>
      {/* Razor-thin side fins */}
      {([-1.04, 1.04] as const).map(x => (
        <mesh key={`fin-${x}`} position={[x, 0.06, 0]} rotation={[0, 0, x>0?-0.15:0.15]} castShadow>
          <boxGeometry args={[0.04, 0.22, 2.4]} /><meshStandardMaterial color="#008888" metalness={0.88} roughness={0.15} />
        </mesh>
      ))}
      {/* Red sensor cluster */}
      <mesh position={[0, 0.12, 1.22]}><sphereGeometry args={[0.07, 12, 12]} /><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2.5 * intensity} toneMapped={false} /></mesh>
      {([-0.25, 0.25] as const).map(x => (
        <mesh key={`sensor-${x}`} position={[x, 0.12, 1.2]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={1.5 * intensity} toneMapped={false} /></mesh>
      ))}
      {/* Hairline panel grooves */}
      {[-0.7, -0.2, 0.3, 0.8].map(x => <mesh key={`g-${x}`} position={[x, 0.11, 0]}><boxGeometry args={[0.015, 0.01, 2.5]} /><meshStandardMaterial color="#222" roughness={1} /></mesh>)}
    </group>
  );
}

// ==========================================
// --- 2. PRIMARY WEAPONS (12)
// ==========================================

export function TitanDisc() {
  const spinRef = useRef<THREE.Group>(null!);
  useFrame((_, delta) => { if (spinRef.current) spinRef.current.rotation.y += delta * 12; });
  return (
    <group position={[0, 0.85, 1.25]}>
      {/* Spinning disc assembly */}
      <group ref={spinRef}>
        {/* Outer flywheel ring */}
        <mesh castShadow><cylinderGeometry args={[1.05, 1.05, 0.25, 48]} /><meshStandardMaterial color="#aaaaaa" metalness={1.0} roughness={0.05} envMapIntensity={1.6} /></mesh>
        {/* Mid-ring groove */}
        <mesh><cylinderGeometry args={[0.88, 0.88, 0.28, 48]} /><meshStandardMaterial color="#555" metalness={0.92} roughness={0.18} /></mesh>
        {/* Sharpened outer edge - chrome bevel */}
        <mesh><torusGeometry args={[1.05, 0.03, 8, 48]} /><meshStandardMaterial {...CHROME} /></mesh>
        {/* Radial cutting teeth - 12 positions */}
        {Array.from({length:12}).map((_,i) => (
          <mesh key={i} position={[Math.cos(i*Math.PI/6)*0.98, 0, Math.sin(i*Math.PI/6)*0.98]} rotation={[0,-i*Math.PI/6,0]} castShadow>
            <boxGeometry args={[0.18, 0.28, 0.12]} /><meshStandardMaterial {...TUNGSTEN} />
          </mesh>
        ))}
        {/* Central hub */}
        <mesh castShadow><cylinderGeometry args={[0.28, 0.28, 0.32, 16]} /><meshStandardMaterial color="#222" metalness={0.95} roughness={0.1} /></mesh>
        {/* Hub bolts */}
        {[0,1,2,3,4,5].map(i => (
          <mesh key={`hbolt-${i}`} position={[Math.cos(i*Math.PI/3)*0.18, 0.17, Math.sin(i*Math.PI/3)*0.18]} rotation={[Math.PI/2,0,0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.06, 6]} /><meshStandardMaterial {...CHROME} />
          </mesh>
        ))}
      </group>
      {/* Static mounting bracket */}
      <mesh position={[0, -0.22, -0.6]} castShadow><boxGeometry args={[0.7, 0.32, 0.7]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {([-0.3, 0.3] as const).map(x => (
        <mesh key={`arm-${x}`} position={[x, -0.1, -0.3]} castShadow><boxGeometry args={[0.12, 0.2, 0.65]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      ))}
    </group>
  );
}

export function Hammerhead() {
  return (
    <group position={[0, 0.9, -0.3]}>
      {/* Hydraulic tower arm */}
      <mesh position={[0, 0.9, 0.2]} castShadow receiveShadow rotation={[0.08, 0, 0]}><cylinderGeometry args={[0.12, 0.14, 1.8, 10]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      {/* Piston pair */}
      {([-0.25, 0.25] as const).map(x => (
        <group key={`piston-${x}`}>
          <mesh position={[x, 1.0, 0.1]} castShadow><cylinderGeometry args={[0.07, 0.07, 1.6, 10]} /><meshStandardMaterial {...CHROME} /></mesh>
          {/* Piston collar rings */}
          {[0.5, 0.85].map(y => (
            <mesh key={`collar-${y}`} position={[x, y, 0.1]} castShadow><cylinderGeometry args={[0.1, 0.1, 0.06, 10]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
          ))}
        </group>
      ))}
      {/* Hammerhead block - wide and heavy */}
      <mesh position={[0, 1.82, 0.2]} castShadow receiveShadow><boxGeometry args={[0.9, 0.36, 0.7]} /><meshStandardMaterial color="#222" metalness={0.9} roughness={0.2} envMapIntensity={1.4} /></mesh>
      {/* Strike face - tungsten insert */}
      <mesh position={[0, 1.82, 0.56]} castShadow><boxGeometry args={[0.9, 0.38, 0.08]} /><meshStandardMaterial {...TUNGSTEN} /></mesh>
      {/* Mounting base block */}
      <mesh position={[0, 0, 0]} castShadow><cylinderGeometry args={[0.32, 0.28, 0.45, 12]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Base bolts */}
      {[0,1,2,3].map(i => (
        <mesh key={`bbolt-${i}`} position={[Math.cos(i*Math.PI/2)*0.22, 0.24, Math.sin(i*Math.PI/2)*0.22]} rotation={[Math.PI/2,0,0]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} /><meshStandardMaterial {...CHROME} />
        </mesh>
      ))}
    </group>
  );
}

export function VerticalSpinner() {
  const spinRef = useRef<THREE.Group>(null!);
  useFrame((_, delta) => { if (spinRef.current) spinRef.current.rotation.z += delta * 18; });
  return (
    <group position={[0, 0.85, 1.2]}>
      <group ref={spinRef}>
        {/* Thick vertical flywheel */}
        <mesh castShadow><cylinderGeometry args={[0.95, 0.95, 0.18, 40]} /><meshStandardMaterial color="#888" metalness={0.95} roughness={0.08} envMapIntensity={1.6} /></mesh>
        {/* Outer cutting ring */}
        <mesh><torusGeometry args={[0.95, 0.04, 10, 40]} /><meshStandardMaterial {...CHROME} /></mesh>
        {/* Inner ring groove */}
        <mesh><cylinderGeometry args={[0.78, 0.78, 0.2, 32]} /><meshStandardMaterial color="#444" metalness={0.9} roughness={0.22} /></mesh>
        {/* 6 wedge cutting inserts */}
        {Array.from({length:6}).map((_,i) => (
          <mesh key={i} position={[Math.cos(i*Math.PI/3)*0.88, Math.sin(i*Math.PI/3)*0.88, 0]} rotation={[0,0,i*Math.PI/3]} castShadow>
            <boxGeometry args={[0.2, 0.1, 0.22]} /><meshStandardMaterial {...TUNGSTEN} />
          </mesh>
        ))}
        {/* Hub cylinder */}
        <mesh castShadow><cylinderGeometry args={[0.2, 0.2, 0.25, 14]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      </group>
      {/* Bracket arm */}
      <mesh position={[0, -0.42, -0.4]} castShadow><boxGeometry args={[0.5, 0.62, 0.75]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Axle bearing visible */}
      <mesh position={[0, 0, -0.12]} castShadow><cylinderGeometry args={[0.22, 0.22, 0.08, 14]} /><meshStandardMaterial color="#333" metalness={0.9} roughness={0.12} /></mesh>
    </group>
  );
}

export function LifterFork() {
  return (
    <group position={[0, 0.2, 1.5]}>
      {([-0.6, 0.6] as const).map(x => (
        <group key={`fork-${x}`} position={[x, 0, 0]}>
          <mesh castShadow receiveShadow><boxGeometry args={[0.2, 0.1, 2.0]} /><meshStandardMaterial {...STEEL_LIGHT} /></mesh>
          <mesh position={[0, 0.051, 0]}><planeGeometry args={[0.2, 2.0]} rotation={[-Math.PI/2,0,0]} /><meshStandardMaterial {...CHROME} /></mesh>
          <mesh position={[0, -0.1, -0.5]} castShadow><cylinderGeometry args={[0.05, 0.05, 1.0, 16]} rotation={[Math.PI/2,0,0]} /><meshStandardMaterial {...CHROME} /></mesh>
          <mesh position={[0, 0.1, 0.95]} rotation={[0.2, 0, 0]} castShadow><boxGeometry args={[0.2, 0.1, 0.4]} /><meshStandardMaterial {...STEEL_LIGHT} /></mesh>
        </group>
      ))}
      <mesh position={[0, -0.1, -0.8]} castShadow><boxGeometry args={[1.6, 0.3, 0.6]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
    </group>
  );
}

export function FlailChain() {
  return (
    <group position={[0, 0.85, 0.9]}>
      {/* Mount housing */}
      <mesh castShadow receiveShadow><cylinderGeometry args={[0.32, 0.28, 0.55, 12]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      <mesh position={[0,0.3,0]} castShadow><cylinderGeometry args={[0.12, 0.12, 0.14, 10]} /><meshStandardMaterial {...CHROME} /></mesh>
      {/* Chain links - alternating torus rings */}
      {Array.from({length:8}).map((_,i) => (
        <mesh key={`link-${i}`} position={[0, 0, 0.55 + i * 0.22]}
          rotation={[i%2===0?Math.PI/2:0, 0, 0]} castShadow>
          <torusGeometry args={[0.1, 0.035, 8, 16]} />
          <meshStandardMaterial color="#888" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
      {/* Spiked flail ball */}
      <mesh position={[0, 0, 2.35]} castShadow><sphereGeometry args={[0.32, 16, 16]} /><meshStandardMaterial color="#555" metalness={0.72} roughness={0.45} /></mesh>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
        <mesh key={`spike-${i}`} position={[0, 0, 2.35]}
          rotation={[i<6?i*Math.PI/3:0, i>=6?(i-6)*Math.PI/3:0, 0]} castShadow>
          <cylinderGeometry args={[0, 0.045, 0.65, 4]} /><meshStandardMaterial {...CHROME} />
        </mesh>
      ))}
    </group>
  );
}

export function CrusherClaw() {
  return (
    <group position={[0, 0.62, 1.15]}>
      {/* Central hydraulic arm */}
      <mesh position={[0, 0, -0.4]} castShadow><cylinderGeometry args={[0.18, 0.22, 0.9, 12]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      <mesh position={[0, 0, -0.42]} castShadow><cylinderGeometry args={[0.12, 0.12, 0.85, 10]} /><meshStandardMaterial {...CHROME} /></mesh>
      {/* Pivot joint */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.28, 0.28, 1.0, 14]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Claw arms */}
      {([-0.42, 0.42] as const).map(x => (
        <group key={`claw-${x}`} position={[x, 0, 0]}>
          {/* Main claw arm - tapered */}
          <mesh position={[0, 0, 0.9]} castShadow><boxGeometry args={[0.16, 0.35, 1.85]} /><meshStandardMaterial {...WORN_IRON} /></mesh>
          {/* Inner serrated edge - chrome */}
          <mesh position={[x>0?-0.09:0.09, -0.08, 1.1]} castShadow><boxGeometry args={[0.04, 0.2, 1.4]} /><meshStandardMaterial {...CHROME} /></mesh>
          {/* Tip - sharpened */}
          <mesh position={[0, -0.2, 1.85]} rotation={[x>0?-0.5:0.5,0,0]} castShadow><cylinderGeometry args={[0.0, 0.12, 0.35, 6]} /><meshStandardMaterial {...TUNGSTEN} /></mesh>
          {/* Hydraulic actuator */}
          <mesh position={[x>0?-0.12:0.12, 0.06, 0.3]} rotation={[0.25,0,0]} castShadow><cylinderGeometry args={[0.06, 0.06, 0.65, 8]} /><meshStandardMaterial {...CHROME} /></mesh>
        </group>
      ))}
    </group>
  );
}

export function HorizontalSpinner() {
  const spinRef = useRef<THREE.Group>(null!);
  useFrame((_, delta) => { if (spinRef.current) spinRef.current.rotation.y += delta * 20; });
  return (
    <group position={[0, 0.82, 1.0]}>
      {/* Spinning bar assembly */}
      <group ref={spinRef}>
        {/* Horizontal bar - hardened steel */}
        <mesh castShadow><boxGeometry args={[3.1, 0.22, 0.28]} /><meshStandardMaterial color="#909090" metalness={0.95} roughness={0.08} envMapIntensity={1.5} /></mesh>
        {/* Tip impact inserts - tungsten */}
        {([-1.55, 1.55] as const).map(x => (
          <group key={`tip-${x}`} position={[x, 0, 0]}>
            <mesh castShadow><boxGeometry args={[0.12, 0.25, 0.32]} /><meshStandardMaterial {...TUNGSTEN} /></mesh>
            {/* Chrome leading bevel */}
            <mesh position={[x>0?0.06:-0.06, 0, 0]}><boxGeometry args={[0.04, 0.24, 0.3]} /><meshStandardMaterial {...CHROME} /></mesh>
          </group>
        ))}
        {/* Panel lines on bar */}
        {[-0.5, 0.5].map(x => <mesh key={`pl-${x}`} position={[x, 0.12, 0]}><boxGeometry args={[0.02, 0.01, 0.28]} /><meshStandardMaterial color="#111" roughness={1} /></mesh>)}
      </group>
      {/* Static center hub & mount */}
      <mesh castShadow><cylinderGeometry args={[0.42, 0.42, 0.42, 18]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      <mesh castShadow><cylinderGeometry args={[0.22, 0.22, 0.48, 14]} /><meshStandardMaterial color="#222" metalness={0.95} roughness={0.1} /></mesh>
      {/* Bearing rings */}
      {[-0.18, 0.18].map(y => <mesh key={`bearing-${y}`} position={[0,y,0]}><torusGeometry args={[0.42, 0.025, 8, 32]} /><meshStandardMaterial {...CHROME} /></mesh>)}
      {/* Mounting strut */}
      <mesh position={[0, -0.38, -0.3]} castShadow><cylinderGeometry args={[0.14, 0.14, 0.5, 10]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
    </group>
  );
}

export function SpikeRamrod() {
  return (
    <group position={[0, 0.6, 1.5]}>
      <mesh castShadow receiveShadow rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.15, 0.15, 1.5, 8]} /><meshStandardMaterial {...TUNGSTEN} /></mesh>
      <mesh position={[0, 0, 0.85]} rotation={[Math.PI/2, 0, 0]} castShadow><cylinderGeometry args={[0, 0.15, 0.3, 4]} /><meshStandardMaterial {...TUNGSTEN} /></mesh>
      <mesh position={[0, 0, -0.75]} rotation={[Math.PI/2, 0, 0]} castShadow><cylinderGeometry args={[0.4, 0.4, 0.1, 16]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {[0,1,2,3,4,5,6,7].map(i => <Bolt key={`bolt-${i}`} position={[Math.cos(i*Math.PI/4)*0.3, 0, -0.7]} rotation={[Math.PI/2,0,0]} />)}
    </group>
  );
}

export function PneumaticLance() {
  return (
    <group position={[0, 0.6, 1.2]}>
      <mesh castShadow receiveShadow rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 1.8, 6]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      <mesh position={[0, 0, 1.0]} rotation={[Math.PI/2, 0, 0]} castShadow><cylinderGeometry args={[0.1, 0.1, 1.0, 16]} /><meshStandardMaterial {...CHROME} /></mesh>
      <mesh position={[0.3, 0, -0.4]} rotation={[Math.PI/2, 0, 0]} castShadow><cylinderGeometry args={[0.15, 0.15, 1.0, 16]} /><meshStandardMaterial {...STEEL_LIGHT} /></mesh>
      <mesh position={[0.3, 0.2, -0.4]} castShadow><cylinderGeometry args={[0.08, 0.08, 0.05, 16]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0, 0, 1.5]} rotation={[Math.PI/2, 0, 0]} castShadow><cylinderGeometry args={[0, 0.1, 0.2, 8]} /><meshStandardMaterial {...CHROME} /></mesh>
    </group>
  );
}

export function DrumSpinner() {
  const spinRef = useRef<THREE.Group>(null!);
  useFrame((_, delta) => { if (spinRef.current) spinRef.current.rotation.x += delta * 22; });
  return (
    <group position={[0, 0.62, 1.15]}>
      {/* Spinning drum */}
      <group ref={spinRef}>
        {/* Main drum cylinder - heavy */}
        <mesh castShadow><cylinderGeometry args={[0.62, 0.62, 1.9, 32]} /><meshStandardMaterial color="#666" metalness={0.88} roughness={0.2} /></mesh>
        {/* 8 blunt impact bars around circumference */}
        {Array.from({length:8}).map((_,i) => (
          <mesh key={i} position={[Math.cos(i*Math.PI/4)*0.62, 0, Math.sin(i*Math.PI/4)*0.62]} rotation={[0,i*Math.PI/4,0]} castShadow>
            <boxGeometry args={[0.15, 1.9, 0.18]} /><meshStandardMaterial color="#333" metalness={0.92} roughness={0.14} />
          </mesh>
        ))}
        {/* Circular end caps with hub */}
        {([-0.97, 0.97] as const).map(y => (
          <group key={`cap-${y}`} position={[0,y,0]}>
            <mesh castShadow><cylinderGeometry args={[0.64, 0.64, 0.08, 32]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
            <mesh castShadow><cylinderGeometry args={[0.22, 0.22, 0.12, 16]} /><meshStandardMaterial {...CHROME} /></mesh>
            {/* Cap bolts */}
            {[0,1,2,3,4].map(b => (
              <mesh key={`capbolt-${b}`} position={[Math.cos(b*Math.PI*2/5)*0.48, y>0?0.06:-0.06, Math.sin(b*Math.PI*2/5)*0.48]} rotation={[Math.PI/2,0,0]} castShadow>
                <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} /><meshStandardMaterial {...STEEL_MID} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      {/* Drum frame brackets - U-shaped mounting */}
      {([-0.85, 0.85] as const).map(x => (
        <mesh key={`bracket-${x}`} position={[x, -0.28, -0.5]} castShadow><boxGeometry args={[0.18, 0.55, 0.75]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      ))}
      <mesh position={[0, -0.55, -0.5]} castShadow><boxGeometry args={[1.85, 0.16, 0.75]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
    </group>
  );
}

export function WedgeSlicer() {
  return (
    <group position={[0, 0.18, 1.4]}>
      {/* Primary wedge plate - polished chrome */}
      <mesh castShadow receiveShadow rotation={[-0.22, 0, 0]}><boxGeometry args={[2.5, 0.09, 1.7]} /><meshStandardMaterial color="#b0b0b0" metalness={1.0} roughness={0.0} envMapIntensity={1.8} /></mesh>
      {/* Underlayer dark steel */}
      <mesh position={[0, -0.08, 0]} rotation={[-0.12, 0, 0]} castShadow><boxGeometry args={[2.4, 0.08, 1.5]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Leading edge chrome blade */}
      <mesh position={[0, -0.04, 0.84]} rotation={[-0.2, 0, 0]}><boxGeometry args={[2.5, 0.04, 0.06]} /><meshStandardMaterial {...CHROME} /></mesh>
      {/* Serrated notches on blade edge */}
      {Array.from({length:10}).map((_,i) => (
        <mesh key={i} position={[-1.1 + i*0.24, -0.04, 0.86]} rotation={[-0.2,0,0]} castShadow>
          <boxGeometry args={[0.08, 0.06, 0.08]} /><meshStandardMaterial color="#333" metalness={0.95} roughness={0.08} />
        </mesh>
      ))}
      {/* Side reinforcement ribs */}
      {([-1.22, 1.22] as const).map(x => (
        <mesh key={`rib-${x}`} position={[x, -0.02, 0.2]} rotation={[-0.18,0,0]} castShadow><boxGeometry args={[0.07, 0.14, 1.6]} /><meshStandardMaterial color="#555" metalness={0.88} roughness={0.22} /></mesh>
      ))}
      {/* Rear mounting brackets */}
      {([-0.7, 0, 0.7] as const).map(x => (
        <mesh key={`mount-${x}`} position={[x, -0.12, -0.75]} castShadow><boxGeometry args={[0.16, 0.22, 0.25]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      ))}
    </group>
  );
}

export function PlasmaTorch({ intensity = 1 }: { intensity?: number }) {
  return (
    <group position={[0, 0.65, 1.15]}>
      {/* Mounting rail */}
      <mesh position={[0, -0.12, -0.3]} castShadow><boxGeometry args={[1.5, 0.14, 0.45]} /><meshStandardMaterial color="#eeeeee" metalness={0.12} roughness={0.88} /></mesh>
      {/* Fuel manifold cylinder */}
      <mesh position={[0, -0.05, -0.22]} castShadow rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.08, 0.08, 1.4, 12]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      {/* Three torch nozzle heads */}
      {[-0.45, 0, 0.45].map(x => (
        <group key={`torch-${x}`} position={[x, 0, 0]}>
          {/* Nozzle body - tapered cylinder */}
          <mesh castShadow rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.08, 0.13, 0.85, 14]} /><meshStandardMaterial color="#333355" metalness={0.82} roughness={0.38} /></mesh>
          {/* Heat jacket rings */}
          {[0.18, -0.18].map(z => (
            <mesh key={`ring-${z}`} position={[0,0,z]} castShadow><torusGeometry args={[0.1, 0.018, 8, 20]} /><meshStandardMaterial color="#444" metalness={0.88} roughness={0.2} /></mesh>
          ))}
          {/* Nozzle mouth */}
          <mesh position={[0, 0, 0.44]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.06, 0.08, 0.12, 14]} /><meshStandardMaterial color="#111" roughness={1} /></mesh>
          {/* Plasma flame glow */}
          <mesh position={[0, 0, 0.52]}><sphereGeometry args={[0.06, 10, 10]} /><meshStandardMaterial color="#4488ff" emissive="#4488ff" emissiveIntensity={3.0 * intensity} toneMapped={false} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ==========================================
// --- 3. DEFENSE (12)
// ==========================================

export function TitaniumShell({ intensity = 1 }: { intensity?: number }) {
  return (
    <group position={[0, 0.4, 0]}>
      <mesh castShadow receiveShadow><boxGeometry args={[2.42, 0.82, 1.82]} /><meshStandardMaterial {...TITANIUM} /></mesh>
      {[-1.2, 1.2].map(x => <mesh key={`edge-x-${x}`} position={[x, 0.41, 0]}><boxGeometry args={[0.02, 0.02, 1.82]} /><meshStandardMaterial color="#aaaaaa" /></mesh>)}
      {[-0.9, 0.9].map(z => <mesh key={`edge-z-${z}`} position={[0, 0.41, z]}><boxGeometry args={[2.42, 0.02, 0.02]} /><meshStandardMaterial color="#aaaaaa" /></mesh>)}
    </group>
  );
}

export function ReactivePanels() {
  return (
    <group position={[0, 0.4, 0]}>
      {[-1.0, -0.5, 0, 0.5, 1.0].map(x => [-0.7, -0.2, 0.3, 0.8].map(z => (
        <group key={`panel-${x}-${z}`} position={[x, 0.42, z]}>
          <mesh castShadow receiveShadow><boxGeometry args={[0.45, 0.05, 0.45]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
          <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.05, 0.01, 0.05]} /><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1.0} /></mesh>
          <mesh position={[0, -0.02, 0]}><boxGeometry args={[0.47, 0.01, 0.47]} /><meshStandardMaterial {...CHROME} /></mesh>
        </group>
      )))}
    </group>
  );
}

export function CarbonWeave() {
  return (
    <group position={[0, 0.4, 0]}>
      <mesh castShadow receiveShadow><boxGeometry args={[2.41, 0.81, 1.81]} /><meshStandardMaterial {...CARBON_FIBER} /></mesh>
    </group>
  );
}

export function CeramicComposite() {
  return (
    <group position={[0, 0.4, 0]}>
      {[-1.0, -0.5, 0, 0.5, 1.0].map(x => [-0.7, -0.2, 0.3, 0.8].map(z => (
        <group key={`hex-${x}-${z}`} position={[x + (z>0?0.25:0), 0.42, z]}>
          <mesh castShadow receiveShadow rotation={[0, Math.PI/6, 0]}><cylinderGeometry args={[0.2, 0.2, 0.05, 6]} /><meshStandardMaterial color="#ccccaa" roughness={0.9} metalness={0.1} /></mesh>
          <mesh position={[0, -0.01, 0]} rotation={[0, Math.PI/6, 0]}><cylinderGeometry args={[0.22, 0.22, 0.03, 6]} /><meshStandardMaterial color="#333333" /></mesh>
        </group>
      )))}
    </group>
  );
}

export function SteelFortressWrap() {
  return (
    <group position={[0, 0.38, 0]}>
      {/* Outer shell */}
      <mesh castShadow receiveShadow><boxGeometry args={[2.52, 0.88, 1.92]} /><meshStandardMaterial {...WORN_IRON} /></mesh>
      {/* Armor plate sections - 4 panels with panel lines */}
      {[-0.6, 0.6].map(x => [-0.45, 0.45].map(z => (
        <mesh key={`panel-${x}-${z}`} position={[x, 0.45, z]} castShadow>
          <boxGeometry args={[0.96, 0.07, 0.85]} /><meshStandardMaterial color="#333" metalness={0.88} roughness={0.28} />
        </mesh>
      )))}
      {/* Chrome weld seams */}
      {[-0.12, 0.12].map(x => (
        <mesh key={`seam-${x}`} position={[x, 0.45, 0]}><boxGeometry args={[0.03, 0.08, 1.92]} /><meshStandardMaterial color="#888" metalness={0.9} roughness={0.2} /></mesh>
      ))}
      {/* Rivet grid */}
      {[-1.1, -0.5, 0.1, 0.7].map(x => [-0.75, -0.25, 0.25, 0.75].map(z => (
        <mesh key={`rivet-${x}-${z}`} position={[x+0.3, 0.46, z]} rotation={[Math.PI/2,0,Math.PI/6]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.065, 6]} /><meshStandardMaterial color="#666" metalness={0.92} roughness={0.12} />
        </mesh>
      )))}
    </group>
  );
}

export function AblativeFoamCoat() {
  return (
    <group position={[0, 0.36, 0]}>
      {/* Base steel frame */}
      <mesh castShadow receiveShadow><boxGeometry args={[2.42, 0.72, 1.82]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Ablative foam tiles - slightly raised, matte grey */}
      {[-1.0, -0.5, 0.0, 0.5, 1.0].map(x => [-0.65, -0.15, 0.35, 0.75].map(z => (
        <mesh key={`tile-${x}-${z}`} position={[x, 0.39, z]} castShadow receiveShadow>
          <boxGeometry args={[0.44, 0.1, 0.4]} /><meshStandardMaterial color="#4e4e4e" metalness={0.0} roughness={0.95} />
        </mesh>
      )))}
      {/* Tile gap lines */}
      {[-0.75, -0.25, 0.25, 0.75].map(x => (
        <mesh key={`gap-${x}`} position={[x, 0.37, 0]}><boxGeometry args={[0.02, 0.14, 1.82]} /><meshStandardMaterial color="#111" roughness={1} /></mesh>
      ))}
      {/* Mounting bolts at corners */}
      {[-1.18, 1.18].map(x => [-0.85, 0.85].map(z => (
        <mesh key={`cb-${x}-${z}`} position={[x, 0.43, z]} rotation={[Math.PI/2,0,Math.PI/6]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.07, 6]} /><meshStandardMaterial {...CHROME} />
        </mesh>
      )))}
    </group>
  );
}

export function PolycarbonateShield() {
  return (
    <group position={[0, 0.42, 0]}>
      {/* Front transparent shield panel */}
      <mesh position={[0, 0.02, 0.97]} castShadow receiveShadow><boxGeometry args={[2.42, 0.84, 0.06]} /><meshStandardMaterial color="#ccddff" metalness={0.1} roughness={0.05} transparent opacity={0.25} /></mesh>
      {/* Steel frame around shield */}
      <mesh position={[0, 0.42, 0.97]} castShadow><boxGeometry args={[2.48, 0.06, 0.08]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      <mesh position={[0, -0.38, 0.97]} castShadow><boxGeometry args={[2.48, 0.06, 0.08]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      {([-1.2, 1.2] as const).map(x => (
        <mesh key={`frame-v-${x}`} position={[x, 0.02, 0.97]} castShadow><boxGeometry args={[0.08, 0.84, 0.08]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      ))}
      {/* Internal cross bracing visible through shield */}
      {([-0.4, 0.4] as const).map(x => (
        <mesh key={`brace-${x}`} position={[x, 0.02, 0.96]} castShadow><boxGeometry args={[0.04, 0.7, 0.04]} /><meshStandardMaterial color="#aabbee" metalness={0.4} roughness={0.3} transparent opacity={0.5} /></mesh>
      ))}
      {/* Corner bolts */}
      {[-1.15, 1.15].map(x => [-0.35, 0.35].map(y => (
        <mesh key={`sb-${x}-${y}`} position={[x, y, 0.99]} rotation={[Math.PI/2,0,Math.PI/6]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.06, 6]} /><meshStandardMaterial {...CHROME} />
        </mesh>
      )))}
    </group>
  );
}

export function SelfHealingPolymer({ intensity = 1 }: { intensity?: number }) {
  return (
    <group position={[0, 0.4, 0]}>
      <mesh castShadow receiveShadow><boxGeometry args={[2.43, 0.83, 1.83]} /><meshStandardMaterial color="#333333" metalness={0.1} roughness={0.5} transparent opacity={0.6} /></mesh>
      {[-0.8, 0, 0.8].map(x => (
        <mesh key={`vein-${x}`} position={[x, 0.42, 0]} rotation={[0, Math.random()*Math.PI, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.0, 8]} />
          <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={intensity} />
        </mesh>
      ))}
    </group>
  );
}

export function ChainMailSkirt() {
  return (
    <group position={[0, 0.18, 0]}>
      {/* Inner steel hull base */}
      <mesh castShadow receiveShadow><boxGeometry args={[2.42, 0.42, 1.82]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Chain link plates - layered skirts on each face */}
      {/* Front skirt panels */}
      {[-1.0, -0.5, 0, 0.5, 1.0].map(x => (
        <group key={`front-${x}`}>
          <mesh position={[x, -0.12, 0.94]} castShadow>
            <boxGeometry args={[0.44, 0.55, 0.06]} /><meshStandardMaterial color="#555" metalness={0.78} roughness={0.45} />
          </mesh>
          {/* Ring link row */}
          {[-0.15, 0, 0.15].map(xx => (
            <mesh key={xx} position={[x+xx, -0.38, 0.94]} rotation={[Math.PI/2,0,0]} castShadow>
              <torusGeometry args={[0.06, 0.018, 6, 12]} /><meshStandardMaterial color="#888" metalness={0.82} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Side skirt panels */}
      {([-1.24, 1.24] as const).map(sx => [-0.7, 0, 0.7].map(z => (
        <group key={`side-${sx}-${z}`}>
          <mesh position={[sx, -0.12, z]} rotation={[0,Math.PI/2,0]} castShadow>
            <boxGeometry args={[0.55, 0.5, 0.06]} /><meshStandardMaterial color="#4a4a4a" metalness={0.75} roughness={0.5} />
          </mesh>
        </group>
      )))}
    </group>
  );
}

export function DeflectorWedgeArmor() {
  return (
    <group position={[0, 0.38, 0]}>
      {/* Base chassis plate */}
      <mesh castShadow receiveShadow><boxGeometry args={[2.42, 0.72, 1.82]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Main deflector wedge plate - polished */}
      <mesh position={[0, 0.1, 1.0]} rotation={[-0.72, 0, 0]} castShadow receiveShadow><boxGeometry args={[2.44, 1.05, 0.1]} /><meshStandardMaterial color="#b8b8b8" metalness={1.0} roughness={0.0} envMapIntensity={1.8} /></mesh>
      {/* Chrome leading edge */}
      <mesh position={[0, -0.32, 1.36]}><boxGeometry args={[2.44, 0.05, 0.05]} /><meshStandardMaterial {...CHROME} /></mesh>
      {/* Side gusset plates */}
      {([-1.2, 1.2] as const).map(x => (
        <mesh key={`gusset-${x}`} position={[x, 0.05, 0.85]} rotation={[-0.72,0,0]} castShadow>
          <boxGeometry args={[0.08, 1.05, 0.12]} /><meshStandardMaterial color="#777" metalness={0.9} roughness={0.18} />
        </mesh>
      ))}
      {/* Structural ribs behind wedge */}
      {[-0.6, 0, 0.6].map(x => (
        <mesh key={`rib-${x}`} position={[x, 0.05, 0.5]} rotation={[-0.35,0,0]} castShadow><boxGeometry args={[0.1, 0.65, 0.12]} /><meshStandardMaterial color="#444" metalness={0.85} roughness={0.28} /></mesh>
      ))}
    </group>
  );
}

export function NanoCeramicCoat() {
  return (
    <group position={[0, 0.38, 0]}>
      {/* Base steel */}
      <mesh castShadow receiveShadow><boxGeometry args={[2.42, 0.82, 1.82]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      {/* Nano-ceramic overlay - iridescent purple-teal */}
      <mesh castShadow><boxGeometry args={[2.44, 0.84, 1.84]} /><meshStandardMaterial color="#7766cc" metalness={0.88} roughness={0.08} envMapIntensity={1.6} transparent opacity={0.45} /></mesh>
      {/* Hexagonal surface pattern - raised */}
      {[-0.9, -0.3, 0.3, 0.9].map(x => [-0.6, 0, 0.6].map(z => (
        <mesh key={`hex-${x}-${z}`} position={[x, 0.43, z]} rotation={[0, Math.PI/6, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 6]} /><meshStandardMaterial color="#9988dd" metalness={0.9} roughness={0.06} envMapIntensity={1.5} />
        </mesh>
      )))}
      {/* Edge accent line */}
      <mesh position={[0, 0.43, 0.93]}><boxGeometry args={[2.44, 0.04, 0.04]} /><meshStandardMaterial color="#aa88ff" emissive="#aa88ff" emissiveIntensity={0.8} toneMapped={false} /></mesh>
    </group>
  );
}

export function IronFortressShell() {
  return (
    <group position={[0, 0.38, 0]}>
      {/* Triple-layered iron casing */}
      <mesh castShadow receiveShadow><boxGeometry args={[2.52, 0.92, 1.92]} /><meshStandardMaterial color="#1a1a1a" metalness={0.92} roughness={0.28} /></mesh>
      <mesh castShadow><boxGeometry args={[2.48, 0.88, 1.88]} /><meshStandardMaterial color="#222" metalness={0.9} roughness={0.3} /></mesh>
      <mesh castShadow><boxGeometry args={[2.44, 0.84, 1.84]} /><meshStandardMaterial color="#2a2a2a" metalness={0.88} roughness={0.32} /></mesh>
      {/* Exposed iron plate bolts - 3x3 grid */}
      {[-1.1, 0, 1.1].map(x => [-0.78, 0, 0.78].map(z => (
        <mesh key={`bolt-${x}-${z}`} position={[x, 0.47, z]} rotation={[Math.PI/2,0,Math.PI/6]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 6]} /><meshStandardMaterial color="#555" metalness={0.95} roughness={0.1} />
        </mesh>
      )))}
      {/* Weld seam lines */}
      {[-0.5, 0.5].map(x => (
        <mesh key={`weld-${x}`} position={[x, 0.46, 0]}><boxGeometry args={[0.02, 0.01, 1.92]} /><meshStandardMaterial color="#888" metalness={0.9} roughness={0.3} /></mesh>
      ))}
      {/* Side chamfer edges */}
      {([-1.26, 1.26] as const).map(x => (
        <mesh key={`chamfer-${x}`} position={[x, 0.1, 0]} castShadow><boxGeometry args={[0.05, 0.85, 1.92]} /><meshStandardMaterial color="#111" metalness={0.95} roughness={0.1} /></mesh>
      ))}
    </group>
  );
}

// ==========================================
// --- 4. SECONDARY WEAPONS (12)
// ==========================================

export function Flamethrower({ intensity = 1 }: { intensity?: number }) {
  return (
    <group position={[-1.25, 0.6, 0]}>
      <mesh castShadow receiveShadow position={[0, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 1.0, 16]} rotation={[Math.PI/2,0,0]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      <mesh position={[0, 0, 0.5]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.1, 0.15, 0.4, 16]} /><meshStandardMaterial color="#444466" metalness={0.8} roughness={0.4} /></mesh>
      <mesh position={[0, 0, 0.7]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.05, 0.1, 0.2, 16]} /><meshStandardMaterial color="#000000" /></mesh>
      <mesh position={[0, 0, 0.85]}><sphereGeometry args={[0.05, 16, 16]} /><meshStandardMaterial color="#0066ff" emissive="#0066ff" emissiveIntensity={intensity} /></mesh>
    </group>
  );
}

export function EMPPulse({ intensity = 1 }: { intensity?: number }) {
  return (
    <group position={[0, 0.85, 0]}>
      <mesh castShadow receiveShadow rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.8, 0.05, 16, 64]} /><meshStandardMaterial {...COPPER} /></mesh>
      <mesh castShadow receiveShadow rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.5, 0.05, 16, 64]} /><meshStandardMaterial {...COPPER} /></mesh>
      <mesh castShadow receiveShadow rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.2, 0.05, 16, 64]} /><meshStandardMaterial {...COPPER} /></mesh>
      <mesh castShadow position={[0, 0, 0]}><sphereGeometry args={[0.15, 16, 16]} /><meshStandardMaterial color="#333333" /></mesh>
      {[-0.6, 0.6].map(x => <mesh key={`arc-${x}`} position={[x, 0, 0]}><boxGeometry args={[0.1, 0.02, 0.1]} /><meshStandardMaterial color="#0088ff" emissive="#0088ff" emissiveIntensity={intensity * 2} /></mesh>)}
    </group>
  );
}

export function SmokeScreen() {
  return (
    <group position={[0, 0.62, -1.05]}>
      {/* Twin canister launchers */}
      {([-0.45, 0.45] as const).map(x => (
        <group key={`can-${x}`} position={[x, 0, 0]}>
          {/* Main canister body */}
          <mesh castShadow receiveShadow rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.16, 0.16, 0.72, 14]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
          {/* Nozzle cap */}
          <mesh position={[0, 0, -0.38]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.2, 0.16, 0.14, 14]} /><meshStandardMaterial color="#111" roughness={1} /></mesh>
          {/* Nozzle opening */}
          <mesh position={[0, 0, -0.46]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.08, 0.08, 0.08, 10]} /><meshStandardMaterial color="#050505" roughness={1} /></mesh>
          {/* Vent ring */}
          <mesh position={[0, 0, 0.22]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.16, 0.02, 8, 20]} /><meshStandardMaterial {...CHROME} /></mesh>
          {/* Mounting collar */}
          <mesh position={[0, 0, -0.28]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.07, 14]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
        </group>
      ))}
      {/* Shared mounting rail */}
      <mesh position={[0, -0.15, 0]} castShadow><boxGeometry args={[1.2, 0.15, 0.35]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
    </group>
  );
}

export function SelfRightingArm() {
  return (
    <group position={[0, 0.82, 0]}>
      {/* Hinge motor housing */}
      <mesh position={[0, 0, -0.22]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.45, 14]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Hinge pivot axle */}
      <mesh position={[0, 0, -0.22]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.26, 0.26, 0.55, 14]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      {/* Arm - carbon fiber beam */}
      <mesh castShadow receiveShadow position={[0, 0, 0.55]} rotation={[0.12, 0, 0]}><boxGeometry args={[0.18, 0.08, 1.4]} /><meshStandardMaterial {...CARBON_FIBER} /></mesh>
      {/* Reinforcement struts */}
      {([-0.06, 0.06] as const).map(x => (
        <mesh key={`strut-${x}`} position={[x, 0, 0.4]} rotation={[0.12, 0, 0]} castShadow><boxGeometry args={[0.04, 0.12, 1.2]} /><meshStandardMaterial color="#333" metalness={0.85} roughness={0.25} /></mesh>
      ))}
      {/* Rubber contact pad at end */}
      <mesh position={[0, -0.06, 1.22]} castShadow><boxGeometry args={[0.32, 0.1, 0.22]} /><meshStandardMaterial {...RUBBER} /></mesh>
      {/* Status LED */}
      <mesh position={[0.1, 0.06, 0.15]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2.0} toneMapped={false} /></mesh>
    </group>
  );
}

export function SawbladeSideMount() {
  return (
    <group position={[-1.3, 0.4, 0]}>
      <mesh castShadow receiveShadow position={[-0.4, 0, 0]}><boxGeometry args={[0.8, 0.2, 0.2]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      <mesh castShadow receiveShadow position={[-0.8, 0, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.4, 0.4, 0.05, 32]} /><meshStandardMaterial {...CHROME} /></mesh>
      <mesh castShadow position={[-0.8, 0, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.1, 0.1, 0.1, 16]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
    </group>
  );
}

export function NetLauncher() {
  return (
    <group position={[0, 0.88, 0.45]}>
      {/* Launcher barrel */}
      <mesh castShadow receiveShadow rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.22, 0.22, 0.85, 10]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      {/* Muzzle flare collar */}
      <mesh position={[0, 0, 0.44]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.26, 0.22, 0.08, 10]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Barrel ring reinforcements */}
      {[-0.2, 0.1].map(z => (
        <mesh key={`ring-${z}`} position={[0,0,z]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.22, 0.025, 8, 20]} /><meshStandardMaterial {...CHROME} /></mesh>
      ))}
      {/* Compressed gas tank - side cylinder */}
      <mesh position={[0.35, 0.08, -0.12]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.1, 0.1, 0.65, 12]} /><meshStandardMaterial color="#445566" metalness={0.82} roughness={0.35} /></mesh>
      {/* Tank valve */}
      <mesh position={[0.35, 0.08, 0.22]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.04, 0.04, 0.1, 8]} /><meshStandardMaterial {...CHROME} /></mesh>
      {/* Mount base */}
      <mesh position={[0, -0.2, 0]} castShadow><boxGeometry args={[0.7, 0.22, 0.6]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
    </group>
  );
}

export function SpikeMineDropper() {
  return (
    <group position={[0, 0.38, -1.05]}>
      {/* Hopper housing - slanted box */}
      <mesh castShadow receiveShadow rotation={[-0.35,0,0]}><boxGeometry args={[0.9, 0.46, 0.7]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Ejection chute */}
      <mesh position={[0, -0.2, -0.22]} rotation={[-0.55,0,0]} castShadow><cylinderGeometry args={[0.16, 0.22, 0.4, 10]} /><meshStandardMaterial color="#111" roughness={1} /></mesh>
      {/* Mine payload visible - hex shape */}
      <mesh position={[0, 0.05, -0.1]} rotation={[0, Math.PI/6, 0]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.12, 6]} /><meshStandardMaterial color="#444" metalness={0.72} roughness={0.5} /></mesh>
      {/* Spike tips on mine */}
      {[0,1,2,3,4,5].map(i => (
        <mesh key={i} position={[Math.cos(i*Math.PI/3)*0.2, 0.05, -0.1 + Math.sin(i*Math.PI/3)*0.2]} castShadow>
          <cylinderGeometry args={[0, 0.025, 0.18, 4]} /><meshStandardMaterial {...CHROME} />
        </mesh>
      ))}
      {/* Trigger sensor */}
      <mesh position={[0, -0.18, -0.22]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#ff2200" emissive="#ff2200" emissiveIntensity={1.5} toneMapped={false} /></mesh>
    </group>
  );
}

export function WedgeRam() {
  return (
    <group position={[0, 0.18, 1.05]}>
      {/* Main wedge plate - polished steel */}
      <mesh castShadow receiveShadow rotation={[-0.38,0,0]}><boxGeometry args={[2.65, 0.1, 0.92]} /><meshStandardMaterial color="#b0b0b0" metalness={1.0} roughness={0.0} envMapIntensity={1.8} /></mesh>
      {/* Underlayer */}
      <mesh position={[0, -0.06, 0]} rotation={[-0.22,0,0]} castShadow><boxGeometry args={[2.62, 0.08, 0.82]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {/* Leading edge blade */}
      <mesh position={[0, -0.1, 0.44]} rotation={[-0.38,0,0]}><boxGeometry args={[2.65, 0.04, 0.06]} /><meshStandardMaterial {...CHROME} /></mesh>
      {/* Piston actuators */}
      {([-0.85, 0, 0.85] as const).map(x => (
        <group key={`piston-${x}`} position={[x, -0.08, -0.28]}>
          <mesh rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.06, 0.06, 0.5, 10]} /><meshStandardMaterial {...CHROME} /></mesh>
          <mesh rotation={[Math.PI/2,0,0]} position={[0,0,0.28]} castShadow><cylinderGeometry args={[0.1, 0.1, 0.08, 10]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
        </group>
      ))}
      {/* Side reinforcement gussets */}
      {([-1.3, 1.3] as const).map(x => (
        <mesh key={`gusset-${x}`} position={[x, -0.06, 0]} rotation={[-0.3,0,0]} castShadow><boxGeometry args={[0.08, 0.14, 0.88]} /><meshStandardMaterial color="#666" metalness={0.88} roughness={0.22} /></mesh>
      ))}
    </group>
  );
}

export function TaserProngs({ intensity = 1 }: { intensity?: number }) {
  return (
    <group position={[0, 0.6, 1.0]}>
      {[-0.3, 0.3].map(x => (
        <group key={`prong-${x}`} position={[x, 0, 0]}>
          <mesh castShadow receiveShadow rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.05, 0.1, 0.8, 16]} /><meshStandardMaterial {...COPPER} /></mesh>
          <mesh position={[0, 0, -0.3]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.12, 0.12, 0.2, 16]} /><meshStandardMaterial {...RUBBER} /></mesh>
        </group>
      ))}
      <mesh position={[0, 0, 0.4]}><boxGeometry args={[0.6, 0.02, 0.02]} /><meshStandardMaterial color="#88aaff" emissive="#88aaff" emissiveIntensity={intensity * 2} /></mesh>
    </group>
  );
}

export function DrillAttachment() {
  const spinRef = useRef<THREE.Group>(null!);
  useFrame((_, delta) => { if (spinRef.current) spinRef.current.rotation.z += delta * 25; });
  return (
    <group position={[0, 0.62, 1.22]}>
      <group ref={spinRef}>
        {/* Main tapered drill cone */}
        <mesh castShadow rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0, 0.32, 1.35, 16]} /><meshStandardMaterial {...TUNGSTEN} /></mesh>
        {/* Helical spiral flutes - 3 fins */}
        {[0,1,2].map(i => (
          <mesh key={i} position={[0, 0, -0.1]} rotation={[0, i*Math.PI*2/3, 0]} castShadow>
            <boxGeometry args={[0.32, 0.06, 1.2]} /><meshStandardMaterial color="#555" metalness={0.9} roughness={0.18} />
          </mesh>
        ))}
        {/* Carbide tip */}
        <mesh position={[0, 0, 0.7]} castShadow><sphereGeometry args={[0.06, 10, 10]} /><meshStandardMaterial {...CHROME} /></mesh>
      </group>
      {/* Reinforced collar */}
      <mesh position={[0, 0, -0.62]} castShadow><cylinderGeometry args={[0.42, 0.42, 0.14, 16]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
      {/* Collar bolts */}
      {[0,1,2,3,4,5,6,7].map(i => (
        <Bolt key={i} position={[Math.cos(i*Math.PI/4)*0.32, 0, -0.62]} rotation={[Math.PI/2,0,0]} />
      ))}
      {/* Mount housing */}
      <mesh position={[0, 0, -0.88]} castShadow><cylinderGeometry args={[0.32, 0.38, 0.3, 14]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
    </group>
  );
}

export function GrinderWheel() {
  const spinRef = useRef<THREE.Group>(null!);
  useFrame((_, delta) => { if (spinRef.current) spinRef.current.rotation.x += delta * 16; });
  return (
    <group position={[1.28, 0.42, 0]}>
      {/* Spinning abrasive wheel */}
      <group ref={spinRef}>
        <mesh castShadow position={[0.38, 0, 0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.52, 0.52, 0.12, 32]} /><meshStandardMaterial color="#7a6655" roughness={0.98} metalness={0.0} /></mesh>
        {/* Abrasive segments */}
        {Array.from({length:8}).map((_,i) => (
          <mesh key={i} position={[0.38 + (i%2===0?0.01:-0.01), Math.cos(i*Math.PI/4)*0.52, Math.sin(i*Math.PI/4)*0.52]} rotation={[i*Math.PI/4,0,0]} castShadow>
            <boxGeometry args={[0.1, 0.15, 0.08]} /><meshStandardMaterial color="#555544" roughness={1} metalness={0} />
          </mesh>
        ))}
        {/* Hub plate */}
        <mesh position={[0.38, 0, 0]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[0.22, 0.22, 0.16, 16]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
        {/* Hub bolts */}
        {[0,1,2,3].map(b => (
          <mesh key={b} position={[0.38 + 0.08, Math.cos(b*Math.PI/2)*0.14, Math.sin(b*Math.PI/2)*0.14]} rotation={[0,0,Math.PI/2]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.05, 6]} /><meshStandardMaterial {...CHROME} />
          </mesh>
        ))}
      </group>
      {/* Mounting arm */}
      <mesh position={[0.18, 0, 0]} castShadow><boxGeometry args={[0.42, 0.14, 0.14]} /><meshStandardMaterial {...STEEL_MID} /></mesh>
    </group>
  );
}

export function ConcussionCannon() {
  return (
    <group position={[0, 0.9, 0.2]}>
      <mesh castShadow receiveShadow rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.75, 0.75, 1.5, 32]} /><meshStandardMaterial {...STEEL_DARK} /></mesh>
      {[-0.5, -0.2, 0.2, 0.5].map(z => <mesh key={`ring-${z}`} position={[0, 0, z]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.77, 0.77, 0.05, 32]} /><meshStandardMaterial {...CHROME} /></mesh>)}
      <mesh position={[0.8, 0, -0.4]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.2, 0.2, 0.05, 16]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0.8, 0, -0.4]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.18, 0.18, 0.06, 16]} /><meshStandardMaterial color="#ff0000" /></mesh>
      {[-0.4, 0.4].map(x => [-0.4, 0.4].map(y => <mesh key={`spring-${x}-${y}`} position={[x, y, -0.7]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.1, 0.1, 0.4, 16]} /><meshStandardMaterial {...CHROME} /></mesh>))}
    </group>
  );
}


// ==========================================
// --- MAPPING FUNCTION
// ==========================================

export function HighFidelityRobotMesh({ 
  bodyPart, attackPart, defensePart, secondaryPart, 
  isForging = false,
  isHit = false,
  isAttacking = false 
}: { 
  bodyPart?: any, 
  attackPart?: any, 
  defensePart?: any, 
  secondaryPart?: any,
  isForging?: boolean,
  isHit?: boolean,
  isAttacking?: boolean
}) {
  const bName = (bodyPart?.id || bodyPart?.name || "").toLowerCase();
  const aName = (attackPart?.id || attackPart?.name || "").toLowerCase();
  const dName = (defensePart?.id || defensePart?.name || "").toLowerCase();
  const sName = (secondaryPart?.id || secondaryPart?.name || "").toLowerCase();

  const emissiveRef = useRef<number>(1.0);
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (isHit) {
      emissiveRef.current = 5.0;
      if (groupRef.current) {
        groupRef.current.position.x = (Math.random() - 0.5) * 0.15;
        groupRef.current.position.z = (Math.random() - 0.5) * 0.15;
      }
    } else {
      if (groupRef.current) {
        groupRef.current.position.x = 0;
        groupRef.current.position.z = 0;
      }
      if (isForging) {
        emissiveRef.current = 1.5 + Math.sin(state.clock.elapsedTime * 8) * 1.0;
      } else if (isAttacking) {
        emissiveRef.current = 2.0 + Math.sin(state.clock.elapsedTime * 15) * 0.5;
      } else {
        emissiveRef.current = 1.0;
      }
    }
  });

  const BodyComp = bName.includes("wasp") ? WaspChassis
                 : bName.includes("goliath") ? GoliathChassis
                 : bName.includes("phantom") ? PhantomChassis
                 : bName.includes("fortress") ? FortressChassis
                 : bName.includes("viper") ? ViperChassis
                 : bName.includes("colossus") ? ColossusChassis
                 : bName.includes("wraith") ? WraithChassis
                 : bName.includes("bulwark") ? BulwarkChassis
                 : bName.includes("lynx") ? LynxChassis
                 : bName.includes("rhino") ? RhinoChassis
                 : bName.includes("shadow") ? ShadowChassis
                 : TitanChassis;

  const AttackComp = aName.includes("disc") ? TitanDisc
                   : aName.includes("hammer") ? Hammerhead
                   : aName.includes("vertical") ? VerticalSpinner
                   : aName.includes("lifter") ? LifterFork
                   : aName.includes("flail") ? FlailChain
                   : aName.includes("crusher") ? CrusherClaw
                   : aName.includes("horizontal") ? HorizontalSpinner
                   : aName.includes("ramrod") ? SpikeRamrod
                   : aName.includes("lance") ? PneumaticLance
                   : aName.includes("drum") ? DrumSpinner
                   : aName.includes("slicer") ? WedgeSlicer
                   : aName.includes("torch") ? PlasmaTorch
                   : TitanDisc;

  const DefenseComp = dName.includes("reactive") ? ReactivePanels
                    : dName.includes("carbon") ? CarbonWeave
                    : dName.includes("ceramic") ? CeramicComposite
                    : dName.includes("steel") ? SteelFortressWrap
                    : dName.includes("foam") ? AblativeFoamCoat
                    : dName.includes("polycarbonate") ? PolycarbonateShield
                    : dName.includes("polymer") ? SelfHealingPolymer
                    : dName.includes("chain") ? ChainMailSkirt
                    : dName.includes("deflector") ? DeflectorWedgeArmor
                    : dName.includes("nano") ? NanoCeramicCoat
                    : dName.includes("iron") ? IronFortressShell
                    : TitaniumShell;

  let SecondaryComp = null;
  if (sName) {
    SecondaryComp = sName.includes("flame") ? Flamethrower
                  : sName.includes("emp") ? EMPPulse
                  : sName.includes("smoke") ? SmokeScreen
                  : sName.includes("righting") ? SelfRightingArm
                  : sName.includes("saw") ? SawbladeSideMount
                  : sName.includes("net") ? NetLauncher
                  : sName.includes("mine") ? SpikeMineDropper
                  : sName.includes("ram") ? WedgeRam
                  : sName.includes("taser") ? TaserProngs
                  : sName.includes("drill") ? DrillAttachment
                  : sName.includes("grinder") ? GrinderWheel
                  : ConcussionCannon;
  }

  return (
    <group ref={groupRef}>
      {isHit && (
        <mesh scale={1.1}>
          <boxGeometry args={[3, 2, 4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
        </mesh>
      )}
      <BodyComp intensity={emissiveRef.current} />
      <AttackComp intensity={emissiveRef.current} />
      <DefenseComp intensity={emissiveRef.current} />
      {SecondaryComp && <SecondaryComp intensity={emissiveRef.current} />}

      {/* Wheels */}
      {([[-1.3, 1.0], [1.3, 1.0], [-1.3, -1.0], [1.3, -1.0]] as const).map(([x, z], i) => (
        <group key={i} position={[x, 0.3, z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.22, 32]} />
            <meshStandardMaterial {...RUBBER} />
          </mesh>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.24, 16]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {[0, 1, 2, 3, 4].map(b => (
            <mesh key={`bolt-f-${b}`} position={[Math.cos(b * Math.PI * 2 / 5) * 0.12, 0.125, Math.sin(b * Math.PI * 2 / 5) * 0.12]} castShadow>
              <cylinderGeometry args={[0.025, 0.025, 0.05, 6]} />
              <meshStandardMaterial {...CHROME} />
            </mesh>
          ))}
          {[0, 1, 2, 3, 4].map(b => (
            <mesh key={`bolt-b-${b}`} position={[Math.cos(b * Math.PI * 2 / 5) * 0.12, -0.125, Math.sin(b * Math.PI * 2 / 5) * 0.12]} castShadow>
              <cylinderGeometry args={[0.025, 0.025, 0.05, 6]} />
              <meshStandardMaterial {...CHROME} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
