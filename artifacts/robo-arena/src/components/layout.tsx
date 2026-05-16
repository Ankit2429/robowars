import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Sword, Wrench, Trophy, Gamepad2, Zap, LogOut } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { motion } from "framer-motion";

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { session, logout } = useSession();

  if (location.startsWith("/battle")) {
    return <>{children}</>;
  }

  const hideHeader = location === "/" || location === "/admin" || location === "/register";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground overflow-x-hidden">
      <div className="scanlines" />
      <div className="crt-flicker" />
      
      {!hideHeader && (
        <header className="sticky top-0 z-40 w-full border-b-2 border-primary/20 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 group" data-testid="link-home" style={{ textDecoration: 'none' }}>
            <Sword className="h-8 w-8 text-red transition-colors" />
            <div className="flex flex-col justify-center">
              <span className="hero-title !text-2xl !mb-0 !font-display !font-bold !tracking-widest leading-none">
                <span className="text-white">ROBO</span><span className="text-red">WARS</span>
              </span>
              <span className="hero-subtitle !text-[0.55rem] !mb-0 mt-1 tracking-[4px] leading-none opacity-90">
                <span className="text-white">FORGE. FIGHT. </span>
                <span className="text-red">DESTROY.</span>
              </span>
            </div>
          </Link>
          

          {/* Pilot info + points */}
          {session && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                  {session.username}
                </span>
                <motion.div
                  key={session.points}
                  initial={{ scale: 1.3, color: "#ff6600" }}
                  animate={{ scale: 1, color: "#ff4500" }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-1"
                >
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="font-display font-bold text-sm text-primary tabular-nums">
                    {session.points.toLocaleString()} <span className="text-xs font-mono font-normal text-muted-foreground">pts</span>
                  </span>
                </motion.div>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-2 text-muted-foreground hover:text-[#ff4444] transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>
      )}
      
      <main className="flex-1 relative z-10">
        {children}
      </main>
    </div>
  );
}
