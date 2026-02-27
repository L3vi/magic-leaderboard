import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { AnimatePresence, motion } from "framer-motion";
import "./styles/global.css";
import Header from "./components/Header/Header";
import Drafts from "./components/Drafts/Drafts";
import Players from "./components/Players/Players";
import Stats from "./components/Stats/Stats";
import DraftDetailsPage from "./pages/DraftDetailsPage";
import PlayerDetailsPage from "./pages/PlayerDetailsPage";
import MatchDetailsPage from "./pages/MatchDetailsPage";
import NewPage from "./pages/NewPage";
import { CubeEventProvider } from "./context/CubeEventContext";
import { NavigationProvider } from "./context/NavigationContext";

type TabType = "drafts" | "players" | "stats";

const TAB_ORDER: TabType[] = ["drafts", "players", "stats"];

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const getTabFromPath = (path: string): TabType => {
    if (path.startsWith('/players')) return 'players';
    if (path.startsWith('/stats')) return 'stats';
    return 'drafts';
  };

  const [activeTab, setActiveTab] = React.useState<TabType>(() => {
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab === 'drafts' || savedTab === 'players' || savedTab === 'stats') {
      return savedTab as TabType;
    }
    return getTabFromPath(location.pathname);
  });

  const [direction, setDirection] = React.useState<1 | -1>(1);

  React.useEffect(() => {
    const tabPaths = ['/drafts', '/players', '/stats'];
    if (tabPaths.includes(location.pathname)) {
      const pathTab = getTabFromPath(location.pathname);
      setActiveTab(pathTab);
      localStorage.setItem('activeTab', pathTab);
    }
  }, [location.pathname]);

  const handleTabChange = (tab: TabType) => {
    const currentIdx = TAB_ORDER.indexOf(activeTab);
    const nextIdx = TAB_ORDER.indexOf(tab);
    setDirection(nextIdx > currentIdx ? 1 : -1);
    navigate(`/${tab}`);
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIdx = TAB_ORDER.indexOf(activeTab);
      if (currentIdx < TAB_ORDER.length - 1) {
        handleTabChange(TAB_ORDER[currentIdx + 1]);
      }
    },
    onSwipedRight: () => {
      const currentIdx = TAB_ORDER.indexOf(activeTab);
      if (currentIdx > 0) {
        handleTabChange(TAB_ORDER[currentIdx - 1]);
      }
    },
    trackMouse: true,
    trackTouch: true,
  });

  const handleNewItem = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    navigate('/new', { state: { from: location.pathname } });
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'drafts': return <Drafts />;
      case 'players': return <Players />;
      case 'stats': return <Stats />;
    }
  };

  return (
    <>
      <Header activeTab={activeTab} setActiveTab={handleTabChange} onNewItem={handleNewItem} hideNewButton={location.pathname === '/new'} />
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
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  const isDetailPage = location.pathname.startsWith('/drafts/') ||
                       location.pathname.startsWith('/players/') ||
                       location.pathname.startsWith('/matches/') ||
                       location.pathname === '/new';

  return (
    <>
      <MainLayout />
      <AnimatePresence mode="popLayout" initial={false}>
        {isDetailPage && (
          <motion.div key={location.pathname}>
            <Routes location={location}>
              <Route path="/drafts/:draftId" element={<DraftDetailsPage />} />
              <Route path="/players/:playerName" element={<PlayerDetailsPage />} />
              <Route path="/matches/:matchId" element={<MatchDetailsPage />} />
              <Route path="/new" element={<NewPage />} />
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
      <CubeEventProvider>
        <NavigationProvider>
          <Router basename={process.env.NODE_ENV === 'production' ? "/magic-leaderboard" : "/"}>
            <Routes>
              <Route path="/" element={<AppRedirect />} />
              <Route path="/*" element={<AnimatedRoutes />} />
            </Routes>
          </Router>
        </NavigationProvider>
      </CubeEventProvider>
    </motion.div>
  );
}

function AppRedirect() {
  const savedTab = localStorage.getItem('activeTab');
  const targetPath = savedTab === 'players' ? '/players' : savedTab === 'stats' ? '/stats' : '/drafts';
  return <Navigate to={targetPath} replace />;
}

export default App;
