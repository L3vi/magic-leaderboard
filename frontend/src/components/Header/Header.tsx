
import React from "react";
import { Link } from "react-router-dom";
import "./Header.css";
import Logo from "./Logo";
import NavBar, { type TabType } from "./NavBar";
import SeasonSelector from "../SeasonSelector/SeasonSelector";

/**
 * HeaderProps defines the props for the Header component.
 * @property title - The site title to display.
 * @property activeTab - The currently active tab.
 * @property setActiveTab - Function to set the active tab.
 */
interface HeaderProps {
  title?: string;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onNewGame?: () => void;
  hideNewGameButton?: boolean;
}

/**
 * Header component for the Magic Leaderboard app.
 * - Responsive and accessible site header.
 * - Includes logo, title, and navigation bar.
 * - Uses ARIA roles and semantic HTML for accessibility.
 */
const Header: React.FC<HeaderProps> = ({
  title = "Magic Leaderboard",
  activeTab,
  setActiveTab,
  onNewGame,
  hideNewGameButton = false,
}) => {
  return (
    <header className="header" aria-label="Site Header" role="banner">
      <div className="header-main">
        {/* Router Link, not a bare href="/": on GitHub Pages the app lives under
            /magic-leaderboard/, so a plain "/" leaves the site entirely. */}
        <Link to="/" aria-label="Home">
          <Logo />
        </Link>
        <h1 className="header-title">{title}</h1>
        <SeasonSelector />
      </div>
      {/* Desktop Navigation */}
      <nav className="header-nav-desktop" aria-label="Main Navigation" role="navigation">
        <NavBar activeTab={activeTab} setActiveTab={setActiveTab} onNewGame={onNewGame} hideNewGameButton={hideNewGameButton} />
      </nav>
      {/* Mobile Navigation */}
      <nav className="nav-bar-mobile" aria-label="Mobile Navigation" role="navigation">
        <NavBar activeTab={activeTab} setActiveTab={setActiveTab} onNewGame={onNewGame} hideNewGameButton={hideNewGameButton} />
      </nav>
    </header>
  );
};

export default Header;
