import React, { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PlayerRow, { Player } from "./PlayerRow";
import "./Players.css";
import "../../styles/skeleton.css";
import { usePlayerScores } from "../../hooks/useApi";
import { useSession } from "../../context/SessionContext";

type SortKey = "name" | "score" | "average" | "weightedAverage" | "games";
type SortOrder = "asc" | "desc";

const COLUMN_LABELS: Record<SortKey, string> = {
  name: "Name",
  score: "Score",
  weightedAverage: "Weighted Average",
  average: "Average",
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

  // The app wraps tab content in a react-swipeable handler that flips between
  // the Players/Games tabs on a horizontal swipe. Because this table scrolls
  // horizontally on phones, a swipe to reveal more columns would also bubble up
  // and switch tabs. Swallow the touch sequence at the scroll container so the
  // swipe handler never starts tracking it — native scrolling (and row taps,
  // which fire on click, not touch) are unaffected since we don't preventDefault.
  //
  // A callback ref (not useEffect) is used deliberately: the table is rendered
  // behind a `loading` early-return, so an effect that ran once on mount would
  // fire while the node is still absent and never re-attach. The callback ref
  // runs exactly when the scroll node mounts/unmounts.
  const detachScrollGuard = useRef<(() => void) | null>(null);
  const scrollGuardRef = React.useCallback((el: HTMLDivElement | null) => {
    detachScrollGuard.current?.();
    detachScrollGuard.current = null;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("touchmove", stop, { passive: true });
    el.addEventListener("touchend", stop, { passive: true });
    detachScrollGuard.current = () => {
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("touchmove", stop);
      el.removeEventListener("touchend", stop);
    };
  }, []);

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

  // Show loading state: shimmer placeholder rows that mirror the real
  // leaderboard layout (name on the left, three stat columns on the right)
  // so the table doesn't visibly jump when data arrives.
  if (loading) {
    return (
      <section
        className="leaderboard main-section"
        aria-busy="true"
        aria-label="Loading players"
      >
        <div className="leaderboard-skeleton" role="presentation">
          {Array.from({ length: 7 }).map((_, i) => (
            <div className="player-row leaderboard-skeleton-row" key={i}>
              <span className="skeleton skeleton-bar skeleton-name" />
              <span className="skeleton skeleton-bar skeleton-num" />
              <span className="skeleton skeleton-bar skeleton-num" />
              <span className="skeleton skeleton-bar skeleton-num" />
            </div>
          ))}
        </div>
      </section>
    );
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
        <div className="leaderboard-scroll" role="presentation" ref={scrollGuardRef}>
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
    </section>
  );
};

export default Players;
