import type { Match, DraftStanding, Player } from "../types";

/**
 * Calculate Swiss-style standings for a draft.
 *
 * Tiebreakers (standard WotC):
 * 1. Match Points (3 for win, 1 for draw, 0 for loss)
 * 2. OMW% (Opponent Match Win %) - average of opponents' MW%, each floored at 33%
 * 3. GW% (Game Win %) - individual games won / played, floored at 33%
 * 4. OGW% (Opponent Game Win %) - average of opponents' GW%, each floored at 33%
 */
export function calculateDraftStandings(
  draftId: string,
  draftPlayerIds: string[],
  allMatches: Match[],
  playerLookup: Record<string, Player>
): DraftStanding[] {
  const matches = allMatches.filter(m => m.draftId === draftId);

  // Initialize standings for each player in the draft
  const standingsMap: Record<string, {
    matchWins: number;
    matchLosses: number;
    matchDraws: number;
    gameWins: number;
    gameLosses: number;
    opponents: string[];
  }> = {};

  for (const playerId of draftPlayerIds) {
    standingsMap[playerId] = {
      matchWins: 0,
      matchLosses: 0,
      matchDraws: 0,
      gameWins: 0,
      gameLosses: 0,
      opponents: [],
    };
  }

  // Process each match
  for (const match of matches) {
    const [p1, p2] = match.players;

    // Ensure both players are in the standings map
    if (!standingsMap[p1.playerId]) continue;
    if (!standingsMap[p2.playerId]) continue;

    // Track opponents
    standingsMap[p1.playerId].opponents.push(p2.playerId);
    standingsMap[p2.playerId].opponents.push(p1.playerId);

    // Track game wins/losses
    standingsMap[p1.playerId].gameWins += p1.wins;
    standingsMap[p1.playerId].gameLosses += p2.wins;
    standingsMap[p2.playerId].gameWins += p2.wins;
    standingsMap[p2.playerId].gameLosses += p1.wins;

    // Determine match result
    if (p1.wins === 2) {
      // Player 1 wins the match
      standingsMap[p1.playerId].matchWins += 1;
      standingsMap[p2.playerId].matchLosses += 1;
    } else if (p2.wins === 2) {
      // Player 2 wins the match
      standingsMap[p2.playerId].matchWins += 1;
      standingsMap[p1.playerId].matchLosses += 1;
    } else {
      // Draw (neither has 2 wins, but at least one game was played)
      standingsMap[p1.playerId].matchDraws += 1;
      standingsMap[p2.playerId].matchDraws += 1;
    }
  }

  // Calculate percentages
  const getMatchWinPct = (playerId: string): number => {
    const s = standingsMap[playerId];
    if (!s) return 0.33;
    const totalMatches = s.matchWins + s.matchLosses + s.matchDraws;
    if (totalMatches === 0) return 0.33;
    const matchPoints = s.matchWins * 3 + s.matchDraws * 1;
    const maxPoints = totalMatches * 3;
    return Math.max(matchPoints / maxPoints, 0.33);
  };

  const getGameWinPct = (playerId: string): number => {
    const s = standingsMap[playerId];
    if (!s) return 0.33;
    const totalGames = s.gameWins + s.gameLosses;
    if (totalGames === 0) return 0.33;
    return Math.max(s.gameWins / totalGames, 0.33);
  };

  const getOMWPct = (playerId: string): number => {
    const s = standingsMap[playerId];
    if (!s || s.opponents.length === 0) return 0.33;
    const opponentMWPcts = s.opponents.map(oppId => getMatchWinPct(oppId));
    return opponentMWPcts.reduce((a, b) => a + b, 0) / opponentMWPcts.length;
  };

  const getOGWPct = (playerId: string): number => {
    const s = standingsMap[playerId];
    if (!s || s.opponents.length === 0) return 0.33;
    const opponentGWPcts = s.opponents.map(oppId => getGameWinPct(oppId));
    return opponentGWPcts.reduce((a, b) => a + b, 0) / opponentGWPcts.length;
  };

  // Build standings array
  const standings: DraftStanding[] = draftPlayerIds.map(playerId => {
    const s = standingsMap[playerId] || {
      matchWins: 0, matchLosses: 0, matchDraws: 0,
      gameWins: 0, gameLosses: 0, opponents: [],
    };

    return {
      playerId,
      playerName: playerLookup[playerId]?.name || playerId,
      matchPoints: s.matchWins * 3 + s.matchDraws * 1,
      matchRecord: {
        wins: s.matchWins,
        losses: s.matchLosses,
        draws: s.matchDraws,
      },
      gameRecord: {
        wins: s.gameWins,
        losses: s.gameLosses,
      },
      matchWinPct: getMatchWinPct(playerId),
      gameWinPct: getGameWinPct(playerId),
      omwPct: getOMWPct(playerId),
      ogwPct: getOGWPct(playerId),
    };
  });

  // Sort by: Match Points > OMW% > GW% > OGW%
  standings.sort((a, b) => {
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
    if (b.omwPct !== a.omwPct) return b.omwPct - a.omwPct;
    if (b.gameWinPct !== a.gameWinPct) return b.gameWinPct - a.gameWinPct;
    return b.ogwPct - a.ogwPct;
  });

  return standings;
}

/**
 * Get the winner of a match, or null if it's a draw.
 */
export function getMatchWinner(match: Match): string | null {
  const [p1, p2] = match.players;
  if (p1.wins === 2) return p1.playerId;
  if (p2.wins === 2) return p2.playerId;
  return null; // draw
}

/**
 * Get the match score as a display string (e.g., "2 - 1").
 */
export function getMatchScore(match: Match): string {
  const [p1, p2] = match.players;
  const winnerId = getMatchWinner(match);
  if (winnerId === p1.playerId) {
    return `${p1.wins} - ${p2.wins}`;
  } else if (winnerId === p2.playerId) {
    return `${p2.wins} - ${p1.wins}`;
  }
  // Draw - put higher score first
  return p1.wins >= p2.wins ? `${p1.wins} - ${p2.wins}` : `${p2.wins} - ${p1.wins}`;
}

/**
 * Format a percentage for display (e.g., 0.5556 → "55.6%")
 */
export function formatPct(pct: number): string {
  return `${(pct * 100).toFixed(0)}%`;
}
