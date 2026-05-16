import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { io, Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/api-url";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, LayoutDashboard, Trophy, Users, Shield, LogOut, RefreshCw, Play, Square, ArrowLeft } from "lucide-react";
import { useSession } from "@/context/SessionContext";

export default function Admin() {
  const { logout: playerLogout } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authKey, setAuthKey] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [shake, setShake] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"roster" | "bracket" | "codes">("roster");
  
  const [players, setPlayers] = useState<any[]>([]);
  const [matchmakingActive, setMatchmakingActive] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [codes, setCodes] = useState<string[]>([]);
  const [newCode, setNewCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    document.body.classList.add('cyber-landing');
    if (isAuthenticated) {
      refreshData();
      
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
      
      socket.on("queueUpdate", ({ count }) => {
        setQueueCount(count);
      });
    }
    return () => {
      document.body.classList.remove('cyber-landing');
      socketRef.current?.disconnect();
    };
  }, [isAuthenticated]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, playersRes] = await Promise.all([
        customFetch<any>("/api/settings"),
        customFetch<any[]>("/api/players")
      ]);
      setMatchmakingActive(settingsRes.matchmakingActive);
      setCodes(settingsRes.codes);
      setPlayers(playersRes);
    } catch (err) {
      console.error("[Admin] Failed to refresh data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authKey === "admin321") {
      setIsAuthenticated(true);
      setAuthMsg("");
    } else {
      setAuthMsg("INVALID ACCESS CODE");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCode && !codes.includes(newCode)) {
      try {
        await customFetch("/api/settings/codes", {
          method: "POST",
          body: JSON.stringify({ code: newCode, action: "add" })
        });
        setCodes([...codes, newCode]);
        setNewCode("");
      } catch (err) {
        console.error("[Admin] Failed to add code:", err);
      }
    }
  };

  const handleDeleteCode = async (codeToRemove: string) => {
    try {
      await customFetch("/api/settings/codes", {
        method: "POST",
        body: JSON.stringify({ code: codeToRemove, action: "remove" })
      });
      setCodes(codes.filter((c: string) => c !== codeToRemove));
    } catch (err) {
      console.error("[Admin] Failed to remove code:", err);
    }
  };

  const toggleMatchmaking = async () => {
    const newState = !matchmakingActive;
    try {
      await customFetch("/api/settings/matchmaking", {
        method: "POST",
        body: JSON.stringify({ active: newState })
      });
      setMatchmakingActive(newState);
    } catch (err) {
      console.error("[Admin] Failed to toggle matchmaking:", err);
    }
  };

  const handleGenerateBracket = () => {
    if (socketRef.current) {
      socketRef.current.emit("generateBracket");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden">
        <div className="scanlines opacity-40" />
        <div className="crt-flicker" />
        
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[700px] h-[700px] rounded-full bg-primary/10 blur-[140px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md px-8 py-12 border border-primary/20 bg-black/60 backdrop-blur-xl rounded-2xl shadow-2xl"
        >
          <div className="text-center mb-10">
            <div className="inline-flex p-3 rounded-full bg-primary/20 border border-primary/40 mb-4 shadow-[0_0_15px_rgba(255,69,0,0.3)]">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-4xl font-black text-white uppercase tracking-widest">
              ADMIN <span className="text-primary">PORTAL</span>
            </h1>
            <p className="font-mono text-xs text-muted-foreground mt-2 tracking-tighter opacity-60">
              RESTRICTED AREA • AUTHORIZATION REQUIRED
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <motion.div animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}>
              <label className="font-mono text-[10px] uppercase tracking-widest text-primary block mb-2 font-bold">
                Access Code
              </label>
              <input 
                type="password" 
                value={authKey} 
                onChange={e => setAuthKey(e.target.value)} 
                required 
                placeholder="••••••••"
                className="w-full bg-black/50 border-2 border-border focus:border-primary outline-none px-4 py-4 font-mono text-white text-xl text-center tracking-[0.5em] transition-all placeholder:text-muted-foreground/20"
              />
            </motion.div>

            <button 
              type="submit" 
              className="w-full py-5 font-display font-black text-lg uppercase tracking-widest border-2 border-primary text-primary bg-primary/5 hover:bg-primary hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(255,69,0,0.2)] hover:shadow-[0_0_40px_rgba(255,69,0,0.5)]"
            >
              GRANT ACCESS
            </button>
          </form>

          {authMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-3 border border-red-500/30 bg-red-500/10 text-red-500 font-mono text-[10px] text-center uppercase tracking-widest"
            >
              {authMsg}
            </motion.div>
          )}

          <div className="mt-10 pt-6 border-t border-white/5 text-center">
            <Link href="/" className="font-mono text-[9px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-[0.2em] flex items-center justify-center gap-2 group">
              <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Back to Arena
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white selection:bg-primary/30 font-display pt-20">
      <div className="scanlines opacity-20 pointer-events-none" />
      
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-md border-b border-white/5 z-50 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="p-2 border border-primary/40 rounded bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-black text-xl uppercase tracking-widest">RoboWars <span className="text-primary">Admin</span></h1>
            <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-tighter opacity-60">Operations Management Interface</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsAuthenticated(false)}
            className="flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition-all rounded"
          >
            <LogOut className="h-3 w-3" /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 grid grid-cols-[280px_1fr] gap-8">
        {/* Sidebar */}
        <aside className="space-y-2">
          <button 
            onClick={() => setActiveTab("roster")}
            className={`w-full flex items-center gap-3 px-6 py-4 font-mono text-[11px] uppercase tracking-widest rounded-lg transition-all border ${activeTab === "roster" ? "bg-primary/10 border-primary/40 text-primary shadow-[0_0_15px_rgba(255,69,0,0.1)]" : "border-white/5 hover:bg-white/5 text-muted-foreground"}`}
          >
            <Users className="h-4 w-4" /> Roster
          </button>
          <button 
            onClick={() => setActiveTab("bracket")}
            className={`w-full flex items-center gap-3 px-6 py-4 font-mono text-[11px] uppercase tracking-widest rounded-lg transition-all border ${activeTab === "bracket" ? "bg-primary/10 border-primary/40 text-primary shadow-[0_0_15px_rgba(255,69,0,0.1)]" : "border-white/5 hover:bg-white/5 text-muted-foreground"}`}
          >
            <Trophy className="h-4 w-4" /> Tournament
          </button>
          
          <div className="mt-8 pt-8 border-t border-white/5">
            <Link href="/" className="w-full flex items-center gap-3 px-6 py-4 font-mono text-[11px] uppercase tracking-widest rounded-lg border border-white/5 text-muted-foreground hover:bg-white/5 transition-all">
              <Sword className="h-4 w-4" /> Return to Arena
            </Link>
          </div>
        </aside>

        {/* Content */}
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm"
            >
              {activeTab === "roster" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-widest">Pilot Roster</h2>
                      <p className="font-mono text-xs text-muted-foreground uppercase mt-1">Authorized Combatants Listing</p>
                    </div>
                    <button 
                      onClick={refreshData}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all rounded font-mono text-[10px] uppercase tracking-widest disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} /> {isLoading ? 'Syncing...' : 'Refresh List'}
                    </button>
                  </div>

                  <div className="overflow-hidden border border-white/5 rounded-xl">
                    <table className="w-full text-left font-mono text-[11px] uppercase">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                          <th className="px-6 py-4 text-primary font-black tracking-widest">USN (Pilot ID)</th>
                          <th className="px-6 py-4 text-primary font-black tracking-widest">Name</th>
                          <th className="px-6 py-4 text-primary font-black tracking-widest">Branch</th>
                          <th className="px-6 py-4 text-primary font-black tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {players.map((p: any) => (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4 font-bold text-white">{p.usn}</td>
                            <td className="px-6 py-4 text-muted-foreground">{p.name}</td>
                            <td className="px-6 py-4 text-muted-foreground">{p.branch}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[9px] ${p.status === 'Eliminated' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {players.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground opacity-50 tracking-widest">
                              NO PILOTS DETECTED IN SECTOR
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "bracket" && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-widest">Tournament Ops</h2>
                      <p className="font-mono text-xs text-muted-foreground uppercase mt-1">Combat Engagement Protocols</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="bg-black/50 border border-white/5 px-4 py-2 rounded flex items-center gap-3">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Queue</span>
                        <span className="text-primary font-black text-lg">{queueCount}</span>
                      </div>
                      <button 
                        onClick={toggleMatchmaking}
                        className={`flex items-center gap-3 px-8 py-3 rounded font-black text-xs uppercase tracking-[0.2em] transition-all border ${matchmakingActive ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 border-green-500 text-green-500 hover:bg-green-500 hover:text-white'}`}
                      >
                        {matchmakingActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {matchmakingActive ? 'HALT OPS' : 'INITIATE OPS'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 border border-white/5 bg-white/[0.02] rounded-xl space-y-4">
                      <h3 className="font-bold uppercase tracking-widest text-sm border-b border-white/5 pb-2">Tournament Status</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] text-muted-foreground uppercase">Active Combatants</span>
                          <span className="font-mono text-xs text-white">{players.filter(p => p.status !== 'Eliminated').length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] text-muted-foreground uppercase">Eliminated Units</span>
                          <span className="font-mono text-xs text-white">{players.filter(p => p.status === 'Eliminated').length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 border border-white/5 bg-white/[0.02] rounded-xl flex flex-col gap-4">
                      <h3 className="font-bold uppercase tracking-widest text-sm border-b border-white/5 pb-2">Bracket Generation</h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        This action will evaluate the queue, assign BYEs to balance the bracket, and match remaining players instantly.
                      </p>
                      <button 
                        onClick={handleGenerateBracket}
                        disabled={queueCount === 0}
                        className="mt-auto brutal-button px-6 py-3 w-full border-primary text-primary hover:bg-primary hover:text-black transition-all disabled:opacity-30 flex justify-center items-center gap-2"
                      >
                        <Trophy className="w-4 h-4" /> GENERATE BRACKET & MATCH
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
