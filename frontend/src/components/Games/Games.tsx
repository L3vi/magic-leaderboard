import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Games.css";
import GameRow from "./GameRow";

// TypeScript interfaces for game history data
interface Player {
  name: string;
  placement: number;
  commander: string;
}

interface Game {
  id: string;
  dateCreated: string;
  notes: string;
  players: Player[];
}

interface Event {
  id: string;
  date: string;
  games: Game[];
}

interface GameHistoryData {
  year: number;
  events: Event[];
}

// Load game history data
import gamesRaw from "../../data/games.json";
import playersRaw from "../../data/players.json";

const Games: React.FC = () => {
  // Filtering state
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();

  // Use games.json directly
  const allGames = useMemo(() => gamesRaw, []);

  // Filter and sort games
  const getPlayerName = (id: string) => playersRaw.find(p => p.id === id)?.name || id;
  const filteredGames = useMemo(() => {
    let games = allGames;
    if (filter.trim()) {
      games = games.filter(game =>
        game.players.some(
          p => getPlayerName(p.playerId).toLowerCase().includes(filter.toLowerCase()) || p.commander.toLowerCase().includes(filter.toLowerCase())
        )
      );
    }
    // Sort by dateCreated, newest first
    return games.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  }, [allGames, filter]);

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
