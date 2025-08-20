import React, { useState } from "react";
import { usePlayers } from "./usePlayers";
import "./NewGame.css";

interface NewGameProps {
  onSubmit: (gameData: any) => void;
  onCancel?: () => void;
}

const NewGame: React.FC<NewGameProps> = ({ onSubmit, onCancel }) => {
  const players = usePlayers();
  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 8;
  const DEFAULT_PLAYERS = 4;
  const [playerFields, setPlayerFields] = useState(
    Array(DEFAULT_PLAYERS).fill('').map(() => ({ value: '', addNew: false, newName: '' }))
  );
  const [winner, setWinner] = useState("");
  const [date, setDate] = useState("");

  const handlePlayerChange = (idx: number, value: string) => {
    setPlayerFields(fields => fields.map((f, i) =>
      i === idx ? { ...f, value, addNew: value === "__add__", newName: value === "__add__" ? '' : f.newName } : f
    ));
  };

  const handleNewPlayerName = (idx: number, name: string) => {
    setPlayerFields(fields => fields.map((f, i) =>
      i === idx ? { ...f, newName: name, value: name } : f
    ));
  };

  const addPlayerField = () => {
    if (playerFields.length < MAX_PLAYERS) {
      setPlayerFields([...playerFields, { value: '', addNew: false, newName: '' }]);
    }
  };
  const removePlayerField = (idx: number) => {
    if (playerFields.length > MIN_PLAYERS) {
      setPlayerFields(playerFields.filter((_, i) => i !== idx));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const playerNames = playerFields.map(f => f.value).filter(Boolean);
    onSubmit({ players: playerNames, winner, date });
  };

  return (
    <form className="new-game-form" onSubmit={handleSubmit}>
      <h2>Create New Game</h2>
      {playerFields.map((field, idx) => (
        <label key={idx} style={{ position: 'relative' }}>
          {`Player ${idx + 1}`}
          {!field.addNew ? (
            <select
              value={field.value}
              onChange={e => handlePlayerChange(idx, e.target.value)}
              required
            >
              <option value="">Select player</option>
              {players.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
              <option value="__add__">Add new player…</option>
            </select>
          ) : (
            <input
              type="text"
              value={field.newName}
              onChange={e => handleNewPlayerName(idx, e.target.value)}
              placeholder="Enter new player name"
              required
              onBlur={() => {
                if (field.newName) handlePlayerChange(idx, field.newName);
              }}
            />
          )}
          {playerFields.length > MIN_PLAYERS && (
            <button
              type="button"
              className="remove-player-btn"
              onClick={() => removePlayerField(idx)}
              aria-label={`Remove Player ${idx + 1}`}
              style={{ position: 'absolute', right: 0, top: 0 }}
            >
              &times;
            </button>
          )}
        </label>
      ))}
      <div className="form-actions" style={{ justifyContent: 'flex-start', marginBottom: '1rem' }}>
        {playerFields.length < MAX_PLAYERS && (
          <button type="button" className="add-player-btn" onClick={addPlayerField}>
            + Add Player
          </button>
        )}
      </div>
      <label>
        Winner
        <select value={winner} onChange={e => setWinner(e.target.value)} required>
          <option value="">Select winner</option>
          {playerFields.map((f, idx) => f.value && (
            <option key={idx} value={f.value}>{f.value}</option>
          ))}
        </select>
      </label>
      <label>
        Date
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
        />
      </label>
      <div className="form-actions">
        <button type="submit">Create Game</button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default NewGame;
