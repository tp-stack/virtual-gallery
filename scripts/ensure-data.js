const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "..", "public", "data", "artworks.json");

if (process.env.SKIP_ENSURE_DATA === "1") {
  console.log("[ensure-data] SKIP_ENSURE_DATA=1, skipping local artwork generation");
  process.exit(0);
}

if (fs.existsSync(dataPath)) {
  const stats = fs.statSync(dataPath);
  if (stats.size > 1000) {
    const mb = (stats.size / 1024 / 1024).toFixed(1);
    console.log(`[ensure-data] artworks.json exists (${mb} MB), skipping Python pipeline`);
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
  console.warn("[ensure-data] Python pipeline failed:", err.message);
  if (!fs.existsSync(dataPath) || fs.statSync(dataPath).size < 100) {
    console.error("[ensure-data] No valid artworks.json found.");
  }
}
