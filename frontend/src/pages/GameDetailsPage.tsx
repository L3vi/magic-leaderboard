import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import GameDetails from "../components/Games/GameDetails";
import playersRaw from "../data/players.json";
import gamesRaw from "../data/games.json";
import "./GameDetailsPage.css";

const GameDetailsPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      navigate("/games");
    }, 300); // Match animation duration
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

  // Find game by ID
  const game = gamesRaw.find(g => g.id === gameId);
  
  // Helper to get player name from ID
  const getPlayerName = (id: string) => playersRaw.find(p => p.id === id)?.name || id;

  if (!game) {
    return (
      <div className={`game-details-page ${isClosing ? 'closing' : ''}`} {...swipeHandlers} ref={pageRef}>
        <div className="game-details-page-header">
          <button 
            className="back-button" 
            onClick={handleClose}
            aria-label="Back to games"
          >
            ← Back
          </button>
          <h1>Game Not Found</h1>
        </div>
        <p>The game with ID "{gameId}" could not be found.</p>
      </div>
    );
  }

  // Map player data for GameDetails component
  const players = game.players.map(p => ({
    name: getPlayerName(p.playerId),
    placement: p.placement,
    commander: p.commander
  }));

  const winner = game.players.find(p => p.placement === 1);
  const winnerObj = winner ? {
    name: getPlayerName(winner.playerId),
    placement: winner.placement,
    commander: winner.commander
  } : undefined;

  return (
    <div className={`game-details-page ${isClosing ? 'closing' : ''}`} {...swipeHandlers} ref={pageRef}>
      <div className="game-details-page-header">
        <button 
          className="back-button" 
          onClick={handleClose}
          aria-label="Back to games"
        >
          ← Back
        </button>
        <h1>Game Details</h1>
      </div>
      <div className="game-details-page-content">
        <GameDetails
          id={game.id}
          dateCreated={game.dateCreated}
          notes={game.notes}
          players={players}
          winner={winnerObj}
          onClose={handleClose}
        />
      </div>
    </div>
  );
};

export default GameDetailsPage;
