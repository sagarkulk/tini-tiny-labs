import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 16,
      }}
    >
      <h1 style={{ margin: 0 }}>Let's Practice</h1>
      <p style={{ margin: 0, opacity: 0.8 }}>
        Practice arithmetic with a clean, mobile-friendly UI.
      </p>

      <Link
        to="/Homework/Mathematics"
        className="primaryBtn"
        aria-label="Mathematics Practice Mode"
        title="Mathematics — Practice Mode"
        style={{ textDecoration: "none", marginTop: 12, minWidth: 200 }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span>Mathematics</span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>Practice mode</span>
        </div>
      </Link>

      <Link
        to="/Homework/MathematicsV2"
        className="primaryBtn"
        aria-label="Mathematics V2 Timed Assessment"
        title="Mathematics V2 — Timed Assessment"
        style={{ textDecoration: "none", marginTop: 12, minWidth: 200 }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span>Mathematics V2</span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>Timed assessment</span>
        </div>
      </Link>
    </div>
  );
}
