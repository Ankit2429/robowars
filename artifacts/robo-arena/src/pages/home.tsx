import { Link } from "wouter";
import { motion } from "framer-motion";
import { Skull, Zap, ShieldAlert, Cpu } from "lucide-react";
import { useListRobots } from "@workspace/api-client-react";

export default function Home() {
  const { data: robots } = useListRobots();
  const totalBattles = Math.floor(Math.random() * 10000) + 5000; // Simulated for now

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-16">
      {/* Background effects */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-20">
        <div className="w-[800px] h-[800px] rounded-full bg-primary/20 blur-[120px]" />
      </div>
      
      <div className="relative z-10 container px-4 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <h1 className="text-7xl md:text-9xl font-black font-display tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,69,0,0.5)]">
            ROBO<span className="text-primary">ARENA</span>
          </h1>
          <p className="mt-4 text-xl md:text-2xl font-mono text-muted-foreground tracking-widest uppercase">
            Forge. Fight. Destroy.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-16"
        >
          <Link 
            href="/builder" 
            className="px-12 py-6 text-2xl brutal-button bg-primary/10 text-primary border-primary hover:bg-primary hover:text-black shadow-[0_0_30px_rgba(255,69,0,0.3)] hover:shadow-[0_0_50px_rgba(255,69,0,0.6)]"
            data-testid="btn-enter-arena"
          >
            ENTER ARENA
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          <div className="brutal-border bg-card p-6 flex flex-col items-center justify-center gap-4">
            <Cpu className="h-10 w-10 text-secondary" />
            <div className="text-3xl font-display font-bold text-white">{robots?.length || 0}</div>
            <div className="text-xs font-mono text-muted-foreground tracking-widest">Robots Forged</div>
          </div>
          <div className="brutal-border bg-card p-6 flex flex-col items-center justify-center gap-4">
            <Skull className="h-10 w-10 text-primary" />
            <div className="text-3xl font-display font-bold text-white">{totalBattles.toLocaleString()}</div>
            <div className="text-xs font-mono text-muted-foreground tracking-widest">Battles Fought</div>
          </div>
          <div className="brutal-border bg-card p-6 flex flex-col items-center justify-center gap-4">
            <Trophy className="h-10 w-10 text-yellow-500" />
            <div className="text-xl font-display font-bold text-white">XENON_GHOST</div>
            <div className="text-xs font-mono text-muted-foreground tracking-widest">Current Champion</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Trophy(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7c0 6 3 7 6 7s6-1 6-7V2Z" />
    </svg>
  )
}
