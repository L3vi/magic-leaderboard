import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useSwipeToClose } from "../hooks/useSwipeToClose";
import { useSession } from "../context/SessionContext";
import GameDetails from "../components/Games/GameDetails";
import playersRaw from "../data/players.json";
import gamesRaw from "../data/games.json";
import "./GameDetailsPage.css";

const GameDetailsPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { activeSession } = useSession();
  const [game, setGame] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    navigate("/games");
  };

  useEscapeKey(handleClose);
  const { pageRef, swipeHandlers } = useSwipeToClose(handleClose);

  // Fetch game from API
  useEffect(() => {
    const fetchGame = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3001/api/games?session=${activeSession}`);
        if (!response.ok) throw new Error("Failed to fetch games");
        const games = await response.json();
        const foundGame = games.find((g: any) => g.id === gameId);
        if (foundGame) {
          setGame(foundGame);
        } else {
          // Try local fallback
          const localGame = gamesRaw.find(g => g.id === gameId);
          setGame(localGame || null);
        }
      } catch (err) {
        console.error("Error fetching game:", err);
        // Fallback to local data
        const localGame = gamesRaw.find(g => g.id === gameId);
        setGame(localGame || null);
      } finally {
        setLoading(false);
      }
    };
    
    if (gameId && activeSession) {
      fetchGame();
    }
  }, [gameId, activeSession]);
  
  // Helper to get player name from ID
  const getPlayerName = (id: string) => playersRaw.find(p => p.id === id)?.name || id;

  if (loading) {
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
        </div>
        <p>Loading game...</p>
      </motion.div>
    );
  }

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
        <p>The game with ID "{gameId}" could not be found.</p>
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
