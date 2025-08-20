import React, { useState } from "react";
import { useSwipeable } from "react-swipeable";
import "./styles/global.css";
import Header from "./components/Header/Header";
import Leaderboard from "./components/Leaderboard/Leaderboard";
import GameHistory from "./components/GameHistory/GameHistory";
import Modal from "./components/Modal/Modal";
import NewGame from "./components/NewGame/NewGame";

function App() {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'games'>('leaderboard');
  const [isNewGameOpen, setIsNewGameOpen] = useState(false);

  // Swipe handlers for tab navigation
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (activeTab === 'leaderboard') setActiveTab('games');
    },
    onSwipedRight: () => {
      if (activeTab === 'games') setActiveTab('leaderboard');
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
      <Header activeTab={activeTab} setActiveTab={setActiveTab} onNewGame={handleNewGame} />
      <div
        {...swipeHandlers}
        className={`tab-content${activeTab === 'leaderboard' ? ' slide-in-left' : ' slide-in-right'}`}
      >
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'games' && <GameHistory />}
      </div>
      <Modal isOpen={isNewGameOpen} onClose={handleCloseNewGame} title="Create New Game">
        <NewGame onSubmit={handleSubmitNewGame} onCancel={handleCloseNewGame} />
      </Modal>
    </>
  );
}

export default App;
