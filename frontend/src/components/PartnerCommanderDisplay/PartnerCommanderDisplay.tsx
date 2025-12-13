import React from "react";
import { 
  useCommanderArt, 
  useCommanderFullImage,
  useCommanderArtWithPreference,
  useCommanderFullImageWithPreference
} from "../../hooks/useCommanderArt";
import "./PartnerCommanderDisplay.css";

interface PartnerCommanderDisplayProps {
  commanders: string[];
  onCardClick?: (card: { name: string; imageUrl: string }) => void;
  size?: "small" | "medium" | "large";
  isWinner?: boolean;
  playerId?: string;
}

const PartnerCommanderDisplay: React.FC<PartnerCommanderDisplayProps> = ({
  commanders,
  onCardClick,
  size = "medium",
  isWinner = false,
  playerId,
}) => {
  // If only one commander, return early
  if (!commanders || commanders.length < 2) {
    const commander = commanders?.[0];
    if (!commander) return null;
    
    const artUrl = playerId
      ? useCommanderArtWithPreference(commander, playerId)
      : useCommanderArt(commander);
    const fullImageUrl = playerId
      ? useCommanderFullImageWithPreference(commander, playerId)
      : useCommanderFullImage(commander);
    
    return (
      <div className={`partner-commander-container size-${size}${isWinner ? " winner" : ""}`}>
        {artUrl ? (
          <img
            src={artUrl}
            alt={commander}
            className="partner-commander-img"
            style={{ cursor: onCardClick ? "pointer" : "default" }}
            onClick={() => onCardClick?.({ name: commander, imageUrl: fullImageUrl })}
            title={commander}
          />
        ) : (
          <div className="partner-commander-placeholder">?</div>
        )}
      </div>
    );
  }

  // Display first two commanders in a split view
  const [cmd1, cmd2] = commanders;
  const art1 = playerId
    ? useCommanderArtWithPreference(cmd1, playerId)
    : useCommanderArt(cmd1);
  const art2 = playerId
    ? useCommanderArtWithPreference(cmd2, playerId)
    : useCommanderArt(cmd2);
  const full1 = playerId
    ? useCommanderFullImageWithPreference(cmd1, playerId)
    : useCommanderFullImage(cmd1);
  const full2 = playerId
    ? useCommanderFullImageWithPreference(cmd2, playerId)
    : useCommanderFullImage(cmd2);

  return (
    <div className={`partner-commander-container size-${size}${isWinner ? " winner" : ""}`}>
      {art1 ? (
        <img
          src={art1}
          alt={cmd1}
          className="partner-commander-img partner-img-1"
          style={{ cursor: onCardClick ? "pointer" : "default" }}
          onClick={() => onCardClick?.({ name: cmd1, imageUrl: full1 })}
          title={cmd1}
        />
      ) : (
        <div className="partner-commander-placeholder">?</div>
      )}

      {art2 ? (
        <img
          src={art2}
          alt={cmd2}
          className="partner-commander-img partner-img-2"
          style={{ cursor: onCardClick ? "pointer" : "default" }}
          onClick={() => onCardClick?.({ name: cmd2, imageUrl: full2 })}
          title={cmd2}
        />
      ) : (
        <div className="partner-commander-placeholder">?</div>
      )}

      <div className="partner-slash" />
    </div>
  );
};

export default PartnerCommanderDisplay;
