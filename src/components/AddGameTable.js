import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import ReactDOM from "react-dom";
import { db, ref, set, onValue } from "../firebase"; // Ensure `ref` is imported

function getCommanderHistory(events, playerName) {
  const commanders = {};
  events.forEach((ev) =>
    ev.games.forEach((g) =>
      g.players.forEach((p) => {
        if (p.name === playerName && p.commander) {
          commanders[p.commander] = (commanders[p.commander] || 0) + 1;
        }
      })
    )
  );
  return Object.entries(commanders)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);
}

export default function AddGameTable({
  events,
  players,
  setPlayers,
  placements,
  setPlacements,
  commanders,
  setCommanders,
  allPlayers,
  addPlayer,
  removePlayer,
}) {
  // Scryfall autocomplete state
  const [scryfallResults, setScryfallResults] = useState({});
  const [scryfallLoading, setScryfallLoading] = useState({});
  const [commanderImages, setCommanderImages] = useState({}); // commander image URLs by index
  // Track which popup is open and its position
  const [popupInfo, setPopupInfo] = useState({ idx: null, rect: null });
  const commanderInputRefs = useRef([]);

  // Fetch Scryfall suggestions for a given input
  const fetchScryfall = async (query, idx) => {
    if (!query || query.length < 2) return;
    setScryfallLoading((l) => ({ ...l, [idx]: true }));
    try {
      // Use Scryfall autocomplete endpoint for card names
      const res = await fetch(
        `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) {
        setScryfallResults((r) => ({ ...r, [idx]: [] }));
        setScryfallLoading((l) => ({ ...l, [idx]: false }));
        return;
      }
      const data = await res.json();
      setScryfallResults((r) => ({ ...r, [idx]: data.data || [] }));
    } catch (err) {
      setScryfallResults((r) => ({ ...r, [idx]: [] }));
    }
    setScryfallLoading((l) => ({ ...l, [idx]: false }));
  };

  // Fetch Scryfall image for a commander name
  const fetchCommanderImage = async (name, idx) => {
    if (!name) {
      setCommanderImages((imgs) => ({ ...imgs, [idx]: null }));
      return;
    }
    setCommanderImages((imgs) => ({ ...imgs, [idx]: undefined })); // undefined = loading
    try {
      const res = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`
      );
      const data = await res.json();
      let img = null;
      if (data.image_uris && data.image_uris.art_crop) {
        img = data.image_uris.art_crop;
      } else if (data.image_uris && data.image_uris.small) {
        img = data.image_uris.small;
      } else if (
        data.card_faces &&
        data.card_faces[0] &&
        data.card_faces[0].image_uris &&
        data.card_faces[0].image_uris.art_crop
      ) {
        img = data.card_faces[0].image_uris.art_crop;
      }
      setCommanderImages((imgs) => ({ ...imgs, [idx]: img }));
    } catch {
      setCommanderImages((imgs) => ({ ...imgs, [idx]: null }));
    }
  };

  const handlePlayerChange = (i, val) => {
    if (val === "add-new-player") {
      setShowAddPlayerModal(true);
    } else {
      const arr = [...players];
      arr[i] = val;
      setPlayers(arr);
    }
  };
  const handlePlacementChange = (i, val) => {
    const arr = [...placements];
    arr[i] = val;
    setPlacements(arr);
  };
  const handleCommanderChange = (i, val) => {
    const arr = [...commanders];
    arr[i] = val;
    setCommanders(arr);
    fetchScryfall(val, i);
    // Only fetch image if the value matches a suggestion (to avoid 404s)
    if (val && val.length > 2 && /^[a-zA-Z0-9' -]+$/.test(val) && scryfallResults[i]?.includes(val)) {
      fetchCommanderImage(val, i);
    }
    // Always show popup for the currently edited input
    const input = commanderInputRefs.current[i];
    if (input) {
      const rect = input.getBoundingClientRect();
      setPopupInfo({ idx: i, rect });
    }
  };

  // Handle focus to show popup
  const handleCommanderFocus = (i) => {
    const input = commanderInputRefs.current[i];
    if (input) {
      const rect = input.getBoundingClientRect();
      setPopupInfo({ idx: i, rect });
    }
  };
  // Hide popup on blur (with delay for click)
  const handleCommanderBlur = () => {
    setTimeout(() => setPopupInfo({ idx: null, rect: null }), 150);
  };

  // Update popup position on scroll/resize
  useLayoutEffect(() => {
    if (popupInfo.idx !== null) {
      const handle = () => {
        const input = commanderInputRefs.current[popupInfo.idx];
        if (input) {
          const rect = input.getBoundingClientRect();
          setPopupInfo((info) => ({ ...info, rect }));
        }
      };
      window.addEventListener("scroll", handle, true);
      window.addEventListener("resize", handle);
      return () => {
        window.removeEventListener("scroll", handle, true);
        window.removeEventListener("resize", handle);
      };
    }
  }, [popupInfo.idx]);

  // Close popup on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setPopupInfo({ idx: null, rect: null });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Firebase integration
  const [newPlayer, setNewPlayer] = useState("");
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);

  useEffect(() => {
    const playersRef = ref(db, "players");
    onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      setPlayers(data ? Object.values(data) : []);
    });
  }, []);

  const handleAddPlayer = () => {
    if (newPlayer.trim()) {
      const newPlayerRef = ref(db, `players/${newPlayer}`);
      set(newPlayerRef, newPlayer);
      setNewPlayer("");
      setShowAddPlayerModal(false);
    }
  };

  return (
    <div>
      <div className="addgame-table-wrapper">
        {/* Mobile: Card/List layout, Desktop: Table layout */}
        <div className="addgame-list">
          {players.map((p, i) => (
            <div key={i} className="addgame-card">
              <div className="addgame-card__header">
                <span className="addgame-card__rank">#{i + 1}</span>
                {players.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removePlayer(i)}
                    title="Remove Player"
                    className="addgame-remove-btn"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="addgame-card__fields">
                <div className="addgame-card__field">
                  <label htmlFor={`player-${i}`}>Player</label>
                  <select
                    id={`player-${i}`}
                    onChange={(e) => handlePlayerChange(i, e.target.value)}
                    className="addgame-input"
                  >
                    <option value="">Select Player</option>
                    {allPlayers.filter(name => !players.includes(name) || players[i] === name).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    <option value="add-new-player">Add New Player</option>
                  </select>
                </div>
                <div className="addgame-card__field">
                  <label htmlFor={`placement-${i}`}>Place</label>
                  <select
                    id={`placement-${i}`}
                    value={placements[i]}
                    onChange={(e) => handlePlacementChange(i, Number(e.target.value))}
                    className="addgame-select"
                  >
                    {players.map((_, idx) => (
                      <option key={idx + 1} value={idx + 1}>{idx + 1}</option>
                    ))}
                  </select>
                </div>
                <div className="addgame-card__field">
                  <label htmlFor={`commander-${i}`}>Commander</label>
                  <div className="addgame-card__commander">
                    {commanderImages[i] === undefined && commanders[i] && (
                      <span className="scryfall-loading-spinner-inside" aria-label="Loading" />
                    )}
                    {commanderImages[i] && (
                      <img
                        src={commanderImages[i]}
                        alt="Commander thumbnail"
                        className="commander-thumb"
                      />
                    )}
                    <input
                      id={`commander-${i}`}
                      type="text"
                      value={commanders[i]}
                      onChange={(e) => handleCommanderChange(i, e.target.value)}
                      placeholder="Commander"
                      className="addgame-input"
                      autoComplete="off"
                      ref={(el) => (commanderInputRefs.current[i] = el)}
                      onFocus={() => handleCommanderFocus(i)}
                      onBlur={handleCommanderBlur}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <datalist id="player-suggestions">
        {allPlayers.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <button type="button" onClick={addPlayer} className="addgame-add-btn">
        + Add Player
      </button>
      {/* Scryfall suggestions popup rendered as portal */}
      {popupInfo.idx !== null &&
        scryfallResults[popupInfo.idx] &&
        scryfallResults[popupInfo.idx].length > 0 &&
        popupInfo.rect &&
        ReactDOM.createPortal(
          <div
            className="scryfall-popup"
            style={{
              position: "fixed",
              left: popupInfo.rect.left,
              top: popupInfo.rect.bottom,
              width: popupInfo.rect.width,
              zIndex: 9999,
            }}
          >
            {scryfallResults[popupInfo.idx].map((suggestion, idx) => (
              <div
                key={suggestion}
                className="scryfall-popup-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCommanderChange(popupInfo.idx, suggestion);
                  setPopupInfo({ idx: null, rect: null });
                }}
                tabIndex={0}
              >
                {suggestion}
              </div>
            ))}
          </div>,
          document.body
        )}

      {/* Add New Player Modal */}
      {showAddPlayerModal && (
        <div className="modal">
          <input
            type="text"
            value={newPlayer}
            onChange={(e) => setNewPlayer(e.target.value)}
            placeholder="Enter new player name"
          />
          <button onClick={handleAddPlayer}>Add Player</button>
          <button onClick={() => setShowAddPlayerModal(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
