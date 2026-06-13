import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Player } from "./PlayerRow";
import { useCommanderArt, useCommanderFullImage, useCommanderArtWithPreference, useCommanderFullImageWithPreference } from "../../hooks/useCommanderArt";
import { useCommanderColors } from "../../hooks/useCommanderColors";
import PartnerCommanderDisplay from "../PartnerCommanderDisplay/PartnerCommanderDisplay";
import CardModal from "../CardModal/CardModal";
import { formatPlayTime } from "../../utils/formatTime";
import { commanderDeckName, encodeCommanderKey } from "../../utils/commanderKey";
import { scorePlacement } from "../../services/dataService";
import "./PlayerDetails.css";

interface PlayerDetailsProps {
  player: Player & { id?: string };
  games: Array<{
    id: string;
    dateCreated: string;
    notes?: string;
    players: Array<{ playerId: string; placement: number; commander: string | string[] }>;
  }>;
  players: Array<{ id: string; name: string }>;
  onGameClick?: (gameId: string) => void;
  playerId?: string;
}

const PlayerDetails: React.FC<PlayerDetailsProps> = ({ player, games, players, onGameClick, playerId: propPlayerId }) => {
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState<{ name: string; imageUrl: string } | null>(null);
  const playerId = propPlayerId || player.id; // Use prop if provided, otherwise use player.id
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || id;
  const gamesForPlayer = games.filter(g => g.players.some(p => getPlayerName(p.playerId) === player.name));
  const totalGames = gamesForPlayer.length;
  const wins = gamesForPlayer.filter(g => g.players.find(p => getPlayerName(p.playerId) === player.name)?.placement === 1).length;
  const winRate = totalGames ? Math.round((wins / totalGames) * 100) : 0;
  const placements = gamesForPlayer.map(g => g.players.find(p => getPlayerName(p.playerId) === player.name)?.placement || 0);
  const avgPlacement = placements.length ? (placements.reduce((a, b) => a + b, 0) / placements.length).toFixed(2) : "-";
  // Podium rate = share of games finishing in the top 3 (placement 1–3).
  const podiumCount = placements.filter(p => p >= 1 && p <= 3).length;
  const podiumRate = placements.length ? Math.round((podiumCount / placements.length) * 100) : 0;
  
  // Get unique deck combinations (treating companion pairs as single decks)
  const deckCombinations = gamesForPlayer
    .map(g => {
      const p = g.players.find(p => getPlayerName(p.playerId) === player.name);
      const cmd = p?.commander;
      // Create a sortable key for the deck (handles both single commanders and companion pairs)
      if (Array.isArray(cmd)) {
        return cmd.sort().join("|");
      }
      return cmd || "";
    })
    .filter(Boolean);
  
  const uniqueDeckCombinations = new Set(deckCombinations);
  const deckDiversity = uniqueDeckCombinations.size;
  
  // Get deck combination counts for the "most played commander" stat
  const deckCombinationCounts = deckCombinations.reduce((acc, c) => {
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mostPlayedDeckEntry = Object.entries(deckCombinationCounts).sort((a, b) => b[1] - a[1])[0];
  const mostPlayedCommander: [string[], number] | undefined = mostPlayedDeckEntry ? [mostPlayedDeckEntry[0].split("|"), mostPlayedDeckEntry[1]] : undefined;

  // Per-deck record for the "best performing" stat: plays, wins, total placement
  // points (1st=4 … 4th+=1, the same scoring the leaderboard uses), and the sum
  // of finishing places (for an intuitive average-finish readout).
  const deckStats: Record<string, { plays: number; wins: number; scoreSum: number; placeSum: number }> = {};
  gamesForPlayer.forEach(g => {
    const p = g.players.find(p => getPlayerName(p.playerId) === player.name);
    const cmd = p?.commander;
    const key = Array.isArray(cmd) ? [...cmd].sort().join("|") : cmd || "";
    if (!key || !p) return;
    const s = deckStats[key] || (deckStats[key] = { plays: 0, wins: 0, scoreSum: 0, placeSum: 0 });
    s.plays++;
    s.scoreSum += scorePlacement(p.placement);
    s.placeSum += p.placement;
    if (p.placement === 1) s.wins++;
  });
  // Best performing = the deck with the highest performance, gauged exactly like
  // the site's Top Commanders ranking: average placement points (not raw win
  // rate, which ignores 2nd/3rd finishes), Bayesian-smoothed toward this
  // player's own average so a single lucky game can't top a solid record.
  // Constants mirror GameStats: eligibility floor of 2 plays, prior strength 3.
  const MIN_PLAYS_TO_RANK = 2;
  const PRIOR_STRENGTH = 3;
  const eligibleDecks = Object.entries(deckStats).filter(([, s]) => s.plays >= MIN_PLAYS_TO_RANK);
  const eligiblePlays = eligibleDecks.reduce((n, [, s]) => n + s.plays, 0);
  const eligibleScore = eligibleDecks.reduce((n, [, s]) => n + s.scoreSum, 0);
  const baselineAvg = eligiblePlays > 0 ? eligibleScore / eligiblePlays : 2.5;
  const bestPerformingEntry = eligibleDecks
    .map(([key, s]) => {
      const average = s.scoreSum / s.plays;
      const weightedAverage =
        (s.plays * average + PRIOR_STRENGTH * baselineAvg) / (s.plays + PRIOR_STRENGTH);
      return { key, plays: s.plays, wins: s.wins, average, weightedAverage, avgFinish: s.placeSum / s.plays };
    })
    .sort((a, b) => b.weightedAverage - a.weightedAverage || b.plays - a.plays)[0];
  const bestPerformingCommander = bestPerformingEntry
    ? {
        commanders: bestPerformingEntry.key.split("|"),
        wins: bestPerformingEntry.wins,
        plays: bestPerformingEntry.plays,
        average: bestPerformingEntry.average,
        avgFinish: bestPerformingEntry.avgFinish,
      }
    : undefined;
  
  const sortedGames = [...gamesForPlayer].sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  const firstGameDate = gamesForPlayer.length ? new Date(sortedGames[sortedGames.length - 1].dateCreated).toLocaleDateString() : "-";
  const lastGameDate = gamesForPlayer.length ? new Date(sortedGames[0].dateCreated).toLocaleDateString() : "-";

  // Calculate color distribution from deck combinations
  const colorDistribution = React.useMemo(() => {
    const distribution: Record<string, number> = {};
    deckCombinations.forEach((deckCombo) => {
      // Split the deck combination back into individual commanders for color tracking
      const commanders = deckCombo.split("|");
      commanders.forEach((commander) => {
        distribution[commander] = (distribution[commander] || 0) + 1;
      });
    });
    return distribution;
  }, [deckCombinations]);

  return (
    <>
      <div className="player-details">
        {/* Key Stats Cards */}
        <div className="player-stats-cards">
          <div className="stat-card stat-card-primary">
            <div className="stat-label">Score</div>
            <div className="stat-value">{player.score}</div>
          </div>
          <div className="stat-card stat-card-accent">
            <div className="stat-label">Games</div>
            <div className="stat-value">{totalGames}</div>
          </div>
          <div className="stat-card stat-card-accent">
            <div className="stat-label">Wins</div>
            <div className="stat-value">{wins}</div>
          </div>
          <div className="stat-card stat-card-accent">
            <div className="stat-label">Win Rate</div>
            <div className="stat-value">{winRate}%</div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="player-secondary-stats">
          <div className="secondary-stat">
            <div className="secondary-stat-label">Average Score</div>
            <div className="secondary-stat-value">{player.average.toFixed(2)}</div>
          </div>
          <div className="secondary-stat">
            <div className="secondary-stat-label">Most Common Place</div>
            <div className="secondary-stat-value">#{player.mostCommonPlacement}</div>
          </div>
          <div className="secondary-stat">
            <div className="secondary-stat-label">Avg Finish</div>
            <div className="secondary-stat-value">{avgPlacement === "-" ? "-" : `#${avgPlacement}`}</div>
          </div>
          <div className="secondary-stat">
            <div className="secondary-stat-label">Podium Rate</div>
            <div className="secondary-stat-value">{totalGames ? `${podiumRate}%` : "-"}</div>
          </div>
          <div className="secondary-stat">
            <div className="secondary-stat-label">Time Played</div>
            <div className="secondary-stat-value">{player.estimatedMinutesPlayed ? formatPlayTime(player.estimatedMinutesPlayed) : '-'}</div>
          </div>
          <div className="secondary-stat">
            <div className="secondary-stat-label">Decks Played</div>
            <div className="secondary-stat-value">{deckDiversity}</div>
          </div>
          <div className="secondary-stat">
            <div className="secondary-stat-label">First Game</div>
            <div className="secondary-stat-value">{firstGameDate}</div>
          </div>
          <div className="secondary-stat">
            <div className="secondary-stat-label">Last Game</div>
            <div className="secondary-stat-value">{lastGameDate}</div>
          </div>
        </div>

        {/* Commander highlights: most played + best performing, side by side */}
        {(mostPlayedCommander || bestPerformingCommander) && (
          <div className="commander-highlights">
            {mostPlayedCommander && (
              <CommanderHighlightCard
                title="Most Played"
                commander={mostPlayedCommander[0]}
                meta={`${mostPlayedCommander[1]} game${mostPlayedCommander[1] > 1 ? "s" : ""}`}
                onCardClick={setSelectedCard}
                playerId={playerId}
                onCommanderClick={(key) => navigate(`/stats/commanders/${encodeCommanderKey(key)}`)}
              />
            )}
            {bestPerformingCommander && (
              <CommanderHighlightCard
                title="Best Performing"
                commander={bestPerformingCommander.commanders}
                meta={`${bestPerformingCommander.average.toFixed(1)} avg pts • #${bestPerformingCommander.avgFinish.toFixed(1)} avg finish • ${bestPerformingCommander.plays} play${bestPerformingCommander.plays !== 1 ? "s" : ""}`}
                onCardClick={setSelectedCard}
                playerId={playerId}
                onCommanderClick={(key) => navigate(`/stats/commanders/${encodeCommanderKey(key)}`)}
              />
            )}
          </div>
        )}

        {/* Commander Color Distribution */}
        {deckCombinations.length > 0 && (
          <CommanderColorDistribution commanders={deckCombinations.flatMap(dc => dc.split("|"))} navigate={navigate} />
        )}

        {/* Recent Games */}
        {sortedGames.length > 0 && (
          <div className="recent-games-section">
            <h2 className="section-heading">Recent Games</h2>
            <div className="games-list">
              {sortedGames.map(g => {
                const p = g.players.find(p => getPlayerName(p.playerId) === player.name);
                return (
                  <GameItemWithImage key={g.id} game={g} player={p} onCardClick={setSelectedCard} onGameClick={onGameClick} onCommanderClick={(key) => navigate(`/stats/commanders/${encodeCommanderKey(key)}`)} />
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      <CardModal
        isOpen={!!selectedCard}
        imageUrl={selectedCard?.imageUrl || ""}
        cardName={selectedCard?.name || ""}
        onClose={() => setSelectedCard(null)}
        playerId={playerId}
      />
    </>
  );
};

function CommanderHighlightCard({ title, commander, meta, onCardClick, playerId, onCommanderClick }: { title: string; commander: string | string[]; meta: string; onCardClick: (card: { name: string; imageUrl: string }) => void; playerId?: string; onCommanderClick?: (deckName: string) => void }) {
  const commanderArray = Array.isArray(commander) ? commander : [commander];
  const isPartner = commanderArray.length === 2;
  // Hooks must run unconditionally and a fixed number of times — never in a
  // .map() whose length varies. The partner branch renders via
  // PartnerCommanderDisplay (which fetches its own art), so we only need the
  // primary commander's art here, for the single-commander branch.
  const primaryArt = useCommanderArtWithPreference(commanderArray[0] || "", playerId);
  const primaryFull = useCommanderFullImageWithPreference(commanderArray[0] || "", playerId);
  const commanderName = commanderArray.join(" + ");

  return (
    <div className="commander-section">
      <h2 className="section-heading">{title}</h2>
      <div className="commander-card">
        {isPartner ? (
          // Partner commanders display
          <PartnerCommanderDisplay
            commanders={commanderArray}
            onCardClick={onCardClick}
            size="large"
            isWinner={false}
            playerId={playerId}
          />
        ) : (
          // Single commander display
          primaryArt && (
            <img
              src={primaryArt}
              alt={commanderArray[0]}
              className="commander-thumbnail"
              style={{ cursor: "pointer" }}
              onClick={() => onCardClick({ name: commanderArray[0], imageUrl: primaryFull })}
            />
          )
        )}
        <div className="commander-info">
          <div
            className={`commander-name${onCommanderClick ? " is-clickable" : ""}`}
            onClick={onCommanderClick ? () => onCommanderClick(commanderDeckName(commander)) : undefined}
          >
            {commanderName}
          </div>
          <div className="commander-count">{meta}</div>
        </div>
      </div>
    </div>
  );
}

function GameItemWithImage({ game, player, onCardClick, onGameClick, onCommanderClick }: { game: any; player: any; onCardClick: (card: { name: string; imageUrl: string }) => void; onGameClick?: (gameId: string) => void; onCommanderClick?: (deckName: string) => void }) {
  const commanders = Array.isArray(player?.commander) ? player?.commander : [player?.commander || ""];

  const handleCardClick = (card: { name: string; imageUrl: string }) => {
    onCardClick(card);
  };

  return (
    <div 
      className={`game-item placement-${player?.placement}`}
      onClick={() => onGameClick?.(game.id)}
      style={{ cursor: onGameClick ? 'pointer' : 'default' }}
    >
      <div className="game-item-header">
        <div className="game-date">{new Date(game.dateCreated).toLocaleDateString()}</div>
        <div className={`game-placement placement-badge placement-${player?.placement}`}>
          {player?.placement === 1 ? '🏆' : `#${player?.placement}`}
        </div>
      </div>
      <div className="game-item-body">
        <PartnerCommanderDisplay
          commanders={commanders}
          onCardClick={handleCardClick}
          size="small"
          isWinner={player?.placement === 1}
          playerId={player?.playerId}
        />
        <div className="game-commander-info">
          <div
            className={`game-commander${onCommanderClick ? " is-clickable" : ""}`}
            onClick={
              onCommanderClick
                ? (e) => {
                    e.stopPropagation();
                    onCommanderClick(commanderDeckName(player?.commander));
                  }
                : undefined
            }
          >
            {Array.isArray(player?.commander) ? player?.commander.join(' // ') : player?.commander}
          </div>
          {game.notes && <div className="game-notes">{game.notes}</div>}
        </div>
      </div>
    </div>
  );
}

function CommanderColorDistribution({ commanders, navigate }: { commanders: string[]; navigate: (path: string) => void }) {
  // Color names and their hex values for Magic colors
  const COLOR_MAP: Record<string, { name: string; hex: string }> = {
    W: { name: 'White', hex: '#F5F5DC' },
    U: { name: 'Blue', hex: '#0E47A1' },
    B: { name: 'Black', hex: '#1C1C1C' },
    R: { name: 'Red', hex: '#D32F2F' },
    G: { name: 'Green', hex: '#2E7D32' },
  };

  // Resolve each unique commander's colors via a keyed child hook (ColorProbe)
  // rather than calling useCommanderColors in a .map() here — a hook in a loop
  // whose length changes between renders violates the Rules of Hooks and crashes
  // when a player's deck set shifts (e.g. a game lands via the background poll).
  const uniqueCommanders = useMemo(() => [...new Set(commanders)], [commanders]);
  const [colorsByCommander, setColorsByCommander] = useState<Record<string, string[]>>({});
  const reportColors = useCallback((commander: string, colors: string[]) => {
    setColorsByCommander((prev) => {
      const existing = prev[commander];
      if (existing && existing.length === colors.length && existing.every((c, i) => c === colors[i])) {
        return prev; // unchanged — avoid a needless re-render
      }
      return { ...prev, [commander]: colors };
    });
  }, []);

  // Aggregate over every play (commanders includes repeats) so a deck played
  // more often weighs more, matching the original behavior.
  const colorFrequency: Record<string, number> = {};
  let totalColorCount = 0;
  commanders.forEach((commander) => {
    (colorsByCommander[commander] || []).forEach((color) => {
      colorFrequency[color] = (colorFrequency[color] || 0) + 1;
      totalColorCount++;
    });
  });

  const sortedColors = Object.entries(colorFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({
      code: color,
      ...COLOR_MAP[color],
      count,
      percentage: Math.round((count / totalColorCount) * 100),
    }));

  return (
    <>
      {/* Invisible resolvers — one per unique commander, each calling the hook once. */}
      {uniqueCommanders.map((cmd) => (
        <ColorProbe key={cmd} commander={cmd} onResolved={reportColors} />
      ))}
      {totalColorCount > 0 && (
        <div className="commander-color-distribution">
          <h2 className="section-heading">Color Preferences</h2>
          <div className="color-bars">
            {sortedColors.map(({ code, name, hex, count, percentage }) => (
              <div
                key={code}
                className="color-bar-item"
                onClick={() => navigate(`/stats/colors/${code}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate(`/stats/colors/${code}`);
                  }
                }}
              >
                <div className="color-indicator" style={{ backgroundColor: hex }} title={name} />
                <div className="color-bar-label">{name}</div>
                <div className="color-bar-container">
                  <div
                    className="color-bar-fill"
                    style={{ width: `${percentage}%`, backgroundColor: hex }}
                  />
                </div>
                <div className="color-bar-count">
                  {count} ({percentage}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Resolves one commander's color identity and reports it up. Isolating the hook
// in a keyed child keeps the hook count stable as the commander list changes.
function ColorProbe({ commander, onResolved }: { commander: string; onResolved: (commander: string, colors: string[]) => void }) {
  const colors = useCommanderColors(commander);
  useEffect(() => {
    onResolved(commander, colors);
  }, [commander, colors, onResolved]);
  return null;
}

export default PlayerDetails;
