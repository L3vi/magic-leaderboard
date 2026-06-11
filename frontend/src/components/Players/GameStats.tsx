import React, { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../context/SessionContext";
import { useCommanderArt } from "../../hooks/useCommanderArt";
import { getCachedCommanderColors } from "../../utils/commanderColorCache";
import { preFetchCommanderData } from "../../services/commanderPreFetchService";
import { formatPlayTime } from "../../utils/formatTime";
import { scorePlacement } from "../../services/dataService";
import "./GameStats.css";

interface CommanderStats {
  name: string;
  playCount: number;
  wins: number;
  winRate: number;
  // Placement-based performance (1st=4 … 4th+=1), matching player scoring.
  scoreSum: number;
  average: number; // raw avg placement points per game (higher = better)
  weightedAverage: number; // Bayesian-smoothed average, used for ranking
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

// Commander colors are read straight from the cache; the cache is populated up
// front by preFetchCommanderData (see the effect below), so this stays a pure
// read and never fires its own per-commander request.
const getCommanderColors = (commanderName: string): string[] => {
  return getCachedCommanderColors(commanderName);
};
// Sub-component to display commander with image
interface CommanderThumbnailProps {
  name: string;
  rank: number;
  playCount: number;
  wins: number;
  average: number;
}

const CommanderThumbnail: React.FC<CommanderThumbnailProps> = ({ name, rank, playCount, wins, average }) => {
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
        <div className="commander-item-stats">{average.toFixed(1)} avg • {playCount}p • {wins}W</div>
      </div>
    </div>
  );
};
const GameStats: React.FC = () => {
  const navigate = useNavigate();
  const { games } = useSession();
  // Bump on each prefetch completion so the stats memo recomputes with the
  // now-populated color cache. A counter (not a boolean) is required so a
  // season switch — which fetches a fresh batch of colors — still triggers a
  // recompute; a one-way boolean would no-op on every season after the first.
  const [colorVersion, setColorVersion] = useState(0);

  // Pre-fetch art + colors for this season's commanders in one batched pass
  // (Scryfall /cards/collection). Cheap no-op when everything is already cached.
  useEffect(() => {
    if (games.length === 0) return;
    preFetchCommanderData(games).then(() => {
      setColorVersion((v) => v + 1);
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
        bestCommander: { name: "N/A", average: 0, winRate: 0, playCount: 0 },
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
          // Skip placeholder/missing commanders (older seasons recorded "Unknown")
          // so they never rank as a "top" or "best" commander.
          if (!commander || commander.trim() === "" || commander === "Unknown") return;
          if (!commanderStats[commander]) {
            commanderStats[commander] = {
              name: commander,
              playCount: 0,
              wins: 0,
              winRate: 0,
              scoreSum: 0,
              average: 0,
              weightedAverage: 0,
            };
          }
          commanderStats[commander].playCount += 1;
          commanderStats[commander].scoreSum += scorePlacement(p.placement);
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

    // Win rate (1st-place finishes) + average placement score per commander.
    Object.values(commanderStats).forEach((stat) => {
      stat.winRate = (stat.wins / stat.playCount) * 100;
      stat.average = stat.scoreSum / stat.playCount;
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

    // Rank commanders by performance, not raw win rate. "Win rate" only credits
    // 1st place, so a commander that consistently places 2nd/3rd in 4-player pods
    // looks terrible. Instead use the same placement-points scoring as the player
    // leaderboard (1st=4 … 4th+=1), Bayesian-smoothed toward the league average so
    // a commander with one lucky game doesn't top a commander with a solid record.
    const minPlayThreshold = 3;
    const commanderArray = Object.values(commanderStats).filter((c) => c.playCount >= minPlayThreshold);

    const totalCommanderScore = commanderArray.reduce((sum, c) => sum + c.scoreSum, 0);
    const totalCommanderPlays = commanderArray.reduce((sum, c) => sum + c.playCount, 0);
    const leagueAverageScore = totalCommanderPlays > 0 ? totalCommanderScore / totalCommanderPlays : 2.5;

    commanderArray.forEach((c) => {
      c.weightedAverage =
        (c.playCount * c.average + minPlayThreshold * leagueAverageScore) /
        (c.playCount + minPlayThreshold);
    });

    const topCommanders = commanderArray
      .sort((a, b) => b.weightedAverage - a.weightedAverage)
      .slice(0, 5);

    // Most played commander (for reference, though not shown)
    const sortedByPlay = Object.values(commanderStats).sort((a, b) => b.playCount - a.playCount);
    const mostPlayedCommander = sortedByPlay[0]?.name || "N/A";
    const commanderPlayCount = sortedByPlay[0]?.playCount || 0;

    // Most common color - sort by win rate (colors with 0 plays go last)
    const sortedByColor = Object.values(colorStats).sort((a, b) => {
      if (a.playCount === 0 && b.playCount === 0) return 0;
      if (a.playCount === 0) return 1;
      if (b.playCount === 0) return -1;
      return b.winRate - a.winRate;
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
        name: topCommanders[0]?.name || "N/A",
        average: topCommanders[0]?.average || 0,
        winRate: topCommanders[0]?.winRate || 0,
        playCount: topCommanders[0]?.playCount || 0,
      },
      commanderStats: topCommanders,
      colorStats: sortedByColor,
      mostCommonColor: COLOR_MAP[mostCommonColorCode] || mostCommonColorCode,
      mostCommonColorCode,
      commonColorCount,
      partnerPairs,
    };
  }, [games, colorVersion]);

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
            <div className="stat-value">{formatPlayTime(stats.totalGameMinutes)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Most Common Color</div>
            <div className={`stat-value color-badge color-${stats.mostCommonColorCode?.toLowerCase() || 'u'}`}>{stats.mostCommonColor}</div>
            <div className="stat-subtext">Played {stats.commonColorCount} times</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Most Played Commander</div>
            <div className="stat-value commander-name">{stats.mostPlayedCommander}</div>
            {stats.commanderPlayCount > 0 && (
              <div className="stat-subtext">Played {stats.commanderPlayCount} times</div>
            )}
          </div>
        </div>
      </div>

      {/* Commander Stats */}
      <div className="stats-section">
        <h3>Commander Performance</h3>

        {stats.bestCommander.name !== "N/A" && (
          <div className="stats-grid">
            <div className="stat-card full-width best-commander">
              <div className="stat-label">Best Performing Commander</div>
              <div className="stat-value commander-name">{stats.bestCommander.name}</div>
              <div className="stat-subtext">
                {stats.bestCommander.average.toFixed(2)} avg score · {stats.bestCommander.winRate.toFixed(0)}% wins · {stats.bestCommander.playCount} plays
              </div>
            </div>
          </div>
        )}

        <div className="commander-list">
          <div className="commander-list-header">
            <span>Top Commanders</span>
          </div>
          {stats.commanderStats.length > 0 ? (
            <div className="top-commanders-grid">
              {stats.commanderStats.map((cmd, idx) => (
                <CommanderThumbnail
                  key={idx}
                  name={cmd.name}
                  rank={idx + 1}
                  playCount={cmd.playCount}
                  wins={cmd.wins}
                  average={cmd.average}
                />
              ))}
            </div>
          ) : (
            <div className="commander-row empty">No commander data</div>
          )}
        </div>
      </div>

      {/* Color Stats */}
      <div className="stats-section">
        <h3>Color Distribution & Performance</h3>
        <div className="color-stats-simple">
          {stats.colorStats.length > 0 ? (
            stats.colorStats.map((color, idx) => {
              return (
                <div
                  key={idx}
                  className={`color-stat-card color-${color.color.toLowerCase()}`}
                  onClick={() => navigate(`/stats/colors/${color.color}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      navigate(`/stats/colors/${color.color}`);
                    }
                  }}
                >
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
