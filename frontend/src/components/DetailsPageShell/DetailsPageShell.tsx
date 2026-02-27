import React, { ReactNode, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { useNavigationAnimation } from "../../context/NavigationContext";
import "./DetailsPageShell.css";

interface DetailsPageShellProps {
  title: string;
  children?: ReactNode;
  onClose: () => void;
  onEdit?: () => void;
  loading?: boolean;
  error?: string;
}

const DetailsPageShell: React.FC<DetailsPageShellProps> = ({
  title,
  children,
  onClose,
  onEdit,
  loading = false,
  error,
}) => {
  const { skipAnimationRef, setSkipAnimation } = useNavigationAnimation();
  const [isExiting, setIsExiting] = useState(false);

  // Play exit animation, then navigate back
  const handleClose = useCallback(() => {
    if (isExiting) return;
    setSkipAnimation(true);
    setIsExiting(true);
  }, [isExiting, setSkipAnimation]);

  const handleExitComplete = useCallback(() => {
    if (isExiting) onClose();
  }, [isExiting, onClose]);

  useEscapeKey(handleClose);

  // Entrance: skip if coming back, otherwise slide up
  const shouldSkipEntrance = skipAnimationRef.current;

  const animateState = isExiting
    ? { opacity: 0, y: 20 }
    : { opacity: 1, y: 0 };

  const animationProps = {
    initial: shouldSkipEntrance ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    animate: animateState,
    transition: isExiting
      ? { duration: 0.15, ease: "easeIn" as const }
      : shouldSkipEntrance
        ? { duration: 0 }
        : { duration: 0.15, ease: "easeOut" as const },
    onAnimationComplete: handleExitComplete,
  };

  // Reset skip animation flag after this component mounts
  React.useEffect(() => {
    return () => {
      setSkipAnimation(false);
    };
  }, [setSkipAnimation]);

  if (loading) {
    return (
      <motion.div className="details-page-shell" {...animationProps}>
        <div className="details-page-header">
          <button
            className="btn btn-tertiary"
            onClick={handleClose}
            aria-label="Back"
          >
            ← Back
          </button>
          <h1>{title}</h1>
          <div style={{ width: 60 }} />
        </div>
        <div className="details-page-content">
          <div className="loading">Loading...</div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div className="details-page-shell" {...animationProps}>
        <div className="details-page-header">
          <button
            className="btn btn-tertiary"
            onClick={handleClose}
            aria-label="Back"
          >
            ← Back
          </button>
          <h1>{title}</h1>
          <div style={{ width: 60 }} />
        </div>
        <div className="details-page-content">
          <div className="error">{error}</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="details-page-shell" {...animationProps}>
      <div className="details-page-header">
        <button
          className="btn btn-tertiary"
          onClick={handleClose}
          aria-label="Back to previous page"
        >
          ← Back
        </button>
        <h1>{title}</h1>
        {onEdit ? (
          <button
            className="btn btn-tertiary"
            onClick={onEdit}
            aria-label="Edit"
          >
            ✎ Edit
          </button>
        ) : (
          <div style={{ width: 60 }} />
        )}
      </div>
      <div className="details-page-content">{children}</div>
    </motion.div>
  );
};

export default DetailsPageShell;
