import React, { useMemo } from "react";
import { useSession } from "../../context/SessionContext";
import "./GameStats.css";

interface CommanderStats {
  name: string;
  playCount: number;
  wins: number;
  averagePlacement: number;
  winRate: number;
}

interface ColorStats {
  color: string;
  playCount: number;
  wins: number;
  winRate: number;
}

const COLOR_MAP: Record<string, string> = {
  "W": "White",
  "U": "Blue",
  "B": "Black",
  "R": "Red",
  "G": "Green",
};

// Commander color detection (simplified)
const getCommanderColors = (commanderName: string): string[] => {
  // This is a basic implementation - in a real app you'd want a database
  const colorPatterns: Record<string, string[]> = {
    // White
    "Giada": ["W"],
    "Elspeth": ["W"],
    "Solemnity": ["W"],
    // Blue
    "Nekusar": ["U", "R"],
    "Talrand": ["U"],
    "Jace": ["U"],
    // Black
    "Yawgmoth": ["B", "G"],
    "Sheoldred": ["B"],
    // Red
    "Starscream": ["R"],
    "Pia": ["R"],
    "Gishath": ["R", "G"],
    // Green
    "Yavimaya": ["G"],
    // Multi
    "Ian Malcolm": ["U", "R"],
    "Inniaz": ["U", "W"],
    "Isshin": ["R", "W"],
  };

  for (const [key, colors] of Object.entries(colorPatterns)) {
    if (commanderName.includes(key)) {
      return colors;
    }
  }

  // Default to blue if not found
  return ["U"];
};

const GameStats: React.FC = () => {
  const { games } = useSession();

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
    const colorStats: Record<string, ColorStats> = {};
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

        // Color statistics
        const colors = getCommanderColors(commanders[0]);
        colors.forEach((color) => {
          if (!colorStats[color]) {
            colorStats[color] = {
              color: color,
              playCount: 0,
              wins: 0,
              winRate: 0,
            };
          }
          colorStats[color].playCount += 1;
          if (isWinner) {
            colorStats[color].wins += 1;
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
      stat.winRate = (stat.wins / stat.playCount) * 100;
    });

    // Most played commander
    const sortedByPlay = Object.values(commanderStats).sort((a, b) => b.playCount - a.playCount);
    const mostPlayedCommander = sortedByPlay[0]?.name || "N/A";
    const commanderPlayCount = sortedByPlay[0]?.playCount || 0;

    // Best commander (by win rate, min 2 plays)
    const bestCmd = Object.values(commanderStats)
      .filter((c) => c.playCount >= 2)
      .sort((a, b) => b.winRate - a.winRate)[0];

    // Most common color
    const sortedByColor = Object.values(colorStats).sort((a, b) => b.playCount - a.playCount);
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
        name: bestCmd?.name || "N/A",
        winRate: bestCmd?.winRate || 0,
        playCount: bestCmd?.playCount || 0,
      },
      commanderStats: sortedByPlay.slice(0, 5),
      colorStats: sortedByColor,
      mostCommonColor: COLOR_MAP[mostCommonColorCode] || mostCommonColorCode,
      mostCommonColorCode,
      commonColorCount,
      partnerPairs,
    };
  }, [games]);

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
            <div className={`stat-value color-badge color-${stats.mostCommonColorCode.toLowerCase()}`}>{stats.mostCommonColor}</div>
            <div className="stat-subtext">Played {stats.commonColorCount} times</div>
          </div>
        </div>
      </div>

      {/* Commander Stats */}
      <div className="stats-section">
        <h3>Commander Performance</h3>
        
        {stats.bestCommander.name !== "N/A" && (
          <div className="stats-grid">
            <div className="stat-card full-width best-commander">
              <div className="stat-label">Highest Win Rate Commander</div>
              <div className="stat-value commander-name">{stats.bestCommander.name}</div>
              <div className="stat-subtext">
                {stats.bestCommander.winRate.toFixed(0)}% win rate ({stats.bestCommander.playCount} plays)
              </div>
            </div>
          </div>
        )}

        <div className="commander-list">
          <div className="commander-list-header">
            <span>Top Commanders</span>
          </div>
          {stats.commanderStats.length > 0 ? (
            stats.commanderStats.map((cmd, idx) => (
              <div key={idx} className="commander-row">
                <div className="commander-rank">{idx + 1}</div>
                <div className="commander-info">
                  <div className="commander-name">{cmd.name}</div>
                  <div className="commander-meta">
                    {cmd.playCount} play{cmd.playCount !== 1 ? "s" : ""} • {cmd.wins} win{cmd.wins !== 1 ? "s" : ""} ({cmd.winRate.toFixed(0)}%)
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="commander-row empty">No commander data</div>
          )}
        </div>
      </div>

      {/* Color Stats */}
      <div className="stats-section">
        <h3>Color Distribution</h3>
        <div className="color-stats-grid">
          {stats.colorStats.length > 0 ? (
            stats.colorStats.map((color, idx) => (
              <div key={idx} className={`color-stat-card color-${color.color.toLowerCase()}`}>
                <div className="color-badge">{COLOR_MAP[color.color] || color.color}</div>
                <div className="color-meta">
                  <div className="color-plays">{color.playCount} plays</div>
                  <div className="color-winrate">
                    {color.winRate.toFixed(0)}% win rate
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div>No color data</div>
          )}
        </div>
      </div>

      {/* Partner Pairs */}
      {stats.partnerPairs.length > 0 && (
        <div className="stats-section">
          <h3>Popular Partner Pairs</h3>
          <div className="partner-pairs-list">
            {stats.partnerPairs.map((pair, idx) => (
              <div key={idx} className="partner-pair">
                <div className="pair-rank">{idx + 1}</div>
                <div className="pair-info">
                  <div className="pair-name">{pair.pair}</div>
                  <div className="pair-count">Played {pair.count} time{pair.count !== 1 ? "s" : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameStats;
