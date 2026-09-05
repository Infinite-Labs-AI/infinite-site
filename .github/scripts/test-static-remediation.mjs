import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { PUBLIC_ROUTES, SITEMAP_ROUTES, assertPublicSiteManifest } from "../../scripts/lib/public-site-manifest.mjs";
import { renderLlmsText, renderSitemapXml } from "../../scripts/lib/site-graph-renderers.mjs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

assertPublicSiteManifest();

const MAIN_SITE_FILES = [
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "privacy/index.html",
  "terms/index.html",
  "get-started/index.html",
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
assert.equal(llms, renderLlmsText({ routes: PUBLIC_ROUTES }), "llms.txt must be generated from the public site manifest");
assert.match(llms, /\[Growth Hub\]\(https:\/\/hub\.infinite\.fast\/\)/);
assert.match(llms, /\[Download\]\(https:\/\/infinite\.fast\/download\)/);
assert.doesNotMatch(llms, /blog\.infinite\.fast/);

const sitemap = read("sitemap.xml");
assert.doesNotMatch(sitemap, /https:\/\/www\.infinite\.fast/);
assert.equal(sitemap, renderSitemapXml(SITEMAP_ROUTES), "sitemap.xml must be generated from the public site manifest");

const expectedLastmodByPath = new Map(SITEMAP_ROUTES.map((route) => [route.path, route.sitemap.lastmod]));
assert.equal(expectedLastmodByPath.get("/privacy/"), "2026-09-03", "/privacy/ has an honest per-route lastmod");

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
assert.deepEqual(
  rewrites.find((rewrite) => rewrite.source === "/infinite/auth/otp"),
  { source: "/infinite/auth/otp", destination: "https://api.ultima.inc/api/auth/otp" },
  "the get-started page requests its sign-in code through a same-origin rewrite (no CORS)",
);
assert.deepEqual(
  rewrites.find((rewrite) => rewrite.source === "/infinite/auth/handoff/claim"),
  { source: "/infinite/auth/handoff/claim", destination: "https://api.ultima.inc/api/auth/handoff/claim" },
  "the get-started page mints its one-time sign-in claim through a same-origin rewrite (no CORS)",
);
assert.equal(
  rewrites.some((rewrite) => rewrite.source === "/infinite/handoff"),
  false,
  "the Wave 2 /infinite/handoff rewrite is retired — the get-started page owns the handoff",
);
assert.equal(existsSync(new URL("../../api/download.js", import.meta.url)), false, "the native /download redirect must not become a function");
assert.equal(existsSync(new URL("../workflows/deploy-pages.yml", import.meta.url)), false, "Vercel is the only production host");

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.private, true);
assert.equal(packageJson.type, "module");
assert.deepEqual(packageJson.devDependencies, {
  "@vercel/functions": "3.7.6",
  "infinite-tag": "0.9.1",
});
assert.deepEqual(packageJson.dependencies, {
  "@supabase/supabase-js": "2.89.0",
});
const packageLock = JSON.parse(read("package-lock.json"));
assert.equal(packageLock.packages[""].dependencies["@supabase/supabase-js"], "2.89.0");
assert.equal(packageLock.packages[""].devDependencies["infinite-tag"], "0.9.1");
assert.equal(packageLock.packages["node_modules/infinite-tag"].version, "0.9.1");
assert.equal(packageLock.packages["node_modules/@supabase/supabase-js"].version, "2.89.0");
assert.equal(
  read("assets/supabase-js-2.89.0.js"),
  read("node_modules/@supabase/supabase-js/dist/umd/supabase.js"),
  "the vendored Supabase UMD must stay byte-identical to the pinned npm package",
);
assert.equal(
  packageLock.packages["node_modules/infinite-tag"].resolved,
  "https://registry.npmjs.org/infinite-tag/-/infinite-tag-0.9.1.tgz",
);
assert.equal(
  packageLock.packages["node_modules/infinite-tag"].integrity,
  "sha512-MvmnMHq4y2zNj2wgFN9SwFMpLVBwa/6r8+qbwsQ97sclC5TS2aZFNtVvKl1AMLAn/k9pauZfHanORAnyctsTWg==",
);
assert.match(read(".gitignore"), /^node_modules\/$/m);

const injector = read(".github/scripts/inject-analytics.cjs");
assert.match(injector, /await import\("infinite-tag"\)/);
assert.match(injector, /gtag\("event", "app_download_clicked"/);
assert.doesNotMatch(injector, /_1BU|\/api\/events\/track|custom_app_download_redirect|appDownloadTrackingSnippet|link_text/);
const retiredSnippetName = "download" + "Handoff" + "Snippet";
const retiredBuildFlag = ["INFINITE", "HANDOFF", "ENABLED"].join("_");
assert.doesNotMatch(
  injector,
  new RegExp(`${retiredSnippetName}|${retiredBuildFlag}|infinite-handoff-card`),
  "the Wave 2 attribution snippet is deleted, not flagged off",
);
// Consent gating (2026-08-04): the shared gate exists, the download bridge refuses to
// preventDefault without an initialized gtag, and the banner carries the host gate + the
// manual revocation hook.
assert.match(injector, /window\.__infiniteConsentGate = function/);
assert.match(injector, /typeof window\.gtag !== "function"/);
assert.match(injector, /window\.infinitePrivacyChoices = renderWhenReady/);
assert.match(injector, /hosts\.indexOf\(location\.hostname\.toLowerCase\(\)/);
// Meta pixel (2026-09-03): dark until INFINITE_META_PIXEL_ID is set on the Vercel project. The
// retired META_PIXEL_ID name is not read, no placeholder id exists anywhere in the build, and the
// deploy script never defaults the pixel id the way it defaults GA4/PostHog.
assert.match(injector, /process\.env\.INFINITE_META_PIXEL_ID/, "the Meta pixel id comes from INFINITE_META_PIXEL_ID only");
assert.doesNotMatch(injector, /process\.env\.META_PIXEL_ID/, "the retired META_PIXEL_ID name must not be read");
assert.doesNotMatch(injector, /1234567890/, "no placeholder pixel id in the injector");
const deployPreparation = read("scripts/prepare-static-deploy.cjs");
assert.match(deployPreparation, /execFileSync\(process\.execPath, \[path\.join\(repoRoot, "\.github\/scripts\/inject-analytics\.cjs"\)\]/);
assert.doesNotMatch(deployPreparation, /require\(path\.join\(repoRoot, "\.github\/scripts\/inject-analytics\.cjs"\)\)/);
assert.match(deployPreparation, /INFINITE_META_PIXEL_ID/, "the deploy script documents where the pixel id comes from");
assert.doesNotMatch(deployPreparation, /META_PIXEL_ID\s*(?:\|\|=|=)/, "the deploy script must never default or assign a pixel id — a fake id must never ship again");
assert.doesNotMatch(deployPreparation, /1234567890/, "no placeholder pixel id in the deploy script");

const homepage = read("_agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html");
assert.match(homepage, /data-analytics-cta-id="view-pricing" data-analytics-cta-location="navigation"/);
// Every "Get Infinite" CTA sends the visitor through the email gate. The anchor keeps its
// data-download-location token AND carries the managed-CTA pair, because infinite-tag emits
// site_click only from data-analytics-cta-id + data-analytics-cta-location.
for (const location of ["navigation", "hero", "pricing", "pricing-matrix", "final-cta"]) {
  assert.match(
    homepage,
    new RegExp(`href="/get-started\\?cta=${location}" data-download-location="${location}" data-analytics-cta-id="get-started" data-analytics-cta-location="${location}"`),
    `${location} CTA must point at /get-started with the originating CTA in the URL and the managed-CTA pair`,
  );
}
assert.equal((homepage.match(/href="\/get-started\?cta=/g) ?? []).length, 6, "six gate CTAs on the homepage carry origin CTA query parameters");
const directHomepageDownloadAnchors = (homepage.match(/<a\b[^>]*href="\/download"[^>]*>/g) ?? []).filter(
  (anchor) => !/data-analytics-cta-location="site-footer"/.test(anchor),
);
assert.deepEqual(directHomepageDownloadAnchors, [], "no non-footer homepage anchor bypasses the gate");
assert.match(homepage, /"downloadUrl": "https:\/\/infinite\.fast\/download"/, "the SoftwareApplication schema still names the installer route");

const privacy = read("privacy/index.html");
assert.match(privacy, /Last updated: 5 September 2026/);
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
assert.match(privacy, /<strong>Get-started sign-in handoff:<\/strong>/);
assert.match(privacy, /one-time sign-in grant.*48 hours.*redeemed once/is);
assert.match(privacy, /Google sign-in via Supabase Auth.*session storage.*purges every Supabase auth key/is);
assert.match(privacy, /never writes Google tokens to local storage/is);
// Ad conversion measurement (2026-09-03): the Meta pixel exists only when configured; at sign-up the
// browser forwards Meta's own cookies to our server in the claim request and we do not store them;
// the server reports the conversion to Meta / Google with a one-way hash of the verified email.
assert.match(privacy, /<strong>Advertising conversion measurement:<\/strong>/);
assert.match(privacy, /Advertising conversion measurement:.*Meta pixel.*only when.*configured/is);
assert.match(privacy, /Advertising conversion measurement:.*<code>_fbc<\/code>.*<code>_fbp<\/code>.*same request.*not store/is);
assert.match(privacy, /Advertising conversion measurement:.*one-way hash of the verified email/is);
assert.match(privacy, /Advertising conversion measurement:.*Google click identifier.*only if.*get-started/is);
assert.match(privacy, /Advertising conversion measurement:.*(?:consent|permitted|grant)/is, "the ad-signal forwarding is described as consent-qualified");
assert.match(privacy, /one-way hash of the claim secret \(never the secret itself\)/);
assert.match(privacy, /removed after 90 days/);
assert.doesNotMatch(privacy, /Desktop handoff attribution|cannot sign you in/, "the anonymous-attribution wording is gone");
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
assert.match(ledgerContract, /## Get-started sign-in handoff/);
assert.match(ledgerContract, /\/infinite\/auth\/otp.*\/infinite\/auth\/handoff\/claim/is);
assert.match(ledgerContract, /accessToken.*invalid_token.*google_provider_required/is);
assert.doesNotMatch(ledgerContract, new RegExp(`${retiredBuildFlag}|Wave 2, dormant`));
// Ad conversion signals (2026-09-03): the claim body's optional in-flight fields, the env-gated pixel,
// and the dedup mirror contract are documented where the claim contract lives.
assert.match(ledgerContract, /## Ad conversion signals/);
assert.match(ledgerContract, /fbc\?, fbp\?, gclid\?/, "both claim POST shapes document the optional in-flight click-id fields");
assert.match(ledgerContract, /INFINITE_META_PIXEL_ID/);
assert.match(ledgerContract, /fbq\("track", "CompleteRegistration", \{\}, \{ eventID: claimId \}\)/);
assert.match(ledgerContract, /in flight.*never at rest/is);
assert.match(ledgerContract, /gclid.*only (?:if|when) it is\s+literally on the `\/get-started` URL/is);
assert.match(dataInventory, /app_download_click.*bounded CTA location.*destination path/is);
assert.doesNotMatch(dataInventory, /download placement is unavailable/i);
assert.match(dataInventory, /Get-started sign-in claim/);
assert.match(dataInventory, /In-flight ad click identifiers/, "the inventory names the click ids that pass through without resting");
assert.match(dataInventory, /Google sign-in via Supabase Auth.*sessionStorage.*purges every Supabase auth key/is);
assert.match(dataInventory, /never writes Google tokens to local storage/is);
assert.doesNotMatch(dataInventory, new RegExp(retiredBuildFlag));

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
assert.match(headerValue("Content-Security-Policy") ?? "", /connect-src[^;]*https:\/\/wdxjduorvpayxixpmskf\.supabase\.co/, "Google PKCE exchange must be able to reach Supabase Auth");
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
