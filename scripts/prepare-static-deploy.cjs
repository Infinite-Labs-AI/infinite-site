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
const homepageCriticalSource = path.join(artifactDir, "homepage-critical.css");
const homepageBundleName = "homepage-20260722.css";
const homepageStylesheets = [
  path.join(repoRoot, "_agent_artifacts", "shared", "glaze-hero.css"),
  path.join(artifactDir, "problem-todesktop.css"),
  path.join(artifactDir, "light-common.css"),
  path.join(artifactDir, "light-sky.css"),
  path.join(artifactDir, "light-sky-polish.css"),
  path.join(artifactDir, "scheme-variants.css"),
];
const homepageStylesheetTags = [
  '<link rel="stylesheet" href="../shared/glaze-hero.css">',
  '<link rel="stylesheet" href="problem-todesktop.css">',
  '<link rel="stylesheet" href="light-common.css">',
  '<link rel="stylesheet" href="light-sky.css">',
  '<link rel="stylesheet" href="light-sky-polish.css?v=final-polish2">',
  '<link rel="stylesheet" href="scheme-variants.css?v=mobile-hero1-belowhero1">',
];

process.env.GOOGLE_ANALYTICS_TAG_ID ||= "G-JE3BZS61FZ";
// PostHog is served FIRST-PARTY through the Vercel reverse proxy (see vercel.json "/ingest"
// rewrites) so ad blockers / tracking-protection can't strip the library. api_host is a RELATIVE
// path, resolved against whatever origin the page loads on (www or apex → no cross-origin). ui_host
// stays the real PostHog host so the toolbar / "open in PostHog" links keep working. The EU region
// now lives in the rewrite destination, not here — verify-live-analytics asserts the proxy resolves.
process.env.POSTHOG_API_HOST ||= "/ingest";
process.env.POSTHOG_UI_HOST ||= "https://eu.posthog.com";
process.env.POSTHOG_PROJECT_TOKEN ||=
  "phc_wUuv4hpsa4jfi6fNSzWU9t3JSKneFHusRunsYenhjndJ";

const deployEntries = [
  "compare",
  "privacy",
  "terms",
  "tools",
  "assets",
  "fonts",
  "favicon-16.png",
  "favicon-32.png",
  "apple-touch-icon.png",
  "logo.png",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
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
const homepageSourceHtml = fs.readFileSync(homepageSource, "utf8");
const inlineHomepageStyles = [...homepageSourceHtml.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(
  (match) => match[1],
);
const homepageCss = bundleHomepageStyles(homepageStylesheets, inlineHomepageStyles);
const homepageCriticalCss = `${fs.readFileSync(homepageCriticalSource, "utf8").trim()}
html[data-scheme="wrangle"] .download-compatibility{max-width:600px;margin:12px auto 0;color:#626b73;font-size:12px;line-height:1.45;text-align:center}
html[data-scheme="wrangle"] .download-compatibility a{color:#2f3032;font-weight:700;text-decoration:underline;text-underline-offset:3px}`;
fs.writeFileSync(path.join(distDir, homepageBundleName), homepageCss);

let homepageHtml = homepageSourceHtml
  .replace(/\s*<style>[\s\S]*?<\/style>/g, "")
  .replaceAll("../../assets/", "assets/")
  .replaceAll("../shared/", "shared/");

for (const [index, tag] of homepageStylesheetTags.entries()) {
  homepageHtml = homepageHtml.replace(
    tag.replace("../shared/", "shared/"),
    index === 0
      ? [
          `<style data-homepage-critical>${homepageCriticalCss}</style>`,
          `<link rel="stylesheet" href="${homepageBundleName}" media="print" onload="this.media='all';this.onload=null">`,
          `<noscript><link rel="stylesheet" href="${homepageBundleName}"></noscript>`,
        ].join("\n  ")
      : "",
  );
}

fs.writeFileSync(path.join(distDir, "index.html"), homepageHtml);

require(path.join(repoRoot, ".github/scripts/inject-analytics.cjs"));
normalizeApexAbsoluteUrls(distDir);

function copyFromArtifact(sourceEntry, targetEntry) {
  copyPath(path.join(artifactDir, sourceEntry), path.join(distDir, targetEntry));
}

function copyPath(source, target) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing deploy entry: ${source}`);
  }

  fs.cpSync(source, target, { recursive: true });
}

function bundleHomepageStyles(sources, inlineStyles) {
  const css = [
    ...inlineStyles,
    ...sources.map((source) => fs.readFileSync(source, "utf8")),
  ].join("\n");
  return minifyCss(css);
}

function minifyCss(css) {
  let output = "";
  let quote = "";
  let escaped = false;
  let pendingSpace = false;

  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];
    const next = css[index + 1];

    if (!quote && char === "/" && next === "*") {
      index = css.indexOf("*/", index + 2);
      if (index === -1) break;
      index += 1;
      pendingSpace = true;
      continue;
    }

    if (quote) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }

    if (char === '"' || char === "'") {
      if (pendingSpace && output && !/[{}:;,>]$/.test(output)) output += " ";
      pendingSpace = false;
      quote = char;
      output += char;
      continue;
    }

    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }

    if (/[{}:;,>]/.test(char)) {
      output = output.trimEnd() + char;
      pendingSpace = false;
      continue;
    }

    if (pendingSpace && output && !/[{}:;,>]$/.test(output)) output += " ";
    pendingSpace = false;
    output += char;
  }

  return output.trim();
}

function normalizeApexAbsoluteUrls(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      normalizeApexAbsoluteUrls(fullPath);
      continue;
    }

    if (!entry.isFile() || ![".html", ".xml", ".txt"].includes(path.extname(entry.name))) {
      continue;
    }

    const original = fs.readFileSync(fullPath, "utf8");
    const normalized = original.replaceAll("https://www.infinite.fast", "https://infinite.fast");

    if (normalized !== original) {
      fs.writeFileSync(fullPath, normalized);
    }
  }
}
