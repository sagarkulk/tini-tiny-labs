import React, { useEffect, useState } from "react";
import {
	BrowserRouter,
	Routes,
	Route,
	NavLink,
	Navigate,
	useLocation,
	useNavigate,
} from "react-router-dom";
import RouteChangeTracker from "./RouteChangeTracker";
import Sidebar from "./Sidebar";
import { routesConfig } from "./routesConfig"; // ✅ import route config
import "./App.css";

/* ---------- Theme Toggle ---------- */
function ThemeToggle({ theme, onToggle }) {
	return (
		<button
			className="themeToggle"
			onClick={onToggle}
			aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
		>
			<span className="toggleKnob" data-theme={theme}>
				{theme === "light" ? "🌞" : "🌙"}
			</span>
		</button>
	);
}

/* ---------- Lowercase Redirect ---------- */
function LowercaseRedirect() {
	const location = useLocation();
	const navigate = useNavigate();
	useEffect(() => {
		const lower = location.pathname.toLowerCase();
		if (location.pathname !== lower) {
			navigate(lower + location.search + location.hash, { replace: true });
		}
	}, [location, navigate]);
	return null;
}

/* ---------- App ---------- */
export default function App() {
	return (
		<BrowserRouter>
			<AppShell />
		</BrowserRouter>
	);
}

/* ---------- AppShell ---------- */
function AppShell() {
	const getInitial = () => {
		const saved = localStorage.getItem("theme");
		if (saved === "light" || saved === "dark") return saved;
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	};

	const [theme, setTheme] = useState(getInitial);
	const [menuOpen, setMenuOpen] = useState(false);
	const location = useLocation();

	// Apply theme to <html>
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		localStorage.setItem("theme", theme);
		let meta = document.querySelector('meta[name="theme-color"]');
		if (!meta) {
			meta = document.createElement("meta");
			meta.name = "theme-color";
			document.head.appendChild(meta);
		}
		meta.setAttribute("content", theme === "dark" ? "#1F2937" : "#ffffff");
	}, [theme]);

	// Lock scroll when sidebar open
	useEffect(() => {
		if (!menuOpen) return;
		const scrollY = window.scrollY || document.documentElement.scrollTop;
		const body = document.body;
		body.style.position = "fixed";
		body.style.top = `-${scrollY}px`;
		body.style.left = "0";
		body.style.right = "0";
		body.style.width = "100%";
		body.style.overflow = "hidden";
		return () => {
			const y = body.style.top ? -parseInt(body.style.top, 10) : 0;
			body.style.position = "";
			body.style.top = "";
			body.style.left = "";
			body.style.right = "";
			body.style.width = "";
			body.style.overflow = "";
			window.scrollTo(0, y);
		};
	}, [menuOpen]);

	// Auto-close sidebar on route change
	useEffect(() => {
		if (menuOpen) setMenuOpen(false);
	}, [location.pathname]);

	// Filter routes for top nav and app routes
	const topNavRoutes = routesConfig.filter((r) => r.showInTopMenu);
	const appRoutes = routesConfig.filter((r) => r.showInAppRoutes);

	return (
		<>
			<LowercaseRedirect />
			<RouteChangeTracker />

			<Sidebar
				open={menuOpen}
				onClose={() => setMenuOpen(false)}
				ThemeToggle={ThemeToggle}
				theme={theme}
				onToggleTheme={() =>
					setTheme((t) => (t === "light" ? "dark" : "light"))
				}
			/>

			<div className="app-shell">
				{/* Header */}
				<header className="app-header">
					<div className="header-inner">
						<div className="header-left">
							<div className="mobile-only">
								<button
									className="burgerBtn"
									aria-label="Open menu"
									aria-haspopup="menu"
									aria-expanded={menuOpen}
									aria-controls="sidebar"
									onClick={() => setMenuOpen(true)}
								>
									<span className="burgerIcon" />
								</button>
							</div>

							<NavLink
								to="/homework"
								className="brandLink"
								aria-label="Tini-Tiny Labs home"
							>
								<span className="brandBadge">
									<img
										src="/logo-transparent.png"
										srcSet="/logo-transparent.png 2x, /icon-512.png 3x"
										alt="Tini-Tiny Labs"
										className="brandLogo"
										width="44"
										height="44"
										decoding="async"
									/>
								</span>
								<h1 className="brandText">Tini-Tiny Labs</h1>
							</NavLink>
						</div>

						{/* Top menu - dynamic */}
						<nav className="nav desktop-only" aria-label="Primary">
							{topNavRoutes.map((r) => (
								<NavLink key={r.path} to={r.path}>
									{r.label}
								</NavLink>
							))}
						</nav>

						<div className="header-right">
							<ThemeToggle
								theme={theme}
								onToggle={() =>
									setTheme((t) => (t === "light" ? "dark" : "light"))
								}
							/>
						</div>
					</div>
				</header>

				{/* Main content */}
				<main className="app-main" id="main">
					<Routes>
						<Route path="/" element={<Navigate to="/homework" replace />} />
						{appRoutes.map(({ path, element }) => (
							<Route key={path} path={path} element={element} />
						))}
						<Route
							path="/index.html"
							element={<Navigate to="/homework" replace />}
						/>
						<Route
							path="/404.html"
							element={<Navigate to="/homework" replace />}
						/>
						<Route
							path="*"
							element={<div style={{ padding: 16 }}>404 Not Found</div>}
						/>
					</Routes>
				</main>

				{/* Footer */}
				<footer className="app-footer">
					<div className="footer-inner">
						<nav className="footer-nav" aria-label="Bottom toolbar">
							<NavLink to="/homework/feedback" className="footer-link">
								Feedback
							</NavLink>
						</nav>
						<p>© {new Date().getFullYear()} Tini-Tiny Labs</p>
					</div>
				</footer>
			</div>
		</>
	);
}
