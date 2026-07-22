#!/usr/bin/env node
// @ts-check
/**
 * ============================================================================
 *  verify-live-analytics.mjs  —  the "never-again" analytics guardrail
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * Analytics on infinite.fast died SILENTLY for ~a month. The live pages
 * simply stopped carrying the PostHog snippet — caused by a stale deploy, gaps
 * in the build-time injector, and a PostHog region flip (US host vs EU host).
 * Nobody noticed because nothing errored: the pages loaded fine, they just
 * weren't reporting.
 *
 * This script is the tripwire. It does NOT trust the repo, the build, the
 * injector, or any CI artifact. It fetches the REAL, PUBLIC, PRODUCTION pages
 * exactly as a browser would, and asserts the analytics tags are actually
 * present and correct on the bytes the CDN is serving to real users RIGHT NOW.
 *
 * It is deliberately independent of *how* the site is built. The founder is
 * about to replace the entire site; the build mechanism, framework, and file
 * layout may all change. This check only cares about one thing: do the live
 * pages carry the tags? If a future build stops injecting them, this goes red.
 *
 * WHAT IT ASSERTS, PER PAGE
 * -------------------------
 *   1. Canonical and Open Graph URL metadata use the apex infinite.fast URL
 *   2. Exactly ONE PostHog snippet  (0 = analytics dead; 2+ = double-count bug)
 *   3. PostHog project token starts with "phc_" AND equals the expected value
 *      (expected value comes from the repo variable, passed in as env)
 *   4. PostHog api_host is the first-party "/ingest" reverse-proxy path (snippet intact)
 *   5. A direct Google Analytics gtag loader is present, with no unproven
 *      relative transport_url proxy
 * PLUS one site-wide check: the proxied PostHog library at /ingest/static/array.js actually
 * resolves and is really PostHog — the relocated region-flip tripwire, and the thing that catches
 * a broken rewrite (which would silently kill analytics exactly like the original outage).
 *
 * Any failure -> a clear message naming the page + what's wrong -> exit 1 ->
 * red CI run. All pages/checks run before exiting, so one run reports every
 * problem at once.
 *
 * CONFIG (all overridable via env; sensible, LOUD defaults so it also runs
 * locally with zero setup)
 * ----------------------------------------------------------------------------
 *   SITE_BASE_URL              default https://infinite.fast
 *   EXPECTED_POSTHOG_TOKEN     default = the known public prod token (below)
 *   EXPECTED_POSTHOG_API_HOST  default /ingest   (first-party reverse-proxy path → PostHog EU)
 *   EXPECTED_GA_TAG_ID         default G-JE3BZS61FZ   (empty env => "any G-* tag")
 *
 * NOTE ON THE "TOKEN": a PostHog *project* token (phc_...) is a PUBLIC,
 * client-side identifier — it ships in the page HTML that anyone can View
 * Source on. It is NOT a secret. Hardcoding it as the fallback expected value
 * is intentional and safe, and makes the check meaningful even when the repo
 * variable is unset.
 */

import process from "node:process";

// ---------------------------------------------------------------------------
// LIVE PAGE LIST — MAINTAIN THIS BY HAND.
// ---------------------------------------------------------------------------
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !! These are the live URLs that MUST carry analytics. This list is         !!
// !! deliberately hand-maintained and NOT auto-discovered from the repo,     !!
// !! because the guardrail must survive a full site replacement: the build   !!
// !! mechanism and file layout are expected to change, but the set of public !!
// !! pages we care about is a human decision. When you add or remove a real  !!
// !! public page, UPDATE THIS LIST.                                          !!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const PAGES = [
  "/",
  "/privacy/",
  "/terms/",
  "/tools/",
  "/tools/high-intent-lead-finder-template/",
  "/tools/seo-geo-brief-generator/",
  "/tools/landing-page-ab-test-ideas-generator/",
  "/tools/founder-content-ideas-generator/",
  "/compare/",
  "/compare/infinite-vs-okara/",
  "/compare/infinite-vs-ploy/",
  "/compare/infinite-vs-blaze/",
];

// ---------------------------------------------------------------------------
// Expected values (env wins; empty/whitespace env falls back to the default).
// ---------------------------------------------------------------------------
const SITE_BASE_URL = firstNonEmpty(process.env.SITE_BASE_URL, "https://infinite.fast").replace(/\/+$/, "");

const POSTHOG_TOKEN_PREFIX = "phc_";
const EXPECTED_POSTHOG_TOKEN = firstNonEmpty(
  process.env.EXPECTED_POSTHOG_TOKEN,
  // Public prod project token — safe to hardcode (see header note).
  "phc_wUuv4hpsa4jfi6fNSzWU9t3JSKneFHusRunsYenhjndJ",
);
// The live snippet's api_host is now the FIRST-PARTY reverse-proxy path (vercel.json "/ingest"
// rewrites → PostHog EU). The region-flip tripwire moved off this string onto a live check that the
// proxied library actually resolves (the "proxy liveness" step in main()).
const EXPECTED_POSTHOG_API_HOST = firstNonEmpty(
  process.env.EXPECTED_POSTHOG_API_HOST,
  "/ingest",
);
// If empty, GA is only checked for presence of *some* G-* tag, not a specific id.
const EXPECTED_GA_TAG_ID = firstNonEmpty(process.env.EXPECTED_GA_TAG_ID, "G-JE3BZS61FZ");

// ---------------------------------------------------------------------------
// Fetch helpers (retry transient failures; never retry a passed-but-wrong page)
// ---------------------------------------------------------------------------
const FETCH_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 20_000;

/** @param {string} url */
async function fetchPageHtml(url) {
  let lastError = null;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          // Ask upstream not to hand us a stale cache; we want live bytes.
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "User-Agent": "infinite-analytics-guardrail/1.0 (+verify-live-analytics)",
        },
      });
      clearTimeout(timer);

      if (res.ok) {
        return { ok: true, status: res.status, html: await res.text() };
      }

      // 5xx / 429 are transient — retry. Other statuses (e.g. 404) are real
      // failures we should report immediately.
      lastError = new Error(`HTTP ${res.status} ${res.statusText}`);
      if (res.status >= 500 || res.status === 429) {
        await sleep(backoffMs(attempt));
        continue;
      }
      return { ok: false, status: res.status, html: "" };
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < FETCH_ATTEMPTS) await sleep(backoffMs(attempt));
    }
  }
  return { ok: false, status: 0, html: "", error: lastError };
}

// ---------------------------------------------------------------------------
// Per-page assertions. Pushes human-readable failures onto `failures`.
// ---------------------------------------------------------------------------
/**
 * @param {string} label   e.g. "/privacy/"
 * @param {string} html    raw page source
 * @param {string[]} failures  accumulator, messages are prefixed with the page
 */
function checkPage(label, html, failures) {
  const fail = (/** @type {string} */ msg) => failures.push(`[${label}] ${msg}`);
  const expectedUrl = `${SITE_BASE_URL}${label}`;

  // --- 1. Apex canonical / share metadata ----------------------------------
  if (/https:\/\/www\.infinite\.fast/.test(html)) {
    fail("page contains www.infinite.fast; expected apex https://infinite.fast for main-site absolute URLs");
  }

  const canonicalMatch = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  if (!canonicalMatch) {
    fail("canonical link MISSING");
  } else if (canonicalMatch[1] !== expectedUrl) {
    fail(`canonical link WRONG — live page uses "${canonicalMatch[1]}", expected "${expectedUrl}"`);
  }

  const ogUrlMatch = html.match(/<meta\b[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
  if (!ogUrlMatch) {
    fail("og:url MISSING");
  } else if (ogUrlMatch[1] !== expectedUrl) {
    fail(`og:url WRONG — live page uses "${ogUrlMatch[1]}", expected "${expectedUrl}"`);
  }

  // --- 2. Exactly one PostHog snippet ---------------------------------------
  // `posthog.init(` is the single unambiguous marker of one initialized
  // snippet. 0 => analytics is dead (the exact month-long outage). 2+ => a
  // double-injection bug (double-counts every event).
  const initMatches = [...html.matchAll(/posthog\.init\s*\(\s*(['"])([^'"]+)\1/g)];
  const initCount = initMatches.length;

  if (initCount === 0) {
    fail("PostHog snippet MISSING (no `posthog.init(` on the live page) — analytics is not reporting");
  } else if (initCount > 1) {
    fail(`PostHog snippet DUPLICATED — found ${initCount} \`posthog.init(\` calls, expected exactly 1 (double-counts events)`);
  }

  // --- 3. PostHog token: phc_ prefix + exact expected value -----------------
  if (initCount >= 1) {
    const token = initMatches[0][2];
    if (!token.startsWith(POSTHOG_TOKEN_PREFIX)) {
      fail(`PostHog token has wrong prefix — got "${maskIdentifier(token)}", expected it to start with "${POSTHOG_TOKEN_PREFIX}"`);
    }
    if (token !== EXPECTED_POSTHOG_TOKEN) {
      fail(`PostHog token MISMATCH — live page has "${maskIdentifier(token)}", expected "${maskIdentifier(EXPECTED_POSTHOG_TOKEN)}" (check the VITE_POSTHOG_PROJECT_TOKEN repo variable / your build's token)`);
    }
  }

  // --- 4. PostHog api_host: the first-party "/ingest" proxy path -------------
  // Only the init-config `api_host: "..."` matches; the `s.api_host.replace(...)`
  // inside the loader IIFE has no `:` so it is not caught here. This asserts the
  // snippet carries the expected proxy path; region correctness is the live
  // proxy-liveness check in main() (the proxied library must resolve to PostHog).
  const apiHostMatches = [...html.matchAll(/api_host\s*:\s*(['"])([^'"]+)\1/g)];
  if (apiHostMatches.length === 0) {
    if (initCount >= 1) {
      fail("PostHog api_host MISSING from the snippet config");
    }
  } else {
    const apiHost = apiHostMatches[0][2];
    if (apiHost !== EXPECTED_POSTHOG_API_HOST) {
      fail(`PostHog api_host WRONG — live page uses "${apiHost}", expected "${EXPECTED_POSTHOG_API_HOST}" (region flip: events are going to the wrong PostHog region/project)`);
    }
  }

  // --- 5. Google Analytics direct gtag loader present -----------------------
  const proxiedGaMatch = html.match(/(?:src=["'])\/gtm\/gtag\/js\?id=([^"'&\s]+)/);
  if (proxiedGaMatch) {
    fail("Google Analytics uses the unproven relative /gtm loader; expected direct googletagmanager.com/gtag/js");
  }

  if (/transport_url\s*:/.test(html)) {
    fail("Google Analytics config includes transport_url; expected direct Google collection");
  }

  const gaMatch = html.match(/https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=([^"'&\s]+)/);
  if (!gaMatch) {
    fail("Google Analytics direct gtag loader MISSING (no https://www.googletagmanager.com/gtag/js?id=... on the live page)");
  } else {
    const gaId = decodeURIComponent(gaMatch[1]);
    if (EXPECTED_GA_TAG_ID && gaId !== EXPECTED_GA_TAG_ID) {
      fail(`Google Analytics tag id MISMATCH — live page uses "${gaId}", expected "${EXPECTED_GA_TAG_ID}" (check the VITE_GOOGLE_ANALYTICS_TAG_ID repo variable)`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("Live analytics guardrail");
  console.log(`  base URL          : ${SITE_BASE_URL}`);
  console.log(`  pages             : ${PAGES.join(", ")}`);
  console.log(`  expect token      : ${maskIdentifier(EXPECTED_POSTHOG_TOKEN)}`);
  console.log(`  expect api_host   : ${EXPECTED_POSTHOG_API_HOST}`);
  console.log(`  expect GA tag id  : ${EXPECTED_GA_TAG_ID || "(any G-* tag)"}`);
  console.log("");

  /** @type {string[]} */
  const failures = [];

  for (const page of PAGES) {
    const url = `${SITE_BASE_URL}${page}`;
    const result = await fetchPageHtml(url);

    if (!result.ok) {
      const detail = result.status ? `HTTP ${result.status}` : `network error: ${result.error?.message ?? "unknown"}`;
      failures.push(`[${page}] could not fetch ${url} — ${detail}`);
      console.log(`  FAIL  ${page}  (${detail})`);
      continue;
    }

    const before = failures.length;
    checkPage(page, result.html, failures);
    const pageFailures = failures.length - before;
    console.log(`  ${pageFailures === 0 ? "PASS" : "FAIL"}  ${page}  (${result.html.length} bytes)`);
  }

  // --- Proxy liveness (relocated region-flip tripwire) ----------------------
  // With the first-party reverse proxy, a broken "/ingest" rewrite = analytics DEAD even when the
  // snippet looks perfect (the exact silent outage this guardrail exists to catch). So when api_host
  // is a proxy path, verify the proxied PostHog library actually loads AND is really PostHog.
  if (EXPECTED_POSTHOG_API_HOST.startsWith("/")) {
    const proxyUrl = `${SITE_BASE_URL}${EXPECTED_POSTHOG_API_HOST}/static/array.js`;
    const proxy = await fetchPageHtml(proxyUrl);
    if (!proxy.ok) {
      const detail = proxy.status ? `HTTP ${proxy.status}` : `network error: ${proxy.error?.message ?? "unknown"}`;
      failures.push(`[proxy] ${proxyUrl} did not resolve — ${detail} (the /ingest reverse proxy is broken → analytics is dead)`);
      console.log(`  FAIL  proxy ${EXPECTED_POSTHOG_API_HOST}/static/array.js  (${detail})`);
    } else if (!/posthog/i.test(proxy.html)) {
      failures.push(`[proxy] ${proxyUrl} returned ${proxy.html.length} bytes that are not the PostHog library (proxy misrouted / wrong region)`);
      console.log(`  FAIL  proxy ${EXPECTED_POSTHOG_API_HOST}/static/array.js  (not PostHog)`);
    } else {
      console.log(`  PASS  proxy ${EXPECTED_POSTHOG_API_HOST}/static/array.js  (${proxy.html.length} bytes, PostHog lib)`);
    }
  }

  console.log("");

  if (failures.length > 0) {
    console.error("Live analytics guardrail FAILED:\n");
    for (const f of failures) {
      console.error(`  - ${f}`);
      // GitHub Actions annotation (rendered inline on the run) when in CI.
      if (process.env.GITHUB_ACTIONS) console.error(`::error::${f}`);
    }
    console.error(
      "\nThe live site is missing or misconfiguring an analytics tag. See docs/ANALYTICS-GUARDRAIL.md.",
    );
    process.exit(1);
  }

  console.log(`All ${PAGES.length} live page(s) carry correct PostHog + GA tags. Guardrail passed.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// small utils
// ---------------------------------------------------------------------------
/** @param {...(string | undefined)} values */
function firstNonEmpty(...values) {
  for (const v of values) {
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return "";
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** @param {number} attempt */
function backoffMs(attempt) {
  return Math.min(1000 * 2 ** (attempt - 1), 8000);
}

/** @param {string} value */
function maskIdentifier(value) {
  if (!value) return "";
  if (value.length <= 10) return `${value.slice(0, 3)}...`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

main().catch((err) => {
  console.error("Live analytics guardrail crashed unexpectedly:");
  console.error(err);
  process.exit(1);
});
