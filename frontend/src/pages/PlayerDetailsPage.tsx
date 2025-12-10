import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useSwipeToClose } from "../hooks/useSwipeToClose";
import PlayerDetails from "../components/Players/PlayerDetails";
import { Player } from "../components/Players/PlayerRow";
import playersRaw from "../data/players.json";
import gamesRaw from "../data/games.json";
import "./PlayerDetailsPage.css";

const PlayerDetailsPage: React.FC = () => {
  const { playerName } = useParams<{ playerName: string }>();
  const navigate = useNavigate();

  const handleClose = () => {
    navigate("/players");
  };

  useEscapeKey(handleClose);
  const { pageRef, swipeHandlers } = useSwipeToClose(handleClose);

  // Find player by name (URL encoded)
  const decodedName = playerName ? decodeURIComponent(playerName) : "";
  const playerData = playersRaw.find(p => p.name === decodedName);

  // Calculate player stats
  const player: Player | null = React.useMemo(() => {
    if (!playerData) return null;

    let score = 0;
    let totalPlacement = 0;
    let gamesPlayed = 0;

    gamesRaw.forEach((game: any) => {
      game.players.forEach((p: any) => {
        if (p.playerId === playerData.id) {
          gamesPlayed += 1;
          totalPlacement += p.placement;
          score += Math.max(5 - p.placement, 1);
        }
      });
    });

    return {
      name: playerData.name,
      score,
      average: gamesPlayed ? totalPlacement / gamesPlayed : 0,
      gamesPlayed,
    };
  }, [playerData]);

  if (!player) {
    return (
      <motion.div 
        className="player-details-page" 
        {...swipeHandlers} 
        ref={pageRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <div className="player-details-page-header">
          <button 
            className="back-button" 
            onClick={handleClose}
            aria-label="Back to players"
          >
            ← Back
          </button>
          <h1>Player Not Found</h1>
        </div>
        <p>The player "{decodedName}" could not be found.</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="player-details-page" 
      {...swipeHandlers} 
      ref={pageRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <div className="player-details-page-header">
        <button 
          className="back-button" 
          onClick={handleClose}
          aria-label="Back to players"
        >
          ← Back
        </button>
      </div>
      <div className="player-details-page-content">
        <PlayerDetails player={player} games={gamesRaw} players={playersRaw} />
      </div>
    </motion.div>
  );
};

export default PlayerDetailsPage;
