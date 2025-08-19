import React from "react";
import "./Header.css";

const Header: React.FC = () => (
  <header className="header">
    <img
      src={process.env.PUBLIC_URL + "/logo.svg"}
      alt="Magic Leaderboard Logo"
      className="header-logo"
    />
    <h1 className="header-title">Magic Leaderboard</h1>
  </header>
);

export default Header;
