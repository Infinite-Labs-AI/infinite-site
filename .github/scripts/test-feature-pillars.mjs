import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { FOOTER_COLUMNS, PUBLIC_ROUTES } from "../../scripts/lib/public-site-manifest.mjs";
import { serveDatasetFixture } from "./fixtures/launch-videos-dataset.mjs";

const repoRoot = new URL("../..", import.meta.url).pathname;
const distDir = join(repoRoot, "dist");
const siteOrigin = "https://infinite.fast";

const pages = [
  {
    path: "/features/",
    file: "features/index.html",
    title: "Infinite Features | Infinite",
    h1: "Shipped workflows and current availability.",
    breadcrumb: ["Home", "Features"],
    primary: { href: "/features/ai-marketing-agents/", ctaId: "feature-ai-marketing-agents", location: "features-hub-primary" },
  },
  {
    path: "/features/ai-marketing-agents/",
    file: "features/ai-marketing-agents/index.html",
    title: "AI Marketing Agents for Founders | Infinite",
    h1: "An AI CMO that runs the work",
    breadcrumb: ["Home", "Features", "AI Marketing Agents"],
    status: "Shipped",
    primary: { href: "/download", downloadLocation: "feature-ai-marketing-agents-primary" },
    proof: { src: "/assets/features/ai-marketing-agents-scope.svg", alt: "Interface diagram of buyer-intent scope flowing into a ranked lead inbox" },
    support: [
      "/tools/high-intent-lead-finder-template/", "/agents/", "/compare/infinite-vs-okara/",
      "https://hub.infinite.fast/ai-marketing-agent-what-it-actually",
      "https://hub.infinite.fast/ai-cmo-whats-strategy-whats-execution",
      "https://hub.infinite.fast/growth-agent-playbook-what-it-does",
    ],
    related: ["/features/seo-aeo/", "/features/x-instagram-content/", "/features/ads/", "/features/email/", "/features/websites-ab-testing/"],
    required: [/Reddit, X, and selected Facebook Groups/i, /ranked lead inbox/i, /source URL/i, /does not send outreach replies/i],
    forbidden: [/scans private DMs/i, /scans the entire social web/i, /unbounded X search/i],
  },
  {
    path: "/features/seo-aeo/",
    file: "features/seo-aeo/index.html",
    title: "SEO + AEO Automation for Founders | Infinite",
    h1: "Turn buyer questions into pages search and answer engines can cite",
    breadcrumb: ["Home", "Features", "SEO + AEO"],
    status: "Shipped",
    primary: { href: "/download", downloadLocation: "feature-seo-aeo-primary" },
    proof: { src: "/assets/features/seo-aeo-review-loop.svg", alt: "Interface diagram of an SEO and AEO draft moving through review, publishing, and measurement" },
    support: [
      "/tools/seo-geo-brief-generator/", "https://hub.infinite.fast/9-best-seo-automation-tools-for",
      "https://hub.infinite.fast/answer-engine-optimization-aeo-how-to",
      "https://hub.infinite.fast/aeo-tracking-vs-rank-tracking-what",
    ],
    related: ["/features/ai-marketing-agents/", "/features/x-instagram-content/", "/features/websites-ab-testing/"],
    required: [/metered keyword research/i, /Google Search Console/i, /ChatGPT, Claude, and Google AI Overview/i, /sampled visibility/i],
    forbidden: [/guaranteed rankings/i, /guaranteed citations/i, /exhaustive AEO/i],
  },
  {
    path: "/features/x-instagram-content/",
    file: "features/x-instagram-content/index.html",
    title: "X + Instagram Content Generation for Founders | Infinite",
    h1: "Create X and Instagram content from what already works",
    breadcrumb: ["Home", "Features", "X + Instagram Content"],
    status: "Shipped",
    primary: { href: "/download", downloadLocation: "feature-x-instagram-content-primary" },
    proof: { src: "/assets/features/x-instagram-review-flow.svg", alt: "Interface diagram of attributed X and Instagram inspiration moving through draft and human review" },
    support: [
      "/tools/founder-content-ideas-generator/", "/compare/infinite-vs-blaze/",
      "https://hub.infinite.fast/ai-content-creator-vs-ai-content",
      "https://hub.infinite.fast/content-ops-for-solo-saas-founders",
      "https://hub.infinite.fast/9-ai-powered-content-creation-platforms",
    ],
    related: ["/features/ai-marketing-agents/", "/features/ads/", "/features/email/", "/features/websites-ab-testing/"],
    required: [/own connected Instagram account/i, /Instagram reel and carousel scripts/i, /BYO X app/i, /human review/i],
    forbidden: [/automatically produces finished Instagram media/i, /reads competitor content through the Graph API/i, /promises guaranteed reach/i],
  },
  {
    path: "/features/ads/",
    file: "features/ads/index.html",
    title: "AI Ad Operations for Meta and Google Ads | Infinite",
    h1: "Analyze, build, and control ads without handing an agent your budget",
    breadcrumb: ["Home", "Features", "AI Ads"],
    status: "Shipped",
    primary: { href: "/download", downloadLocation: "feature-ads-primary" },
    proof: { src: "/assets/features/ads-approval-boundary.svg", alt: "Interface diagram of an ad proposal moving through confirmation, policy guards, and action history" },
    support: [
      "https://hub.infinite.fast/ad-automation-for-saas-founders-what",
      "https://hub.infinite.fast/ai-ads-for-saas-founders-where",
      "https://hub.infinite.fast/ad-creative-ai-for-saas-what",
    ],
    related: ["/features/ai-marketing-agents/", "/features/websites-ab-testing/", "/features/email/", "/features/x-instagram-content/"],
    required: [/created paused/i, /requires confirmation/i, /policy guards/i, /Meta-first/i, /Google Ads infrastructure/i],
    forbidden: [/autonomous spend/i, /guaranteed ROAS/i, /Google UI parity/i, /What works — coming soon/i],
  },
  {
    path: "/features/email/",
    file: "features/email/index.html",
    title: "Email Operations in Infinite: Current Availability | Infinite",
    h1: "Email workflows are not yet a public Infinite product",
    breadcrumb: ["Home", "Features", "Email Availability"],
    status: "Current availability",
    primary: { href: "/features/ai-marketing-agents/", ctaId: "see-shipped-workflows", location: "feature-email-primary" },
    support: [
      "/features/ai-marketing-agents/", "/features/x-instagram-content/", "/features/websites-ab-testing/",
      "https://hub.infinite.fast/b2b-saas-marketing-the-full-funnel-playbook-for-positioning-demand-gen-retention",
      "https://hub.infinite.fast/campaign-tracking-build-a-system-that",
      "https://hub.infinite.fast/ai-copywriting-for-saas-founders-where",
    ],
    related: ["/features/ai-marketing-agents/", "/features/x-instagram-content/", "/features/websites-ab-testing/"],
    sections: ["What exists", "What is not public yet", "Launch prerequisites", "Related"],
    required: [
      /customer-facing email dashboard and coordinator are not public product surfaces/i,
      /visible sender and domain state/i, /audience and recipient count/i, /content preview/i,
      /unsubscribe and compliance state/i, /send time and timezone/i, /activation confirmation/i,
    ],
    forbidden: [/guarantees deliverability/i, /public inbox automation is shipped/i, /send campaigns now/i],
  },
  {
    path: "/features/websites-ab-testing/",
    file: "features/websites-ab-testing/index.html",
    title: "Websites, Landing Pages, and A/B Test Ideas | Infinite",
    h1: "Find landing-page friction and plan the next test",
    breadcrumb: ["Home", "Features", "Websites + A/B Ideas"],
    status: "CRO + A/B test ideas",
    primary: { href: "/tools/landing-page-ab-test-ideas-generator/", ctaId: "ab-test-ideas-tool", location: "feature-websites-primary" },
    support: [
      "/tools/landing-page-ab-test-ideas-generator/", "/compare/infinite-vs-ploy/",
      "https://hub.infinite.fast/landing-pages-for-saas-build-the",
      "https://hub.infinite.fast/best-landing-page-builder-6-tools",
      "https://hub.infinite.fast/conversion-rate-optimization-for-saas-a",
    ],
    related: ["/features/ai-marketing-agents/", "/features/ads/", "/features/email/", "/features/seo-aeo/"],
    required: [
      /does not create variants, split traffic, calculate significance, or roll out a winner/i,
      /Retained publishing and custom-domain infrastructure is not a current builder promise/i,
      /existing page/i,
    ],
    forbidden: [/AI landing page builder/i, /automatically picks a winner/i],
  },
];

const shippedSections = ["What it does", "Evidence", "Where the data comes from", "Review boundary", "Limitations", "Related"];
const featurePaths = pages.map((page) => page.path);

assert.deepEqual(
  PUBLIC_ROUTES.slice(0, 8).map((route) => route.path),
  ["/", ...featurePaths],
  "manifest must atomically activate the homepage plus all seven feature documents in binding order",
);
assert.equal(PUBLIC_ROUTES.length, 22, "final public graph has exactly 22 routes, including the noindex get-started gate");
assert.deepEqual(
  PUBLIC_ROUTES.find((route) => route.path === "/get-started/"),
  {
    id: "get-started",
    path: "/get-started/",
    source: "get-started/index.html",
    owner: "site",
    indexable: false,
    documentLog: true,
    footer: false,
    title: "Get started with Infinite",
    llmsSummary: "Email verification gate for downloading Infinite for Mac and opening the desktop app already signed in.",
    sitemap: null,
  },
  "get-started is a public document but not an indexable/site-footer route",
);
assert.deepEqual(
  FOOTER_COLUMNS[0]?.links.map(({ label, href, ctaId }) => ({ label, href, ctaId })),
  [
    { label: "AI Marketing Agents", href: "/features/ai-marketing-agents/", ctaId: "feature-ai-marketing-agents" },
    { label: "SEO + AEO", href: "/features/seo-aeo/", ctaId: "feature-seo-aeo" },
    { label: "X + Instagram Content", href: "/features/x-instagram-content/", ctaId: "feature-x-instagram-content" },
    { label: "AI Ads", href: "/features/ads/", ctaId: "feature-ads" },
    { label: "Email — availability", href: "/features/email/", ctaId: "feature-email" },
    { label: "Websites + A/B Ideas", href: "/features/websites-ab-testing/", ctaId: "feature-websites-ab-testing" },
  ],
  "final Product footer column must activate all six bounded destinations",
);

assert.ok(existsSync(join(repoRoot, "assets/feature-pages.css")), "shared feature-page CSS must exist");
const css = read("assets/feature-pages.css");
assert.match(css, /@media\s*\(max-width:\s*760px\)/, "feature pages need a mobile layout");
assert.match(css, /--feature-text:\s*#14202b/i, "feature text token is the reviewed high-contrast value");
assert.match(css, /--feature-muted:\s*#53616e/i, "feature muted token is the reviewed accessible value");
assertFocusContrast(css);

for (const page of pages) {
  assert.ok(existsSync(join(repoRoot, page.file)), `${page.file} must exist`);
  assertFeaturePage(read(page.file), page, `source ${page.path}`);
}
assertHubStatuses(read("features/index.html"), "source hub");
assertHomepageLinks(read("_agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html"), "source homepage");
assertLlmsRoles(read("llms.txt"), "source llms.txt");

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
  for (const page of pages) {
    const builtFile = page.path === "/features/" ? "dist/features/index.html" : `dist${page.path}index.html`;
    assertFeaturePage(read(builtFile), page, `build ${page.path}`);
  }
  assertHubStatuses(read("dist/features/index.html"), "build hub");
  assert.match(read("dist/features/index.html"), /AI CMO workspace for founders and small teams\./i, "built footer keeps the useful product description");
  assert.doesNotMatch(read("dist/features/index.html"), /The public graph links/i, "built footer omits rejected public-graph copy");
  assertHomepageLinks(read("dist/index.html"), "build homepage");
  assertLlmsRoles(read("dist/llms.txt"), "build llms.txt");
} finally {
  dataset.close();
  rmSync(distDir, { recursive: true, force: true });
}

console.log("Feature pillar verification passed for seven source and built documents.");

function assertFeaturePage(html, page, label) {
  assert.match(html, new RegExp(`<title>${escapeRegExp(page.title)}<\\/title>`), `${label}: exact title`);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${label}: exactly one H1`);
  assert.match(html, new RegExp(`<h1[^>]*>${escapeRegExp(page.h1)}<\\/h1>`), `${label}: exact H1`);
  const canonicalUrl = siteOrigin + page.path;
  assert.match(html, new RegExp(`<link rel="canonical" href="${escapeRegExp(canonicalUrl)}">`), `${label}: self canonical`);
  assert.equal((html.match(/<meta\b[^>]*property="og:url"[^>]*>/g) ?? []).length, 1, `${label}: exactly one og:url`);
  assert.match(html, new RegExp(`<meta property="og:url" content="${escapeRegExp(canonicalUrl)}">`), `${label}: canonical og:url`);
  assert.match(html, new RegExp(`href="${escapeRegExp("/features/" )}"`), `${label}: crawlable Features breadcrumb`);
  for (const crumb of page.breadcrumb) assert.match(html, new RegExp(`>${escapeRegExp(crumb)}<`), `${label}: visible breadcrumb ${crumb}`);
  const graph = jsonLdGraph(html, label);
  const webPage = graph.find((node) => node["@type"] === "WebPage");
  assert.ok(webPage, `${label}: WebPage JSON-LD`);
  assert.equal(webPage.url, siteOrigin + page.path);
  assert.equal(webPage.dateModified, "2026-08-30");
  assert.deepEqual(webPage.isPartOf, { "@id": "https://infinite.fast/#website" });
  const breadcrumbs = graph.find((node) => node["@type"] === "BreadcrumbList");
  assert.ok(breadcrumbs, `${label}: BreadcrumbList JSON-LD`);
  assert.deepEqual(breadcrumbs.itemListElement.map((item) => item.name), page.breadcrumb);
  assertPrimary(html, page.primary, label);
  if (page.status) assert.match(html, new RegExp(`>${escapeRegExp(page.status)}<`), `${label}: exact status`);
  if (page.proof) {
    assert.match(html, new RegExp(`<img[^>]*src="${escapeRegExp(page.proof.src)}"[^>]*alt="${escapeRegExp(page.proof.alt)}"`), `${label}: approved proof asset and alt`);
    assert.match(html, /Interface diagram[\s\S]*synthetic labels[\s\S]*not a screenshot/i, `${label}: proof disclosure`);
    for (const section of shippedSections) assert.match(html, new RegExp(`<h2[^>]*>${escapeRegExp(section)}<\\/h2>`), `${label}: ${section} section`);
  }
  for (const section of page.sections ?? []) assert.match(html, new RegExp(`<h2[^>]*>${escapeRegExp(section)}<\\/h2>`), `${label}: ${section} section`);
  for (const href of page.support ?? []) assert.match(html, new RegExp(`href="${escapeRegExp(href)}"`), `${label}: support link ${href}`);
  for (const href of page.related ?? []) assert.match(html, new RegExp(`href="${escapeRegExp(href)}"`), `${label}: related feature ${href}`);
  for (const pattern of page.required ?? []) assert.match(html, pattern, `${label}: required claim ${pattern}`);
  for (const pattern of page.forbidden ?? []) assert.doesNotMatch(html, pattern, `${label}: forbidden claim ${pattern}`);
  assert.doesNotMatch(html, /blog\.infinite\.fast|1bu-1|legendary-teeth|\/Users\//i, `${label}: no retired/private references`);
  if (label.startsWith("source ")) assert.doesNotMatch(html, /www\.infinite\.fast/i, `${label}: source copy has no noncanonical host`);
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
  if (page.path === "/features/email/") {
    assert.doesNotMatch(main, /href="\/download"|\/assets\/features\//, `${label}: Email main has no download CTA or fake screenshot`);
  }
  if (page.path === "/features/websites-ab-testing/") {
    assert.doesNotMatch(main, /\/assets\/features\//, `${label}: Websites page has no builder screenshot`);
  }
  for (const anchor of html.match(/<a\b[^>]*href="[^"]+"[^>]*>/g) ?? []) {
    assert.doesNotMatch(anchor, /tabindex="-1"/, `${label}: CTA/card link must remain keyboard-focusable`);
  }
}

function assertFocusContrast(styles) {
  const tokens = Object.fromEntries(
    [...styles.matchAll(/--(feature-(?:bg|card|text|focus|focus-halo)):\s*(#[0-9a-f]{6})/gi)]
      .map((match) => [match[1], match[2].toLowerCase()]),
  );
  for (const token of ["feature-bg", "feature-card", "feature-text", "feature-focus", "feature-focus-halo"]) {
    assert.match(tokens[token] ?? "", /^#[0-9a-f]{6}$/, `focus contract must declare --${token}`);
  }
  assert.match(
    styles,
    /a:focus-visible,button:focus-visible\{[^}]*outline:\s*3px solid var\(--feature-focus\)[^}]*outline-offset:\s*4px[^}]*box-shadow:\s*0 0 0 7px var\(--feature-focus-halo\)/,
    "every feature link/button must receive the shared two-color keyboard focus treatment",
  );
  for (const adjacent of ["feature-bg", "feature-card"]) {
    const ratio = contrastRatio(tokens["feature-focus"], tokens[adjacent]);
    assert.ok(ratio >= 3, `--feature-focus must be >=3:1 against --${adjacent}; got ${ratio.toFixed(2)}:1`);
  }
  const darkRatio = contrastRatio(tokens["feature-focus-halo"], tokens["feature-text"]);
  assert.ok(darkRatio >= 3, `--feature-focus-halo must be >=3:1 against dark controls; got ${darkRatio.toFixed(2)}:1`);
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

function assertHubStatuses(html, label) {
  assert.equal((html.match(/class="feature-status feature-status--shipped">Shipped<\/span>/g) ?? []).length, 4, `${label}: exactly four Shipped cards`);
  assert.equal((html.match(/>Current availability<\/span>/g) ?? []).length, 1, `${label}: one Email availability card`);
  assert.equal((html.match(/>CRO \+ A\/B test ideas<\/span>/g) ?? []).length, 1, `${label}: one Websites bounded-status card`);
  for (const path of featurePaths.slice(1)) assert.match(html, new RegExp(`href="${escapeRegExp(path)}"`), `${label}: card link ${path}`);
}

function assertHomepageLinks(html, label) {
  assert.doesNotMatch(html, /Perplexity|TikTok/i, `${label}: no unshipped AEO engine or content connector claim`);
  for (const item of [
    ["AI Marketing Agents", "/features/ai-marketing-agents/", "feature-ai-marketing-agents"],
    ["SEO + AEO", "/features/seo-aeo/", "feature-seo-aeo"],
    ["X + Instagram Content", "/features/x-instagram-content/", "feature-x-instagram-content"],
    ["AI Ads", "/features/ads/", "feature-ads"],
    ["Email — availability", "/features/email/", "feature-email"],
    ["Websites + A/B Ideas", "/features/websites-ab-testing/", "feature-websites-ab-testing"],
  ]) {
    const [text, href, ctaId] = item;
    assert.match(
      html,
      new RegExp(`<a[^>]*href="${escapeRegExp(href)}"[^>]*data-analytics-cta-id="${ctaId}"[^>]*data-analytics-cta-location="homepage-capabilities"[^>]*>${escapeRegExp(text)}<\\/a>`),
      `${label}: contextual ${text} link`,
    );
  }
}

function assertLlmsRoles(text, label) {
  for (const [status, href, name] of [
    ["Shipped", "/features/ai-marketing-agents/", "AI Marketing Agents"],
    ["Shipped", "/features/seo-aeo/", "SEO + AEO"],
    ["Shipped", "/features/x-instagram-content/", "X + Instagram Content"],
    ["Shipped", "/features/ads/", "AI Ads"],
    ["Current availability", "/features/email/", "Email"],
    ["CRO + A/B test ideas", "/features/websites-ab-testing/", "Websites + A/B Ideas"],
  ]) {
    assert.match(text, new RegExp(`- \\*\\*${escapeRegExp(status)}\\*\\* — \\[${escapeRegExp(name)}\\]\\(${escapeRegExp(siteOrigin + href)}\\)`), `${label}: ${name} status-aware role`);
  }
}

function assertPrimary(html, primary, label) {
  const anchors = html.match(/<a\b[^>]*>/g) ?? [];
  if (primary.downloadLocation) {
    assert.ok(anchors.some((anchor) => anchor.includes(`href="${primary.href}"`) && anchor.includes(`data-download-location="${primary.downloadLocation}"`)), `${label}: download CTA`);
    return;
  }
  assert.ok(
    anchors.some((anchor) => anchor.includes(`href="${primary.href}"`) && anchor.includes(`data-analytics-cta-id="${primary.ctaId}"`) && anchor.includes(`data-analytics-cta-location="${primary.location}"`)),
    `${label}: primary CTA`,
  );
}

function jsonLdGraph(html, label) {
  const blocks = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(blocks.length > 0, `${label}: JSON-LD`);
  return blocks.flatMap((match) => {
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed];
  });
}

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
