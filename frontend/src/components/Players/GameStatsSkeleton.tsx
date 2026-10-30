import React from "react";
import "../../styles/skeleton.css";

/**
 * Shimmer stand-ins for the Stats tab. The section headings, card labels and
 * explanatory notes are real text (they never depend on data), so the page's
 * chrome is in place from the first paint and only the figures fill in.
 */

const OVERVIEW_LABELS = [
  "Total Games",
  "Total Players",
  "Unique Commanders",
  "Average Players per Game",
  "Estimated Play Time",
];

const ACCOLADE_LABELS = ["Most Played", "Most Wins", "Best Win Rate"];

const TOP_COMMANDERS = 5;
const COLOR_CARDS = 5;
const TIER_CARDS = 3;
const COMBO_ROWS = 6;

const Bar: React.FC<{ className: string }> = ({ className }) => (
  <span className={`skeleton skeleton-bar ${className}`} />
);

/** The "Win Rate by Color" grid with neutral-bordered placeholder cards. */
export const ColorCardsSkeleton: React.FC = () => (
  <div className="color-stats-simple">
    {Array.from({ length: COLOR_CARDS }).map((_, i) => (
      <div className="color-stat-card color-stat-card-skeleton" key={i}>
        <div className="color-stat-header">
          <Bar className="color-skeleton-name" />
          <Bar className="color-skeleton-plays" />
        </div>
        <Bar className="color-skeleton-record" />
        <Bar className="color-skeleton-rate" />
      </div>
    ))}
  </div>
);

/** "By Number of Colors" tiles plus the "Most Played Combinations" list. */
export const ComboSectionsSkeleton: React.FC = () => (
  <>
    <div className="section-subheading">By Number of Colors</div>
    <div className="section-note">
      <Bar className="section-note-skeleton" />
    </div>
    <div className="combo-tiers">
      {Array.from({ length: TIER_CARDS }).map((_, i) => (
        <div className="combo-tier-card" key={i}>
          <Bar className="combo-tier-skeleton-pct" />
          <Bar className="combo-tier-skeleton-label" />
          <Bar className="combo-tier-skeleton-sub" />
        </div>
      ))}
    </div>

    <div className="section-subheading">Most Played Combinations</div>
    <div className="combo-list">
      {Array.from({ length: COMBO_ROWS }).map((_, i) => (
        <div className="combo-row" key={i}>
          <Bar className="combo-skeleton-pips" />
          <Bar className="combo-skeleton-name" />
          <Bar className="combo-skeleton-meta" />
        </div>
      ))}
    </div>
  </>
);

/** A headline card whose value (and optional subtext) is still loading. */
export const StatCardSkeleton: React.FC<{
  label: string;
  valueClass?: string;
  subtext?: boolean;
  className?: string;
}> = ({ label, valueClass = "", subtext = false, className = "" }) => (
  <div className={`stat-card ${className}`}>
    <div className="stat-label">{label}</div>
    <Bar className={`stat-skeleton-value ${valueClass}`} />
    {subtext && <Bar className="stat-skeleton-subtext" />}
  </div>
);

const GameStatsSkeleton: React.FC = () => (
  <div className="game-stats" aria-busy="true" aria-label="Loading statistics">
    <h2>Overall Game Statistics</h2>

    <div className="stats-section">
      <h3 className="section-heading">Season Overview</h3>
      <div className="stats-grid">
        {OVERVIEW_LABELS.map((label, i) => (
          <StatCardSkeleton
            key={label}
            label={label}
            subtext={i === OVERVIEW_LABELS.length - 1}
          />
        ))}
      </div>
    </div>

    <div className="stats-section">
      <h3 className="section-heading">Commander Performance</h3>
      <div className="stats-grid">
        {ACCOLADE_LABELS.map((label) => (
          <StatCardSkeleton
            key={label}
            label={label}
            className="best-commander"
            valueClass="stat-skeleton-value--name"
            subtext
          />
        ))}
      </div>

      <div className="section-subheading">Top Commanders</div>
      <div className="section-note">
        Ranked by weighted average points per game (small samples are pulled
        toward the league average) —{" "}
        1st&nbsp;=&nbsp;4 · 2nd&nbsp;=&nbsp;3 · 3rd&nbsp;=&nbsp;2 · 4th+&nbsp;=&nbsp;1
      </div>
      <div className="top-commanders-grid">
        {Array.from({ length: TOP_COMMANDERS }).map((_, i) => (
          <div className="commander-item" key={i}>
            <div className="commander-item-image">
              <span className="skeleton commander-item-skeleton-img" />
            </div>
            <div className="commander-item-info">
              <Bar className="commander-skeleton-name" />
              <Bar className="commander-skeleton-stats" />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="stats-section">
      <h3 className="section-heading">Colors</h3>
      <div className="stats-grid">
        <StatCardSkeleton label="Most Common Color" valueClass="stat-skeleton-value--badge" subtext />
        <StatCardSkeleton label="Top Combination" subtext />
      </div>

      <div className="section-subheading">Win Rate by Color</div>
      <ColorCardsSkeleton />

      <ComboSectionsSkeleton />
    </div>
  </div>
);

export default GameStatsSkeleton;
