import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Swords, Zap, Shield, Crown, Target, Activity } from "lucide-react";
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
}

interface TournamentData {
  tournament: {
    id: number;
    activeMatchId: number | null;
    currentRound: number;
    totalRounds: number;
  } | null;
  matches: TMatch[];
}

export default function CastPage() {
  const [data, setData] = useState<TournamentData | null>(null);
  const [activeMatch, setActiveMatch] = useState<TMatch | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const loadData = async () => {
    try {
      const res = await customFetch<TournamentData>("/api/tournament");
      setData(res);
      if (res.tournament?.activeMatchId) {
        const match = res.matches.find(m => m.id === res.tournament!.activeMatchId);
        setActiveMatch(match || null);
      } else {
        setActiveMatch(null);
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

    socket.on("bracket_updated", () => {
      loadData();
    });

    return () => { socket.disconnect(); };
  }, []);

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col overflow-hidden relative">
      <div className="scanlines opacity-20 pointer-events-none" />
      <div className="crt-flicker opacity-10 pointer-events-none" />

      {/* Esports Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-primary/20 blur-[2px]" />
        <div className="absolute top-0 right-1/4 w-[1px] h-full bg-primary/20 blur-[2px]" />
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-primary/10" />
        <motion.div 
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px]" 
        />
      </div>

      {/* Top Bar */}
      <header className="relative z-10 h-24 border-b border-white/10 bg-black/60 backdrop-blur-xl flex items-center justify-between px-12">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded border border-primary/40 bg-primary/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,69,0,0.2)]">
            <Trophy className="text-primary w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-2xl uppercase tracking-[0.2em] italic">RoboWars <span className="text-primary">Pro Series</span></h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Live Cast System • Secure Feed</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="font-mono text-xs text-white/40 uppercase tracking-[0.3em] mb-1">Current Protocol</p>
          <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
            <span className="font-display font-black text-sm uppercase tracking-widest">
              {data?.tournament ? `Round ${data.tournament.currentRound} / ${data.tournament.totalRounds}` : "Waiting for Tournament"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Cast Area */}
      <main className="flex-1 relative z-10 flex items-center justify-center p-12">
        <AnimatePresence mode="wait">
          {!activeMatch ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center space-y-4"
            >
              <div className="relative inline-block">
                <Shield className="w-24 h-24 text-white/5 mx-auto" />
                <Activity className="absolute inset-0 w-8 h-8 text-primary animate-pulse m-auto" />
              </div>
              <h2 className="font-display text-4xl font-black uppercase tracking-[0.3em] text-white/20">Awaiting Match Initiation</h2>
              <p className="font-mono text-xs text-white/10 uppercase tracking-widest">Waiting for administrator to assign combat units</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeMatch.id}
              className="w-full max-w-7xl grid grid-cols-[1fr_auto_1fr] items-center gap-0 h-[500px]"
            >
              {/* Left Player Panel */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="h-full relative flex flex-col justify-center items-end text-right pr-16"
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-32 bg-primary/50 shadow-[0_0_20px_rgba(255,69,0,0.5)]" />
                <p className="font-mono text-xs text-primary/60 uppercase tracking-[0.5em] mb-4">Challenger One</p>
                <h2 className="font-display text-7xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] mb-2">
                  {activeMatch.player1Name}
                </h2>
                <div className="flex items-center gap-3 text-white/40">
                  <span className="font-mono text-sm uppercase tracking-[0.2em]">{activeMatch.player1RobotName}</span>
                  <Target className="w-4 h-4 text-primary/40" />
                </div>
                
                {/* Visual Accent */}
                <div className="mt-12 flex gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ opacity: [0.1, 0.4, 0.1] }}
                      transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                      className="w-12 h-1 bg-primary/20" 
                    />
                  ))}
                </div>
              </motion.div>

              {/* Center VS */}
              <div className="relative flex items-center justify-center px-12">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 100 }}
                  className="relative z-20"
                >
                  <div className="w-32 h-32 rounded-full border-4 border-primary bg-black flex items-center justify-center shadow-[0_0_50px_rgba(255,69,0,0.4)]">
                    <span className="font-display text-5xl font-black italic tracking-tighter text-white">VS</span>
                  </div>
                  
                  {/* Rotating Rings */}
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-4 border border-dashed border-primary/30 rounded-full"
                  />
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-8 border border-dotted border-white/10 rounded-full"
                  />
                </motion.div>
                
                {/* Vertical Split Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[600px] bg-gradient-to-b from-transparent via-primary/40 to-transparent blur-[2px]" />
              </div>

              {/* Right Player Panel */}
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="h-full relative flex flex-col justify-center items-start text-left pl-16"
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-32 bg-primary/50 shadow-[0_0_20px_rgba(255,69,0,0.5)]" />
                <p className="font-mono text-xs text-primary/60 uppercase tracking-[0.5em] mb-4">Challenger Two</p>
                <h2 className="font-display text-7xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] mb-2">
                  {activeMatch.player2Name}
                </h2>
                <div className="flex items-center gap-3 text-white/40">
                  <Target className="w-4 h-4 text-primary/40" />
                  <span className="font-mono text-sm uppercase tracking-[0.2em]">{activeMatch.player2RobotName}</span>
                </div>

                {/* Visual Accent */}
                <div className="mt-12 flex gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ opacity: [0.1, 0.4, 0.1] }}
                      transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                      className="w-12 h-1 bg-primary/20" 
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Ticker/Overlay */}
      <footer className="relative z-10 h-20 bg-black/80 backdrop-blur-md border-t border-white/5 flex items-center px-12 overflow-hidden">
        <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-8">
              <span className="flex items-center gap-3">
                <Zap className="w-3 h-3 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">Spectator Mode Active</span>
              </span>
              <span className="flex items-center gap-3">
                <Shield className="w-3 h-3 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">Neural Link Stable</span>
              </span>
              <span className="flex items-center gap-3">
                <Activity className="w-3 h-3 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">Telemetry Synchronized</span>
              </span>
            </div>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
