import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useNavigationAnimation } from "../context/NavigationContext";
import PlayerDetails from "../components/Players/PlayerDetails";
import { Player } from "../components/Players/PlayerRow";
import { useSession } from "../context/SessionContext";
import "./PlayerDetailsPage.css";

const PlayerDetailsPage: React.FC = () => {
  const { playerName } = useParams<{ playerName: string }>();
  const navigate = useNavigate();
  const { games: gamesRaw, players: playersRaw } = useSession();
  const { skipAnimationRef, setSkipAnimation } = useNavigationAnimation();

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
    setSkipAnimation(true);
    navigate(-1);
  };

  const handleGameClick = (gameId: string) => {
    navigate(`/games/${gameId}`);
  };

  useEscapeKey(handleClose);

  // Find player by name (URL encoded)
  const decodedName = playerName ? decodeURIComponent(playerName) : "";
  const playerData = playersRaw.find(p => p.name === decodedName);

  // Calculate player stats from session games only
  const player: Player | null = React.useMemo(() => {
    if (!playerData) return null;

    let score = 0;
    let gamesPlayed = 0;
    const placements: number[] = [];
    const playerGames: any[] = [];

    gamesRaw.forEach((game: any) => {
      game.players.forEach((p: any) => {
        if (p.playerId === playerData.id) {
          gamesPlayed += 1;
          placements.push(p.placement);
          playerGames.push(game);
          // Placement scoring: 1st = 4 pts, 2nd = 3 pts, 3rd = 2 pts, 4th+ = 1 pt
          const points = p.placement === 1 ? 4 : p.placement === 2 ? 3 : p.placement === 3 ? 2 : 1;
          score += points;
        }
      });
    });

    // Calculate most common placement
    const placementCounts = placements.reduce((acc, p) => {
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    const mostCommonPlacement = Object.entries(placementCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

    // Calculate estimated time played
    let estimatedMinutes = 0;
    if (playerGames.length > 1) {
      const sortedGames = [...playerGames].sort((a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime());
      let totalGapMinutes = 0;
      for (let i = 1; i < sortedGames.length; i++) {
        const gap = new Date(sortedGames[i].dateCreated).getTime() - new Date(sortedGames[i - 1].dateCreated).getTime();
        totalGapMinutes += gap / 1000 / 60;
      }
      const avgGameDurationMinutes = totalGapMinutes / (sortedGames.length - 1);
      estimatedMinutes = Math.round(avgGameDurationMinutes * gamesPlayed);
    }

    return {
      name: playerData.name,
      score,
      average: gamesPlayed ? score / gamesPlayed : 0,
      gamesPlayed,
      mostCommonPlacement: parseInt(mostCommonPlacement as any),
      estimatedMinutesPlayed: estimatedMinutes,
    };
  }, [playerData, gamesRaw]);

  // Determine animation props based on whether we're navigating back
  const animationProps = skipAnimationRef.current ? {
    initial: { opacity: 1, y: 0 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0 },
  } : {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.15, ease: "easeOut" },
  };

  // Reset skip animation flag after this component mounts
  React.useEffect(() => {
    return () => {
      setSkipAnimation(false);
    };
  }, [setSkipAnimation]);

  if (!player) {
    return (
      <motion.div 
        className="player-details-page" 
        {...animationProps}
      >
        <div className="player-details-page-header">
          <button 
            className="btn btn-tertiary" 
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
      {...animationProps}
    >
      <div className="player-details-page-header">
        <button 
          className="btn btn-tertiary" 
          onClick={handleClose}
          aria-label="Back to players"
        >
          ← Back
        </button>
        <h1>{player.name}</h1>
      </div>
      <div className="player-details-page-content">
        <PlayerDetails player={player} games={gamesRaw} players={playersRaw} onGameClick={handleGameClick} playerId={playerData?.id} />
      </div>
    </motion.div>
  );
};

export default PlayerDetailsPage;
