import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import DetailsPageShell from "../components/DetailsPageShell/DetailsPageShell";
import GameDetails from "../components/Games/GameDetails";
import { useSession } from "../context/SessionContext";

const GameDetailsPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { games: gamesData, players: playersData } = useSession();

  const handleClose = () => {
    navigate(-1);
  };

  const handleEdit = () => {
    navigate(`/edit-game/${gameId}`);
  };

  const handlePlayerClick = (playerName: string) => {
    navigate(`/players/${encodeURIComponent(playerName)}`);
  };

  // Find the game from current session
  const game = gamesData.find((g: any) => g.id === gameId);

  // Helper to get player name from ID
  const getPlayerName = (id: string) => playersData.find(p => p.id === id)?.name || id;

  if (!game) {
    return (
      <DetailsPageShell
        title="Game Details"
        onClose={handleClose}
        error={`Game with ID "${gameId}" not found`}
      />
    );
  }

  // Map player data for GameDetails component
  const players = game.players.map((p: any) => ({
    playerId: p.playerId,
    name: getPlayerName(p.playerId),
    placement: p.placement,
    commander: p.commander
  }));

  const winner = game.players.find((p: any) => p.placement === 1);
  const winnerObj = winner ? {
    playerId: winner.playerId,
    name: getPlayerName(winner.playerId),
    placement: winner.placement,
    commander: winner.commander
  } : undefined;

  return (
    <DetailsPageShell
      title="Game Details"
      onClose={handleClose}
      onEdit={handleEdit}
    >
      <GameDetails
        id={game.id}
        dateCreated={game.dateCreated}
        notes={game.notes}
        players={players}
        winner={winnerObj}
        onClose={handleClose}
        onPlayerClick={handlePlayerClick}
      />
    </DetailsPageShell>
  );
};

export default GameDetailsPage;
