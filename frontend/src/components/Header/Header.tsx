
import React from "react";
import "./Header.css";
import Logo from "./Logo";
import NavBar from "./NavBar";

/**
 * HeaderProps defines the props for the Header component.
 * @property title - The site title to display.
 * @property activeTab - The currently active tab.
 * @property setActiveTab - Function to set the active tab.
 */
interface HeaderProps {
  title?: string;
  activeTab: "players" | "games";
  setActiveTab: (tab: "players" | "games") => void;
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
        <a href="/" aria-label="Home" tabIndex={0}>
          <Logo />
        </a>
        <h1 className="header-title" tabIndex={0}>{title}</h1>
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
