import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { serveDatasetFixture } from "./fixtures/launch-videos-dataset.mjs";

const repoRoot = new URL("../..", import.meta.url).pathname;
const distDir = join(repoRoot, "dist");

// The deploy build generates the launch-video pages from the public dataset. Point it at a local
// fixture so this contract tests OUR build, not the app's uptime.
const dataset = await serveDatasetFixture();

try {
  execFileSync("node", [join(repoRoot, "scripts/prepare-static-deploy.cjs")], {
    cwd: repoRoot,
    env: {
      ...process.env,
      INFINITE_PRODUCTION_HOSTS: "infinite.fast,www.infinite.fast",
      INFINITE_SITE_SOURCE_ARTIFACT: JSON.stringify({
        siteSourceKey: "site_production_dormant",
        collectPath: "/infinite/ledger",
        productionHosts: ["infinite.fast", "www.infinite.fast"],
        staticProxy: "vercel",
      }),
      VERCEL_ENV: "production",
      LAUNCH_VIDEOS_DATASET_URL: dataset.url,
    },
    stdio: "pipe",
  });

  const homepage = readFileSync(join(distDir, "index.html"), "utf8");
  assert.doesNotMatch(homepage, /https:\/\/www\.infinite\.fast/);
  assert.match(homepage, /https:\/\/infinite\.fast\/#organization/);
  assert.match(homepage, /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-JE3BZS61FZ/);
  assert.equal((homepage.match(/data-infinite-runtime="managed"/g) ?? []).length, 1);
  assert.equal((homepage.match(/posthog\.init\s*\(/g) ?? []).length, 1);
  assert.match(homepage, /"collectPath":"\/infinite\/ledger"/);
  assert.doesNotMatch(homepage, /"siteSourceKey":/);
  assert.doesNotMatch(homepage, /send_page_view:\s*false/);
  assert.doesNotMatch(homepage, /data-infinite-consent-controller="managed"/);
  assert.match(homepage, /"consent":\{"mode":"not_required"\}/);
  assert.match(homepage, /gtag\("event", "app_download_clicked"/);
  assert.doesNotMatch(homepage, /transport_url/);
  assert.match(homepage, /<style data-homepage-critical>/);
  assert.equal((homepage.match(/<style\b/g) ?? []).length, 1, "only critical CSS may block first paint");
  assert.doesNotMatch(homepage, /(?:glaze-hero|problem-todesktop|light-common|light-sky|scheme-variants)\.css/);
  assert.doesNotMatch(homepage, /homepage-20260722\.css/);
  assert.doesNotMatch(homepage, /homepage-20260728-trust-logos\.css/);
  assert.doesNotMatch(homepage, /homepage-20260728-brand-logos\.css/);
  assert.doesNotMatch(homepage, /homepage-20260729-spade-logos\.css/);
  assert.doesNotMatch(homepage, /<link rel="preload" href="homepage-20260729-founder-x-posts\.css" as="style">/);
  assert.match(homepage, /<link rel="stylesheet" href="homepage-20260729-founder-x-posts\.css" media="print" onload="this\.media='all';this\.onload=null">/);
  assert.doesNotMatch(homepage, /\.ttf["')]/);

  const criticalCss = homepage.match(/<style data-homepage-critical>([\s\S]*?)<\/style>/)?.[1] ?? "";
  assert.match(criticalCss, /data-scheme=(?:["']wrangle["']|wrangle)/);
  assert.match(criticalCss, /download-compatibility/);
  assert.ok(criticalCss.length > 20_000 && criticalCss.length < 50_000, "critical CSS must cover both target viewports without embedding the full bundle");

  const homepageCss = readFileSync(join(distDir, "homepage-20260729-founder-x-posts.css"), "utf8");
  assert.match(homepageCss, /data-scheme=(?:["']wrangle["']|wrangle)/);
  assert.match(homepageCss, /fonts\/ibm-plex\/ibm-plex-sans-400\.woff2/);
  assert.ok(homepageCss.length > 180_000, "deferred homepage bundle must contain inline and external source styles");

  const sitemap = readFileSync(join(distDir, "sitemap.xml"), "utf8");
  assert.doesNotMatch(sitemap, /https:\/\/www\.infinite\.fast/);
  assert.match(sitemap, /<loc>https:\/\/infinite\.fast\/<\/loc>/);

  // Consent gating: GA4 and PostHog defer through the shared gate, the gate is defined
  // before the first gated snippet, the download bridge guards on gtag availability, and
  // the banner is host-gated to the verified production hosts with the manual
  // revocation hook exposed. (Production builds carry no X/Meta pixels → 2 gated lanes.)
  assert.match(homepage, /window\.__infiniteConsentGate = function/);
  assert.equal((homepage.match(/window\.__infiniteConsentGate\(function/g) ?? []).length, 2, "PostHog and GA4 must both defer through the shared consent gate");
  assert.ok(
    homepage.indexOf("window.__infiniteConsentGate = function") < homepage.indexOf("posthog.init("),
    "the consent gate must be defined before the first gated snippet",
  );
  assert.match(homepage, /typeof window\.gtag !== "function"/);
  assert.match(homepage, /window\.infinitePrivacyChoices/);
  assert.match(homepage, /var hosts = \["infinite\.fast","www\.infinite\.fast"\]/);

  // ── Download-CTA placement coverage (audit report-05 finding 8) ──────────────────────────
  // Every /download CTA in the BUILT output must carry a placement marker
  // (data-download-location or data-analytics-cta-location), or "which button produces
  // attempts" is unanswerable for that CTA — the runtime emits app_download_click with no
  // cta_location and the CTA rollup can't attribute it. Enumerating the built dist covers
  // static pages AND client-rendered templates alike (assets/seo-tools.js renders its
  // "Get Infinite" button from a JS template string, which is exactly how the markerless
  // CTA shipped unnoticed). A future markerless CTA fails HERE, not in production data.
  const PLACEMENT_ATTR = /data-(?:download-location|analytics-cta-location)="[A-Za-z0-9_-]{1,64}"/;
  let htmlDownloadCtas = 0;
  let assetDownloadCtas = 0;
  for (const file of walkFiles(distDir)) {
    const isHtml = file.endsWith(".html");
    const isAssetJs = file.endsWith(".js");
    if (!isHtml && !isAssetJs) continue;
    const body = readFileSync(file, "utf8");
    for (const anchor of body.match(/<a\b[^>]*href="\/download"[^>]*>/g) ?? []) {
      if (isHtml) htmlDownloadCtas++;
      else assetDownloadCtas++;
      assert.match(
        anchor,
        PLACEMENT_ATTR,
        `${file.slice(distDir.length)}: /download CTA without a placement marker — add data-download-location="<token>" so the CTA rollup can attribute its clicks: ${anchor}`,
      );
    }
  }
  // Non-vacuous: the enumeration must actually SEE the known CTA populations, or a pattern
  // drift (attribute rename, template refactor) would silently disable this whole check.
  assert.ok(htmlDownloadCtas >= 3, `expected the built pages to carry several /download CTAs, found ${htmlDownloadCtas}`);
  assert.ok(assetDownloadCtas >= 1, `expected at least one client-rendered /download CTA in built assets (seo-tools.js), found ${assetDownloadCtas}`);

  // The middleware document manifest must exactly match the deployed HTML page set —
  // adding (or removing) a page without updating middleware.js breaks CI here, not
  // the production pageview lane.
  const { KNOWN_DOCUMENT_PATHS } = await import(new URL("../../middleware.js", import.meta.url));
  assert.deepEqual(
    [...KNOWN_DOCUMENT_PATHS].sort(),
    htmlDocumentPaths(distDir).sort(),
    "middleware.js KNOWN_DOCUMENT_PATHS must exactly match the built dist HTML page set — update the manifest whenever a document page is added or removed",
  );
} finally {
  dataset.close();
  rmSync(distDir, { recursive: true, force: true });
}

function walkFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(full));
    else files.push(full);
  }
  return files;
}

function htmlDocumentPaths(dir, prefix = "/") {
  const paths = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      paths.push(...htmlDocumentPaths(join(dir, entry.name), `${prefix}${entry.name}/`));
    } else if (entry.name.endsWith(".html")) {
      assert.equal(
        entry.name,
        "index.html",
        `${prefix}${entry.name}: document pages must be directory index.html files so the middleware manifest can canonicalize them`,
      );
      paths.push(prefix);
    }
  }
  return paths;
}
