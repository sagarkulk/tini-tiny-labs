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
        Learn, solve, and play — anytime, anywhere.
      </p>

      <Link
        to="/Homework/Mathematics"
        className="primaryBtn"
        aria-label="Mathematics"
        title="Mathematics"
        style={{ textDecoration: "none", marginTop: 12, minWidth: 200 }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span>Mathematics</span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>(Optional time assessment mode)</span>
        </div>
      </Link>
      <Link
        to="/Homework/WordScramble"
        className="primaryBtn"
        aria-label="WordScramble"
        title="WordScramble"
        style={{ textDecoration: "none", marginTop: 12, minWidth: 200 }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span>Word Scramble</span>
          <span style={{ fontSize: 12, opacity: 0.85 }}></span>
        </div>
      </Link>
    </div>
  );
}
