import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  getSession, createSession, saveSession, clearSession,
  calcPartCost, WIN_REWARD_AI, WIN_REWARD_PVP,
  type PlayerSession,
} from "@/lib/session";

interface SessionContextValue {
  session: PlayerSession | null;
  isLoggedIn: boolean;
  isEliminated: boolean;
  login: (username: string, playerName: string) => PlayerSession;
  logout: () => void;
  recordWin: (isAI: boolean) => PlayerSession;
  recordLoss: () => PlayerSession;
  deductPoints: (amount: number) => boolean;
  refreshSession: () => void;
  calcPartCost: typeof calcPartCost;
  WIN_REWARD_AI: number;
  WIN_REWARD_PVP: number;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PlayerSession | null>(() => getSession());

  const login = useCallback((username: string, playerName: string): PlayerSession => {
    const existing = getSession();
    if (existing && existing.username === username.trim().toUpperCase()) {
      setSession(existing);
      return existing;
    }
    const newSession = createSession(username, playerName);
    setSession(newSession);
    return newSession;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const recordWin = useCallback((isAI: boolean): PlayerSession => {
    const s = getSession();
    if (!s) throw new Error("No session");
    const reward = isAI ? WIN_REWARD_AI : WIN_REWARD_PVP;
    const updated: PlayerSession = { ...s, points: s.points + reward, wins: s.wins + 1 };
    saveSession(updated);
    setSession(updated);
    return updated;
  }, []);

  const recordLoss = useCallback((): PlayerSession => {
    const s = getSession();
    if (!s) throw new Error("No session");
    const updated: PlayerSession = { ...s, eliminated: true };
    saveSession(updated);
    setSession(updated);
    return updated;
  }, []);

  const deductPoints = useCallback((amount: number): boolean => {
    const s = getSession();
    if (!s || s.points < amount) return false;
    const updated: PlayerSession = { ...s, points: s.points - amount };
    saveSession(updated);
    setSession(updated);
    return true;
  }, []);

  const refreshSession = useCallback(() => {
    setSession(getSession());
  }, []);

  return (
    <SessionContext.Provider value={{
      session,
      isLoggedIn: !!session,
      isEliminated: session?.eliminated ?? false,
      login,
      logout,
      recordWin,
      recordLoss,
      deductPoints,
      refreshSession,
      calcPartCost,
      WIN_REWARD_AI,
      WIN_REWARD_PVP,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
