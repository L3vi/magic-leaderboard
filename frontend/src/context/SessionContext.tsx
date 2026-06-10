import React, { createContext, useState, useContext, useEffect } from 'react';
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

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<string>('');
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const allSessions = sessions.map((s) => s.id);
  
  // Shared data state
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the list of available sessions from Firestore on mount (works on any host).
  useEffect(() => {
    let cancelled = false;
    const loadSessions = async () => {
      try {
        const list = await fetchSessions();
        if (cancelled || list.length === 0) return;
        setSessions(list);
        // Always default to the latest season (list is sorted newest-first).
        setActiveSession(list[0].id);
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

    // Auto-refresh every 30 seconds (30000ms) using smart refresh for non-blocking updates
    let refreshInterval: NodeJS.Timeout;
    
    const startAutoRefresh = async () => {
      refreshInterval = setInterval(async () => {
        try {
          // Use smart refresh to only update if data changed, non-blocking
          await Promise.all([
            refreshGamesWithDelta(games, activeSession),
            refreshSessionPlayersWithDelta(players, activeSession),
          ]).then(([gamesResult, playersResult]) => {
            if (gamesResult.hasChanges) {
              setGames(gamesResult.newGames);
            }
            if (playersResult.hasChanges) {
              setPlayers(playersResult.newPlayers);
            }
          });
        } catch (err) {
          console.error('Error in auto-refresh:', err);
        }
      }, 10000);
    };
    
    startAutoRefresh();

    return () => clearInterval(refreshInterval);
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
