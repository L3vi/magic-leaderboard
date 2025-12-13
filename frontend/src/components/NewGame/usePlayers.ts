import { useSession } from '../../context/SessionContext';

export function usePlayers(): { id: string; name: string }[] {
  const { players } = useSession();
  // Return only whitelisted players for the current session
  return players;
}
