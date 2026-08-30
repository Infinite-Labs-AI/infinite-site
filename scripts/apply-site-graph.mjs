#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PUBLIC_SITE_ROUTES } from "./lib/public-site-manifest.mjs";
import { renderLlmsText, renderSitemapXml } from "./lib/site-graph-renderers.mjs";
import { renderSiteFooter, SITE_FOOTER_STYLESHEET } from "./lib/site-footer.mjs";

export function applySiteGraph(distDir) {
  writeFileSync(join(distDir, "sitemap.xml"), renderSitemapXml(PUBLIC_SITE_ROUTES));
  writeFileSync(join(distDir, "llms.txt"), renderLlmsText({ routes: PUBLIC_SITE_ROUTES }));

  for (const route of PUBLIC_SITE_ROUTES) {
    const htmlPath = route.path === "/" ? join(distDir, "index.html") : join(distDir, route.path.slice(1), "index.html");
    if (!existsSync(htmlPath)) {
      throw new Error(`Missing route HTML for ${route.path}: ${htmlPath}`);
    }
    const current = readFileSync(htmlPath, "utf8");
    writeFileSync(htmlPath, applySiteFooterToHtml(current, renderSiteFooter({ status: route.title })));
  }
}

export function applySiteFooterToHtml(html, footerHtml) {
  const replacement = `\n${footerHtml}\n`;
  let withFooter = null;
  const replacements = [
    /[\t ]*<footer\b(?=[^>]*data-site-footer="public-route-graph-v1")[\s\S]*?<\/footer>[\t ]*/m,
    /[\t ]*<footer\b[^>]*class="[^"]*\bwrangle-footer\b[^"]*"[\s\S]*?<\/footer>[\t ]*/m,
    /[\t ]*<footer\b[^>]*class="[^"]*\bseo-footer\b[^"]*"[\s\S]*?<\/footer>[\t ]*/m,
    /[\t ]*<footer>\s*<p>©[\s\S]*?<\/footer>[\t ]*(?=<\/body>)/m,
  ];

  for (const pattern of replacements) {
    if (pattern.test(html)) {
      withFooter = html.replace(pattern, replacement);
      break;
    }
  }

  if (!withFooter && !html.includes("</body>")) {
    throw new Error("Cannot inject site footer into HTML without </body>");
  }
  if (!withFooter) withFooter = html.replace("</body>", `${replacement}</body>`);
  return ensureSiteFooterStylesheet(withFooter);
}

function ensureSiteFooterStylesheet(html) {
  if (html.includes(SITE_FOOTER_STYLESHEET)) return html;
  if (!html.includes("</head>")) {
    throw new Error("Cannot inject site footer stylesheet into HTML without </head>");
  }
  const link = `  <link rel="stylesheet" href="${SITE_FOOTER_STYLESHEET}">\n`;
  return html.replace("</head>", `${link}</head>`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const distDir = process.argv[2];
  if (!distDir) {
    console.error("Usage: node scripts/apply-site-graph.mjs <distDir>");
    process.exit(2);
  }
  applySiteGraph(distDir);
}
