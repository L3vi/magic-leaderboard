import React, { ReactNode } from "react";
import { motion } from "framer-motion";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { useNavigationAnimation } from "../../context/NavigationContext";
import "./PageShell.css";

interface PageShellProps {
  /** Centered header title. */
  title: string;
  /** Called on the back button and on Escape. */
  onClose: () => void;
  /** Back button label (top-left). Defaults to "← Back". */
  backLabel?: string;
  /** Optional top-right header action (e.g. Edit / Delete). */
  headerAction?: ReactNode;
  /**
   * Content padding. "flush" = no padding (detail pages render their own),
   * "padded" = centered max-width form padding. Defaults to "padded".
   */
  contentVariant?: "flush" | "padded";
  /**
   * Optional faded art shown behind the page content for context/flavor
   * (e.g. a commander's card art on its stats page). Rendered under a dark,
   * site-themed overlay so it reads as a background tint, not a photo.
   */
  backdropImage?: string;
  /**
   * Optional accent color blended into the backdrop overlay (e.g. the mana
   * color on a color-stats page). Falls back to the site's purple theme.
   */
  backdropTint?: string;
  loading?: boolean;
  error?: string;
  /** Optional: not rendered while `loading` or `error` is shown. */
  children?: ReactNode;
}

// Body scroll lock is refcounted across PageShell instances. During an
// overlay→overlay navigation, framer-motion's AnimatePresence keeps the
// outgoing page mounted through its exit animation, so two PageShells exist
// at once. A plain add/remove would let the outgoing page's unmount strip the
// class while the incoming page still needs it. Counting open shells and only
// removing the class on the last close keeps the lock correct.
let scrollLockCount = 0;
const acquireScrollLock = () => {
  if (scrollLockCount === 0) {
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
  }
  scrollLockCount += 1;
};
const releaseScrollLock = () => {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");
  }
};

/**
 * Shared scaffold for every full-screen overlay page (create / edit / detail):
 * fixed overlay + entrance animation, body scroll lock, Escape-to-close, and a
 * sticky header with a back button (left), centered title, and an optional
 * action slot (right). Floating Cancel/Save bars are rendered by the page as
 * the last child of `children` (their sticky-bottom behavior is independent).
 */
const PageShell: React.FC<PageShellProps> = ({
  title,
  onClose,
  backLabel = "← Back",
  headerAction,
  contentVariant = "padded",
  backdropImage,
  backdropTint,
  loading = false,
  error,
  children,
}) => {
  const { skipAnimationRef, setSkipAnimation } = useNavigationAnimation();

  // Lock body scroll while the overlay is open (refcounted — see above).
  React.useEffect(() => {
    acquireScrollLock();
    return releaseScrollLock;
  }, []);

  useEscapeKey(onClose);

  // Skip the entrance animation when navigating back (set by NavigationContext).
  const animationProps = skipAnimationRef.current
    ? {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
        transition: { duration: 0.15, ease: "easeOut" as const },
      };

  React.useEffect(() => {
    return () => {
      setSkipAnimation(false);
    };
  }, [setSkipAnimation]);

  const contentClass = `page-shell__content page-shell__content--${contentVariant}`;
  const shellClass = backdropImage ? "page-shell page-shell--has-backdrop" : "page-shell";

  return (
    <motion.div
      className={shellClass}
      style={backdropTint ? ({ "--backdrop-tint": backdropTint } as React.CSSProperties) : undefined}
      {...animationProps}
    >
      {backdropImage && (
        <div className="page-shell__backdrop" aria-hidden="true">
          <div
            className="page-shell__backdrop-image"
            style={{ backgroundImage: `url(${backdropImage})` }}
          />
          <div className="page-shell__backdrop-overlay" />
        </div>
      )}
      <div className="page-shell__header">
        <button className="btn btn-tertiary" onClick={onClose} aria-label={backLabel}>
          {backLabel}
        </button>
        <h1>{title}</h1>
        {headerAction ? (
          <div className="page-shell__action">{headerAction}</div>
        ) : (
          // Spacer keeps the title centered when there's no right-side action.
          <div className="page-shell__action-spacer" aria-hidden="true" />
        )}
      </div>

      <div className={contentClass}>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          children
        )}
      </div>
    </motion.div>
  );
};

export default PageShell;
