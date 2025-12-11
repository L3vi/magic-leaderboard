import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useSwipeToClose } from "../hooks/useSwipeToClose";
import NewGame from "../components/NewGame/NewGame";
import "./NewGamePage.css";

const NewGamePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/games';

  const handleClose = () => {
    navigate(from);
  };

  useEscapeKey(handleClose);
  const { pageRef, swipeHandlers } = useSwipeToClose(handleClose);

  const handleSubmit = async (gameData: any) => {
    try {
      const response = await fetch('http://localhost:3001/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(`Error creating game: ${error.error}`);
        return;
      }
      
      const result = await response.json();
      console.log("Game created successfully:", result);
      navigate(from);
    } catch (error) {
      console.error("Error submitting game:", error);
      alert("Failed to save game. Please try again.");
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
