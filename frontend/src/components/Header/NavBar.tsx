
import React from "react";
import "./NavBar.css";

/**
 * NavBarProps defines the props for the NavBar component.
 * @property activeTab - The currently active tab.
 * @property setActiveTab - Function to set the active tab.
 */
interface NavBarProps {
	activeTab: "leaderboard" | "games";
	setActiveTab: (tab: "leaderboard" | "games") => void;
}

// Navigation items for the NavBar
const NAV_ITEMS = [
	{ label: "Leaderboard", icon: "🏆", tab: "leaderboard" },
	{ label: "Games", icon: "🎲", tab: "games" },
	{ label: "Add Game", icon: "➕", isFab: true },
];

/**
 * NavBar component for the Magic Leaderboard app.
 * - Responsive navigation bar for desktop and mobile.
 * - Accessible with ARIA roles and keyboard navigation.
 * - Uses semantic HTML and theme variables.
 */
const NavBar: React.FC<NavBarProps> = ({ activeTab, setActiveTab }) => {
	// Keyboard navigation: allow arrow keys to move between tabs
	const navRef = React.useRef<HTMLDivElement>(null);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
		if (e.key === "ArrowRight" || e.key === "ArrowDown") {
			e.preventDefault();
			const next = navRef.current?.querySelectorAll<HTMLButtonElement>(".nav-item, .nav-fab")[idx + 1];
			next?.focus();
		} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
			e.preventDefault();
			const prev = navRef.current?.querySelectorAll<HTMLButtonElement>(".nav-item, .nav-fab")[idx - 1];
			prev?.focus();
		}
	};

	return (
		<div className="nav-bar" role="tablist" aria-label="Main Navigation" ref={navRef}>
			{NAV_ITEMS.map((item, idx) =>
				item.isFab ? (
					<button
						key={item.label}
						className="nav-fab"
						aria-label={item.label}
						tabIndex={0}
						role="button"
						onKeyDown={e => handleKeyDown(e, idx)}
					>
						{item.icon}
					</button>
				) : (
					<button
						key={item.label}
						className={`nav-item${activeTab === item.tab ? " active" : ""}`}
						aria-label={item.label}
						aria-selected={activeTab === item.tab}
						tabIndex={0}
						role="tab"
						onClick={() => setActiveTab(item.tab as "leaderboard" | "games")}
						onKeyDown={e => handleKeyDown(e, idx)}
					>
						<span className="nav-icon" aria-hidden="true">{item.icon}</span>
						<span className="nav-label">{item.label}</span>
					</button>
				)
			)}
		</div>
	);
};

export default NavBar;
