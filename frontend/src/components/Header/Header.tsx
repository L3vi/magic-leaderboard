import "./Header.css";
import Logo from "../Logo/Logo";

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = "Magic Leaderboard" }) => (
  <header className="header" aria-label="Site Header">
    <a href="/" aria-label="Home">
      <Logo />
    </a>
    <h1 className="header-title">{title}</h1>
  </header>
);

export default Header;
