import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const receiptToken = "receipt-test-token";
const drainSecret = "drain-test-secret";
const received = new Map();
let observedCollectOrigin = null;
const observedDownloadProbes = [];
let downloadRedirectStatus = 307;
let collectRequests = 0;
let drainRequests = 0;
let receiptRequests = 0;
let forbiddenProbeRequests = 0;
let runtimeSiteSourceKey = "";
/** Wave 2 browser->desktop handoff: whether the served page carries the handoff bytes, and how the
 *  same-origin claim endpoint answers a health probe. Both are toggled per verifier run. */
let servesHandoffBytes = false;
let handoffEndpointStatus = 204;
/** Every request the verifier makes to the claim endpoint — a guardrail run must probe its health
 *  and NEVER issue a claim, so the recorded methods are asserted to be OPTIONS only. */
const handoffRequests = [];
/** Every request the verifier makes, so the "a guardrail run is not a visit" contract can be
 *  asserted at the end: `{ method, pathname, purpose }`. */
const observedProbes = [];
/** The two lanes whose rows are DELIBERATELY written (synthetic source key, synthetic environment),
 *  plus the 1bu-1-side endpoints that are not the site at all. Everything else is a live probe and
 *  must declare `Purpose: prefetch`. */
const COUNTED_OR_OFFSITE = new Set(["/infinite/ledger", "/synthetic-drain", "/receipt"]);

const server = createServer(async (request, response) => {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const url = new URL(request.url, origin);
  observedProbes.push({ method: request.method, pathname: url.pathname, purpose: request.headers.purpose });

  if (url.pathname === "/ingest/static/array.js") {
    response.writeHead(200, { "content-type": "application/javascript" });
    response.end("/* posthog synthetic library */");
    return;
  }
  if (url.pathname === "/api/csp-report" && request.method === "POST") {
    response.writeHead(204, { "cache-control": "no-store" });
    response.end();
    return;
  }
  if (url.pathname === "/download") {
    observedDownloadProbes.push({ method: request.method, userAgent: request.headers["user-agent"] });
    response.writeHead(downloadRedirectStatus, {
      location: "https://github.com/Infinite-Labs-AI/infinite-desktop-releases/releases/latest/download/Infinite-arm64.dmg",
    });
    response.end();
    return;
  }
  if (url.pathname === "/tracking" || url.pathname === "/tracking/events" || url.pathname === "/sdk" || url.pathname === "/sdk/infinite.js") {
    forbiddenProbeRequests += 1;
    response.writeHead(404, { "cache-control": "no-store" });
    response.end("not found");
    return;
  }
  if (url.pathname === "/infinite/handoff") {
    handoffRequests.push(request.method);
    response.writeHead(handoffEndpointStatus, {
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store",
    });
    response.end();
    return;
  }
  if (url.pathname === "/infinite/ledger" && request.method === "POST") {
    collectRequests += 1;
    observedCollectOrigin = request.headers.origin;
    const payload = JSON.parse(await body(request));
    assert.equal(payload.siteSourceKey, "site_synthetic_guardrail");
    assert.equal(payload.eventName, "site_page_view");
    assert.equal("environment" in payload, false, "browser payload cannot choose environment");
    received.set(payload.eventId, { eventId: payload.eventId, eventName: payload.eventName, environment: "synthetic" });
    response.writeHead(202, { "content-type": "application/json" });
    response.end(JSON.stringify({ accepted: true, duplicate: false }));
    return;
  }
  if (url.pathname === "/synthetic-drain" && request.method === "POST") {
    drainRequests += 1;
    const raw = await body(request);
    assert.equal(
      request.headers["x-vercel-signature"],
      createHmac("sha1", drainSecret).update(raw).digest("hex"),
    );
    const records = JSON.parse(raw);
    for (const record of records) {
      assert.equal(typeof record.id, "string", "Drain record id must be a string");
      assert.equal(typeof record.deploymentId, "string", "Drain record deploymentId must be a string");
      assert.equal(typeof record.host, "string", "Drain record host must be a string");
      assert.equal(typeof record.timestamp, "number", "Drain record timestamp must be numeric");
      assert.equal(typeof record.projectId, "string", "Drain record projectId must be a string");
      assert.equal(typeof record.level, "string", "Drain record level must be a string");
      if (record.proxy) {
        assert.equal(typeof record.proxy.timestamp, "number", "Drain proxy timestamp must be numeric");
        assert.equal(typeof record.proxy.method, "string", "Drain proxy method must be a string");
        assert.equal(typeof record.proxy.host, "string", "Drain proxy host must be a string");
        assert.equal(typeof record.proxy.path, "string", "Drain proxy path must be a string");
        assert.equal(Array.isArray(record.proxy.userAgent), true, "Drain proxy userAgent must be an array");
        assert.equal(typeof record.proxy.region, "string", "Drain proxy region must be a string");
      }
    }
    // Mirrors the real drain since 1bu-1 #2827 (count-and-flag): a bot-shaped DOCUMENT record is
    // ACCEPTED as a flagged row (is_bot + agent class), while a bot-shaped REDIRECT is still dropped.
    const isBotUa = (record) => /bot/i.test(record.proxy?.userAgent?.[0] ?? "");
    const accepted = records.filter((record) => ["edge", "redirect"].includes(record.source)
      && record.projectId === "prj_synthetic"
      && record.proxy?.host === "infinite.fast"
      && record.proxy?.method === "GET"
      && ((record.source === "redirect" && !isBotUa(record))
        || (record.source === "edge" && record.message === 'INFINITE_DOCUMENT_REQUEST_V1 {"path":"/"}')));
    for (const record of accepted) {
      const flagged = record.source === "edge" && isBotUa(record);
      received.set(`vercel:${record.id}`, {
        eventId: `vercel:${record.id}`,
        eventName: record.source === "edge" ? "site_document_request" : "app_download_redirect",
        environment: "synthetic",
        isBot: record.source === "edge" ? flagged : null,
        agentClass: flagged ? "bot" : record.source === "edge" ? "human" : null,
        agentSubclass: flagged ? "search_crawler" : null,
        agentVerified: flagged ? "unknown" : null,
      });
    }
    response.writeHead(202, { "content-type": "application/json" });
    response.end(JSON.stringify({ accepted: accepted.length, ignored: records.length - accepted.length, duplicates: 0 }));
    return;
  }
  if (url.pathname === "/receipt") {
    receiptRequests += 1;
    assert.equal(request.headers.authorization, `Bearer ${receiptToken}`);
    const eventId = url.searchParams.get("eventId");
    const event = received.get(eventId);
    response.writeHead(event ? 200 : 404, { "content-type": "application/json" });
    response.end(JSON.stringify(event ? { received: true, ...event } : { received: false }));
    return;
  }

  const canonicalPath = url.pathname === "/" ? "/" : `${url.pathname.replace(/\/+$/, "")}/`;
  const canonical = `${origin}${canonicalPath}`;
  response.writeHead(200, {
    "content-type": "text/html",
    "content-security-policy": "default-src 'self'; report-uri /api/csp-report; report-to csp-endpoint",
    "reporting-endpoints": `csp-endpoint=\"${origin}/api/csp-report\"`,
  });
  response.end(`<!doctype html><html><head>
    <link rel="canonical" href="${canonical}">
    <meta property="og:url" content="${canonical}">
    <script>window.__infiniteConsentGate = function (start) { start(); };</script>
    <script>window.__infiniteConsentGate(function () { posthog.init("phc_test", { api_host: "/ingest" }); });</script>
    <script>var ga = "https://www.googletagmanager.com/gtag/js?id=G-TEST"; gtag("config", "G-TEST"); document.addEventListener("click", function (event) { var anchor = event.target.closest("a[href]"); var destination = new URL(anchor.href); if (destination.pathname !== "/download") return; if (typeof window.gtag !== "function") return; gtag("event", "app_download_clicked", { cta_location: "hero", destination_path: "/download", event_callback: function () {}, event_timeout: 1000 }); });</script>
    <script>window.infinitePrivacyChoices = function () {};</script>
    <script data-infinite-runtime="managed">var runtimeConfig = {${runtimeSiteSourceKey ? `"siteSourceKey":"${runtimeSiteSourceKey}",` : ""}"collectPath":"/infinite/ledger","consent":{"mode":"not_required"}};</script>
    ${servesHandoffBytes ? `<script>document.addEventListener("click", function () { var context = typeof window.__infiniteHandoffContext === "function" ? window.__infiniteHandoffContext() : null; if (!context) return; navigator.sendBeacon("/infinite/handoff", "{}"); var card = document.createElement("div"); card.id = "infinite-handoff-card"; card.dataset.open = "infinite://handoff/v1?claim_id=x&secret=y"; }, true);</script>` : ""}
  </head><body></body></html>`);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

try {
  const commonEnv = {
    ...process.env,
    SITE_BASE_URL: baseUrl,
    EXPECTED_POSTHOG_TOKEN: "phc_test",
    EXPECTED_POSTHOG_API_HOST: "/ingest",
    EXPECTED_GA_TAG_ID: "G-TEST",
    EXPECTED_INFINITE_SITE_SOURCE_KEY: "site_live_guardrail",
    SYNTHETIC_SITE_SOURCE_KEY: "site_synthetic_guardrail",
    ANALYTICS_RECEIPT_URL: `${baseUrl}/receipt`,
    ANALYTICS_RECEIPT_TOKEN: receiptToken,
    SYNTHETIC_DRAIN_URL: `${baseUrl}/synthetic-drain`,
    SYNTHETIC_DRAIN_SECRET: drainSecret,
    SYNTHETIC_VERCEL_PROJECT_ID: "prj_synthetic",
    SYNTHETIC_PRODUCTION_HOST: "infinite.fast",
    RECEIPT_POLL_ATTEMPTS: "2",
    RECEIPT_POLL_DELAY_MS: "1",
  };

  const missingSourceKey = await execute(process.execPath, [join(repoRoot, "scripts/verify-live-analytics.mjs")], {
    ...commonEnv,
    REQUIRE_SYNTHETIC_RECEIPTS: "0",
  });
  assert.notEqual(missingSourceKey.code, 0, "activation-mode verification must fail when deployed runtime omits the expected production source key");
  assert.match(missingSourceKey.stderr, /siteSourceKey/);
  runtimeSiteSourceKey = "site_live_guardrail";

  const disabled = await execute(process.execPath, [join(repoRoot, "scripts/verify-live-analytics.mjs")], {
    ...commonEnv,
    REQUIRE_SYNTHETIC_RECEIPTS: "0",
  });
  assert.equal(disabled.code, 0, disabled.stderr || disabled.stdout);
  assert.match(disabled.stdout, /SKIP\s+synthetic receipts \(REQUIRE_SYNTHETIC_RECEIPTS is not 1\)/);
  assert.equal(collectRequests, 0, "disabled verification must not call the collector");
  assert.equal(drainRequests, 0, "disabled verification must not call the Drain");
  assert.equal(receiptRequests, 0, "disabled verification must not query receipts");
  assert.equal(forbiddenProbeRequests, 8, "disabled verification must probe forbidden tracking and sdk routes after the failing source-key run");

  const missing = await execute(process.execPath, [join(repoRoot, "scripts/verify-live-analytics.mjs")], {
    ...commonEnv,
    REQUIRE_SYNTHETIC_RECEIPTS: "1",
    SYNTHETIC_DRAIN_SECRET: "",
  });
  assert.notEqual(missing.code, 0, "enabled verification must fail closed on missing configuration");
  assert.match(missing.stderr, /SYNTHETIC_DRAIN_SECRET/);
  assert.equal(collectRequests, 0, "missing enabled configuration must fail before collector calls");
  assert.equal(drainRequests, 0, "missing enabled configuration must fail before Drain calls");
  assert.equal(receiptRequests, 0, "missing enabled configuration must fail before receipt calls");

  observedDownloadProbes.length = 0;
  const result = await execute(process.execPath, [join(repoRoot, "scripts/verify-live-analytics.mjs")], {
    ...commonEnv,
    REQUIRE_SYNTHETIC_RECEIPTS: "1",
  });
  assert.equal(result.code, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS\s+same-origin synthetic browser receipt/);
  assert.match(result.stdout, /PASS\s+signed synthetic Drain receipt/);
  assert.match(result.stdout, /PASS\s+\/download GET 307/);
  assert.match(result.stdout, /PASS\s+\/download HEAD 307/);
  assert.match(result.stdout, /PASS\s+CSP report endpoint/);
  assert.equal(observedCollectOrigin, baseUrl);
  assert.equal(collectRequests, 1);
  assert.equal(drainRequests, 1);
  // browser page view + human document + redirect + the FLAGGED Googlebot document (count-and-flag).
  assert.equal(receiptRequests, 4);
  assert.equal(forbiddenProbeRequests, 16, "each verification run must probe forbidden tracking and sdk routes");
  assert.deepEqual(
    observedDownloadProbes.map((probe) => probe.method),
    ["GET", "HEAD"],
    "live verification must validate GET and HEAD against the same release redirect",
  );
  assert.match(observedDownloadProbes[0]?.userAgent ?? "", /bot/i, "GET redirect probe must be bot-classified and excluded from production counts");
  assert.match(observedDownloadProbes[1]?.userAgent ?? "", /bot/i, "HEAD redirect probe must keep the same uncounted guardrail identity");

  downloadRedirectStatus = 308;
  const permanentRedirect = await execute(process.execPath, [join(repoRoot, "scripts/verify-live-analytics.mjs")], {
    ...commonEnv,
    REQUIRE_SYNTHETIC_RECEIPTS: "0",
  });
  assert.notEqual(permanentRedirect.code, 0, "the live verifier must reject a permanent 308 for /download");
  assert.match(permanentRedirect.stderr, /GET expected 307/);
  assert.match(permanentRedirect.stderr, /HEAD expected 307/);
  downloadRedirectStatus = 307;

  // ── Browser-led desktop handoff (Wave 2) ─────────────────────────────────────────────────────
  // The site half is two-keyed and ships OFF. The verifier pins BOTH directions, because each has
  // its own way of going silently wrong: an "enabled" deploy whose bytes never shipped looks fine
  // to every other check, and a dormant deploy that leaked the flow would be attribution running
  // before the privacy disclosure is approved.
  const handoffMissing = await execute(process.execPath, [join(repoRoot, "scripts/verify-live-analytics.mjs")], {
    ...commonEnv,
    REQUIRE_SYNTHETIC_RECEIPTS: "0",
    EXPECTED_HANDOFF_ENABLED: "1",
  });
  assert.notEqual(handoffMissing.code, 0, "an enabled handoff expectation must fail when the live bytes are absent");
  assert.match(handoffMissing.stderr, /handoff/i);

  servesHandoffBytes = true;
  const probesBeforeDormantRun = handoffRequests.length;
  const handoffLeaked = await execute(process.execPath, [join(repoRoot, "scripts/verify-live-analytics.mjs")], {
    ...commonEnv,
    REQUIRE_SYNTHETIC_RECEIPTS: "0",
  });
  assert.notEqual(handoffLeaked.code, 0, "handoff bytes on a dormant deployment must fail the guardrail");
  assert.match(handoffLeaked.stderr, /handoff/i);
  assert.equal(handoffRequests.length, probesBeforeDormantRun, "the dormant branch must not even probe the claim endpoint");

  const handoffEnabled = await execute(process.execPath, [join(repoRoot, "scripts/verify-live-analytics.mjs")], {
    ...commonEnv,
    REQUIRE_SYNTHETIC_RECEIPTS: "0",
    EXPECTED_HANDOFF_ENABLED: "1",
  });
  assert.equal(handoffEnabled.code, 0, handoffEnabled.stderr || handoffEnabled.stdout);
  assert.match(handoffEnabled.stdout, /PASS\s+\/infinite\/handoff/);
  assert.equal(handoffRequests.length, probesBeforeDormantRun + 1, "an enabled run probes the claim endpoint exactly once");
  assert.deepEqual(
    [...new Set(handoffRequests)],
    ["OPTIONS"],
    "the health probe must never issue a claim",
  );
  // No claim id, secret, or source key may ever reach the log.
  assert.doesNotMatch(handoffEnabled.stdout, /claim_id=|secret=|site_live_guardrail/);

  handoffEndpointStatus = 405;
  const handoffUnhealthy = await execute(process.execPath, [join(repoRoot, "scripts/verify-live-analytics.mjs")], {
    ...commonEnv,
    REQUIRE_SYNTHETIC_RECEIPTS: "0",
    EXPECTED_HANDOFF_ENABLED: "1",
  });
  assert.notEqual(handoffUnhealthy.code, 0, "an unhealthy claim endpoint must fail the guardrail");
  assert.match(handoffUnhealthy.stderr, /handoff/i);
  handoffEndpointStatus = 204;
  servesHandoffBytes = false;

  // ── A guardrail run is not a visit ───────────────────────────────────────────────────────────
  // Every LIVE probe must carry `Purpose: prefetch`, which middleware.js `isPrefetch()` reads and
  // `isProductionDocumentNavigation()` rejects on — so no probe can emit a document marker, a
  // visitKey, or a server visit, no matter how browser-shaped its user agent becomes. Before this,
  // the only thing keeping CI out of production's human rows was our UA lacking `Mozilla/`.
  const liveProbes = observedProbes.filter((probe) => !COUNTED_OR_OFFSITE.has(probe.pathname));
  assert.ok(liveProbes.length > 0, "the verifier must actually probe the live site");
  for (const probe of liveProbes) {
    assert.equal(
      probe.purpose,
      "prefetch",
      `live probe ${probe.method} ${probe.pathname} must send "Purpose: prefetch" — it would otherwise be counted as a production document request`,
    );
  }
  for (const pathname of ["/", "/tools/", "/ingest/static/array.js", "/download", "/api/csp-report", "/sdk/infinite.js", "/infinite/handoff"]) {
    assert.ok(
      liveProbes.some((probe) => probe.pathname === pathname),
      `expected a live probe for ${pathname} in the prefetch-declared set`,
    );
  }
  // The counted lane is the contrast that makes the rule meaningful: the synthetic collect POST
  // deliberately does NOT declare itself a prefetch, because that row is supposed to exist.
  const collectProbes = observedProbes.filter((probe) => probe.pathname === "/infinite/ledger");
  assert.equal(collectProbes.length, 1, "exactly one synthetic collect POST per enabled run");
  assert.equal(collectProbes[0].purpose, undefined, "the synthetic collect POST is meant to be recorded and must not claim to be a prefetch");
} finally {
  server.close();
}

function execute(file, args, env) {
  return new Promise((resolve) => {
    execFile(file, args, { cwd: repoRoot, env }, (error, stdout, stderr) => {
      resolve({ code: error?.code ?? 0, stdout, stderr });
    });
  });
}

function body(request) {
  return new Promise((resolve, reject) => {
    let value = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { value += chunk; });
    request.on("end", () => resolve(value));
    request.on("error", reject);
  });
}
