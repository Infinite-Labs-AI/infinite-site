import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

import {
  DOWNLOAD_PATH,
  FOOTER_COLUMNS,
  KNOWN_DOCUMENT_PATHS,
  PUBLIC_ROUTES,
  SITEMAP_ROUTES,
  assertPublicSiteManifest,
} from "../../scripts/lib/public-site-manifest.mjs";
import { renderLlmsText, renderSitemapXml } from "../../scripts/lib/site-graph-renderers.mjs";
import { serveDatasetFixture } from "./fixtures/launch-videos-dataset.mjs";

const repoRoot = new URL("../..", import.meta.url).pathname;
const distDir = join(repoRoot, "dist");
const expectedRoutes = [
  "/",
  "/features/",
  "/features/ai-marketing-agents/",
  "/features/seo-aeo/",
  "/features/x-instagram-content/",
  "/features/ads/",
  "/features/email/",
  "/features/websites-ab-testing/",
  "/agents/",
  "/tools/",
  "/tools/high-intent-lead-finder-template/",
  "/tools/seo-geo-brief-generator/",
  "/tools/landing-page-ab-test-ideas-generator/",
  "/tools/founder-content-ideas-generator/",
  "/compare/",
  "/compare/infinite-vs-blaze/",
  "/compare/infinite-vs-okara/",
  "/compare/infinite-vs-ploy/",
  "/startup-launch-videos/",
  "/privacy/",
  "/terms/",
];
const siteFooterLegacyClass = /\b(?:wrangle-footer|seo-footer)\b/;
const expectedRouteFields = [
  "documentLog",
  "footer",
  "id",
  "indexable",
  "llmsSummary",
  "owner",
  "path",
  "sitemap",
  "source",
  "title",
];
const expectedFooterColumns = Object.freeze([
  footerColumn("Product", [
    footerLink("AI Marketing Agents", "/features/ai-marketing-agents/", "feature-ai-marketing-agents"),
    footerLink("SEO + AEO", "/features/seo-aeo/", "feature-seo-aeo"),
    footerLink("X + Instagram Content", "/features/x-instagram-content/", "feature-x-instagram-content"),
    footerLink("AI Ads", "/features/ads/", "feature-ads"),
    footerLink("Email — availability", "/features/email/", "feature-email"),
    footerLink("Websites + A/B Ideas", "/features/websites-ab-testing/", "feature-websites-ab-testing"),
  ]),
  footerColumn("Agents & Open Source", [
    footerLink("Agent Ecosystem", "/agents/", "agents"),
    footerLink("Infinite OS", "https://github.com/Infinite-Labs-AI/infinite-os", "infinite-os-github"),
    footerLink("Infinite Skills", "https://github.com/Infinite-Labs-AI/infinite-skills", "infinite-skills-github"),
    footerLink("Press Agent", "https://github.com/Infinite-Labs-AI/infinite-press-agent", "press-agent-github"),
    footerLink("GitHub", "https://github.com/Infinite-Labs-AI", "github-org"),
    specialFooterLink("llms.txt", "/llms.txt"),
  ]),
  footerColumn("Free Tools", [
    footerLink("All Tools", "/tools/", "tools"),
    footerLink("Lead Finder", "/tools/high-intent-lead-finder-template/", "tool-lead-finder"),
    footerLink("SEO + GEO Brief", "/tools/seo-geo-brief-generator/", "tool-seo-geo"),
    footerLink("A/B Test Ideas", "/tools/landing-page-ab-test-ideas-generator/", "tool-ab-ideas"),
    footerLink("Founder Content Ideas", "/tools/founder-content-ideas-generator/", "tool-content-ideas"),
  ]),
  footerColumn("Resources", [
    footerLink("Growth Hub", "https://hub.infinite.fast/", "growth-hub"),
    footerLink("Research", "https://hub.infinite.fast/research", "hub-research"),
    footerLink("Launch Videos", "/startup-launch-videos/", "launch-videos"),
    footerLink("Launch Video Study", "https://hub.infinite.fast/research/launch-videos", "launch-video-study"),
    footerLink("Hub RSS", "https://hub.infinite.fast/feed.xml", "hub-rss"),
  ]),
  footerColumn("Compare", [
    footerLink("All Comparisons", "/compare/", "compare"),
    footerLink("Infinite vs Blaze", "/compare/infinite-vs-blaze/", "compare-blaze"),
    footerLink("Infinite vs Okara", "/compare/infinite-vs-okara/", "compare-okara"),
    footerLink("Infinite vs Ploy", "/compare/infinite-vs-ploy/", "compare-ploy"),
  ]),
  footerColumn("Company", [
    {
      label: "Download for Mac",
      href: "/download",
      ctaId: "download-mac",
      ctaLocation: "site-footer",
      downloadLocation: "site-footer",
    },
    {
      label: "Pricing",
      href: "/#pricing",
      ctaId: "home",
      ctaLocation: "site-footer",
      requiredFragment: "pricing",
    },
    footerLink("Privacy", "/privacy/", "privacy"),
    footerLink("Terms", "/terms/", "terms"),
    specialFooterLink("Sitemap", "/sitemap.xml"),
  ]),
]);

export function assertPublicSiteGraph(targetDir) {
  assertPublicSiteManifest();
  assertManifest();
  assertClaimTruth();
  assertSharedFooterContrast();
  assertSourceFooterShapes();
  assertRootSnapshots();
  assertBuiltGraph(targetDir);
}

function assertSharedFooterContrast() {
  const css = readFileSync(join(repoRoot, "assets/site-footer.css"), "utf8");
  const color = css.match(/\.public-site-footer-bottom\s*\{[^}]*color:\s*(#[0-9a-f]{6})/is)?.[1];
  assert.ok(color, "shared footer bottom declares an opaque text color");
  for (const surface of ["#ffffff", "#f8fafb"]) {
    const ratio = contrastRatio(color, surface);
    assert.ok(ratio >= 4.5, `shared footer bottom must be >= 4.5:1 against ${surface}, got ${ratio.toFixed(2)}:1`);
  }
}

function contrastRatio(left, right) {
  const values = [relativeLuminance(left), relativeLuminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function relativeLuminance(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
    .map((channel) => channel / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function assertClaimTruth() {
  const homepage = readFileSync(
    join(repoRoot, "_agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html"),
    "utf8",
  );
  const agents = readFileSync(join(repoRoot, "agents/index.html"), "utf8");
  const llms = readFileSync(join(repoRoot, "llms.txt"), "utf8");
  const publicClaims = `${homepage}\n${agents}\n${llms}`;

  for (const unsupported of [
    /A\/B test landing pages/i,
    /A\/B test your landing page/i,
    /turns weak messages into sharper variants, tracks what converts/i,
    /Build a landing-page variant/i,
    /Tracked links, UTMs, and landing-page creation/i,
    /Landing-page A\/B testing/i,
    /Test ran/i,
    /Winner found/i,
    /Variant B beat control/i,
    /Infinite OS exposes governed tools\. Live or destructive actions invoked through those tools require operator confirmation/i,
    /Live or destructive tool actions require operator confirmation plus local policy checks/i,
    /It does not grant a model arbitrary shell or code execution/i,
  ]) {
    assert.doesNotMatch(publicClaims, unsupported, `unsupported landing-page execution claim must be absent: ${unsupported}`);
  }

  assert.match(homepage, /test ideas for existing pages/i, "homepage must scope landing-page output to test ideas for an existing page");
  assert.match(homepage, /landing-page CRO planning/i, "homepage must name the shipped landing-page CRO planning boundary");
  assert.match(
    homepage,
    /Infinite OS stores synced growth data in your local Postgres[\s\S]*connector credentials are encrypted at rest[\s\S]*prompts and relevant tool context go to the Codex or Anthropic provider you choose/i,
    "homepage must distinguish local data/credentials from chosen-provider inference",
  );
  assertNativeScopedToolBoundary(homepage, "homepage");
  assert.equal(
    (homepage.match(/Scoped app\/MCP tools follow a separate boundary/g) ?? []).length,
    2,
    "homepage must carry the scoped-tool boundary once in visible FAQ copy and once in matching JSON-LD",
  );
  assert.match(
    agents,
    /Dry-run never submits or spends a Qwoted credit[\s\S]*normal run can submit at most one pitch and spend a credit/i,
    "Press Agent must state its own dry-run/submission boundary instead of borrowing Infinite OS confirmation semantics",
  );
  assert.match(llms, /test ideas for existing pages/i, "machine-readable copy must keep the landing-page claim bounded");
  assert.match(llms, /Infinite OS stores synced growth data in your local Postgres[\s\S]*connector credentials are encrypted at rest/i, "machine-readable copy must scope local data and credential storage to Infinite OS");
  assert.match(llms, /chosen Codex or Anthropic provider/i, "machine-readable copy must disclose chosen-provider inference");
  assert.match(llms, /Press Agent dry-run never submits or spends a Qwoted credit/i, "machine-readable copy must state Press Agent submission risk");
  assertNativeScopedToolBoundary(llms, "llms.txt");
}

function assertNativeScopedToolBoundary(body, label) {
  assert.match(
    body,
    /built-in\/native action registry[\s\S]*typed actions[\s\S]*native authority and policy checks[\s\S]*operator confirmation before execution/i,
    `${label}: native live/destructive actions must carry typed-registry, native-policy, pre-execution confirmation semantics`,
  );
  assert.match(
    body,
    /Scoped app\/MCP tools follow a separate boundary[\s\S]*host supplies their schemas and owns their semantic validation and confirmation[\s\S]*tool or proposal can be invoked before[\s\S]*follow-up confirmation/i,
    `${label}: scoped app/MCP tools must preserve host-owned post-invocation confirmation semantics`,
  );
  assert.match(
    body,
    /built-in\/native catalog has no arbitrary shell or code runner[\s\S]*host may intentionally expose broader capabilities through scoped tools/i,
    `${label}: no-arbitrary-execution copy must stay scoped to the native catalog`,
  );
}

function assertManifest() {
  assert.deepEqual(
    PUBLIC_ROUTES.map((route) => route.path),
    expectedRoutes,
    "manifest must contain exactly the final 21 public document routes in canonical order",
  );
  assert.deepEqual(
    SITEMAP_ROUTES.map((route) => route.path),
    expectedRoutes,
    "sitemap route export must be derived from the same 14-route manifest",
  );
  assert.deepEqual(
    [...KNOWN_DOCUMENT_PATHS],
    expectedRoutes,
    "middleware document path export must come from the same 14-route manifest",
  );
  assert.equal(DOWNLOAD_PATH, "/download", "manifest must export the server-owned download path");
  assert.equal(new Set(PUBLIC_ROUTES.map((route) => route.path)).size, expectedRoutes.length, "route paths must be unique");

  for (const route of PUBLIC_ROUTES) {
    assert.deepEqual(Object.keys(route).sort(), expectedRouteFields, `${route.path}: route must expose the binding manifest fields`);
    assert.equal(route.path.startsWith("/"), true, `${route.path}: route path must be absolute`);
    assert.equal(route.path === "/" || route.path.endsWith("/"), true, `${route.path}: document route must have trailing slash`);
    assert.doesNotMatch(route.path, /\/{2,}/, `${route.path}: route path must not contain duplicate slashes`);
    assert.match(route.id, /^[a-z0-9-]+$/, `${route.path}: route id must be bounded kebab-case`);
    assert.equal(typeof route.source, "string", `${route.path}: route must name its source`);
    assert.equal(typeof route.owner, "string", `${route.path}: route must name its owner`);
    assert.equal(route.indexable, true, `${route.path}: Task 2 routes must be indexable`);
    assert.equal(route.documentLog, true, `${route.path}: Task 2 routes must be document-loggable`);
    assert.equal(route.footer, true, `${route.path}: Task 2 routes must receive the site footer`);
    assert.equal(typeof route.title, "string");
    assert.ok(route.title.length > 0, `${route.path}: route must have a title`);
    assert.equal(typeof route.llmsSummary, "string");
    assert.ok(route.llmsSummary.length > 0, `${route.path}: route must have an llmsSummary`);
    assert.match(route.sitemap.lastmod, /^\d{4}-\d{2}-\d{2}$/, `${route.path}: route must carry an ISO sitemap.lastmod`);
    assert.match(route.sitemap.changefreq, /^(daily|weekly|monthly|yearly)$/, `${route.path}: route must carry a valid sitemap.changefreq`);
    assert.match(route.sitemap.priority, /^(?:0\.[0-9]|1\.0)$/, `${route.path}: route must carry a valid sitemap.priority`);
  }

  assert.deepEqual(FOOTER_COLUMNS, expectedFooterColumns, "final footer columns must include the activated Product destinations");
  assert.ok(Object.isFrozen(FOOTER_COLUMNS), "footer column array must be frozen");

  const routePaths = new Set(expectedRoutes);
  for (const column of FOOTER_COLUMNS) {
    assert.ok(Object.isFrozen(column), `${column.label}: footer column object must be frozen`);
    assert.ok(column.links.length > 0, `${column.label}: footer column must not be empty`);
    assert.ok(Object.isFrozen(column.links), `${column.label}: footer links array must be frozen`);
    for (const link of column.links) {
      assert.ok(Object.isFrozen(link), `${column.label} > ${link.label}: footer link object must be frozen`);
      assertFooterHref(link.href, routePaths, `${column.label} > ${link.label}`);
      if (link.ctaId) {
        assert.match(link.ctaId ?? "", /^[a-z0-9_-]{1,64}$/, `${column.label} > ${link.label}: tracked CTA must have bounded ctaId`);
        assert.match(link.ctaLocation ?? "", /^[a-z0-9_-]{1,64}$/, `${column.label} > ${link.label}: tracked CTA must have bounded ctaLocation`);
      }
    }
  }
}

function assertFooterHref(href, routePaths, label) {
  if (href === "/download" || href === "/llms.txt" || href === "/sitemap.xml" || href === "/#pricing") return;
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
  assertPublicSiteManifest();
  assert.equal(sitemap, renderSitemapXml(SITEMAP_ROUTES), "tracked sitemap.xml must be generated from the manifest");
  assert.equal(llms, renderLlmsText({ routes: PUBLIC_ROUTES }), "tracked llms.txt must be generated from the manifest");
}

function assertSourceFooterShapes() {
  for (const route of PUBLIC_ROUTES.filter((candidate) => candidate.source.endsWith(".html"))) {
    const body = readFileSync(join(repoRoot, route.source), "utf8");
    assertFooterShape(route.path, body, route.source);
  }
}

function assertBuiltGraph(targetDir) {
  const htmlPaths = htmlDocumentPaths(targetDir);
  assert.deepEqual(htmlPaths, expectedRoutes, "built dist HTML routes must exactly match the manifest");

  const builtHomepage = readFileSync(join(targetDir, "index.html"), "utf8");
  const builtLlms = readFileSync(join(targetDir, "llms.txt"), "utf8");
  assertNativeScopedToolBoundary(builtHomepage, "dist/index.html");
  assert.equal(
    (builtHomepage.match(/Scoped app\/MCP tools follow a separate boundary/g) ?? []).length,
    2,
    "dist/index.html must preserve matching visible and JSON-LD scoped-tool boundaries",
  );
  assertNativeScopedToolBoundary(builtLlms, "dist/llms.txt");

  for (const file of walkFiles(targetDir)) {
    if (![".html", ".xml", ".txt"].includes(extname(file))) continue;
    const body = readFileSync(file, "utf8");
    assert.doesNotMatch(body, /blog\.infinite\.fast/, `${relative(targetDir, file)} must not contain the retired Blog host`);
  }

  for (const route of PUBLIC_ROUTES) {
    const file = join(targetDir, route.path, "index.html");
    const body = readFileSync(file, "utf8");
    assertFooterShape(route.path, body, relative(targetDir, file));
  }
}

function assertFooterShape(routePath, body, label) {
  const totalFooterCount = (body.match(/<footer\b/g) ?? []).length;
  const canonicalFooterCount = (body.match(/<footer\b[^>]*data-site-footer="public-route-graph-v1"/g) ?? []).length;
  assert.equal(canonicalFooterCount, 1, `${label}: must have exactly one canonical site footer`);
  assert.doesNotMatch(body, siteFooterLegacyClass, `${label}: legacy site footer classes must be removed`);
  assert.match(body, /© 2026 Ultima AI, Inc\./, `${label}: legal footer text must use the verified legal entity`);
  assert.doesNotMatch(body, /The public graph links/i, `${label}: rejected public-graph footer copy must be absent`);
  if (routePath === "/") {
    assert.equal(totalFooterCount, 2, `${label}: homepage must preserve its testimonial/content footer plus one canonical site footer`);
    assert.match(
      body,
      /<footer><span>RK<\/span><b>River, SaaS founder<\/b><\/footer>/,
      `${label}: homepage testimonial/content footer must survive site footer replacement`,
    );
  } else {
    assert.equal(totalFooterCount, 1, `${label}: must have exactly one semantic footer`);
  }
}

function footerColumn(label, links) {
  return { label, links };
}

function footerLink(label, href, ctaId) {
  return { label, href, ctaId, ctaLocation: "site-footer" };
}

function specialFooterLink(label, href) {
  return { label, href };
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
