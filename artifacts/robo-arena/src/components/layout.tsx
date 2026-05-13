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

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground overflow-x-hidden">
      <div className="scanlines" />
      <div className="crt-flicker" />
      
      <header className="sticky top-0 z-40 w-full border-b-2 border-primary/20 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 group" data-testid="link-home">
            <Sword className="h-6 w-6 text-primary group-hover:text-secondary transition-colors" />
            <span className="font-display text-2xl font-bold tracking-widest text-white group-hover:text-primary transition-colors">
              ROBO<span className="text-primary group-hover:text-white">ARENA</span>
            </span>
          </Link>
          
          <nav className="flex items-center gap-6 font-display text-sm tracking-widest uppercase">
            <Link 
              href="/builder" 
              className={`flex items-center gap-2 hover:text-primary transition-colors ${location === "/builder" ? "text-primary" : "text-muted-foreground"}`}
              data-testid="link-nav-builder"
            >
              <Wrench className="h-4 w-4" />
              Builder
            </Link>
            <Link 
              href="/play" 
              className={`flex items-center gap-2 hover:text-primary transition-colors ${location === "/play" ? "text-primary" : "text-muted-foreground"}`}
              data-testid="link-nav-play"
            >
              <Gamepad2 className="h-4 w-4" />
              Play
            </Link>
            <Link 
              href="/leaderboard" 
              className={`flex items-center gap-2 hover:text-secondary transition-colors ${location === "/leaderboard" ? "text-secondary" : "text-muted-foreground"}`}
              data-testid="link-nav-leaderboard"
            >
              <Trophy className="h-4 w-4" />
              Champions
            </Link>
          </nav>

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
      
      <main className="flex-1 relative z-10">
        {children}
      </main>
    </div>
  );
}
