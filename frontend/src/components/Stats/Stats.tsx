import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCubeEvent } from "../../context/CubeEventContext";
import { getMatchWinner } from "../../utils/standings";
import type { ManaColor, Player } from "../../types";
import { MANA_COLOR_NAMES } from "../../types";
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

    // Color stats
    const colorCounts: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    for (const match of event.matches) {
      for (const p of match.players) {
        for (const c of (p.deckColors || [])) {
          colorCounts[c] = (colorCounts[c] || 0) + 1;
        }
      }
    }
    const sortedColors = (Object.entries(colorCounts) as [ManaColor, number][])
      .sort((a, b) => b[1] - a[1]);
    const mostPlayedColor = sortedColors[0]?.[0] || null;

    return { totalDrafts, totalMatches, totalPlayers, totalGames, mostPlayedColor, colorCounts };
  }, [event]);

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
            {stats.mostPlayedColor && (
              <div className="stat-card">
                <div className="stat-label">Most Played Color</div>
                <div className={`stat-value color-badge color-${stats.mostPlayedColor.toLowerCase()}`}>
                  {MANA_COLOR_NAMES[stats.mostPlayedColor]}
                </div>
              </div>
            )}
          </div>
        </div>

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
