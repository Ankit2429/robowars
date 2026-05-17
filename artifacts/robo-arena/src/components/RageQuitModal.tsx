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

          {/* Pilot ID */}
          <div className="border border-[#ff2222]/40 bg-[#ff0000]/5 p-3 mb-4">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Pilot: </span>
            <span className="font-display font-bold text-white text-lg tracking-widest">{playerName}</span>
            <span className="font-mono text-xs text-[#ff4444] ml-3 uppercase">[ ELIMINATED ]</span>
          </div>

          {/* Rage bait message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="border-l-4 border-[#ff2222] bg-[#ff0000]/8 p-4 mb-6 text-left"
          >
            <p className="font-mono text-[#ff5555] text-sm leading-relaxed uppercase tracking-wide">
              {RAGE_LINES[lineIdx]}
            </p>
            <p className="font-mono text-muted-foreground text-xs mt-2 leading-relaxed">
              Your combat license has been permanently revoked. Your pilot ID will be archived
              in the Hall of Shame. The only way out is to start over with a new callsign.
            </p>
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
