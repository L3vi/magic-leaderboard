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
      {/* Tab navigation is now handled by NavBar */}
      {activeTab === 'leaderboard' && <Leaderboard />}
      {activeTab === 'games' && <GameHistory />}
    </>
  );
}

export default App;
