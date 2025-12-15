import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { getCachedCommanderColors } from "../utils/commanderColorCache";
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

        commanders.forEach((commanderName) => {
          // Get the colors for this commander from the cache
          const commanderColors = getCachedCommanderColors(commanderName) || [];

          // Check if this commander's colors match the selected color
          if (commanderColors.includes(color)) {
            totalPlays++;
            if (player.placement === 1) {
              totalWins++;
            }

            // Track per-commander stats
            if (!commanderMap.has(commanderName)) {
              commanderMap.set(commanderName, {
                color,
                commanderName,
                plays: 0,
                wins: 0,
                winRate: 0,
              });
            }

            const stats = commanderMap.get(commanderName)!;
            stats.plays++;
            if (player.placement === 1) {
              stats.wins++;
            }
            stats.winRate = stats.wins / stats.plays;
          }
        });
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
    // Future: Navigate to commander details page
    console.log("Commander clicked:", commanderName);
  };

  if (!color || !colorStats) {
    return (
      <DetailsPageShell
        title="Color Stats"
        onClose={handleClose}
        error="Color not found"
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
