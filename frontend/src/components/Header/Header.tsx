import "./Header.css";

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = "Magic Leaderboard" }) => (
  <header className="header" aria-label="Site Header">
    <img
      src="/logo.svg"
      alt="Magic Leaderboard Logo"
      className="header-logo"
      aria-hidden="true"
    />
    <h1 className="header-title">{title}</h1>
  </header>
);

export default Header;
