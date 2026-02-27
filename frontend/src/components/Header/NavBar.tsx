
import React from "react";
import "./NavBar.css";

type TabType = "drafts" | "players" | "stats";

interface NavBarProps {
	activeTab: TabType;
	setActiveTab: (tab: TabType) => void;
	onNewItem?: () => void;
	hideNewButton?: boolean;
}

const NAV_ITEMS: { label: string; icon: string; tab: TabType }[] = [
	{ label: "Drafts", icon: "📋", tab: "drafts" },
	{ label: "Players", icon: "🏆", tab: "players" },
	{ label: "Stats", icon: "📊", tab: "stats" },
];

const NavBar: React.FC<NavBarProps> = ({ activeTab, setActiveTab, onNewItem, hideNewButton = false }) => {
	const navRef = React.useRef<HTMLDivElement>(null);
	const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
	const [underlineStyle, setUnderlineStyle] = React.useState<React.CSSProperties>({});

	const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
		if (e.key === "ArrowRight" || e.key === "ArrowDown") {
			e.preventDefault();
			const next = navRef.current?.querySelectorAll<HTMLButtonElement>(".nav-item")[idx + 1];
			next?.focus();
		} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
			e.preventDefault();
			const prev = navRef.current?.querySelectorAll<HTMLButtonElement>(".nav-item")[idx - 1];
			prev?.focus();
		}
	};

	React.useEffect(() => {
		const idx = NAV_ITEMS.findIndex(item => item.tab === activeTab);
		const el = tabRefs.current[idx];
		if (el && navRef.current) {
			const navRect = navRef.current.getBoundingClientRect();
			const rect = el.getBoundingClientRect();
			const inset = 6;
			setUnderlineStyle({
				left: rect.left - navRect.left + inset + "px",
				width: rect.width - (inset * 2) + "px",
			});
		}
	}, [activeTab]);

	React.useEffect(() => {
		const handleResize = () => {
			const idx = NAV_ITEMS.findIndex(item => item.tab === activeTab);
			const el = tabRefs.current[idx];
			if (el && navRef.current) {
				const navRect = navRef.current.getBoundingClientRect();
				const rect = el.getBoundingClientRect();
				const inset = 8;
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
					{NAV_ITEMS.map((item, idx) => (
						<button
							key={item.label}
							className={`nav-item${activeTab === item.tab ? " active" : ""}`}
							aria-label={item.label}
							aria-selected={activeTab === item.tab}
							tabIndex={0}
							role="tab"
							onClick={() => setActiveTab(item.tab)}
							onKeyDown={e => handleKeyDown(e, idx)}
							ref={el => tabRefs.current[idx] = el}
						>
							<span className="nav-icon" aria-hidden="true">{item.icon}</span>
							<span className="nav-label">{item.label}</span>
						</button>
					))}
				</div>
				{!hideNewButton && (
					<button
						className="nav-fab"
						aria-label="New"
						tabIndex={0}
						role="button"
						onClick={onNewItem}
					>
						+
					</button>
				)}
				<div className="nav-highlight" style={underlineStyle} />
			</div>
			{!hideNewButton && (
				<button className="nav-fab-desktop" aria-label="New" onClick={onNewItem}>
					<span className="nav-fab-icon">+</span>
					<span className="nav-fab-label">New</span>
				</button>
			)}
		</>
	);
};

export default NavBar;
