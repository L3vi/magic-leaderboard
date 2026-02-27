
import React from "react";
import "./Header.css";
import Logo from "./Logo";
import NavBar from "./NavBar";

type TabType = "drafts" | "players" | "stats";

interface HeaderProps {
  title?: string;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onNewItem?: () => void;
  hideNewButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title = "Cube Draft",
  activeTab,
  setActiveTab,
  onNewItem,
  hideNewButton = false,
}) => {
  return (
    <header className="header" aria-label="Site Header" role="banner">
      <div className="header-main">
        <a href="/" aria-label="Home" tabIndex={0}>
          <Logo />
        </a>
        <h1 className="header-title" tabIndex={0}>{title}</h1>
      </div>
      <nav className="header-nav-desktop" aria-label="Main Navigation" role="navigation">
        <NavBar activeTab={activeTab} setActiveTab={setActiveTab} onNewItem={onNewItem} hideNewButton={hideNewButton} />
      </nav>
      <nav className="nav-bar-mobile" aria-label="Mobile Navigation" role="navigation">
        <NavBar activeTab={activeTab} setActiveTab={setActiveTab} onNewItem={onNewItem} hideNewButton={hideNewButton} />
      </nav>
    </header>
  );
};

export default Header;
