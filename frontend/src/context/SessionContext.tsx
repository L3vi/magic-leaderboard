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
} from '../services/dataService';

interface SessionContextType {
  activeSession: string;
  setActiveSession: (session: string) => void;
  allSessions: string[];
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
  const [activeSession, setActiveSession] = useState<string>('2025-December');
  const [allSessions, setAllSessions] = useState<string[]>(['2025-December']);
  
  // Shared data state
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      // Only try API on localhost
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setAllSessions(['2025-December']);
        setActiveSession('2025-December');
        return;
      }

      try {
        const apiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3001' : (process.env.VITE_API_BASE || window.location.origin);
        const response = await fetch(`${apiBase}/api/sessions`);
        const data = await response.json();
        setAllSessions(data);
        
        // Default to first session (latest, since API sorts by createdAt descending)
        if (data.length > 0) {
          setActiveSession(data[0]);
        }
      } catch (err) {
        console.warn('Could not fetch sessions, using defaults:', err);
        setAllSessions(['2025-December']);
        setActiveSession('2025-December');
      }
    };

    fetchSessions();
  }, []);

  // Load data when session changes
  useEffect(() => {
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
      }, 30000);
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
