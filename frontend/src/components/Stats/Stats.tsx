import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCubeEvent } from "../../context/CubeEventContext";
import { getMatchWinner } from "../../utils/standings";
import type { ManaColor, Player } from "../../types";
import { MANA_COLORS, MANA_COLOR_NAMES } from "../../types";
import MatchRow from "./MatchRow";
import "./Stats.css";

const Stats: React.FC = () => {
  const navigate = useNavigate();
  const { event, players, loading } = useCubeEvent();
  const [filter, setFilter] = useState("");

  const playerLookup = useMemo(() => {
    const lookup: Record<string, Player> = {};
    for (const p of players) lookup[p.id] = p;
    return lookup;
  }, [players]);

  const stats = useMemo(() => {
    if (!event) return null;
    const totalDrafts = event.drafts.length;
    const totalMatches = event.matches.length;
    const totalPlayers = event.players.length;
    const totalGames = event.matches.reduce((sum, m) => sum + m.players[0].wins + m.players[1].wins, 0);

    // Color stats: play count + win rate
    const colorCounts: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    const colorWins: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    const colorMatchCount: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };

    // Per-cube stats
    const cubeStatsMap: Record<string, { name: string; matches: number; games: number; drafts: number }> = {};

    // Archetype (color pair) stats
    const archetypeMap: Record<string, { wins: number; losses: number; draws: number; total: number }> = {};

    // Per-player aggregates for superlatives
    const playerStatsMap: Record<string, {
      wins: number; losses: number; draws: number;
      gameWins: number; gameLosses: number;
      currentStreak: number; currentStreakType: "W" | "L" | null;
      longestWinStreak: number; runningWinStreak: number;
    }> = {};

    // Initialize player stats
    for (const pid of event.players) {
      playerStatsMap[pid] = {
        wins: 0, losses: 0, draws: 0,
        gameWins: 0, gameLosses: 0,
        currentStreak: 0, currentStreakType: null,
        longestWinStreak: 0, runningWinStreak: 0,
      };
    }

    // Sort matches chronologically for streak tracking
    const sortedMatches = [...event.matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const match of sortedMatches) {
      const [p1, p2] = match.players;
      const winnerId = getMatchWinner(match);

      // Color counting
      for (const p of match.players) {
        const colors = (p.deckColors || []) as ManaColor[];
        for (const c of colors) {
          colorCounts[c]++;
          colorMatchCount[c]++;
          if (winnerId === p.playerId) colorWins[c]++;
        }

        // Archetype tracking
        if (colors.length > 0) {
          const key = [...colors].sort().join("");
          if (!archetypeMap[key]) archetypeMap[key] = { wins: 0, losses: 0, draws: 0, total: 0 };
          archetypeMap[key].total++;
          if (winnerId === p.playerId) archetypeMap[key].wins++;
          else if (winnerId && winnerId !== p.playerId) archetypeMap[key].losses++;
          else archetypeMap[key].draws++;
        }
      }

      // Cube stats
      const draft = event.drafts.find(d => d.id === match.draftId);
      if (draft) {
        if (!cubeStatsMap[draft.cubeId]) {
          const cube = event.cubes.find(c => c.id === draft.cubeId);
          cubeStatsMap[draft.cubeId] = { name: cube?.name || draft.cubeId, matches: 0, games: 0, drafts: 0 };
        }
        cubeStatsMap[draft.cubeId].matches++;
        cubeStatsMap[draft.cubeId].games += p1.wins + p2.wins;
      }

      // Player stats + streak tracking
      for (const p of match.players) {
        const ps = playerStatsMap[p.playerId];
        if (!ps) continue;
        const opp = match.players.find(mp => mp.playerId !== p.playerId);
        if (!opp) continue;

        ps.gameWins += p.wins;
        ps.gameLosses += opp.wins;

        const won = winnerId === p.playerId;
        const lost = winnerId !== null && winnerId !== p.playerId;

        if (won) {
          ps.wins++;
          ps.runningWinStreak++;
          ps.longestWinStreak = Math.max(ps.longestWinStreak, ps.runningWinStreak);
          if (ps.currentStreakType === "W") ps.currentStreak++;
          else { ps.currentStreakType = "W"; ps.currentStreak = 1; }
        } else if (lost) {
          ps.losses++;
          ps.runningWinStreak = 0;
          if (ps.currentStreakType === "L") ps.currentStreak++;
          else { ps.currentStreakType = "L"; ps.currentStreak = 1; }
        } else {
          ps.draws++;
          ps.runningWinStreak = 0;
          ps.currentStreakType = null;
          ps.currentStreak = 0;
        }
      }
    }

    // Count drafts per cube
    for (const d of event.drafts) {
      if (cubeStatsMap[d.cubeId]) cubeStatsMap[d.cubeId].drafts++;
    }

    // Color win rates
    const colorStats = MANA_COLORS.map(c => ({
      color: c,
      count: colorCounts[c],
      wins: colorWins[c],
      matches: colorMatchCount[c],
      winPct: colorMatchCount[c] > 0 ? colorWins[c] / colorMatchCount[c] : 0,
    }));
    const maxColorCount = Math.max(...colorStats.map(c => c.count), 1);
    const bestWinRateColor = colorStats.filter(c => c.matches > 0).sort((a, b) => b.winPct - a.winPct)[0] || null;

    // Top archetypes sorted by play count
    const archetypes = Object.entries(archetypeMap)
      .map(([pair, s]) => ({
        pair,
        colors: pair.split("") as ManaColor[],
        ...s,
        winPct: s.total > 0 ? s.wins / s.total : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // Cube stats array
    const cubeStats = Object.values(cubeStatsMap);

    // Player superlatives (only players with matches)
    const activePlayers = Object.entries(playerStatsMap)
      .filter(([, ps]) => ps.wins + ps.losses + ps.draws > 0)
      .map(([id, ps]) => {
        const total = ps.wins + ps.losses + ps.draws;
        return { id, name: playerLookup[id]?.name || id, ...ps, total, winPct: total > 0 ? ps.wins / total : 0 };
      });

    const highestWinRate = activePlayers.length > 0
      ? activePlayers.reduce((a, b) => a.winPct > b.winPct ? a : b)
      : null;
    const mostMatches = activePlayers.length > 0
      ? activePlayers.reduce((a, b) => a.total > b.total ? a : b)
      : null;
    const bestStreak = activePlayers.length > 0
      ? activePlayers.reduce((a, b) => a.longestWinStreak > b.longestWinStreak ? a : b)
      : null;
    const hottest = activePlayers.length > 0
      ? activePlayers
          .filter(p => p.currentStreakType === "W")
          .sort((a, b) => b.currentStreak - a.currentStreak)[0] || null
      : null;
    const mostGameWins = activePlayers.length > 0
      ? activePlayers.reduce((a, b) => a.gameWins > b.gameWins ? a : b)
      : null;

    return {
      totalDrafts, totalMatches, totalPlayers, totalGames,
      colorStats, maxColorCount, bestWinRateColor,
      archetypes,
      cubeStats,
      highestWinRate, mostMatches, bestStreak, hottest, mostGameWins,
    };
  }, [event, playerLookup]);

  const filteredMatches = useMemo(() => {
    if (!event) return [];
    let matches = [...event.matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filter.trim()) {
      const q = filter.trim().toLowerCase();
      matches = matches.filter(m =>
        m.players.some(p => {
          const name = playerLookup[p.playerId]?.name || p.playerId;
          return name.toLowerCase().includes(q);
        })
      );
    }
    return matches;
  }, [event, filter, playerLookup]);

  if (loading) {
    return <div className="main-section"><div className="loading">Loading...</div></div>;
  }

  if (!event || !stats) {
    return <div className="main-section"><div className="stats-empty">No event data available.</div></div>;
  }

  return (
    <div className="main-section">
      <div className="stats-page">
        {/* Overall stats cards */}
        <div className="stats-section">
          <h2>Weekend Stats</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Drafts</div>
              <div className="stat-value">{stats.totalDrafts}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Matches</div>
              <div className="stat-value">{stats.totalMatches}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Games</div>
              <div className="stat-value">{stats.totalGames}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Players</div>
              <div className="stat-value">{stats.totalPlayers}</div>
            </div>
          </div>
        </div>

        {/* Player superlatives */}
        {stats.totalMatches > 0 && (
          <div className="stats-section">
            <h2>Highlights</h2>
            <div className="stats-highlights">
              {stats.highestWinRate && (
                <div
                  className="stats-highlight-card"
                  onClick={() => navigate(`/players/${encodeURIComponent(stats.highestWinRate!.name)}`)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="stats-hl-label">Highest Win Rate</div>
                  <div className="stats-hl-name">{stats.highestWinRate.name}</div>
                  <div className="stats-hl-detail">{(stats.highestWinRate.winPct * 100).toFixed(0)}% ({stats.highestWinRate.wins}-{stats.highestWinRate.losses}{stats.highestWinRate.draws > 0 ? `-${stats.highestWinRate.draws}` : ""})</div>
                </div>
              )}
              {stats.mostMatches && (
                <div
                  className="stats-highlight-card"
                  onClick={() => navigate(`/players/${encodeURIComponent(stats.mostMatches!.name)}`)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="stats-hl-label">Most Active</div>
                  <div className="stats-hl-name">{stats.mostMatches.name}</div>
                  <div className="stats-hl-detail">{stats.mostMatches.total} matches</div>
                </div>
              )}
              {stats.bestStreak && stats.bestStreak.longestWinStreak > 1 && (
                <div
                  className="stats-highlight-card"
                  onClick={() => navigate(`/players/${encodeURIComponent(stats.bestStreak!.name)}`)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="stats-hl-label">Longest Win Streak</div>
                  <div className="stats-hl-name">{stats.bestStreak.name}</div>
                  <div className="stats-hl-detail">{stats.bestStreak.longestWinStreak} wins</div>
                </div>
              )}
              {stats.hottest && (
                <div
                  className="stats-highlight-card hot"
                  onClick={() => navigate(`/players/${encodeURIComponent(stats.hottest!.name)}`)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="stats-hl-label">On Fire</div>
                  <div className="stats-hl-name">{stats.hottest.name}</div>
                  <div className="stats-hl-detail">{stats.hottest.currentStreak}W streak</div>
                </div>
              )}
              {stats.mostGameWins && (
                <div
                  className="stats-highlight-card"
                  onClick={() => navigate(`/players/${encodeURIComponent(stats.mostGameWins!.name)}`)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="stats-hl-label">Most Game Wins</div>
                  <div className="stats-hl-name">{stats.mostGameWins.name}</div>
                  <div className="stats-hl-detail">{stats.mostGameWins.gameWins} games won</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Color breakdown with win rates */}
        {stats.colorStats.some(c => c.count > 0) && (
          <div className="stats-section">
            <h2>Colors</h2>
            <div className="gs-color-list">
              {stats.colorStats.map(cs => (
                <div key={cs.color} className="gs-color-row">
                  <span className={`gs-color-name color-badge color-${cs.color.toLowerCase()}`}>
                    {MANA_COLOR_NAMES[cs.color]}
                  </span>
                  <span className="gs-color-count">{cs.count}</span>
                  <div className="gs-color-bar-bg">
                    <div
                      className={`gs-color-bar-fill color-${cs.color.toLowerCase()}`}
                      style={{ width: `${(cs.count / stats.maxColorCount) * 100}%` }}
                    />
                  </div>
                  <span className="gs-color-wr">{cs.matches > 0 ? `${(cs.winPct * 100).toFixed(0)}%` : ""}</span>
                </div>
              ))}
            </div>
            {stats.bestWinRateColor && (
              <div className="gs-color-note">
                Best win rate: <span className={`color-badge color-${stats.bestWinRateColor.color.toLowerCase()}`}>{MANA_COLOR_NAMES[stats.bestWinRateColor.color]}</span> at {(stats.bestWinRateColor.winPct * 100).toFixed(0)}%
              </div>
            )}
          </div>
        )}

        {/* Top archetypes */}
        {stats.archetypes.length > 0 && (
          <div className="stats-section">
            <h2>Top Archetypes</h2>
            <div className="gs-archetype-list">
              {stats.archetypes.map(a => (
                <div key={a.pair} className="gs-archetype-row">
                  <div className="gs-archetype-colors">
                    {a.colors.map(c => (
                      <span key={c} className={`gs-archetype-pip color-${c.toLowerCase()}`} />
                    ))}
                  </div>
                  <div className="gs-archetype-record">{a.wins}-{a.losses}{a.draws > 0 ? `-${a.draws}` : ""}</div>
                  <div className="gs-archetype-bar-bg">
                    <div className="gs-archetype-bar-fill" style={{ width: `${a.winPct * 100}%` }} />
                  </div>
                  <div className="gs-archetype-pct">{(a.winPct * 100).toFixed(0)}%</div>
                  <div className="gs-archetype-n">({a.total})</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-cube breakdown */}
        {stats.cubeStats.length > 0 && (
          <div className="stats-section">
            <h2>By Cube</h2>
            <div className="gs-cube-list">
              {stats.cubeStats.map(cs => (
                <div key={cs.name} className="gs-cube-card">
                  <div className="gs-cube-name">{cs.name}</div>
                  <div className="gs-cube-details">
                    <span>{cs.drafts} draft{cs.drafts !== 1 ? "s" : ""}</span>
                    <span>{cs.matches} match{cs.matches !== 1 ? "es" : ""}</span>
                    <span>{cs.games} game{cs.games !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Match list */}
        <div className="stats-matches-section">
          <div className="stats-matches-header">
            <h3>Matches</h3>
            <input
              type="text"
              className="stats-filter-input"
              placeholder="Filter by player..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <div className="stats-matches-list">
            {filteredMatches.length === 0 && (
              <div className="stats-empty">No matches found.</div>
            )}
            {filteredMatches.map(match => (
              <MatchRow
                key={match.id}
                match={match}
                playerLookup={playerLookup}
                onClick={() => navigate(`/matches/${match.id}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;
