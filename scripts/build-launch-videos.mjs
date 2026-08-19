/**
 * Builds the two launch-video pages into dist as real static HTML.
 *
 *   /startup-launch-videos/   the live leaderboard, ranked at build time
 *   /research/launch-videos/  the study
 *
 * WHY THE DATA COMES OVER HTTP. The ranking lives in the app's Postgres, but this repo has no
 * database credentials and should never get any: it is a marketing site. It reads the SAME public
 * CC-BY dataset endpoint that anyone else can (api.ultima.inc/api/launch-videos), which means the
 * numbers on the page are provably the numbers we publish, and a build needs no secrets at all.
 *
 * WHY IT FAILS LOUDLY. If the dataset cannot be fetched the build stops. The alternative — falling
 * back to a committed snapshot — would publish a stale ranking under a page that says "live data,
 * refreshed <date>", and quietly lying about freshness is worse than a visibly failed deploy.
 *
 * FRESHNESS. New rows reach the page only when this runs, so every writer that changes the ranking
 * (the daily refresh task, an admin approval) pings a Vercel Deploy Hook — see
 * src/lib/launch-leaderboard/publish.ts in 1bu-1.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  DATASET_API,
  datasetSource,
  FONT_CSS,
  FOOTER_CSS,
  LEADERBOARD_PATH,
  LEADERBOARD_URL,
  NAV_CSS,
  ORIGIN,
  STUDY_PATH,
  STUDY_URL,
  esc,
  footerHtml,
  jsonLd,
  navHtml,
} from "./lib/launch-video-chrome.mjs";
import { LEADERBOARD_CSS } from "./lib/launch-leaderboard-css.mjs";
import { PLAYBOOK_CSS, PLAYBOOK_HTML, PLAYBOOK_JS } from "./research/launch-video-index.mjs";
import { LAUNCH_VIDEO_FAQ } from "./research/launch-video-faq.mjs";

const require = createRequire(import.meta.url);
// Loaded for its side effect: the shared renderer assigns itself to globalThis so this build and
// the browser run the exact same row-rendering code. See assets/launch-leaderboard.js.
require("../assets/launch-leaderboard.js");
const LB = globalThis.LaunchLeaderboard;

const ASSETS =
  "https://wdxjduorvpayxixpmskf.supabase.co/storage/v1/object/public/web-assets/launchvids";
const AUTHOR = "River Tamoor Baig";
const PUBLISHED_ISO = "2026-08-17T00:00:00.000Z";
const REFRESHED_HUMAN = "17 August 2026";

const head = ({ title, description, canonical, image, type = "website", extraLd = [] }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#ffffff">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Infinite">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${image}">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${extraLd.map((d) => `<script type="application/ld+json">${jsonLd(d)}</script>`).join("\n")}
`;

const ORG = { "@type": "Organization", name: "Infinite", "@id": `${ORIGIN}#org`, url: ORIGIN };

function compact(n) {
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// ── The leaderboard ─────────────────────────────────────────────────────────────────────────────
/**
 * Drop any URL that is not plainly http(s) BEFORE it reaches the page.
 *
 * The renderer already refuses to emit such an href, so this is not what stops the click — it is
 * what stops the string being PUBLISHED at all. Without it a hostile `javascript:` URL still ships
 * inside the inlined JSON blob: inert today, but it is attacker-authored script text sitting in a
 * file we serve, one careless future consumer away from mattering. Publish only what we would be
 * willing to render.
 */
function sanitizeRows(rows) {
  return rows.map((row) => ({
    ...row,
    tweet_url: LB.safeHref(row.tweet_url),
    startup_url: LB.safeHref(row.startup_url),
  }));
}

function leaderboardHtml(payload) {
  const rows = sanitizeRows(payload.rows);
  const view = LB.resolve(rows, { sortKey: "views", page: 1, query: "" });
  const totalViews = rows.reduce((sum, r) => sum + (r.views || 0), 0);
  // Orchid's reported ~32M is added because it IS the biggest launch of the period, even though its
  // post is gone and its numbers cannot be re-verified — which is why it sits above the ranking.
  const combined = totalViews + 32_000_000;
  const averageViews = rows.length ? Math.round(totalViews / rows.length) : 0;
  const asOf = payload.as_of;

  const heroStats = [
    [compact(combined), "combined views"],
    [String(rows.length), "launches ranked"],
    [compact(averageViews), "average views"],
  ];

  const dataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: payload.name,
    description: payload.description,
    url: LEADERBOARD_URL,
    sameAs: STUDY_URL,
    keywords: [
      "startup launch videos", "launch video", "startup launch",
      "product launch video", "launch video views", "startup marketing",
    ],
    license: payload.license_url,
    isAccessibleForFree: true,
    creativeWorkStatus: "Published",
    dateModified: asOf,
    temporalCoverage: "2025/2026",
    measurementTechnique:
      "Hand-verified startup launches on X, engagement metrics collected per post",
    creator: ORG,
    distribution: [
      { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: DATASET_API },
      { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${DATASET_API}/csv` },
    ],
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: payload.name,
    numberOfItems: Math.min(25, rows.length),
    itemListElement: view.sorted.slice(0, 25).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.startup,
      url: r.startup_url || r.tweet_url,
    })),
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: payload.name,
    description: payload.description,
    url: LEADERBOARD_URL,
    isPartOf: { "@type": "WebSite", name: "Infinite", url: ORIGIN },
    publisher: ORG,
  };

  const studyCard = `<a class="llb-studycard" href="${STUDY_PATH}">
  <span class="llb-studycard-thumb" style="background-image:url(${ASSETS}/hero-poster.jpg)"></span>
  <span class="llb-studycard-body">
    <span class="llb-studycard-k">The deep dive</span><b>The Launch Video Index</b>
    <span class="llb-studycard-sub">We studied 194 launches to find what actually makes one spread: hook, difference, pacing, emotion. Every finding charted.</span>
  </span>
  <span class="llb-studycard-cta">Read the study &rarr;</span>
</a>`;

  const submitBtn = `<button type="button" class="llb-submit" data-submit><span class="llb-submit-plus">+</span> Submit your startup</button>`;

  const table = `<div class="llb" id="llb">
  <div class="llb-bar">
    ${submitBtn}
    <input class="llb-search" type="search" placeholder="Search a startup, founder or @handle…" aria-label="Search the leaderboard">
    ${LB.pagerHtml(view, "top") || '<div class="llb-pager llb-pager-top"></div>'}
  </div>
  <div class="llb-scroll">
    <table class="llb-table">
      <thead>${LB.headHtml(view.sortKey)}</thead>
      <tbody>${LB.bodyHtml(view)}</tbody>
    </table>
    <p class="llb-empty" hidden></p>
  </div>
  ${LB.pagerHtml(view, "bottom") || '<div class="llb-pager llb-pager-bottom"></div>'}
</div>`;

  const body = `<main class="llb-page">
${navHtml()}
<header class="llb-hero">
  <video class="llb-hero-vid" autoplay muted loop playsinline preload="auto" poster="${ASSETS}/hero-poster.jpg"><source src="${ASSETS}/hero-collage.mp4" type="video/mp4"></video>
  <div class="llb-wrap llb-hero-in">
    <h1>The Startup Launch<br>Video Leaderboard</h1>
    <p class="llb-deck">Every startup launch video on X, ranked.</p>
    <div class="llb-timer" role="status"><span class="llb-timer-dot" aria-hidden="true"></span>Live page &middot; updates every 48h</div>
    <div class="llb-stats">${heroStats.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("")}</div>
  </div>
</header>

<section class="llb-wrap llb-body">
${studyCard}
${table}
<div class="llb-grid2">
  <div class="llb-cite">
    <p class="llb-cite-k">Free to use, with credit</p>
    <p class="llb-cite-lead">Published under <a href="${payload.license_url}" target="_blank" rel="noopener noreferrer">Creative Commons BY 4.0</a>. Quote it, chart it, embed it, or feed it to an agent. Just credit Infinite and link back.</p>
    <div class="llb-endpoints">
      <a href="${DATASET_API}"><b>data.json</b><span>machine-readable</span></a>
      <a href="${DATASET_API}/csv"><b>data.csv</b><span>spreadsheet-ready</span></a>
    </div>
    <p class="llb-attr"><span>Suggested citation</span>${esc(payload.attribution)}</p>
  </div>
  <div class="llb-method">
    <p class="llb-cite-k">How this is built</p>
    <p>We reviewed ${rows.length}+ startup launch videos on X and kept only the genuine startup launches, not established companies shipping a feature. Metrics are a snapshot, current as of ${esc(asOf)}; a re-run updates them.</p>
    <a class="llb-study" href="${STUDY_PATH}">Read the full analysis &rarr;<span>The Launch Video Index: what actually drives reach</span></a>
  </div>
</div>
</section>

<section class="llb-wrap llb-benefits">
  <div class="llb-benefits-in">
    <div class="llb-benefits-copy">
      <p class="llb-cite-k">Why submit</p>
      <h2>The benefits of submitting your startup</h2>
      <p class="llb-benefits-sub">One link. A permanent spot on a dataset that founders, investors, and AI models actually read.</p>
      ${submitBtn}
    </div>
    <ul class="llb-benefits-list">
      <li><b>Boost your domain rating</b><span>A dofollow backlink from a CC-BY 4.0 dataset &mdash; real link equity, and it stays.</span></li>
      <li><b>Get in front of the right people</b><span>Investors, customers, and founders browse the leaderboard for what&rsquo;s breaking out.</span></li>
      <li><b>Show up in AI answers</b><span>The data is machine-readable (JSON / CSV) and openly cited, so agents and LLMs surface you.</span></li>
      <li><b>Free and permanent</b><span>No cost, no account, ten seconds &mdash; and it stays live as the ranking refreshes.</span></li>
    </ul>
  </div>
</section>

${footerHtml(`Live data, refreshed ${esc(asOf)}`)}
</main>
<script type="application/json" id="llb-data">${JSON.stringify(rows).replace(/</g, "\\u003c")}</script>
<script src="/assets/launch-leaderboard.js" defer></script>
<script src="/assets/launch-submit.js" defer></script>`;

  return `${head({
    title: "Startup Launch Video Leaderboard: the most-viewed launches on X (2026)",
    description: payload.description,
    canonical: LEADERBOARD_URL,
    image: `${ASSETS}/breaker-1.jpg`,
    extraLd: [dataset, itemList, webPage],
  })}<style>${FONT_CSS}${LEADERBOARD_CSS}${NAV_CSS}${FOOTER_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ── The study ───────────────────────────────────────────────────────────────────────────────────
function studyHtml() {
  const meta = {
    title: "The Launch Video Index",
    seoTitle: "We Studied 194 Startup Launch Videos — What Actually Goes Viral (2026)",
    description:
      "An analysis of 194 hand-verified startup launch videos on X: the best 20 got 82M views, the worst 20 got 323, and the difference wasn't clarity. What separates a launch video that spreads from one nobody watches, with every finding charted.",
  };
  const image = `${ASSETS}/hero-poster.jpg`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${STUDY_URL}#article`,
        headline: meta.seoTitle,
        description: meta.description,
        // A named human with a fact attached, not a bare string, so the byline resolves to an entity.
        author: {
          "@type": "Person",
          name: AUTHOR,
          jobTitle: "Founder, Infinite",
          worksFor: { "@type": "Organization", name: "Infinite" },
        },
        publisher: ORG,
        datePublished: PUBLISHED_ISO,
        dateModified: PUBLISHED_ISO,
        mainEntityOfPage: { "@type": "WebPage", "@id": STUDY_URL },
        image,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${STUDY_URL}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Infinite", item: ORIGIN },
          { "@type": "ListItem", position: 2, name: "Research", item: `${ORIGIN}/research/` },
          { "@type": "ListItem", position: 3, name: meta.title, item: STUDY_URL },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${STUDY_URL}#faq`,
        mainEntity: LAUNCH_VIDEO_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  // The study's reading bar is position:fixed, so it takes the footer WITHOUT the sticky site nav —
  // two bars would fight for the same 60px at the top of the page.
  // The study reserves a slot for its call to action. On the hub this was filled from workspace
  // settings; here it is one link to the product, written in place. An unfilled slot would ship the
  // marker comment and no CTA at all — the piece would end on its sources.
  const cta = `<section class="pcta"><div class="pcta-in">
  <div>
    <p class="pcta-k">Ready when you are</p>
    <h2>Run the growth work this study measures &mdash; every day, without remembering to.</h2>
    <p>Infinite finds the buyers, writes the pages, and ships the tests. You review what it did.</p>
  </div>
  <a class="pcta-btn" href="/download" data-download-location="research-launch-videos">Get Infinite &rarr;</a>
</div></section>`;

  return `${head({
    title: meta.seoTitle,
    description: meta.description,
    canonical: STUDY_URL,
    image,
    type: "article",
    extraLd: [graph],
  })}<style>${FONT_CSS}${PLAYBOOK_CSS}${FOOTER_CSS}</style>
</head>
<body>
${PLAYBOOK_HTML.replace("<!--PLAYBOOK_CTA_SLOT-->", cta)}
${footerHtml(`194 verified launches &middot; refreshed ${REFRESHED_HUMAN}`)}
<script>${PLAYBOOK_JS}</script>
</body>
</html>`;
}


// ── Entry ───────────────────────────────────────────────────────────────────────────────────────
export async function buildLaunchVideoPages(distDir) {
  const source = datasetSource();
  const res = await fetch(source, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error(
      `Launch-video dataset fetch failed: ${res.status} ${res.statusText} from ${source}. ` +
        `The leaderboard page cannot be built without it, and shipping a stale ranking under a ` +
        `"live data" label is not an acceptable substitute.`,
    );
  }
  const payload = await res.json();
  if (!payload || !Array.isArray(payload.rows) || payload.rows.length === 0) {
    throw new Error(`Launch-video dataset returned no rows — refusing to publish an empty leaderboard.`);
  }

  const write = (relDir, html) => {
    const dir = join(distDir, relDir);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), html);
  };

  write(LEADERBOARD_PATH.replace(/^\/|\/$/g, ""), leaderboardHtml(payload));
  write(STUDY_PATH.replace(/^\/|\/$/g, ""), studyHtml());
  return { rows: payload.rows.length, asOf: payload.as_of };
}

// Run directly by prepare-static-deploy.cjs (CJS cannot await an ESM build inline), and by the CI
// contract test with a scratch dist.
if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = process.argv[2] ?? new URL("../dist", import.meta.url).pathname;
  const result = await buildLaunchVideoPages(dist);
  console.log(`[launch-videos] built ${result.rows} ranked launches (as of ${result.asOf})`);
}
