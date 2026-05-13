import { useGetLeaderboard } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Trophy, Shield, Zap, Skull } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useGetLeaderboard();

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex items-center gap-4 mb-12">
        <Trophy className="h-12 w-12 text-secondary" />
        <h1 className="text-4xl md:text-5xl font-black font-display tracking-widest text-white uppercase">
          Hall of <span className="text-secondary">Champions</span>
        </h1>
      </div>

      <div className="brutal-border bg-card/80 backdrop-blur overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/50 font-mono text-xs text-muted-foreground tracking-widest uppercase">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-4">Pilot</div>
          <div className="col-span-2 text-center">W / L</div>
          <div className="col-span-3">Win Rate</div>
          <div className="col-span-2 text-right">Main Bot</div>
        </div>

        <div className="flex flex-col">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 items-center">
                <Skeleton className="h-6 w-6 col-span-1 mx-auto" />
                <Skeleton className="h-6 w-32 col-span-4" />
                <Skeleton className="h-6 w-16 col-span-2 mx-auto" />
                <Skeleton className="h-4 w-full col-span-3" />
                <Skeleton className="h-6 w-24 col-span-2 ml-auto" />
              </div>
            ))
          ) : leaderboard?.length === 0 ? (
            <div className="p-12 text-center font-mono text-muted-foreground">
              No champions yet. The arena awaits.
            </div>
          ) : (
            leaderboard?.map((entry, index) => (
              <motion.div
                key={entry.playerName}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className={`grid grid-cols-12 gap-4 p-4 border-b border-border/50 items-center hover:bg-muted/30 transition-colors ${
                  index === 0 ? "bg-secondary/5" : ""
                }`}
                data-testid={`row-leaderboard-${entry.playerName}`}
              >
                <div className="col-span-1 flex justify-center">
                  {index === 0 ? (
                    <Trophy className="h-6 w-6 text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                  ) : index === 1 ? (
                    <Trophy className="h-5 w-5 text-gray-400" />
                  ) : index === 2 ? (
                    <Trophy className="h-5 w-5 text-amber-700" />
                  ) : (
                    <span className="font-display text-lg text-muted-foreground">{entry.rank}</span>
                  )}
                </div>
                
                <div className="col-span-4 font-display font-bold text-lg">
                  <span className={index === 0 ? "text-secondary" : "text-foreground"}>
                    {entry.playerName}
                  </span>
                </div>
                
                <div className="col-span-2 text-center font-mono text-sm">
                  <span className="text-green-500">{entry.wins}</span>
                  <span className="text-muted-foreground mx-1">-</span>
                  <span className="text-destructive">{entry.losses}</span>
                </div>
                
                <div className="col-span-3 flex items-center gap-3">
                  <div className="font-mono text-xs w-12 text-right">
                    {(entry.winRate * 100).toFixed(1)}%
                  </div>
                  <div className="h-2 w-full bg-[#222] rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${entry.winRate > 0.6 ? "bg-secondary" : entry.winRate > 0.4 ? "bg-primary" : "bg-destructive"}`} 
                      style={{ width: `${entry.winRate * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="col-span-2 text-right font-mono text-xs text-muted-foreground truncate">
                  {entry.favoriteRobot || "Unknown"}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
