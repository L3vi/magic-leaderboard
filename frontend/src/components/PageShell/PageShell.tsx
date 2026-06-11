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
  loading?: boolean;
  error?: string;
  children: ReactNode;
}

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
  loading = false,
  error,
  children,
}) => {
  const { skipAnimationRef, setSkipAnimation } = useNavigationAnimation();

  // Lock body scroll while the overlay is open.
  React.useEffect(() => {
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    return () => {
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    };
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
        transition: { duration: 0.15, ease: "easeOut" },
      };

  React.useEffect(() => {
    return () => {
      setSkipAnimation(false);
    };
  }, [setSkipAnimation]);

  const contentClass = `page-shell__content page-shell__content--${contentVariant}`;

  return (
    <motion.div className="page-shell" {...animationProps}>
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
