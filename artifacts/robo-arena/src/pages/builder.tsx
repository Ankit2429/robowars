import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { WebGLErrorBoundary } from "@/components/WebGLErrorBoundary";
import { useWebGLSupported } from "@/hooks/useWebGL";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Float, Sparkles, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { HighFidelityRobotMesh } from "../components/RobotParts3D";
import { useListParts, useCreateRobot } from "@workspace/api-client-react";
import type { RobotPart } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, Wind, Battery, Loader2, ChevronRight, Check, AlertTriangle, Coins } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/context/SessionContext";

function RealisticEnvironment() {
  const { gl, scene } = useThree();
  
  useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const envTexture = pmrem.fromScene(new RoomEnvironment()).texture;
    scene.environment = envTexture;

    // Apply to all existing materials
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        child.material.envMap = envTexture;
        child.material.envMapIntensity = 1.2;
        child.material.needsUpdate = true;
      }
    });
  }, [gl, scene]);

  return null;
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

  const [activeTab, setActiveTab] = useState<"body" | "attack" | "secondary" | "defense" | "finalize">("body");
  const [selectedBodyId, setSelectedBodyId]             = useState<string>("");
  const [selectedAttackId, setSelectedAttackId]         = useState<string>("");
  const [selectedSecondaryId, setSelectedSecondaryId]   = useState<string>("");
  const [selectedDefenseId, setSelectedDefenseId]       = useState<string>("");
  const [robotName, setRobotName] = useState("");
  const [forgeError, setForgeError] = useState("");

  const bodyParts      = useMemo(() => parts?.filter(p => p.category === "body")      || [], [parts]);
  const attackParts    = useMemo(() => parts?.filter(p => p.category === "attack")    || [], [parts]);
  const secondaryParts = useMemo(() => parts?.filter(p => p.category === "secondary") || [], [parts]);
  const defenseParts   = useMemo(() => parts?.filter(p => p.category === "defense")   || [], [parts]);

  // Strict initialization guard to prevent duplicate state insertion
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    if (bodyParts.length > 0 && attackParts.length > 0 && secondaryParts.length > 0 && defenseParts.length > 0) {
      setSelectedBodyId(prev => prev || bodyParts[0].id);
      setSelectedAttackId(prev => prev || attackParts[0].id);
      setSelectedSecondaryId(prev => prev || secondaryParts[0].id);
      setSelectedDefenseId(prev => prev || defenseParts[0].id);
      setInitialized(true);
    }
  }, [bodyParts, attackParts, secondaryParts, defenseParts, initialized]);

  const selectedBody      = bodyParts.find(p => p.id === selectedBodyId) || bodyParts[0];
  const selectedAttack    = attackParts.find(p => p.id === selectedAttackId) || attackParts[0];
  const selectedSecondary = secondaryParts.find(p => p.id === selectedSecondaryId) || secondaryParts[0];
  const selectedDefense   = defenseParts.find(p => p.id === selectedDefenseId) || defenseParts[0];


  const totalStats = useMemo(() => ({
    armor:  (selectedBody?.stats.armor  || 0) + (selectedAttack?.stats.armor  || 0) + (selectedSecondary?.stats.armor  || 0) + (selectedDefense?.stats.armor  || 0),
    power:  (selectedBody?.stats.power  || 0) + (selectedAttack?.stats.power  || 0) + (selectedSecondary?.stats.power  || 0) + (selectedDefense?.stats.power  || 0),
    speed:  (selectedBody?.stats.speed  || 0) + (selectedAttack?.stats.speed  || 0) + (selectedSecondary?.stats.speed  || 0) + (selectedDefense?.stats.speed  || 0),
    energy: (selectedBody?.stats.energy || 0) + (selectedAttack?.stats.energy || 0) + (selectedSecondary?.stats.energy || 0) + (selectedDefense?.stats.energy || 0),
  }), [selectedBody, selectedAttack, selectedSecondary, selectedDefense]);

  const bodyCost      = selectedBody      ? calcPartCost("body",      selectedBody.stats)      : 0;
  const attackCost    = selectedAttack    ? calcPartCost("attack",    selectedAttack.stats)    : 0;
  const secondaryCost = selectedSecondary ? calcPartCost("secondary", selectedSecondary.stats) : 0;
  const defenseCost   = selectedDefense   ? calcPartCost("defense",   selectedDefense.stats)   : 0;
  const totalCost     = bodyCost + attackCost + secondaryCost + defenseCost;
  const canAfford     = (session?.points ?? 0) >= totalCost;

  const handleForge = (e: React.FormEvent) => {
    e.preventDefault();
    setForgeError("");
    if (!robotName || !selectedBodyId || !selectedAttackId || !selectedSecondaryId || !selectedDefenseId) return;
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
      secondaryPartId: selectedSecondaryId,
      defensePartId: selectedDefenseId,
      bodyColor:    selectedBody?.color    || "#556B2F",
      attackColor:  selectedAttack?.color  || "#FF4500",
      defenseColor: selectedDefense?.color || "#708090",
      stats: totalStats,
    };
    localStorage.setItem("roboArena_robot", JSON.stringify(robotData));

    deductPoints(totalCost);

    createRobot.mutate(
      { data: { name: robotName, playerName, bodyPartId: selectedBodyId, attackPartId: selectedAttackId, secondaryWeaponId: selectedSecondaryId, defensePartId: selectedDefenseId } },
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

  const getPartList   = () => activeTab === "body" ? bodyParts : activeTab === "attack" ? attackParts : activeTab === "secondary" ? secondaryParts : activeTab === "defense" ? defenseParts : [];
  const getSelectedId = () => activeTab === "body" ? selectedBodyId : activeTab === "attack" ? selectedAttackId : activeTab === "secondary" ? selectedSecondaryId : selectedDefenseId;
  const handleSelect  = (id: string) => {
    if (activeTab === "body")      setSelectedBodyId(id);
    if (activeTab === "attack")    setSelectedAttackId(id);
    if (activeTab === "secondary") setSelectedSecondaryId(id);
    if (activeTab === "defense")   setSelectedDefenseId(id);
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
            <Canvas 
              camera={{ fov: 48, position: [0, 4.2, 8.5] }}
              gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.4 }}
              shadows={{ type: THREE.PCFSoftShadowMap }}
            >
              <PerspectiveCamera makeDefault position={[0, 4.2, 8.5]} fov={48} />
              <color attach="background" args={[0x0a0a0f]} />
              <fogExp2 attach="fog" args={[0x0a0a0f, 0.035]} />
              
              <RealisticEnvironment />
              
              {/* Key light — main dramatic shadow */}
              <directionalLight position={[5, 8, 5]} intensity={2.5} color={0xfff5e8} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.001} />
              {/* Cool blue fill from left */}
              <directionalLight position={[-4, 3, -2]} intensity={0.8} color={0x4488cc} />
              {/* Orange rim light from behind */}
              <directionalLight position={[0, -2, -5]} intensity={0.6} color={0xff6622} />
              {/* Overhead fill */}
              <pointLight position={[0, 6, 0]} intensity={1.0} color={0xffffff} distance={20} />
              {/* Dark ambient */}
              <ambientLight intensity={0.4} color={0x223344} />

              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color={0x111111} metalness={0.3} roughness={0.7} />
              </mesh>
              <gridHelper args={[12, 24, 0x222222, 0x1a1a1a]} position={[0, -0.59, 0]} />

              
              <Sparkles count={60} scale={6} size={2.5} speed={0.4} opacity={0.6} color={selectedAttack?.color || "#FF4500"} />
              
              <Float speed={2} rotationIntensity={0.08} floatIntensity={0.18}>
                <HighFidelityRobotMesh 
                  bodyPart={selectedBody} 
                  attackPart={selectedAttack} 
                  defensePart={selectedDefense} 
                  secondaryPart={selectedSecondary} 
                  isForging={activeTab === "finalize"}
                />

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
            { id: "body",      label: "Chassis"    },
            { id: "attack",    label: "Weapon"     },
            { id: "secondary", label: "Secondary"  },
            { id: "defense",   label: "Defense"    },
            { id: "finalize",  label: "Forge"      },
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
