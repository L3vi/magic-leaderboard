import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PlayerRow, { Player } from "./PlayerRow";
import "./Players.css";
import "../../styles/skeleton.css";
import { usePlayerScores } from "../../hooks/useApi";
import { useSession } from "../../context/SessionContext";
import { useMediaQuery } from "../../hooks/useMediaQuery";

type SortKey = "name" | "score" | "average" | "weightedAverage" | "games";
type SortOrder = "asc" | "desc";

// Key order is column order; PlayerRow renders its cells in the same order.
const COLUMN_LABELS: Record<SortKey, string> = {
  name: "Name",
  weightedAverage: "Weighted Average",
  average: "Average",
  score: "Score",
  games: "Games",
};

const COMPACT_LABELS: Record<SortKey, string> = {
  name: "Name",
  score: "Pts",
  weightedAverage: "W.Avg",
  average: "Avg",
  games: "GP",
};

const COLUMN_CLASS: Record<SortKey, string> = {
  name: "player-name",
  weightedAverage: "weighted-avg-col",
  average: "player-average",
  score: "player-score",
  games: "games-col",
};

const SKELETON_ROWS = 7;

/**
 * Players component for the Magic Leaderboard app.
 * - Displays sortable player stats in a responsive, accessible layout.
 * - Uses ARIA roles, keyboard navigation, and semantic HTML.
 */
const Players: React.FC = () => {
  const [sortKey, setSortKey] = React.useState<SortKey>("weightedAverage");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc");
  const headerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [listTop, setListTop] = useState<number>();
  const navigate = useNavigate();
  const scoresData = usePlayerScores();
  const { loading } = useSession();
  const isCompact = useMediaQuery("(max-width: 639px)");

  // Compact rows are sized so 8 fill the screen below the list (Players.css),
  // which needs the list's page offset. offsetTop, not getBoundingClientRect,
  // so the value doesn't depend on scroll position.
  useLayoutEffect(() => {
    const measure = () => {
      let top = 0;
      for (let el: HTMLElement | null = listRef.current; el; el = el.offsetParent as HTMLElement | null) {
        top += el.offsetTop;
      }
      if (listRef.current) setListTop(top);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [loading]);

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

  // The column headers render in both states so the table's chrome is in place
  // before data arrives; only the rows swap from shimmer to real. The shimmer
  // rows reuse the real column classes, so they line up under the headers
  // instead of being a fixed-width stub next to a wider header.
  return (
    <section
      className="leaderboard main-section"
      role="table"
      aria-busy={loading || undefined}
      aria-label={loading ? "Loading players" : undefined}
      data-sort={sortKey}
      style={listTop !== undefined ? ({ "--list-top": `${listTop}px` } as React.CSSProperties) : undefined}
    >
      <div className="leaderboard-header" role="row" ref={headerRef}>
        {(Object.keys(COLUMN_LABELS) as SortKey[]).map((key) => (
          <span
            key={key}
            className={`leaderboard-col ${COLUMN_CLASS[key]}`}
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
            aria-label={`Sort by ${COLUMN_LABELS[key]}`}
            onClick={() => handleSort(key)}
            onKeyDown={(e) => handleHeaderKeyDown(e, key)}
          >
            {isCompact ? COMPACT_LABELS[key] : COLUMN_LABELS[key]}
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
      {loading ? (
        <div className="leaderboard-list leaderboard-skeleton" role="presentation" ref={listRef}>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div className="player-row leaderboard-skeleton-row" key={i}>
              {(Object.keys(COLUMN_CLASS) as SortKey[]).map((key) => (
                <span key={key} className={`leaderboard-col ${COLUMN_CLASS[key]}`}>
                  <span
                    className={`skeleton skeleton-bar ${
                      key === "name" ? "skeleton-name" : "skeleton-num"
                    }`}
                  />
                </span>
              ))}
            </div>
          ))}
        </div>
      ) : (
      <div className="leaderboard-list" role="rowgroup" ref={listRef}>
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
      )}
    </section>
  );
};

export default Players;
