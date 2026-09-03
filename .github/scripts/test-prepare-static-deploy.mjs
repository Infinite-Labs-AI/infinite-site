import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { serveDatasetFixture } from "./fixtures/launch-videos-dataset.mjs";
import {
  KNOWN_DOCUMENT_PATHS as MANIFEST_DOCUMENT_PATHS,
  assertPublicSiteManifest,
} from "../../scripts/lib/public-site-manifest.mjs";

const repoRoot = new URL("../..", import.meta.url).pathname;
const distDir = join(repoRoot, "dist");

// The deploy build generates the launch-video pages from the public dataset. Point it at a local
// fixture so this contract tests OUR build, not the app's uptime.
const dataset = await serveDatasetFixture();

const productionBuildEnv = {
  INFINITE_PRODUCTION_HOSTS: "infinite.fast,www.infinite.fast",
  INFINITE_SITE_SOURCE_ARTIFACT: JSON.stringify({
    siteSourceKey: "site_production_dormant",
    collectPath: "/infinite/ledger",
    productionHosts: ["infinite.fast", "www.infinite.fast"],
    staticProxy: "vercel",
  }),
  VERCEL_ENV: "production",
  LAUNCH_VIDEOS_DATASET_URL: dataset.url,
  // The Meta pixel is DARK until the founder sets INFINITE_META_PIXEL_ID on the Vercel project.
  // Pin it empty here so a developer's shell can't light it, and set the RETIRED name to its old
  // placeholder to prove that name (and that id) can never ship a pixel again.
  INFINITE_META_PIXEL_ID: "",
  META_PIXEL_ID: "1234567890",
};

function buildProductionDist(extraEnv = {}) {
  execFileSync("node", [join(repoRoot, "scripts/prepare-static-deploy.cjs")], {
    cwd: repoRoot,
    env: { ...process.env, ...productionBuildEnv, ...extraEnv },
    stdio: "pipe",
  });
}

try {
  assertPublicSiteManifest();
  buildProductionDist();

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
  assert.deepEqual(blockingStylesheetLinks(homepage), [], "homepage must not include render-blocking stylesheet links");
  assert.doesNotMatch(homepage, /(?:glaze-hero|problem-todesktop|light-common|light-sky|scheme-variants)\.css/);
  assert.doesNotMatch(homepage, /homepage-20260722\.css/);
  assert.doesNotMatch(homepage, /homepage-20260728-trust-logos\.css/);
  assert.doesNotMatch(homepage, /homepage-20260728-brand-logos\.css/);
  assert.doesNotMatch(homepage, /homepage-20260729-spade-logos\.css/);
  assert.doesNotMatch(homepage, /<link rel="preload" href="homepage-20260729-founder-x-posts\.css" as="style">/);
  assert.match(homepage, /<link rel="stylesheet" href="homepage-20260729-founder-x-posts\.css" media="print" onload="this\.media='all';this\.onload=null">/);
  assert.match(homepage, /<link rel="stylesheet" href="\/assets\/site-footer\.css" media="print" onload="this\.media='all';this\.onload=null">/);
  assert.doesNotMatch(homepage, /\.ttf["')]/);

  const criticalCss = homepage.match(/<style data-homepage-critical>([\s\S]*?)<\/style>/)?.[1] ?? "";
  assert.match(criticalCss, /data-scheme=(?:["']wrangle["']|wrangle)/);
  assert.match(criticalCss, /download-compatibility/);
  assert.ok(criticalCss.length > 20_000 && criticalCss.length < 50_000, "critical CSS must cover both target viewports without embedding the full bundle");

  const homepageCss = readFileSync(join(distDir, "homepage-20260729-founder-x-posts.css"), "utf8");
  assert.match(homepageCss, /data-scheme=(?:["']wrangle["']|wrangle)/);
  assert.match(homepageCss, /fonts\/ibm-plex\/ibm-plex-sans-400\.woff2/);
  assert.ok(homepageCss.length > 180_000, "deferred homepage bundle must contain inline and external source styles");
  const siteFooterCss = readFileSync(join(distDir, "assets/site-footer.css"), "utf8");
  assert.match(siteFooterCss, /\.public-site-footer\b/, "dist must carry the shared site footer CSS asset");

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

  // ── Meta pixel: dark until configured ────────────────────────────────────────────────────────
  // Without INFINITE_META_PIXEL_ID no page carries a pixel bootstrap, a connect.facebook.net
  // reference, or the fbevents loader — so the browser never contacts Meta. /get-started's dedup
  // mirror references window.fbq behind a typeof guard, which is why the sweep targets the
  // bootstrap + network bytes rather than the bare token; the homepage has no fbq token at all.
  for (const file of walkFiles(distDir)) {
    if (!file.endsWith(".html")) continue;
    assert.doesNotMatch(
      readFileSync(file, "utf8"),
      /fbq\("init"|connect\.facebook\.net|fbevents\.js|Meta Pixel Code/,
      `${file.slice(distDir.length)}: no Meta pixel bytes may ship without INFINITE_META_PIXEL_ID (the retired META_PIXEL_ID name is inert)`,
    );
  }
  assert.doesNotMatch(homepage, /fbq/, "the homepage carries no fbq reference at all when the pixel is unconfigured");
  const darkGate = readFileSync(join(distDir, "get-started/index.html"), "utf8");
  assert.match(darkGate, /typeof window\.fbq !== "function"/, "the gate's dedup mirror stays a guarded no-op when the pixel never loaded");
  assert.doesNotMatch(darkGate, /fbq\("init"/);

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
    [...MANIFEST_DOCUMENT_PATHS].sort(),
    "middleware.js KNOWN_DOCUMENT_PATHS must be imported from the public site manifest",
  );
  assert.deepEqual(
    [...KNOWN_DOCUMENT_PATHS].sort(),
    htmlDocumentPaths(distDir).sort(),
    "middleware.js KNOWN_DOCUMENT_PATHS must exactly match the built dist HTML page set — update the manifest whenever a document page is added or removed",
  );

  // ── Meta pixel: lit ONLY by INFINITE_META_PIXEL_ID ───────────────────────────────────────────
  // A second production build with the real-shaped id: every page bootstraps the pixel with that
  // exact id inside the shared consent gate (third gated lane), and /get-started carries it too so
  // window.fbq exists for the CompleteRegistration dedup mirror after a claim mints.
  const META_PIXEL_ID = "123456789012345";
  buildProductionDist({ INFINITE_META_PIXEL_ID: META_PIXEL_ID });
  const litHomepage = readFileSync(join(distDir, "index.html"), "utf8");
  assert.match(litHomepage, new RegExp(`fbq\\("init", "${META_PIXEL_ID}"\\)`), "the configured id reaches the pixel bootstrap");
  assert.equal((litHomepage.match(/fbq\("init"/g) ?? []).length, 1, "exactly one pixel bootstrap per page");
  assert.match(litHomepage, /https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/);
  assert.equal((litHomepage.match(/window\.__infiniteConsentGate\(function/g) ?? []).length, 3, "PostHog, GA4 and the Meta pixel must all defer through the shared consent gate");
  assert.ok(
    litHomepage.indexOf("window.__infiniteConsentGate = function") < litHomepage.indexOf('fbq("init"'),
    "the consent gate must be defined before the pixel bootstrap",
  );
  assert.doesNotMatch(litHomepage, /1234567890"/, "the retired placeholder id never ships, even when the pixel is configured");
  const litGate = readFileSync(join(distDir, "get-started/index.html"), "utf8");
  assert.match(litGate, new RegExp(`fbq\\("init", "${META_PIXEL_ID}"\\)`), "the gate page carries the same pixel so the dedup mirror has a window.fbq to call");
  assert.equal((litGate.match(/fbq\("init"/g) ?? []).length, 1);
  assert.match(litGate, /window\.fbq\("track", "CompleteRegistration", \{\}, \{ eventID: /, "the built gate page still carries the dedup mirror");
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

function blockingStylesheetLinks(html) {
  const scriptEnabledHtml = html.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "");
  return (scriptEnabledHtml.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi) ?? []).filter(
    (link) => !/\bmedia=["']print["']/i.test(link) && !/\bdisabled\b/i.test(link),
  );
}
