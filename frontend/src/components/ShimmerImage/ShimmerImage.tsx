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
 * An image that shimmers until its first load completes, then shows the image.
 * The <img> loads directly (normal browser priority, paints as soon as bytes
 * arrive). `loaded` is NOT reset when `src` changes — the browser keeps the
 * current image painted until the new one loads, so swapping never blanks or
 * re-shimmers. Shows the fallback only when there's genuinely no image (empty
 * src) or the first load fails.
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

  // Cover cached images whose onLoad fires before React attaches (remount), and
  // clear any prior error for the new src — but keep `loaded` so the current
  // image stays painted through a swap.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
    setErrored(false);
  }, [src]);

  // Genuinely no image (resolved empty, nothing ever loaded) or a failed first
  // load → the caller's fallback.
  if ((!loading && !src && !loaded) || (errored && !loaded)) {
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
          onLoad={() => { setLoaded(true); setErrored(false); }}
          onError={() => setErrored(true)}
        />
      )}
      {!loaded && !errored && <div className="shimmer-image-overlay skeleton" aria-hidden="true" />}
    </>
  );
};

export default ShimmerImage;
