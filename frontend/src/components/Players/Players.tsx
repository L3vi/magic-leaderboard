import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCubeEvent } from "../../context/CubeEventContext";
import { getMatchWinner } from "../../utils/standings";
import type { PlayerOverallStats, ManaColor } from "../../types";
import { MANA_COLORS } from "../../types";
import "./Players.css";

type SortKey = "name" | "matches" | "winPct" | "record" | "drafts";
type SortOrder = "asc" | "desc";

const COLUMN_LABELS: Record<SortKey, string> = {
  name: "Name",
  matches: "Matches",
  record: "W-L-D",
  winPct: "Win %",
  drafts: "Drafts",
};

function calculateOverallStats(
  playerId: string,
  playerName: string,
  event: { matches: any[]; drafts: any[] }
): PlayerOverallStats {
  let matchWins = 0, matchLosses = 0, matchDraws = 0, gameWins = 0, gameLosses = 0;
  const colorBreakdown: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const cubesSet = new Set<string>();

  for (const match of event.matches) {
    const playerEntry = match.players.find((p: any) => p.playerId === playerId);
    if (!playerEntry) continue;

    const opponent = match.players.find((p: any) => p.playerId !== playerId);
    if (!opponent) continue;

    gameWins += playerEntry.wins;
    gameLosses += opponent.wins;

    const winnerId = getMatchWinner(match);
    if (winnerId === playerId) matchWins++;
    else if (winnerId) matchLosses++;
    else matchDraws++;

    for (const c of playerEntry.deckColors) {
      colorBreakdown[c as ManaColor] = (colorBreakdown[c as ManaColor] || 0) + 1;
    }

    const draft = event.drafts.find((d: any) => d.id === match.draftId);
    if (draft) cubesSet.add(draft.cubeId);
  }

  const matchesPlayed = matchWins + matchLosses + matchDraws;
  const totalGames = gameWins + gameLosses;
  const draftsPlayed = event.drafts.filter((d: any) => d.players.includes(playerId)).length;

  let favoriteColor: ManaColor | null = null;
  let maxColorCount = 0;
  for (const c of MANA_COLORS) {
    if (colorBreakdown[c] > maxColorCount) {
      maxColorCount = colorBreakdown[c];
      favoriteColor = c;
    }
  }

  return {
    playerId,
    playerName,
    matchesPlayed,
    matchWins,
    matchLosses,
    matchDraws,
    gameWins,
    gameLosses,
    matchWinPct: matchesPlayed > 0 ? matchWins / matchesPlayed : 0,
    gameWinPct: totalGames > 0 ? gameWins / totalGames : 0,
    draftsPlayed,
    colorBreakdown,
    favoriteColor,
    cubesPlayed: Array.from(cubesSet),
  };
}

const Players: React.FC = () => {
  const [sortKey, setSortKey] = React.useState<SortKey>("winPct");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc");
  const navigate = useNavigate();
  const { event, players, loading } = useCubeEvent();

  const playerStats = useMemo(() => {
    if (!event) return [];
    return players.map(p => calculateOverallStats(p.id, p.name, event));
  }, [event, players]);

  const sortedPlayers = useMemo(() => {
    const sorted = [...playerStats];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.playerName.localeCompare(b.playerName); break;
        case "matches": cmp = a.matchesPlayed - b.matchesPlayed; break;
        case "winPct": cmp = a.matchWinPct - b.matchWinPct; break;
        case "record": cmp = a.matchWins - b.matchWins; break;
        case "drafts": cmp = a.draftsPlayed - b.draftsPlayed; break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [playerStats, sortKey, sortOrder]);

  const showTopRankings = sortKey === "winPct" && sortOrder === "desc";

  if (loading) {
    return <section className="leaderboard main-section">Loading players...</section>;
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder(key === "name" ? "asc" : "desc");
    }
  }

  return (
    <section className="leaderboard main-section" role="table">
      <div className="leaderboard-header" role="row">
        {(Object.entries(COLUMN_LABELS) as [SortKey, string][]).map(([key, label]) => (
          <span
            key={key}
            className={`leaderboard-col${key === "name" ? " player-name" : ""}${key === "drafts" ? " drafts-col" : ""}`}
            style={{ cursor: "pointer", userSelect: "none" }}
            tabIndex={0}
            role="columnheader"
            aria-sort={sortKey === key ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
            aria-label={`Sort by ${label}`}
            onClick={() => handleSort(key)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleSort(key); }}
          >
            {label}
            <span className="sort-arrow" style={{ visibility: sortKey === key ? "visible" : "hidden" }} aria-hidden="true">
              {sortOrder === "asc" ? "▲" : "▼"}
            </span>
          </span>
        ))}
      </div>
      <div className="leaderboard-list" role="rowgroup">
        {sortedPlayers.map((ps, idx) => (
          <motion.div
            key={ps.playerId}
            layoutId={`player-${ps.playerName}`}
            className={`player-row${showTopRankings && idx === 0 ? " rank-1" : showTopRankings && idx === 1 ? " rank-2" : showTopRankings && idx === 2 ? " rank-3" : ""}`}
            role="row"
            tabIndex={0}
            onClick={() => navigate(`/players/${encodeURIComponent(ps.playerName)}`)}
            style={{ cursor: "pointer" }}
          >
            <span className="leaderboard-col player-name" role="cell">{ps.playerName}</span>
            <span className="leaderboard-col player-score" role="cell">{ps.matchesPlayed}</span>
            <span className="leaderboard-col player-average" role="cell">
              {ps.matchWins}-{ps.matchLosses}-{ps.matchDraws}
            </span>
            <span className="leaderboard-col" role="cell">
              {ps.matchesPlayed > 0 ? `${(ps.matchWinPct * 100).toFixed(0)}%` : "—"}
            </span>
            <span className="leaderboard-col drafts-col" role="cell">{ps.draftsPlayed}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Players;
