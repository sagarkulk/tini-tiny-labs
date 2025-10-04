import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        textAlign: "center",
      }}
    >
      <h1 style={{ marginBottom: "16px" }}>Welcome to Homework</h1>
      <Link
        to="/Homework/Mathematics"
        style={{
          textDecoration: "none",
          background: "#2563eb",
          color: "white",
          padding: "10px 20px",
          borderRadius: "8px",
          fontWeight: "600",
        }}
      >
        Go to Mathematics
      </Link>
    </div>
  );
}
