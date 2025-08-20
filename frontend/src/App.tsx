import React, { useState } from "react";
import "./styles/global.css";
import Header from "./components/Header/Header";
import Leaderboard from "./components/Leaderboard/Leaderboard";
import GameHistory from "./components/GameHistory/GameHistory";

function App() {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'games'>('leaderboard');

  return (
    <>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className={`tab-content${activeTab === 'leaderboard' ? ' slide-in-left' : ' slide-in-right'}`}>
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'games' && <GameHistory />}
      </div>
    </>
  );
}

export default App;
