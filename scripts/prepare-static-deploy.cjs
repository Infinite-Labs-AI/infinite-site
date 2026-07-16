const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const distDir = path.join(repoRoot, "dist");
const artifactDir = path.join(
  repoRoot,
  "_agent_artifacts",
  "infinite-option-4-desktop-tokens",
);
const homepageSource = path.join(artifactDir, "index-scheme-wrangle.html");

process.env.GOOGLE_ANALYTICS_TAG_ID ||= "G-JE3BZS61FZ";
process.env.POSTHOG_API_HOST ||= "https://eu.i.posthog.com";
process.env.POSTHOG_PROJECT_TOKEN ||=
  "phc_wUuv4hpsa4jfi6fNSzWU9t3JSKneFHusRunsYenhjndJ";

const deployEntries = [
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

if (!fs.existsSync(homepageSource)) {
  throw new Error(`Missing homepage source: ${homepageSource}`);
}

for (const entry of deployEntries) {
  const source = path.join(repoRoot, entry);
  const target = path.join(distDir, entry);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing deploy entry: ${entry}`);
  }

  fs.cpSync(source, target, { recursive: true });
}

copyFromArtifact("assets", "assets");
copyFromArtifact("logos", "logos");
copyFromArtifact("problem-todesktop.css", "problem-todesktop.css");
copyFromArtifact("light-common.css", "light-common.css");
copyFromArtifact("light-sky.css", "light-sky.css");
copyFromArtifact("light-sky-polish.css", "light-sky-polish.css");
copyFromArtifact("scheme-variants.css", "scheme-variants.css");
copyFromRepo("_agent_artifacts/shared", "shared");

const homepageHtml = fs
  .readFileSync(homepageSource, "utf8")
  .replaceAll("../../assets/", "assets/")
  .replaceAll("../shared/", "shared/");

fs.writeFileSync(path.join(distDir, "index.html"), homepageHtml);

require(path.join(repoRoot, ".github/scripts/inject-analytics.cjs"));

function copyFromArtifact(sourceEntry, targetEntry) {
  copyPath(path.join(artifactDir, sourceEntry), path.join(distDir, targetEntry));
}

function copyFromRepo(sourceEntry, targetEntry) {
  copyPath(path.join(repoRoot, sourceEntry), path.join(distDir, targetEntry));
}

function copyPath(source, target) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing deploy entry: ${source}`);
  }

  fs.cpSync(source, target, { recursive: true });
}
