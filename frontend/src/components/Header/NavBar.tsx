
import React from "react";
import "./NavBar.css";

/**
 * NavBarProps defines the props for the NavBar component.
 * @property activeTab - The currently active tab.
 * @property setActiveTab - Function to set the active tab.
 */
interface NavBarProps {
	activeTab: "players" | "games";
	setActiveTab: (tab: "players" | "games") => void;
	onNewGame?: () => void;
	hideNewGameButton?: boolean;
}

// Navigation items for the NavBar
const NAV_ITEMS = [
	{ label: "Players", icon: "🏆", tab: "players" },
	{ label: "Games", icon: "🎲", tab: "games" },
	{ label: "Add Game", icon: "+", isFab: true },
];

/**
 * NavBar component for the Magic Leaderboard app.
 * - Responsive navigation bar for desktop and mobile.
 * - Accessible with ARIA roles and keyboard navigation.
 * - Uses semantic HTML and theme variables.
 */

const NavBar: React.FC<NavBarProps> = ({ activeTab, setActiveTab, onNewGame, hideNewGameButton = false }) => {
	const navRef = React.useRef<HTMLDivElement>(null);
	const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
	const [underlineStyle, setUnderlineStyle] = React.useState<React.CSSProperties>({});

	// Keyboard navigation: allow arrow keys to move between tabs
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

	// Update underline position and width when activeTab changes or on resize
	React.useEffect(() => {
		const idx = NAV_ITEMS.findIndex(item => item.tab === activeTab);
		const el = tabRefs.current[idx];
		if (el && navRef.current) {
			const navRect = navRef.current.getBoundingClientRect();
			const rect = el.getBoundingClientRect();
			const inset = 6; // Inset to account for border radius
			setUnderlineStyle({
				left: rect.left - navRect.left + inset + "px",
				width: rect.width - (inset * 2) + "px",
			});
		}
	}, [activeTab]);

	// Recalculate on window resize
	React.useEffect(() => {
		const handleResize = () => {
			const idx = NAV_ITEMS.findIndex(item => item.tab === activeTab);
			const el = tabRefs.current[idx];
			if (el && navRef.current) {
				const navRect = navRef.current.getBoundingClientRect();
				const rect = el.getBoundingClientRect();
				const inset = 8; // Inset to account for border radius
				setUnderlineStyle(style => ({
					...style,
					left: rect.left - navRect.left + inset + "px",
					width: rect.width - (inset * 2) + "px"
				}));
			}
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [activeTab]);

		return (
			<>
				<div className="nav-bar" role="tablist" aria-label="Main Navigation" ref={navRef}>
					<div className="nav-tab-group">
						{/* Navigation Items */}
						{NAV_ITEMS.filter(item => !item.isFab).map((item, idx) => (
							<button
								key={item.label}
								className={`nav-item${activeTab === item.tab ? " active" : ""}`}
								aria-label={item.label}
								aria-selected={activeTab === item.tab}
								tabIndex={0}
								role="tab"
							onClick={() => setActiveTab(item.tab as "players" | "games")}
								onKeyDown={e => handleKeyDown(e, idx)}
								ref={el => tabRefs.current[idx] = el}
							>
								<span className="nav-icon" aria-hidden="true">{item.icon}</span>
								<span className="nav-label">{item.label}</span>
							</button>
						))}
					</div>
					{/* Mobile FAB */}
					{!hideNewGameButton && (
						<button
							className="nav-fab"
							aria-label="Add Game"
							tabIndex={0}
							role="button"
							onClick={onNewGame}
						>
							+
						</button>
					)}
					<div className="nav-highlight" style={underlineStyle} />
				</div>
				{/* Desktop FAB */}
				{!hideNewGameButton && (
					<button className="nav-fab-desktop" aria-label="Add New Game" onClick={onNewGame}>
						<span className="nav-fab-icon">+</span>
						<span className="nav-fab-label">New Game</span>
					</button>
				)}
			</>
		);
};

export default NavBar;
