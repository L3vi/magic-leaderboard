import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import ReactDOM from "react-dom";

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
      const res = await fetch(
        `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(
          query
        )}`
      );
      const data = await res.json();
      setScryfallResults((r) => ({ ...r, [idx]: data.data || [] }));
    } catch {
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
    const arr = [...players];
    arr[i] = val;
    setPlayers(arr);
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
    fetchCommanderImage(val, i);
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

  return (
    <div>
      <table
        className="scoreboard-table addgame-table"
        style={{
          minWidth: 0,
          width: "100%",
          tableLayout: "auto",
          maxWidth: 800,
        }}
      >
        <thead>
          <tr className="scoreboard-header-row">
            <th
              className="scoreboard-rank-header"
              style={{ width: 36, minWidth: 36, maxWidth: 36 }}
            >
              #
            </th>
            <th
              className="scoreboard-player-header"
              style={{ minWidth: 120, width: 160, maxWidth: 200 }}
            >
              Player
            </th>
            <th
              className="scoreboard-placement-header scoreboard-placement-header-score"
              style={{ width: 70, minWidth: 60, maxWidth: 80 }}
            >
              Place
            </th>
            <th
              className="scoreboard-player-header"
              style={{ minWidth: 120, width: 160, maxWidth: 200 }}
            >
              Commander
            </th>
            <th style={{ width: 32, minWidth: 32, maxWidth: 32 }}></th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr
              key={i}
              className="scoreboard-row addgame-row"
              style={{ position: "relative" }}
            >
              <td className="scoreboard-rank">{i + 1}</td>
              <td
                className="scoreboard-player-cell"
                style={{ position: "relative" }}
              >
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type="text"
                    list="player-suggestions"
                    value={p}
                    onChange={(e) => handlePlayerChange(i, e.target.value)}
                    placeholder={`Player ${i + 1}`}
                    autoFocus={i === 0}
                    className="addgame-input"
                    style={{
                      minWidth: 0,
                      width: "100%",
                      paddingRight: scryfallLoading[i] ? 28 : undefined,
                    }}
                  />
                  {scryfallLoading[i] && (
                    <span
                      className="scryfall-loading-spinner-inside"
                      aria-label="Loading"
                    />
                  )}
                </div>
              </td>
              <td className="scoreboard-player-score">
                <select
                  value={placements[i]}
                  onChange={(e) =>
                    handlePlacementChange(i, Number(e.target.value))
                  }
                  className="addgame-select"
                  style={{ minWidth: 0, width: "100%" }}
                >
                  {players.map((_, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {idx + 1}
                    </option>
                  ))}
                </select>
              </td>
              <td className="scoreboard-player-cell">
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {/* Commander thumbnail */}
                  {commanderImages[i] === undefined && commanders[i] && (
                    <span
                      className="scryfall-loading-spinner-inside"
                      style={{ left: 0, right: "auto", marginRight: 6 }}
                      aria-label="Loading"
                    />
                  )}
                  {commanderImages[i] && (
                    <img
                      src={commanderImages[i]}
                      alt="Commander thumbnail"
                      className="commander-thumb"
                      style={{
                        width: 36,
                        height: 36,
                        objectFit: "cover",
                        borderRadius: 6,
                        marginRight: 8,
                        flexShrink: 0,
                        background: "#23293a",
                        border: "1.5px solid #5fa8e9",
                      }}
                    />
                  )}
                  <input
                    type="text"
                    list="commander-suggestions-0"
                    value={commanders[i]}
                    onChange={(e) => handleCommanderChange(i, e.target.value)}
                    placeholder="Commander"
                    className="addgame-input"
                    style={{
                      minWidth: 0,
                      width: "100%",
                      paddingRight: scryfallLoading[i] ? 28 : undefined,
                      marginLeft:
                        commanderImages[i] || commanderImages[i] === undefined
                          ? 0
                          : 0,
                    }}
                    autoComplete="off"
                    ref={(el) => (commanderInputRefs.current[i] = el)}
                    onFocus={() => handleCommanderFocus(i)}
                    onBlur={handleCommanderBlur}
                  />
                  {scryfallLoading[i] && (
                    <span
                      className="scryfall-loading-spinner-inside"
                      aria-label="Loading"
                    />
                  )}
                </div>
              </td>
              <td>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    </div>
  );
}
