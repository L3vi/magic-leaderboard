import React, { createContext, useState, useContext, useEffect } from 'react';

interface SessionContextType {
  activeSession: string;
  setActiveSession: (session: string) => void;
  allSessions: string[];
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<string>('');
  const [allSessions, setAllSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch available sessions and set to latest
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/sessions', {
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const data = await response.json();
          setAllSessions(data);
          
          // Default to first session (latest, since API sorts by createdAt descending)
          if (data.length > 0) {
            setActiveSession(data[0]);
          } else {
            setActiveSession('2025-December'); // fallback
          }
        } else {
          // Fallback if API fails
          setAllSessions(['2025-December', '2025-May']);
          setActiveSession('2025-December');
        }
      } catch (err) {
        console.warn('Could not fetch sessions, using defaults:', err);
        setAllSessions(['2025-December', '2025-May']);
        setActiveSession('2025-December');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  return (
    <SessionContext.Provider value={{ activeSession, setActiveSession, allSessions }}>
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
