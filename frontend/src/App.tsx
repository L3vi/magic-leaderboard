import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { AnimatePresence } from "framer-motion";
import "./styles/global.css";
import Header from "./components/Header/Header";
import Players from "./components/Players/Players";
import Games from "./components/Games/Games";
import PlayerDetailsPage from "./pages/PlayerDetailsPage";
import GameDetailsPage from "./pages/GameDetailsPage";
import NewGamePage from "./pages/NewGamePage";

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

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

  // Handler to open new game page
  const handleNewGame = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    navigate('/new-game');
  };

  return (
    <>
      <Header activeTab={activeTab} setActiveTab={handleTabChange} onNewGame={handleNewGame} />
      <div {...swipeHandlers} className="tab-content">
        {activeTab === 'players' && <Players />}
        {activeTab === 'games' && <Games />}
      </div>
    </>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/players" replace />} />
        <Route path="/players" element={<MainLayout />} />
        <Route path="/games" element={<MainLayout />} />
        <Route path="/players/:playerName" element={<PlayerDetailsPage />} />
        <Route path="/games/:gameId" element={<GameDetailsPage />} />
        <Route path="/new-game" element={<NewGamePage />} />
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
