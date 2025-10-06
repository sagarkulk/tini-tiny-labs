// scripts/preroute.js
// Copies build/index.html into real route folders so GitHub Pages returns 200.

const fs = require("fs");
const path = require("path");

const buildDir = path.join(__dirname, "..", "build");
const indexSrc = path.join(buildDir, "index.html");

// List every public route you want to be a hard 200
const routes = [
    "",                        // root
    "homework"
];

if (!fs.existsSync(buildDir)) throw new Error("build/ not found. Run the build first.");
if (!fs.existsSync(indexSrc)) throw new Error("build/index.html not found.");

for (const r of routes) {
    const destDir = path.join(buildDir, r);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(indexSrc, path.join(destDir, "index.html"));
    console.log("Created:", path.join(r || ".", "index.html"));
}
