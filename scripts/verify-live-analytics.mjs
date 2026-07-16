#!/usr/bin/env node
// @ts-check
/**
 * ============================================================================
 *  verify-live-analytics.mjs  —  the "never-again" analytics guardrail
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * Analytics on www.infinite.fast died SILENTLY for ~a month. The live pages
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
 *   1. Exactly ONE PostHog snippet  (0 = analytics dead; 2+ = double-count bug)
 *   2. PostHog project token starts with "phc_" AND equals the expected value
 *      (expected value comes from the repo variable, passed in as env)
 *   3. PostHog api_host is the EU ingest host (this is the region-flip tripwire)
 *   4. A Google Analytics gtag loader is present
 *
 * Any failure -> a clear message naming the page + what's wrong -> exit 1 ->
 * red CI run. All pages/checks run before exiting, so one run reports every
 * problem at once.
 *
 * CONFIG (all overridable via env; sensible, LOUD defaults so it also runs
 * locally with zero setup)
 * ----------------------------------------------------------------------------
 *   SITE_BASE_URL              default https://www.infinite.fast
 *   EXPECTED_POSTHOG_TOKEN     default = the known public prod token (below)
 *   EXPECTED_POSTHOG_API_HOST  default https://eu.i.posthog.com
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
// !! public page, UPDATE THIS LIST. Today it mirrors `deployEntries` in      !!
// !! scripts/prepare-static-deploy.cjs (index.html, privacy, terms).         !!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const PAGES = ["/", "/privacy/", "/terms/"];

// ---------------------------------------------------------------------------
// Expected values (env wins; empty/whitespace env falls back to the default).
// ---------------------------------------------------------------------------
const SITE_BASE_URL = firstNonEmpty(process.env.SITE_BASE_URL, "https://www.infinite.fast").replace(/\/+$/, "");

const POSTHOG_TOKEN_PREFIX = "phc_";
const EXPECTED_POSTHOG_TOKEN = firstNonEmpty(
  process.env.EXPECTED_POSTHOG_TOKEN,
  // Public prod project token — safe to hardcode (see header note).
  "phc_wUuv4hpsa4jfi6fNSzWU9t3JSKneFHusRunsYenhjndJ",
);
const EXPECTED_POSTHOG_API_HOST = firstNonEmpty(
  process.env.EXPECTED_POSTHOG_API_HOST,
  "https://eu.i.posthog.com",
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

  // --- 1. Exactly one PostHog snippet ---------------------------------------
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

  // --- 2. PostHog token: phc_ prefix + exact expected value -----------------
  if (initCount >= 1) {
    const token = initMatches[0][2];
    if (!token.startsWith(POSTHOG_TOKEN_PREFIX)) {
      fail(`PostHog token has wrong prefix — got "${token}", expected it to start with "${POSTHOG_TOKEN_PREFIX}"`);
    }
    if (token !== EXPECTED_POSTHOG_TOKEN) {
      fail(`PostHog token MISMATCH — live page has "${token}", expected "${EXPECTED_POSTHOG_TOKEN}" (check the VITE_POSTHOG_PROJECT_TOKEN repo variable / your build's token)`);
    }
  }

  // --- 3. PostHog api_host: EU ingest host (region-flip tripwire) ------------
  // Only the init-config `api_host: "..."` matches; the `s.api_host.replace(...)`
  // inside the loader IIFE has no `:` so it is not caught here.
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

  // --- 4. Google Analytics gtag loader present ------------------------------
  const gaMatch = html.match(/googletagmanager\.com\/gtag\/js\?id=([^"'&\s]+)/);
  if (!gaMatch) {
    fail("Google Analytics gtag loader MISSING (no googletagmanager.com/gtag/js?id=... on the live page)");
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
  console.log(`  expect token      : ${EXPECTED_POSTHOG_TOKEN}`);
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

main().catch((err) => {
  console.error("Live analytics guardrail crashed unexpectedly:");
  console.error(err);
  process.exit(1);
});
