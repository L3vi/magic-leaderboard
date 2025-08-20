import players from '../../data/players.json';

export function usePlayers(): { id: string; name: string }[] {
  // Return all players from players.json
  return Array.isArray(players) ? players : [];
}
