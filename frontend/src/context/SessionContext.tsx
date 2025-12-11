import React, { createContext, useState, useContext, useEffect } from 'react';

interface SessionContextType {
  activeSession: string;
  setActiveSession: (session: string) => void;
  allSessions: string[];
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

/**
 * Retry fetch with exponential backoff
 */
async function fetchWithRetry(
  url: string,
  maxAttempts: number = 5,
  initialDelayMs: number = 500
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(5000) 
      });
      
      if (response.ok) {
        return response;
      }
      
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      if (attempt < maxAttempts && lastError.name !== 'AbortError') {
        const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch after retries');
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<string>('');
  const [allSessions, setAllSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch available sessions and set to latest
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetchWithRetry('http://localhost:3001/api/sessions');
        const data = await response.json();
        setAllSessions(data);
        
        // Default to first session (latest, since API sorts by createdAt descending)
        if (data.length > 0) {
          setActiveSession(data[0]);
        } else {
          setActiveSession('2025-December'); // fallback
        }
      } catch (err) {
        console.warn('Could not fetch sessions after retries, using defaults:', err);
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
