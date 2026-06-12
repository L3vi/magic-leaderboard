import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { getCachedCommanderColors } from "../utils/commanderColorCache";
import { encodeCommanderKey } from "../utils/commanderKey";
import DetailsPageShell from "../components/DetailsPageShell/DetailsPageShell";
import ColorStatsDetails from "../components/ColorStats/ColorStatsDetails";
import type { ColorStatsData, CommanderColorStats } from "../types";

export default function ColorStatsPage() {
  const { color } = useParams<{ color: string }>();
  const navigate = useNavigate();
  const { games } = useSession();

  // Calculate color stats from all games
  const colorStats = useMemo(() => {
    if (!color || !games || games.length === 0) {
      return null;
    }

    const commanderMap = new Map<string, CommanderColorStats>();
    let totalPlays = 0;
    let totalWins = 0;

    // Iterate through all games
    games.forEach((game) => {
      game.players?.forEach((player) => {
        // Handle both single commander and partner commanders (array)
        const commanders = Array.isArray(player.commander)
          ? player.commander
          : [player.commander];

        // A deck's color identity is the UNION of its commanders' colors. Build
        // it once so a partner pair counts as a single play for this color
        // (not once per partner that happens to share it).
        const deckColors = new Set<string>();
        commanders.forEach((c) =>
          (getCachedCommanderColors(c) || []).forEach((col) => deckColors.add(col))
        );

        if (deckColors.has(color)) {
          totalPlays++;
          if (player.placement === 1) {
            totalWins++;
          }

          // Track per-deck stats (partner pair shown as one "A // B" entry).
          const deckName =
            commanders.length >= 2 ? [...commanders].sort().join(" // ") : commanders[0];
          if (!commanderMap.has(deckName)) {
            commanderMap.set(deckName, {
              color,
              commanderName: deckName,
              plays: 0,
              wins: 0,
              winRate: 0,
            });
          }

          const stats = commanderMap.get(deckName)!;
          stats.plays++;
          if (player.placement === 1) {
            stats.wins++;
          }
          stats.winRate = stats.wins / stats.plays;
        }
      });
    });

    // Sort commanders by win rate (descending), then by plays (descending)
    const commanders = Array.from(commanderMap.values()).sort((a, b) => {
      if (b.winRate !== a.winRate) {
        return b.winRate - a.winRate;
      }
      return b.plays - a.plays;
    });

    const stats: ColorStatsData = {
      color,
      totalPlays,
      totalWins,
      winRate: totalPlays > 0 ? totalWins / totalPlays : 0,
      commanders,
    };

    return stats;
  }, [color, games]);

  const handleClose = () => {
    navigate(-1);
  };

  const handleCommanderClick = (commanderName: string) => {
    navigate(`/stats/commanders/${encodeCommanderKey(commanderName)}`);
  };

  const colorLabels: Record<string, string> = {
    W: "White",
    U: "Blue",
    B: "Black",
    R: "Red",
    G: "Green",
  };

  // Genuinely invalid color code in the URL.
  if (!color || !colorLabels[color]) {
    return (
      <DetailsPageShell title="Color Stats" onClose={handleClose} error="Color not found" />
    );
  }

  // Valid color, but this season has no games for it yet.
  if (!colorStats || colorStats.totalPlays === 0) {
    return (
      <DetailsPageShell
        title={`${colorLabels[color]} Stats`}
        onClose={handleClose}
        error={`No ${colorLabels[color]} games recorded this season yet.`}
      />
    );
  }

  return (
    <DetailsPageShell title="Color Statistics" onClose={handleClose}>
      <ColorStatsDetails
        color={color}
        stats={colorStats}
        onCommanderClick={handleCommanderClick}
      />
    </DetailsPageShell>
  );
}
