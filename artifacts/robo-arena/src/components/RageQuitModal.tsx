import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@/context/SessionContext";

interface RageQuitModalProps {
  playerName: string;
  onLogout: () => void;
}

const RAGE_LINES = [
  "SYSTEM ERROR: SKILL NOT FOUND.",
  "ACHIEVEMENT UNLOCKED: FASTEST ELIMINATION",
  "OUR ROBOT NEEDED A WARM-UP MATCH ANYWAY",
  "EVEN AUTO MODE COULD’VE DONE BETTER",
  "RESPECT FOR PARTICIPATING… COURAGE WAS THE ONLY THING WORKING.",
  "YOUR BOT FOUGHT LIKE IT HAD AN EXAM TOMORROW",
  "404: VICTORY NOT FOUND",
  "GAME OVER. INSERT SKILL CARD"
];

// High-fidelity letter-by-letter typewriter text crawling
function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className="font-mono text-[#ff3333] font-black uppercase tracking-wider text-xl leading-relaxed">
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ repeat: Infinity, duration: 0.6 }}
        className="inline-block w-2.5 h-5 bg-[#ff3333] ml-1 align-middle"
      />
    </span>
  );
}

export function RageQuitModal({ playerName, onLogout }: RageQuitModalProps) {
  const { logout } = useSession();
  const [lineIdx] = useState(() => Math.floor(Math.random() * RAGE_LINES.length));
  const [flicker, setFlicker] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setFlicker(f => !f), 600);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => {
    logout();
    onLogout();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden"
      >
        {/* Red scan line sweep */}
        <motion.div
          className="absolute inset-x-0 h-1 bg-[#ff0000]/40 pointer-events-none"
          animate={{ top: ["0%", "100%"] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
        />

        {/* Corner alert brackets */}
        {[
          "top-4 left-4 border-t-2 border-l-2",
          "top-4 right-4 border-t-2 border-r-2",
          "bottom-4 left-4 border-b-2 border-l-2",
          "bottom-4 right-4 border-b-2 border-r-2",
        ].map((cls, i) => (
          <motion.div
            key={i}
            className={`absolute w-10 h-10 border-[#ff2222] ${cls}`}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
          />
        ))}

        <motion.div
          initial={{ scale: 0.7, y: 60 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.7, y: 60 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="relative w-full max-w-lg mx-4 text-center"
        >
          {/* Skull */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: flicker ? 1 : 0.7 }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="text-[120px] leading-none select-none mb-2"
            style={{ filter: "drop-shadow(0 0 30px #ff0000)" }}
          >
            💀
          </motion.div>

          {/* Header */}
          <motion.h1
            animate={{ color: flicker ? "#ff2222" : "#ff6666" }}
            transition={{ duration: 0.6 }}
            className="font-display text-6xl font-black uppercase tracking-widest mb-2"
            style={{ textShadow: "0 0 30px #ff0000, 0 0 60px #ff000066" }}
          >
            RAGE QUIT
          </motion.h1>

          <div className="font-mono text-[#ff4444] text-sm uppercase tracking-[0.4em] mb-6">
            UNIT PERMANENTLY DESTROYED
          </div>

          {/* Pilot ID Box */}
          <div className="border border-[#ff2222]/40 bg-[#ff0000]/5 p-3 mb-5">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Pilot: </span>
            <span className="font-display font-bold text-white text-lg tracking-widest">{playerName}</span>
            <span className="font-mono text-xs text-[#ff4444] ml-3 uppercase">[ ELIMINATED ]</span>
          </div>

          {/* ── HIGH FIDELITY POPUP DIAGNOSTIC CARD (SPRING ANIMATION) ── */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotate: -3 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.5, stiffness: 250, damping: 15 }}
            className="border-2 border-[#ff2222] bg-[#330000]/40 backdrop-blur-md p-6 mb-6 rounded-sm shadow-[0_0_40px_rgba(255,34,34,0.35)] relative overflow-hidden"
          >
            {/* Corner Bracket Details */}
            <div className="absolute top-0 left-0 bg-[#ff2222] text-black font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 font-black">
              ARENA DIAGNOSTIC
            </div>
            
            <div className="py-4 text-center leading-relaxed">
              <TypewriterText text={RAGE_LINES[lineIdx]} />
            </div>

            <div className="border-t border-[#ff2222]/30 pt-3 flex justify-between items-center text-[10px] font-mono text-[#ff6666]/70 uppercase tracking-widest">
              <span>CALLSIGN: {playerName}</span>
              <span className="animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> ERROR RECORDED
              </span>
            </div>
          </motion.div>

          {/* Stats line */}
          <div className="font-mono text-xs text-muted-foreground/50 mb-8 uppercase tracking-widest">
            WINS: 0 &nbsp;|&nbsp; LOSSES: 1 &nbsp;|&nbsp; SURVIVOR RATING: F-
          </div>

          {/* Logout button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleLogout}
            className="w-full py-5 font-display font-black text-2xl uppercase tracking-widest border-2 border-[#ff2222] text-[#ff2222] bg-[#ff2222]/10 hover:bg-[#ff2222] hover:text-black transition-all duration-200"
            style={{ boxShadow: "0 0 30px rgba(255,34,34,0.4)" }}
          >
            LOG OUT &amp; ACCEPT DEFEAT
          </motion.button>

          <p className="font-mono text-[10px] text-muted-foreground/30 mt-4 uppercase tracking-widest">
            No refunds. No rematches. The arena has spoken.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
