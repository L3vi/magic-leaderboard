import React, { useEffect, useState } from "react";
import "./GameRow.css";

interface Player {
  name: string;
  placement: number;
  commander: string;
}

interface GameRowProps {
  id: string;
  dateCreated: string;
  notes: string;
  players: Player[];
  winner?: Player;
  onDetails: (id: string) => void;
}

// Global cache for commander images
const commanderImageCache: Record<string, string> = {};

function useCommanderArt(commander: string): string {
  const [imgUrl, setImgUrl] = React.useState(commanderImageCache[commander] || "");
  React.useEffect(() => {
    if (commanderImageCache[commander]) {
      setImgUrl(commanderImageCache[commander]);
      return;
    }
    let isMounted = true;
    fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(commander)}`)
      .then(res => res.json())
      .then(data => {
        let art = "";
        if (data.image_uris && data.image_uris.art_crop) {
          art = data.image_uris.art_crop;
        } else if (data.card_faces && data.card_faces[0]?.image_uris?.art_crop) {
          art = data.card_faces[0].image_uris.art_crop;
        }
        commanderImageCache[commander] = art;
        if (isMounted) setImgUrl(art);
      })
      .catch(() => {
        commanderImageCache[commander] = ""; // cache failure
        if (isMounted) setImgUrl("");
      });
    return () => { isMounted = false; };
  }, [commander]);
  return imgUrl;
}

const GameRow: React.FC<GameRowProps> = ({
  id,
  dateCreated,
  notes,
  players,
  winner,
  onDetails,
}) => {
  return (
    <li
      className="game-history-game"
      tabIndex={0}
      aria-label={`Game on ${new Date(dateCreated).toLocaleDateString()}`}
    >
      <div className="game-history-summary-row">
        {/* Left Section */}
        <div className="game-history-summary-main">
          <span className="game-history-date">
            {new Date(dateCreated).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          <span className="game-history-players">
            {players.map((p, idx) => {
              const isWinner = winner && p.name === winner.name;
              return (
                <span
                  key={p.name + idx}
                  style={isWinner ? { color: "var(--success, #34d399)", fontWeight: 700 } : {}}
                >
                  {p.name}
                  {idx < players.length - 1 ? ", " : ""}
                </span>
              );
            })}
          </span>
          {winner && (
            <span className="game-history-winner-commander" aria-label="Winning commander">
              {winner.commander}
            </span>
          )}
        </div>
        {/* Middle Section: Thumbnails */}
        <div className="game-history-commanders">
          {players.map((p, idx) => {
            const artUrl = useCommanderArt(p.commander);
            const isWinner = winner && p.name === winner.name;
            const key = p.commander + idx;
            return artUrl ? (
              <img
                key={key}
                src={artUrl}
                alt={p.commander}
                className={`game-history-commander-img${
                  isWinner ? " game-history-commander-winner" : ""
                }`}
                title={p.commander}
              />
            ) : (
              <div
                key={key}
                className="game-history-commander-img-placeholder"
              />
            );
          })}
        </div>
        {/* Right Section */}
        <div className="game-history-summary-actions">
          <button
            className="game-history-details-btn"
            onClick={() => onDetails(id)}
            aria-label="Show more details"
          >
            More Details
          </button>
        </div>
      </div>
    </li>
  );
};

export default GameRow;
