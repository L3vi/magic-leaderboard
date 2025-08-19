import React from "react";
import "./NavBar.css";

// Simple icons using emoji for now; replace with SVGs or icon library as needed
const NAV_ITEMS = [
	{ label: "Leaderboard", icon: "🏆", tab: "leaderboard" },
	{ label: "Games", icon: "🎲", tab: "games" },
	{ label: "Add Game", icon: "➕", isFab: true },
];

interface NavBarProps {
	activeTab: "leaderboard" | "games";
	setActiveTab: (tab: "leaderboard" | "games") => void;
}

const NavBar: React.FC<NavBarProps> = ({ activeTab, setActiveTab }) => {
	return (
		<nav className="nav-bar">
			{NAV_ITEMS.map((item) =>
				item.isFab ? (
					<button key={item.label} className="nav-fab" aria-label={item.label}>
						{item.icon}
					</button>
				) : (
					<button
						key={item.label}
						className={`nav-item${
							activeTab === item.tab ? " active" : ""
						}`}
						aria-label={item.label}
						onClick={() => setActiveTab(item.tab as "leaderboard" | "games")}
					>
						<span className="nav-icon">{item.icon}</span>
						<span className="nav-label">{item.label}</span>
					</button>
				)
			)}
		</nav>
	);
};

export default NavBar;
