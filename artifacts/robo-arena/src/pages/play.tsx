import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Wifi, WifiOff, Swords, Bot, Loader2, X, Lock } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { useMockDB } from "./portal";

interface StoredRobot {
  playerName: string;
  robotName: string;
  bodyColor: string;
  attackColor: string;
  defenseColor: string;
  stats: { armor: number; power: number; speed: number; energy: number };
}

import { io, Socket } from "socket.io-client";

export default function Play() {
  const [, setLocation] = useLocation();
  const [myRobot, setMyRobot] = useState<StoredRobot | null>(null);
  const [matchState, setMatchState] = useState<"idle" | "awaiting_admin" | "searching" | "found">("idle");
  const [searchTime, setSearchTime] = useState(0);
  const [found, setFound] = useState<{ opponentName: string; roomId: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("roboArena_robot");
    if (saved) setMyRobot(JSON.parse(saved));

    // Initialize socket connection
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(apiUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    socket.on("connect", () => console.log("[Play] Socket connected"));
    socket.on("matchmakingStatusChanged", ({ active }) => {
      console.log("[Play] Matchmaking status changed:", active);
      if (active) {
        setMatchState(prev => prev === "awaiting_admin" ? "searching" : prev);
      } else {
        setMatchState(prev => prev === "searching" ? "awaiting_admin" : prev);
      }
    });

    socket.on("matchFound", ({ roomId, opponentName }) => {
      console.log("[Play] Match found!", { roomId, opponentName });
      setFound({ opponentName, roomId });
      setMatchState("found");
      setTimeout(() => {
        setLocation(`/battle/${roomId}`);
      }, 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (matchState === "searching") {
      timerRef.current = setInterval(() => setSearchTime(t => t + 1), 1000);
      
      // Notify backend we are searching
      if (socketRef.current && myRobot) {
        socketRef.current.emit("findMatch", { 
          playerName: myRobot.playerName, 
          robotId: (myRobot as any).robotId 
        });
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setSearchTime(0);
      if (matchState === "idle" && socketRef.current) {
        socketRef.current.emit("cancelMatch");
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [matchState, myRobot]);

  useEffect(() => {
    if (matchState === "awaiting_admin") {
      // Initial check
      customFetch<any>("/api/settings").then(settings => {
        if (settings.matchmakingActive) {
          setMatchState("searching");
        }
      }).catch(err => console.error("[Play] Initial settings check failed:", err));
    }
  }, [matchState]);

  const handleFindMatch = () => {
    if (!myRobot) return;
    setMatchState("awaiting_admin");
  };

  const handleCancel = () => {
    setMatchState("idle");
    setFound(null);
  };

  const handleAITraining = () => {
    setLocation("/battle/ai");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black font-display tracking-widest text-white mb-2">
            ENTER <span className="text-primary">COMBAT</span>
          </h1>
          <p className="font-mono text-muted-foreground tracking-widest text-sm">CHOOSE YOUR BATTLE MODE</p>
        </div>

        {/* Robot preview */}
        {myRobot ? (
          <div className="brutal-border bg-card p-4 mb-8 flex items-center gap-4">
            {/* Color swatch mini-robot */}
            <div className="flex gap-1 shrink-0">
              <div className="w-4 h-10 rounded-sm" style={{ backgroundColor: myRobot.bodyColor }} />
              <div className="w-4 h-8 rounded-sm mt-1" style={{ backgroundColor: myRobot.attackColor }} />
              <div className="w-4 h-8 rounded-sm mt-1" style={{ backgroundColor: myRobot.defenseColor }} />
            </div>
            <div className="flex-1">
              <div className="font-display text-xl text-white font-bold tracking-widest">{myRobot.robotName}</div>
              <div className="font-mono text-xs text-muted-foreground">PILOT: {myRobot.playerName}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-right">
              <span className="text-muted-foreground">PWR</span><span className="text-white">{myRobot.stats.power}</span>
              <span className="text-muted-foreground">SPD</span><span className="text-white">{myRobot.stats.speed}</span>
            </div>
          </div>
        ) : (
          <div className="brutal-border bg-card/50 p-6 mb-8 text-center">
            <Cpu className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-mono text-muted-foreground text-sm mb-3">No robot found. Build one first.</p>
            <button onClick={() => setLocation("/builder")} className="brutal-button px-6 py-2 text-sm text-primary border-primary">
              BUILD ROBOT
            </button>
          </div>
        )}

        {/* Mode buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Find Match */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleFindMatch}
            disabled={!myRobot || matchState !== "idle"}
            className="brutal-border bg-primary/10 border-primary p-8 flex flex-col items-center gap-4 hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center shadow-[0_0_20px_rgba(255,69,0,0.4)] group-hover:shadow-[0_0_30px_rgba(255,69,0,0.7)] transition-all">
              <Wifi className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <div className="font-display text-2xl font-bold text-white tracking-widest">FIND MATCH</div>
              <div className="font-mono text-xs text-muted-foreground mt-1">RANKED ONLINE BATTLE</div>
            </div>
          </motion.button>

          {/* AI Training */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAITraining}
            disabled={!myRobot}
            className="brutal-border bg-secondary/10 border-secondary p-8 flex flex-col items-center gap-4 hover:bg-secondary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="w-16 h-16 rounded-full border-2 border-secondary flex items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.4)] group-hover:shadow-[0_0_30px_rgba(0,255,255,0.7)] transition-all">
              <Bot className="h-8 w-8 text-secondary" />
            </div>
            <div className="text-center">
              <div className="font-display text-2xl font-bold text-white tracking-widest">AI TRAINING</div>
              <div className="font-mono text-xs text-muted-foreground mt-1">FIGHT CPU OPPONENT</div>
            </div>
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {matchState !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center"
          >
            <div className="brutal-border bg-card p-12 flex flex-col items-center gap-6 min-w-[320px]">
              {matchState === "found" && found ? (
                <>
                  <Swords className="h-16 w-16 text-primary animate-pulse" />
                  <div className="text-center">
                    <p className="font-mono text-xs text-muted-foreground tracking-widest mb-2">OPPONENT FOUND</p>
                    <p className="font-display text-3xl text-white font-bold">{found.opponentName}</p>
                  </div>
                  <p className="font-mono text-primary text-sm animate-pulse">ENTERING ARENA...</p>
                </>
              ) : matchState === "awaiting_admin" ? (
                <>
                  <div className="relative mb-2">
                    <Lock className="h-12 w-12 text-muted-foreground opacity-50" />
                  </div>
                  <div className="text-center">
                    <p className="font-display text-2xl text-white font-bold tracking-widest uppercase">AWAITING ADMIN</p>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground text-center">Matchmaking is currently locked.<br/>Please wait for the tournament to begin...</p>
                  <button onClick={handleCancel} className="brutal-button px-6 py-2 text-sm flex items-center gap-2 mt-4">
                    <X className="h-4 w-4" /> CANCEL
                  </button>
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    <Wifi className="h-8 w-8 text-primary absolute inset-0 m-auto" />
                  </div>
                  <div className="text-center">
                    <p className="font-display text-2xl text-white font-bold tracking-widest">SEARCHING</p>
                    <p className="font-mono text-muted-foreground text-sm mt-1">
                      {Math.floor(searchTime / 60).toString().padStart(2,"0")}:{(searchTime % 60).toString().padStart(2,"0")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-[200px]">
                    <button onClick={handleAITraining} className="brutal-button px-4 py-2 text-xs border-secondary text-secondary hover:bg-secondary hover:text-black transition-colors">
                      <Bot className="h-4 w-4 inline mr-2" /> PLAY VS AI
                    </button>
                    <button onClick={handleCancel} className="brutal-button px-4 py-2 text-xs flex items-center justify-center gap-2">
                      <X className="h-4 w-4" /> CANCEL
                    </button>
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground text-center mt-2">Waiting for an opponent...</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
