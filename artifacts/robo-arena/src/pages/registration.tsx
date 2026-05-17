import { useState } from "react";
import { motion } from "framer-motion";
import { Sword, Zap, AlertTriangle, ArrowLeft } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { STARTING_POINTS } from "@/lib/session";
import { useLocation, Link } from "wouter";
import { customFetch } from "@workspace/api-client-react";

export default function Registration() {
  const { login } = useSession();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError]       = useState("");
  const [shake, setShake]       = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    const trimmedName = playerName.trim();
    const trimmedCode = accessCode.trim();

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
    if (trimmedCode.length < 2) {
      setError("ACCESS CODE required");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Step 1: Register in backend DB
      const resData = await customFetch<any>("/api/players/register", {
        method: "POST",
        body: JSON.stringify({ 
          name: trimmedName, 
          usn: trimmedUser, 
          branch: "PILOT", 
          code: trimmedCode 
        }),
      });

      // Step 2: Login in local session context
      const serverData = {
        points: resData.points ?? 1000,
        credits: resData.credits ?? 0,
        wins: resData.wins ?? 0,
        eliminated: resData.eliminated ?? false
      };
      login(trimmedUser, trimmedName, serverData);
      setLocation("/play");
    } catch (err: any) {
      console.error("[Registration] failed:", err);
      setError(err.data?.error || "Registration failed. Check access code.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsLoading(false);
    }
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
        className="relative z-10 w-full max-w-lg px-8 py-10"
      >
        {/* Back link */}
        <div className="mb-6">
          <Link href="/" className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-[0.2em] flex items-center gap-2 group">
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Back to Terminal
          </Link>
        </div>

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
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-6">
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

            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-2">
                Access Code
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={e => setAccessCode(e.target.value)}
                placeholder="bot123"
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
            disabled={isLoading}
            className="w-full py-4 font-display font-black text-xl uppercase tracking-widest border-2 border-primary text-primary bg-primary/10 hover:bg-primary hover:text-black transition-all duration-200 shadow-[0_0_24px_rgba(255,69,0,0.3)] hover:shadow-[0_0_40px_rgba(255,69,0,0.6)] disabled:opacity-50 disabled:cursor-wait"
          >
            {isLoading ? "INITIALIZING..." : "INITIALIZE PILOT"}
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

      {/* Admin Portal Access - Restored to bottom right */}
      <div className="absolute bottom-8 right-8 z-20">
        <Link 
          href="/admin" 
          className="opacity-50 hover:opacity-100 transition-all duration-300 flex flex-col items-center gap-2 group scale-90 origin-bottom-right cursor-pointer"
        >
          <div className="p-2.5 border border-primary/40 rounded-lg bg-primary/10 group-hover:bg-primary/20 group-hover:border-primary/80 group-hover:shadow-[0_0_15px_rgba(255,69,0,0.4)] transition-all">
            <Sword className="h-5 w-5 text-primary" />
          </div>
          <span className="font-mono text-[10px] text-primary/70 uppercase tracking-[0.2em] font-bold group-hover:text-primary transition-colors">ADMIN PORTAL</span>
        </Link>
      </div>
    </div>
  );
}
