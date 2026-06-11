import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUpdateGame, usePlayers } from "../hooks/useApi";
import { useSession } from "../context/SessionContext";
import { deleteGame } from "../services/dataService";
import PageShell from "../components/PageShell/PageShell";
import NewGame from "../components/NewGame/NewGame";

const EditGamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { games, activeSession, refreshGamesOnly } = useSession();
  const { players: playersData } = usePlayers();
  const { updateGame, loading, error } = useUpdateGame();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleClose = () => {
    navigate("/games");
  };

  // Find the game to edit
  const game = games.find((g: any) => g.id === gameId);

  if (!game) {
    return (
      <PageShell title="Game Not Found" onClose={handleClose}>
        <p>The game could not be found.</p>
      </PageShell>
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
    <PageShell
      title="Edit Game"
      onClose={handleClose}
      backLabel="← Cancel"
      headerAction={
        <button
          className="btn btn-danger"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label="Delete game"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      }
    >
      <NewGame
        onSubmit={handleSubmit}
        onCancel={handleClose}
        initialData={transformedGame}
      />
    </PageShell>
  );
};

export default EditGamePage;
