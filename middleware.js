import { next } from "@vercel/functions";

const BOT_UA = /bot|crawler|spider|preview|headless|lighthouse|curl|wget/i;
// CLI/tooling agents (mirrors the drain's learned list, 2026-08-04): classified before BOT_UA
// because curl/wget appear in both — a curl download attempt is "cli", not "bot".
const CLI_UA = /curl|wget|python-requests|python-urllib|go-http-client|httpie|okhttp|axios|node-fetch|libwww|java\//i;
const PRODUCTION_HOSTS = new Set(
  (process.env.INFINITE_PRODUCTION_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean),
);
// The exact set of REAL document pages the static deploy serves, as normalizedPath()
// canonicalizes them. The middleware logs BEFORE routing, so without this manifest any
// scanner sweep of a non-existent path with browser-shaped headers counted as a pageview.
// /download stays excluded: its redirect is counted by the server redirect lane.
// Guardrail: test-prepare-static-deploy.mjs fails whenever this set and the built dist's
// HTML page set disagree — update BOTH together when adding or removing a page.
export const KNOWN_DOCUMENT_PATHS = new Set([
  "/",
  "/agents/",
  "/compare/",
  "/compare/infinite-vs-blaze/",
  "/compare/infinite-vs-okara/",
  "/compare/infinite-vs-ploy/",
  "/privacy/",
  "/research/",
  "/research/launch-videos/",
  "/startup-launch-videos/",
  "/terms/",
  "/tools/",
  "/tools/founder-content-ideas-generator/",
  "/tools/high-intent-lead-finder-template/",
  "/tools/landing-page-ab-test-ideas-generator/",
  "/tools/seo-geo-brief-generator/",
]);

function normalizedPath(rawUrl) {
  const collapsed = new URL(rawUrl).pathname.replace(/\/{2,}/g, "/");
  const path = collapsed === "/" ? "/" : collapsed.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/download" || path === "/LICENSE") return path;
  const last = path.slice(path.lastIndexOf("/") + 1);
  return last.includes(".") ? path : `${path}/`;
}

function isProductionDocumentNavigation(request, path) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (process.env.VERCEL_ENV !== "production" || !PRODUCTION_HOSTS.has(host)) return false;
  if (request.method !== "GET") return false;
  if (!KNOWN_DOCUMENT_PATHS.has(path)) return false;
  if (isPrefetch(request)) return false;
  const destination = request.headers.get("sec-fetch-dest");
  const userAgent = request.headers.get("user-agent") ?? "";
  // AGENTS ARE COUNTED, NOT DROPPED (2026-08-19, "humans vs agents"): a declared bot/crawler/agent
  // fetching a KNOWN document path gets the SAME document marker (and the same 30-min fingerprint)
  // as a browser. The drain classifies the request from the Vercel record's user agent (human /
  // AI agent / search crawler / automation, verified against published IP ranges) and flags it —
  // it never enters the human Visitors count. Before this, BOT_UA returned false here, so GPTBot,
  // ClaudeBot and Googlebot were invisible on our own site while the dashboard promised an agent
  // split. Crawlers rarely send sec-fetch-dest and sometimes send accept: */*, so the browser-shape
  // rule below does not gate them — the KNOWN_DOCUMENT_PATHS manifest is their 404/scanner filter.
  if (BOT_UA.test(userAgent)) return true;
  if (destination) return destination === "document";
  return /Mozilla\//.test(userAgent) && request.headers.get("accept")?.includes("text/html") === true;
}

function isPrefetch(request) {
  return [request.headers.get("purpose"), request.headers.get("sec-purpose")].some((value) =>
    value?.toLowerCase().split(/[\s,;]+/).includes("prefetch"),
  );
}

// ── Download-attempt marker (2026-08-18 audit, server-owned attempt boundary) ─────────────
// The ONLY server-owned download signal used to be the raw Vercel redirect log: request rows,
// retries included, with no dedupe key. This marker adds a deduplicatable ATTEMPT observation
// at the owned /download boundary WITHOUT touching delivery: the vercel.json redirect keeps
// serving (the middleware logs before routing and always passes through), analytics storage is
// never consulted, and any failure here fails OPEN to the ordinary redirect.
//
// attemptKey = HMAC-SHA256(clientIP | userAgent | 30-min UTC bucket) under
// INFINITE_ATTEMPT_FINGERPRINT_KEY — a bounded, non-reversible fingerprint. The drain derives a
// DETERMINISTIC ledger event id from it, so N redirect requests from one browser in one bucket
// collapse into ONE attempt row structurally (the ledger's (workspace_id, event_id) uniqueness).
// The marker carries NO raw IP and NO raw UA — only the HMAC and a coarse UA family.
// An attempt is a server-observed request bucket — NOT a person, NOT a completed transfer.

const ATTEMPT_BUCKET_MS = 30 * 60 * 1000;
const ATTEMPT_ASSET_CHANNEL = "mac_arm64_dmg"; // the one asset /download serves today
const ATTEMPT_TOKEN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
let attemptDiagnosticLogged = false;

function uaFamily(userAgent) {
  if (!userAgent) return "unknown";
  if (CLI_UA.test(userAgent)) return "cli";
  if (BOT_UA.test(userAgent)) return "bot";
  if (/Mozilla\//.test(userAgent)) return "browser";
  return "unknown";
}

/** Normalized bounded UTM token, or null — never free text (ledger plan P39). */
function normalizedUtm(url, name) {
  const raw = url.searchParams.get(name);
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  return ATTEMPT_TOKEN.test(value) ? value : null;
}

/** Click-ID PRESENCE only (audit aggregate-attribution ruling + P39): a boolean saying a
 *  non-empty gclid/fbclid/msclkid rode the request. The RAW VALUE never enters the marker —
 *  raw click IDs are high-cardinality user-level identifiers we deliberately do not store. */
function hasClickId(url, name) {
  const value = url.searchParams.get(name);
  return typeof value === "string" && value.length > 0;
}

function referrerHost(request) {
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    const host = new URL(referer).hostname.toLowerCase().replace(/\.$/, "");
    return host && host.length <= 253 ? host : null;
  } catch {
    return null;
  }
}

async function attemptKey(secret, request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const userAgent = request.headers.get("user-agent") ?? "";
  const bucket = Math.floor(Date.now() / ATTEMPT_BUCKET_MS);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(`${ip}|${userAgent}|${bucket}`),
  );
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function logDownloadAttempt(request) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (process.env.VERCEL_ENV !== "production" || !PRODUCTION_HOSTS.has(host)) return;
  if (request.method !== "GET") return;
  const secret = process.env.INFINITE_ATTEMPT_FINGERPRINT_KEY;
  if (!secret) {
    // Fail-open with ONE shape diagnostic per isolate: the redirect must never wait on config,
    // but a silently-dead lane is the exact failure mode the drain work taught us to surface.
    if (!attemptDiagnosticLogged) {
      attemptDiagnosticLogged = true;
      console.log('INFINITE_DOWNLOAD_ATTEMPT_DIAG {"reason":"missing_fingerprint_key"}');
    }
    return;
  }
  const marker = {
    attemptKey: await attemptKey(secret, request),
    uaFamily: uaFamily(request.headers.get("user-agent")),
    utmSource: normalizedUtm(url, "utm_source"),
    utmMedium: normalizedUtm(url, "utm_medium"),
    utmCampaign: normalizedUtm(url, "utm_campaign"),
    referrerHost: referrerHost(request),
    hasGclid: hasClickId(url, "gclid"),
    hasFbclid: hasClickId(url, "fbclid"),
    hasMsclkid: hasClickId(url, "msclkid"),
    assetChannel: ATTEMPT_ASSET_CHANNEL,
    schemaVersion: 1,
  };
  console.log(`INFINITE_DOWNLOAD_ATTEMPT_V1 ${JSON.stringify(marker)}`);
}

// The public release destination for /download. The middleware OWNS this path: the old
// vercel.json redirect was REMOVED 2026-08-18 because config redirects PREEMPT edge middleware
// on this deployment (proven live twice — zero middleware invocations for /download while the
// entry existed). Fail-open now lives INSIDE downloadResponse (any marker failure still returns
// this 307), and the guardrail live-checks the 307 on every main push + daily. This comment used
// to describe the entry as a backstop; a "backstop" that runs FIRST is not a backstop.
const RELEASE_URL =
  "https://github.com/Infinite-Labs-AI/infinite-desktop-releases/releases/latest/download/Infinite-arm64.dmg";

function isProductionDownloadGet(request) {
  const host = new URL(request.url).hostname.toLowerCase().replace(/\.$/, "");
  return process.env.VERCEL_ENV === "production" && PRODUCTION_HOSTS.has(host) && request.method === "GET";
}

async function downloadResponse(request) {
  try {
    await logDownloadAttempt(request);
  } catch {
    // Fail open: the attempt marker must never delay or break the download redirect. The 307
    // below returns regardless — a marker failure costs evidence, never delivery.
  }
  return Response.redirect(RELEASE_URL, 307);
}

/** The document marker, now carrying the SAME 30-min HMAC fingerprint the attempt marker uses
 *  (`visitKey`) — this is what makes an honest server-lane download rate possible: attempts ÷
 *  distinct visit keys is deduped-over-deduped at ONE grain with ONE bot gate, where the deleted
 *  redirect/document "rate" was raw-retries over a scanner-polluted raw count. Fail-open: a
 *  fingerprint failure (or missing key) costs the visitKey, NEVER the pageview marker — the
 *  completeness lane always emits. Bounded hex-64; no raw IP/UA ever. */
async function documentMarkerThenNext(request, path) {
  let visitKey;
  try {
    const secret = process.env.INFINITE_ATTEMPT_FINGERPRINT_KEY;
    if (secret) visitKey = await attemptKey(secret, request);
  } catch {
    // Fail open — same rule as the attempt marker.
  }
  console.log(`INFINITE_DOCUMENT_REQUEST_V1 ${JSON.stringify({ path, ...(visitKey ? { visitKey } : {}) })}`);
  return next();
}

export default function middleware(request) {
  const path = normalizedPath(request.url);
  if (path === "/download") {
    // LIVE-TEST FINDING (2026-08-18): on this static deployment a vercel.json /download redirect
    // executes BEFORE edge middleware — middleware never ran for /download in production, so the
    // attempt marker never fired. The middleware therefore OWNS this path and SERVES the 307
    // itself for production GETs (marker, then redirect — the deliberate P13 trade: ~ms of edge
    // latency, fail-open inside downloadResponse). The old vercel.json entry was REMOVED (#26);
    // non-production/non-GET/foreign-host requests pass through to ordinary routing (404).
    if (isProductionDownloadGet(request)) return downloadResponse(request);
    return next();
  }
  if (isProductionDocumentNavigation(request, path)) return documentMarkerThenNext(request, path);
  return next();
}

export const config = {
  runtime: "edge",
  matcher: ["/((?!api/|assets/|fonts/|logos/|ingest/|infinite/).*)"],
};
