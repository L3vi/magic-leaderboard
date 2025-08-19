import React from "react";
import "./NavBar.css";

// Simple icons using emoji for now; replace with SVGs or icon library as needed
const NAV_ITEMS = [
	{ label: "Leaderboard", icon: "🏆" },
	{ label: "Games", icon: "🎲" },
	{ label: "Add Game", icon: "➕", isFab: true },
];

const NavBar: React.FC = () => {
	const [activeIdx, setActiveIdx] = React.useState(0);

	return (
		<nav className="nav-bar">
			{NAV_ITEMS.map((item, idx) =>
				item.isFab ? (
					<button key={item.label} className="nav-fab" aria-label={item.label}>
						{item.icon}
					</button>
				) : (
					<button
						key={item.label}
						className={`nav-item${activeIdx === idx ? " active" : ""}`}
						aria-label={item.label}
						onClick={() => setActiveIdx(idx)}
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
