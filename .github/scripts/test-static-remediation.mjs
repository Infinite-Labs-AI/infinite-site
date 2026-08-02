import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const MAIN_SITE_FILES = [
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "privacy/index.html",
  "terms/index.html",
  "tools/index.html",
  "compare/index.html",
];

for (const file of MAIN_SITE_FILES) {
  const body = read(file);
  assert.doesNotMatch(
    body,
    /https:\/\/www\.infinite\.fast/,
    `${file} must use apex infinite.fast for main-site absolute URLs`,
  );
}

const robots = read("robots.txt");
assert.match(robots, /^Sitemap: https:\/\/infinite\.fast\/sitemap\.xml$/m);

const llms = read("llms.txt");
assert.match(llms, /^Canonical site: https:\/\/infinite\.fast\/$/m);
assert.match(llms, /^Tools: https:\/\/infinite\.fast\/tools\/$/m);
assert.match(llms, /^Comparisons: https:\/\/infinite\.fast\/compare\/$/m);
assert.match(llms, /^Download: https:\/\/infinite\.fast\/download$/m);
assert.match(llms, /^Blog: https:\/\/blog\.infinite\.fast\/$/m);

const sitemap = read("sitemap.xml");
assert.doesNotMatch(sitemap, /https:\/\/www\.infinite\.fast/);

const expectedLastmodByPath = new Map([
  ["/", "2026-07-22"],
  ["/tools/", "2026-07-22"],
  ["/tools/high-intent-lead-finder-template/", "2026-07-22"],
  ["/tools/seo-geo-brief-generator/", "2026-07-22"],
  ["/tools/landing-page-ab-test-ideas-generator/", "2026-07-22"],
  ["/tools/founder-content-ideas-generator/", "2026-07-22"],
  ["/compare/", "2026-07-22"],
  ["/compare/infinite-vs-okara/", "2026-07-22"],
  ["/compare/infinite-vs-ploy/", "2026-07-22"],
  ["/compare/infinite-vs-blaze/", "2026-07-22"],
  ["/privacy/", "2026-07-22"],
  ["/terms/", "2026-07-22"],
]);

const urlBlocks = [...sitemap.matchAll(/<url>\s*<loc>(https:\/\/infinite\.fast[^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)];
assert.equal(urlBlocks.length, expectedLastmodByPath.size, "sitemap should contain exactly the expected apex URLs");

for (const [, url, lastmod] of urlBlocks) {
  const path = new URL(url).pathname;
  assert.equal(lastmod, expectedLastmodByPath.get(path), `${path} has an honest per-route lastmod`);
}

const vercel = JSON.parse(read("vercel.json"));
assert.equal(vercel.installCommand, "npm ci");
const rewrites = vercel.rewrites ?? [];
assert.equal(
  rewrites.some((rewrite) => String(rewrite.source).startsWith("/gtm")),
  false,
  "GA4 must not use the unproven /gtm relative transport proxy",
);
assert.deepEqual(
  rewrites.find((rewrite) => rewrite.source === "/infinite/events/collect"),
  {
    source: "/infinite/events/collect",
    destination: "https://api.ultima.inc/api/analytics/events/collect",
  },
  "Infinite browser events must use the exact same-origin public collect rewrite",
);
assert.equal(existsSync(new URL("../../api/download.js", import.meta.url)), false, "the native /download redirect must not become a function");
assert.equal(existsSync(new URL("../workflows/deploy-pages.yml", import.meta.url)), false, "Vercel is the only production host");

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.private, true);
assert.equal(packageJson.type, "module");
assert.deepEqual(packageJson.devDependencies, {
  "@vercel/functions": "3.7.6",
  "infinite-tag": "0.3.0",
});
assert.match(read(".gitignore"), /^node_modules\/$/m);

const injector = read(".github/scripts/inject-analytics.cjs");
assert.match(injector, /await import\("infinite-tag"\)/);
assert.doesNotMatch(injector, /_1BU|\/api\/events\/track|custom_app_download_redirect|appDownloadTrackingSnippet|link_text/);
const deployPreparation = read("scripts/prepare-static-deploy.cjs");
assert.match(deployPreparation, /execFileSync\(process\.execPath, \[path\.join\(repoRoot, "\.github\/scripts\/inject-analytics\.cjs"\)\]/);
assert.doesNotMatch(deployPreparation, /require\(path\.join\(repoRoot, "\.github\/scripts\/inject-analytics\.cjs"\)\)/);

const homepage = read("_agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html");
assert.match(homepage, /data-analytics-cta-id="view-pricing" data-analytics-cta-location="navigation"/);
assert.match(homepage, /href="\/download" data-download-location="hero"/);

const privacy = read("privacy/index.html");
assert.match(privacy, /Website visitor analytics/i);
assert.match(privacy, /90 days/i);
assert.match(privacy, /25 months/i);
assert.match(privacy, /Do Not Track.*Global Privacy Control|Global Privacy Control.*Do Not Track/is);
assert.match(privacy, /server.*request.*redirect.*not controlled by.*browser consent/is);
assert.doesNotMatch(privacy, /We do not host, receive, store, or have access to that data\./);

const guardrail = read("docs/ANALYTICS-GUARDRAIL.md");
assert.match(guardrail, /same-origin.*synthetic.*receipt/is);
assert.match(guardrail, /does not prove.*100%|not.*100% capture/is);
assert.match(read("docs/runbooks/vercel-analytics-drain.md"), /disabled.*Task 14.*Task 15/is);
assert.match(read("docs/analytics/first-party-ledger-contract.md"), /95af1293de230506f107ec526f53e132a81de87c/);

const headers = vercel.headers?.find((entry) => entry.source === "/(.*)")?.headers ?? [];
const headerValue = (key) => headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;

assert.equal(headerValue("Content-Security-Policy-Report-Only"), undefined);
assert.match(headerValue("Content-Security-Policy") ?? "", /frame-ancestors 'none'/);
assert.match(headerValue("Content-Security-Policy") ?? "", /report-uri \/api\/csp-report/);
assert.match(headerValue("Content-Security-Policy") ?? "", /report-to csp-endpoint/);
assert.doesNotMatch(headerValue("Content-Security-Policy") ?? "", /fonts\.(?:googleapis|gstatic)\.com/);
assert.match(headerValue("Reporting-Endpoints") ?? "", /csp-endpoint="https:\/\/infinite\.fast\/api\/csp-report"/);
assert.match(headerValue("Report-To") ?? "", /"group":"csp-endpoint"/);
assert.equal(headerValue("X-Content-Type-Options"), "nosniff");
assert.equal(headerValue("Referrer-Policy"), "strict-origin-when-cross-origin");
assert.match(headerValue("Permissions-Policy") ?? "", /camera=\(\)/);
assert.equal(headerValue("Strict-Transport-Security"), "max-age=31536000; includeSubDomains");

const homepageCssHeaders =
  vercel.headers?.find((entry) => entry.source === "/homepage-20260729-founder-x-posts.css")?.headers ?? [];
assert.equal(
  homepageCssHeaders.find((header) => header.key === "Cache-Control")?.value,
  "public, max-age=31536000, immutable",
);

for (const source of ["/assets/(.*)", "/logos/(.*)", "/fonts/(.*)"]) {
  const cacheHeaders = vercel.headers?.find((entry) => entry.source === source)?.headers ?? [];
  assert.equal(
    cacheHeaders.find((header) => header.key === "Cache-Control")?.value,
    "public, max-age=604800, stale-while-revalidate=86400",
  );
}
