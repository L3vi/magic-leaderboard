import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAddGame } from "../hooks/useApi";
import PageShell from "../components/PageShell/PageShell";
import NewGame from "../components/NewGame/NewGame";

const NewGamePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/games';
  const { addGame, loading, error } = useAddGame();

  const handleClose = () => {
    navigate(from);
  };

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
    <PageShell title="New Game" onClose={handleClose}>
      <NewGame onSubmit={handleSubmit} onCancel={handleClose} />
    </PageShell>
  );
};

export default NewGamePage;
