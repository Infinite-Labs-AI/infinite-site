import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const origin = "https://infinite.fast";
const pages = [
  ["/", "_agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html"],
  ["/privacy/", "privacy/index.html"],
  ["/terms/", "terms/index.html"],
  ["/tools/", "tools/index.html"],
  ["/tools/high-intent-lead-finder-template/", "tools/high-intent-lead-finder-template/index.html"],
  ["/tools/seo-geo-brief-generator/", "tools/seo-geo-brief-generator/index.html"],
  ["/tools/landing-page-ab-test-ideas-generator/", "tools/landing-page-ab-test-ideas-generator/index.html"],
  ["/tools/founder-content-ideas-generator/", "tools/founder-content-ideas-generator/index.html"],
  ["/compare/", "compare/index.html"],
  ["/compare/infinite-vs-okara/", "compare/infinite-vs-okara/index.html"],
  ["/compare/infinite-vs-ploy/", "compare/infinite-vs-ploy/index.html"],
  ["/compare/infinite-vs-blaze/", "compare/infinite-vs-blaze/index.html"],
];

for (const [route, file] of pages) {
  const html = readFileSync(file, "utf8");
  const expectedCanonical = `${origin}${route}`;
  assert.match(
    html,
    new RegExp(`<link\\s+rel=["']canonical["']\\s+href=["']${escapeRegExp(expectedCanonical)}["']`),
    `${file} must self-canonicalize to ${expectedCanonical}`,
  );
  assert.doesNotMatch(html, /https:\/\/www\.infinite\.fast/i, `${file} contains a www URL`);
  assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/i, `${file} must use self-hosted fonts`);
}

const sitemap = readFileSync("sitemap.xml", "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
assert.deepEqual(
  [...sitemapUrls].sort(),
  pages.map(([route]) => `${origin}${route}`).sort(),
  "sitemap URLs must exactly match the 12 apex canonical pages",
);
assert.doesNotMatch(sitemap, /blog\.infinite\.fast|www\.infinite\.fast/);

const robots = readFileSync("robots.txt", "utf8");
assert.match(robots, /Sitemap:\s+https:\/\/infinite\.fast\/sitemap\.xml/);

const homepage = readFileSync(pages[0][1], "utf8");
assert.doesNotMatch(homepage, /Find leads, automates SEO/i);
assert.match(homepage, /review-first/i);
assert.match(homepage, /publishing[^<]{0,120}review|review[^<]{0,120}publishing/i);

const toolFiles = pages.slice(4, 8).map(([, file]) => file);
for (const file of toolFiles) {
  const html = readFileSync(file, "utf8");
  assert.ok((html.match(/<h2\b/gi) || []).length >= 3, `${file} needs at least three H2 sections`);
  assert.match(html, /WebApplication/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /data-(?:copy|download)|result_copied|download_clicked/);
  assert.match(html, /https:\/\/blog\.infinite\.fast\/[a-z0-9-]+/);
}

const toolScript = readFileSync("assets/seo-tools.js", "utf8");
for (const event of ["tool_started", "tool_generated", "result_copied", "download_clicked"]) {
  assert.match(toolScript, new RegExp(event), `tool analytics must emit ${event}`);
}

const analyticsInjector = readFileSync(".github/scripts/inject-analytics.cjs", "utf8");
assert.match(analyticsInjector, /app_download_clicked/);
assert.match(analyticsInjector, /cta_location/);

const comparisonFiles = pages.slice(9).map(([, file]) => file);
for (const file of comparisonFiles) {
  const html = readFileSync(file, "utf8");
  assert.ok((html.match(/<h2\b/gi) || []).length >= 4, `${file} needs at least four H2 sections`);
  assert.match(html, /Last reviewed/i);
  assert.match(html, /methodology/i);
  assert.match(html, /Infinite (?:created|publishes|produced) this comparison/i);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /https:\/\/(?!infinite\.fast|blog\.infinite\.fast)[^"'\s<]+/);
}

const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
const headers = (vercel.headers || []).flatMap((entry) => entry.headers || []);
const headerNames = new Set(headers.map((header) => header.key.toLowerCase()));
for (const name of [
  "content-security-policy",
  "reporting-endpoints",
  "report-to",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
]) {
  assert.ok(headerNames.has(name), `vercel.json must configure ${name}`);
}

console.log(`Verified ${pages.length} apex pages against the Infinite site audit.`);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
