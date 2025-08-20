import React, { useState } from "react";
import { useSwipeable } from "react-swipeable";
import "./styles/global.css";
import Header from "./components/Header/Header";
import Leaderboard from "./components/Leaderboard/Leaderboard";
import GameHistory from "./components/GameHistory/GameHistory";

function App() {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'games'>('leaderboard');

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

  return (
    <>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <div
        {...swipeHandlers}
        className={`tab-content${activeTab === 'leaderboard' ? ' slide-in-left' : ' slide-in-right'}`}
      >
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'games' && <GameHistory />}
      </div>
    </>
  );
}

export default App;
