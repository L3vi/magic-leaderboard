import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCubeEvent } from "../../context/CubeEventContext";
import { calculateDraftStandings, formatPct, getMatchWinner } from "../../utils/standings";
import type { ManaColor, Player } from "../../types";
import { MANA_COLORS, MANA_COLOR_NAMES } from "../../types";
import "./DraftDetails.css";

interface DraftDetailsProps {
  draftId: string;
}

const DraftDrawer: React.FC<{ title: string; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="draft-stats-drawer">
      <h4 className="draft-stats-drawer-toggle" onClick={() => setOpen(!open)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setOpen(!open); }}>
        <span>{title}</span>
        <span className={`drawer-chevron${open ? " open" : ""}`}>&#9662;</span>
      </h4>
      {open && children}
    </div>
  );
};

const DraftDetails: React.FC<DraftDetailsProps> = ({ draftId }) => {
  const navigate = useNavigate();
  const { event, players, updateDraftStatus } = useCubeEvent();

  const draft = useMemo(
    () => event?.drafts.find(d => d.id === draftId),
    [event, draftId]
  );

  const playerLookup = useMemo(() => {
    const lookup: Record<string, Player> = {};
    for (const p of players) lookup[p.id] = p;
    return lookup;
  }, [players]);

  const draftDisplayName = useMemo(() => {
    if (!event || !draft) return draftId;
    const cube = event.cubes.find(c => c.id === draft.cubeId);
    const cubeDraftNum = event.drafts
      .filter(d => d.cubeId === draft.cubeId)
      .findIndex(d => d.id === draftId) + 1;
    return `${cube?.name || draft.cubeId} Draft #${cubeDraftNum}`;
  }, [event, draft, draftId]);

  const standings = useMemo(() => {
    if (!event || !draft) return [];
    return calculateDraftStandings(draftId, draft.players, event.matches, playerLookup);
  }, [event, draft, draftId, playerLookup]);

  const draftMatches = useMemo(() => {
    if (!event) return [];
    return event.matches
      .filter(m => m.draftId === draftId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [event, draftId]);

  const draftStats = useMemo(() => {
    if (draftMatches.length === 0) return null;

    const totalGames = draftMatches.reduce((sum, m) => sum + m.players[0].wins + m.players[1].wins, 0);

    // Color stats
    const colorCounts: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    const colorWins: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    const colorMatchCount: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };

    // Archetype (color combo) stats
    const archetypeMap: Record<string, { wins: number; losses: number; draws: number; total: number }> = {};

    // Strategy stats
    const strategyMap: Record<string, { wins: number; losses: number; draws: number; total: number }> = {};

    for (const match of draftMatches) {
      const winnerId = getMatchWinner(match);

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

        // Strategy tracking
        if (p.deckStrategy) {
          const sKey = p.deckStrategy.trim();
          if (sKey) {
            if (!strategyMap[sKey]) strategyMap[sKey] = { wins: 0, losses: 0, draws: 0, total: 0 };
            strategyMap[sKey].total++;
            if (winnerId === p.playerId) strategyMap[sKey].wins++;
            else if (winnerId && winnerId !== p.playerId) strategyMap[sKey].losses++;
            else strategyMap[sKey].draws++;
          }
        }
      }
    }

    const colorStats = MANA_COLORS
      .map(c => ({
        color: c,
        count: colorCounts[c],
        wins: colorWins[c],
        matches: colorMatchCount[c],
        winPct: colorMatchCount[c] > 0 ? colorWins[c] / colorMatchCount[c] : 0,
      }))
      .filter(c => c.count > 0);
    const maxColorCount = Math.max(...colorStats.map(c => c.count), 1);

    const archetypes = Object.entries(archetypeMap)
      .map(([pair, s]) => ({
        pair,
        colors: pair.split("") as ManaColor[],
        ...s,
        winPct: s.total > 0 ? s.wins / s.total : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const strategies = Object.entries(strategyMap)
      .map(([name, s]) => ({
        name,
        ...s,
        winPct: s.total > 0 ? s.wins / s.total : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return { totalGames, colorStats, maxColorCount, archetypes, strategies };
  }, [draftMatches]);

  const handleToggleStatus = async () => {
    if (!draft) return;
    const newStatus = draft.status === "in-progress" ? "complete" : "in-progress";
    await updateDraftStatus(draftId, newStatus);
  };

  if (!draft) {
    return <div className="draft-details-error">Draft not found.</div>;
  }

  return (
    <div className="draft-details">
      <div className="draft-details-header-row">
        <h2 className="draft-details-title">{draftDisplayName}</h2>
        <button
          className={`draft-status-toggle ${draft.status}`}
          onClick={handleToggleStatus}
        >
          {draft.status === "in-progress" ? "Mark Complete" : "Reopen"}
        </button>
      </div>

      {/* Standings table */}
      <div className="standings-table-wrapper">
        <table className="standings-table" role="table">
          <thead>
            <tr>
              <th className="standings-col-name">Player</th>
              <th className="standings-col-pts">Pts</th>
              <th className="standings-col-record">W-L-D</th>
              <th className="standings-col-pct">OMW%</th>
              <th className="standings-col-pct">GW%</th>
              <th className="standings-col-pct standings-col-hide-mobile">OGW%</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, idx) => (
              <tr key={s.playerId} className={idx === 0 && s.matchPoints > 0 ? "standings-row-first" : ""}>
                <td className="standings-col-name">
                  <span className={idx === 0 && s.matchPoints > 0 ? "standings-name-first" : ""}>{s.playerName}</span>
                </td>
                <td className="standings-col-pts">{s.matchPoints}</td>
                <td className="standings-col-record">
                  {s.matchRecord.wins}-{s.matchRecord.losses}-{s.matchRecord.draws}
                </td>
                <td className="standings-col-pct">{formatPct(s.omwPct)}</td>
                <td className="standings-col-pct">{formatPct(s.gameWinPct)}</td>
                <td className="standings-col-pct standings-col-hide-mobile">{formatPct(s.ogwPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent matches in this draft */}
      {draftMatches.length > 0 && (
        <div className="draft-matches-section">
          <h3>Matches</h3>
          <div className="draft-matches-list">
            {draftMatches.map(match => {
              const [p1, p2] = match.players;
              const winnerId = getMatchWinner(match);
              const p1Name = playerLookup[p1.playerId]?.name || p1.playerId;
              const p2Name = playerLookup[p2.playerId]?.name || p2.playerId;
              const isDraw = !winnerId;

              // Always put winner on left
              const leftName = winnerId === p2.playerId ? p2Name : p1Name;
              const rightName = winnerId === p2.playerId ? p1Name : p2Name;
              const leftWins = winnerId === p2.playerId ? p2.wins : p1.wins;
              const rightWins = winnerId === p2.playerId ? p1.wins : p2.wins;

              return (
                <div
                  key={match.id}
                  className="draft-match-row clickable"
                  onClick={() => navigate(`/matches/${match.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter") navigate(`/matches/${match.id}`); }}
                >
                  <span className={`match-player-name${!isDraw && winnerId ? " winner" : ""}`}>
                    {leftName}
                  </span>
                  <span className="match-score">{leftWins} - {rightWins}</span>
                  <span className="match-player-name">{rightName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-draft stats */}
      {draftStats && (
        <div className="draft-stats-section">
          <h3>Draft Stats</h3>
          <div className="draft-stats-overview">
            <span className="draft-stat-pill">{draftMatches.length} match{draftMatches.length !== 1 ? "es" : ""}</span>
            <span className="draft-stat-pill">{draftStats.totalGames} game{draftStats.totalGames !== 1 ? "s" : ""}</span>
          </div>

          {/* Colors: played count + win rate */}
          {draftStats.colorStats.length > 0 && (
            <DraftDrawer title="Colors Played" defaultOpen>
              <div className="draft-stats-color-list">
                {draftStats.colorStats.map(cs => (
                  <div key={cs.color} className="draft-stats-color-row">
                    <span className={`gs-cube-color-pip color-${cs.color.toLowerCase()}`} />
                    <span className="ds-color-name">{MANA_COLOR_NAMES[cs.color]}</span>
                    <span className="ds-color-count">{cs.count}</span>
                    <div className="gs-cube-color-bar-bg">
                      <div
                        className={`gs-color-bar-fill color-${cs.color.toLowerCase()}`}
                        style={{ width: `${(cs.count / draftStats.maxColorCount) * 100}%` }}
                      />
                    </div>
                    <span className="gs-cube-color-wr">{cs.matches > 0 ? `${(cs.winPct * 100).toFixed(0)}%` : ""}</span>
                  </div>
                ))}
              </div>
            </DraftDrawer>
          )}

          {/* Archetypes */}
          {draftStats.archetypes.length > 0 && (
            <DraftDrawer title="Archetypes">
              <div className="gs-archetype-list">
                {draftStats.archetypes.map(a => (
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
            </DraftDrawer>
          )}

          {/* Strategies */}
          {draftStats.strategies.length > 0 && (
            <DraftDrawer title="Strategies">
              <div className="draft-stats-strategy-list">
                {draftStats.strategies.map(s => (
                  <div key={s.name} className="draft-stats-strategy-row">
                    <span className="ds-strategy-name">{s.name}</span>
                    <span className="ds-strategy-record">{s.wins}-{s.losses}{s.draws > 0 ? `-${s.draws}` : ""}</span>
                    <div className="gs-archetype-bar-bg">
                      <div className="gs-archetype-bar-fill" style={{ width: `${s.winPct * 100}%` }} />
                    </div>
                    <span className="ds-strategy-pct">{(s.winPct * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </DraftDrawer>
          )}
        </div>
      )}
    </div>
  );
};

export default DraftDetails;
