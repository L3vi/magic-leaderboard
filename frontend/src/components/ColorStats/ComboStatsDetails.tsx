import React from "react";
import type { ComboStatsData } from "../../types";
import { COLOR_HEX, COLOR_MAP } from "../../utils/colorCombos";
import "./ColorStatsDetails.css";
import "./ComboStatsDetails.css";

interface ComboStatsDetailsProps {
  stats: ComboStatsData;
  onCommanderClick?: (commanderName: string) => void;
}

const ComboStatsDetails: React.FC<ComboStatsDetailsProps> = ({
  stats,
  onCommanderClick,
}) => {
  const sortedCommanders = [...stats.commanders].sort((a, b) => b.plays - a.plays);

  // Color-identity pips for the combo header (e.g. Mardu → red/white/black).
  // Empty for tier views ("3-color"), which span many identities.
  const pips = stats.comboKey
    ? stats.comboKey.split("").map((c, i) => (
        <span
          key={i}
          className="combo-header-pip"
          style={{ background: COLOR_HEX[c] }}
          title={COLOR_MAP[c]}
        />
      ))
    : null;

  return (
    <div className="color-stats-details">
      {/* Combo Header */}
      <div className="color-stats-header">
        <div className="combo-badge-large">
          {pips && <span className="combo-header-pips">{pips}</span>}
          <span className="combo-badge-label">{stats.label}</span>
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
            <div className="stat-value">{(stats.winRate * 100).toFixed(0)}%</div>
          </div>
        </div>
      </section>

      {/* Commanders in This Combination */}
      <section className="commanders-section">
        <h2>Commanders ({sortedCommanders.length})</h2>
        <div className="commanders-list">
          {sortedCommanders.length === 0 ? (
            <div className="empty-state">No commanders found for this combination</div>
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
                    {(cmd.winRate * 100).toFixed(0)}% win rate
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

export default ComboStatsDetails;
