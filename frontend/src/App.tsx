import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { AnimatePresence, motion } from "framer-motion";
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
  const previousTab = React.useRef<'players' | 'games'>(activeTab);
  const [shouldAnimate, setShouldAnimate] = React.useState(false);

  // Only animate when actually switching between tabs
  React.useEffect(() => {
    if (previousTab.current !== activeTab) {
      setShouldAnimate(true);
      previousTab.current = activeTab;
    } else {
      setShouldAnimate(false);
    }
  }, [activeTab]);

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
        <AnimatePresence mode="wait">
          {activeTab === 'players' ? (
            <motion.div
              key="players"
              initial={shouldAnimate ? { opacity: 0, x: -20 } : false}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Players />
            </motion.div>
          ) : (
            <motion.div
              key="games"
              initial={shouldAnimate ? { opacity: 0, x: 20 } : false}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Games />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
