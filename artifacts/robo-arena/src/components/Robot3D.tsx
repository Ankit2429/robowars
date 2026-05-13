import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface Robot3DProps {
  bodyColor: string;
  atkColor: string;
  defColor: string;
  attackPartId?: string;
  defensePartId?: string;
  isHit?: boolean;
  isAttacking?: boolean;
}

// ─── Highly Detailed Vehicle Weapon ───────────────────────────────────────────
function VehicleWeapon({ atkColor, attackPartId, isAttacking }: {
  atkColor: string; attackPartId: string; isAttacking: boolean;
}) {
  const lc  = (attackPartId || "").toLowerCase();
  const isCannon = lc.includes("plasma") || lc.includes("rocket") || lc.includes("cannon");
  const isSaw    = lc.includes("saw");
  
  const spinRef = useRef<THREE.Group>(null!);
  const glowRef = useRef<THREE.MeshPhysicalMaterial>(null!);

  useFrame((state, delta) => {
    if (spinRef.current && isSaw) {
      spinRef.current.rotation.y += isAttacking ? delta * 25 : delta * 5;
    }
    if (glowRef.current) {
      const targetGlow = isAttacking ? 4.0 : 1.2;
      glowRef.current.emissiveIntensity = THREE.MathUtils.lerp(glowRef.current.emissiveIntensity, targetGlow, 0.1);
    }
  });

  if (isCannon) return (
    <group position={[0, 0.45, 1.8]}>
      {/* Barrel Base */}
      <mesh position={[0, 0, -0.6]}>
        <boxGeometry args={[0.5, 0.5, 0.8]} />
        <meshPhysicalMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} clearcoat={1.0} />
      </mesh>
      {/* Main Barrels */}
      {[-0.15, 0.15].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.12, 1.6, 16]} />
            <meshPhysicalMaterial color="#222" metalness={0.8} roughness={0.3} clearcoat={0.5} />
          </mesh>
          {/* Glowing Cores inside barrels */}
          <mesh position={[0, 0, 0.8]}>
            <cylinderGeometry args={[0.08, 0.08, 0.05, 12]} />
            <meshPhysicalMaterial ref={i===0?glowRef:undefined} color={atkColor} emissive={atkColor} emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Energy Rings */}
      <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.05, 16, 32]} />
        <meshPhysicalMaterial color={atkColor} emissive={atkColor} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
    </group>
  );

  if (isSaw) return (
    <group position={[0, 0.35, 1.8]}>
      {/* Arm Mount */}
      <mesh position={[0, 0, -0.4]}>
        <boxGeometry args={[0.4, 0.3, 0.8]} />
        <meshPhysicalMaterial color="#111" metalness={0.95} roughness={0.2} />
      </mesh>
      {/* Spinning Saw Assembly */}
      <group ref={spinRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 0.15, 32]} />
          <meshPhysicalMaterial color="#333" metalness={1.0} roughness={0.1} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.16, 24]} />
          <meshPhysicalMaterial ref={glowRef} color={atkColor} emissive={atkColor} emissiveIntensity={1.5} toneMapped={false} />
        </mesh>
        {/* Saw Teeth */}
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={i}
            position={[Math.cos(i * Math.PI / 6) * 0.85, 0, Math.sin(i * Math.PI / 6) * 0.85]}
            rotation={[0, -i * Math.PI / 6, 0]}>
            <boxGeometry args={[0.2, 0.1, 0.25]} />
            <meshPhysicalMaterial color="#bbb" metalness={1.0} roughness={0.0} />
          </mesh>
        ))}
      </group>
    </group>
  );

  // Default / Melee Weapon (Spikes / Ram)
  return (
    <group position={[0, 0.3, 1.8]}>
      <mesh position={[0, 0, -0.3]}>
        <boxGeometry args={[1.4, 0.4, 0.6]} />
        <meshPhysicalMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} />
      </mesh>
      {([-0.5, 0, 0.5] as const).map((x, j) => (
        <group key={j} position={[x, 0, 0.2]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.15, 0.8, 16]} />
            <meshPhysicalMaterial color="#ddd" metalness={1.0} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0, -0.2]}>
            <boxGeometry args={[0.3, 0.45, 0.1]} />
            <meshPhysicalMaterial ref={j===0?glowRef:undefined} color={atkColor} emissive={atkColor} emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Main Robot Component ─────────────────────────────────────────────────────
export function Robot3D({ bodyColor, atkColor, defColor, attackPartId, defensePartId, isHit, isAttacking }: Robot3DProps) {
  const isShield = (defensePartId || "").toLowerCase().includes("shield") || (defensePartId || "").toLowerCase().includes("energy");
  
  const bc = isHit ? "#ffffff" : bodyColor;
  const bi = isHit ? 5.0 : 0.6;
  const tc = new THREE.Color(bc);

  const coreRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.z += delta * 2;
      coreRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 8) * 0.05);
    }
  });

  return (
    <group>
      {/* ── Core Chassis ── */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.6, 3.2]} />
        <meshPhysicalMaterial 
          color={tc} metalness={0.6} roughness={0.3} clearcoat={1.0} clearcoatRoughness={0.1}
        />
      </mesh>
      
      {/* Angled Front Hood */}
      <mesh position={[0, 0.65, 1.4]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[1.8, 0.4, 1.2]} />
        <meshPhysicalMaterial color={tc} metalness={0.7} roughness={0.2} clearcoat={1.0} />
      </mesh>

      {/* Internal Glowing Engine Core */}
      <group position={[0, 0.8, -0.5]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.4, 0.45, 0.3, 16]} />
          <meshPhysicalMaterial color="#111" metalness={0.9} roughness={0.2} />
        </mesh>
        <group ref={coreRef}>
          <mesh position={[0, 0.16, 0]}>
            <torusGeometry args={[0.25, 0.05, 16, 32]} />
            <meshPhysicalMaterial color={atkColor} emissive={atkColor} emissiveIntensity={3.0} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshPhysicalMaterial color="#fff" emissive="#fff" emissiveIntensity={5.0} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* ── Defense Mechanisms / Wheels ── */}
      {([-1.15, 1.15] as const).map((x, i) => (
        <group key={i}>
          {/* Side Armor Panels */}
          <mesh position={[x, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, 0.8, 3.6]} />
            <meshPhysicalMaterial color={defColor} metalness={0.5} roughness={0.4} clearcoat={0.8} />
          </mesh>
          {/* Neon Trim on Armor */}
          <mesh position={[x + (x > 0 ? 0.11 : -0.11), 0.5, 0]}>
            <boxGeometry args={[0.02, 0.05, 3.0]} />
            <meshPhysicalMaterial color={defColor} emissive={defColor} emissiveIntensity={2.0} toneMapped={false} />
          </mesh>
          
          {/* High-Tech Wheels */}
          {([[-1.15, 0.3, 1.2], [1.15, 0.3, 1.2], [-1.15, 0.3, -1.2], [1.15, 0.3, -1.2]] as const).map(([wx, wy, wz], j) => (
            <group key={j} position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.4, 0.4, 0.4, 32]} />
                <meshPhysicalMaterial color="#080808" metalness={0.3} roughness={0.9} />
              </mesh>
              {/* Wheel Rims */}
              <mesh position={[0, x > 0 ? 0.21 : -0.21, 0]}>
                <torusGeometry args={[0.25, 0.05, 16, 32]} />
                <meshPhysicalMaterial color="#333" metalness={1.0} roughness={0.2} />
              </mesh>
              {/* Glowing Hubcaps */}
              <mesh position={[0, x > 0 ? 0.22 : -0.22, 0]}>
                <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
                <meshPhysicalMaterial color={defColor} emissive={defColor} emissiveIntensity={1.5} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* ── Rear Bumper / Thrusters ── */}
      <mesh position={[0, 0.4, -1.7]} castShadow>
        <boxGeometry args={[1.8, 0.5, 0.2]} />
        <meshPhysicalMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
      </mesh>
      {([-0.5, 0.5] as const).map((x, i) => (
        <group key={i} position={[x, 0.4, -1.8]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.15, 0.2, 0.3, 16]} />
            <meshPhysicalMaterial color="#333" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Thruster Flame */}
          <mesh position={[0, -0.2, 0]}>
            <coneGeometry args={[0.12, 0.6, 16]} />
            <meshPhysicalMaterial color={atkColor} emissive={atkColor} emissiveIntensity={isAttacking ? 5.0 : 2.0} transparent opacity={0.8} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* ── Energy Shields (if equipped) ── */}
      {isShield && (
        <group>
          <mesh position={[0, 0.8, 0]}>
            <sphereGeometry args={[2.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
            <meshPhysicalMaterial 
              color={defColor} emissive={defColor} emissiveIntensity={0.5} 
              transparent opacity={0.15} wireframe={true} toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <sphereGeometry args={[2.55, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
            <meshPhysicalMaterial 
              color={defColor} emissive={defColor} emissiveIntensity={0.2} 
              transparent opacity={0.1} transmission={1} roughness={0} toneMapped={false}
            />
          </mesh>
        </group>
      )}

      {/* ── Front Weapon Attachment ── */}
      <VehicleWeapon atkColor={atkColor} attackPartId={attackPartId || "attack-crusher"} isAttacking={!!isAttacking} />

      {/* Ground Projection Ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.0, 2.8, 64]} />
        <meshBasicMaterial color={atkColor} transparent opacity={0.1} toneMapped={false} />
      </mesh>
    </group>
  );
}
