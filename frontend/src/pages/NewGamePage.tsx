import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useSwipeToClose } from "../hooks/useSwipeToClose";
import { useAddGame } from "../hooks/useApi";
import { useSession } from "../context/SessionContext";
import NewGame from "../components/NewGame/NewGame";
import "./NewGamePage.css";

const NewGamePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/games';
  const { activeSession } = useSession();
  const { addGame, loading, error } = useAddGame(activeSession);

  const handleClose = () => {
    navigate(from);
  };

  useEscapeKey(handleClose);
  const { pageRef, swipeHandlers } = useSwipeToClose(handleClose);

  const handleSubmit = async (gameData: any) => {
    try {
      await addGame(gameData);
      navigate(from);
    } catch (err) {
      console.error("Error submitting game:", err);
      alert(error || "Failed to save game. Please try again.");
    }
  };

  return (
    <motion.div 
      className="new-game-page" 
      {...swipeHandlers} 
      ref={pageRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <div className="new-game-page-header">
        <button 
          className="back-button" 
          onClick={handleClose}
          aria-label="Back to games"
        >
          ← Back
        </button>
        <h1>New Game</h1>
      </div>
      <div className="new-game-page-content">
        <NewGame onSubmit={handleSubmit} onCancel={handleClose} />
      </div>
    </motion.div>
  );
};

export default NewGamePage;
