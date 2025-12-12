import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useSwipeToClose } from "../hooks/useSwipeToClose";
import { useUpdateGame, usePlayers } from "../hooks/useApi";
import { useSession } from "../context/SessionContext";
import { deleteGame } from "../services/dataService";
import NewGame from "../components/NewGame/NewGame";
import "./NewGamePage.css"; // Reuse NewGamePage styles

const EditGamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { games, activeSession, refreshGamesOnly } = useSession();
  const { players: playersData } = usePlayers();
  const { updateGame, loading, error } = useUpdateGame();
  const [isDeleting, setIsDeleting] = React.useState(false);

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
            className="btn btn-tertiary" 
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
      // updateGame already calls refreshGamesOnly internally, so data is updated
      // Navigate back with fresh data loaded
      navigate("/games");
    } catch (err) {
      console.error("Error updating game:", err);
      alert(error || "Failed to update game. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!gameId) return;
    
    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this game? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteGame(gameId, activeSession);
      // Refresh the games list and navigate back
      await refreshGamesOnly();
      navigate("/games");
    } catch (error) {
      console.error("Failed to delete game:", error);
      alert("Failed to delete game. Please try again.");
      setIsDeleting(false);
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
          className="btn btn-tertiary" 
          onClick={handleClose}
          aria-label="Cancel"
        >
          ← Cancel
        </button>
        <h1>Edit Game</h1>
        <button 
          className="btn btn-danger" 
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label="Delete game"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
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
