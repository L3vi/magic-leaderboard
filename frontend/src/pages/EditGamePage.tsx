import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useSwipeToClose } from "../hooks/useSwipeToClose";
import { useGames, useUpdateGame, usePlayers } from "../hooks/useApi";
import { useSession } from "../context/SessionContext";
import NewGame from "../components/NewGame/NewGame";
import "./NewGamePage.css"; // Reuse NewGamePage styles

const EditGamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { activeSession } = useSession();
  const { games, refresh: refreshGames } = useGames(activeSession);
  const { players: playersData } = usePlayers();
  const { updateGame, loading, error } = useUpdateGame(activeSession);

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

  useEscapeKey(handleClose);
  const { pageRef, swipeHandlers } = useSwipeToClose(handleClose);

  // Find the game to edit
  const game = games.find((g: any) => g.id === gameId);

  if (!game) {
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
          <h1>Game Not Found</h1>
        </div>
        <p>The game could not be found.</p>
      </motion.div>
    );
  }

  // Transform game data to NewGame format
  const getPlayerName = (id: string) => playersData.find(p => p.id === id)?.name || id;
  const transformedGame = {
    dateCreated: game.dateCreated,
    notes: game.notes,
    players: game.players.map((p: any) => ({
      playerId: p.playerId,
      commander: p.commander,
      placement: p.placement,
    })),
  };

  const handleSubmit = async (gameData: any) => {
    try {
      await updateGame(gameId!, gameData);
      // After update completes, refresh to ensure fresh data
      await refreshGames();
      // Navigate back with fresh data loaded
      navigate("/games");
    } catch (err) {
      console.error("Error updating game:", err);
      alert(error || "Failed to update game. Please try again.");
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
        <h1>Edit Game</h1>
      </div>
      <div className="new-game-page-content">
        <NewGame 
          onSubmit={handleSubmit} 
          onCancel={handleClose}
          initialData={transformedGame}
        />
      </div>
    </motion.div>
  );
};

export default EditGamePage;
