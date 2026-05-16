import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Swords, Play, RotateCcw, Crown, Zap, Shield } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { io, Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/api-url";
import { useLocation } from "wouter";

// ── Types ────────────────────────────────────────────────────────────────────
interface TPlayer { id: number; tournamentId: number; pilotName: string; robotName: string; seed: number; status: string; }
interface TMatch {
  id: number; tournamentId: number; roundId: number; roundNumber: number;
  matchNumber: number; side: string;
  player1Id: number | null; player2Id: number | null;
  player1Name: string | null; player2Name: string | null;
  player1RobotName: string | null; player2RobotName: string | null;
  winnerId: number | null; winnerName: string | null;
  isBye: boolean; status: string; battleRoomId?: string | null;
}
interface TRound { id: number; tournamentId: number; roundNumber: number; status: string; }
interface Tournament { id: number; name: string; status: string; currentRound: number; totalRounds: number; winnerId: number | null; activeMatchId: number | null; }
interface TournamentState { tournament: Tournament | null; players: TPlayer[]; rounds: TRound[]; matches: TMatch[]; }
interface Props { registeredPlayers: Array<{ name: string; usn: string }>; }

// ── Constants ────────────────────────────────────────────────────────────────
const CARD_W = 188;
const CARD_H = 72;
const BASE_UNIT = CARD_H + 16; // slot height for round 1

function slotHeight(round: number) { return Math.pow(2, round - 1) * BASE_UNIT; }
function matchTop(round: number, idx: number) {
  const sh = slotHeight(round);
  return idx * sh + (sh - CARD_H) / 2;
}

// ── Match Card ───────────────────────────────────────────────────────────────
function MatchCard({
  match, isCurrentRound, onWin, isFinal, myRobotName
}: {
  match: TMatch | null; isCurrentRound: boolean; onWin?: (matchId: number, wId: number, wName: string) => void; isFinal?: boolean; myRobotName: string | null;
}) {
  const [, setLocation] = useLocation();

  if (!match) {
    return (
      <div
        style={{ width: CARD_W, height: CARD_H }}
        className="rounded-lg border border-dashed border-white/10 bg-black/20 flex items-center justify-center"
      >
        <span className="font-mono text-[9px] text-white/20 uppercase tracking-widest">TBD</span>
      </div>
    );
  }

  const isFinished = match.status === "finished";
  const isBye = match.isBye;

  if (isBye) {
    return (
      <div style={{ width: CARD_W, height: CARD_H }} className="rounded-lg border border-green-500/20 bg-green-950/30 flex flex-col justify-center px-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap className="w-3 h-3 text-green-400" />
          <span className="font-mono text-[8px] text-green-400 uppercase tracking-widest">BYE — Auto Advance</span>
        </div>
        <p className="font-display font-bold text-sm text-white truncate">{match.player1Name}</p>
        <p className="font-mono text-[9px] text-white/40 truncate">{match.player1RobotName}</p>
      </div>
    );
  }

  const p1Win = isFinished && match.winnerId === match.player1Id;
  const p2Win = isFinished && match.winnerId === match.player2Id;

  return (
    <motion.div
      layout
      style={{ width: CARD_W, height: CARD_H }}
      className={`relative rounded-lg border overflow-hidden flex flex-col ${
        isFinal
          ? "border-yellow-500/50 bg-gradient-to-b from-yellow-950/40 to-black/60 shadow-[0_0_20px_rgba(234,179,8,0.15)]"
          : isCurrentRound && !isFinished
          ? "border-primary/60 bg-gradient-to-b from-primary/10 to-black/60 shadow-[0_0_15px_rgba(255,69,0,0.2)]"
          : isFinished
          ? "border-white/10 bg-black/40"
          : "border-white/[0.07] bg-black/20"
      }`}
    >
      {/* Enter Arena button for current player */}
      {!isFinished && match.battleRoomId && (myRobotName === match.player1Name || myRobotName === match.player2Name) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm group hover:bg-black/90 transition-colors cursor-pointer"
             onClick={() => setLocation(`/battle/${match.battleRoomId}`)}>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-black font-display font-bold text-[10px] uppercase tracking-widest rounded-sm scale-95 group-hover:scale-100 transition-transform">
            <Swords className="w-3 h-3" />
            Enter Arena
          </button>
        </div>
      )}

      {/* Active pulse */}
      {isCurrentRound && !isFinished && (
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
      )}

      {/* Player 1 */}
      <div className={`flex-1 flex items-center gap-1.5 px-2.5 border-b border-white/5 ${p2Win ? "opacity-30" : ""}`}>
        {p1Win && <Crown className="w-2.5 h-2.5 text-yellow-400 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className={`font-display font-bold text-[12px] truncate leading-tight ${p1Win ? "text-yellow-300" : "text-white"}`}>{match.player1Name || "TBD"}</p>
          <p className="font-mono text-[8px] text-white/30 truncate">{match.player1RobotName || "—"}</p>
        </div>
        {onWin && isCurrentRound && !isFinished && match.player1Id && (
          <button onClick={() => onWin(match.id, match.player1Id!, match.player1Name!)} className="shrink-0 text-[8px] font-mono uppercase px-1.5 py-0.5 border border-primary/40 text-primary hover:bg-primary hover:text-black transition-all rounded">W</button>
        )}
      </div>

      {/* Player 2 */}
      <div className={`flex-1 flex items-center gap-1.5 px-2.5 ${p1Win ? "opacity-30" : ""}`}>
        {p2Win && <Crown className="w-2.5 h-2.5 text-yellow-400 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className={`font-display font-bold text-[12px] truncate leading-tight ${p2Win ? "text-yellow-300" : "text-white"}`}>{match.player2Name || "TBD"}</p>
          <p className="font-mono text-[8px] text-white/30 truncate">{match.player2RobotName || "—"}</p>
        </div>
        {onWin && isCurrentRound && !isFinished && match.player2Id && (
          <button onClick={() => onWin(match.id, match.player2Id!, match.player2Name!)} className="shrink-0 text-[8px] font-mono uppercase px-1.5 py-0.5 border border-primary/40 text-primary hover:bg-primary hover:text-black transition-all rounded">W</button>
        )}
      </div>
    </motion.div>
  );
}

// ── Bracket Column ───────────────────────────────────────────────────────────
function BracketColumn({
  round, matches, totalMatchesInRound1PerSide, currentRound, onWin, isFinal, reversed, myRobotName
}: {
  round: number; matches: TMatch[]; totalMatchesInRound1PerSide: number;
  currentRound: number; onWin: (matchId: number, wId: number, wName: string) => void;
  isFinal?: boolean; reversed?: boolean; myRobotName: string | null;
}) {
  const matchCount = totalMatchesInRound1PerSide / Math.pow(2, round - 1);
  const colHeight = totalMatchesInRound1PerSide * BASE_UNIT;

  return (
    <div className="relative flex-shrink-0" style={{ width: CARD_W, height: colHeight }}>
      {Array.from({ length: Math.max(matchCount, 0) }).map((_, idx) => {
        const match = matches[idx] || null;
        const top = matchTop(round, idx);
        const midY = top + CARD_H / 2;
        const nextSlotH = slotHeight(round + 1);
        const isTopOfPair = idx % 2 === 0;
        const pairPartnerTop = isTopOfPair ? matchTop(round, idx + 1) + CARD_H / 2 : matchTop(round, idx - 1) + CARD_H / 2;
        const connY1 = Math.min(midY, pairPartnerTop);
        const connY2 = Math.max(midY, pairPartnerTop);
        const connMidY = (connY1 + connY2) / 2;
        const hasNext = round < (isFinal ? round : round + 1) && matchCount > 1;

        return (
          <div key={idx} className="absolute" style={{ top, left: 0 }}>
            <MatchCard match={match} isCurrentRound={round === currentRound} onWin={onWin} isFinal={isFinal} myRobotName={myRobotName} />

            {/* Horizontal connector OUT (right for left-side, left for right-side) */}
            {!isFinal && matchCount > 1 && (
              <motion.div
                animate={match?.winnerId ? { opacity: [0.3, 0.8, 0.3] } : { opacity: 0.15 }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-1/2 -translate-y-1/2"
                style={{
                  [reversed ? "right" : "left"]: CARD_W,
                  width: 24,
                  height: 1,
                  background: match?.winnerId ? "rgba(255,69,0,0.6)" : "rgba(255,255,255,0.15)",
                }}
              />
            )}

            {/* Vertical connector (only for top of pair) */}
            {!isFinal && matchCount > 1 && isTopOfPair && idx + 1 < matchCount && (
              <motion.div
                animate={{ opacity: 0.15 }}
                className="absolute"
                style={{
                  [reversed ? "right" : "left"]: CARD_W + 23,
                  top: CARD_H / 2,
                  width: 1,
                  height: matchTop(round, idx + 1) + CARD_H / 2 - midY,
                  background: "rgba(255,255,255,0.15)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function TournamentBracket({ registeredPlayers }: Props) {
  const [state, setState] = useState<TournamentState>({ tournament: null, players: [], rounds: [], matches: [] });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [myRobotName, setMyRobotName] = useState<string | null>(null);
  const [champion, setChampion] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem("roboArena_robot");
      if (s) {
        const parsed = JSON.parse(s);
        setMyRobotName(parsed.playerName);
      }
    } catch {}
  }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const loadTournament = useCallback(async () => {
    try {
      const data = await customFetch<TournamentState>("/api/tournament");
      setState(data);
      if (data.tournament?.status === "finished" && data.tournament.winnerId) {
        const w = data.players?.find(p => p.id === data.tournament!.winnerId);
        if (w) setChampion(w.pilotName);
      } else {
        setChampion(null);
      }
    } catch (e) { console.error("Failed to load tournament", e); }
  }, []);

  useEffect(() => {
    loadTournament();
    const socket = io(getApiUrl(), { path: "/socket.io", transports: ["polling", "websocket"], withCredentials: true });
    socketRef.current = socket;
    socket.on("bracket_updated", loadTournament);
    return () => { socket.disconnect(); };
  }, [loadTournament]);

  const handleStart = async () => {
    if (registeredPlayers.length < 2) { flash("❌ Need at least 2 registered players"); return; }
    setLoading(true);
    try {
      const players = registeredPlayers.map(p => ({ pilotName: p.name, robotName: "RoboWars Bot" }));
      const res = await customFetch<any>("/api/tournament/start", { method: "POST", body: JSON.stringify({ players }) });
      flash(`✅ Tournament started! ${res.numByes} BYE(s), ${res.totalRounds} rounds.`);
      loadTournament();
    } catch (e: any) { flash(`❌ ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!confirm("Reset the entire tournament? All data will be wiped.")) return;
    setLoading(true);
    setChampion(null);
    try {
      await customFetch("/api/tournament/reset", { method: "POST", body: JSON.stringify({}) });
      flash("✅ Tournament reset");
      setState({ tournament: null, players: [], rounds: [], matches: [] });
    } catch (e: any) { flash(`❌ ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleWin = async (matchId: number, winnerId: number, winnerName: string) => {
    setLoading(true);
    try {
      await customFetch("/api/tournament/declare-winner", { method: "POST", body: JSON.stringify({ matchId, winnerId, winnerName }) });
      flash(`✅ ${winnerName} advances!`);
      loadTournament();
    } catch (e: any) { flash(`❌ ${e.message}`); }
    finally { setLoading(false); }
  };

  const { tournament, matches = [], players = [] } = state;
  const totalRounds = tournament?.totalRounds ?? 0;
  const currentRound = tournament?.currentRound ?? 0;
  const isActive = tournament?.status === "active";

  // Compute round 1 matches per side (for layout sizing)
  const r1LeftCount = matches.filter(m => m.roundNumber === 1 && m.side === "L").length;
  const r1RightCount = matches.filter(m => m.roundNumber === 1 && m.side === "R").length;
  const r1PerSide = Math.max(r1LeftCount, r1RightCount, 1);

  // Group matches: leftRounds = 1..totalRounds-1 for side L, rightRounds same for R, finalRound for F
  const leftRounds: number[] = [];
  const rightRounds: number[] = [];
  for (let r = 1; r < totalRounds; r++) {
    leftRounds.push(r);
    rightRounds.push(r);
  }
  const finalRound = totalRounds > 0 ? totalRounds : null;

  const getMatches = (side: string, round: number) =>
    matches.filter(m => m.side === side && m.roundNumber === round).sort((a, b) => a.matchNumber - b.matchNumber);

  const colHeight = r1PerSide * BASE_UNIT;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-widest flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" /> Tournament Bracket
          </h2>
          <p className="font-mono text-xs text-muted-foreground uppercase mt-1">
            {tournament ? `${tournament.name} • Round ${currentRound}/${totalRounds} • ${tournament.status.toUpperCase()}` : "No active tournament"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isActive && !champion && (
            <button onClick={handleStart} disabled={loading || registeredPlayers.length < 2}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 border border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-all font-mono text-[11px] uppercase tracking-widest rounded disabled:opacity-30">
              <Play className="h-3.5 w-3.5" /> Start Tournament
            </button>
          )}
          {tournament && (
            <button onClick={handleReset} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-all font-mono text-[11px] uppercase tracking-widest rounded disabled:opacity-30">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Flash */}
      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg font-mono text-sm text-white">
            {msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Champion Banner */}
      <AnimatePresence>
        {champion && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden p-8 border-2 border-yellow-500 rounded-2xl bg-gradient-to-r from-yellow-950/60 via-yellow-900/30 to-yellow-950/60 text-center shadow-[0_0_60px_rgba(234,179,8,0.3)]">
            <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-5xl mb-3">🏆</motion.div>
            <p className="font-mono text-xs text-yellow-400/70 uppercase tracking-[0.4em] mb-1">Tournament Champion</p>
            <h3 className="font-display text-4xl font-black text-yellow-400 uppercase tracking-widest">{champion}</h3>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No tournament */}
      {!tournament && (
        <div className="p-12 border border-white/5 rounded-2xl text-center bg-white/[0.02]">
          <Shield className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest">
            {registeredPlayers.length < 2
              ? `Need ${2 - registeredPlayers.length} more registered pilot(s) to start`
              : `${registeredPlayers.length} pilots ready — Click "Start Tournament"`}
          </p>
        </div>
      )}

      {/* Bracket View */}
      {tournament && matches.length > 0 && (
        <div className="overflow-x-auto pb-6">
          <div className="relative flex items-start gap-0 min-w-max" style={{ height: colHeight }}>

            {/* LEFT SIDE: rounds progress left→right */}
            {leftRounds.map((round, ri) => (
              <BracketColumn
                key={`L-${round}`}
                round={round}
                matches={getMatches("L", round)}
                totalMatchesInRound1PerSide={r1PerSide}
                currentRound={currentRound}
                onWin={handleWin}
                myRobotName={myRobotName}
              />
            ))}

            {/* CENTER: Final */}
            {finalRound && (
              <div className="relative flex-shrink-0 flex flex-col items-center" style={{ width: CARD_W + 48, height: colHeight, marginLeft: 24, marginRight: 24 }}>
                {/* Trophy */}
                <div className="absolute -top-8 left-0 right-0 text-center">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-yellow-400">Grand Final</span>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
                  <motion.div animate={{ boxShadow: ["0 0 10px rgba(234,179,8,0.2)", "0 0 30px rgba(234,179,8,0.5)", "0 0 10px rgba(234,179,8,0.2)"] }} transition={{ duration: 2, repeat: Infinity }} className="w-12 h-12 rounded-full border border-yellow-500/40 bg-yellow-950/30 flex items-center justify-center mb-2">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                  </motion.div>
                  <MatchCard
                    match={matches.find(m => m.side === "F" && m.roundNumber === finalRound) || null}
                    isCurrentRound={currentRound === finalRound}
                    onWin={handleWin}
                    isFinal
                    myRobotName={myRobotName}
                  />
                </div>
              </div>
            )}

            {/* RIGHT SIDE: rounds progress right→left (innermost first) */}
            {[...rightRounds].reverse().map((round, ri) => {
              const rMatches = getMatches("R", round);
              const matchCount = r1PerSide / Math.pow(2, round - 1);
              return (
                <div key={`R-${round}`} className="relative flex-shrink-0" style={{ marginLeft: ri === 0 ? 0 : 24 }}>
                  <div className="absolute -top-8 left-0 right-0 text-center">
                    <span className={`font-mono text-[9px] uppercase tracking-widest ${round === currentRound ? "text-primary" : "text-white/20"}`}>
                      {round === 1 ? "Round 1" : round === totalRounds - 1 ? "Semifinals" : `Round ${round}`}
                    </span>
                  </div>
                  <div className="relative" style={{ width: CARD_W, height: colHeight }}>
                    {Array.from({ length: matchCount }).map((_, idx) => {
                      const match = rMatches[idx] || null;
                      const top = matchTop(round, idx);
                      const midY = top + CARD_H / 2;
                      const isTopOfPair = idx % 2 === 0;
                      const pairPartnerMidY = isTopOfPair
                        ? matchTop(round, idx + 1) + CARD_H / 2
                        : matchTop(round, idx - 1) + CARD_H / 2;
                      return (
                        <div key={idx} className="absolute" style={{ top, left: 0 }}>
                          <MatchCard match={match} isCurrentRound={round === currentRound} onWin={handleWin} myRobotName={myRobotName} />
                          {/* Horizontal stub left */}
                          <div className="absolute top-1/2 -translate-y-1/2" style={{ right: CARD_W, width: 24, height: 1, background: match?.winnerId ? "rgba(255,69,0,0.5)" : "rgba(255,255,255,0.1)" }} />
                          {/* Vertical connector */}
                          {isTopOfPair && idx + 1 < matchCount && (
                            <div className="absolute" style={{ right: CARD_W + 23, top: CARD_H / 2, width: 1, height: pairPartnerMidY - midY, background: "rgba(255,255,255,0.1)" }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Round progress dots */}
          <div className="flex items-center gap-2 mt-4 justify-center flex-wrap">
            {Array.from({ length: totalRounds }).map((_, i) => {
              const rn = i + 1;
              return (
                <div key={rn} className="flex items-center gap-2">
                  <div className={`h-1.5 w-10 rounded-full transition-all duration-500 ${rn < currentRound ? "bg-primary/80" : rn === currentRound ? "bg-primary animate-pulse" : "bg-white/10"}`} />
                  {i < totalRounds - 1 && <div className="w-2 h-px bg-white/10" />}
                </div>
              );
            })}
            <span className="font-mono text-[10px] text-muted-foreground ml-2 uppercase">Round {currentRound}/{totalRounds}</span>
          </div>
        </div>
      )}
    </div>
  );
}
