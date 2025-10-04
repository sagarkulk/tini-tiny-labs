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
      <h1 style={{ margin: 0 }}>Welcome to Homework</h1>
      <p style={{ margin: 0, opacity: 0.8 }}>
        Practice arithmetic with a clean, mobile-friendly UI.
      </p>

      <Link
        to="/Homework/Mathematics"
        className="primaryBtn"
        aria-label="Go to Mathematics practice"
        style={{ textDecoration: "none", marginTop: 12, minWidth: 200 }}
      >
        Go to Mathematics
      </Link>
    </div>
  );
}
