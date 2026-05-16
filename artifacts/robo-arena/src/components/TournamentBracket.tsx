import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Swords, Play, RotateCcw, ChevronRight, Zap, Crown, Shield } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { io, Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/api-url";

interface TPlayer {
  id: number;
  tournamentId: number;
  pilotName: string;
  robotName: string;
  seed: number;
  status: string;
}

interface TMatch {
  id: number;
  tournamentId: number;
  roundId: number;
  roundNumber: number;
  matchNumber: number;
  player1Id: number | null;
  player2Id: number | null;
  player1Name: string | null;
  player2Name: string | null;
  player1RobotName: string | null;
  player2RobotName: string | null;
  winnerId: number | null;
  winnerName: string | null;
  isBye: boolean;
  status: string;
}

interface TRound {
  id: number;
  tournamentId: number;
  roundNumber: number;
  status: string;
}

interface Tournament {
  id: number;
  name: string;
  status: string;
  currentRound: number;
  totalRounds: number;
  winnerId: number | null;
}

interface TournamentState {
  tournament: Tournament | null;
  players: TPlayer[];
  rounds: TRound[];
  matches: TMatch[];
}

interface Props {
  registeredPlayers: Array<{ name: string; usn: string }>;
}

const ROUND_NAMES = ["", "Round of 64", "Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Grand Final", "Champion"];

function getRoundLabel(roundNum: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundNum + 1;
  if (fromEnd === 1) return "🏆 Grand Final";
  if (fromEnd === 2) return "Semifinals";
  if (fromEnd === 3) return "Quarterfinals";
  return `Round ${roundNum}`;
}

function MatchCard({
  match,
  isActive,
  onDeclareWinner,
  canDeclare,
}: {
  match: TMatch;
  isActive: boolean;
  onDeclareWinner: (matchId: number, winnerId: number, winnerName: string) => void;
  canDeclare: boolean;
}) {
  const isFinished = match.status === "finished";
  const isBye = match.isBye;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-xl border overflow-hidden transition-all duration-500 ${
        isActive
          ? "border-primary/70 shadow-[0_0_30px_rgba(255,69,0,0.25)] bg-gradient-to-b from-primary/10 to-black/60"
          : isFinished
          ? "border-white/10 bg-black/40"
          : "border-white/[0.07] bg-black/20"
      }`}
    >
      {isActive && (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
        />
      )}

      {isBye ? (
        <div className="p-3">
          <div className="flex items-center gap-2 px-2 py-2 rounded bg-green-500/10 border border-green-500/20">
            <Zap className="h-3 w-3 text-green-400 shrink-0" />
            <div>
              <p className="font-mono text-[9px] text-green-400 uppercase tracking-widest">BYE — Auto Advance</p>
              <p className="font-display text-sm font-bold text-white mt-0.5">{match.player1Name}</p>
              <p className="font-mono text-[10px] text-white/50">{match.player1RobotName}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 space-y-1.5">
          {/* Player 1 */}
          <motion.div
            animate={match.winnerId === match.player1Id ? { boxShadow: ["0 0 0px rgba(255,200,0,0)", "0 0 15px rgba(255,200,0,0.3)", "0 0 0px rgba(255,200,0,0)"] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all duration-300 ${
              match.winnerId === match.player1Id
                ? "border-yellow-500/50 bg-yellow-500/10"
                : match.winnerId && match.winnerId !== match.player1Id
                ? "border-white/5 bg-white/[0.02] opacity-40"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            {match.winnerId === match.player1Id && <Crown className="h-3 w-3 text-yellow-400 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-[13px] text-white truncate leading-tight">
                {match.player1Name || "TBD"}
              </p>
              <p className="font-mono text-[9px] text-white/40 uppercase tracking-wider truncate">
                {match.player1RobotName || "—"}
              </p>
            </div>
            {canDeclare && !isFinished && match.player1Id && (
              <button
                onClick={() => onDeclareWinner(match.id, match.player1Id!, match.player1Name!)}
                className="shrink-0 text-[9px] font-mono uppercase tracking-widest px-2 py-1 border border-primary/40 text-primary hover:bg-primary hover:text-black transition-all rounded"
              >
                WIN
              </button>
            )}
          </motion.div>

          <div className="flex items-center gap-2 px-3">
            <div className="flex-1 h-px bg-white/5" />
            <Swords className="h-3 w-3 text-white/20" />
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Player 2 */}
          <motion.div
            animate={match.winnerId === match.player2Id ? { boxShadow: ["0 0 0px rgba(255,200,0,0)", "0 0 15px rgba(255,200,0,0.3)", "0 0 0px rgba(255,200,0,0)"] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all duration-300 ${
              match.winnerId === match.player2Id
                ? "border-yellow-500/50 bg-yellow-500/10"
                : match.winnerId && match.winnerId !== match.player2Id
                ? "border-white/5 bg-white/[0.02] opacity-40"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            {match.winnerId === match.player2Id && <Crown className="h-3 w-3 text-yellow-400 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-[13px] text-white truncate leading-tight">
                {match.player2Name || "TBD"}
              </p>
              <p className="font-mono text-[9px] text-white/40 uppercase tracking-wider truncate">
                {match.player2RobotName || "—"}
              </p>
            </div>
            {canDeclare && !isFinished && match.player2Id && (
              <button
                onClick={() => onDeclareWinner(match.id, match.player2Id!, match.player2Name!)}
                className="shrink-0 text-[9px] font-mono uppercase tracking-widest px-2 py-1 border border-primary/40 text-primary hover:bg-primary hover:text-black transition-all rounded"
              >
                WIN
              </button>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export function TournamentBracket({ registeredPlayers }: Props) {
  const [state, setState] = useState<TournamentState>({ tournament: null, players: [], rounds: [], matches: [] });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [champion, setChampion] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const loadTournament = useCallback(async () => {
    try {
      console.log("[Tournament] Loading data...");
      const data = await customFetch<TournamentState>("/api/tournament");
      console.log("[Tournament] Received data:", data);
      setState(data);
      if (data.tournament?.status === "finished" && data.tournament.winnerId) {
        const winner = data.players?.find(p => p.id === data.tournament!.winnerId);
        if (winner) setChampion(winner.pilotName);
      }
    } catch (e) {
      console.error("[Tournament] Failed to load tournament:", e);
    }
  }, []);

  useEffect(() => {
    loadTournament();

    const socket = io(getApiUrl(), {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("bracket_updated", () => {
      loadTournament();
    });

    return () => { socket.disconnect(); };
  }, [loadTournament]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const handleStart = async () => {
    if (registeredPlayers.length < 2) {
      flash("❌ Need at least 2 registered players");
      return;
    }
    setLoading(true);
    try {
      const players = registeredPlayers.map(p => ({
        pilotName: p.name,
        robotName: "RoboWars Bot",
      }));
      const res = await customFetch<any>("/api/tournament/start", {
        method: "POST",
        body: JSON.stringify({ players }),
      });
      flash(`✅ Tournament started! ${res.numByes} BYE(s) assigned. ${res.totalRounds} rounds total.`);
      loadTournament();
    } catch (e: any) {
      flash(`❌ ${e.message || "Failed to start"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset the entire tournament? All data will be wiped.")) return;
    setLoading(true);
    setChampion(null);
    try {
      await customFetch("/api/tournament/reset", { method: "POST", body: JSON.stringify({}) });
      flash("✅ Tournament reset");
      setState({ tournament: null, players: [], rounds: [], matches: [] });
    } catch (e: any) {
      flash(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceRound = async () => {
    if (!state.tournament) return;
    setLoading(true);
    try {
      const res = await customFetch<any>("/api/tournament/advance-round", {
        method: "POST",
        body: JSON.stringify({ tournamentId: state.tournament.id }),
      });
      if (res.finished) {
        setChampion(res.champion);
        flash(`🏆 CHAMPION: ${res.champion}`);
      } else {
        flash(`✅ Advanced to Round ${res.nextRound}`);
      }
      loadTournament();
    } catch (e: any) {
      flash(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclareWinner = async (matchId: number, winnerId: number, winnerName: string) => {
    setLoading(true);
    try {
      await customFetch("/api/tournament/declare-winner", {
        method: "POST",
        body: JSON.stringify({ matchId, winnerId, winnerName }),
      });
      flash(`✅ ${winnerName} declared winner`);
      loadTournament();
    } catch (e: any) {
      flash(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const { tournament, matches = [], rounds = [] } = state;
  const allRoundNumbers = [...new Set(matches.map(m => m.roundNumber))].sort((a, b) => a - b);
  const currentRound = tournament?.currentRound ?? 0;
  const isActive = tournament?.status === "active";

  const currentRoundMatches = matches.filter(m => m.roundNumber === currentRound);
  const allCurrentFinished = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.status === "finished" || m.isBye);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-widest flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" /> Tournament Bracket
          </h2>
          <p className="font-mono text-xs text-muted-foreground uppercase mt-1">
            {tournament
              ? `${tournament.name} • Round ${tournament.currentRound}/${tournament.totalRounds} • ${tournament.status.toUpperCase()}`
              : "No active tournament"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isActive && (
            <button
              onClick={handleStart}
              disabled={loading || registeredPlayers.length < 2}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 border border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-all font-mono text-[11px] uppercase tracking-widest rounded disabled:opacity-30"
            >
              <Play className="h-3.5 w-3.5" /> Start Tournament
            </button>
          )}
          {isActive && allCurrentFinished && !champion && (
            <button
              onClick={handleAdvanceRound}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-black transition-all font-mono text-[11px] uppercase tracking-widest rounded disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" /> Advance Round
            </button>
          )}
          {tournament && (
            <button
              onClick={handleReset}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-all font-mono text-[11px] uppercase tracking-widest rounded disabled:opacity-30"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Flash message */}
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg font-mono text-sm text-white"
          >
            {msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Champion Banner */}
      <AnimatePresence>
        {champion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden p-8 border-2 border-yellow-500 rounded-2xl bg-gradient-to-r from-yellow-950/60 via-yellow-900/30 to-yellow-950/60 text-center shadow-[0_0_60px_rgba(234,179,8,0.3)]"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-5xl mb-3"
            >🏆</motion.div>
            <p className="font-mono text-xs text-yellow-400/70 uppercase tracking-[0.4em] mb-1">Tournament Champion</p>
            <h3 className="font-display text-4xl font-black text-yellow-400 uppercase tracking-widest drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]">
              {champion}
            </h3>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No tournament */}
      {!tournament && (
        <div className="p-12 border border-white/5 rounded-2xl text-center bg-white/[0.02]">
          <Shield className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest">
            {registeredPlayers.length < 2
              ? `Need ${2 - registeredPlayers.length} more registered player(s) to start`
              : `${registeredPlayers.length} pilots ready — Click "Start Tournament"`}
          </p>
        </div>
      )}

      {/* Bracket — horizontal scroll of rounds */}
      {tournament && matches.length > 0 && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max">
            {allRoundNumbers.map(rn => {
              const roundMatches = matches.filter(m => m.roundNumber === rn);
              const isCurrent = rn === currentRound;
              const label = getRoundLabel(rn, tournament.totalRounds);

              return (
                <div key={rn} className="flex flex-col gap-0">
                  {/* Round header */}
                  <div className={`mb-3 px-3 py-1.5 rounded-lg text-center font-mono text-[10px] uppercase tracking-widest border transition-all ${
                    isCurrent
                      ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_10px_rgba(255,69,0,0.2)]"
                      : rn < currentRound
                      ? "border-white/5 text-white/30"
                      : "border-white/10 text-white/50"
                  }`}>
                    {label}
                  </div>

                  {/* Connector + matches */}
                  <div className="flex flex-col" style={{ gap: rn > 1 ? `${(Math.pow(2, rn - 1) - 1) * 16}px` : "8px" }}>
                    {roundMatches.map((match, idx) => (
                      <div key={match.id} className="relative w-[200px]">
                        {/* Glowing connector line to next round */}
                        {rn < Math.max(...allRoundNumbers) && (
                          <motion.div
                            animate={match.winnerId ? { opacity: [0.3, 0.8, 0.3] } : { opacity: 0.1 }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-px"
                            style={{
                              background: match.winnerId
                                ? "linear-gradient(90deg, rgba(255,69,0,0.5), rgba(255,69,0,0.1))"
                                : "rgba(255,255,255,0.1)",
                            }}
                          />
                        )}

                        <MatchCard
                          match={match}
                          isActive={isCurrent && match.status === "pending" && !match.isBye}
                          onDeclareWinner={handleDeclareWinner}
                          canDeclare={isCurrent}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Round progress indicator */}
      {tournament && (
        <div className="flex items-center gap-1 flex-wrap mt-2">
          {Array.from({ length: tournament.totalRounds }).map((_, i) => {
            const rn = i + 1;
            return (
              <div key={rn} className="flex items-center gap-1">
                <div className={`h-2 w-8 rounded-full transition-all duration-500 ${
                  rn < currentRound ? "bg-primary/80" :
                  rn === currentRound ? "bg-primary animate-pulse" :
                  "bg-white/10"
                }`} />
                {i < tournament.totalRounds - 1 && <ChevronRight className="h-3 w-3 text-white/20" />}
              </div>
            );
          })}
          <span className="font-mono text-[10px] text-muted-foreground ml-2 uppercase tracking-widest">
            Round {currentRound}/{tournament.totalRounds}
          </span>
        </div>
      )}
    </div>
  );
}
