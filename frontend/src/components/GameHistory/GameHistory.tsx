import React, { useState, useMemo } from "react";
import "./GameHistory.css";
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
import gameHistoryRaw from "../../data/game-history.json";
const gameHistory: GameHistoryData = gameHistoryRaw;


const GameHistory: React.FC = () => {
  // Filtering state
  const [filter, setFilter] = useState("");
  // Track selected game for modal (future)
  const [selected, setSelected] = useState<string | null>(null);

  // Flatten all games from all events
  const allGames = useMemo(() => {
    return gameHistory.events.flatMap(event => event.games.map(game => ({ ...game, eventDate: event.date })));
  }, []);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let games = allGames;
    if (filter.trim()) {
      games = games.filter(game =>
        game.players.some(
          p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.commander.toLowerCase().includes(filter.toLowerCase())
        )
      );
    }
    // Sort by dateCreated, newest first
    return games.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  }, [allGames, filter]);

  // Details modal handler (placeholder)
  const openDetails = (id: string) => {
    setSelected(id);
    // TODO: open modal in future
  };

  return (
    <section className="game-history" aria-labelledby="game-history-title">
      <h2 id="game-history-title" className="game-history-title">Game History</h2>
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
      <div className="game-history-table-wrapper">
        <table className="game-history-table" aria-label="Game history table">
          <tbody>
            {filteredGames.length === 0 ? (
              <tr>
                <td colSpan={4} className="game-history-empty">No game history found.</td>
              </tr>
            ) : (
              filteredGames.map(game => {
                const winner = game.players.find(p => p.placement === 1);
                return (
                  <GameRow
                    key={game.id}
                    id={game.id}
                    dateCreated={game.dateCreated}
                    notes={game.notes}
                    players={game.players}
                    winner={winner}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
// ...existing code...
};

export default GameHistory;
