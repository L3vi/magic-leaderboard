import React, { useMemo } from "react";
import { useSession } from "../../context/SessionContext";
import { useCommanderArt } from "../../hooks/useCommanderArt";
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

// Commander color detection
const getCommanderColors = (commanderName: string): string[] => {
  const colorPatterns: Record<string, string[]> = {
    // White
    "Giada": ["W"],
    "Lathiel": ["W"],
    "Tannuk": ["W"],
    // Blue
    "Talrand": ["U"],
    "Jace": ["U"],
    "Urza": ["U"],
    "Haldan": ["U"],
    // Black
    "Elesh Norn": ["B"],
    "Sheoldred": ["B"],
    "Sefris": ["B"],
    // Red
    "Starscream": ["R"],
    "Ognis": ["R"],
    "Rograkh": ["R"],
    "Atreus": ["R"],
    "Fire Lord Zuko": ["R"],
    "Fire Lord Azula": ["R"],
    "Gimli": ["R"],
    // Green
    "Sythis": ["G"],
    "Old Stickfingers": ["G"],
    "Go-Shintai": ["G"],
    "Kodama": ["G"],
    "Gilanra": ["G"],
    "Toph": ["G"],
    "Atla Palani": ["G"],
    // Multi-color
    "Nekusar": ["U", "R"],
    "Ian Malcolm": ["U", "R"],
    "Inniaz": ["U", "W"],
    "Isshin": ["R", "W"],
    "Atraxa": ["W", "U", "B", "G"],
    "Jodah": ["W", "U", "R"],
    "Yawgmoth": ["B", "G"],
    "Vorinclex": ["G", "R"],
    "Miirym": ["R", "G"],
    "Rin and Seri": ["W", "G"],
    "Chishiro": ["W", "U", "B"],
    "Lo and Li": ["W", "U", "B"],
    "Ardenn": ["W", "R"],
    "Betor": ["W", "B", "G"],
    "The Pride of Hull Clade": ["W", "U", "B", "R", "G"],
    "Pako": ["U", "R", "G"],
    "Kratos": ["W", "B", "R"],
    "Choco": ["W", "U", "B", "R", "G"],
    "Tidus": ["W", "U", "B", "G"],
    // Additional Marvel/Gaming characters
    "Anti-Venom": ["W", "B"],
    "Captain America": ["W", "R"],
    "Electro": ["U", "R"],
    "Ezio": ["U", "B", "R"],
    "Norman Osborn": ["U", "B", "R"],
    "Shadow": ["U", "B"],
    "Vivi": ["U", "R"],
    "Arabella": ["W", "U"],
  };

  for (const [key, colors] of Object.entries(colorPatterns)) {
    if (commanderName.includes(key)) {
      return colors;
    }
  }

  // Return empty array if not found (will show no color stats)
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

        // Color statistics
        const colors = getCommanderColors(commanders[0]);
        colors.forEach((color) => {
          colorStats[color].playCount += 1;
          if (isWinner) {
            colorStats[color].wins += 1;
          }
          colorStats[color].totalPlacement! += p.placement;
          
          // Track commanders per color
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

    // Most played commander
    const sortedByPlay = Object.values(commanderStats).sort((a, b) => b.playCount - a.playCount);
    const mostPlayedCommander = sortedByPlay[0]?.name || "N/A";
    const commanderPlayCount = sortedByPlay[0]?.playCount || 0;

    // Best commander (by win rate, min 3 plays for meaningful average)
    const bestCmd = Object.values(commanderStats)
      .filter((c) => c.playCount >= 3)
      .sort((a, b) => b.winRate - a.winRate)[0];

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
            <div className={`stat-value color-badge color-${stats.mostCommonColorCode?.toLowerCase() || 'u'}`}>{stats.mostCommonColor}</div>
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
              <div className="stat-label">Best Performing Commander</div>
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
            <div className="commander-thumbnails-grid">
              {stats.commanderStats.map((cmd, idx) => (
                <CommanderThumbnail 
                  key={idx}
                  name={cmd.name}
                  rank={idx + 1}
                  playCount={cmd.playCount}
                  wins={cmd.wins}
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
        <div className="color-stats-expanded">
          {stats.colorStats.length > 0 ? (
            stats.colorStats.map((color, idx) => {
              return (
                <div key={idx} className={`color-detail-card color-${color.color.toLowerCase()}`}>
                  {/* Header */}
                  <div className="color-detail-header">
                    <div className="color-badge-large">{COLOR_MAP[color.color] || color.color}</div>
                    <div className="color-detail-title-section">
                      <div className="color-plays-count">{color.playCount} play{color.playCount !== 1 ? "s" : ""}</div>
                      <div className="color-record-large">{color.wins} win{color.wins !== 1 ? "s" : ""} • {color.playCount - color.wins} loss{color.playCount - color.wins !== 1 ? "es" : ""}</div>
                    </div>
                  </div>
                  
                  {/* Main Stats */}
                  <div className="color-detail-stats">
                    <div className="stat-box">
                      <div className="stat-box-label">Win Rate</div>
                      <div className="stat-box-value">{color.winRate.toFixed(1)}%</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-box-label">Avg Placement</div>
                      <div className="stat-box-value">{(color.averagePlacement || 0).toFixed(2)}</div>
                    </div>
                  </div>
                  
                  {/* Top Commanders */}
                  {color.topCommanders && color.topCommanders.length > 0 && (
                    <div className="color-detail-commanders">
                      <div className="commanders-label">Top Commanders</div>
                      <div className="commanders-list">
                        {color.topCommanders.map((cmd, cmdIdx) => (
                          <CommanderThumbnail 
                            key={cmdIdx} 
                            name={cmd.name} 
                            rank={cmdIdx + 1} 
                            playCount={cmd.playCount}
                            wins={cmd.wins}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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
