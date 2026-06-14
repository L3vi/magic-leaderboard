import React, { useEffect, useState } from "react";
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
 * An image that shimmers while it loads and shows a fallback when there is
 * genuinely no image (resolved empty or errored).
 *
 * It only ever displays a URL once that URL has finished loading (via an
 * off-screen preloader), so when `src` changes it keeps showing the current
 * image until the next one is ready, then swaps instantly — no flash to a
 * different/blank image. The preloader's onload also fires reliably for cached
 * images, so the shimmer never gets stuck after a remount.
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
  const [shownSrc, setShownSrc] = useState("");
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!src) {
      setShownSrc("");
      setErrored(false);
      return;
    }
    let cancelled = false;
    const pre = new Image();
    pre.onload = () => {
      if (cancelled) return;
      setShownSrc(src);
      setErrored(false);
    };
    pre.onerror = () => {
      if (cancelled) return;
      setErrored((prev) => prev || !shownSrc);
    };
    pre.src = src;
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Genuinely no image (resolved empty with nothing shown, or broken) → fallback.
  if ((!loading && !src && !shownSrc) || (errored && !shownSrc)) {
    return <>{fallback}</>;
  }

  return (
    <>
      {shownSrc && (
        <img
          src={shownSrc}
          alt={alt}
          title={title}
          className={`shimmer-image is-loaded ${className}`}
          style={style}
          onClick={onClick}
        />
      )}
      {!shownSrc && <div className="shimmer-image-overlay skeleton" aria-hidden="true" />}
    </>
  );
};

export default ShimmerImage;
