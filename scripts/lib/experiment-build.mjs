// Shared build-time helper for the Infinite page-experiments serving layer.
//
// Both the post-build verifier (scripts/build-experiment-artifacts.mjs, run inside the Vercel
// build) and the author tool (scripts/emit-experiment-config.mjs, run once at go-live to produce
// config.mjs) call buildArmsIntoDist so the served bytes are assembled EXACTLY the same way on
// both paths. The order is load-bearing:
//   1. inject the browser client bootstrap into the FINAL built dist/index.html (after
//      prepare-static-deploy's normalizeApexAbsoluteUrls), so every served page — the plain
//      homepage AND both arms — carries the same exposure bootstrap;
//   2. publish the client module to a matcher-excluded static path the arms import;
//   3. run buildExperimentArtifacts with original == control == test == the injected homepage, so
//      the A/A arms are the untouched homepage decorated twice (control_contentSha256 ===
//      original === test_contentSha256) — the builder throws control_is_not_original otherwise.
//
// The decorated per-arm sha256 the builder returns (variants.control.sha256 / variants.test.sha256)
// are the hashes the operator passes to the engine `create` call (--control / --candidate); the
// pre-decoration contentSha256 is what the engine records as control/candidate artifact.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { buildExperimentArtifacts } from "../../lib/infinite-experiments/build-artifacts.mjs";

/** Where the arms import the browser client from. Under /assets/ so the site edge middleware
 * matcher (which excludes assets/) never runs on it and Vercel serves it as a cached static file. */
export const CLIENT_PUBLIC_PATH = "assets/infinite-experiments/client.mjs";

/** The one-line bootstrap injected into every served homepage/arm. It never initialises, resets or
 * reconfigures the site's own analytics and adds NO UI and NO new storage — it reuses the site's
 * EXISTING consent apparatus verbatim: the stored key infinite_analytics_consent and the
 * infinite:analytics-consent-change event that already gate GA4/PostHog/pixel
 * (.github/scripts/inject-analytics.cjs __infiniteConsentGate). consentMode "not_required" mirrors
 * that gate's opt-out model EXACTLY: a fresh visitor with no prior interaction records on load; an
 * explicit stored "denied" or a DNT/GPC signal suppresses the beacon (the client's own decision()
 * reads both). getVisitorId reuses the Infinite pixel's anonymousId (window.__infiniteHandoffContext)
 * so exposure joins the pixel. */
export function clientBootstrapSnippet(siteSourceKey) {
  return [
    '<script type="module">',
    'import { createExperimentClient } from "/assets/infinite-experiments/client.mjs";',
    "createExperimentClient({",
    `  siteSourceKey: ${JSON.stringify(siteSourceKey)},`,
    '  personCookieName: "__Host-infinite-person",',
    // Opt-out, matching the site's not_required analytics policy: enroll/record on load unless the
    // visitor has explicitly opted out (infinite_analytics_consent="denied") or sends DNT/GPC.
    '  consentMode: "not_required",',
    '  consentStorageKey: "infinite_analytics_consent",',
    '  consentCookie: { name: "infinite_experiment_consent", grantedValue: "granted", deniedValue: "denied" },',
    "  getVisitorId: function () {",
    "    try { return typeof window.__infiniteHandoffContext === \"function\" ? ((window.__infiniteHandoffContext() || {}).anonymousId || null) : null; } catch (e) { return null; }",
    "  },",
    "}).loaded();",
    "</script>",
  ].join("\n");
}

/** Definitions carry only the wire fields the engine froze for the revision; sources are always the
 * one built homepage. pagePath is the public page the router rewrites (the homepage is "/"). */
export function definitionsFromManifest(manifest) {
  return manifest.experiments.map((e) => ({
    id: e.id,
    revision: e.revision,
    pagePath: e.pagePath,
    startsAt: e.startsAt,
    enrollmentEndsAt: e.enrollmentEndsAt,
    endsAt: e.endsAt,
    allocationBasisPoints: e.allocationBasisPoints,
    sources: {
      original: distSourceFor(e.pagePath),
      control: distSourceFor(e.pagePath),
      test: distSourceFor(e.pagePath),
    },
  }));
}

/** The built file inside dist that serves a public page. Only "/" (dist/index.html) is supported
 * today; any other page would be dist/<path>/index.html. */
function distSourceFor(pagePath) {
  if (pagePath === "/") return "dist/index.html";
  return `dist${pagePath.replace(/\/$/, "")}/index.html`;
}

/**
 * Injects the client bootstrap into each definition's built page, publishes the client module, then
 * builds the private control/test artifacts into dist. Returns the frozen manifest + written files.
 */
export function buildArmsIntoDist({ repoRoot, distDir, siteSourceKey, siteOrigin, definitions }) {
  if (!/^site_[A-Za-z0-9_-]+$/.test(siteSourceKey || "")) {
    throw new Error("experiment_build: INFINITE_SITE_SOURCE_KEY (site_… pixel key) required to serve an experiment");
  }
  // 1. Inject the bootstrap into every served page (once). </body> is the anchor; the builder masks
  //    <script> as raw text so the injected module survives byte-for-byte into both arms.
  const snippet = clientBootstrapSnippet(siteSourceKey);
  const injected = new Set();
  for (const def of definitions) {
    const pageFile = join(distDir, def.pagePath === "/" ? "index.html" : def.pagePath.replace(/\/$/, "") + "/index.html");
    if (injected.has(pageFile)) continue;
    injected.add(pageFile);
    let html = readFileSync(pageFile, "utf8");
    if (html.includes('/assets/infinite-experiments/client.mjs')) continue; // idempotent
    const marker = "</body>";
    const at = html.lastIndexOf(marker);
    if (at === -1) throw new Error(`experiment_build: no </body> in ${pageFile}`);
    html = html.slice(0, at) + snippet + "\n" + html.slice(at);
    writeFileSync(pageFile, html);
  }
  // 2. Publish the browser client module to the matcher-excluded static path.
  const clientTarget = join(distDir, "assets", "infinite-experiments", "client.mjs");
  mkdirSync(dirname(clientTarget), { recursive: true });
  copyFileSync(join(repoRoot, "lib", "infinite-experiments", "client.mjs"), clientTarget);
  // 3. Build the immutable arms from the (now injected) built pages.
  return buildExperimentArtifacts({
    repoRoot,
    outputDirectory: "dist",
    siteOrigin,
    definitions,
  });
}
