import React, { useEffect, useRef, useState } from "react";
import "../../styles/skeleton.css";
import "./ShimmerImage.css";

interface ShimmerImageProps {
  /** Image URL. Empty string means "no image" (renders the fallback). */
  src: string;
  /** True while the URL is still being resolved (e.g. an art lookup in flight). */
  loading?: boolean;
  alt?: string;
  title?: string;
  /** Applied to the <img> element. */
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  /** Rendered when there is no image (resolved empty) or the image fails to load. */
  fallback?: React.ReactNode;
}

/**
 * An image that shimmers while it loads, fades in once the bytes arrive, and
 * shows a fallback when there is genuinely no image (resolved empty or errored).
 *
 * Layout-agnostic: it renders the <img> plus an absolutely-positioned shimmer
 * sibling, so the PARENT must be `position: relative` with a defined size.
 */
const ShimmerImage: React.FC<ShimmerImageProps> = ({
  src,
  loading = false,
  alt,
  title,
  className = "",
  style,
  onClick,
  fallback = null,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // A new src is a new image to load — shimmer again until it arrives. But a
  // cached image can finish loading before React attaches onLoad (e.g. after a
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
  }, [src]);

  // Resolved with no image (or a broken one) → the caller's fallback.
  if ((!loading && !src) || errored) {
    return <>{fallback}</>;
  }

  return (
    <>
      {src && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          title={title}
          className={`shimmer-image ${loaded ? "is-loaded" : ""} ${className}`}
          style={style}
          onClick={onClick}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}
      {(loading || !loaded) && <div className="shimmer-image-overlay skeleton" aria-hidden="true" />}
    </>
  );
};

export default ShimmerImage;
