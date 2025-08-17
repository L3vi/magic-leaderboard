import React from "react";
// ...existing code...

const placements = [
  { label: "1st", field: "first", color: "#ffd700" },
  { label: "2nd", field: "second", color: "#c0c0c0" },
  { label: "3rd", field: "third", color: "#cd7f32" },
  { label: "4th", field: "fourth", color: "#b3cfff" },
];

const getGamesPlayed = (player) =>
  (player.first || 0) + (player.second || 0) + (player.third || 0) + (player.fourth || 0);

import './LeaderBoard.css';
export default function LeaderBoard({ players, onPlayerClick }) {
  const [sortBy, setSortBy] = React.useState("score");
  const [sortDir, setSortDir] = React.useState("desc");

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir(col === "name" ? "asc" : "desc");
    }
  };

  const getSortValue = (player, col) => {
    if (col === "name") return player.name.toLowerCase();
    if (col === "avgScore") {
      const gamesPlayed = getGamesPlayed(player);
      return gamesPlayed > 0 ? player.score / gamesPlayed : -Infinity;
    }
    if (col === "gamesPlayed") {
      return getGamesPlayed(player);
    }
    if (placements.some((p) => p.field === col)) {
      return player[col] || 0;
    }
    return player[col] || 0;
  };

  const getSortedPlayers = React.useMemo(() => {
    const sorted = [...players];
    sorted.sort((a, b) => {
      const valA = getSortValue(a, sortBy);
      const valB = getSortValue(b, sortBy);
      if (typeof valA === "string" && typeof valB === "string") {
        if (valA < valB) return sortDir === "asc" ? -1 : 1;
        if (valA > valB) return sortDir === "asc" ? 1 : -1;
        return 0;
      } else if (typeof valA === "number" && typeof valB === "number") {
        if (valA === valB) return 0;
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      return 0;
    });
    return sorted;
  }, [players, sortBy, sortDir]);

  return (
    <>
      <div className="leaderboard-container">
        <table className="leaderboard-table striped-list">
          <thead>
            <tr className="leaderboard-header-row">
              <th className="leaderboard-rank-header">#</th>
              <th
                className="leaderboard-player-header"
                onClick={() => handleSort("name")}
              >
                Player
                <span className="sort-arrow">{sortBy === "name" && (sortDir === "asc" ? "\u25b2" : "\u25bc")}</span>
              </th>
              <th
                className="leaderboard-placement-header leaderboard-placement-header-score"
                onClick={() => handleSort("score")}
              >
                Points
                <span className="sort-arrow">{sortBy === "score" && (sortDir === "asc" ? "\u25b2" : "\u25bc")}</span>
              </th>
              <th
                className="leaderboard-placement-header leaderboard-placement-header-games"
                onClick={() => handleSort("gamesPlayed")}
              >
                Games
                <span className="sort-arrow">{sortBy === "gamesPlayed" && (sortDir === "asc" ? "\u25b2" : "\u25bc")}</span>
              </th>
              <th
                className="leaderboard-placement-header leaderboard-placement-header-avgscore"
                onClick={() => handleSort("avgScore")}
              >
                Avg
                <span className="sort-arrow">{sortBy === "avgScore" && (sortDir === "asc" ? "\u25b2" : "\u25bc")}</span>
              </th>
              {placements.map((p) => (
                <th
                  key={p.field}
                  className={`leaderboard-placement-header leaderboard-placement-header-${p.field}`}
                  onClick={() => handleSort(p.field)}
                  style={{ color: p.color }}
                >
                  {p.label}
                  <span className="sort-arrow">{sortBy === p.field && (sortDir === "asc" ? "\u25b2" : "\u25bc")}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getSortedPlayers.map((player, idx) => {
              const gamesPlayed = getGamesPlayed(player);
              const avgScore = gamesPlayed > 0 ? (player.score / gamesPlayed).toFixed(2) : "-";
              return (
                <tr
                  key={player.name}
                  className="leaderboard-row"
                  onClick={() => onPlayerClick && onPlayerClick(player)}
                >
                  <td className="leaderboard-rank">{idx + 1}</td>
                  <td className="leaderboard-player-name">{player.name}</td>
                  <td className="leaderboard-player-score">{player.score}</td>
                  <td className="leaderboard-player-games">{gamesPlayed}</td>
                  <td className="leaderboard-player-avgscore">{avgScore}</td>
                  {placements.map((p) => (
                    <td
                      key={p.field}
                      className={`leaderboard-player-placement leaderboard-player-${p.field}`}
                      style={{ color: p.color }}
                    >
                      {player[p.field] || 0}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Add New Player button below the leaderboard */}
      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <button
          className="addplayer-btn global-btn"
          onClick={() => window.dispatchEvent(new CustomEvent("showAddPlayerModal"))}
          aria-label="Add New Player"
        >
          Add New Player
        </button>
      </div>
    </>
  );
}
