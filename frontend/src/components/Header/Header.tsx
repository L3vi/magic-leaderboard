import "./Header.css";
import Logo from "../Logo/Logo";
import NavBar from "../NavBar/NavBar";

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
  </header>
);

export default Header;
