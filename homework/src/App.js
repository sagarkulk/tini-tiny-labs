import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Home from "./components/Home";
import Mathematics from "./components/Mathematics";
import "./App.css";
import Feedback from "./components/Feedback";

function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      className="themeToggle"
      onClick={onToggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <span className="toggleKnob" data-theme={theme}>
        {theme === "light" ? "🌞" : "🌙"}
      </span>
    </button>
  );
}

export default function App() {
  // Initialize from localStorage or system preference
  const getInitial = () => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const [theme, setTheme] = useState(getInitial);

  // Apply theme to <html> + persist + update address-bar color on mobile
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", theme === "dark" ? "#111827" : "#ffffff");
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <BrowserRouter basename="/tini-tiny-labs">
      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <div className="header-inner">
            <div className="brandRow">
              <Link to="/Homework" className="brandLink" aria-label="Tini-Tiny Labs home">
                <span className="brandBadge">
                  <img
                    src={process.env.PUBLIC_URL + "/logo-transparent.png"}
                    srcSet={
                      process.env.PUBLIC_URL + "/logo-transparent.png 2x, " +
                      process.env.PUBLIC_URL + "/icon-512.png 3x"
                    }
                    alt="Tini-Tiny Labs"
                    className="brandLogo"
                  />
                </span>
              </Link>
              <h1 className="brandText">Tini-Tiny Labs</h1>
            </div>
            <nav className="nav">
              <Link to="/Homework">Home</Link>
              <Link to="/Homework/Mathematics">Mathematics</Link>
              <Link to="/Homework/Feedback">Feedback</Link>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </nav>
          </div>
        </header>

        {/* Scrollable body */}
        <main className="app-main" id="main">
          <Routes>
            <Route path="/" element={<Navigate to="/Homework" replace />} />
            <Route path="/Homework" element={<Home />} />
            <Route path="/Homework/Mathematics" element={<Mathematics />} />
            <Route path="*" element={<div style={{ padding: 16 }}>404 Not Found</div>} />
            <Route path="/Homework/Feedback" element={<Feedback />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <div className="footer-inner">
            <p>© {new Date().getFullYear()} Tini-Tiny Labs</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
