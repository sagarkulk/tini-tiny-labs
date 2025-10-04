import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Mathematics from "./Mathematics.js";

export default function App() {
  return (
    <Router>
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <h1>Homework App</h1>
        <nav style={{ marginBottom: 20 }}>
          <Link to="/" style={{ marginRight: 20 }}>Home</Link>
          <Link to="/mathematics">Mathematics</Link>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mathematics" element={<Mathematics />} />
        </Routes>
      </div>
    </Router>
  );
}

function Home() {
  return <p>Welcome! Choose a page above.</p>;
}
