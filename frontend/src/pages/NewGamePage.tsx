import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { motion } from "framer-motion";
import NewGame from "../components/NewGame/NewGame";
import "./NewGamePage.css";

const NewGamePage: React.FC = () => {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    navigate("/games");
  };

  const handleSubmit = (gameData: any) => {
    // TODO: Add logic to save new game
    console.log("New game data:", gameData);
    navigate("/games");
  };

  const swipeHandlers = useSwipeable({
    onSwipedDown: (eventData) => {
      // Only trigger if swiping from top area (not mid-scroll)
      if (pageRef.current && pageRef.current.scrollTop < 50) {
        handleClose();
      }
    },
    trackTouch: true,
    trackMouse: false,
  });

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
