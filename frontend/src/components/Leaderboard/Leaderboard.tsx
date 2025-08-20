
import React, { useMemo, useRef } from "react";
import PlayerRow, { Player } from "./PlayerRow";
import Modal from "../Modal/Modal";
import PlayerDetails from "../PlayerDetails/PlayerDetails";
import "./Leaderboard.css";
import gameHistory from "../../data/game-history.json";

/**
 * Aggregates player stats from all events and games.
 */
function aggregatePlayers(events: any[]): Player[] {
  const playerMap: Record<string, Player & { totalPlacement: number }> = {};
  events.forEach((event) => {
    event.games.forEach((game: any) => {
      game.players.forEach((p: any) => {
        if (!playerMap[p.name]) {
          playerMap[p.name] = {
            name: p.name,
            score: 0,
            average: 0,
            gamesPlayed: 0,
            totalPlacement: 0,
          };
        }
        playerMap[p.name].gamesPlayed += 1;
        playerMap[p.name].totalPlacement += p.placement;
        playerMap[p.name].score += Math.max(5 - p.placement, 1);
      });
    });
  });
  Object.values(playerMap).forEach((p) => {
    p.average = p.gamesPlayed ? p.totalPlacement / p.gamesPlayed : 0;
    delete (p as any).totalPlacement;
  });
  return Object.values(playerMap);
}

type SortKey = "name" | "score" | "average" | "gamesPlayed";
type SortOrder = "asc" | "desc";

const COLUMN_LABELS: Record<SortKey, string> = {
  name: "Name",
  score: "Score",
  average: "Avg Place",
  gamesPlayed: "Games",
};

/**
 * Leaderboard component for the Magic Leaderboard app.
 * - Displays sortable player stats in a responsive, accessible layout.
 * - Uses ARIA roles, keyboard navigation, and semantic HTML.
 */
const Leaderboard: React.FC = () => {
  const [sortKey, setSortKey] = React.useState<SortKey>("score");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc");
  const [selectedPlayer, setSelectedPlayer] = React.useState<Player | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Memoize player aggregation and sorting for performance
  const allPlayers = useMemo(() => aggregatePlayers(gameHistory.events), []);
  const sortedPlayers = useMemo(() => {
    const players = [...allPlayers];
    if (sortKey === "name") {
      players.sort((a, b) =>
        sortOrder === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
    } else {
      players.sort((a, b) => {
        const aValue = a[sortKey as keyof Player] as number;
        const bValue = b[sortKey as keyof Player] as number;
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      });
    }
    return players;
  }, [allPlayers, sortKey, sortOrder]);

  // Keyboard navigation for sortable headers
  const handleHeaderKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>, key: SortKey) => {
    if (e.key === "Enter" || e.key === " " /* space */) {
      handleSort(key);
    }
  };

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder(key === "name" ? "asc" : "desc");
    }
  }

  function handlePlayerClick(player: Player) {
    setSelectedPlayer(player);
  }

  function handleModalClose() {
    setSelectedPlayer(null);
  }

  return (
    <section className="leaderboard" aria-labelledby="leaderboard-title" role="table">
      <h2 id="leaderboard-title" className="leaderboard-title">Leaderboard</h2>
      <div className="leaderboard-header" role="row" ref={headerRef}>
        {Object.entries(COLUMN_LABELS).map(([key, label]) => (
          <span
            key={key}
            className={`leaderboard-col${key === 'name' ? ' player-name' : ''}`}
            style={{ cursor: "pointer", userSelect: "none" }}
            tabIndex={0}
            role="columnheader"
            aria-sort={sortKey === key ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
            aria-label={`Sort by ${label}`}
            onClick={() => handleSort(key as SortKey)}
            onKeyDown={e => handleHeaderKeyDown(e, key as SortKey)}
          >
            {label}
            {sortKey === key && (
              <span style={{ marginLeft: 4 }} aria-hidden="true">
                {sortOrder === "asc" ? "▲" : "▼"}
              </span>
            )}
          </span>
        ))}
      </div>
      <div className="leaderboard-list" role="rowgroup">
        {sortedPlayers.map((player) => (
          <div key={player.name} onClick={() => handlePlayerClick(player)} style={{ width: "100%" }}>
            <PlayerRow player={player} />
          </div>
        ))}
      </div>
      <Modal isOpen={!!selectedPlayer} onClose={handleModalClose} title={selectedPlayer?.name}>
        {selectedPlayer && <PlayerDetails player={selectedPlayer} />}
      </Modal>
    </section>
  );
};

export default Leaderboard;
