import React, { createContext, useContext, useRef } from "react";

interface NavigationContextType {
  skipAnimationRef: React.MutableRefObject<boolean>;
  setSkipAnimation: (skip: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const skipAnimationRef = useRef(false);

  const setSkipAnimation = (skip: boolean) => {
    skipAnimationRef.current = skip;
  };

  return (
    <NavigationContext.Provider value={{ skipAnimationRef, setSkipAnimation }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationAnimation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigationAnimation must be used within NavigationProvider");
  }
  return context;
};
