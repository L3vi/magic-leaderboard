import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DetailsPageShell from "../components/DetailsPageShell/DetailsPageShell";
import { useSession } from "../context/SessionContext";
import { useAllGames } from "../hooks/useApi";
import { commanderDeckName, splitDeckName, encodeCommanderKey } from "../utils/commanderKey";
import type { Game } from "../types";
import "./PlayerCommandersPage.css";

interface DeckTally {
  key: string; // canonical deck name ("A // B" for partner pairs)
  commanders: string[];
  total: number;
  thisSeason: number;
  other: number;
  wins: number;
}

/**
 * Every commander/deck a player has piloted across ALL sessions, ranked by
 * total plays. Reached from the "Commanders Played" tile on a player's detail
 * page. Plays are split into the active season vs. every other season so a
 * player's all-time favorites and their current-season picks are both visible.
 */
const PlayerCommandersPage: React.FC = () => {
  const { playerName } = useParams<{ playerName: string }>();
  const navigate = useNavigate();
  const { players, activeSession } = useSession();
  const { games: allGames, loading } = useAllGames();

  const decodedName = playerName ? decodeURIComponent(playerName) : "";
  const playerId = players.find((p) => p.name === decodedName)?.id;

  const decks = useMemo<DeckTally[]>(() => {
    if (!playerId) return [];
    const map = new Map<string, DeckTally>();
    (allGames as Game[]).forEach((game) => {
      const gp = game.players?.find((p) => p.playerId === playerId);
      if (!gp) return;
      const key = commanderDeckName(gp.commander);
      if (!key) return;
      let tally = map.get(key);
      if (!tally) {
        tally = { key, commanders: splitDeckName(key), total: 0, thisSeason: 0, other: 0, wins: 0 };
        map.set(key, tally);
      }
      tally.total += 1;
      if (game.sessionId === activeSession) tally.thisSeason += 1;
      else tally.other += 1;
      if (gp.placement === 1) tally.wins += 1;
    });
    // Most played first; break ties by wins, then name for stability.
    return [...map.values()].sort(
      (a, b) => b.total - a.total || b.wins - a.wins || a.key.localeCompare(b.key)
    );
  }, [allGames, playerId, activeSession]);

  const handleClose = () => navigate(-1);

  if (!loading && !playerId) {
    return (
      <DetailsPageShell
        title="Commanders"
        onClose={handleClose}
        error={`Player "${decodedName}" not found`}
      />
    );
  }

  const totalPlays = decks.reduce((n, d) => n + d.total, 0);

  return (
    <DetailsPageShell title={`${decodedName} · Commanders`} onClose={handleClose} loading={loading}>
      <div className="player-commanders">
        <section className="stats-summary-section">
          <div className="stats-summary-grid">
            <div className="stat-card">
              <div className="stat-label">Commanders</div>
              <div className="stat-value">{decks.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Plays</div>
              <div className="stat-value">{totalPlays}</div>
            </div>
          </div>
        </section>

        <section className="commanders-section">
          <h2 className="section-heading">All Commanders ({decks.length})</h2>
          <div className="commanders-list">
            {decks.length === 0 ? (
              <div className="empty-state">No commanders recorded yet</div>
            ) : (
              decks.map((deck, idx) => (
                <div
                  key={deck.key}
                  className="commander-stat-item clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/stats/commanders/${encodeCommanderKey(deck.key)}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/stats/commanders/${encodeCommanderKey(deck.key)}`);
                    }
                  }}
                >
                  <div className="commander-rank">{deck.total}</div>
                  <div className="commander-info">
                    <div className="commander-name">{deck.commanders.join(" // ")}</div>
                    <div className="commander-meta">
                      {deck.total} play{deck.total !== 1 ? "s" : ""}
                      {deck.other > 0 && (
                        <>
                          {" • "}
                          <span className="meta-split">{deck.thisSeason} this season</span>
                          {" • "}
                          <span className="meta-split">{deck.other} other</span>
                        </>
                      )}
                      {" • "}
                      {deck.wins} win{deck.wins !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </DetailsPageShell>
  );
};

export default PlayerCommandersPage;
