import { useState } from "react";
import { motion } from "framer-motion";
import { Sword, Zap, AlertTriangle } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { STARTING_POINTS } from "@/lib/session";
import { useLocation } from "wouter";

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isEliminated, login, logout, session } = useSession();
  const [location] = useLocation();
  const [username, setUsername] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError]       = useState("");
  const [shake, setShake]       = useState(false);

  // Bypass for public routes
  const publicRoutes = ["/", "/portal", "/admin"];
  if (publicRoutes.includes(location)) {
    return <>{children}</>;
  }

  if (isLoggedIn && isEliminated) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black">
        <div className="scanlines opacity-30" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative text-center space-y-6 p-10 max-w-lg"
        >
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="text-[#ff2222] text-9xl select-none"
          >
            ☠
          </motion.div>
          <h1 className="font-display text-4xl font-black text-white uppercase tracking-widest">
            ACCESS <span className="text-[#ff2222]">DENIED</span>
          </h1>
          <p className="font-mono text-muted-foreground text-sm uppercase tracking-widest">
            PILOT {session?.username} — UNIT PERMANENTLY DESTROYED
          </p>
          <p className="font-mono text-[#ff5555] text-xs border border-[#ff2222]/30 p-3 bg-[#ff2222]/5">
            Your combat record shows a catastrophic defeat. This account has been decommissioned.
            No recovery. No rematch. The arena remembers.
          </p>
          <button
            onClick={logout}
            className="w-full py-4 font-display font-bold text-lg uppercase tracking-widest border-2 border-[#ff2222] text-[#ff2222] hover:bg-[#ff2222] hover:text-black transition-all duration-200"
          >
            EJECT &amp; START OVER
          </button>
        </motion.div>
      </div>
    );
  }

  if (isLoggedIn) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    const trimmedName = playerName.trim();
    if (trimmedUser.length < 2) {
      setError("PILOT ID must be at least 2 characters");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (trimmedName.length < 2) {
      setError("PLAYER NAME must be at least 2 characters");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setError("");
    login(trimmedUser, trimmedName);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden">
      <div className="scanlines opacity-40" />
      <div className="crt-flicker" />

      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[700px] rounded-full bg-primary/15 blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sword className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-6xl font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,69,0,0.5)]">
            ROBO<span className="text-primary">WARS</span>
          </h1>
          <p className="font-mono text-muted-foreground tracking-widest text-xs mt-2 uppercase">
            Combat Registration System
          </p>
        </div>

        {/* Starting budget info */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 via-[#11111a] to-background border border-primary/30 p-5 mb-8 shadow-2xl shadow-primary/10 backdrop-blur-md group"
        >
          <div className="absolute -top-6 -right-6 p-4 opacity-10 group-hover:opacity-20 group-hover:rotate-12 transition-all duration-500">
            <Zap className="w-32 h-32 text-primary" />
          </div>
          <div className="relative z-10 flex items-start gap-4">
            <div className="p-3 bg-primary/20 rounded-md border border-primary/40 shadow-[0_0_15px_rgba(255,69,0,0.3)] group-hover:shadow-[0_0_25px_rgba(255,69,0,0.5)] transition-shadow duration-300">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-display text-primary font-black text-lg uppercase tracking-widest drop-shadow-md">
                Starting Grant: <span className="text-white">{STARTING_POINTS.toLocaleString()} PTS</span>
              </p>
              <p className="font-mono text-xs text-white/70 mt-1.5 leading-relaxed max-w-[280px]">
                Initial funds transferred. Spend wisely in the <span className="text-primary font-bold">Forge</span> to construct your Mecha. Emerge victorious to accumulate more credits.
              </p>
            </div>
          </div>
          {/* Animated progress line */}
          <div className="absolute bottom-0 left-0 h-[2px] w-full bg-primary/10">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              className="h-full bg-gradient-to-r from-transparent via-primary to-transparent"
            />
          </div>
        </motion.div>

        {/* Login form */}
        <motion.form
          onSubmit={handleSubmit}
          animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-2">
                Pilot ID
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="ENTER CALLSIGN..."
                maxLength={16}
                autoFocus
                className="w-full bg-background border-2 border-border focus:border-primary outline-none px-4 py-3 font-mono text-white text-lg uppercase tracking-widest placeholder:text-muted-foreground/40 transition-colors"
              />
            </div>

            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-2">
                Player Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="REAL NAME..."
                maxLength={32}
                className="w-full bg-background border-2 border-border focus:border-primary outline-none px-4 py-3 font-mono text-white text-lg uppercase tracking-widest placeholder:text-muted-foreground/40 transition-colors"
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-xs text-[#ff4444] mt-2 flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3" /> {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="w-full py-4 font-display font-black text-xl uppercase tracking-widest border-2 border-primary text-primary bg-primary/10 hover:bg-primary hover:text-black transition-all duration-200 shadow-[0_0_24px_rgba(255,69,0,0.3)] hover:shadow-[0_0_40px_rgba(255,69,0,0.6)]"
          >
            INITIALIZE PILOT
          </button>
        </motion.form>

        {/* Warning */}
        <div className="mt-6 border border-[#ff8800]/30 bg-[#ff8800]/5 p-3">
          <p className="font-mono text-[10px] text-[#ff8800]/70 text-center uppercase tracking-widest leading-relaxed">
            ⚠ WARNING: One defeat and your unit is permanently decommissioned.
            Choose your battles wisely.
          </p>
        </div>
      </motion.div>

      {/* Admin Portal Access */}
      <div className="absolute bottom-6 right-6 z-20">
        <a 
          href="/admin" 
          className="opacity-20 hover:opacity-100 transition-all duration-300 flex flex-col items-center gap-1 group scale-75 origin-bottom-right"
        >
          <div className="p-2 border border-primary/30 rounded bg-primary/5 group-hover:bg-primary/10 group-hover:border-primary/60 group-hover:shadow-[0_0_10px_rgba(255,69,0,0.3)]">
            <Sword className="h-4 w-4 text-primary" />
          </div>
          <span className="font-mono text-[8px] text-primary/50 uppercase tracking-tighter group-hover:text-primary">ADMIN PORTAL</span>
        </a>
      </div>
    </div>
  );
}
