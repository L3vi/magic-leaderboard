import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { AnimatePresence } from "framer-motion";
import "./styles/global.css";
import Header from "./components/Header/Header";
import Players from "./components/Players/Players";
import Games from "./components/Games/Games";
import NewGame from "./components/NewGame/NewGame";
import PlayerDetailsPage from "./pages/PlayerDetailsPage";
import GameDetailsPage from "./pages/GameDetailsPage";

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNewGameOpen, setIsNewGameOpen] = useState(false);

  // Determine active tab from URL path
  const activeTab: 'players' | 'games' = location.pathname.startsWith('/games') ? 'games' : 'players';

  const handleTabChange = (tab: 'players' | 'games') => {
    navigate(tab === 'players' ? '/players' : '/games');
  };

  // Swipe handlers for tab navigation
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (activeTab === 'players') handleTabChange('games');
    },
    onSwipedRight: () => {
      if (activeTab === 'games') handleTabChange('players');
    },
    trackMouse: true, // allows swipe with mouse for desktop
  });

  // Handler to open new game modal
  const handleNewGame = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsNewGameOpen(true);
  };
  const handleCloseNewGame = () => setIsNewGameOpen(false);
  const handleSubmitNewGame = (gameData: any) => {
    // TODO: Add logic to save new game
    setIsNewGameOpen(false);
  };

  return (
    <>
      <Header activeTab={activeTab} setActiveTab={handleTabChange} onNewGame={handleNewGame} />
      <div
        {...swipeHandlers}
        className={`tab-content${activeTab === 'players' ? ' slide-in-left' : ' slide-in-right'}`}
      >
        {activeTab === 'players' && <Players />}
        {activeTab === 'games' && <Games />}
      </div>
      {isNewGameOpen && (
        <div className="modal-overlay" onClick={handleCloseNewGame}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <NewGame onSubmit={handleSubmitNewGame} onCancel={handleCloseNewGame} />
          </div>
        </div>
      )}
    </>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/players" replace />} />
        <Route path="/players" element={<MainLayout />} />
        <Route path="/games" element={<MainLayout />} />
        <Route path="/players/:playerName" element={<PlayerDetailsPage />} />
        <Route path="/games/:gameId" element={<GameDetailsPage />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
