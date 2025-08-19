import "./Header.css";
import Logo from "./Logo";
import NavBar from "./NavBar";

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = "Magic Leaderboard" }) => (
  <header className="header" aria-label="Site Header">
    <div className="header-main">
      <a href="/" aria-label="Home">
        <Logo />
      </a>
      <h1 className="header-title">{title}</h1>
    </div>
    <div className="header-nav-desktop">
      <NavBar />
    </div>
    <div className="nav-bar-mobile">
      <NavBar />
    </div>
  </header>
);

export default Header;
