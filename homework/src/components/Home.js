import React from "react";
import { Link } from "react-router-dom";
import { routesConfig } from "../routesConfig"; // ✅ shared route definitions
import "../components/styles/App.Home.css";

export default function Home() {
  // Only show routes flagged to appear on the home page
  const homeRoutes = routesConfig.filter(r => r.showOnHome);

  return (
    <div className="homeWrap">
      <h1 className="homeTitle">Let's Practice</h1>
      <p className="homeSubtitle">
        Learn, solve, and play — anytime, anywhere.
      </p>

      {homeRoutes.map(route => (
        <Link
          key={route.path}
          to={route.path}
          className="primaryBtn homeBtn"
          aria-label={route.label}
          title={route.label}
        >
          <div className="btnText">
            <span>{route.label}</span>
            {route.description && (
              <span className="btnSub">{route.description}</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
