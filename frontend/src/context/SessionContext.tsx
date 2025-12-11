import React, { createContext, useState, useContext } from 'react';

interface SessionContextType {
  activeSession: string;
  setActiveSession: (session: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSession, setActiveSession] = useState('2025-December');

  return (
    <SessionContext.Provider value={{ activeSession, setActiveSession }}>
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
