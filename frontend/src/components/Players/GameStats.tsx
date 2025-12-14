import React, { useMemo, useEffect, useState } from "react";
import { useSession } from "../../context/SessionContext";
import { useCommanderArt } from "../../hooks/useCommanderArt";
import {
  getCommanderColorsFromScryfall,
  getCachedCommanderColors,
  preFetchCommanderColors,
} from "../../utils/commanderColorCache";
import "./GameStats.css";

interface CommanderStats {
  name: string;
  playCount: number;
  wins: number;
  averagePlacement: number;
  winRate: number;
  weightedWinRate?: number;
}

interface ColorStats {
  color: string;
  playCount: number;
  wins: number;
  winRate: number;
  averagePlacement?: number;
  totalPlacement?: number;
  topCommanders?: Array<{ name: string; playCount: number; wins: number }>;
}

const COLOR_MAP: Record<string, string> = {
  "W": "White",
  "U": "Blue",
  "B": "Black",
  "R": "Red",
  "G": "Green",
};

// Commander color detection using Scryfall API (with fallback)
const getCommanderColors = (commanderName: string): string[] => {
  // Try to get from cache first
  const cached = getCachedCommanderColors(commanderName);
  if (cached.length > 0) {
    return cached;
  }
  // If not cached yet, fetch asynchronously (will update on next render)
  getCommanderColorsFromScryfall(commanderName);
  // Return empty for now, will refetch when cached
  return [];
};
// Sub-component to display commander with image
interface CommanderThumbnailProps {
  name: string;
  rank: number;
  playCount: number;
  wins: number;
}

const CommanderThumbnail: React.FC<CommanderThumbnailProps> = ({ name, rank, playCount, wins }) => {
  const imageUrl = useCommanderArt(name);
  
  return (
    <div className="commander-item">
      {imageUrl && (
        <div className="commander-item-image">
          <img src={imageUrl} alt={name} title={name} />
        </div>
      )}
      <div className="commander-item-info">
        <div className="commander-item-name">{name}</div>
        <div className="commander-item-stats">{playCount}p • {wins}W</div>
      </div>
    </div>
  );
};
const GameStats: React.FC = () => {
  const { games } = useSession();
  const [colorsLoaded, setColorsLoaded] = useState(false);

  // Pre-fetch all commander colors when component mounts or games change
  useEffect(() => {
    if (games.length === 0) return;

    // Extract all unique commanders
    const uniqueCommanders = new Set<string>();
    games.forEach((game) => {
      game.players.forEach((p) => {
        const commanders = Array.isArray(p.commander) ? p.commander : [p.commander];
        commanders.forEach((cmd) => uniqueCommanders.add(cmd));
      });
    });

    // Pre-fetch colors for all commanders
    preFetchCommanderColors(Array.from(uniqueCommanders)).then(() => {
      setColorsLoaded(true);
    });
  }, [games]);

  const stats = useMemo(() => {
    if (games.length === 0) {
      return {
        totalGames: 0,
        totalPlayers: 0,
        averagePlayersPerGame: "0",
        totalGameMinutes: 0,
        uniqueCommanders: 0,
        mostPlayedCommander: "N/A",
        commanderPlayCount: 0,
        bestCommander: { name: "N/A", winRate: 0, playCount: 0 },
        commanderStats: [] as CommanderStats[],
        colorStats: [] as ColorStats[],
        mostCommonColor: "N/A",
        commonColorCount: 0,
        partnerPairs: [] as Array<{ pair: string; count: number }>,
      };
    }

    // Total games
    const totalGames = games.length;

    // Unique players
    const uniquePlayers = new Set<string>();
    games.forEach((game) => {
      game.players.forEach((p) => uniquePlayers.add(p.playerId));
    });
    const totalPlayers = uniquePlayers.size;

    // Average players per game
    const totalPlayerCount = games.reduce((sum, game) => sum + game.players.length, 0);
    const averagePlayersPerGame = (totalPlayerCount / totalGames).toFixed(1);

    // Estimate total game minutes
    let totalGameMinutes = 0;
    if (games.length > 1) {
      const sortedGames = [...games].sort(
        (a, b) =>
          new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
      );
      let totalGapMinutes = 0;
      for (let i = 1; i < sortedGames.length; i++) {
        const gap =
          new Date(sortedGames[i].dateCreated).getTime() -
          new Date(sortedGames[i - 1].dateCreated).getTime();
        totalGapMinutes += gap / 1000 / 60;
      }
      const avgGameDuration = totalGapMinutes / (sortedGames.length - 1);
      totalGameMinutes = Math.round(avgGameDuration * totalGames);
    }

    // Commander statistics
    const commanderStats: Record<string, CommanderStats> = {};
    const colorStats: Record<string, ColorStats> = {
      "W": { color: "W", playCount: 0, wins: 0, winRate: 0, totalPlacement: 0, topCommanders: [] },
      "U": { color: "U", playCount: 0, wins: 0, winRate: 0, totalPlacement: 0, topCommanders: [] },
      "B": { color: "B", playCount: 0, wins: 0, winRate: 0, totalPlacement: 0, topCommanders: [] },
      "R": { color: "R", playCount: 0, wins: 0, winRate: 0, totalPlacement: 0, topCommanders: [] },
      "G": { color: "G", playCount: 0, wins: 0, winRate: 0, totalPlacement: 0, topCommanders: [] },
    };
    const colorCommanderStats: Record<string, Record<string, { playCount: number; wins: number }>> = {
      "W": {}, "U": {}, "B": {}, "R": {}, "G": {}
    };
    const partnerPairCounts: Record<string, number> = {};

    games.forEach((game) => {
      game.players.forEach((p) => {
        const commanders = Array.isArray(p.commander) ? p.commander : [p.commander];
        const isWinner = p.placement === 1;

        commanders.forEach((commander) => {
          if (!commanderStats[commander]) {
            commanderStats[commander] = {
              name: commander,
              playCount: 0,
              wins: 0,
              averagePlacement: 0,
              winRate: 0,
            };
          }
          commanderStats[commander].playCount += 1;
          if (isWinner) {
            commanderStats[commander].wins += 1;
          }
        });

        // Track partner pairs
        if (commanders.length === 2) {
          const pair = [commanders[0], commanders[1]].sort().join(" // ");
          partnerPairCounts[pair] = (partnerPairCounts[pair] || 0) + 1;
        }

        // Color statistics - get colors from all commanders (for partners) and count each color
        const allCommanderColors = new Set<string>();
        commanders.forEach((commander) => {
          const colors = getCommanderColors(commander);
          colors.forEach((color) => allCommanderColors.add(color));
        });
        
        allCommanderColors.forEach((color) => {
          colorStats[color].playCount += 1;
          if (isWinner) {
            colorStats[color].wins += 1;
          }
          colorStats[color].totalPlacement! += p.placement;
          
          // Track commanders per color (only the primary/first commander for now)
          if (!colorCommanderStats[color][commanders[0]]) {
            colorCommanderStats[color][commanders[0]] = { playCount: 0, wins: 0 };
          }
          colorCommanderStats[color][commanders[0]].playCount += 1;
          if (isWinner) {
            colorCommanderStats[color][commanders[0]].wins += 1;
          }
        });
      });
    });

    // Calculate win rates and average placements
    Object.values(commanderStats).forEach((stat) => {
      stat.winRate = (stat.wins / stat.playCount) * 100;
      stat.averagePlacement = stat.playCount > 0 ? stat.playCount / stat.wins || 0 : 0;
    });

    Object.values(colorStats).forEach((stat) => {
      stat.winRate = stat.playCount > 0 ? (stat.wins / stat.playCount) * 100 : 0;
      stat.averagePlacement = stat.playCount > 0 ? stat.totalPlacement! / stat.playCount : 0;
      
      // Get top 3 commanders for this color
      const cmdrList = Object.entries(colorCommanderStats[stat.color] || {})
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 3);
      stat.topCommanders = cmdrList;
    });

    // Top commanders sorted by Bayesian weighted average win rate (min 3 plays), take top 5
    const commanderArray = Object.values(commanderStats).filter((c) => c.playCount >= 3);
    
    // Calculate league average win rate for Bayesian weighting
    const totalCommanderWins = commanderArray.reduce((sum, c) => sum + c.wins, 0);
    const totalCommanderPlays = commanderArray.reduce((sum, c) => sum + c.playCount, 0);
    const leagueWinRate = totalCommanderPlays > 0 ? (totalCommanderWins / totalCommanderPlays) * 100 : 50;
    
    // Bayesian weighted average: accounts for sample size
    const minPlayThreshold = 3;
    const commandersWithWeightedAverage = commanderArray.map((c) => ({
      ...c,
      weightedWinRate: (c.playCount * c.winRate + minPlayThreshold * leagueWinRate) / (c.playCount + minPlayThreshold),
    }));
    
    const topCommandersByWinRate = commandersWithWeightedAverage
      .sort((a, b) => b.weightedWinRate - a.weightedWinRate)
      .slice(0, 5);

    // Most played commander (for reference, though not shown)
    const sortedByPlay = Object.values(commanderStats).sort((a, b) => b.playCount - a.playCount);
    const mostPlayedCommander = sortedByPlay[0]?.name || "N/A";
    const commanderPlayCount = sortedByPlay[0]?.playCount || 0;

    // Most common color - sort by play count (colors with 0 plays go last)
    const sortedByColor = Object.values(colorStats).sort((a, b) => {
      if (a.playCount === 0 && b.playCount === 0) return 0;
      if (a.playCount === 0) return 1;
      if (b.playCount === 0) return -1;
      return b.playCount - a.playCount;
    });
    const mostCommonColorCode = sortedByColor[0]?.color || "U";
    const commonColorCount = sortedByColor[0]?.playCount || 0;

    // Partner pairs
    const partnerPairs = Object.entries(partnerPairCounts)
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalGames,
      totalPlayers,
      averagePlayersPerGame,
      totalGameMinutes,
      uniqueCommanders: Object.keys(commanderStats).length,
      mostPlayedCommander,
      commanderPlayCount,
      bestCommander: {
        name: topCommandersByWinRate[0]?.name || "N/A",
        winRate: topCommandersByWinRate[0]?.winRate || 0,
        playCount: topCommandersByWinRate[0]?.playCount || 0,
      },
      commanderStats: topCommandersByWinRate,
      colorStats: sortedByColor,
      mostCommonColor: COLOR_MAP[mostCommonColorCode] || mostCommonColorCode,
      mostCommonColorCode,
      commonColorCount,
      partnerPairs,
    };
  }, [games, colorsLoaded]);

  return (
    <div className="game-stats">
      <h2>Overall Game Statistics</h2>
      
      {/* Core Game Stats */}
      <div className="stats-section">
        <h3>Game Overview</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Games</div>
            <div className="stat-value">{stats.totalGames}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Players</div>
            <div className="stat-value">{stats.totalPlayers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Unique Commanders</div>
            <div className="stat-value">{stats.uniqueCommanders}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Average Players/Game</div>
            <div className="stat-value">{stats.averagePlayersPerGame}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Estimated Total Minutes</div>
            <div className="stat-value">{stats.totalGameMinutes}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Most Common Color</div>
            <div className={`stat-value color-badge color-${stats.mostCommonColorCode?.toLowerCase() || 'u'}`}>{stats.mostCommonColor}</div>
            <div className="stat-subtext">Played {stats.commonColorCount} times</div>
          </div>
        </div>
      </div>

      {/* Color Stats */}
      <div className="stats-section">
        <h3>Color Distribution & Performance</h3>
        <div className="color-stats-simple">
          {stats.colorStats.length > 0 ? (
            stats.colorStats.map((color, idx) => {
              return (
                <div key={idx} className={`color-stat-card color-${color.color.toLowerCase()}`}>
                  <div className="color-stat-header">
                    <div className="color-stat-name">{COLOR_MAP[color.color] || color.color}</div>
                    <div className="color-stat-plays">{color.playCount}p</div>
                  </div>
                  <div className="color-stat-record">{color.wins}W • {color.playCount - color.wins}L</div>
                  <div className="color-stat-rate">{color.winRate.toFixed(0)}%</div>
                </div>
              );
            })
          ) : (
            <div>No color data</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameStats;
