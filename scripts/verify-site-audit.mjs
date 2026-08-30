import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderInfiniteBrowserTag } from "infinite-tag";

import { PUBLIC_ROUTES } from "./lib/public-site-manifest.mjs";

const origin = "https://infinite.fast";
const sourceFileByPath = new Map([
  ["/", "_agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html"],
  ["/startup-launch-videos/", null],
]);
const pages = PUBLIC_ROUTES.filter((route) => route.path !== "/startup-launch-videos/").map((route) => [
  route.path,
  sourceFileByPath.get(route.path) ?? `${route.path.slice(1)}index.html`,
]);

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
  for (const anchor of html.match(/<a\b[^>]*href=["']\/download["'][^>]*>/gi) ?? []) {
    assert.match(
      anchor,
      /data-(?:download-location|analytics-cta-location)=["'][A-Za-z0-9_-]{1,64}["']/,
      `${file} has a /download link without a bounded location marker`,
    );
  }
}

const sitemap = readFileSync("sitemap.xml", "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
assert.deepEqual(
  [...sitemapUrls].sort(),
  PUBLIC_ROUTES.map((route) => `${origin}${route.path}`).sort(),
  "sitemap URLs must exactly match the manifest apex canonical pages",
);
assert.doesNotMatch(sitemap, /blog\.infinite\.fast|www\.infinite\.fast/);

const robots = readFileSync("robots.txt", "utf8");
assert.match(robots, /Sitemap:\s+https:\/\/infinite\.fast\/sitemap\.xml/);

const generatedAnalytics = renderInfiniteBrowserTag({
  siteSourceKey: "site_audit_fixture",
  collectPath: "/infinite/ledger",
  productionHosts: ["infinite.fast"],
  respectDnt: true,
  consent: { mode: "not_required" },
  mirrors: [],
});
for (const event of ["site_page_view", "site_click", "app_download_click"]) {
  assert.match(generatedAnalytics, new RegExp(event), `generated package runtime must contain ${event}`);
}
assert.match(generatedAnalytics, /data-download-location/, "generated package runtime must consume download placement markers");
const analyticsInjector = readFileSync(".github/scripts/inject-analytics.cjs", "utf8");
assert.match(analyticsInjector, /gtag\(\"event\", \"app_download_clicked\"/);
assert.doesNotMatch(analyticsInjector, /appDownloadTrackingSnippet|link_text|textContent/);

const homepage = readFileSync(pages[0][1], "utf8");
assert.match(homepage, /Meet Infinite, your AI CMO/i);
assert.match(homepage, /Find leads, automate SEO, plan landing-page CRO tests, and uncover trending content\./i);
assert.match(homepage, /operator confirmation plus local policy checks/i);
assert.match(homepage, /test ideas for existing pages/i);
assert.doesNotMatch(homepage, /A\/B test landing pages|landing-page creation|split live traffic[^<]*\bdoes\b(?! not)/i);

const toolFiles = pages
  .filter(([route]) => route.startsWith("/tools/") && route !== "/tools/")
  .map(([, file]) => file);
for (const file of toolFiles) {
  const html = readFileSync(file, "utf8");
  assert.ok((html.match(/<h2\b/gi) || []).length >= 3, `${file} needs at least three H2 sections`);
  assert.match(html, /WebApplication/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /data-(?:copy|download)|result_copied|download_clicked/);
  assert.match(html, /https:\/\/hub\.infinite\.fast\/[a-z0-9-]+/);
}

const toolScript = readFileSync("assets/seo-tools.js", "utf8");
for (const event of ["tool_started", "tool_generated", "result_copied", "download_clicked"]) {
  assert.match(toolScript, new RegExp(event), `tool analytics must emit ${event}`);
}

const comparisonFiles = pages
  .filter(([route]) => route.startsWith("/compare/") && route !== "/compare/")
  .map(([, file]) => file);
for (const file of comparisonFiles) {
  const html = readFileSync(file, "utf8");
  assert.ok((html.match(/<h2\b/gi) || []).length >= 4, `${file} needs at least four H2 sections`);
  assert.match(html, /Last reviewed/i);
  assert.match(html, /methodology/i);
  assert.match(html, /Infinite (?:created|publishes|produced) this comparison/i);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /https:\/\/(?!infinite\.fast|hub\.infinite\.fast)[^"'\s<]+/);
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

console.log(`Verified ${pages.length} source-backed apex pages against the Infinite site audit.`);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
