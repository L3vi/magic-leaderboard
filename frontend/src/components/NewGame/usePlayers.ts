import gameHistory from '../../data/game-history.json';

export function usePlayers(): string[] {
  // Extract unique player names from all games in game history
  const events = gameHistory.events || [];
  const names = new Set<string>();
  events.forEach(event => {
    event.games.forEach(game => {
      game.players.forEach(player => {
        names.add(player.name);
      });
    });
  });
  return Array.from(names).sort();
}
