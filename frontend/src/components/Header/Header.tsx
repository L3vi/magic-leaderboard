import "./Header.css";
import Logo from "./Logo";
import NavBar from "./NavBar";

interface HeaderProps {
  title?: string;
  activeTab: "leaderboard" | "games";
  setActiveTab: (tab: "leaderboard" | "games") => void;
}

const Header: React.FC<HeaderProps> = ({
  title = "Magic Leaderboard",
  activeTab,
  setActiveTab,
}) => (
  <header className="header" aria-label="Site Header">
    <div className="header-main">
      <a href="/" aria-label="Home">
        <Logo />
      </a>
      <h1 className="header-title">{title}</h1>
    </div>
    <div className="header-nav-desktop">
      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
    <div className="nav-bar-mobile">
      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  </header>
);

export default Header;
