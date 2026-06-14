import React from "react";
import GameStats from "../Players/GameStats";

/**
 * Stats tab — the season's overview/commander/color breakdowns that used to
 * live below the leaderboard on the Players tab. Wrapped in `.main-section` so
 * it shares the same width, centering, and bottom-nav clearance as the other
 * tabs.
 */
const Stats: React.FC = () => (
  <section className="main-section">
    <GameStats />
  </section>
);

export default Stats;
