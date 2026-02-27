import React, { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useNavigationAnimation } from "../context/NavigationContext";
import { useCubeEvent } from "../context/CubeEventContext";
import NewMatch from "../components/NewMatch/NewMatch";
import NewDraft from "../components/NewDraft/NewDraft";
import type { MatchPlayer, Draft } from "../types";
import "./NewPage.css";

type FormMode = "match" | "draft";

const NewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { skipAnimationRef, setSkipAnimation } = useNavigationAnimation();
  const { addMatch, addDraft } = useCubeEvent();
  const [mode, setMode] = useState<FormMode>("match");
  const [isExiting, setIsExiting] = useState(false);

  const fromPath = (location.state as any)?.from || "/drafts";

  const handleClose = useCallback(() => {
    if (isExiting) return;
    setSkipAnimation(true);
    setIsExiting(true);
  }, [isExiting, setSkipAnimation]);

  const handleExitComplete = useCallback(() => {
    if (isExiting) navigate(fromPath);
  }, [isExiting, navigate, fromPath]);

  useEscapeKey(handleClose);

  // Disable body scroll
  React.useEffect(() => {
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    return () => {
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    };
  }, []);

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

  React.useEffect(() => {
    return () => setSkipAnimation(false);
  }, [setSkipAnimation]);

  const handleMatchSubmit = async (matchData: { draftId: string; players: [MatchPlayer, MatchPlayer]; notes?: string }) => {
    await addMatch(matchData);
    navigate(-1);
  };

  const handleDraftSubmit = async (draftData: Omit<Draft, "id">) => {
    await addDraft(draftData);
    navigate("/drafts");
  };

  return (
    <motion.div className="new-page-shell" {...animationProps}>
      <div className="new-page-header">
        <button className="btn btn-tertiary" onClick={handleClose} aria-label="Back">
          ← Back
        </button>
        <h1>New</h1>
        <div style={{ width: 60 }} />
      </div>

      {/* Mode toggle */}
      <div className="new-page-toggle">
        <button
          type="button"
          className={`toggle-btn${mode === "match" ? " active" : ""}`}
          onClick={() => setMode("match")}
        >
          Match
        </button>
        <button
          type="button"
          className={`toggle-btn${mode === "draft" ? " active" : ""}`}
          onClick={() => setMode("draft")}
        >
          Draft
        </button>
      </div>

      {/* Form content */}
      <div className="new-page-content">
        {mode === "match" ? (
          <NewMatch onSubmit={handleMatchSubmit} onCancel={handleClose} />
        ) : (
          <NewDraft onSubmit={handleDraftSubmit} onCancel={handleClose} />
        )}
      </div>
    </motion.div>
  );
};

export default NewPage;
