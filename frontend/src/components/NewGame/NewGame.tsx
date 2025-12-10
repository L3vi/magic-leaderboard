import React, { useState } from "react";
import { usePlayers } from "./usePlayers";
import "./NewGame.css";

interface NewGameProps {
  onSubmit: (gameData: any) => void;
  onCancel?: () => void;
}

interface PlayerField {
  playerId: string;
  commander: string;
  placement: number;
  addNew: boolean;
  newName: string;
}

const NewGame: React.FC<NewGameProps> = ({ onSubmit, onCancel }) => {
  const players = usePlayers();
  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 8;
  const DEFAULT_PLAYERS = 4;
  const [playerFields, setPlayerFields] = useState<PlayerField[]>(
    Array(DEFAULT_PLAYERS).fill(null).map((_, i) => ({ 
      playerId: '', 
      commander: '',
      placement: i + 1,
      addNew: false, 
      newName: '' 
    }))
  );
  const [notes, setNotes] = useState("");

  const handlePlayerChange = (idx: number, playerId: string) => {
    setPlayerFields(fields => fields.map((f, i) =>
      i === idx ? { ...f, playerId, addNew: playerId === "__add__", newName: playerId === "__add__" ? '' : f.newName } : f
    ));
  };

  const handleCommanderChange = (idx: number, commander: string) => {
    setPlayerFields(fields => fields.map((f, i) =>
      i === idx ? { ...f, commander } : f
    ));
  };

  const handlePlacementChange = (idx: number, placement: number) => {
    setPlayerFields(fields => fields.map((f, i) =>
      i === idx ? { ...f, placement } : f
    ));
  };

  const handleNewPlayerName = (idx: number, name: string) => {
    setPlayerFields(fields => fields.map((f, i) =>
      i === idx ? { ...f, newName: name, playerId: name } : f
    ));
  };

  const addPlayerField = () => {
    if (playerFields.length < MAX_PLAYERS) {
      setPlayerFields([...playerFields, { 
        playerId: '', 
        commander: '',
        placement: playerFields.length + 1,
        addNew: false, 
        newName: '' 
      }]);
    }
  };
  
  const removePlayerField = (idx: number) => {
    if (playerFields.length > MIN_PLAYERS) {
      const newFields = playerFields.filter((_, i) => i !== idx);
      // Reassign placements after removal
      setPlayerFields(newFields.map((f, i) => ({ ...f, placement: i + 1 })));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all players have required fields
    const validPlayers = playerFields.filter(f => f.playerId && f.commander);
    if (validPlayers.length < MIN_PLAYERS) {
      alert(`Please add at least ${MIN_PLAYERS} players with commanders`);
      return;
    }
    
    // Build game data matching the backend structure
    const gameData = {
      players: validPlayers.map(f => ({
        playerId: f.playerId,
        commander: f.commander,
        placement: f.placement
      })),
      notes: notes.trim(),
      dateCreated: new Date().toISOString()
    };
    
    onSubmit(gameData);
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : playerId;
  };

  return (
    <form className="new-game-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3 className="section-title">Players & Results</h3>
        <div className="players-list">
          {playerFields.map((field, idx) => (
            <div key={idx} className="player-entry">
              <div className="player-entry-header">
                <span className="player-number">Player {idx + 1}</span>
                {playerFields.length > MIN_PLAYERS && (
                  <button
                    type="button"
                    className="remove-player-btn"
                    onClick={() => removePlayerField(idx)}
                    aria-label={`Remove Player ${idx + 1}`}
                  >
                    ×
                  </button>
                )}
              </div>
              
              <div className="player-field-group">
                <label className="field-label">
                  Player Name
                  {!field.addNew ? (
                    <select
                      value={field.playerId}
                      onChange={e => handlePlayerChange(idx, e.target.value)}
                      required
                      className="field-input"
                    >
                      <option value="">Select player</option>
                      {players.map(player => (
                        <option key={player.id} value={player.id}>{player.name}</option>
                      ))}
                      <option value="__add__">+ Add new player…</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={field.newName}
                      onChange={e => handleNewPlayerName(idx, e.target.value)}
                      placeholder="Enter new player name"
                      required
                      className="field-input"
                      onBlur={() => {
                        if (field.newName) handlePlayerChange(idx, field.newName);
                      }}
                    />
                  )}
                </label>

                <label className="field-label">
                  Commander
                  <input
                    type="text"
                    value={field.commander}
                    onChange={e => handleCommanderChange(idx, e.target.value)}
                    placeholder="e.g., Atraxa, Praetors' Voice"
                    required
                    className="field-input"
                  />
                </label>

                <label className="field-label">
                  Placement
                  <select
                    value={field.placement}
                    onChange={e => handlePlacementChange(idx, parseInt(e.target.value))}
                    required
                    className="field-input placement-select"
                  >
                    {Array.from({ length: playerFields.length }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>
                        {num === 1 ? '🥇 1st Place' : num === 2 ? '🥈 2nd Place' : num === 3 ? '🥉 3rd Place' : `${num}th Place`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
        
        {playerFields.length < MAX_PLAYERS && (
          <button type="button" className="add-player-btn" onClick={addPlayerField}>
            + Add Another Player
          </button>
        )}
      </div>

      <div className="form-section">
        <label className="field-label">
          Game Notes (Optional)
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about this game (e.g., 'Epic 3-hour battle!', 'Anson pulled off an amazing combo win')..."
            className="field-input notes-input"
            rows={3}
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="submit-btn">Create Game</button>
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
