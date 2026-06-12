import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { 
  fetchPlayers, 
  fetchGames, 
  refetchPlayers, 
  refetchGames, 
  Player, 
  Game, 
  fetchPlayersForSession,
  refreshGamesWithDelta,
  refreshPlayersWithDelta,
  refreshSessionPlayersWithDelta,
  fetchSessions,
  SessionListItem,
} from '../services/dataService';

interface SessionContextType {
  activeSession: string;
  setActiveSession: (session: string) => void;
  allSessions: string[];
  // Rich metadata for each session (newest first), for the season selector
  sessions: SessionListItem[];
  // Re-fetch the session list (e.g. after creating a new session)
  reloadSessions: () => Promise<void>;
  // Shared data - single source of truth for all components
  players: Player[];
  games: Game[];
  loading: boolean;
  error: string | null;
  // Explicit refresh methods - call these when you need fresh data
  // (after creating/editing game, or when user requests refresh)
  refreshData: () => Promise<void>;
  refreshGamesOnly: () => Promise<void>;
  // Smart async refresh methods that only update if data changes
  // Non-blocking - doesn't set loading state, updates data in background
  smartRefreshGames: () => Promise<boolean>; // Returns true if data changed
  smartRefreshPlayers: () => Promise<boolean>; // Returns true if data changed
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Remember the season the user explicitly selected so a refresh doesn't snap
// back to the latest one. Only explicit picks are stored (see setActiveSession),
// so a visitor who never touches the selector still lands on the newest season.
const ACTIVE_SESSION_KEY = 'magicLeaderboard_activeSession';

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSession, setActiveSessionState] = useState<string>('');
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const allSessions = sessions.map((s) => s.id);

  // Public setter: persist the user's choice so it survives a reload.
  const setActiveSession = (session: string) => {
    setActiveSessionState(session);
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, session);
    } catch {
      // localStorage unavailable (private mode / quota) — just skip persistence.
    }
  };

  // Re-fetch the session list (e.g. after creating a new session).
  const reloadSessions = async () => {
    const list = await fetchSessions();
    if (list.length) setSessions(list);
  };
  
  // Shared data state
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The polling interval below only re-binds when the session changes, so it
  // would otherwise close over the games/players from that first render. Keep
  // refs to the latest values so each tick diffs against current state, not a
  // stale (usually empty) snapshot — which would force a full re-render every
  // tick and defeat the delta-refresh optimization.
  const gamesRef = useRef(games);
  gamesRef.current = games;
  const playersRef = useRef(players);
  playersRef.current = players;

  // Fetch the list of available sessions from Firestore on mount (works on any host).
  useEffect(() => {
    let cancelled = false;
    const loadSessions = async () => {
      try {
        const list = await fetchSessions();
        if (cancelled || list.length === 0) return;
        setSessions(list);
        // Restore the user's last explicitly-chosen season if it still exists;
        // otherwise default to the latest non-archived one (list is newest-first).
        // Use the raw setter so auto-defaulting doesn't get persisted — that way a
        // visitor who never picks a season keeps following the newest one.
        let stored: string | null = null;
        try {
          stored = localStorage.getItem(ACTIVE_SESSION_KEY);
        } catch {
          stored = null;
        }
        const restored = stored && list.some((s) => s.id === stored) ? stored : null;
        const fallback = (list.find((s) => !s.archived) || list[0]).id;
        setActiveSessionState(restored ?? fallback);
      } catch (err) {
        console.warn('Could not fetch sessions:', err);
      }
    };

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load data when session changes
  useEffect(() => {
    if (!activeSession) return;
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [allPlayersData, gamesData] = await Promise.all([
          fetchPlayers(),
          fetchGames(activeSession),
        ]);
        
        // Filter players for the active session
        const sessionPlayersData = await fetchPlayersForSession(allPlayersData, activeSession);
        
        setPlayers(sessionPlayersData);
        setGames(gamesData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setError(message);
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Background refresh: diff against the latest data (via refs), not the stale
    // closure capture, and only apply when something actually changed.
    const runRefresh = async () => {
      try {
        const [gamesResult, playersResult] = await Promise.all([
          refreshGamesWithDelta(gamesRef.current, activeSession),
          refreshSessionPlayersWithDelta(playersRef.current, activeSession),
        ]);
        if (gamesResult.hasChanges) setGames(gamesResult.newGames);
        if (playersResult.hasChanges) setPlayers(playersResult.newPlayers);
      } catch (err) {
        console.error('Error in auto-refresh:', err);
      }
    };

    // Poll every 30s, but skip ticks while the tab is hidden — no point burning
    // Firestore reads (and battery) on a backgrounded tab, which is the common
    // case on mobile/PWA. When the tab becomes visible again, refresh once
    // immediately so the user lands on current data instead of waiting a cycle.
    const refreshInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      runRefresh();
    }, 30000);

    const handleVisibility = () => {
      if (!document.hidden) runRefresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeSession]);

  // Refresh all data (players + games) with fresh API calls
  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [allPlayersData, gamesData] = await Promise.all([
        refetchPlayers(),
        refetchGames(activeSession),
      ]);
      
      // Filter players for the active session
      const sessionPlayersData = await fetchPlayersForSession(allPlayersData, activeSession);
      
      setPlayers(sessionPlayersData);
      setGames(gamesData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh data';
      setError(message);
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh games only (used after creating/editing a game)
  const refreshGamesOnly = async () => {
    try {
      setLoading(true);
      setError(null);
      const gamesData = await refetchGames(activeSession);
      setGames(gamesData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh games';
      setError(message);
      console.error('Error refreshing games:', err);
    } finally {
      setLoading(false);
    }
  };

  // Smart async refresh for games - only updates if data actually changed
  // Non-blocking - doesn't set loading state, updates in background
  const smartRefreshGames = async (): Promise<boolean> => {
    try {
      setError(null);
      const result = await refreshGamesWithDelta(games, activeSession);
      
      if (result.hasChanges) {
        console.log(`Games updated: ${result.delta.added.length} added, ${result.delta.updated.length} updated, ${result.delta.removed.length} removed`);
        setGames(result.newGames);
      } else {
        console.log('Games are up to date, no changes detected');
      }
      
      return result.hasChanges;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh games';
      setError(message);
      console.error('Error in smart refresh games:', err);
      return false;
    }
  };

  // Smart async refresh for players - only updates if data actually changed
  // Non-blocking - doesn't set loading state, updates in background
  const smartRefreshPlayers = async (): Promise<boolean> => {
    try {
      setError(null);
      const result = await refreshSessionPlayersWithDelta(players, activeSession);
      
      if (result.hasChanges) {
        console.log(`Players updated: ${result.delta.added.length} added, ${result.delta.updated.length} updated, ${result.delta.removed.length} removed`);
        setPlayers(result.newPlayers);
      } else {
        console.log('Players are up to date, no changes detected');
      }
      
      return result.hasChanges;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh players';
      setError(message);
      console.error('Error in smart refresh players:', err);
      return false;
    }
  };

  return (
    <SessionContext.Provider 
      value={{ 
        activeSession,
        setActiveSession,
        allSessions,
        sessions,
        reloadSessions,
        players,
        games,
        loading,
        error,
        refreshData,
        refreshGamesOnly,
        smartRefreshGames,
        smartRefreshPlayers,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};
