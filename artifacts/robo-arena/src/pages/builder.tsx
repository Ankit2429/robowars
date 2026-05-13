import { useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { WebGLErrorBoundary } from "@/components/WebGLErrorBoundary";
import { useWebGLSupported } from "@/hooks/useWebGL";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Float, Sparkles, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useListParts, useCreateRobot } from "@workspace/api-client-react";
import type { RobotPart } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, Wind, Battery, Loader2, ChevronRight, Check, AlertTriangle, Coins } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/context/SessionContext";

// ── 3-D vehicle weapon attachment ─────────────────────────────────────────────
function VehicleWeapon({ atkColor, name }: { atkColor: string; name: string }) {
  const lc = name.toLowerCase();
  const isCannon = lc.includes("cannon") || lc.includes("plasma") || lc.includes("rocket");
  const isSaw    = lc.includes("saw");

  if (isCannon) {
    return (
      <group position={[0, 0.44, 1.7]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.21, 1.35, 12]} />
          <meshStandardMaterial color={atkColor} metalness={0.3} roughness={0.3}
            emissive={atkColor} emissiveIntensity={0.75} />
        </mesh>
        <mesh position={[0, 0.68, 0]}>
          <sphereGeometry args={[0.21, 12, 12]} />
          <meshBasicMaterial color={atkColor} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.55, 8]} />
          <meshStandardMaterial color={atkColor} metalness={0.4} roughness={0.4}
            emissive={atkColor} emissiveIntensity={0.4} />
        </mesh>
      </group>
    );
  }

  if (isSaw) {
    return (
      <group position={[0, 0.36, 1.65]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.16, 20]} />
          <meshStandardMaterial color={atkColor} metalness={0.2} roughness={0.2}
            emissive={atkColor} emissiveIntensity={0.9} />
        </mesh>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={i}
            position={[Math.cos(i * Math.PI / 5) * 0.61, 0, Math.sin(i * Math.PI / 5) * 0.61]}
            rotation={[0, i * Math.PI / 5, 0]}
          >
            <boxGeometry args={[0.2, 0.16, 0.18]} />
            <meshStandardMaterial color={atkColor} emissive={atkColor} emissiveIntensity={1.0} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.2, 8]} />
          <meshStandardMaterial color="#222" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[0, 0.32, 1.52]}>
      <mesh position={[0, 0.04, -0.12]} castShadow>
        <boxGeometry args={[1.15, 0.22, 0.3]} />
        <meshStandardMaterial color={atkColor} metalness={0.4} roughness={0.35}
          emissive={atkColor} emissiveIntensity={0.5} />
      </mesh>
      {([-0.52, -0.17, 0.17, 0.52] as const).map((x, i) => (
        <mesh key={i} position={[x, -0.02, i % 2 === 0 ? 0.35 : 0.5]} castShadow>
          <boxGeometry args={[0.15, 0.22, 0.88]} />
          <meshStandardMaterial color={atkColor} metalness={0.35} roughness={0.3}
            emissive={atkColor} emissiveIntensity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// ── 3-D vehicle robot preview ──────────────────────────────────────────────────
function RobotMesh({ bodyPart, attackPart, defensePart }: {
  bodyPart?: RobotPart; attackPart?: RobotPart; defensePart?: RobotPart;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.8) * 0.05;
    }
  });

  const bodyColor = bodyPart?.color  || "#3a7bd5";
  const atkColor  = attackPart?.color  || "#dc143c";
  const defColor  = defensePart?.color || "#00bfff";
  const isShield  = defensePart?.name.toLowerCase().includes("shield") ||
                    defensePart?.name.toLowerCase().includes("energy");

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[2.0, 0.52, 2.9]} />
        <meshStandardMaterial color={bodyColor} metalness={0.45} roughness={0.4}
          emissive={bodyColor} emissiveIntensity={0.28} />
      </mesh>
      <mesh position={[0, 0.5, 1.5]} rotation={[0.45, 0, 0]} castShadow>
        <boxGeometry args={[1.8, 0.52, 0.2]} />
        <meshStandardMaterial color={bodyColor} metalness={0.55} roughness={0.35}
          emissive={bodyColor} emissiveIntensity={0.35} />
      </mesh>
      {([-1.1, 1.1] as const).map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.44, 0]} castShadow>
            <boxGeometry args={[0.17, 0.66, 2.6]} />
            <meshStandardMaterial color={defColor} metalness={0.4} roughness={0.38}
              emissive={defColor} emissiveIntensity={0.38} />
          </mesh>
          {([-0.88, 0, 0.88] as const).map((z, j) => (
            <mesh key={j} position={[x + (x > 0 ? 0.09 : -0.09), 0.5, z]}>
              <sphereGeometry args={[0.065, 6, 6]} />
              <meshBasicMaterial color={defColor} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.76, -0.38]} castShadow>
        <boxGeometry args={[1.05, 0.44, 1.32]} />
        <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.38}
          emissive={bodyColor} emissiveIntensity={0.42} />
      </mesh>
      <mesh position={[0, 0.79, 0.34]}>
        <boxGeometry args={[0.78, 0.11, 0.06]} />
        <meshBasicMaterial color={atkColor} />
      </mesh>
      <mesh position={[0, 1.0, -0.38]}>
        <cylinderGeometry args={[0.23, 0.23, 0.1, 10]} />
        <meshStandardMaterial color={bodyColor} metalness={0.7} roughness={0.3}
          emissive={bodyColor} emissiveIntensity={0.5} />
      </mesh>
      {([-0.62, 0.62] as const).map((x, i) => (
        <mesh key={i} position={[x, 0.38, 1.47]}>
          <boxGeometry args={[0.22, 0.1, 0.05]} />
          <meshBasicMaterial color={atkColor} />
        </mesh>
      ))}
      {([[-1.0, 0.27, 1.02], [1.0, 0.27, 1.02], [-1.0, 0.27, -1.02], [1.0, 0.27, -1.02]] as const).map(([x, y, z], i) => (
        <group key={i}>
          <mesh position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.34, 0.34, 0.3, 16]} />
            <meshStandardMaterial color="#0d0d0d" metalness={0.85} roughness={0.4} />
          </mesh>
          <mesh position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.32, 0.06, 6, 16]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.7} />
          </mesh>
          <mesh position={[x + (x > 0 ? 0.16 : -0.16), y, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.07, 8]} />
            <meshStandardMaterial color={defColor} metalness={0.7} emissive={defColor} emissiveIntensity={0.45} />
          </mesh>
        </group>
      ))}
      <VehicleWeapon atkColor={atkColor} name={attackPart?.name || ""} />
      {isShield ? (
        <>
          {([-1.28, 1.28] as const).map((x, i) => (
            <mesh key={i} position={[x, 0.52, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[2.5, 0.65]} />
              <meshStandardMaterial color={defColor} emissive={defColor} emissiveIntensity={0.75}
                transparent opacity={0.35} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </>
      ) : (
        <mesh position={[0, 0.42, -1.55]} castShadow>
          <boxGeometry args={[1.78, 0.6, 0.18]} />
          <meshStandardMaterial color={defColor} metalness={0.45} roughness={0.35}
            emissive={defColor} emissiveIntensity={0.4} />
        </mesh>
      )}
      {([-0.5, 0.5] as const).map((x, i) => (
        <mesh key={i} position={[x, 0.56, -1.52]}>
          <cylinderGeometry args={[0.09, 0.07, 0.4, 8]} />
          <meshStandardMaterial color="#111" emissive={atkColor} emissiveIntensity={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 2.5, 32]} />
        <meshBasicMaterial color={bodyColor} transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

function StatBar({ icon: Icon, label, value, barColor }: { icon: any; label: string; value: number; barColor: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded bg-background border border-border flex items-center justify-center" style={{ color: barColor }}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex justify-between text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <span>{label}</span>
          <span className="text-foreground font-bold">{value}</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (value / 300) * 100)}%`, backgroundColor: barColor }} />
        </div>
      </div>
    </div>
  );
}

export default function Builder() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const webGLSupported = useWebGLSupported();
  const { session, deductPoints, calcPartCost } = useSession();

  const { data: parts, isLoading: partsLoading } = useListParts();
  const createRobot = useCreateRobot();

  const [activeTab, setActiveTab] = useState<"body" | "attack" | "defense" | "finalize">("body");
  const [selectedBodyId, setSelectedBodyId]       = useState<string>("");
  const [selectedAttackId, setSelectedAttackId]   = useState<string>("");
  const [selectedDefenseId, setSelectedDefenseId] = useState<string>("");
  const [robotName, setRobotName] = useState("");
  const [forgeError, setForgeError] = useState("");

  const bodyParts    = useMemo(() => parts?.filter(p => p.category === "body")    || [], [parts]);
  const attackParts  = useMemo(() => parts?.filter(p => p.category === "attack")  || [], [parts]);
  const defenseParts = useMemo(() => parts?.filter(p => p.category === "defense") || [], [parts]);

  if (!selectedBodyId    && bodyParts.length    > 0) setSelectedBodyId(bodyParts[0].id);
  if (!selectedAttackId  && attackParts.length  > 0) setSelectedAttackId(attackParts[0].id);
  if (!selectedDefenseId && defenseParts.length > 0) setSelectedDefenseId(defenseParts[0].id);

  const selectedBody    = bodyParts.find(p => p.id === selectedBodyId);
  const selectedAttack  = attackParts.find(p => p.id === selectedAttackId);
  const selectedDefense = defenseParts.find(p => p.id === selectedDefenseId);

  const totalStats = useMemo(() => ({
    armor:  (selectedBody?.stats.armor  || 0) + (selectedAttack?.stats.armor  || 0) + (selectedDefense?.stats.armor  || 0),
    power:  (selectedBody?.stats.power  || 0) + (selectedAttack?.stats.power  || 0) + (selectedDefense?.stats.power  || 0),
    speed:  (selectedBody?.stats.speed  || 0) + (selectedAttack?.stats.speed  || 0) + (selectedDefense?.stats.speed  || 0),
    energy: (selectedBody?.stats.energy || 0) + (selectedAttack?.stats.energy || 0) + (selectedDefense?.stats.energy || 0),
  }), [selectedBody, selectedAttack, selectedDefense]);

  const bodyCost    = selectedBody    ? calcPartCost("body",    selectedBody.stats)    : 0;
  const attackCost  = selectedAttack  ? calcPartCost("attack",  selectedAttack.stats)  : 0;
  const defenseCost = selectedDefense ? calcPartCost("defense", selectedDefense.stats) : 0;
  const totalCost   = bodyCost + attackCost + defenseCost;
  const canAfford   = (session?.points ?? 0) >= totalCost;

  const handleForge = (e: React.FormEvent) => {
    e.preventDefault();
    setForgeError("");
    if (!robotName || !selectedBodyId || !selectedAttackId || !selectedDefenseId) return;
    if (!canAfford) {
      setForgeError(`Not enough points. Need ${totalCost.toLocaleString()} pts, you have ${(session?.points ?? 0).toLocaleString()} pts.`);
      return;
    }

    const playerName = session?.username ?? "PILOT";

    const robotData = {
      playerName,
      robotName,
      bodyPartId: selectedBodyId,
      attackPartId: selectedAttackId,
      defensePartId: selectedDefenseId,
      bodyColor:    selectedBody?.color    || "#556B2F",
      attackColor:  selectedAttack?.color  || "#FF4500",
      defenseColor: selectedDefense?.color || "#708090",
      stats: totalStats,
    };
    localStorage.setItem("roboArena_robot", JSON.stringify(robotData));

    deductPoints(totalCost);

    createRobot.mutate(
      { data: { name: robotName, playerName, bodyPartId: selectedBodyId, attackPartId: selectedAttackId, defensePartId: selectedDefenseId } },
      {
        onSuccess: (newRobot) => {
          queryClient.invalidateQueries({ queryKey: ["/api/robots"] });
          localStorage.setItem("roboArena_robot", JSON.stringify({ ...robotData, robotId: newRobot.id }));
        },
        onError: () => {},
      }
    );

    setLocation("/play");
  };

  const getPartList   = () => activeTab === "body" ? bodyParts : activeTab === "attack" ? attackParts : activeTab === "defense" ? defenseParts : [];
  const getSelectedId = () => activeTab === "body" ? selectedBodyId : activeTab === "attack" ? selectedAttackId : selectedDefenseId;
  const handleSelect  = (id: string) => {
    if (activeTab === "body")    setSelectedBodyId(id);
    if (activeTab === "attack")  setSelectedAttackId(id);
    if (activeTab === "defense") setSelectedDefenseId(id);
  };

  const getPartCostForList = (part: RobotPart) =>
    calcPartCost(part.category, part.stats);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* ── 3-D Viewport ── */}
      <div className="relative w-full lg:w-3/5 h-[50vh] lg:h-full bg-background border-b lg:border-b-0 lg:border-r border-border">
        <div className="absolute top-4 left-4 z-10 font-mono text-xs text-primary/50 tracking-widest uppercase">
          SYS.BUILD.VER.9.4.2 // ONLINE
        </div>
        <div className="absolute bottom-4 right-4 z-10 font-mono text-xs text-primary/50 tracking-widest uppercase">
          VIEW: ORBIT_360
        </div>

        {webGLSupported ? (
          <WebGLErrorBoundary>
            <Canvas camera={{ fov: 48, position: [0, 4.2, 8.5] }}>
              <PerspectiveCamera makeDefault position={[0, 4.2, 8.5]} fov={48} />
              <color attach="background" args={["#0d0d1a"]} />
              <fog attach="fog" args={["#0d0d1a", 8, 22]} />
              <ambientLight intensity={2.8} color="#ffffff" />
              <pointLight position={[0, 6, 4]} intensity={4} color="#ffffff" />
              <spotLight position={[5, 10, 5]}  angle={0.35} penumbra={1} intensity={4} color="#FF6020" />
              <spotLight position={[-5, 10, -5]} angle={0.35} penumbra={1} intensity={4} color="#00E5FF" />
              <pointLight position={[0, -1, 0]} intensity={2} color={selectedBody?.color || "#FF4500"} />
              <Sparkles count={60} scale={6} size={2.5} speed={0.4} opacity={0.6} color={selectedAttack?.color || "#FF4500"} />
              <mesh receiveShadow position={[0, -0.5, 0]}>
                <cylinderGeometry args={[2.5, 3, 1, 32]} />
                <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh receiveShadow position={[0, 0.02, 0]}>
                <cylinderGeometry args={[2.0, 2.2, 0.18, 32]} />
                <meshStandardMaterial color="#22223b" metalness={0.9} roughness={0.1}
                  emissive={selectedBody?.color || "#FF4500"} emissiveIntensity={0.5} />
              </mesh>
              <Float speed={2} rotationIntensity={0.08} floatIntensity={0.18}>
                <RobotMesh bodyPart={selectedBody} attackPart={selectedAttack} defensePart={selectedDefense} />
              </Float>
              <ContactShadows position={[0, 0.1, 0]} opacity={0.6} scale={5} blur={2} far={4} />
              <OrbitControls
                makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 + 0.1}
                enableZoom minDistance={4} maxDistance={15}
                autoRotate autoRotateSpeed={0.6}
              />
            </Canvas>
          </WebGLErrorBoundary>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-center p-6 bg-[#0a0a12]">
            {(() => {
              const bc = selectedBody?.color    || "#3a7bd5";
              const ac = selectedAttack?.color  || "#dc143c";
              const dc = selectedDefense?.color || "#00bfff";
              return (
                <div className="relative inline-block" style={{ filter: `drop-shadow(0 0 18px ${bc}88)` }}>
                  <div className="absolute left-1/2 -translate-x-1/2" style={{ top: -14, width: 56, height: 16, backgroundColor: bc + "cc", border: `2px solid ${bc}`, borderRadius: 3 }}>
                    <div style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 14, height: 5, backgroundColor: ac, borderRadius: 1 }} />
                  </div>
                  <div className="relative" style={{ width: 124, height: 52, backgroundColor: bc + "44", border: `3px solid ${bc}`, borderRadius: 4, boxShadow: `0 0 22px ${bc}55` }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, backgroundColor: dc, borderRadius: "3px 0 0 3px" }} />
                    <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 5, backgroundColor: dc, borderRadius: "0 3px 3px 0" }} />
                    <div style={{ position: "absolute", right: -4, top: "25%", width: 5, height: 8, backgroundColor: ac, borderRadius: 2 }} />
                    {[-10, 10].map(y => (
                      <div key={y} style={{ position: "absolute", left: -4, top: `calc(50% + ${y}px)`, width: 4, height: 4, backgroundColor: ac, borderRadius: 2 }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0 6px", marginTop: 3 }}>
                    {[0,1].map(i => (
                      <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#111", border: `3px solid ${dc}`, boxShadow: `0 0 8px ${dc}66` }} />
                    ))}
                  </div>
                </div>
              );
            })()}
            <p className="font-display text-sm text-primary uppercase tracking-widest mt-2">Robot Preview</p>
          </div>
        )}

        {/* Stats Overlay */}
        <div className="absolute bottom-4 left-4 w-64 bg-card/80 backdrop-blur brutal-border p-4 z-10 pointer-events-none">
          <h3 className="font-display font-bold uppercase tracking-widest text-white mb-3 text-sm border-b border-border/50 pb-2">Combat Specs</h3>
          <div className="space-y-3">
            <StatBar icon={Shield}  label="Armor"  value={totalStats.armor}  barColor="#94a3b8" />
            <StatBar icon={Zap}     label="Power"  value={totalStats.power}  barColor="#ef4444" />
            <StatBar icon={Wind}    label="Speed"  value={totalStats.speed}  barColor="#22d3ee" />
            <StatBar icon={Battery} label="Energy" value={totalStats.energy} barColor="#eab308" />
          </div>
        </div>
      </div>

      {/* ── Config Panel ── */}
      <div className="w-full lg:w-2/5 h-[50vh] lg:h-full bg-card flex flex-col relative z-10">
        <div className="scanlines opacity-50" />

        {/* Budget bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Budget</span>
          </div>
          <motion.div
            key={session?.points}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="font-display font-bold text-primary text-sm tabular-nums"
          >
            {(session?.points ?? 0).toLocaleString()} pts
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-background">
          {[
            { id: "body",     label: "Chassis"    },
            { id: "attack",   label: "Weapon"     },
            { id: "defense",  label: "Defense"    },
            { id: "finalize", label: "Forge"      },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 text-xs font-display uppercase tracking-widest transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {partsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeTab !== "finalize" ? (
            <div className="grid grid-cols-1 gap-4">
              {getPartList().map(part => {
                const isSelected = getSelectedId() === part.id;
                const partCost   = getPartCostForList(part);
                const affordable = (session?.points ?? 0) >= partCost;
                return (
                  <button
                    key={part.id}
                    onClick={() => handleSelect(part.id)}
                    className={`text-left brutal-border p-4 transition-all relative overflow-hidden group ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/50 shadow-[0_0_15px_rgba(255,69,0,0.2)]"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: part.color }} />

                    {isSelected && (
                      <div className="absolute top-0 right-0 bg-primary text-black text-[10px] font-bold px-2 py-1 flex items-center gap-1">
                        <Check className="h-3 w-3" /> EQUIPPED
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-3 pl-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: part.color }} />
                          <h4 className={`font-display text-xl font-bold uppercase tracking-widest ${isSelected ? "text-white" : "text-foreground group-hover:text-primary transition-colors"}`}>
                            {part.name}
                          </h4>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">{part.description}</p>
                      </div>
                      {/* Cost badge */}
                      <div className={`shrink-0 ml-3 flex items-center gap-1 px-2 py-1 border text-xs font-mono font-bold ${
                        affordable ? "border-primary/40 text-primary bg-primary/5" : "border-red-500/40 text-red-400 bg-red-500/5"
                      }`}>
                        <Zap className="h-3 w-3" />
                        {partCost}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pl-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-muted-foreground">ARMOR</span>
                        <span className="text-white">{part.stats.armor}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-muted-foreground">POWER</span>
                        <span className="text-white">{part.stats.power}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-muted-foreground">SPEED</span>
                        <span className="text-white">{part.stats.speed}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-muted-foreground">ENERGY</span>
                        <span className="text-white">{part.stats.energy}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <h2 className="text-3xl font-display font-black text-white uppercase tracking-widest mb-6 border-b border-border pb-4">
                System <span className="text-primary">Forge</span>
              </h2>

              <form onSubmit={handleForge} className="space-y-6 flex-1 flex flex-col">
                <div className="space-y-2">
                  <Label htmlFor="robotName" className="font-mono text-xs uppercase tracking-widest text-primary">Mecha Designation</Label>
                  <Input
                    id="robotName" value={robotName} onChange={e => setRobotName(e.target.value)}
                    className="font-mono bg-background border-primary/30 focus-visible:ring-primary h-14 text-lg"
                    placeholder="e.g. CRIMSON_TYPHOON" required
                  />
                </div>

                {/* Pilot ID (from session, read-only) */}
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Pilot</Label>
                  <div className="h-10 flex items-center px-3 border border-border bg-muted/30 font-mono text-sm text-white/70 tracking-widest">
                    {session?.username ?? "—"}
                  </div>
                </div>

                {/* Cost breakdown */}
                <div className="bg-background border border-border p-4 font-mono text-xs space-y-2">
                  <p className="text-muted-foreground uppercase tracking-widest border-b border-border pb-2 mb-2">Build Cost</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chassis — {selectedBody?.name}</span>
                    <span className="text-white">{bodyCost} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weapon — {selectedAttack?.name}</span>
                    <span className="text-white">{attackCost} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Defense — {selectedDefense?.name}</span>
                    <span className="text-white">{defenseCost} pts</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 mt-2">
                    <span className="text-primary font-bold uppercase">Total Cost</span>
                    <span className={`font-bold ${canAfford ? "text-primary" : "text-red-400"}`}>{totalCost} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Balance</span>
                    <span className={canAfford ? "text-white" : "text-red-400"}>{(session?.points ?? 0).toLocaleString()} pts</span>
                  </div>
                  {canAfford && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">After Forge</span>
                      <span className="text-green-400">{((session?.points ?? 0) - totalCost).toLocaleString()} pts</span>
                    </div>
                  )}
                </div>

                <div className="bg-background border border-border p-4 font-mono text-xs text-muted-foreground space-y-2">
                  <p className="text-green-500">{">"} DIAGNOSTIC CHECK RUNNING...</p>
                  <p>{">"} CHASSIS: {selectedBody?.name} [OK]</p>
                  <p>{">"} WEAPON: {selectedAttack?.name} [OK]</p>
                  <p>{">"} SHIELD: {selectedDefense?.name} [OK]</p>
                  <p className={canAfford ? "text-primary animate-pulse" : "text-red-400"}>
                    {">"} {canAfford ? "READY FOR DEPLOYMENT." : `INSUFFICIENT FUNDS — NEED ${totalCost - (session?.points ?? 0)} MORE PTS.`}
                  </p>
                </div>

                {forgeError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-400 text-xs font-mono border border-red-500/30 bg-red-500/5 p-3"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {forgeError}
                  </motion.div>
                )}

                <div className="mt-auto pt-4">
                  <Button
                    type="submit"
                    className={`w-full h-16 brutal-button text-lg ${
                      canAfford
                        ? "bg-primary/10 text-primary hover:bg-primary hover:text-black border-primary shadow-[0_0_20px_rgba(255,69,0,0.3)]"
                        : "bg-red-500/5 text-red-400 border-red-500/40 cursor-not-allowed"
                    }`}
                    disabled={createRobot.isPending || !robotName || !canAfford}
                    data-testid="btn-forge-robot"
                  >
                    {createRobot.isPending ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : canAfford ? (
                      <span className="flex items-center gap-2">
                        FORGE ROBOT <span className="text-sm opacity-70">(-{totalCost} pts)</span>
                      </span>
                    ) : (
                      "INSUFFICIENT POINTS"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer Nav */}
        <div className="p-4 bg-background border-t border-border flex justify-between">
          <button
            className="brutal-button px-4 py-2 text-xs opacity-70 hover:opacity-100 disabled:opacity-30"
            onClick={() => {
              if (activeTab === "attack")   setActiveTab("body");
              if (activeTab === "defense")  setActiveTab("attack");
              if (activeTab === "finalize") setActiveTab("defense");
            }}
            disabled={activeTab === "body"}
          >
            PREVIOUS
          </button>
          <button
            className="brutal-button px-4 py-2 text-xs border-secondary text-secondary hover:bg-secondary hover:text-black"
            onClick={() => {
              if (activeTab === "body")     setActiveTab("attack");
              else if (activeTab === "attack")   setActiveTab("defense");
              else if (activeTab === "defense")  setActiveTab("finalize");
            }}
            disabled={activeTab === "finalize"}
          >
            NEXT PHASE <ChevronRight className="h-4 w-4 ml-1 inline" />
          </button>
        </div>
      </div>
    </div>
  );
}
