import React, { createContext, useContext, useState, useCallback } from 'react';

interface ArtPreferenceContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const ArtPreferenceContext = createContext<ArtPreferenceContextType | undefined>(undefined);

export const ArtPreferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <ArtPreferenceContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </ArtPreferenceContext.Provider>
  );
};

export const useArtPreferenceRefresh = () => {
  const context = useContext(ArtPreferenceContext);
  if (!context) {
    throw new Error('useArtPreferenceRefresh must be used within ArtPreferenceProvider');
  }
  return context;
};
