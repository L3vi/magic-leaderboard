
import React, { useState, useEffect, useRef } from 'react';
import { 
  useFloating, 
  useInteractions, 
  useClick, 
  useDismiss,
  offset,
  flip,
  size
} from '@floating-ui/react';
import { usePlayers } from "./usePlayers";
import { useGames } from "../../hooks/useApi";
import "./NewGame.css";

// Reusable Static Dropdown with autocomplete styling
type StaticDropdownProps = {
  value: string;
  onChange: (val: string) => void;
  options: { id: string; label: string }[];
  placeholder?: string;
};

const StaticDropdown: React.FC<StaticDropdownProps> = ({ 
  value, 
  onChange, 
  options,
  placeholder = 'Select an option'
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  
  const { refs, floatingStyles, context } = useFloating({
    open: showDropdown,
    onOpenChange: setShowDropdown,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
          });
        },
        padding: 8,
      }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  const selectedLabel = options.find(opt => opt.id === value)?.label || '';

  const handleSelect = (id: string) => {
    onChange(id);
    setShowDropdown(false);
  };

  return (
    <div>
      <button
        ref={refs.setReference}
        type="button"
        className="dropdown-trigger field-input"
        style={{ width: '100%', textAlign: 'left', background: 'var(--surface)', border: '1.5px solid var(--border)', cursor: 'pointer' }}
        {...getReferenceProps()}
      >
        {selectedLabel || placeholder}
      </button>
      {showDropdown && options.length > 0 && (
        <ul
          className="autocomplete-dropdown"
          ref={refs.setFloating}
          style={{ 
            ...floatingStyles, 
            margin: 0, 
            padding: 0, 
            listStyle: 'none'
          }}
          {...getFloatingProps()}
        >
          {options.map((opt) => (
            <li
              key={opt.id}
              onMouseDown={() => handleSelect(opt.id)}
              style={{ cursor: 'pointer' }}
            >
              <span>{opt.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// CommanderAutocomplete - simple text input with card search
type CommanderAutocompleteProps = {
  value: string;
  onChange: (val: string) => void;
  playerId?: string;
  games: any[];
};

const CommanderAutocomplete: React.FC<CommanderAutocompleteProps> = ({ value, onChange, playerId, games: gamesData }) => {
  const [results, setResults] = useState<{ name: string; id: string; image?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lastPlayedCommander, setLastPlayedCommander] = useState<string | null>(null);
  const [previousCommanders, setPreviousCommanders] = useState<string[]>([]);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const { refs, floatingStyles, context } = useFloating({
    open: showDropdown,
    onOpenChange: setShowDropdown,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
          });
        },
        padding: 8,
      }),
    ],
  });

  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  // Load last played commander for this player
  useEffect(() => {
    if (playerId && playerId !== "__add__" && playerId !== "") {
      const sortedGames = [...gamesData].sort((a: any, b: any) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
      const commanders: string[] = [];
      let lastCommander: string | null = null;
      
      for (const game of sortedGames) {
        const playerInGame = (game.players as any[]).find((p: any) => p.playerId === playerId);
        if (playerInGame) {
          // Set the first one we find as the last played
          if (!lastCommander) {
            lastCommander = playerInGame.commander;
            setLastPlayedCommander(playerInGame.commander);
            // Fetch the image for the last played commander
            fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(playerInGame.commander)}`)
              .then(res => res.json())
              .then(data => {
                setSelectedImage(data.image_uris?.art_crop || data.image_uris?.normal || null);
              })
              .catch(() => {
                setSelectedImage(null);
              });
          }
          // Collect all unique commanders this player has played
          if (!commanders.includes(playerInGame.commander)) {
            commanders.push(playerInGame.commander);
          }
        }
      }
      setPreviousCommanders(commanders);
    } else {
      setPreviousCommanders([]);
      setLastPlayedCommander(null);
    }
  }, [playerId]);

  const searchCommanders = (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    fetch(`https://api.scryfall.com/cards/search?q=is:commander+${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        if (data.data && Array.isArray(data.data)) {
          setResults(data.data.slice(0, 10).map((card: any) => ({ 
            name: card.name, 
            id: card.id,
            image: card.image_uris?.small || card.image_uris?.normal || undefined
          })));
          setShowDropdown(true);
        } else {
          setResults([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setResults([]);
        setLoading(false);
      });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setSelectedImage(null);

    // If input is empty, show previous commanders
    if (!val.trim()) {
      setResults(previousCommanders.map(name => ({ name, id: name })));
      setShowDropdown(true);
      setLoading(false);
      return;
    }

    // User has started typing
    setHasStartedTyping(true);

    // Debounce the search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      searchCommanders(val);
    }, 300);
  };

  const handleSelect = (cardName: string) => {
    onChange(cardName);
    setShowDropdown(false);
    setResults([]);
    
    // Fetch the card image
    fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`)
      .then(res => res.json())
      .then(data => {
        setSelectedImage(data.image_uris?.art_crop || data.image_uris?.normal || null);
      })
      .catch(() => {
        setSelectedImage(null);
      });
  };

  const handleInputFocus = () => {
    // Show previous commanders when input is focused and empty
    if (!value.trim() && previousCommanders.length > 0) {
      setResults(previousCommanders.map(name => ({ name, id: name })));
      setShowDropdown(true);
    }
  };

  const handleInputClick = () => {
    // When clicking an empty input, show previous commanders
    if (!value.trim() && previousCommanders.length > 0) {
      setResults(previousCommanders.map(name => ({ name, id: name })));
      setShowDropdown(true);
    }
  };

  return (
    <div className="commander-autocomplete">
      {/* Commander image preview */}
      {selectedImage ? (
        <img
          src={selectedImage}
          alt={value}
        />
      ) : (
        <div className="game-row-commander-img-placeholder">
          ?
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <input
          ref={refs.setReference}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          placeholder={hasStartedTyping ? "Find commander" : (lastPlayedCommander || "Commander name")}
          autoComplete="off"
          className="field-input"
          style={{ width: '100%' }}
          {...getReferenceProps()}
        />
        {showDropdown && results.length > 0 && (
          <ul
            className="autocomplete-dropdown"
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              margin: 0,
              padding: 0,
              listStyle: 'none'
            }}
            {...getFloatingProps()}
          >
            {results.map((card) => (
              <li
                key={card.id}
                onMouseDown={() => handleSelect(card.name)}
              >
                {card.image && (
                  <img src={card.image} alt={card.name} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', background: '#eee' }} />
                )}
                <span>{card.name}</span>
              </li>
            ))}
          </ul>
        )}
        {loading && value && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', padding: '8px', fontSize: '14px', marginTop: '8px', borderRadius: '0.5rem', border: '1.5px solid var(--border)' }}>
            Searching…
          </div>
        )}
      </div>
    </div>
  );
};

type NewGameProps = {
  onSubmit: (gameData: any) => void;
  onCancel?: () => void;
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
  const { games: gamesData } = useGames();
  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 8;
  const DEFAULT_PLAYERS = 4;
  // Helper to get the 4 players who played least recently
  function getLeastRecentlyPlayedPlayers() {
    // Map of playerId to last played date
    const lastPlayed: Record<string, string> = {};
    // Go through games in reverse chronological order
    const sortedGames = [...gamesData].sort((a: any, b: any) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
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
                  <div style={{ flex: 1, position: 'relative' }}>
                    <label className="field-label" style={{ marginBottom: 0 }}>
                      Player Name
                      {!field.addNew ? (
                        <StaticDropdown
                          value={field.playerId}
                          onChange={(id) => handlePlayerChange(idx, id)}
                          options={[
                            ...players.map(p => ({ id: p.id, label: p.name })),
                            { id: "__add__", label: "+ Add new player…" }
                          ]}
                          placeholder="Select player"
                        />
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
                  </div>
                  <div style={{ width: '100px', minWidth: '80px', position: 'relative' }}>
                    <label className="field-label" style={{ marginBottom: 0 }}>
                      Placement
                      <StaticDropdown
                        value={String(field.placement)}
                        onChange={(val) => handlePlacementChange(idx, parseInt(val))}
                        options={Array.from({ length: playerFields.length }, (_, i) => {
                          const placement = i + 1;
                          let label = String(placement);
                          if (placement === 1) label = 'Winner';
                          else if (placement === 2) label = '2nd';
                          else if (placement === 3) label = '3rd';
                          else label = `${placement}th`;
                          return { id: String(placement), label };
                        })}
                        placeholder="Placement"
                      />
                    </label>
                  </div>
                </div>
                <label className="field-label" style={{ position: 'relative', marginTop: '0.5rem' }}>
                  Commander
                  <CommanderAutocomplete
                    value={field.commander}
                    onChange={val => handleCommanderChange(idx, val)}
                    playerId={field.playerId}
                    games={gamesData}
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
