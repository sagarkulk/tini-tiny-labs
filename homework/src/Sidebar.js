// Sidebar.jsx
import React, { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";

export default function Sidebar({ open, onClose, ThemeToggle, theme, onToggleTheme }) {
    const loc = useLocation();
    const panelRef = useRef(null);
    const firstLinkRef = useRef(null);

    // Close on route change (safety; AppShell also auto-closes)
    useEffect(() => { if (open) onClose(); /* eslint-disable-next-line */ }, [loc.pathname]);

    // ESC to close
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    // Focus management: when opening, move focus into the panel
    useEffect(() => {
        if (open) {
            // prefer first nav link; fall back to panel
            (firstLinkRef.current || panelRef.current)?.focus();
        }
    }, [open]);

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
                <div className="sidebarInner">
                    <nav className="sidebarNav" aria-label="Primary">
                        <NavLink to="/homework" end className="sidebarLink" ref={firstLinkRef} onClick={onClose}>
                            Home
                        </NavLink>
                        <NavLink to="/homework/mathematics" className="sidebarLink" onClick={onClose}>
                            Mathematics
                        </NavLink>
                        <NavLink to="/homework/wordscramble" className="sidebarLink" onClick={onClose}>
                            Word Scramble
                        </NavLink>
                        <NavLink to="/homework/feedback" className="sidebarLink" onClick={onClose}>
                            Feedback
                        </NavLink>
                    </nav>
                </div>

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
