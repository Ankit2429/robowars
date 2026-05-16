export interface BracketMatch {
  p1: string; // socketId
  p2: string; // socketId
}

export interface BracketResult {
  matches: BracketMatch[];
  byes: string[]; // socketIds
}

/**
 * Generates a tournament bracket for the given players.
 * If the number of players is not a power of 2, the highest seeds (we just take the first N players) get a BYE.
 */
export function generateBracket(playerSocketIds: string[]): BracketResult {
  const count = playerSocketIds.length;
  if (count === 0) return { matches: [], byes: [] };
  if (count === 1) return { matches: [], byes: [playerSocketIds[0]] };

  // Next power of 2
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(count)));
  
  // Number of BYEs = Next power of 2 - number of players
  // E.g. 60 players. Next power of 2 = 64. BYEs = 4.
  // E.g. 3 players. Next power of 2 = 4. BYEs = 1.
  const numByes = nextPowerOf2 - count;

  const byes = playerSocketIds.slice(0, numByes);
  const remaining = playerSocketIds.slice(numByes);

  const matches: BracketMatch[] = [];
  // Pair the remaining players
  for (let i = 0; i < remaining.length; i += 2) {
    if (i + 1 < remaining.length) {
      matches.push({
        p1: remaining[i],
        p2: remaining[i + 1]
      });
    }
  }

  return { matches, byes };
}
