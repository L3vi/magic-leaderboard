import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Games.css";
import GameRow from "./GameRow";
import { useGames, usePlayers } from "../../hooks/useApi";
import { preFetchCommandersFromGames } from "../../services/commanderPreFetchService";

// TypeScript interfaces for game history data
interface Player {
  name: string;
  placement: number;
  commander: string;
}

interface GamePlayer {
  playerId: string;
  placement: number;
  commander: string | string[];
}

interface Game {
  id: string;
  dateCreated: string;
  notes: string;
  players: GamePlayer[];
}

const Games: React.FC = () => {
  // Filtering state
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { games: gamesData, loading: gamesLoading, error: gamesError } = useGames();
  const { players: playersData, loading: playersLoading } = usePlayers();

  // Use games data from API
  const allGames = useMemo(() => gamesData, [gamesData]);

  // Pre-fetch all commanders from games on load to populate cache
  useEffect(() => {
    if (gamesData.length > 0) {
      preFetchCommandersFromGames(gamesData).catch((error) => {
        console.error("Error pre-fetching commanders:", error);
      });
    }
  }, [gamesData.length]); // Only run once when games first load

  // Filter and sort games
  const getPlayerName = (id: string) => playersData.find(p => p.id === id)?.name || id;
  const getCommanderString = (commander: string | string[]) => {
    return Array.isArray(commander) ? commander.join(' ') : commander;
  };
  const filteredGames = useMemo(() => {
    let games = allGames;
    if (filter.trim()) {
      games = games.filter(game =>
        game.players.some(
          p => getPlayerName(p.playerId).toLowerCase().includes(filter.toLowerCase()) || getCommanderString(p.commander).toLowerCase().includes(filter.toLowerCase())
        )
      );
    }
    // Sort by dateCreated, newest first
    return games.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  }, [allGames, filter, playersData]);

  // Show loading state
  if (gamesLoading || playersLoading) {
    return <section className="game-history main-section">Loading games...</section>;
  }

  // Show error state
  if (gamesError) {
    return (
      <section className="game-history main-section">
        <div style={{ color: 'red' }}>Error loading games: {gamesError}</div>
      </section>
    );
  }

  function handleGameClick(gameId: string) {
    navigate(`/games/${gameId}`);
  }

  return (
    <section className="game-history main-section">
      <div className="game-history-header">
        <div className="game-history-controls">
          <input
            type="text"
            className="game-history-filter"
            placeholder="Filter by player or commander..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            aria-label="Filter games"
          />
        </div>
      </div>
      <div className="game-history-list" role="rowgroup">
        {filteredGames.length === 0 ? (
          <div className="game-history-empty">No game history found.</div>
        ) : (
          filteredGames.map(game => {
            const winner = game.players.find(p => p.placement === 1);
            // Map player IDs to names for GameRow
            const players = game.players.map(p => ({
              name: getPlayerName(p.playerId),
              placement: p.placement,
              commander: p.commander
            }));
            const winnerObj = winner ? {
              name: getPlayerName(winner.playerId),
              placement: winner.placement,
              commander: winner.commander
            } : undefined;
            return (
              <GameRow
                key={game.id}
                id={game.id}
                dateCreated={game.dateCreated}
                notes={game.notes}
                players={players}
                winner={winnerObj}
                onClick={() => handleGameClick(game.id)}
              />
            );
          })
        )}
      </div>
    </section>
  );
};

export default Games;
