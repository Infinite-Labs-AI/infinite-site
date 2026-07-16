const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const distDir = path.join(repoRoot, "dist");

process.env.GOOGLE_ANALYTICS_TAG_ID ||= "G-JE3BZS61FZ";
process.env.POSTHOG_API_HOST ||= "https://eu.i.posthog.com";
process.env.POSTHOG_PROJECT_TOKEN ||=
  "phc_wUuv4hpsa4jfi6fNSzWU9t3JSKneFHusRunsYenhjndJ";

const deployEntries = [
  "index.html",
  "privacy",
  "terms",
  "assets",
  "fonts",
  "favicon-16.png",
  "favicon-32.png",
  "apple-touch-icon.png",
  "logo.png",
  "LICENSE",
];

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const entry of deployEntries) {
  const source = path.join(repoRoot, entry);
  const target = path.join(distDir, entry);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing deploy entry: ${entry}`);
  }

  fs.cpSync(source, target, { recursive: true });
}

require(path.join(repoRoot, ".github/scripts/inject-analytics.cjs"));
