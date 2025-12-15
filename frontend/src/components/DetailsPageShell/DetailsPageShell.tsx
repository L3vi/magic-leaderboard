import React, { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { useNavigationAnimation } from "../../context/NavigationContext";
import "./DetailsPageShell.css";

interface DetailsPageShellProps {
  title: string;
  children: ReactNode;
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

  // Disable body scroll when this page is open
  React.useEffect(() => {
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    return () => {
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    };
  }, []);

  useEscapeKey(onClose);

  // Determine animation props based on whether we're navigating back
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
            onClick={onClose}
            aria-label="Back"
          >
            ← Back
          </button>
          <h1>{title}</h1>
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
            onClick={onClose}
            aria-label="Back"
          >
            ← Back
          </button>
          <h1>{title}</h1>
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
          onClick={onClose}
          aria-label="Back to previous page"
        >
          ← Back
        </button>
        <h1>{title}</h1>
        {onEdit && (
          <button
            className="btn btn-tertiary"
            onClick={onEdit}
            aria-label="Edit"
          >
            ✎ Edit
          </button>
        )}
      </div>
      <div className="details-page-content">{children}</div>
    </motion.div>
  );
};

export default DetailsPageShell;
