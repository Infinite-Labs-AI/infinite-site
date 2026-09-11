const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = process.cwd();
const distDir = path.join(repoRoot, "dist");
// The option-4 artifact dir remains the shared asset library (favicons, social preview,
// logos) the AEO head references. The homepage HTML + its page CSS/JS now live in the
// capability workspace (the solar design), sourced under the SAME filename the build has
// always called the homepage.
const artifactDir = path.join(
  repoRoot,
  "_agent_artifacts",
  "infinite-option-4-desktop-tokens",
);
const homepageDir = path.join(
  repoRoot,
  "_agent_artifacts",
  "infinite-capability-workspace",
);
const homepageSource = path.join(homepageDir, "index-scheme-wrangle.html");
const homepageBundleName = "homepage-20260908-solar.css";
// Above-the-fold: the hero + nav critical styles. solar keeps these in its inline <style>
// blocks; trail.css adds the hero's signal/possibility layer — both inline as critical CSS so
// the first paint never blocks on an external stylesheet and never flashes unstyled.
const homepageCriticalStylesheets = [path.join(homepageDir, "trail.css")];
// Below-the-fold sections: bundled into one stylesheet loaded non-render-blocking (media=print
// swap) after first paint. space-worlds styles the retired world picker (inert) but ships in the
// same deferred lane so nothing about it can block paint.
const homepageBundleStylesheets = [
  path.join(homepageDir, "workspace.css"),
  path.join(homepageDir, "proof.css"),
  path.join(homepageDir, "space-worlds.css"),
  path.join(homepageDir, "stories.css"),
  path.join(homepageDir, "growth.css"),
];
// solar loads these page scripts sibling-relative; they travel to the dist root next to index.html.
const homepageScripts = [
  "trail.js",
  "workspace.js",
  "space-worlds.js",
  "stories.js",
  "growth.js",
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
// The Meta pixel has NO default here on purpose. It bootstraps only when INFINITE_META_PIXEL_ID (the
// numeric Pixel/Dataset ID from Meta Events Manager → Data sources → the infinite.fast pixel → Settings)
// is set on the site's Vercel project; the injector validates the shape and fails the build on anything
// else. Absent ⇒ no fbq, no connect.facebook.net request, and /get-started's CompleteRegistration dedup
// mirror is a guarded no-op. Never add a fallback id: a placeholder pixel sends every event into nowhere.

const deployEntries = [
  "agents",
  "compare",
  "pricing",
  "get-started",
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
// solar's page scripts sit at the dist root next to index.html (loaded sibling-relative).
for (const script of homepageScripts) {
  copyPath(path.join(homepageDir, script), path.join(distDir, script));
}

const homepageSourceHtml = fs.readFileSync(homepageSource, "utf8");

// Critical (above-fold): solar's inline <style> blocks + the hero's trail.css, minified and
// inlined so first paint never blocks on — nor flashes without — an external stylesheet. The
// [^>]* allows <style id="font-study-styles">, which a bare /<style>/ would miss.
const inlineHomepageStyles = [
  ...homepageSourceHtml.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g),
].map((match) => match[1]);
const homepageCriticalCss = bundleHomepageStyles(homepageCriticalStylesheets, inlineHomepageStyles);

// Deferred (below-fold): the section stylesheets minified into one bundle, loaded after paint.
const homepageCss = bundleHomepageStyles(homepageBundleStylesheets, []);
fs.writeFileSync(path.join(distDir, homepageBundleName), homepageCss);

// Strip every inline <style> block and every page stylesheet <link>, then inject the inlined
// critical CSS + the deferred bundle where the first page stylesheet was. solar's asset refs are
// already root-relative (/assets, /fonts), so no path rewrite is needed.
let homepageHtml = homepageSourceHtml.replace(/\s*<style\b[^>]*>[\s\S]*?<\/style>/g, "");

const homepageLinkTags = [
  ...homepageHtml.matchAll(/<link rel="stylesheet" href="[^"]+\.css[^"]*">/g),
].map((match) => match[0]);
const criticalInjection = [
  `<style data-homepage-critical>${homepageCriticalCss}</style>`,
  `<link rel="stylesheet" href="${homepageBundleName}" media="print" onload="this.media='all';this.onload=null">`,
  `<noscript><link rel="stylesheet" href="${homepageBundleName}"></noscript>`,
].join("\n  ");
for (const [index, tag] of homepageLinkTags.entries()) {
  homepageHtml = homepageHtml.replace(tag, index === 0 ? criticalInjection : "");
}

fs.writeFileSync(path.join(distDir, "index.html"), homepageHtml);

// The growth pages ship from the capability workspace. Each becomes a directory index so the
// middleware manifest can canonicalize its path, and its page-local CSS/JS travel into the same
// directory — which is why those references stay sibling-relative while shared fonts and images
// are root-relative. Runs BEFORE inject-analytics so these pages get the same analytics treatment
// as every other page.
const growthSourceDir = path.join(repoRoot, "_agent_artifacts/infinite-capability-workspace");
const growthPages = [{ dir: "audit", html: "audit.html", assets: ["audit-page.css", "audit-page.js"] }];

for (const page of growthPages) {
  const targetDir = path.join(distDir, page.dir);
  fs.mkdirSync(targetDir, { recursive: true });
  copyPath(path.join(growthSourceDir, page.html), path.join(targetDir, "index.html"));
  for (const asset of page.assets) {
    copyPath(path.join(growthSourceDir, asset), path.join(targetDir, asset));
  }
}

// The two launch-video pages are generated from the public dataset rather than written by hand.
// Runs BEFORE inject-analytics so the generated HTML gets the same analytics + apex-URL treatment
// as every other page, and as a child process because this file is CJS and the builder is ESM.
execFileSync(process.execPath, [path.join(repoRoot, "scripts/build-launch-videos.mjs"), distDir], {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit",
});

execFileSync(process.execPath, [path.join(repoRoot, "scripts/apply-site-graph.mjs"), distDir], {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit",
});

execFileSync(process.execPath, [path.join(repoRoot, ".github/scripts/inject-analytics.cjs")], {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit",
});
normalizeApexAbsoluteUrls(distDir);

// LAST: the Infinite page-experiments post-build step. It runs on the fully assembled, analytics-
// injected, apex-normalized dist/index.html — buildExperimentArtifacts must see the exact final
// bytes a visitor receives. With the shipped empty manifest it only verifies config.mjs and builds
// nothing (the site is byte-for-byte unchanged); once an experiment is authored it injects the
// exposure client and builds the immutable control/test arms into dist. Runs as an ESM child
// because this file is CJS.
execFileSync(process.execPath, [path.join(repoRoot, "scripts/build-experiment-artifacts.mjs")], {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit",
});

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
