import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Swords, Zap, Shield, Crown, Target, Activity, Maximize2, Minimize2 } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/api-url";
import { customFetch } from "@workspace/api-client-react";

interface TMatch {
  id: number;
  player1Name: string | null;
  player2Name: string | null;
  player1RobotName: string | null;
  player2RobotName: string | null;
  roundNumber: number;
  status: string;
  winnerId: number | null;
  winnerName: string | null;
  player1Id: number | null;
  player2Id: number | null;
}

interface TournamentData {
  tournament: {
    id: number;
    activeMatchId: number | null;
    currentRound: number;
    totalRounds: number;
    status: string;
    winnerId: number | null;
  } | null;
  matches: TMatch[];
  players: Array<{ id: number; pilotName: string }>;
}

export default function CastPage() {
  const [data, setData] = useState<TournamentData | null>(null);
  const [activeMatch, setActiveMatch] = useState<TMatch | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [champion, setChampion] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const res = await customFetch<TournamentData>("/api/tournament");
      setData(res);
      if (res.tournament?.activeMatchId) {
        const match = res.matches?.find(m => m.id === res.tournament!.activeMatchId);
        setActiveMatch(match || null);
      } else {
        setActiveMatch(null);
      }
      if (res.tournament?.status === "finished" && res.tournament.winnerId) {
        const winner = res.players?.find(p => p.id === res.tournament!.winnerId);
        if (winner) setChampion(winner.pilotName);
      }
    } catch (e) {
      console.error("Failed to load cast data", e);
    }
  };

  useEffect(() => {
    loadData();
    const socket = io(getApiUrl(), {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;
    socket.on("bracket_updated", () => { loadData(); });
    return () => { socket.disconnect(); };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const isMatchFinished = activeMatch?.status === "finished";
  const winner1 = isMatchFinished && activeMatch?.winnerId === activeMatch?.player1Id;
  const winner2 = isMatchFinished && activeMatch?.winnerId === activeMatch?.player2Id;

  return (
    <div ref={containerRef} className="min-h-screen bg-[#050508] text-white flex flex-col overflow-hidden relative">
      <div className="scanlines opacity-20 pointer-events-none" />

      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-primary/20 blur-[2px]" />
        <div className="absolute top-0 right-1/4 w-[1px] h-full bg-primary/20 blur-[2px]" />
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-primary/10" />
        <motion.div
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-primary/5 blur-[140px]"
        />
        {["top-6 left-6 border-t border-l", "top-6 right-6 border-t border-r", "bottom-6 left-6 border-b border-l", "bottom-6 right-6 border-b border-r"].map((cls, i) => (
          <div key={i} className={`absolute ${cls} w-8 h-8 border-primary/20`} />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 h-20 border-b border-white/10 bg-black/70 backdrop-blur-xl flex items-center justify-between px-10">
        <div className="flex items-center gap-5">
          <motion.div
            animate={{ boxShadow: ["0 0 10px rgba(255,69,0,0.2)", "0 0 25px rgba(255,69,0,0.5)", "0 0 10px rgba(255,69,0,0.2)"] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-10 h-10 rounded border border-primary/60 bg-primary/10 flex items-center justify-center"
          >
            <Trophy className="text-primary w-5 h-5" />
          </motion.div>
          <div>
            <h1 className="font-black text-xl uppercase tracking-[0.25em] italic">
              RoboWars <span className="text-primary">Pro Series</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-2 h-2 rounded-full bg-red-500 block" />
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Live Cast • Neural Link Stable</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {data?.tournament && (
            <div className="px-5 py-2 bg-white/5 border border-white/10 rounded-full">
              <span className="font-display font-black text-sm uppercase tracking-widest">
                Round {data.tournament.currentRound} / {data.tournament.totalRounds}
              </span>
            </div>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 border border-white/10 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-white/60 hover:text-white"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 relative z-10 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">

          {/* Champion */}
          {champion && (
            <motion.div key="champion" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center space-y-6">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-8xl">🏆</motion.div>
              <p className="font-mono text-primary/70 uppercase tracking-[0.5em] text-sm">Tournament Champion</p>
              <motion.h2
                animate={{ textShadow: ["0 0 20px rgba(255,200,0,0.3)", "0 0 60px rgba(255,200,0,0.8)", "0 0 20px rgba(255,200,0,0.3)"] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="font-display text-8xl font-black uppercase tracking-widest text-yellow-400"
              >
                {champion}
              </motion.h2>
            </motion.div>
          )}

          {/* Waiting */}
          {!champion && !activeMatch && (
            <motion.div key="waiting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center space-y-5">
              <div className="relative inline-block">
                <Shield className="w-28 h-28 text-white/[0.03] mx-auto" />
                <Activity className="absolute inset-0 w-10 h-10 text-primary/40 animate-pulse m-auto" />
              </div>
              <h2 className="font-display text-5xl font-black uppercase tracking-[0.3em] text-white/20">Awaiting Combat</h2>
              <p className="font-mono text-xs text-white/10 uppercase tracking-widest">Standby — Admin assigning combatants</p>
            </motion.div>
          )}

          {/* Active Match */}
          {!champion && activeMatch && (
            <motion.div key={activeMatch.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-[1400px] grid grid-cols-[1fr_auto_1fr] items-center gap-0 h-[480px]">

              {/* Left Player */}
              <motion.div
                initial={{ x: -120, opacity: 0 }}
                animate={{ x: 0, opacity: winner2 ? 0.25 : 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="h-full relative flex flex-col justify-center items-end text-right pr-20"
              >
                {winner1 && <motion.div animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-yellow-400/5 rounded-xl" />}
                <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-40 rounded-full transition-all duration-500 ${winner1 ? "bg-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.8)]" : "bg-primary/50 shadow-[0_0_20px_rgba(255,69,0,0.5)]"}`} />
                <p className="font-mono text-xs text-primary/50 uppercase tracking-[0.5em] mb-6">Challenger One</p>
                <motion.h2
                  className="font-display font-black uppercase tracking-widest text-white mb-3 leading-none"
                  style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
                  animate={winner1 ? { color: ["#ffffff", "#fbbf24", "#ffffff"] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {activeMatch.player1Name}
                </motion.h2>
                <div className="flex items-center justify-end gap-3 text-white/30">
                  <span className="font-mono text-sm uppercase tracking-[0.2em]">{activeMatch.player1RobotName}</span>
                  <Target className="w-4 h-4 text-primary/30" />
                </div>
                {winner1 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mt-6 justify-end">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="font-mono text-xs text-yellow-400 uppercase tracking-widest">WINNER</span>
                  </motion.div>
                )}
                <div className="mt-10 flex gap-2 justify-end">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.div key={i} animate={{ opacity: [0.05, 0.3, 0.05] }} transition={{ duration: 2.5, delay: i * 0.15, repeat: Infinity }} className="w-10 h-1 bg-primary/20 rounded-full" />
                  ))}
                </div>
              </motion.div>

              {/* Center VS */}
              <div className="relative flex items-center justify-center px-10 z-10">
                <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 10, stiffness: 80, delay: 0.3 }} className="relative z-20">
                  <motion.div
                    animate={isMatchFinished ? {} : { boxShadow: ["0 0 20px rgba(255,69,0,0.3)", "0 0 60px rgba(255,69,0,0.7)", "0 0 20px rgba(255,69,0,0.3)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-36 h-36 rounded-full border-4 border-primary bg-black flex items-center justify-center"
                  >
                    <span className="font-display text-5xl font-black italic tracking-tighter text-white">{isMatchFinished ? "✓" : "VS"}</span>
                  </motion.div>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} className="absolute -inset-4 border border-dashed border-primary/25 rounded-full" />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} className="absolute -inset-9 border border-dotted border-white/[0.08] rounded-full" />
                </motion.div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[700px] bg-gradient-to-b from-transparent via-primary/30 to-transparent blur-[1px]" />
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black border border-white/10 rounded-full whitespace-nowrap">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">Match {activeMatch.id} · Round {activeMatch.roundNumber}</span>
                </div>
              </div>

              {/* Right Player */}
              <motion.div
                initial={{ x: 120, opacity: 0 }}
                animate={{ x: 0, opacity: winner1 ? 0.25 : 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="h-full relative flex flex-col justify-center items-start text-left pl-20"
              >
                {winner2 && <motion.div animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-yellow-400/5 rounded-xl" />}
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-40 rounded-full transition-all duration-500 ${winner2 ? "bg-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.8)]" : "bg-primary/50 shadow-[0_0_20px_rgba(255,69,0,0.5)]"}`} />
                <p className="font-mono text-xs text-primary/50 uppercase tracking-[0.5em] mb-6">Challenger Two</p>
                <motion.h2
                  className="font-display font-black uppercase tracking-widest text-white mb-3 leading-none"
                  style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
                  animate={winner2 ? { color: ["#ffffff", "#fbbf24", "#ffffff"] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {activeMatch.player2Name}
                </motion.h2>
                <div className="flex items-center gap-3 text-white/30">
                  <Target className="w-4 h-4 text-primary/30" />
                  <span className="font-mono text-sm uppercase tracking-[0.2em]">{activeMatch.player2RobotName}</span>
                </div>
                {winner2 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mt-6">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="font-mono text-xs text-yellow-400 uppercase tracking-widest">WINNER</span>
                  </motion.div>
                )}
                <div className="mt-10 flex gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.div key={i} animate={{ opacity: [0.05, 0.3, 0.05] }} transition={{ duration: 2.5, delay: i * 0.15, repeat: Infinity }} className="w-10 h-1 bg-primary/20 rounded-full" />
                  ))}
                </div>
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Ticker */}
      <footer className="relative z-10 h-16 bg-black/80 backdrop-blur-md border-t border-white/5 flex items-center overflow-hidden">
        <div className="flex items-center gap-12 animate-marquee whitespace-nowrap pl-12">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-12">
              <span className="flex items-center gap-3"><Zap className="w-3 h-3 text-primary" /><span className="font-mono text-[10px] uppercase tracking-widest text-white/30">Spectator Mode Active</span></span>
              <span className="flex items-center gap-3"><Shield className="w-3 h-3 text-primary" /><span className="font-mono text-[10px] uppercase tracking-widest text-white/30">Neural Link Stable</span></span>
              <span className="flex items-center gap-3"><Trophy className="w-3 h-3 text-primary" /><span className="font-mono text-[10px] uppercase tracking-widest text-white/30">RoboWars Pro Series 2026</span></span>
              <span className="flex items-center gap-3"><Swords className="w-3 h-3 text-primary" /><span className="font-mono text-[10px] uppercase tracking-widest text-white/30">Combat Telemetry Synchronized</span></span>
            </div>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 40s linear infinite; }
      `}</style>
    </div>
  );
}
