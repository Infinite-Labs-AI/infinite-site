#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PUBLIC_ROUTES, SITEMAP_ROUTES, assertPublicSiteManifest } from "./lib/public-site-manifest.mjs";
import { renderLlmsText, renderSitemapXml } from "./lib/site-graph-renderers.mjs";
import { renderSiteFooter, SITE_FOOTER_STYLESHEET } from "./lib/site-footer.mjs";

export function applySiteGraph(distDir) {
  assertPublicSiteManifest();
  writeFileSync(join(distDir, "sitemap.xml"), renderSitemapXml(SITEMAP_ROUTES));
  writeFileSync(join(distDir, "llms.txt"), renderLlmsText({ routes: PUBLIC_ROUTES }));

  for (const route of PUBLIC_ROUTES.filter((candidate) => candidate.footer)) {
    const htmlPath = route.path === "/" ? join(distDir, "index.html") : join(distDir, route.path.slice(1), "index.html");
    if (!existsSync(htmlPath)) {
      throw new Error(`Missing route HTML for ${route.path}: ${htmlPath}`);
    }
    const current = readFileSync(htmlPath, "utf8");
    writeFileSync(
      htmlPath,
      applySiteFooterToHtml(current, renderSiteFooter({ status: route.title }), {
        deferStylesheet: route.path === "/",
      }),
    );
  }
}

export function applySiteFooterToHtml(html, footerHtml, { deferStylesheet = false } = {}) {
  const replacement = `\n${footerHtml}\n`;
  const replacements = [
    /[\t ]*<footer\b(?=[^>]*data-site-footer="public-route-graph-v1")[\s\S]*?<\/footer>[\t ]*/gm,
    /[\t ]*<footer\b[^>]*class="[^"]*\bwrangle-footer\b[^"]*"[\s\S]*?<\/footer>[\t ]*/gm,
    /[\t ]*<footer\b[^>]*class="[^"]*\bseo-footer\b[^"]*"[\s\S]*?<\/footer>[\t ]*/gm,
    /[\t ]*<footer>\s*<a href="\.\.\/">Home<\/a>\s*<span class="sep">·<\/span>\s*<a href="\.\.\/(?:privacy|terms)\/">(?:Privacy|Terms)<\/a>\s*<\/footer>[\t ]*/gm,
    /[\t ]*<footer>\s*<p>©[\s\S]*?<\/footer>[\t ]*(?=<\/body>)/gm,
  ];

  let withoutSiteFooters = html;
  for (const pattern of replacements) {
    withoutSiteFooters = withoutSiteFooters.replace(pattern, "\n");
  }

  if (!withoutSiteFooters.includes("</body>")) {
    throw new Error("Cannot inject site footer into HTML without </body>");
  }

  return ensureSiteFooterStylesheet(withoutSiteFooters.replace("</body>", `${replacement}</body>`), {
    deferStylesheet,
  });
}

function ensureSiteFooterStylesheet(html, { deferStylesheet }) {
  if (!html.includes("</head>")) {
    throw new Error("Cannot inject site footer stylesheet into HTML without </head>");
  }

  const stripped = html
    .replace(siteFooterStylesheetNoscriptPattern(), "")
    .replace(siteFooterStylesheetLinkPattern(), "");
  const link = deferStylesheet
    ? [
        `  <link rel="stylesheet" href="${SITE_FOOTER_STYLESHEET}" media="print" onload="this.media='all';this.onload=null">`,
        `  <noscript><link rel="stylesheet" href="${SITE_FOOTER_STYLESHEET}"></noscript>`,
      ].join("\n")
    : `  <link rel="stylesheet" href="${SITE_FOOTER_STYLESHEET}">`;
  return stripped.replace("</head>", `${link}\n</head>`);
}

function siteFooterStylesheetLinkPattern() {
  return new RegExp(`\\s*<link\\b[^>]*rel=["']stylesheet["'][^>]*href=["']${escapeRegExp(SITE_FOOTER_STYLESHEET)}["'][^>]*>`, "g");
}

function siteFooterStylesheetNoscriptPattern() {
  return new RegExp(
    `\\s*<noscript>\\s*<link\\b[^>]*rel=["']stylesheet["'][^>]*href=["']${escapeRegExp(SITE_FOOTER_STYLESHEET)}["'][^>]*>\\s*<\\/noscript>`,
    "g",
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const distDir = process.argv[2];
  if (!distDir) {
    console.error("Usage: node scripts/apply-site-graph.mjs <distDir>");
    process.exit(2);
  }
  applySiteGraph(distDir);
}
