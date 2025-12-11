import React, { useState, useEffect } from 'react';
type NewGameProps = {
  onSubmit: (gameData: any) => void;
  onCancel?: () => void;
};
import { usePlayers } from "./usePlayers";
import gamesData from '../../data/games.json';
import "./NewGame.css";
// CommanderAutocomplete is now a simple input
type CommanderAutocompleteProps = {
  value: string;
  onChange: (val: string) => void;
};

const CommanderAutocomplete: React.FC<CommanderAutocompleteProps> = ({ value, onChange }) => {
  // Stubbed functions for future autocomplete/art logic
  // const artUrl = useCommanderArt(value); // stub
  // const results = useScryfallAutocomplete(value); // stub

  return (
    <div className="commander-autocomplete" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Blank image preview, always shown, rounded square style */}
      <div
        className="game-row-commander-img-placeholder"
        style={{ width: 48, height: 48, borderRadius: '0.5rem', marginRight: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#bbb', background: '#eee' }}
      >
        ?
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Commander name"
        autoComplete="off"
        className="field-input"
        style={{ flex: 1, minWidth: 0 }}
      />
    </div>
  );
};
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
  // Helper to get the 4 players who played least recently
  function getLeastRecentlyPlayedPlayers() {
    // Map of playerId to last played date
    const lastPlayed: Record<string, string> = {};
    // Go through games in reverse chronological order
    const sortedGames = [...gamesData].sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
    for (const game of sortedGames) {
      for (const p of game.players) {
        if (!lastPlayed[p.playerId]) {
          lastPlayed[p.playerId] = game.dateCreated;
        }
      }
    }
    // All player IDs from the player list
    const allPlayers = players.map(p => p.id);
    // Sort by last played date (oldest first, undefined last)
    const sortedByLastPlayed = allPlayers
      .map(pid => ({
        id: pid,
        last: lastPlayed[pid] || ''
      }))
      .sort((a, b) => {
        if (!a.last && !b.last) return 0;
        if (!a.last) return -1;
        if (!b.last) return 1;
        return new Date(a.last).getTime() - new Date(b.last).getTime();
      });
    return sortedByLastPlayed.slice(0, DEFAULT_PLAYERS).map(p => p.id);
  }

  const [playerFields, setPlayerFields] = useState<PlayerField[]>([]);

  // On mount, set default player fields to least recently played
  useEffect(() => {
    const defaultPlayers = getLeastRecentlyPlayedPlayers();
    setPlayerFields(
      Array(DEFAULT_PLAYERS).fill(null).map((_, i) => ({
        playerId: defaultPlayers[i] || '',
        commander: '',
        placement: i + 1,
        addNew: false,
        newName: ''
      }))
    );
    // eslint-disable-next-line
  }, [players.length]);
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
              
              <div className="player-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-end' }}>
                  <label className="field-label" style={{ flex: 1 }}>
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
                  <label className="field-label" style={{ width: '100px', minWidth: '80px', marginBottom: 0 }}>
                    Placement
                    <select
                      value={field.placement}
                      onChange={e => handlePlacementChange(idx, parseInt(e.target.value))}
                      required
                      className="field-input placement-select"
                      style={{ width: '100%' }}
                    >
                      {Array.from({ length: playerFields.length }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field-label" style={{ position: 'relative', marginTop: '0.5rem' }}>
                  Commander
                  <CommanderAutocomplete
                    value={field.commander}
                    onChange={val => handleCommanderChange(idx, val)}
                  />
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
