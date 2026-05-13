const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "..", "public", "data", "artworks.json");

if (fs.existsSync(dataPath)) {
  const stats = fs.statSync(dataPath);
  if (stats.size > 1000) {
    console.log(`[ensure-data] artworks.json exists (${stats.size} bytes), skipping Python pipeline`);
    process.exit(0);
  }
}

console.log("[ensure-data] Running Python agent pipeline...");
try {
  execSync("python agents/orchestrator.py", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    timeout: 120000,
  });
  console.log("[ensure-data] Pipeline complete");
} catch (err) {
  console.warn("[ensure-data] Python pipeline failed (expected on Vercel build):", err.message);
  if (!fs.existsSync(dataPath) || fs.statSync(dataPath).size < 100) {
    console.error("[ensure-data] No valid artworks.json found. Deploying with minimal data.");
  }
}
