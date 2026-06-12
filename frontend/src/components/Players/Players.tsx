import React, { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PlayerRow, { Player } from "./PlayerRow";
import GameStats from "./GameStats";
import "./Players.css";
import { usePlayerScores } from "../../hooks/useApi";
import { useSession } from "../../context/SessionContext";

type SortKey = "name" | "score" | "average" | "weightedAverage" | "games";
type SortOrder = "asc" | "desc";

const COLUMN_LABELS: Record<SortKey, string> = {
  name: "Name",
  score: "Score",
  average: "Average",
  weightedAverage: "Weighted Average",
  games: "Games",
};

/**
 * Players component for the Magic Leaderboard app.
 * - Displays sortable player stats in a responsive, accessible layout.
 * - Uses ARIA roles, keyboard navigation, and semantic HTML.
 */
const Players: React.FC = () => {
  const [sortKey, setSortKey] = React.useState<SortKey>("weightedAverage");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc");
  const headerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const scoresData = usePlayerScores();
  const { loading } = useSession();

  // Memoize sorting for performance
  const sortedPlayers = useMemo(() => {
    const players = [...scoresData];
    if (sortKey === "name") {
      players.sort((a, b) =>
        sortOrder === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
    } else if (sortKey === "games") {
      players.sort((a, b) => {
        const aValue = a.gameCount as number;
        const bValue = b.gameCount as number;
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      });
    } else if (sortKey === "weightedAverage") {
      players.sort((a, b) => {
        const aValue = a.weightedAverage as number;
        const bValue = b.weightedAverage as number;
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      });
    } else {
      players.sort((a, b) => {
        const aValue = a[sortKey as keyof typeof scoresData[0]] as number;
        const bValue = b[sortKey as keyof typeof scoresData[0]] as number;
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      });
    }
    return players;
  }, [scoresData, sortKey, sortOrder]);

  // Determine if current sort shows top rankings (medals for score/average/weightedAverage descending only).
  // Suppressed when nobody has played yet, so an empty season doesn't award medals to a 0–0–0 board.
  const hasResults = useMemo(() => scoresData.some((p) => p.gameCount > 0), [scoresData]);
  const showTopRankings = useMemo(() => {
    return hasResults && (sortKey === "score" || sortKey === "average" || sortKey === "weightedAverage") && sortOrder === "desc";
  }, [hasResults, sortKey, sortOrder]);

  // Show loading state
  if (loading) {
    return <section className="leaderboard main-section">Loading players...</section>;
  }

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

  function handlePlayerClick(playerScore: typeof scoresData[0]) {
    navigate(`/players/${encodeURIComponent(playerScore.name)}`);
  }

  return (
    <section className="leaderboard main-section" role="table">
      {/* On compact screens this region scrolls horizontally so every column
          (Average, Games included) stays reachable without rotating the device.
          The Name column is pinned left; a right-edge fade hints at more. */}
      <div className="leaderboard-scroll-region">
        <div className="leaderboard-scroll" role="presentation">
      <div className="leaderboard-header" role="row" ref={headerRef}>
        {Object.entries(COLUMN_LABELS).map(([key, label]) => (
          <span
            key={key}
            className={`leaderboard-col ${
              key === "name" ? "player-name"
                : key === "score" ? "player-score"
                : key === "average" ? "player-average"
                : key === "weightedAverage" ? "weighted-avg-col"
                : "games-col"
            }`}
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
        {sortedPlayers.map((playerScore, index) => (
          <PlayerRow
            key={playerScore.name}
            player={{
              name: playerScore.name,
              score: playerScore.score,
              average: playerScore.average,
              weightedAverage: playerScore.weightedAverage,
              gamesPlayed: playerScore.gameCount,
            }}
            rank={showTopRankings ? index + 1 : undefined}
            onClick={() => handlePlayerClick(playerScore)}
          />
        ))}
      </div>
        </div>
        <div className="leaderboard-scroll-fade" aria-hidden="true" />
      </div>
      <GameStats />
    </section>
  );
};

export default Players;
