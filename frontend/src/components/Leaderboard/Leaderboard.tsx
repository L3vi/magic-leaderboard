import PlayerRow, { Player } from "./PlayerRow";
import "./Leaderboard.css";


import React from "react";
import gameHistory from "../../data/game-history.json";

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
  gamesPlayed: "Games"
};

const Leaderboard: React.FC = () => {
  const [sortKey, setSortKey] = React.useState<SortKey>("score");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc");
  const allPlayers = aggregatePlayers(gameHistory.events);
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    if (sortKey === "name") {
      return sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else {
      return sortOrder === "asc"
        ? (a[sortKey] as number) - (b[sortKey] as number)
        : (b[sortKey] as number) - (a[sortKey] as number);
    }
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder(key === "name" ? "asc" : "desc");
    }
  }

  return (
    <section className="leaderboard">
      <div className="leaderboard-header">
        {Object.entries(COLUMN_LABELS).map(([key, label]) => (
          <span
            key={key}
            style={{ cursor: "pointer", userSelect: "none" }}
            onClick={() => handleSort(key as SortKey)}
          >
            {label}
            {sortKey === key && (
              <span style={{ marginLeft: 4 }}>
                {sortOrder === "asc" ? "▲" : "▼"}
              </span>
            )}
          </span>
        ))}
      </div>
      <div className="leaderboard-list">
        {sortedPlayers.map((player) => (
          <PlayerRow key={player.name} player={player} />
        ))}
      </div>
    </section>
  );
};

export default Leaderboard;
