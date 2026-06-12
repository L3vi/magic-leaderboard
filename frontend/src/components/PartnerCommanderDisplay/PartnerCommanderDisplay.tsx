import React from "react";
import {
  useCommanderArtWithPreference,
  useCommanderFullImageWithPreference
} from "../../hooks/useCommanderArt";
import "./PartnerCommanderDisplay.css";

interface PartnerCommanderDisplayProps {
  commanders: string[];
  onCardClick?: (card: { name: string; imageUrl: string }) => void;
  size?: "small" | "compact" | "medium" | "large";
  responsive?: boolean; // If true, automatically size based on viewport and player count
  playerCount?: number; // Required when responsive=true for 4+ player detection
  isWinner?: boolean;
  playerId?: string;
}

const PartnerCommanderDisplay: React.FC<PartnerCommanderDisplayProps> = ({
  commanders,
  onCardClick,
  size = "medium",
  responsive = false,
  playerCount = 1,
  isWinner = false,
  playerId,
}) => {
  // Calculate responsive size
  const getResponsiveSize = (): string => {
    if (!responsive) return size;
    
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const is4Plus = playerCount >= 4;
    
    if (isMobile) {
      return is4Plus ? "compact" : "medium";
    }
    return "medium"; // desktop
  };
  
  const finalSize = getResponsiveSize();

  // Call a fixed set of hooks unconditionally, before any early return, so the
  // hook count never changes between renders (Rules of Hooks). These *WithPreference
  // hooks no-op on an empty name and on a missing playerId, so covering up to two
  // commanders is safe whether this is a single or a partner display.
  const [cmd1, cmd2] = [commanders?.[0] || "", commanders?.[1] || ""];
  const art1 = useCommanderArtWithPreference(cmd1, playerId);
  const art2 = useCommanderArtWithPreference(cmd2, playerId);
  const full1 = useCommanderFullImageWithPreference(cmd1, playerId);
  const full2 = useCommanderFullImageWithPreference(cmd2, playerId);

  if (!cmd1) return null;

  // Single commander
  if (!commanders || commanders.length < 2) {
    return (
      <div className={`partner-commander-container size-${finalSize}${isWinner ? " winner" : ""}`}>
        {art1 ? (
          <img
            src={art1}
            alt={cmd1}
            className="partner-commander-img"
            style={{ cursor: onCardClick ? "pointer" : "default" }}
            onClick={() => onCardClick?.({ name: cmd1, imageUrl: full1 || art1 })}
            title={cmd1}
          />
        ) : (
          <div className="partner-commander-placeholder">?</div>
        )}
      </div>
    );
  }

  // Two commanders in a split view
  return (
    <div className={`partner-commander-container size-${finalSize}${isWinner ? " winner" : ""}`}>
      {art1 ? (
        <img
          src={art1}
          alt={cmd1}
          className="partner-commander-img partner-img-1"
          style={{ cursor: onCardClick ? "pointer" : "default" }}
          onClick={() => onCardClick?.({ name: cmd1, imageUrl: full1 || art1 })}
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
          onClick={() => onCardClick?.({ name: cmd2, imageUrl: full2 || art2 })}
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
