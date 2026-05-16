import { motion } from "framer-motion";
import { useSession } from "@/context/SessionContext";
import { useLocation } from "wouter";

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isEliminated, logout, session } = useSession();
  const [location, setLocation] = useLocation();

  // Public routes that don't require registration
  const publicRoutes = ["/", "/admin", "/register"];
  if (publicRoutes.includes(location)) {
    return <>{children}</>;
  }

  // Handle elimination state
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

  // Redirect to registration if not logged in
  if (!isLoggedIn) {
    setLocation("/register");
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
