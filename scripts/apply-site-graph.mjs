#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PUBLIC_ROUTES, SITEMAP_ROUTES, assertPublicSiteManifest } from "./lib/public-site-manifest.mjs";
import { renderLlmsText, renderSitemapXml } from "./lib/site-graph-renderers.mjs";
import { renderSiteFooter, SITE_FOOTER_STYLESHEET } from "./lib/site-footer.mjs";
import { renderSiteHeader, SITE_HEADER_STYLESHEET, SITE_BASE_STYLESHEET } from "./lib/site-header.mjs";

export function applySiteGraph(distDir) {
  assertPublicSiteManifest();
  writeFileSync(join(distDir, "sitemap.xml"), renderSitemapXml(SITEMAP_ROUTES));
  writeFileSync(join(distDir, "llms.txt"), renderLlmsText({ routes: PUBLIC_ROUTES }));

  for (const route of PUBLIC_ROUTES.filter((candidate) => candidate.footer || candidate.header !== false)) {
    const htmlPath = route.path === "/" ? join(distDir, "index.html") : join(distDir, route.path.slice(1), "index.html");
    if (!existsSync(htmlPath)) {
      throw new Error(`Missing route HTML for ${route.path}: ${htmlPath}`);
    }
    const current = readFileSync(htmlPath, "utf8");
    let next = current;
    if (route.footer) {
      next = applySiteFooterToHtml(next, renderSiteFooter({ status: route.title }), {
        deferStylesheet: route.path === "/",
      });
    }
    if (route.header !== false) {
      next = applySiteHeaderToHtml(next, renderSiteHeader({ currentPath: route.path }), {
        deferStylesheet: route.path === "/",
        distDir,
      });
    }
    writeFileSync(htmlPath, next);
  }
}

export function applySiteHeaderToHtml(html, headerHtml, { deferStylesheet = false, distDir } = {}) {
  // Strip each page family's existing header, plus our own on a re-run (idempotent),
  // then insert the shared header immediately after the opening <body> tag.
  const strippers = [
    // our own, on a rebuild — includes the trailing scroll <script>
    /[\t ]*<header\b(?=[^>]*data-site-header="public-route-graph-v1")[\s\S]*?<\/header>\s*<script>[\s\S]*?<\/script>[\t ]*/gm,
    /[\t ]*<header\b(?=[^>]*data-site-header="public-route-graph-v1")[\s\S]*?<\/header>[\t ]*/gm,
    // features
    /[\t ]*<header\b[^>]*class="[^"]*\bfeature-shell\b[^"]*"[\s\S]*?<\/header>[\t ]*/gm,
    // seo pages (agents / compare / tools) — top-level <nav class="seo-nav">
    /[\t ]*<nav\b[^>]*class="[^"]*\bseo-nav\b[^"]*"[\s\S]*?<\/nav>[\t ]*/gm,
    // get-started / privacy / terms
    /[\t ]*<header\b[^>]*class="[^"]*\btopbar\b[^"]*"[\s\S]*?<\/header>[\t ]*/gm,
    // option-4 homepage — <header class="site-header"> that is NOT our own (no data-site-header)
    /[\t ]*<header\b(?![^>]*data-site-header)[^>]*class="site-header"[\s\S]*?<\/header>[\t ]*/gm,
    // solar homepage — its bespoke <nav class="nav" aria-label="Main navigation"> (when solar becomes /)
    /[\t ]*<nav\b[^>]*class="nav"[^>]*aria-label="Main navigation"[\s\S]*?<\/nav>[\t ]*/gm,
  ];
  let stripped = html;
  for (const pattern of strippers) stripped = stripped.replace(pattern, "\n");

  const bodyOpen = stripped.match(/<body\b[^>]*>/);
  if (!bodyOpen) throw new Error("Cannot inject site header into HTML without <body>");
  const withHeader = stripped.replace(bodyOpen[0], `${bodyOpen[0]}\n${headerHtml}\n`);

  return ensureSiteHeaderStylesheet(withHeader, { deferStylesheet, distDir });
}

function ensureSiteHeaderStylesheet(html, { deferStylesheet = false, distDir } = {}) {
  if (!html.includes("</head>")) {
    throw new Error("Cannot inject site header stylesheet into HTML without </head>");
  }
  const sheets = [SITE_BASE_STYLESHEET, SITE_HEADER_STYLESHEET];
  let stripped = html;
  for (const href of sheets) {
    stripped = stripped
      .replace(new RegExp(`\\s*<noscript>\\s*<link\\b[^>]*href=["']${escapeRegExp(href)}["'][^>]*>\\s*<\\/noscript>`, "g"), "")
      .replace(new RegExp(`\\s*<link\\b[^>]*rel=["']stylesheet["'][^>]*href=["']${escapeRegExp(href)}["'][^>]*>`, "g"), "");
  }
  // Idempotent on re-runs: drop any previously inlined shell CSS.
  stripped = stripped.replace(/\n?\/\* SITE-SHELL-CRITICAL-START \*\/[\s\S]*?\/\* SITE-SHELL-CRITICAL-END \*\//g, "");
  // The shared header (and its base tokens/fonts) is above the fold on every page.
  // The homepage forbids render-blocking stylesheet <link>s AND caps itself to a single
  // critical <style> block, so deferring the header CSS flashes an unstyled header on
  // load. Merge the header + base CSS into the homepage's existing critical block — no
  // new <style>, no blocking link, so the header paints styled on first paint. Other
  // pages keep their render-blocking links.
  if (deferStylesheet && distDir && stripped.includes("<style data-homepage-critical>")) {
    const css = sheets
      .map((href) => readFileSync(join(distDir, href.split("?")[0].replace(/^\//, "")), "utf8").trim())
      .join("\n");
    return stripped.replace("</style>", `\n/* SITE-SHELL-CRITICAL-START */\n${css}\n/* SITE-SHELL-CRITICAL-END */\n</style>`);
  }
  const linkFor = (href) =>
    deferStylesheet
      ? `  <link rel="stylesheet" href="${href}" media="print" onload="this.media='all';this.onload=null">\n  <noscript><link rel="stylesheet" href="${href}"></noscript>`
      : `  <link rel="stylesheet" href="${href}">`;
  // base loads before header
  const links = sheets.map(linkFor).join("\n");
  return stripped.replace("</head>", `${links}\n</head>`);
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
