import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

import {
  FOOTER_COLUMNS,
  KNOWN_DOCUMENT_PATHS,
  PUBLIC_SITE_ROUTES,
} from "../../scripts/lib/public-site-manifest.mjs";
import { renderLlmsText, renderSitemapXml } from "../../scripts/lib/site-graph-renderers.mjs";
import { serveDatasetFixture } from "./fixtures/launch-videos-dataset.mjs";

const repoRoot = new URL("../..", import.meta.url).pathname;
const distDir = join(repoRoot, "dist");
const expectedRoutes = [
  "/",
  "/agents/",
  "/tools/",
  "/tools/high-intent-lead-finder-template/",
  "/tools/seo-geo-brief-generator/",
  "/tools/landing-page-ab-test-ideas-generator/",
  "/tools/founder-content-ideas-generator/",
  "/compare/",
  "/compare/infinite-vs-okara/",
  "/compare/infinite-vs-ploy/",
  "/compare/infinite-vs-blaze/",
  "/startup-launch-videos/",
  "/privacy/",
  "/terms/",
];
const siteFooterLegacyClass = /\b(?:wrangle-footer|seo-footer)\b/;

export function assertPublicSiteGraph(targetDir) {
  assertManifest();
  assertRootSnapshots();
  assertBuiltGraph(targetDir);
}

function assertManifest() {
  assert.deepEqual(
    PUBLIC_SITE_ROUTES.map((route) => route.path),
    expectedRoutes,
    "manifest must contain exactly the 14 existing public document routes in canonical order",
  );
  assert.deepEqual(
    [...KNOWN_DOCUMENT_PATHS],
    expectedRoutes,
    "middleware document path export must come from the same 14-route manifest",
  );
  assert.equal(new Set(PUBLIC_SITE_ROUTES.map((route) => route.path)).size, expectedRoutes.length, "route paths must be unique");

  for (const route of PUBLIC_SITE_ROUTES) {
    assert.equal(route.path.startsWith("/"), true, `${route.path}: route path must be absolute`);
    assert.equal(route.path === "/" || route.path.endsWith("/"), true, `${route.path}: document route must have trailing slash`);
    assert.doesNotMatch(route.path, /\/{2,}/, `${route.path}: route path must not contain duplicate slashes`);
    assert.equal(typeof route.title, "string");
    assert.ok(route.title.length > 0, `${route.path}: route must have a title`);
    assert.match(route.lastmod, /^\d{4}-\d{2}-\d{2}$/, `${route.path}: route must carry an ISO lastmod`);
  }

  assert.equal(
    FOOTER_COLUMNS.some((column) => column.label === "Product"),
    false,
    "Task 2 foundation footer must omit Product until feature pages exist",
  );
  assert.equal(new Set(FOOTER_COLUMNS.map((column) => column.label)).size, FOOTER_COLUMNS.length, "footer column labels must be unique");

  const routePaths = new Set(expectedRoutes);
  for (const column of FOOTER_COLUMNS) {
    assert.ok(column.links.length > 0, `${column.label}: footer column must not be empty`);
    for (const link of column.links) {
      assert.equal(typeof link.label, "string");
      assert.ok(link.label.length > 0, `${column.label}: footer link must have a label`);
      assertFooterHref(link.href, routePaths, `${column.label} > ${link.label}`);
      if (link.href === "/download" || link.href.startsWith("https://github.com/")) {
        assert.match(link.ctaId ?? "", /^[a-z0-9_-]{1,64}$/, `${column.label} > ${link.label}: tracked CTA must have bounded ctaId`);
        assert.match(link.ctaLocation ?? "", /^[a-z0-9_-]{1,64}$/, `${column.label} > ${link.label}: tracked CTA must have bounded ctaLocation`);
      }
    }
  }
}

function assertFooterHref(href, routePaths, label) {
  if (href === "/download" || href === "/sitemap.xml" || href === "/#pricing") return;
  if (href.startsWith("/")) {
    assert.ok(routePaths.has(href), `${label}: internal footer href must point at an existing manifest route: ${href}`);
    return;
  }
  assert.match(
    href,
    /^https:\/\/(?:hub\.infinite\.fast|github\.com\/Infinite-Labs-AI)(?:\/|$)/,
    `${label}: external footer href must be an allowlisted hub or public GitHub URL`,
  );
  assert.doesNotMatch(href, /https:\/\/blog\.infinite\.fast/, `${label}: retired blog host must not appear`);
}

function assertRootSnapshots() {
  const sitemap = readFileSync(join(repoRoot, "sitemap.xml"), "utf8");
  const llms = readFileSync(join(repoRoot, "llms.txt"), "utf8");
  assert.equal(sitemap, renderSitemapXml(PUBLIC_SITE_ROUTES), "tracked sitemap.xml must be generated from the manifest");
  assert.equal(llms, renderLlmsText({ routes: PUBLIC_SITE_ROUTES }), "tracked llms.txt must be generated from the manifest");
}

function assertBuiltGraph(targetDir) {
  const htmlPaths = htmlDocumentPaths(targetDir);
  assert.deepEqual(htmlPaths, expectedRoutes, "built dist HTML routes must exactly match the manifest");

  for (const file of walkFiles(targetDir)) {
    if (![".html", ".xml", ".txt"].includes(extname(file))) continue;
    const body = readFileSync(file, "utf8");
    assert.doesNotMatch(body, /blog\.infinite\.fast/, `${relative(targetDir, file)} must not contain the retired Blog host`);
  }

  for (const route of PUBLIC_SITE_ROUTES) {
    const file = join(targetDir, route.path, "index.html");
    const body = readFileSync(file, "utf8");
    const canonicalFooterCount = (body.match(/<footer\b[^>]*data-site-footer="public-route-graph-v1"/g) ?? []).length;
    assert.equal(canonicalFooterCount, 1, `${route.path}: must have exactly one canonical site footer`);
    assert.doesNotMatch(body, siteFooterLegacyClass, `${route.path}: legacy site footer classes must be removed`);
    assert.match(body, /© 2026 Infinite Labs, Inc\./, `${route.path}: legal footer text must be retained`);
  }
}

function htmlDocumentPaths(dir, prefix = "/") {
  const paths = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      paths.push(...htmlDocumentPaths(join(dir, entry.name), `${prefix}${entry.name}/`));
    } else if (entry.name.endsWith(".html")) {
      assert.equal(entry.name, "index.html", `${prefix}${entry.name}: document pages must be directory index files`);
      paths.push(prefix);
    }
  }
  return paths.sort((left, right) => expectedRoutes.indexOf(left) - expectedRoutes.indexOf(right));
}

function walkFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(full));
    else files.push(full.split(sep).join("/"));
  }
  return files;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const dataset = await serveDatasetFixture();
  try {
    execFileSync(process.execPath, [join(repoRoot, "scripts/prepare-static-deploy.cjs")], {
      cwd: repoRoot,
      env: {
        ...process.env,
        INFINITE_PRODUCTION_HOSTS: "infinite.fast,www.infinite.fast",
        INFINITE_SITE_SOURCE_ARTIFACT: JSON.stringify({
          siteSourceKey: "site_production_dormant",
          collectPath: "/infinite/ledger",
          productionHosts: ["infinite.fast", "www.infinite.fast"],
          staticProxy: "vercel",
        }),
        LAUNCH_VIDEOS_DATASET_URL: dataset.url,
        VERCEL_ENV: "production",
      },
      stdio: "inherit",
    });
    assertPublicSiteGraph(distDir);
  } finally {
    dataset.close();
    rmSync(distDir, { recursive: true, force: true });
  }
}
