// Sidebar.jsx
import React, { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { routesConfig } from "./routesConfig";
import "./Sidebar.css"; // Make sure this CSS file exists

export default function Sidebar({ open, onClose, ThemeToggle, theme, onToggleTheme }) {
	const loc = useLocation();
	const panelRef = useRef(null);
	const firstLinkRef = useRef(null);

	// Auto-close sidebar on route change
	useEffect(() => {
		if (open) onClose();
		// eslint-disable-next-line
	}, [loc.pathname]);

	// ESC key to close
	useEffect(() => {
		if (!open) return;
		const onKey = (e) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	// Focus first link or panel when opening
	useEffect(() => {
		if (open) (firstLinkRef.current || panelRef.current)?.focus();
	}, [open]);

	// Only routes flagged for sidebar
	const navRoutes = routesConfig.filter(r => r.showInSidebar);

	return (
		<>
			<aside
				id="sidebar"
				className={`sidebar ${open ? "is-open" : ""}`}
				aria-hidden={!open}
				aria-label="Main menu"
				role="dialog"
				aria-modal="true"
				ref={panelRef}
				tabIndex={-1}
			>
				{/* Header */}
				<div className="sidebarHeader">
					<NavLink to="/homework" className="brandLink" aria-label="Tini-Tiny Labs home">
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

				{/* Navigation Links */}
				<div className="sidebarInner">
					<nav className="sidebarNav" aria-label="Primary">
						{navRoutes.map((route, idx) => (
							<NavLink
								key={route.path}
								to={route.path}
								end={route.path === "/homework"}
								className="sidebarLink"
								ref={idx === 0 ? firstLinkRef : null}
								onClick={onClose}
							>
								{route.icon && (
									<span className="sidebarIcon">
										{typeof route.icon === "string" ? route.icon : <route.icon />}
									</span>
								)}
								<span className="sidebarText">{route.label}</span>
							</NavLink>
						))}
					</nav>
				</div>

				{/* Footer */}
				<div className="sidebarFooter">
					<span style={{ opacity: 0.8, fontWeight: 700, fontSize: 14 }}>Theme</span>
					<ThemeToggle theme={theme} onToggle={onToggleTheme} />
				</div>
			</aside>

			{/* Backdrop */}
			<div
				className={`backdrop ${open ? "is-open" : ""}`}
				aria-hidden={!open}
				onClick={onClose}
			/>
		</>
	);
}
