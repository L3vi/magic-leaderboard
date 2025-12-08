import React from "react";
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
}

// Global cache for commander images
const commanderImageCache: Record<string, string> = {};

function useCommanderArt(commander: string): string {
  const [imgUrl, setImgUrl] = React.useState(
    commanderImageCache[commander] || ""
  );
  React.useEffect(() => {
    if (commanderImageCache[commander]) {
      setImgUrl(commanderImageCache[commander]);
      return;
    }
    let isMounted = true;
    fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
        commander
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        let art = "";
        if (data.image_uris && data.image_uris.art_crop) {
          art = data.image_uris.art_crop;
        } else if (
          data.card_faces &&
          data.card_faces[0]?.image_uris?.art_crop
        ) {
          art = data.card_faces[0].image_uris.art_crop;
        }
        commanderImageCache[commander] = art;
        if (isMounted) setImgUrl(art);
      })
      .catch(() => {
        commanderImageCache[commander] = ""; // cache failure
        if (isMounted) setImgUrl("");
      });
    return () => {
      isMounted = false;
    };
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
}) => {
  return (
    <div
      className="game-row"
      tabIndex={0}
      aria-label={`Game on ${new Date(dateCreated).toLocaleDateString()}`}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <span className="game-row-date">
        {new Date(dateCreated).toLocaleString([], {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </span>

      <div className="game-row-players">
        {players.map((p, idx) => {
          const artUrl = useCommanderArt(p.commander);
          const isWinner = winner && p.name === winner.name;
          const key = p.commander + idx;
          const commanderImage = artUrl ? (
            <img
              key={key}
              src={artUrl}
              alt={p.commander}
              className={`game-row-commander-img${
                isWinner ? " game-row-commander-winner" : ""
              }`}
              title={p.commander}
            />
          ) : (
            <div key={key} className="game-row-commander-img-placeholder" />
          );
          const playerDetails = (
            <div className="game-row-player-details">
              <div
                key={p.name + idx}
                style={
                  isWinner ? { color: "var(--accent)", fontWeight: 700 } : {}
                }
              >
                {p.name}
              </div>
              <div
                key={p.commander + idx}
                style={
                  isWinner ? { color: "var(--accent)", fontWeight: 700 } : {}
                }
              >
                {p.commander}
              </div>
            </div>
          );
          return (
            <div key={p.name + "-container-" + idx} className="game-row-player">
              {commanderImage}
              {playerDetails}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameRow;
