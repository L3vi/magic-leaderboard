import React, { useMemo, useState, useCallback } from "react";
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
  const { event, players, updatePlayer } = useCubeEvent();

  const decodedName = playerName ? decodeURIComponent(playerName) : "";
  const playerData = players.find(p => p.name === decodedName);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = useCallback(() => {
    if (!playerData) return;
    setEditName(playerData.name);
    setIsEditing(true);
  }, [playerData]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!playerData) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      alert("Name cannot be empty.");
      return;
    }
    if (trimmed === playerData.name) {
      setIsEditing(false);
      return;
    }
    // Check for duplicate names
    if (players.some(p => p.id !== playerData.id && p.name.toLowerCase() === trimmed.toLowerCase())) {
      alert("A player with that name already exists.");
      return;
    }
    setIsSaving(true);
    try {
      await updatePlayer(playerData.id, trimmed);
      setIsEditing(false);
      // Navigate to the new URL since the route uses playerName
      navigate(`/players/${encodeURIComponent(trimmed)}`, { replace: true });
    } catch {
      alert("Failed to update name. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [playerData, editName, players, updatePlayer, navigate]);

  const playerLookup = useMemo(() => {
    const lookup: Record<string, Player> = {};
    for (const p of players) lookup[p.id] = p;
    return lookup;
  }, [players]);

  const stats = useMemo(() => {
    if (!playerData || !event) return null;

    let matchWins = 0, matchLosses = 0, matchDraws = 0, gameWins = 0, gameLosses = 0;
    const colorBreakdown: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    const colorWins: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    const colorMatches: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    const cubesSet = new Set<string>();

    // Per-cube tracking
    const cubeStatsMap: Record<string, { name: string; wins: number; losses: number; draws: number }> = {};

    // Head-to-head tracking
    const h2h: Record<string, { opponentId: string; name: string; wins: number; losses: number; draws: number }> = {};

    // Color pair tracking
    const colorPairMap: Record<string, { wins: number; losses: number; draws: number; total: number }> = {};

    const matchHistory: Array<{
      matchId: string;
      opponentName: string;
      playerWins: number;
      opponentWins: number;
      won: boolean | null;
      date: string;
      draftName: string;
    }> = [];

    // Sort matches chronologically for streak calculation
    const playerMatches = event.matches
      .filter(m => m.players.some(p => p.playerId === playerData.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let currentStreak = 0;
    let currentStreakType: "W" | "L" | null = null;
    let longestWinStreak = 0;
    let runningWinStreak = 0;

    for (const match of playerMatches) {
      const pe = match.players.find(p => p.playerId === playerData.id);
      if (!pe) continue;
      const opp = match.players.find(p => p.playerId !== playerData.id);
      if (!opp) continue;

      gameWins += pe.wins;
      gameLosses += opp.wins;

      const winnerId = getMatchWinner(match);
      const won = winnerId === playerData.id;
      const lost = winnerId !== null && winnerId !== playerData.id;

      if (won) matchWins++;
      else if (lost) matchLosses++;
      else matchDraws++;

      // Color breakdown + per-color win rate
      const colors = (pe.deckColors || []) as ManaColor[];
      for (const c of colors) {
        colorBreakdown[c] = (colorBreakdown[c] || 0) + 1;
        colorMatches[c]++;
        if (won) colorWins[c]++;
      }

      // Color pair stats
      if (colors.length > 0) {
        const pairKey = [...colors].sort().join("");
        if (!colorPairMap[pairKey]) colorPairMap[pairKey] = { wins: 0, losses: 0, draws: 0, total: 0 };
        colorPairMap[pairKey].total++;
        if (won) colorPairMap[pairKey].wins++;
        else if (lost) colorPairMap[pairKey].losses++;
        else colorPairMap[pairKey].draws++;
      }

      // Cube stats
      const draft = event.drafts.find(d => d.id === match.draftId);
      if (draft) {
        cubesSet.add(draft.cubeId);
        if (!cubeStatsMap[draft.cubeId]) {
          const cube = event.cubes.find(c => c.id === draft.cubeId);
          cubeStatsMap[draft.cubeId] = { name: cube?.name || draft.cubeId, wins: 0, losses: 0, draws: 0 };
        }
        if (won) cubeStatsMap[draft.cubeId].wins++;
        else if (lost) cubeStatsMap[draft.cubeId].losses++;
        else cubeStatsMap[draft.cubeId].draws++;
      }

      // Head-to-head
      if (!h2h[opp.playerId]) {
        h2h[opp.playerId] = {
          opponentId: opp.playerId,
          name: playerLookup[opp.playerId]?.name || opp.playerId,
          wins: 0, losses: 0, draws: 0,
        };
      }
      if (won) h2h[opp.playerId].wins++;
      else if (lost) h2h[opp.playerId].losses++;
      else h2h[opp.playerId].draws++;

      // Streak tracking
      if (won) {
        runningWinStreak++;
        longestWinStreak = Math.max(longestWinStreak, runningWinStreak);
        if (currentStreakType === "W") currentStreak++;
        else { currentStreakType = "W"; currentStreak = 1; }
      } else if (lost) {
        runningWinStreak = 0;
        if (currentStreakType === "L") currentStreak++;
        else { currentStreakType = "L"; currentStreak = 1; }
      } else {
        runningWinStreak = 0;
        currentStreakType = null;
        currentStreak = 0;
      }

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
        won: won ? true : lost ? false : null,
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

    // Color win rates
    const colorWinRates = MANA_COLORS
      .filter(c => colorMatches[c] > 0)
      .map(c => ({ color: c, wins: colorWins[c], matches: colorMatches[c], pct: colorWins[c] / colorMatches[c] }));

    // Best/worst color by win rate (only if they differ)
    const bestColor = colorWinRates.length > 0 ? colorWinRates.reduce((a, b) => a.pct > b.pct ? a : b) : null;
    const worstColor = colorWinRates.length > 1 ? colorWinRates.reduce((a, b) => a.pct < b.pct ? a : b) : null;

    // Head-to-head sorted by most matches
    const headToHead = Object.values(h2h).sort((a, b) => {
      const aTotal = a.wins + a.losses + a.draws;
      const bTotal = b.wins + b.losses + b.draws;
      return bTotal - aTotal;
    });

    // Color pairs sorted by most played
    const colorPairs = Object.entries(colorPairMap)
      .map(([pair, s]) => ({
        pair,
        colors: pair.split("") as ManaColor[],
        ...s,
        winPct: s.total > 0 ? s.wins / s.total : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      matchesPlayed,
      matchWins, matchLosses, matchDraws,
      gameWins, gameLosses,
      matchWinPct: matchesPlayed > 0 ? matchWins / matchesPlayed : 0,
      gameWinPct: totalGames > 0 ? gameWins / totalGames : 0,
      draftsPlayed,
      colorBreakdown,
      colorWinRates,
      bestColor,
      worstColor: worstColor?.color !== bestColor?.color ? worstColor : null,
      favoriteColor,
      cubesPlayed: Array.from(cubesSet),
      cubeStats: Object.values(cubeStatsMap),
      headToHead,
      colorPairs,
      currentStreak,
      currentStreakType,
      longestWinStreak,
      matchHistory,
    };
  }, [playerData, event, playerLookup]);

  if (!playerData || !stats) {
    return (
      <DetailsPageShell title="Player" onClose={() => navigate(-1)} error={`Player "${decodedName}" not found`} />
    );
  }

  return (
    <DetailsPageShell
      title={playerData.name}
      onClose={() => navigate(-1)}
      onEdit={isEditing ? undefined : startEditing}
    >
      <div className="player-details-cube">
        {/* Inline name editor */}
        {isEditing && (
          <div className="pd-edit-name">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") cancelEditing();
              }}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                fontSize: "var(--font-size-lg)",
                fontWeight: 600,
                background: "var(--surface)",
                border: "1.5px solid var(--primary)",
                borderRadius: "var(--radius-sm)",
                color: "var(--foreground)",
                textAlign: "center",
              }}
            />
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "0.75rem" }}>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
                style={{
                  background: "transparent",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.375rem 1rem",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  background: "var(--primary)",
                  border: "1.5px solid var(--primary)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.375rem 1rem",
                  color: "#fff",
                  cursor: isSaving ? "not-allowed" : "pointer",
                  fontSize: "var(--font-size-sm)",
                  opacity: isSaving ? 0.5 : 1,
                }}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

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

        {/* Streaks */}
        {stats.matchesPlayed > 0 && (
          <div className="pd-stats-grid pd-stats-grid-3">
            <div className="pd-stat-card">
              <div className="pd-stat-label">Current Streak</div>
              <div className={`pd-stat-value${stats.currentStreakType === "W" ? " streak-win" : stats.currentStreakType === "L" ? " streak-loss" : ""}`}>
                {stats.currentStreak > 0
                  ? `${stats.currentStreak}${stats.currentStreakType}`
                  : "—"}
              </div>
            </div>
            <div className="pd-stat-card">
              <div className="pd-stat-label">Best Streak</div>
              <div className="pd-stat-value streak-win">{stats.longestWinStreak > 0 ? `${stats.longestWinStreak}W` : "—"}</div>
            </div>
            <div className="pd-stat-card">
              <div className="pd-stat-label">Games</div>
              <div className="pd-stat-value">{stats.gameWins}-{stats.gameLosses}</div>
            </div>
          </div>
        )}

        {/* Color stats with win rates */}
        <div className="pd-section">
          <h3>Colors Played</h3>
          <div className="pd-color-bars">
            {MANA_COLORS.map(c => {
              const wr = stats.colorWinRates.find(cr => cr.color === c);
              return (
                <div key={c} className="pd-color-row">
                  <span className={`pd-color-name color-badge color-${c.toLowerCase()}`}>{MANA_COLOR_NAMES[c]}</span>
                  <div className="pd-color-bar-bg">
                    <div
                      className={`pd-color-bar-fill color-${c.toLowerCase()}`}
                      style={{ width: `${stats.matchesPlayed > 0 ? (stats.colorBreakdown[c] / stats.matchesPlayed) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="pd-color-count">{stats.colorBreakdown[c]}</span>
                  <span className="pd-color-winrate">{wr ? `${(wr.pct * 100).toFixed(0)}%` : ""}</span>
                </div>
              );
            })}
          </div>
          <div className="pd-color-highlights">
            {stats.favoriteColor && (
              <span className="pd-color-tag">
                Most played: <span className={`color-badge color-${stats.favoriteColor.toLowerCase()}`}>{MANA_COLOR_NAMES[stats.favoriteColor]}</span>
              </span>
            )}
            {stats.bestColor && (
              <span className="pd-color-tag">
                Best: <span className={`color-badge color-${stats.bestColor.color.toLowerCase()}`}>{MANA_COLOR_NAMES[stats.bestColor.color]}</span>
                <span className="pd-color-tag-pct">{(stats.bestColor.pct * 100).toFixed(0)}%</span>
              </span>
            )}
            {stats.worstColor && (
              <span className="pd-color-tag">
                Worst: <span className={`color-badge color-${stats.worstColor.color.toLowerCase()}`}>{MANA_COLOR_NAMES[stats.worstColor.color]}</span>
                <span className="pd-color-tag-pct">{(stats.worstColor.pct * 100).toFixed(0)}%</span>
              </span>
            )}
          </div>
        </div>

        {/* Color pair performance */}
        {stats.colorPairs.length > 0 && (
          <div className="pd-section">
            <h3>Deck Archetypes</h3>
            <div className="pd-archetype-list">
              {stats.colorPairs.map(cp => (
                <div key={cp.pair} className="pd-archetype-row">
                  <div className="pd-archetype-colors">
                    {cp.colors.map(c => (
                      <span key={c} className={`pd-archetype-pip color-${c.toLowerCase()}`} />
                    ))}
                  </div>
                  <div className="pd-archetype-record">{cp.wins}-{cp.losses}{cp.draws > 0 ? `-${cp.draws}` : ""}</div>
                  <div className="pd-archetype-bar-bg">
                    <div className="pd-archetype-bar-fill" style={{ width: `${cp.winPct * 100}%` }} />
                  </div>
                  <div className="pd-archetype-pct">{(cp.winPct * 100).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-cube performance */}
        {stats.cubeStats.length > 0 && (
          <div className="pd-section">
            <h3>Performance by Cube</h3>
            <div className="pd-cube-list">
              {stats.cubeStats.map(cs => {
                const total = cs.wins + cs.losses + cs.draws;
                const pct = total > 0 ? cs.wins / total : 0;
                return (
                  <div key={cs.name} className="pd-cube-row">
                    <div className="pd-cube-name">{cs.name}</div>
                    <div className="pd-cube-record">{cs.wins}-{cs.losses}{cs.draws > 0 ? `-${cs.draws}` : ""}</div>
                    <div className="pd-cube-bar-bg">
                      <div className="pd-cube-bar-fill" style={{ width: `${pct * 100}%` }} />
                    </div>
                    <div className="pd-cube-pct">{(pct * 100).toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Head-to-head */}
        {stats.headToHead.length > 0 && (
          <div className="pd-section">
            <h3>Head-to-Head</h3>
            <div className="pd-h2h-list">
              {stats.headToHead.map(opp => {
                const total = opp.wins + opp.losses + opp.draws;
                const pct = total > 0 ? opp.wins / total : 0;
                return (
                  <div
                    key={opp.opponentId}
                    className="pd-h2h-row"
                    onClick={() => navigate(`/players/${encodeURIComponent(opp.name)}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="pd-h2h-name">{opp.name}</div>
                    <div className="pd-h2h-record">{opp.wins}-{opp.losses}{opp.draws > 0 ? `-${opp.draws}` : ""}</div>
                    <div className="pd-h2h-bar-bg">
                      <div
                        className={`pd-h2h-bar-fill${pct > 0.5 ? " winning" : pct < 0.5 ? " losing" : ""}`}
                        style={{ width: `${pct * 100}%` }}
                      />
                    </div>
                    <div className="pd-h2h-pct">{(pct * 100).toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Draft stats */}
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
