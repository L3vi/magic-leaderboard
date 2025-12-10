import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useSwipeToClose } from "../hooks/useSwipeToClose";
import NewGame from "../components/NewGame/NewGame";
import "./NewGamePage.css";

const NewGamePage: React.FC = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate("/games");
  };

  useEscapeKey(handleClose);
  const { pageRef, swipeHandlers } = useSwipeToClose(handleClose);

  const handleSubmit = (gameData: any) => {
    // TODO: Add logic to save new game
    console.log("New game data:", gameData);
    navigate("/games");
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
