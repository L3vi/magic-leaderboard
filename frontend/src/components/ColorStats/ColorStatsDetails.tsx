import React from "react";
import type { CommanderColorStats, ColorStatsData } from "../../types";
import "./ColorStatsDetails.css";

interface ColorStatsDetailsProps {
  color: string;
  stats: ColorStatsData;
  onCommanderClick?: (commanderName: string) => void;
}

const ColorStatsDetails: React.FC<ColorStatsDetailsProps> = ({
  color,
  stats,
  onCommanderClick,
}) => {
  const colorLabels: Record<string, string> = {
    W: "White",
    U: "Blue",
    B: "Black",
    R: "Red",
    G: "Green",
  };

  const colorCodes: Record<string, string> = {
    W: "#fffbeb",
    U: "#0ea5e9",
    B: "#1f2937",
    R: "#ef4444",
    G: "#22c55e",
  };

  const textColors: Record<string, string> = {
    W: "#1f2937",
    U: "#ffffff",
    B: "#ffffff",
    R: "#ffffff",
    G: "#ffffff",
  };

  const sortedCommanders = [...stats.commanders].sort((a, b) => b.plays - a.plays);

  return (
    <div className="color-stats-details">
      {/* Color Header */}
      <div className="color-stats-header">
        <div
          className="color-badge-large"
          style={{
            backgroundColor: colorCodes[color],
            color: textColors[color],
          }}
        >
          {colorLabels[color]}
        </div>
      </div>

      {/* Overall Stats */}
      <section className="stats-summary-section">
        <h2>Overall Statistics</h2>
        <div className="stats-summary-grid">
          <div className="stat-box">
            <div className="stat-label">Total Plays</div>
            <div className="stat-value">{stats.totalPlays}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Total Wins</div>
            <div className="stat-value">{stats.totalWins}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Win Rate</div>
            <div className="stat-value">{(stats.winRate * 100).toFixed(1)}%</div>
          </div>
        </div>
      </section>

      {/* Commanders in This Color */}
      <section className="commanders-section">
        <h2>Commanders ({sortedCommanders.length})</h2>
        <div className="commanders-list">
          {sortedCommanders.length === 0 ? (
            <div className="empty-state">No commanders found with this color</div>
          ) : (
            sortedCommanders.map((cmd, idx) => (
              <div
                key={idx}
                className="commander-stat-item"
                onClick={() => onCommanderClick?.(cmd.commanderName)}
                style={{
                  cursor: onCommanderClick ? "pointer" : "default",
                }}
              >
                <div className="commander-rank">{idx + 1}</div>
                <div className="commander-info">
                  <div className="commander-name">{cmd.commanderName}</div>
                  <div className="commander-meta">
                    {cmd.plays} play{cmd.plays !== 1 ? "s" : ""} •{" "}
                    {cmd.wins} win{cmd.wins !== 1 ? "s" : ""} •{" "}
                    {(cmd.winRate * 100).toFixed(1)}% WR
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default ColorStatsDetails;
