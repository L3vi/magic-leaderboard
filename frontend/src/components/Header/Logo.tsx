import React from "react";
import LogoSVG from "../../assets/logo.svg?react";
import "./Logo.css";

/**
 * LogoProps defines the props for the Logo component.
 * @property className - Custom CSS class for the logo.
 * @property style - Inline style for the logo.
 */
interface LogoProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Logo component for the Magic Leaderboard app.
 * - Renders the SVG logo with theme styling.
 * - Accessible with role and aria-label.
 */
const Logo: React.FC<LogoProps> = ({ className = "logo", style }) => (
  <LogoSVG
    className={className}
    style={style}
    role="img"
    aria-label="Magic Leaderboard Logo"
    tabIndex={0}
  />
);

export default Logo;
