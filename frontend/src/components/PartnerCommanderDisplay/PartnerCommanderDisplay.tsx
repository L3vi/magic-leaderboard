import React, { useEffect, useRef, useState } from "react";
import {
  useCommanderArtStateWithPreference,
  useCommanderFullImageWithPreference
} from "../../hooks/useCommanderArt";
import "../../styles/skeleton.css";
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

interface CommanderThumbProps {
  url: string;
  loading: boolean;
  name: string;
  imgClassName?: string; // e.g. "partner-img-1" for the clipped split view
  onClick?: () => void;
  clickable?: boolean;
}

/**
 * A single commander art slot. Shimmers while the art URL is resolving and
 * while the image bytes download, swaps in the image once it loads, and falls
 * back to the "?" placeholder only when there is genuinely no art (resolved
 * empty, or the image failed to load).
 */
const CommanderThumb: React.FC<CommanderThumbProps> = ({
  url,
  loading,
  name,
  imgClassName = "",
  onClick,
  clickable,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // A new URL means a new image to load — shimmer again until it arrives. But a
  // cached image can finish loading before React attaches onLoad (e.g. when a
  // tab switch remounts this), so onLoad never fires and the shimmer would stay
  // stuck. Sync from the element's own .complete to cover that case.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete) {
      setErrored(img.naturalWidth === 0);
      setLoaded(img.naturalWidth > 0);
    } else {
      setLoaded(false);
      setErrored(false);
    }
  }, [url]);

  // Resolved with no art (or a broken image) → the question-mark placeholder.
  if ((!loading && !url) || errored) {
    return <div className="partner-commander-placeholder">?</div>;
  }

  const showShimmer = loading || !loaded;

  return (
    <>
      {url && (
        <img
          ref={imgRef}
          src={url}
          alt={name}
          title={name}
          className={`partner-commander-img ${imgClassName}`}
          style={{ cursor: clickable ? "pointer" : "default", opacity: loaded ? 1 : 0 }}
          onClick={onClick}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}
      {showShimmer && (
        <div
          className={`partner-commander-img commander-thumb-shimmer skeleton ${imgClassName}`}
          aria-hidden="true"
        />
      )}
    </>
  );
};

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
  const art1 = useCommanderArtStateWithPreference(cmd1, playerId);
  const art2 = useCommanderArtStateWithPreference(cmd2, playerId);
  const full1 = useCommanderFullImageWithPreference(cmd1, playerId);
  const full2 = useCommanderFullImageWithPreference(cmd2, playerId);

  if (!cmd1) return null;

  // Single commander
  if (!commanders || commanders.length < 2) {
    return (
      <div className={`partner-commander-container size-${finalSize}${isWinner ? " winner" : ""}`}>
        <CommanderThumb
          url={art1.url}
          loading={art1.loading}
          name={cmd1}
          clickable={!!onCardClick}
          onClick={() => onCardClick?.({ name: cmd1, imageUrl: full1 || art1.url })}
        />
      </div>
    );
  }

  // Two commanders in a split view
  return (
    <div className={`partner-commander-container size-${finalSize}${isWinner ? " winner" : ""}`}>
      <CommanderThumb
        url={art1.url}
        loading={art1.loading}
        name={cmd1}
        imgClassName="partner-img-1"
        clickable={!!onCardClick}
        onClick={() => onCardClick?.({ name: cmd1, imageUrl: full1 || art1.url })}
      />
      <CommanderThumb
        url={art2.url}
        loading={art2.loading}
        name={cmd2}
        imgClassName="partner-img-2"
        clickable={!!onCardClick}
        onClick={() => onCardClick?.({ name: cmd2, imageUrl: full2 || art2.url })}
      />

      <div className="partner-slash" />
    </div>
  );
};

export default PartnerCommanderDisplay;
