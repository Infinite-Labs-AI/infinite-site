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
  ["/agents/", "2026-08-17"],
  ["/tools/", "2026-07-22"],
  ["/tools/high-intent-lead-finder-template/", "2026-07-22"],
  ["/tools/seo-geo-brief-generator/", "2026-07-22"],
  ["/tools/landing-page-ab-test-ideas-generator/", "2026-07-22"],
  ["/tools/founder-content-ideas-generator/", "2026-07-22"],
  ["/compare/", "2026-07-22"],
  ["/compare/infinite-vs-okara/", "2026-07-22"],
  ["/compare/infinite-vs-ploy/", "2026-07-22"],
  ["/compare/infinite-vs-blaze/", "2026-07-22"],
  ["/privacy/", "2026-08-02"],
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
  rewrites.find((rewrite) => rewrite.source === "/infinite/ledger"),
  {
    source: "/infinite/ledger",
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
  "infinite-tag": "0.3.5",
});
const packageLock = JSON.parse(read("package-lock.json"));
assert.equal(packageLock.packages[""].devDependencies["infinite-tag"], "0.3.5");
assert.equal(packageLock.packages["node_modules/infinite-tag"].version, "0.3.5");
assert.equal(
  packageLock.packages["node_modules/infinite-tag"].resolved,
  "https://registry.npmjs.org/infinite-tag/-/infinite-tag-0.3.5.tgz",
);
assert.equal(
  packageLock.packages["node_modules/infinite-tag"].integrity,
  "sha512-O67P+0iAK7J1EjQVz3W4B2beInlsEP1psvsmzXLGKVYTgTOxI0NQj+gRevhHyNyEJM4eKlWIL+n1wi+zyIdp/w==",
);
assert.match(read(".gitignore"), /^node_modules\/$/m);

const injector = read(".github/scripts/inject-analytics.cjs");
assert.match(injector, /await import\("infinite-tag"\)/);
assert.match(injector, /gtag\("event", "app_download_clicked"/);
assert.doesNotMatch(injector, /_1BU|\/api\/events\/track|custom_app_download_redirect|appDownloadTrackingSnippet|link_text/);
// Consent gating (2026-08-04): the shared gate exists, the download bridge refuses to
// preventDefault without an initialized gtag, and the banner carries the host gate + the
// manual revocation hook.
assert.match(injector, /window\.__infiniteConsentGate = function/);
assert.match(injector, /typeof window\.gtag !== "function"/);
assert.match(injector, /window\.infinitePrivacyChoices = renderWhenReady/);
assert.match(injector, /hosts\.indexOf\(location\.hostname\.toLowerCase\(\)/);
const deployPreparation = read("scripts/prepare-static-deploy.cjs");
assert.match(deployPreparation, /execFileSync\(process\.execPath, \[path\.join\(repoRoot, "\.github\/scripts\/inject-analytics\.cjs"\)\]/);
assert.doesNotMatch(deployPreparation, /require\(path\.join\(repoRoot, "\.github\/scripts\/inject-analytics\.cjs"\)\)/);

const homepage = read("_agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html");
assert.match(homepage, /data-analytics-cta-id="view-pricing" data-analytics-cta-location="navigation"/);
for (const location of ["navigation", "hero", "pricing", "final-cta"]) {
  assert.match(homepage, new RegExp(`href="/download"[^>]*data-download-location="${location}"`));
}

const privacy = read("privacy/index.html");
assert.match(privacy, /Last updated: 2 August 2026/);
assert.match(privacy, /Website visitor analytics/i);
assert.match(privacy, /90 days/i);
assert.match(privacy, /25 months/i);
assert.match(privacy, /Do Not Track.*Global Privacy Control|Global Privacy Control.*Do Not Track/is);
assert.match(privacy, /Infinite first-party analytics.*measure website use by default/is);
assert.match(privacy, /Do Not Track.*Global Privacy Control.*Infinite first-party browser runtime/is);
assert.doesNotMatch(privacy, /Browser analytics is off until|Privacy choices/);
// The revocation control lives on the privacy policy page — where the banner's own
// policy links land — and reopens the prompt regardless of any stored decision.
assert.match(privacy, /Manage analytics preferences/);
assert.match(privacy, /window\.infinitePrivacyChoices/);
assert.match(privacy, /Google Analytics, PostHog, and any configured campaign pixels do not initialize unless you grant/);
assert.match(privacy, /Content Security Policy.*sanitized.*document.*blocked.*directive.*disposition/is);
assert.match(privacy, /Content Security Policy.*query strings.*script samples.*security diagnostics/is);
assert.doesNotMatch(privacy, /We do not host, receive, store, or have access to that data\./);

const dataInventory = read("docs/analytics/data-inventory.md");
assert.match(dataInventory, /Status: production behavior inventory.*operational follow-ups/is);
assert.match(dataInventory, /Content Security Policy.*document origin and path.*blocked origin and path.*directive.*disposition/is);
assert.match(dataInventory, /Content Security Policy.*Vercel function logs.*exact platform retention receipt.*pending/is);

const guardrail = read("docs/ANALYTICS-GUARDRAIL.md");
assert.match(guardrail, /same-origin.*synthetic.*receipt/is);
assert.match(guardrail, /does not prove.*100%|not.*100% capture/is);
const drainRunbook = read("docs/runbooks/vercel-analytics-drain.md");
// The drain went ACTIVE in production 2026-08-02 (site PR #22). This assertion used to pin the
// pre-activation "disabled pending Task 14/15" wording; that went stale the day the runbook was
// updated and silently red-lined this whole suite for ~2 weeks. Pin the CURRENT operational truth
// instead — the runbook must keep declaring live status, not drift back to a gating narrative.
assert.match(drainRunbook, /Status:\s*\*\*ACTIVE in production since 2026-08-02\*\*/i);
assert.match(drainRunbook, /site_document_request.*KNOWN_DOCUMENT_PATHS/is);
// The historical activation procedure is deliberately retained below the status line.
assert.match(drainRunbook, /Founder\/counsel approval.*pending.*retention receipts.*pending/is);
const ledgerContract = read("docs/analytics/first-party-ledger-contract.md");
assert.match(ledgerContract, /95af1293de230506f107ec526f53e132a81de87c/);
assert.match(ledgerContract, /infinite-tag@0\.3\.1.*96937b5.*dbde47d58fd2db7ea52cc30325a54d833dcec2b7a39e3f20ac48d9a6ed4b91f6/is);
assert.match(ledgerContract, /registry.*latest.*0\.3\.1/is);
assert.match(ledgerContract, /app_download_click.*cta_location.*destination_path/is);
assert.match(ledgerContract, /data-download-location.*package-owned.*click listener/is);
assert.doesNotMatch(ledgerContract, /placement is currently unavailable|future package release/i);
assert.match(dataInventory, /app_download_click.*bounded CTA location.*destination path/is);
assert.doesNotMatch(dataInventory, /download placement is unavailable/i);

const siteAudit = read("scripts/verify-site-audit.mjs");
assert.match(siteAudit, /renderInfiniteBrowserTag/);
for (const eventName of ["site_page_view", "site_click", "app_download_click", "app_download_clicked"]) {
  assert.match(siteAudit, new RegExp(eventName), `site audit must inspect generated ${eventName}`);
}
assert.match(siteAudit, /data-download-location/);
assert.match(siteAudit, /gtag\\\(\\\"event\\\", \\\"app_download_clicked/);

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
