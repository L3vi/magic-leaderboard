import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DetailsPageShell from "../components/DetailsPageShell/DetailsPageShell";
import { useCubeEvent } from "../context/CubeEventContext";
import { getMatchWinner } from "../utils/standings";
import type { ManaColor, Player } from "../types";
import { MANA_COLORS, MANA_COLOR_NAMES } from "../types";
import "./PlayerDetailsPage.css";

const PlayerDetailsPage: React.FC = () => {
  const { playerName } = useParams<{ playerName: string }>();
  const navigate = useNavigate();
  const { event, players } = useCubeEvent();

  const decodedName = playerName ? decodeURIComponent(playerName) : "";
  const playerData = players.find(p => p.name === decodedName);

  const playerLookup = useMemo(() => {
    const lookup: Record<string, Player> = {};
    for (const p of players) lookup[p.id] = p;
    return lookup;
  }, [players]);

  const stats = useMemo(() => {
    if (!playerData || !event) return null;

    let matchWins = 0, matchLosses = 0, matchDraws = 0, gameWins = 0, gameLosses = 0;
    const colorBreakdown: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    const cubesSet = new Set<string>();
    const matchHistory: Array<{
      matchId: string;
      opponentName: string;
      playerWins: number;
      opponentWins: number;
      won: boolean | null;
      date: string;
      draftName: string;
    }> = [];

    for (const match of event.matches) {
      const pe = match.players.find(p => p.playerId === playerData.id);
      if (!pe) continue;
      const opp = match.players.find(p => p.playerId !== playerData.id);
      if (!opp) continue;

      gameWins += pe.wins;
      gameLosses += opp.wins;

      const winnerId = getMatchWinner(match);
      if (winnerId === playerData.id) matchWins++;
      else if (winnerId) matchLosses++;
      else matchDraws++;

      for (const c of pe.deckColors) {
        colorBreakdown[c as ManaColor] = (colorBreakdown[c as ManaColor] || 0) + 1;
      }

      const draft = event.drafts.find(d => d.id === match.draftId);
      if (draft) cubesSet.add(draft.cubeId);

      // Draft name
      let draftName = match.draftId;
      if (draft) {
        const cube = event.cubes.find(c => c.id === draft.cubeId);
        const cubeDraftNum = event.drafts.filter(d => d.cubeId === draft.cubeId).findIndex(d => d.id === draft.id) + 1;
        draftName = `${cube?.name || draft.cubeId} #${cubeDraftNum}`;
      }

      matchHistory.push({
        matchId: match.id,
        opponentName: playerLookup[opp.playerId]?.name || opp.playerId,
        playerWins: pe.wins,
        opponentWins: opp.wins,
        won: winnerId === playerData.id ? true : winnerId ? false : null,
        date: match.date,
        draftName,
      });
    }

    matchHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const matchesPlayed = matchWins + matchLosses + matchDraws;
    const totalGames = gameWins + gameLosses;
    const draftsPlayed = event.drafts.filter(d => d.players.includes(playerData.id)).length;

    let favoriteColor: ManaColor | null = null;
    let maxColorCount = 0;
    for (const c of MANA_COLORS) {
      if (colorBreakdown[c] > maxColorCount) {
        maxColorCount = colorBreakdown[c];
        favoriteColor = c;
      }
    }

    return {
      matchesPlayed,
      matchWins, matchLosses, matchDraws,
      gameWins, gameLosses,
      matchWinPct: matchesPlayed > 0 ? matchWins / matchesPlayed : 0,
      gameWinPct: totalGames > 0 ? gameWins / totalGames : 0,
      draftsPlayed,
      colorBreakdown,
      favoriteColor,
      cubesPlayed: Array.from(cubesSet),
      matchHistory,
    };
  }, [playerData, event, playerLookup]);

  if (!playerData || !stats) {
    return (
      <DetailsPageShell title="Player" onClose={() => navigate(-1)} error={`Player "${decodedName}" not found`} />
    );
  }

  return (
    <DetailsPageShell title={playerData.name} onClose={() => navigate(-1)}>
      <div className="player-details-cube">
        {/* Key stats */}
        <div className="pd-stats-grid">
          <div className="pd-stat-card">
            <div className="pd-stat-label">Matches</div>
            <div className="pd-stat-value">{stats.matchesPlayed}</div>
          </div>
          <div className="pd-stat-card">
            <div className="pd-stat-label">Record</div>
            <div className="pd-stat-value">{stats.matchWins}-{stats.matchLosses}-{stats.matchDraws}</div>
          </div>
          <div className="pd-stat-card">
            <div className="pd-stat-label">Match Win %</div>
            <div className="pd-stat-value accent">{stats.matchesPlayed > 0 ? `${(stats.matchWinPct * 100).toFixed(0)}%` : "—"}</div>
          </div>
          <div className="pd-stat-card">
            <div className="pd-stat-label">Game Win %</div>
            <div className="pd-stat-value accent">{(stats.gameWins + stats.gameLosses) > 0 ? `${(stats.gameWinPct * 100).toFixed(0)}%` : "—"}</div>
          </div>
        </div>

        {/* Color stats */}
        <div className="pd-section">
          <h3>Colors Played</h3>
          <div className="pd-color-bars">
            {MANA_COLORS.map(c => (
              <div key={c} className="pd-color-row">
                <span className={`pd-color-name color-badge color-${c.toLowerCase()}`}>{MANA_COLOR_NAMES[c]}</span>
                <div className="pd-color-bar-bg">
                  <div
                    className={`pd-color-bar-fill color-${c.toLowerCase()}`}
                    style={{ width: `${stats.matchesPlayed > 0 ? (stats.colorBreakdown[c] / stats.matchesPlayed) * 100 : 0}%` }}
                  />
                </div>
                <span className="pd-color-count">{stats.colorBreakdown[c]}</span>
              </div>
            ))}
          </div>
          {stats.favoriteColor && (
            <div className="pd-favorite-color">
              Favorite: <span className={`color-badge color-${stats.favoriteColor.toLowerCase()}`}>{MANA_COLOR_NAMES[stats.favoriteColor]}</span>
            </div>
          )}
        </div>

        {/* Draft & cube stats */}
        <div className="pd-section">
          <h3>Drafts</h3>
          <div className="pd-stat-inline">Drafts played: <strong>{stats.draftsPlayed}</strong></div>
          <div className="pd-stat-inline">Cubes played: <strong>{stats.cubesPlayed.length}</strong></div>
        </div>

        {/* Match history */}
        <div className="pd-section">
          <h3>Match History</h3>
          <div className="pd-match-list">
            {stats.matchHistory.map(m => (
              <div
                key={m.matchId}
                className={`pd-match-item${m.won === true ? " won" : m.won === false ? " lost" : " draw"}`}
                onClick={() => navigate(`/matches/${m.matchId}`)}
                role="button"
                tabIndex={0}
              >
                <div className="pd-match-result">
                  <span className="pd-match-opponent">vs {m.opponentName}</span>
                  <span className="pd-match-score">{m.playerWins} - {m.opponentWins}</span>
                </div>
                <div className="pd-match-meta">{m.draftName}</div>
              </div>
            ))}
            {stats.matchHistory.length === 0 && (
              <div className="pd-empty">No matches played yet.</div>
            )}
          </div>
        </div>
      </div>
    </DetailsPageShell>
  );
};

export default PlayerDetailsPage;
