export const STARTING_POINTS = 1000;
export const WIN_REWARD_AI  = 350;
export const WIN_REWARD_PVP = 500;

export interface PlayerSession {
  username: string;
  playerName: string;
  points: number;
  wins: number;
  eliminated: boolean;
  createdAt: number;
}

const SESSION_KEY = "roboArena_session";
const ROBOT_KEY   = "roboArena_robot";

export function getSession(): PlayerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PlayerSession) : null;
  } catch {
    return null;
  }
}

export function createSession(username: string, playerName: string): PlayerSession {
  const session: PlayerSession = {
    username: username.trim().toUpperCase(),
    playerName: playerName.trim(),
    points: STARTING_POINTS,
    wins: 0,
    eliminated: false,
    createdAt: Date.now(),
  };
  saveSession(session);
  return session;
}

export function saveSession(session: PlayerSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ROBOT_KEY);
}

export function calcPartCost(
  category: string,
  stats: { armor?: number; power?: number; speed?: number; energy?: number }
): number {
  const armor  = stats.armor  ?? 0;
  const power  = stats.power  ?? 0;
  const speed  = stats.speed  ?? 0;
  const energy = stats.energy ?? 0;

  if (category === "body") {
    return Math.max(100, Math.round((armor + power + speed + energy) * 1.15));
  }
  if (category === "attack") {
    return Math.max(80, Math.round(power * 2.5));
  }
  return Math.max(30, Math.round(Math.abs(armor) * 2.2 + 30));
}
