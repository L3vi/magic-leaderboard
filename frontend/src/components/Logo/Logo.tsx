import React from "react";
import LogoSVG from "../../assets/logo.svg?react";
import "./Logo.css";

interface LogoProps {
  className?: string;
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({ className = "logo", style }) => (
  <LogoSVG className={className} style={style} />
);

export default Logo;
