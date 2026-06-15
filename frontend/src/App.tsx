import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { AnimatePresence, motion } from "framer-motion";
import "./styles/global.css";
import Header from "./components/Header/Header";
import type { TabType } from "./components/Header/NavBar";
import Players from "./components/Players/Players";
import Games from "./components/Games/Games";
import Stats from "./components/Stats/Stats";
import PlayerDetailsPage from "./pages/PlayerDetailsPage";
import PlayerCommandersPage from "./pages/PlayerCommandersPage";
import GameDetailsPage from "./pages/GameDetailsPage";
import ColorStatsPage from "./pages/ColorStatsPage";
import ComboStatsPage from "./pages/ComboStatsPage";
import AllCombinationsPage from "./pages/AllCombinationsPage";
import CommanderStatsPage from "./pages/CommanderStatsPage";
import NewGamePage from "./pages/NewGamePage";
import NewSessionPage from "./pages/NewSessionPage";
import ManageSeasonPage from "./pages/ManageSeasonPage";
import EditGamePage from "./pages/EditGamePage";
import { SessionProvider } from "./context/SessionContext";
import { NavigationProvider } from "./context/NavigationContext";
import { ArtPreferenceProvider } from "./context/ArtPreferenceContext";

// Left-to-right order of the primary tabs — drives swipe neighbors and the
// slide-transition direction.
const TAB_ORDER: TabType[] = ['players', 'games', 'stats'];

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL path. Detail overlays (e.g. /stats/colors/W)
  // resolve to the tab they sit on top of, so a deep link restores the right tab.
  const getTabFromPath = (path: string): TabType => {
    if (path.startsWith('/games')) return 'games';
    if (path.startsWith('/stats')) return 'stats';
    if (path.startsWith('/players')) return 'players';
    return 'players';
  };

  const [activeTab, setActiveTab] = React.useState<TabType>(() => {
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab === 'games' || savedTab === 'players' || savedTab === 'stats') {
      return savedTab as TabType;
    }
    return getTabFromPath(location.pathname);
  });

  // Sign of the slide transition: +1 when moving to a tab further right in
  // TAB_ORDER, -1 when moving left.
  const [direction, setDirection] = React.useState<1 | -1>(1);

  // Sync activeTab with URL and localStorage (only the bare tab routes; detail
  // overlays leave the underlying tab as-is).
  React.useEffect(() => {
    if (location.pathname === '/players' || location.pathname === '/games' || location.pathname === '/stats') {
      const pathTab = getTabFromPath(location.pathname);
      setActiveTab(pathTab);
      localStorage.setItem('activeTab', pathTab);
    }
  }, [location.pathname]);

  const handleTabChange = (tab: TabType) => {
    setDirection(TAB_ORDER.indexOf(tab) >= TAB_ORDER.indexOf(activeTab) ? 1 : -1);
    navigate(`/${tab}`);
    // Switching tabs is a fresh view — start at the top (the tabs share the
    // window scroller, so without this the new tab would inherit the old tab's
    // offset). Overlay round-trips are handled by the body scroll-lock instead.
    window.scrollTo(0, 0);
  };

  // Swipe between adjacent tabs (Players ↔ Games ↔ Stats).
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const next = TAB_ORDER[TAB_ORDER.indexOf(activeTab) + 1];
      if (next) handleTabChange(next);
    },
    onSwipedRight: () => {
      const prev = TAB_ORDER[TAB_ORDER.indexOf(activeTab) - 1];
      if (prev) handleTabChange(prev);
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
            initial={{ opacity: 0, x: direction * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -20 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="tab-content-inner"
          >
            {activeTab === 'players' ? <Players /> : activeTab === 'games' ? <Games /> : <Stats />}
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
                       location.pathname.startsWith('/stats/colors/') ||
                       location.pathname.startsWith('/stats/combos') ||
                       location.pathname.startsWith('/stats/tiers/') ||
                       location.pathname.startsWith('/stats/commanders/') ||
                       location.pathname === '/new-game' ||
                       location.pathname === '/new-session' ||
                       location.pathname === '/manage-season' ||
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
              <Route path="/players/:playerName/commanders" element={<PlayerCommandersPage />} />
              <Route path="/players/:playerName" element={<PlayerDetailsPage />} />
              <Route path="/games/:gameId" element={<GameDetailsPage />} />
              <Route path="/stats/colors/:color" element={<ColorStatsPage />} />
              <Route path="/stats/combos" element={<AllCombinationsPage />} />
              <Route path="/stats/combos/:comboKey" element={<ComboStatsPage />} />
              <Route path="/stats/tiers/:tier" element={<ComboStatsPage />} />
              <Route path="/stats/commanders/:commanderKey" element={<CommanderStatsPage />} />
              <Route path="/new-game" element={<NewGamePage />} />
              <Route path="/new-session" element={<NewSessionPage />} />
              <Route path="/manage-season" element={<ManageSeasonPage />} />
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
    // We manage window scroll ourselves (the body scroll-lock preserves the
    // page under overlays; tab switches reset to top). Disable the browser's
    // native per-entry restoration so it can't fight us and reapply a stale
    // offset on Back.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
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
  const targetPath = savedTab === 'games' ? '/games' : savedTab === 'stats' ? '/stats' : '/players';
  return <Navigate to={targetPath} replace />;
}

export default App;
