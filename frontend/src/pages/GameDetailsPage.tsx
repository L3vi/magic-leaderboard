import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useSwipeToClose } from "../hooks/useSwipeToClose";
import GameDetails from "../components/Games/GameDetails";
import { useSession } from "../context/SessionContext";
import "./GameDetailsPage.css";

const GameDetailsPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { games: gamesData, players: playersData } = useSession();

  // Disable body scroll when this page is open
  React.useEffect(() => {
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    return () => {
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
    };
  }, []);

  const handleClose = () => {
    navigate("/games");
  };

  const handleEdit = async () => {
    navigate(`/edit-game/${gameId}`);
  };

  useEscapeKey(handleClose);
  const { pageRef, swipeHandlers } = useSwipeToClose(handleClose);

  // Find the game from current session
  const game = gamesData.find((g: any) => g.id === gameId);

  // Helper to get player name from ID
  const getPlayerName = (id: string) => playersData.find(p => p.id === id)?.name || id;

  if (!game) {
    return (
      <motion.div 
        className="game-details-page" 
        {...swipeHandlers} 
        ref={pageRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
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
        <p>The game with ID "{gameId}" could not be found in this session.</p>
      </motion.div>
    );
  }

  // Map player data for GameDetails component
  const players = game.players.map((p: any) => ({
    name: getPlayerName(p.playerId),
    placement: p.placement,
    commander: p.commander
  }));

  const winner = game.players.find((p: any) => p.placement === 1);
  const winnerObj = winner ? {
    name: getPlayerName(winner.playerId),
    placement: winner.placement,
    commander: winner.commander
  } : undefined;

  return (
    <motion.div 
      className="game-details-page" 
      {...swipeHandlers} 
      ref={pageRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <div className="game-details-page-header">
        <button 
          className="back-button" 
          onClick={handleClose}
          aria-label="Back to games"
        >
          ← Back
        </button>
        <h1>Game Details</h1>
        <button 
          className="edit-button" 
          onClick={handleEdit}
          aria-label="Edit game"
        >
          ✎ Edit
        </button>
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
    </motion.div>
  );
};

export default GameDetailsPage;
