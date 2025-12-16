import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import DetailsPageShell from "../components/DetailsPageShell/DetailsPageShell";
import PlayerDetails from "../components/Players/PlayerDetails";
import type { PlayerRowDisplay as Player } from "../types";
import { useSession } from "../context/SessionContext";

const PlayerDetailsPage: React.FC = () => {
  const { playerName } = useParams<{ playerName: string }>();
  const navigate = useNavigate();
  const { games: gamesRaw, players: playersRaw } = useSession();

  const handleClose = () => {
    navigate(-1);
  };

  const handleGameClick = (gameId: string) => {
    navigate(`/games/${gameId}`);
  };

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
      weightedAverage: gamesPlayed ? score / gamesPlayed : 0,
      estimatedMinutesPlayed: estimatedMinutes,
    };
  }, [playerData, gamesRaw]);

  if (!player) {
    return (
      <DetailsPageShell
        title="Player Details"
        onClose={handleClose}
        error={`Player "${decodedName}" not found`}
      />
    );
  }

  return (
    <DetailsPageShell
      title={player.name}
      onClose={handleClose}
    >
      <PlayerDetails 
        player={player} 
        games={gamesRaw} 
        players={playersRaw} 
        onGameClick={handleGameClick} 
        playerId={playerData?.id} 
      />
    </DetailsPageShell>
  );
};

export default PlayerDetailsPage;
