import React from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Home from "./components/Home";
import Mathematics from "./components/Mathematics";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter basename="/tini-tiny-labs">
      <div className="app-shell">
        <header className="app-header">
          <div className="header-inner">
            <h1 className="brand">Tini-Tiny Labs</h1>
            <nav className="nav">
              <Link to="/Homework">Home</Link>
              <Link to="/Homework/Mathematics">Mathematics</Link>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            {/* redirect repo root to /Homework */}
            <Route path="/" element={<Navigate to="/Homework" replace />} />
            <Route path="/Homework" element={<Home />} />
            <Route path="/Homework/Mathematics" element={<Mathematics />} />
            <Route path="*" element={<div style={{ padding: 16 }}>404 Not Found</div>} />
          </Routes>
        </main>

        <footer className="app-footer">
          <div className="footer-inner">
            <p>© {new Date().getFullYear()} Tini-Tiny Labs</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
