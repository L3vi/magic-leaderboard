import React from "react";
import type { CommanderStatsData } from "../../types";
import PartnerCommanderDisplay from "../PartnerCommanderDisplay/PartnerCommanderDisplay";
import "../ColorStats/ColorStatsDetails.css";
import "./CommanderStatsDetails.css";

interface CommanderStatsDetailsProps {
  stats: CommanderStatsData;
  onPilotClick?: (playerName: string) => void;
  onGameClick?: (gameId: string) => void;
}

const placementLabel = (placement: number): string => {
  if (placement === 1) return "🏆 1st";
  if (placement === 2) return "2nd";
  if (placement === 3) return "3rd";
  return `${placement}th`;
};

const CommanderStatsDetails: React.FC<CommanderStatsDetailsProps> = ({
  stats,
  onPilotClick,
  onGameClick,
}) => {
  return (
    <div className="color-stats-details">
      {/* Header: card art (display only — tapping art elsewhere edits art, so
          here it stays non-interactive) + deck name. */}
      <div className="color-stats-header commander-stats-header">
        <div className="commander-stats-art">
          <PartnerCommanderDisplay commanders={stats.commanders} size="medium" />
        </div>
        <h1 className="commander-stats-title">{stats.deckName}</h1>
      </div>

      {/* Overall Stats */}
      <section className="stats-summary-section">
        <h2 className="section-heading">Overall Statistics</h2>
        <div className="stats-summary-grid">
          <div className="stat-card">
            <div className="stat-label">Plays</div>
            <div className="stat-value">{stats.totalPlays}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Wins</div>
            <div className="stat-value">{stats.totalWins}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Win Rate</div>
            <div className="stat-value">{(stats.winRate * 100).toFixed(0)}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pilots</div>
            <div className="stat-value">{stats.pilots.length}</div>
          </div>
        </div>
      </section>

      {/* Pilots — who has played this commander */}
      <section className="commanders-section">
        <h2 className="section-heading">Pilots ({stats.pilots.length})</h2>
        <div className="commanders-list">
          {stats.pilots.map((pilot, idx) => (
            <div
              key={pilot.playerName}
              className="commander-stat-item"
              onClick={() => onPilotClick?.(pilot.playerName)}
              style={{ cursor: onPilotClick ? "pointer" : "default" }}
            >
              <div className="commander-rank">{idx + 1}</div>
              <div className="commander-info">
                <div className="commander-name">{pilot.playerName}</div>
                <div className="commander-meta">
                  {pilot.plays} play{pilot.plays !== 1 ? "s" : ""} •{" "}
                  {pilot.wins} win{pilot.wins !== 1 ? "s" : ""} •{" "}
                  {(pilot.winRate * 100).toFixed(0)}% win rate
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Game-by-game appearances */}
      <section className="commanders-section">
        <h2 className="section-heading">Games ({stats.appearances.length})</h2>
        <div className="commander-games-list">
          {stats.appearances.map((game) => (
            <div
              key={`${game.gameId}-${game.playerName}`}
              className="commander-game-item"
              onClick={() => onGameClick?.(game.gameId)}
              style={{ cursor: onGameClick ? "pointer" : "default" }}
            >
              <div
                className={`commander-game-placement placement-${game.placement}`}
              >
                {placementLabel(game.placement)}
              </div>
              <div className="commander-game-info">
                <div className="commander-game-pilot">{game.playerName}</div>
                <div className="commander-game-meta">
                  {new Date(game.dateCreated).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  • {game.playerCount} player
                  {game.playerCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CommanderStatsDetails;
