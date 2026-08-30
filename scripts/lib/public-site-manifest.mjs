export const SITE_ORIGIN = "https://infinite.fast";
export const HUB_ORIGIN = "https://hub.infinite.fast";
export const GITHUB_ORIGIN = "https://github.com/Infinite-Labs-AI";
export const DOWNLOAD_PATH = "/download";

export const PUBLIC_ROUTES = deepFreeze([
  route({
    id: "home",
    path: "/",
    source: "_agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html",
    owner: "site",
    title: "Infinite — AI CMO for founders",
    llmsSummary: "AI marketing operators, launch systems, and growth tools for solo founders and small teams.",
    lastmod: "2026-07-22",
    changefreq: "weekly",
    priority: "1.0",
  }),
  route({
    id: "agents",
    path: "/agents/",
    source: "agents/index.html",
    owner: "agents",
    title: "AI agents",
    llmsSummary: "Public entry point for Infinite's AI agent surfaces and open-source agent paths.",
    lastmod: "2026-08-17",
    changefreq: "weekly",
    priority: "0.8",
  }),
  route({
    id: "tools",
    path: "/tools/",
    source: "tools/index.html",
    owner: "tools",
    title: "Free AI marketing tools",
    llmsSummary: "A directory of free founder-facing tools for lead research, SEO briefs, landing-page tests, and content ideas.",
    lastmod: "2026-07-22",
    changefreq: "weekly",
    priority: "0.8",
  }),
  route({
    id: "tool-lead-finder",
    path: "/tools/high-intent-lead-finder-template/",
    source: "tools/high-intent-lead-finder-template/index.html",
    owner: "tools",
    title: "High-intent lead finder template",
    llmsSummary: "A free template for turning buyer-intent signals into an actionable lead list.",
    lastmod: "2026-07-22",
    changefreq: "monthly",
    priority: "0.7",
  }),
  route({
    id: "tool-seo-geo",
    path: "/tools/seo-geo-brief-generator/",
    source: "tools/seo-geo-brief-generator/index.html",
    owner: "tools",
    title: "SEO + GEO brief generator",
    llmsSummary: "A free brief generator for SEO, GEO, and AI-answer visibility planning.",
    lastmod: "2026-07-22",
    changefreq: "monthly",
    priority: "0.7",
  }),
  route({
    id: "tool-ab-ideas",
    path: "/tools/landing-page-ab-test-ideas-generator/",
    source: "tools/landing-page-ab-test-ideas-generator/index.html",
    owner: "tools",
    title: "Landing-page A/B test ideas generator",
    llmsSummary: "A free generator for landing-page experiments and conversion hypotheses.",
    lastmod: "2026-07-22",
    changefreq: "monthly",
    priority: "0.7",
  }),
  route({
    id: "tool-content-ideas",
    path: "/tools/founder-content-ideas-generator/",
    source: "tools/founder-content-ideas-generator/index.html",
    owner: "tools",
    title: "Founder content ideas generator",
    llmsSummary: "A free generator for founder-led content angles and campaign ideas.",
    lastmod: "2026-07-22",
    changefreq: "monthly",
    priority: "0.7",
  }),
  route({
    id: "compare",
    path: "/compare/",
    source: "compare/index.html",
    owner: "compare",
    title: "Infinite comparisons",
    llmsSummary: "A hub for comparing Infinite with adjacent AI marketing and content tools.",
    lastmod: "2026-07-22",
    changefreq: "monthly",
    priority: "0.8",
  }),
  route({
    id: "compare-okara",
    path: "/compare/infinite-vs-okara/",
    source: "compare/infinite-vs-okara/index.html",
    owner: "compare",
    title: "Infinite vs Okara",
    llmsSummary: "A focused comparison for founders evaluating Infinite and Okara.",
    lastmod: "2026-07-22",
    changefreq: "monthly",
    priority: "0.7",
  }),
  route({
    id: "compare-ploy",
    path: "/compare/infinite-vs-ploy/",
    source: "compare/infinite-vs-ploy/index.html",
    owner: "compare",
    title: "Infinite vs Ploy",
    llmsSummary: "A focused comparison for founders evaluating Infinite and Ploy.",
    lastmod: "2026-07-22",
    changefreq: "monthly",
    priority: "0.7",
  }),
  route({
    id: "compare-blaze",
    path: "/compare/infinite-vs-blaze/",
    source: "compare/infinite-vs-blaze/index.html",
    owner: "compare",
    title: "Infinite vs Blaze",
    llmsSummary: "A focused comparison for founders evaluating Infinite and Blaze.",
    lastmod: "2026-07-22",
    changefreq: "monthly",
    priority: "0.7",
  }),
  route({
    id: "launch-videos",
    path: "/startup-launch-videos/",
    source: "scripts/build-launch-videos.mjs",
    owner: "resources",
    title: "Startup launch video leaderboard",
    llmsSummary: "A public leaderboard and study surface for startup launch videos.",
    lastmod: "2026-08-19",
    changefreq: "daily",
    priority: "0.9",
  }),
  route({
    id: "privacy",
    path: "/privacy/",
    source: "privacy/index.html",
    owner: "legal",
    title: "Privacy policy",
    llmsSummary: "Infinite's public privacy policy and analytics preference entry point.",
    lastmod: "2026-08-02",
    changefreq: "yearly",
    priority: "0.3",
  }),
  route({
    id: "terms",
    path: "/terms/",
    source: "terms/index.html",
    owner: "legal",
    title: "Terms of service",
    llmsSummary: "Infinite's public terms of service.",
    lastmod: "2026-07-22",
    changefreq: "yearly",
    priority: "0.3",
  }),
]);

export const PUBLIC_SITE_ROUTES = PUBLIC_ROUTES;
export const KNOWN_DOCUMENT_PATHS = Object.freeze(PUBLIC_ROUTES.filter((route) => route.documentLog).map((route) => route.path));
export const SITEMAP_ROUTES = Object.freeze(PUBLIC_ROUTES.filter((route) => route.indexable && route.sitemap));

export const FOOTER_COLUMNS = deepFreeze([
  footerColumn("Agents & Open Source", [
    internal("Agent Ecosystem", "/agents/", "agents"),
    external("Infinite OS", `${GITHUB_ORIGIN}/infinite-os`, "infinite-os-github"),
    external("Infinite Skills", `${GITHUB_ORIGIN}/infinite-skills`, "infinite-skills-github"),
    external("Press Agent", `${GITHUB_ORIGIN}/infinite-press-agent`, "press-agent-github"),
    external("GitHub", GITHUB_ORIGIN, "github-org"),
    specialInternal("llms.txt", "/llms.txt"),
  ]),
  footerColumn("Free Tools", [
    internal("All Tools", "/tools/", "tools"),
    internal("Lead Finder", "/tools/high-intent-lead-finder-template/", "tool-lead-finder"),
    internal("SEO + GEO Brief", "/tools/seo-geo-brief-generator/", "tool-seo-geo"),
    internal("A/B Test Ideas", "/tools/landing-page-ab-test-ideas-generator/", "tool-ab-ideas"),
    internal("Founder Content Ideas", "/tools/founder-content-ideas-generator/", "tool-content-ideas"),
  ]),
  footerColumn("Resources", [
    external("Growth Hub", `${HUB_ORIGIN}/`, "growth-hub"),
    external("Research", `${HUB_ORIGIN}/research`, "hub-research"),
    internal("Launch Videos", "/startup-launch-videos/", "launch-videos"),
    external("Launch Video Study", `${HUB_ORIGIN}/research/launch-videos`, "launch-video-study"),
    external("Hub RSS", `${HUB_ORIGIN}/feed.xml`, "hub-rss"),
  ]),
  footerColumn("Compare", [
    internal("All Comparisons", "/compare/", "compare"),
    internal("Infinite vs Blaze", "/compare/infinite-vs-blaze/", "compare-blaze"),
    internal("Infinite vs Okara", "/compare/infinite-vs-okara/", "compare-okara"),
    internal("Infinite vs Ploy", "/compare/infinite-vs-ploy/", "compare-ploy"),
  ]),
  footerColumn("Company", [
    {
      label: "Download for Mac",
      href: DOWNLOAD_PATH,
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
    internal("Privacy", "/privacy/", "privacy"),
    internal("Terms", "/terms/", "terms"),
    specialInternal("Sitemap", "/sitemap.xml"),
  ]),
]);

export function absoluteSiteUrl(path) {
  return `${SITE_ORIGIN}${path === "/" ? "/" : path}`;
}

export function assertPublicSiteManifest() {
  const ids = new Set();
  const paths = new Set();
  const routeIdsByPath = new Map();
  const routePaths = new Set(PUBLIC_ROUTES.map((route) => route.path));
  const allowedSpecialInternal = new Set([DOWNLOAD_PATH, "/llms.txt", "/sitemap.xml"]);
  const forbiddenText = /blog\.infinite\.fast|www\.infinite\.fast|github\.com\/[^"'\s]+\/1bu-1\b|\/mcp\//i;

  assertNoForbiddenText("manifest", JSON.stringify({ PUBLIC_ROUTES, FOOTER_COLUMNS }), forbiddenText);

  for (const route of PUBLIC_ROUTES) {
    const requiredFields = ["id", "path", "source", "owner", "indexable", "documentLog", "footer", "title", "llmsSummary", "sitemap"];
    for (const field of requiredFields) {
      if (!(field in route)) throw new Error(`${route.path ?? route.id ?? "(unknown route)"}: missing required route field ${field}`);
    }

    if (!/^[a-z0-9-]+$/.test(route.id)) throw new Error(`${route.path}: broken route id ${route.id}`);
    if (ids.has(route.id)) throw new Error(`Duplicate route id: ${route.id}`);
    ids.add(route.id);

    if (!isNormalizedDocumentPath(route.path)) throw new Error(`${route.id}: non-normalized document path ${route.path}`);
    if (paths.has(route.path)) throw new Error(`Duplicate route path: ${route.path}`);
    paths.add(route.path);
    routeIdsByPath.set(route.path, route.id);

    if (typeof route.source !== "string" || route.source.length === 0) throw new Error(`${route.path}: route source must be a non-empty string`);
    if (typeof route.owner !== "string" || route.owner.length === 0) throw new Error(`${route.path}: route owner must be a non-empty string`);
    if (typeof route.indexable !== "boolean") throw new Error(`${route.path}: indexable must be boolean`);
    if (typeof route.documentLog !== "boolean") throw new Error(`${route.path}: documentLog must be boolean`);
    if (typeof route.footer !== "boolean") throw new Error(`${route.path}: footer must be boolean`);
    if (typeof route.title !== "string" || route.title.length === 0) throw new Error(`${route.path}: title must be non-empty`);
    if (typeof route.llmsSummary !== "string" || route.llmsSummary.length === 0) throw new Error(`${route.path}: llmsSummary must be non-empty`);
    assertSitemap(route);
  }

  for (const path of KNOWN_DOCUMENT_PATHS) {
    if (!routePaths.has(path)) throw new Error(`Known document path is not a public route: ${path}`);
  }

  for (const route of SITEMAP_ROUTES) {
    if (!routePaths.has(route.path)) throw new Error(`Sitemap route is not a public route: ${route.path}`);
  }

  const columnLabels = new Set();
  for (const column of FOOTER_COLUMNS) {
    if (columnLabels.has(column.label)) throw new Error(`Duplicate footer column label: ${column.label}`);
    columnLabels.add(column.label);
    if (!Array.isArray(column.links) || column.links.length === 0) throw new Error(`${column.label}: footer column must have links`);

    for (const link of column.links) {
      if (typeof link.label !== "string" || link.label.length === 0) throw new Error(`${column.label}: footer link must have a non-empty label`);
      if (typeof link.href !== "string" || link.href.length === 0) throw new Error(`${column.label} > ${link.label}: footer link must have a non-empty href`);

      if (link.href.startsWith("https://")) {
        if (!isAllowedExternal(link.href)) throw new Error(`${column.label} > ${link.label}: external footer href is not allowlisted: ${link.href}`);
        if (!link.ctaId || !/^[a-z0-9_-]{1,64}$/.test(link.ctaId)) {
          throw new Error(`${column.label} > ${link.label}: external footer link must have bounded CTA ID`);
        }
        if (link.ctaLocation !== "site-footer") throw new Error(`${column.label} > ${link.label}: external CTA location must be site-footer`);
        continue;
      }

      if (!link.href.startsWith("/")) throw new Error(`${column.label} > ${link.label}: external footer link must use HTTPS: ${link.href}`);

      const [internalPath, fragment] = link.href.split("#");
      if (!routePaths.has(internalPath) && !allowedSpecialInternal.has(internalPath)) {
        throw new Error(`${column.label} > ${link.label}: unknown internal destination ${link.href}`);
      }
      if (fragment && link.requiredFragment !== fragment) {
        throw new Error(`${column.label} > ${link.label}: missing required fragment metadata for #${fragment}`);
      }
      if (link.href === DOWNLOAD_PATH && link.downloadLocation !== "site-footer") {
        throw new Error(`${column.label} > ${link.label}: /download must render data-download-location=site-footer`);
      }
      if (link.ctaId) {
        if (!/^[a-z0-9_-]{1,64}$/.test(link.ctaId)) throw new Error(`${column.label} > ${link.label}: bounded CTA ID required`);
        if (link.ctaLocation !== "site-footer") throw new Error(`${column.label} > ${link.label}: CTA location must be site-footer`);
        if (routeIdsByPath.has(internalPath) && link.ctaId !== routeIdsByPath.get(internalPath)) {
          throw new Error(`${column.label} > ${link.label}: CTA ID ${link.ctaId} does not match route ID ${routeIdsByPath.get(internalPath)}`);
        }
      }
    }
  }
}

function route({ id, path, source, owner, title, llmsSummary, lastmod, changefreq, priority }) {
  return {
    id,
    path,
    source,
    owner,
    indexable: true,
    documentLog: true,
    footer: true,
    title,
    llmsSummary,
    sitemap: {
      lastmod,
      changefreq,
      priority,
    },
  };
}

function footerColumn(label, links) {
  return { label, links };
}

function internal(label, href, ctaId) {
  return {
    label,
    href,
    ctaId,
    ctaLocation: "site-footer",
  };
}

function specialInternal(label, href) {
  return {
    label,
    href,
  };
}

function external(label, href, ctaId) {
  return {
    label,
    href,
    ctaId,
    ctaLocation: "site-footer",
  };
}

function isNormalizedDocumentPath(path) {
  return typeof path === "string" && path.startsWith("/") && (path === "/" || path.endsWith("/")) && !path.includes("//");
}

function isAllowedExternal(href) {
  return (
    href === GITHUB_ORIGIN ||
    href.startsWith(`${GITHUB_ORIGIN}/`) ||
    href === `${HUB_ORIGIN}/` ||
    href.startsWith(`${HUB_ORIGIN}/`)
  );
}

function assertSitemap(route) {
  if (!route.sitemap || typeof route.sitemap !== "object") throw new Error(`${route.path}: sitemap metadata required`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(route.sitemap.lastmod)) throw new Error(`${route.path}: sitemap.lastmod must be ISO date`);
  if (!/^(daily|weekly|monthly|yearly)$/.test(route.sitemap.changefreq)) throw new Error(`${route.path}: sitemap.changefreq invalid`);
  if (!/^(?:0\.[0-9]|1\.0)$/.test(route.sitemap.priority)) throw new Error(`${route.path}: sitemap.priority invalid`);
}

function assertNoForbiddenText(label, value, pattern) {
  if (pattern.test(value)) throw new Error(`${label}: forbidden public-site string found`);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
