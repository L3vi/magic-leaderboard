import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchPlayers, fetchGames, refetchPlayers, refetchGames, Player, Game } from '../services/dataService';

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
      try {
        // Create an abort signal that times out after 1 second in production
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        const response = await fetch('http://localhost:3001/api/sessions', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        setAllSessions(data);
        
        // Default to first session (latest, since API sorts by createdAt descending)
        if (data.length > 0) {
          setActiveSession(data[0]);
        }
      } catch (err) {
        console.warn('Could not fetch sessions, using defaults:', err);
        // Fallback to default session
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
        const [playersData, gamesData] = await Promise.all([
          fetchPlayers(),
          fetchGames(activeSession),
        ]);
        setPlayers(playersData);
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
  }, [activeSession]);

  // Refresh all data (players + games) with fresh API calls
  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [playersData, gamesData] = await Promise.all([
        refetchPlayers(),
        refetchGames(activeSession),
      ]);
      setPlayers(playersData);
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
