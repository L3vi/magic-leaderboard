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
  onClick?: () => void;
    // active property removed as per refactor
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
  onClick,
    // active property removed as per refactor
}) => {
  return (
    <div
      className="game-row"
      tabIndex={0}
      aria-label={`Game on ${new Date(dateCreated).toLocaleDateString()}`}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <div className="game-row-main">
        <span className="game-row-date">
          {new Date(dateCreated).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
        <span className="game-row-players">
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
        <span className="game-row-winner">
          {winner ? (
            <span className="game-row-winner-commander" aria-label="Winning commander">
              {winner.commander}
            </span>
          ) : (
            <span>-</span>
          )}
        </span>
      </div>
      <div className="game-row-commanders">
        {players.map((p, idx) => {
          const artUrl = useCommanderArt(p.commander);
          const isWinner = winner && p.name === winner.name;
          const key = p.commander + idx;
          return artUrl ? (
            <img
              key={key}
              src={artUrl}
              alt={p.commander}
              className={`game-row-commander-img${isWinner ? " game-row-commander-winner" : ""}`}
              title={p.commander}
            />
          ) : (
            <div
              key={key}
              className="game-row-commander-img-placeholder"
            />
          );
        })}
      </div>
    </div>
  );
};

export default GameRow;
