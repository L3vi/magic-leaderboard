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
import EditGamePage from "./pages/EditGamePage";
import { SessionProvider } from "./context/SessionContext";
import { NavigationProvider } from "./context/NavigationContext";
import { ArtPreferenceProvider } from "./context/ArtPreferenceContext";

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL path
  const getTabFromPath = (path: string): 'players' | 'games' => {
    if (path.startsWith('/games')) return 'games';
    if (path.startsWith('/players')) return 'players';
    return 'players';
  };
  
  const [activeTab, setActiveTab] = React.useState<'players' | 'games'>(() => {
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab === 'games' || savedTab === 'players') {
      return savedTab as 'players' | 'games';
    }
    return getTabFromPath(location.pathname);
  });

  // Sync activeTab with URL and localStorage
  React.useEffect(() => {
    if (location.pathname === '/players' || location.pathname === '/games') {
      const pathTab = getTabFromPath(location.pathname);
      setActiveTab(pathTab);
      localStorage.setItem('activeTab', pathTab);
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
    trackMouse: true,
    trackTouch: true,
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
      <Header activeTab={activeTab} setActiveTab={handleTabChange} onNewGame={handleNewGame} hideNewGameButton={location.pathname.startsWith('/edit-game/')} />
      <div {...swipeHandlers} className="tab-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === 'players' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeTab === 'players' ? -20 : 20 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="tab-content-inner"
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
                       location.pathname === '/new-game' ||
                       location.pathname.startsWith('/edit-game/');
  
  return (
    <>
      {/* MainLayout is always rendered */}
      <MainLayout />
      
      {/* Detail pages overlay on top */}
      <AnimatePresence mode="popLayout" initial={false}>
        {isDetailPage && (
          <motion.div key={location.pathname}>
            <Routes location={location}>
              <Route path="/players/:playerName" element={<PlayerDetailsPage />} />
              <Route path="/games/:gameId" element={<GameDetailsPage />} />
              <Route path="/new-game" element={<NewGamePage />} />
              <Route path="/edit-game/:gameId" element={<EditGamePage />} />
            </Routes>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function App() {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    setIsReady(true);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isReady ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      style={{ width: '100%', height: '100%' }}
    >
      <SessionProvider>
        <NavigationProvider>
          <ArtPreferenceProvider>
            <Router basename={process.env.NODE_ENV === 'production' ? "/magic-leaderboard" : "/"}>
              <Routes>
                <Route path="/" element={<AppRedirect />} />
                <Route path="/*" element={<AnimatedRoutes />} />
              </Routes>
            </Router>
          </ArtPreferenceProvider>
        </NavigationProvider>
      </SessionProvider>
    </motion.div>
  );
}

function AppRedirect() {
  const savedTab = localStorage.getItem('activeTab');
  const targetPath = savedTab === 'games' ? '/games' : '/players';
  return <Navigate to={targetPath} replace />;
}

export default App;
