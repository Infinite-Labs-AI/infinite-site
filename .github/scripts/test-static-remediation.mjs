import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
const supportedCrawlerAgents = [
  "*",
  "OAI-SearchBot",
  "GPTBot",
  "Claude-SearchBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
];
const robotsGroups = new Map(
  robots
    .split(/\n\s*\n/)
    .filter((block) => block.startsWith("User-agent:"))
    .map((block) => [block.match(/^User-agent:\s*(.+)$/m)?.[1], block]),
);

for (const agent of supportedCrawlerAgents) {
  const group = robotsGroups.get(agent);
  assert.ok(group, `robots.txt must explicitly declare ${agent}`);
  assert.match(group, /^Allow: \/$/m, `${agent} must allow public pages`);
  assert.match(group, /^Disallow: \/api\/$/m, `${agent} must exclude API endpoints`);
  assert.match(group, /^Disallow: \/ingest\/$/m, `${agent} must exclude analytics ingestion`);
}

const llms = read("llms.txt");
assert.match(llms, /^# Infinite$/m);
assert.match(llms, /^> AI CMO for founders$/m);
assert.match(llms, /^Canonical site: https:\/\/infinite\.fast\/$/m);
assert.match(llms, /^Tools: https:\/\/infinite\.fast\/tools\/$/m);
assert.match(llms, /^Comparisons: https:\/\/infinite\.fast\/compare\/$/m);
assert.match(llms, /^Download: https:\/\/infinite\.fast\/download$/m);
assert.match(llms, /^Blog: https:\/\/blog\.infinite\.fast\/$/m);
assert.match(llms, /high-intent-lead-finder-template/);
assert.match(llms, /seo-geo-brief-generator/);
assert.match(llms, /infinite-vs-ploy/);

const sitemap = read("sitemap.xml");
assert.doesNotMatch(sitemap, /https:\/\/www\.infinite\.fast/);

const liveWorkflow = read(".github/workflows/verify-live-analytics.yml");
assert.match(
  liveWorkflow,
  /node scripts\/verify-crawler-readiness\.mjs/,
  "scheduled live verification must include crawler readiness",
);

const expectedLastmodByPath = new Map([
  ["/", "2026-07-29"],
  ["/tools/", "2026-07-22"],
  ["/tools/high-intent-lead-finder-template/", "2026-07-22"],
  ["/tools/seo-geo-brief-generator/", "2026-07-22"],
  ["/tools/landing-page-ab-test-ideas-generator/", "2026-07-22"],
  ["/tools/founder-content-ideas-generator/", "2026-07-22"],
  ["/compare/", "2026-07-29"],
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
const rewrites = vercel.rewrites ?? [];
assert.equal(
  rewrites.some((rewrite) => String(rewrite.source).startsWith("/gtm")),
  false,
  "GA4 must not use the unproven /gtm relative transport proxy",
);

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
