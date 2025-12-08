import React, { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PlayerRow, { Player } from "./PlayerRow";
import "./Players.css";
import playersRaw from "../../data/players.json";
import gamesRaw from "../../data/games.json";

/**
 * Aggregates player stats from all events and games.
 */
function aggregatePlayers(players: any[], games: any[]): Player[] {
  const playerMap: Record<string, Player & { totalPlacement: number }> = {};
  players.forEach((pl: any) => {
    playerMap[pl.id] = {
      name: pl.name,
      score: 0,
      average: 0,
      gamesPlayed: 0,
      totalPlacement: 0,
    };
  });
  games.forEach((game: any) => {
    game.players.forEach((p: any) => {
      if (playerMap[p.playerId]) {
        playerMap[p.playerId].gamesPlayed += 1;
        playerMap[p.playerId].totalPlacement += p.placement;
        playerMap[p.playerId].score += Math.max(5 - p.placement, 1);
      }
    });
  });
  Object.values(playerMap).forEach((p) => {
    p.average = p.gamesPlayed ? p.totalPlacement / p.gamesPlayed : 0;
    delete (p as any).totalPlacement;
  });
  return Object.values(playerMap);
}

type SortKey = "name" | "score" | "average";
type SortOrder = "asc" | "desc";

const COLUMN_LABELS: Record<SortKey, string> = {
  name: "Name",
  score: "Score",
  average: "Average",
};

/**
 * Players component for the Magic Leaderboard app.
 * - Displays sortable player stats in a responsive, accessible layout.
 * - Uses ARIA roles, keyboard navigation, and semantic HTML.
 */
const Players: React.FC = () => {
  const [sortKey, setSortKey] = React.useState<SortKey>("score");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc");
  const headerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Memoize player aggregation and sorting for performance
  const allPlayers = useMemo(() => aggregatePlayers(playersRaw, gamesRaw), []);
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

  // Determine if current sort shows top rankings (medals for score/average descending only)
  const showTopRankings = useMemo(() => {
    return (sortKey === "score" || sortKey === "average") && sortOrder === "desc";
  }, [sortKey, sortOrder]);

  // Keyboard navigation for sortable headers
  const handleHeaderKeyDown = (
    e: React.KeyboardEvent<HTMLSpanElement>,
    key: SortKey
  ) => {
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
    navigate(`/players/${encodeURIComponent(player.name)}`);
  }

  return (
    <section className="leaderboard main-section" role="table">
      <div className="leaderboard-header" role="row" ref={headerRef}>
        {Object.entries(COLUMN_LABELS).map(([key, label]) => (
          <span
            key={key}
            className={`leaderboard-col${key === "name" ? " player-name" : ""}`}
            style={{ cursor: "pointer", userSelect: "none" }}
            tabIndex={0}
            role="columnheader"
            aria-sort={
              sortKey === key
                ? sortOrder === "asc"
                  ? "ascending"
                  : "descending"
                : undefined
            }
            aria-label={`Sort by ${label}`}
            onClick={() => handleSort(key as SortKey)}
            onKeyDown={(e) => handleHeaderKeyDown(e, key as SortKey)}
          >
            {label}
            <span
              className="sort-arrow"
              style={{
                visibility: sortKey === key ? "visible" : "hidden",
              }}
              aria-hidden="true"
            >
              {sortOrder === "asc" ? "▲" : "▼"}
            </span>
          </span>
        ))}
      </div>
      <div className="leaderboard-list" role="rowgroup">
        {sortedPlayers.map((player, index) => (
          <PlayerRow
            key={player.name}
            player={player}
            rank={showTopRankings ? index + 1 : undefined}
            onClick={() => handlePlayerClick(player)}
          />
        ))}
      </div>
    </section>
  );
};

export default Players;
