import assert from "node:assert/strict";
import test from "node:test";

import {
  parseSitemapUrls,
  validateHtmlDocument,
  validateRobots,
} from "./verify-crawler-readiness.mjs";

test("parseSitemapUrls returns canonical sitemap locations", () => {
  const xml = `<?xml version="1.0"?>
    <urlset>
      <url><loc>https://infinite.fast/</loc></url>
      <url><loc>https://infinite.fast/tools/</loc></url>
    </urlset>`;

  assert.deepEqual(parseSitemapUrls(xml), [
    "https://infinite.fast/",
    "https://infinite.fast/tools/",
  ]);
});

test("validateRobots requires every named group to repeat private exclusions", () => {
  const robots = `User-agent: *
Allow: /
Disallow: /api/

User-agent: OAI-SearchBot
Allow: /

Sitemap: https://infinite.fast/sitemap.xml`;

  const issues = validateRobots(robots, {
    agents: ["*", "OAI-SearchBot"],
    privatePaths: ["/api/"],
    sitemapUrl: "https://infinite.fast/sitemap.xml",
  });

  assert.deepEqual(issues, [
    "OAI-SearchBot is missing Disallow: /api/",
  ]);
});

test("validateHtmlDocument rejects noindex and missing raw content", () => {
  const html = `<!doctype html>
    <html>
      <head>
        <link rel="canonical" href="https://infinite.fast/tools/">
        <meta name="robots" content="noindex">
      </head>
      <body><p>Loading...</p></body>
    </html>`;

  const issues = validateHtmlDocument(html, {
    expectedCanonical: "https://infinite.fast/tools/",
    requireStructuredData: true,
  });

  assert.deepEqual(issues, [
    "raw HTML is missing an h1",
    "robots meta contains noindex",
    "raw HTML body is too small",
    "structured data is missing",
  ]);
});

test("validateHtmlDocument accepts a complete server-rendered page", () => {
  const body = "Useful public product information. ".repeat(20);
  const html = `<!doctype html>
    <html>
      <head>
        <link rel="canonical" href="https://infinite.fast/tools/">
        <meta name="robots" content="index, follow">
        <script type="application/ld+json">{"@type":"WebPage"}</script>
      </head>
      <body><h1>Growth tools</h1><main>${body}</main></body>
    </html>`;

  assert.deepEqual(validateHtmlDocument(html, {
    expectedCanonical: "https://infinite.fast/tools/",
    requireStructuredData: true,
  }), []);
});

test("validateHtmlDocument rejects malformed structured data", () => {
  const body = "Useful public product information. ".repeat(20);
  const html = `<!doctype html>
    <html>
      <head>
        <link rel="canonical" href="https://infinite.fast/compare/">
        <script type="application/ld+json">{"@type":</script>
      </head>
      <body><h1>Comparisons</h1><main>${body}</main></body>
    </html>`;

  assert.deepEqual(validateHtmlDocument(html, {
    expectedCanonical: "https://infinite.fast/compare/",
    requireStructuredData: true,
  }), ["structured data is invalid JSON"]);
});
