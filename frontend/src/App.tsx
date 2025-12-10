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

  // Determine active tab from URL path, ignoring detail pages
  const getTabFromPath = (path: string): 'players' | 'games' => {
    if (path.startsWith('/games')) return 'games';
    if (path.startsWith('/players')) return 'players';
    // If on a detail page, maintain current tab
    return 'players'; // default
  };
  
  const [activeTab, setActiveTab] = React.useState<'players' | 'games'>(() => 
    getTabFromPath(location.pathname)
  );

  // Only update tab when navigating to /players or /games directly
  React.useEffect(() => {
    if (location.pathname === '/players' || location.pathname === '/games') {
      setActiveTab(getTabFromPath(location.pathname));
    }
  }, [location.pathname]);

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
    navigate('/new-game', { state: { from: location.pathname } });
  };

  return (
    <>
      <Header activeTab={activeTab} setActiveTab={handleTabChange} onNewGame={handleNewGame} />
      <div {...swipeHandlers} className="tab-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === 'players' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeTab === 'players' ? -20 : 20 }}
            transition={{ duration: 0.09, ease: [0.4, 0, 0.2, 1] }}
          >
            {activeTab === 'players' ? <Players /> : <Games />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  
  // Determine if we're on a detail/modal page
  const isDetailPage = location.pathname.startsWith('/players/') || 
                       location.pathname.startsWith('/games/') ||
                       location.pathname === '/new-game';
  
  return (
    <>
      {/* MainLayout is always rendered */}
      <MainLayout />
      
      {/* Detail pages overlay on top */}
      <AnimatePresence mode="wait" initial={false}>
        {isDetailPage && (
          <Routes location={location} key={location.pathname}>
            <Route path="/players/:playerName" element={<PlayerDetailsPage />} />
            <Route path="/games/:gameId" element={<GameDetailsPage />} />
            <Route path="/new-game" element={<NewGamePage />} />
          </Routes>
        )}
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/players" replace />} />
        <Route path="/*" element={<AnimatedRoutes />} />
      </Routes>
    </Router>
  );
}

export default App;
