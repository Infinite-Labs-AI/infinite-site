#!/usr/bin/env node
// @ts-check

import { createHmac, randomUUID } from "node:crypto";
import process from "node:process";

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

const SITE_BASE_URL = firstNonEmpty(process.env.SITE_BASE_URL, "https://infinite.fast").replace(/\/+$/, "");
const EXPECTED_POSTHOG_TOKEN = firstNonEmpty(
  process.env.EXPECTED_POSTHOG_TOKEN,
  "phc_wUuv4hpsa4jfi6fNSzWU9t3JSKneFHusRunsYenhjndJ",
);
const EXPECTED_POSTHOG_API_HOST = firstNonEmpty(process.env.EXPECTED_POSTHOG_API_HOST, "/ingest");
const EXPECTED_GA_TAG_ID = firstNonEmpty(process.env.EXPECTED_GA_TAG_ID, "G-JE3BZS61FZ");
const REQUIRE_SYNTHETIC_RECEIPTS = process.env.REQUIRE_SYNTHETIC_RECEIPTS === "1";
const SYNTHETIC_SITE_SOURCE_KEY = firstNonEmpty(process.env.SYNTHETIC_SITE_SOURCE_KEY);
const ANALYTICS_RECEIPT_URL = firstNonEmpty(process.env.ANALYTICS_RECEIPT_URL);
const ANALYTICS_RECEIPT_TOKEN = firstNonEmpty(process.env.ANALYTICS_RECEIPT_TOKEN);
const SYNTHETIC_DRAIN_URL = firstNonEmpty(process.env.SYNTHETIC_DRAIN_URL);
const SYNTHETIC_DRAIN_SECRET = firstNonEmpty(process.env.SYNTHETIC_DRAIN_SECRET);
const SYNTHETIC_VERCEL_PROJECT_ID = firstNonEmpty(process.env.SYNTHETIC_VERCEL_PROJECT_ID);
const SYNTHETIC_PRODUCTION_HOST = firstNonEmpty(process.env.SYNTHETIC_PRODUCTION_HOST, "infinite.fast");
const RECEIPT_POLL_ATTEMPTS = positiveInteger(process.env.RECEIPT_POLL_ATTEMPTS, 8);
const RECEIPT_POLL_DELAY_MS = positiveInteger(process.env.RECEIPT_POLL_DELAY_MS, 2_000);
const FETCH_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 20_000;
const DOWNLOAD_DESTINATION = "https://github.com/Infinite-Labs-AI/infinite-desktop-releases/releases/latest/download/Infinite-arm64.dmg";

async function main() {
  console.log("Live analytics guardrail");
  console.log(`  base URL          : ${SITE_BASE_URL}`);
  console.log(`  pages             : ${PAGES.join(", ")}`);
  console.log(`  expect token      : ${maskIdentifier(EXPECTED_POSTHOG_TOKEN)}`);
  console.log(`  expect api_host   : ${EXPECTED_POSTHOG_API_HOST}`);
  console.log(`  expect GA tag id  : ${EXPECTED_GA_TAG_ID || "(any G-* tag)"}`);
  console.log(`  synthetic receipts: ${REQUIRE_SYNTHETIC_RECEIPTS ? "required" : "optional"}`);
  console.log("");

  /** @type {string[]} */
  const failures = [];
  for (const page of PAGES) {
    if (!page.startsWith("/") || /^https?:/i.test(page)) {
      failures.push(`[config] page list entry must be a relative main-site path: ${page}`);
    }
  }

  let rootResponse = null;
  for (const page of PAGES) {
    const url = `${SITE_BASE_URL}${page}`;
    const result = await fetchTextWithRetry(url, {
      headers: browserHeaders("infinite-analytics-guardrail/2.0 (+verify-live-analytics)"),
    });
    if (!result.ok) {
      failures.push(`[${page}] could not fetch ${url} — ${result.detail}`);
      console.log(`  FAIL  ${page}  (${result.detail})`);
      continue;
    }
    if (page === "/") rootResponse = result;
    const before = failures.length;
    checkPage(page, result.text, failures);
    console.log(`  ${failures.length === before ? "PASS" : "FAIL"}  ${page}  (${result.text.length} bytes)`);
  }

  if (rootResponse) checkSecurityHeaders(rootResponse.headers, failures);
  await checkPosthogProxy(failures);
  await checkDownloadRedirect(failures);
  await checkCspReport(failures);
  await checkSyntheticReceipts(failures);

  console.log("");
  if (failures.length > 0) {
    console.error("Live analytics guardrail FAILED:\n");
    for (const failure of failures) {
      console.error(`  - ${failure}`);
      if (process.env.GITHUB_ACTIONS) console.error(`::error::${failure}`);
    }
    console.error("\nSee docs/ANALYTICS-GUARDRAIL.md. No production analytics activation is safe while this gate is red.");
    process.exit(1);
  }

  console.log(`All ${PAGES.length} live pages carry one shared runtime, consent-aware mirrors, and healthy route guardrails.`);
}

function checkPage(label, html, failures) {
  const fail = (message) => failures.push(`[${label}] ${message}`);
  const expectedUrl = `${SITE_BASE_URL}${label}`;
  if (/https:\/\/www\.infinite\.fast/.test(html)) fail("page contains www.infinite.fast instead of the apex canonical host");

  const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
  if (canonical !== expectedUrl) fail(`canonical link is ${JSON.stringify(canonical)}, expected ${JSON.stringify(expectedUrl)}`);
  const ogUrl = html.match(/<meta\b[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i)?.[1];
  if (ogUrl !== expectedUrl) fail(`og:url is ${JSON.stringify(ogUrl)}, expected ${JSON.stringify(expectedUrl)}`);

  const posthogInits = [...html.matchAll(/posthog\.init\s*\(\s*(["'])([^"']+)\1/g)];
  if (posthogInits.length !== 1) fail(`found ${posthogInits.length} PostHog initializations; expected exactly 1`);
  if (posthogInits[0]) {
    const token = posthogInits[0][2];
    if (!token.startsWith("phc_")) fail(`PostHog token has an invalid prefix: ${maskIdentifier(token)}`);
    if (token !== EXPECTED_POSTHOG_TOKEN) fail(`PostHog token mismatch: ${maskIdentifier(token)} vs ${maskIdentifier(EXPECTED_POSTHOG_TOKEN)}`);
  }
  const apiHost = html.match(/api_host\s*:\s*(["'])([^"']+)\1/)?.[2];
  if (apiHost !== EXPECTED_POSTHOG_API_HOST) fail(`PostHog api_host is ${JSON.stringify(apiHost)}, expected ${JSON.stringify(EXPECTED_POSTHOG_API_HOST)}`);
  if (!/capture_pageview\s*:\s*false/.test(html)) fail("PostHog automatic page-view capture is not disabled");

  if (/\/gtm\/gtag\/js|transport_url\s*:/.test(html)) fail("GA4 uses the forbidden /gtm or transport_url experiment");
  const gaId = html.match(/https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=([^"'&\s]+)/)?.[1];
  if (!gaId) fail("direct Google gtag loader definition is missing");
  else if (EXPECTED_GA_TAG_ID && decodeURIComponent(gaId) !== EXPECTED_GA_TAG_ID) {
    fail(`GA4 id is ${decodeURIComponent(gaId)}, expected ${EXPECTED_GA_TAG_ID}`);
  }
  if (!/send_page_view\s*:\s*false/.test(html)) fail("GA4 automatic page-view capture is not disabled");

  const runtimes = html.match(/data-infinite-runtime=["']managed["']/g) ?? [];
  if (runtimes.length !== 1) fail(`found ${runtimes.length} Infinite managed runtimes; expected exactly 1`);
  const consentControllers = html.match(/data-infinite-consent-controller=["']managed["']/g) ?? [];
  if (consentControllers.length !== 1) fail(`found ${consentControllers.length} consent controllers; expected exactly 1`);
  if (!html.includes('"collectPath":"/infinite/events/collect"')) fail("shared runtime does not use the same-origin Infinite collect path");
  if (/app\.ultima\.inc|\/api\/events\/track|custom_app_download_redirect/.test(html)) fail("live bytes contain a forbidden legacy/private tracker surface");
}

function checkSecurityHeaders(headers, failures) {
  const csp = headers.get("content-security-policy") ?? "";
  if (!csp.includes("report-uri /api/csp-report") || !csp.includes("report-to csp-endpoint")) {
    failures.push("[headers] CSP reporting directives are missing");
  }
  const reporting = headers.get("reporting-endpoints") ?? "";
  if (!reporting.includes("csp-endpoint=")) failures.push("[headers] Reporting-Endpoints is missing csp-endpoint");
}

async function checkPosthogProxy(failures) {
  if (!EXPECTED_POSTHOG_API_HOST.startsWith("/")) return;
  const path = `${EXPECTED_POSTHOG_API_HOST}/static/array.js`;
  const result = await fetchTextWithRetry(`${SITE_BASE_URL}${path}`, { headers: browserHeaders("infinite-analytics-guardrail/2.0") });
  if (!result.ok || !/posthog/i.test(result.text)) {
    failures.push(`[proxy] ${path} is unavailable or not the PostHog library (${result.detail})`);
    console.log(`  FAIL  proxy ${path}`);
    return;
  }
  console.log(`  PASS  proxy ${path}  (${result.text.length} bytes, PostHog lib)`);
}

async function checkDownloadRedirect(failures) {
  try {
    const response = await fetch(`${SITE_BASE_URL}/download`, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: browserHeaders("infinite-analytics-guardrail-bot/2.0"),
    });
    const location = response.headers.get("location");
    if (![307, 308].includes(response.status) || location !== DOWNLOAD_DESTINATION) {
      failures.push(`[download] expected 307/308 to ${DOWNLOAD_DESTINATION}, received ${response.status} to ${location}`);
      console.log(`  FAIL  /download ${response.status}`);
      return;
    }
    console.log(`  PASS  /download ${response.status} (bot-classified, excluded from production redirect metrics)`);
  } catch (error) {
    failures.push(`[download] route check failed: ${error.message}`);
    console.log("  FAIL  /download route check");
  }
}

async function checkCspReport(failures) {
  try {
    const response = await fetch(`${SITE_BASE_URL}/api/csp-report`, {
      method: "POST",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "content-type": "application/csp-report" },
      body: JSON.stringify({ "csp-report": { "document-uri": `${SITE_BASE_URL}/guardrail?redacted=1`, "violated-directive": "script-src", "blocked-uri": "inline" } }),
    });
    if (response.status !== 204) {
      failures.push(`[csp] POST /api/csp-report returned ${response.status}, expected 204`);
      console.log(`  FAIL  CSP report endpoint (${response.status})`);
      return;
    }
    console.log("  PASS  CSP report endpoint (204)");
  } catch (error) {
    failures.push(`[csp] endpoint check failed: ${error.message}`);
    console.log("  FAIL  CSP report endpoint");
  }
}

async function checkSyntheticReceipts(failures) {
  const config = {
    SYNTHETIC_SITE_SOURCE_KEY,
    ANALYTICS_RECEIPT_URL,
    ANALYTICS_RECEIPT_TOKEN,
    SYNTHETIC_DRAIN_URL,
    SYNTHETIC_DRAIN_SECRET,
    SYNTHETIC_VERCEL_PROJECT_ID,
    SYNTHETIC_PRODUCTION_HOST,
  };
  const missing = Object.entries(config).filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    if (REQUIRE_SYNTHETIC_RECEIPTS) failures.push(`[receipts] required configuration is missing: ${missing.join(", ")}`);
    console.log(`  ${REQUIRE_SYNTHETIC_RECEIPTS ? "FAIL" : "SKIP"}  synthetic receipts (${missing.join(", ")} missing)`);
    return;
  }

  const eventId = randomUUID();
  const browserPayload = {
    eventId,
    eventName: "site_page_view",
    occurredAt: new Date().toISOString(),
    anonymousId: randomUUID(),
    sessionId: randomUUID(),
    url: `${SITE_BASE_URL}/`,
    siteSourceKey: SYNTHETIC_SITE_SOURCE_KEY,
  };
  try {
    const response = await fetch(`${SITE_BASE_URL}/infinite/events/collect`, {
      method: "POST",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "content-type": "application/json", Origin: SITE_BASE_URL },
      body: JSON.stringify(browserPayload),
    });
    if (response.status !== 202) throw new Error(`collect returned ${response.status}`);
    await requireReceipt(eventId, "site_page_view");
    console.log("  PASS  same-origin synthetic browser receipt (202 + authenticated receipt)");
  } catch (error) {
    failures.push(`[receipts] same-origin synthetic browser check failed: ${error.message}`);
    console.log("  FAIL  same-origin synthetic browser receipt");
  }

  const documentId = `guardrail-edge-${randomUUID()}`;
  const redirectId = `guardrail-redirect-${randomUUID()}`;
  const timestamp = new Date().toISOString();
  const records = [
    {
      id: documentId,
      source: "edge",
      environment: "production",
      projectId: SYNTHETIC_VERCEL_PROJECT_ID,
      message: 'INFINITE_DOCUMENT_REQUEST_V1 {"path":"/"}',
      timestamp,
      proxy: { method: "GET", host: SYNTHETIC_PRODUCTION_HOST, statusCode: 200, path: "/", userAgent: ["Mozilla/5.0"] },
    },
    {
      id: redirectId,
      source: "redirect",
      environment: "production",
      projectId: SYNTHETIC_VERCEL_PROJECT_ID,
      destination: DOWNLOAD_DESTINATION,
      timestamp,
      proxy: { method: "GET", host: SYNTHETIC_PRODUCTION_HOST, statusCode: 307, path: "/download", userAgent: ["Mozilla/5.0"] },
    },
    { id: `head-${randomUUID()}`, source: "edge", environment: "production", projectId: SYNTHETIC_VERCEL_PROJECT_ID, timestamp, proxy: { method: "HEAD", host: SYNTHETIC_PRODUCTION_HOST, statusCode: 200 } },
    { id: `prefetch-${randomUUID()}`, source: "edge", environment: "production", projectId: SYNTHETIC_VERCEL_PROJECT_ID, message: "prefetch without middleware marker", timestamp, proxy: { method: "GET", host: SYNTHETIC_PRODUCTION_HOST, statusCode: 200, userAgent: ["Mozilla/5.0"], requestHeaders: { purpose: "prefetch" } } },
    { id: `asset-${randomUUID()}`, source: "edge", environment: "production", projectId: SYNTHETIC_VERCEL_PROJECT_ID, message: 'INFINITE_DOCUMENT_REQUEST_V1 {"path":"/assets/app.js"}', timestamp, proxy: { method: "GET", host: SYNTHETIC_PRODUCTION_HOST, statusCode: 200, userAgent: ["Mozilla/5.0"] } },
    { id: `bot-${randomUUID()}`, source: "edge", environment: "production", projectId: SYNTHETIC_VERCEL_PROJECT_ID, message: 'INFINITE_DOCUMENT_REQUEST_V1 {"path":"/"}', timestamp, proxy: { method: "GET", host: SYNTHETIC_PRODUCTION_HOST, statusCode: 200, userAgent: ["Googlebot"] } },
    { id: `project-${randomUUID()}`, source: "edge", environment: "production", projectId: `${SYNTHETIC_VERCEL_PROJECT_ID}-wrong`, message: 'INFINITE_DOCUMENT_REQUEST_V1 {"path":"/"}', timestamp, proxy: { method: "GET", host: SYNTHETIC_PRODUCTION_HOST, statusCode: 200, userAgent: ["Mozilla/5.0"] } },
    { id: `host-${randomUUID()}`, source: "edge", environment: "production", projectId: SYNTHETIC_VERCEL_PROJECT_ID, message: 'INFINITE_DOCUMENT_REQUEST_V1 {"path":"/"}', timestamp, proxy: { method: "GET", host: "wrong.example", statusCode: 200, userAgent: ["Mozilla/5.0"] } },
  ];
  try {
    const raw = JSON.stringify(records);
    const signature = createHmac("sha1", SYNTHETIC_DRAIN_SECRET).update(raw).digest("hex");
    const response = await fetch(SYNTHETIC_DRAIN_URL, {
      method: "POST",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "content-type": "application/json", "x-vercel-signature": signature },
      body: raw,
    });
    const result = await response.json().catch(() => ({}));
    if (response.status !== 202 || result.accepted !== 2) {
      throw new Error(`Drain returned ${response.status} with accepted=${JSON.stringify(result.accepted)}`);
    }
    await requireReceipt(`vercel:${documentId}`, "site_document_request");
    await requireReceipt(`vercel:${redirectId}`, "app_download_redirect");
    console.log("  PASS  signed synthetic Drain receipt (mixed batch isolated)");
  } catch (error) {
    failures.push(`[receipts] signed synthetic Drain check failed: ${error.message}`);
    console.log("  FAIL  signed synthetic Drain receipt");
  }
}

async function requireReceipt(eventId, eventName) {
  const receiptUrl = new URL(ANALYTICS_RECEIPT_URL);
  receiptUrl.searchParams.set("eventId", eventId);
  let last = "not received";
  for (let attempt = 1; attempt <= RECEIPT_POLL_ATTEMPTS; attempt += 1) {
    const response = await fetch(receiptUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { authorization: `Bearer ${ANALYTICS_RECEIPT_TOKEN}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.received === true) {
      if (payload.eventId !== eventId || payload.eventName !== eventName || payload.environment !== "synthetic") {
        throw new Error(`receipt mismatch for ${eventId}`);
      }
      return;
    }
    last = `HTTP ${response.status}`;
    if (attempt < RECEIPT_POLL_ATTEMPTS) await sleep(RECEIPT_POLL_DELAY_MS);
  }
  throw new Error(`${eventId} was ${last} after ${RECEIPT_POLL_ATTEMPTS} attempts`);
}

async function fetchTextWithRetry(url, init = {}) {
  let detail = "unknown error";
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      const text = await response.text();
      if (response.ok) return { ok: true, status: response.status, text, headers: response.headers, detail: "ok" };
      detail = `HTTP ${response.status}`;
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      detail = `network error: ${error.message}`;
    }
    if (attempt < FETCH_ATTEMPTS) await sleep(backoffMs(attempt));
  }
  return { ok: false, status: 0, text: "", headers: new Headers(), detail };
}

function browserHeaders(userAgent) {
  return { "Cache-Control": "no-cache", Pragma: "no-cache", "User-Agent": userAgent };
}

function firstNonEmpty(...values) {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return "";
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt) {
  return Math.min(1_000 * 2 ** (attempt - 1), 8_000);
}

function maskIdentifier(value) {
  if (!value) return "";
  if (value.length <= 10) return `${value.slice(0, 3)}...`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

main().catch((error) => {
  console.error("Live analytics guardrail crashed unexpectedly:");
  console.error(error);
  process.exit(1);
});
