import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import Home from "./components/Home";
import Mathematics from "./components/Mathematics";
import WordScramble from "./components/WordScramble";
import Feedback from "./components/Feedback";
import RouteChangeTracker from "./RouteChangeTracker";
import "./App.css";

function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="themeToggle" onClick={onToggle} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
      <span className="toggleKnob" data-theme={theme}>{theme === "light" ? "🌞" : "🌙"}</span>
    </button>
  );
}

// Redirect any mixed-case path to lowercase so /Homework -> /homework
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

export default function App() {
  const getInitial = () => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  const [theme, setTheme] = useState(getInitial);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
    meta.setAttribute("content", theme === "dark" ? "#1F2937" : "#ffffff");
  }, [theme]);

  return (
    <BrowserRouter>
      <LowercaseRedirect />
      <RouteChangeTracker />
      <div className="app-shell">
        <header className="app-header">
          <div className="header-inner">
            <div className="brandRow">
              <NavLink to="/homework" className="brandLink" aria-label="Tini-Tiny Labs home">
                <span className="brandBadge">
                  <img
                    src="/logo-transparent.png"
                    srcSet="/logo-transparent.png 2x, /icon-512.png 3x"
                    alt="Tini-Tiny Labs"
                    className="brandLogo"
                  />
                </span>
              </NavLink>
              <h1 className="brandText">Tini-Tiny Labs</h1>
            </div>

            <nav className="nav">
              <NavLink to="/homework">Home</NavLink>
              <NavLink to="/homework/mathematics">Mathematics</NavLink>
              <NavLink to="/homework/wordscramble">Word Scramble</NavLink>
              <ThemeToggle theme={theme} onToggle={() => setTheme(t => (t === "light" ? "dark" : "light"))} />
            </nav>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            {/* canonical lowercase routes */}
            <Route path="/" element={<Navigate to="/homework" replace />} />
            <Route path="/homework" element={<Home />} />
            <Route path="/homework/mathematics" element={<Mathematics />} />
            <Route path="/homework/wordscramble" element={<WordScramble />} />
            <Route path="/homework/feedback" element={<Feedback />} />

            {/* optional safety redirects for static-file hits */}
            <Route path="/index.html" element={<Navigate to="/homework" replace />} />
            <Route path="/404.html" element={<Navigate to="/homework" replace />} />

            {/* (optional) legacy uppercase redirects — can remove if using LowercaseRedirect */}
            {/* <Route path="/Homework" element={<Navigate to="/homework" replace />} />
                <Route path="/Homework/Mathematics" element={<Navigate to="/homework/mathematics" replace />} />
                <Route path="/Homework/Feedback" element={<Navigate to="/homework/feedback" replace />} /> */}

            {/* catch-all */}
            <Route path="*" element={<div style={{ padding: 16 }}>404 Not Found</div>} />
          </Routes>
        </main>

        <footer className="app-footer">
          <div className="footer-inner">
            <nav className="footer-nav" aria-label="Bottom toolbar">
              <NavLink to="/homework/feedback" className="footer-link">Feedback</NavLink>
            </nav>
            <p>© {new Date().getFullYear()} Tini-Tiny Labs</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
