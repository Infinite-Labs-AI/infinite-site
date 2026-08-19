import assert from "node:assert/strict";

process.env.INFINITE_PRODUCTION_HOSTS = "infinite.fast,www.infinite.fast";
process.env.VERCEL_ENV = "production";

const { default: middleware, config, KNOWN_DOCUMENT_PATHS } = await import("../../middleware.js");

assert.equal(config.runtime, "edge");
assert.deepEqual(config.matcher, ["/((?!api/|assets/|fonts/|logos/|ingest/|infinite/).*)"]);

// The manifest is the single source of truth for what counts as a real document.
// test-prepare-static-deploy.mjs asserts it matches the built dist page set exactly.
assert.ok(KNOWN_DOCUMENT_PATHS instanceof Set && KNOWN_DOCUMENT_PATHS.size > 0, "middleware must export the document manifest");
assert.ok(KNOWN_DOCUMENT_PATHS.has("/"), "the homepage must be a known document");
for (const path of KNOWN_DOCUMENT_PATHS) {
  assert.deepEqual(
    await run(request(`https://infinite.fast${path}`)),
    [marker(path)],
    `manifest path ${path} must emit one marker for a browser document navigation`,
  );
}

const canonicalFixtures = [
  ["https://infinite.fast/", "/"],
  ["https://infinite.fast/privacy", "/privacy/"],
  ["https://infinite.fast/privacy/", "/privacy/"],
  ["https://infinite.fast//tools//?secret=redacted#fragment", "/tools/"],
];

for (const [url, expectedPath] of canonicalFixtures) {
  assert.deepEqual(await run(request(url)), [marker(expectedPath)], `${url} should emit one normalized marker`);
}

assert.deepEqual(await run(request("https://www.infinite.fast/compare")), [marker("/compare/")], "verified www host is counted until redirect-only status is proven");
assert.deepEqual(
  await run(request("https://infinite.fast/tools", { headers: { "user-agent": "Mozilla/5.0", accept: "text/html" } })),
  [marker("/tools/")],
  "browser navigation fallback works when sec-fetch-dest is absent",
);

const excluded = [
  request("https://infinite.fast/LICENSE"),
  request("https://infinite.fast/asset/app.js?secret=1"),
  request("https://infinite.fast/assets/app.js"),
  request("https://infinite.fast/fonts/site.woff2"),
  request("https://infinite.fast/logos/infinite.svg"),
  request("https://infinite.fast/ingest/e"),
  request("https://infinite.fast/infinite/ledger"),
  request("https://infinite.fast/api/csp-report"),
  request("https://infinite.fast/favicon-32.png"),
  request("https://infinite.fast/robots.txt"),
  request("https://infinite.fast/sitemap.xml"),
  request("https://infinite.fast/llms.txt"),
  request("https://infinite.fast/privacy", { method: "HEAD" }),
  request("https://infinite.fast/privacy", { headers: { purpose: "prefetch" } }),
  request("https://infinite.fast/privacy", { headers: { "sec-purpose": "prefetch" } }),
  request("https://infinite.fast/privacy", { headers: { "sec-fetch-dest": "empty" } }),
  request("https://infinite.fast/privacy", { headers: { "user-agent": "Googlebot/2.1" } }),
  request("https://infinite.fast/privacy", { headers: { "user-agent": "curl/8.0" } }),
  request("https://preview-branch.vercel.app/privacy"),
  request("https://attacker.example/privacy"),
  // Paths that do not exist must never count as pageviews, even with perfectly
  // browser-shaped headers — the middleware logs before routing and production drain
  // records carry no usable status, so the manifest is the only 404/scanner filter.
  request("https://infinite.fast/definitely-not-a-real-page-xyz"),
  request("https://infinite.fast/wp-admin/"),
  request("https://infinite.fast/wp-admin/setup-config.php"),
  request("https://infinite.fast/compare/infinite-vs-nonexistent/"),
  request("https://infinite.fast/privacy/anything-nested/"),
  request("https://infinite.fast/index.html"),
];

for (const fixture of excluded) assert.deepEqual(await run(fixture), [], `${fixture.method} ${fixture.url} must not emit`);

process.env.VERCEL_ENV = "preview";
assert.deepEqual(await run(request("https://infinite.fast/privacy")), [], "preview environment must not emit");
process.env.VERCEL_ENV = "production";

// ── Download-attempt marker contract (INFINITE_DOWNLOAD_ATTEMPT_V1) ─────────────────────────
// LIVE-TEST FINDING (2026-08-18): Vercel executes the vercel.json /download redirect BEFORE edge
// middleware on this static deployment, so the middleware now SERVES the 307 itself for
// production GET /download — marker first (fail-open), then Response.redirect. vercel.json keeps
// the same redirect as the fail-open backstop for every request shape the middleware passes
// through (non-production, foreign host, HEAD/POST) or any middleware outage.

const RELEASE_URL =
  "https://github.com/Infinite-Labs-AI/infinite-desktop-releases/releases/latest/download/Infinite-arm64.dmg";

function assertServedRedirect(response) {
  assert.equal(response.status, 307, "production GET /download must be answered by the middleware with a 307");
  assert.equal(response.headers.get("location"), RELEASE_URL, "the middleware 307 must target the exact vercel.json backstop destination");
}

function assertPassthrough(response) {
  assert.equal(response.headers.get("location"), null, "a passthrough must not redirect (the vercel.json backstop owns it)");
  assert.notEqual(response.status, 307, "a passthrough must not be the served 307");
}

// 1) Fail-open without INFINITE_ATTEMPT_FINGERPRINT_KEY: the 307 STILL returns from middleware;
//    first call logs ONE shape diagnostic, later calls log nothing.
delete process.env.INFINITE_ATTEMPT_FINGERPRINT_KEY;
{
  const first = await runAsync(request("https://infinite.fast/download"));
  assertServedRedirect(first.response);
  assert.deepEqual(
    first.logs,
    ['INFINITE_DOWNLOAD_ATTEMPT_DIAG {"reason":"missing_fingerprint_key"}'],
    "missing fingerprint key must fail open with exactly one diagnostic",
  );
  const second = await runAsync(request("https://infinite.fast/download"));
  assertServedRedirect(second.response);
  assert.deepEqual(second.logs, [], "the missing-key diagnostic must log once per isolate, never per request");
}

// 2) With the key: a browser GET /download gets the served 307 AND exactly one bounded marker.
process.env.INFINITE_ATTEMPT_FINGERPRINT_KEY = "contract-test-fingerprint-key";
const originalNow = Date.now;
Date.now = () => 1_755_513_000_000; // pin the 30-minute bucket so attemptKey is deterministic

try {
  const served = await runAsync(request("https://infinite.fast/download", { headers: { "x-forwarded-for": "203.0.113.7" } }));
  assertServedRedirect(served.response);
  const [attemptLine] = served.logs;
  const attempt = parseAttempt(attemptLine);
  assert.match(attempt.attemptKey, /^[a-f0-9]{64}$/, "attemptKey must be an HMAC-SHA256 hex digest");
  assert.equal(attempt.uaFamily, "browser");
  assert.equal(attempt.utmSource, null);
  assert.equal(attempt.utmMedium, null);
  assert.equal(attempt.utmCampaign, null);
  assert.equal(attempt.referrerHost, null);
  assert.equal(attempt.assetChannel, "mac_arm64_dmg");
  assert.equal(attempt.schemaVersion, 1);
  assert.ok(!attemptLine.includes("203.0.113.7"), "the marker must never carry the raw client IP");
  assert.ok(!attemptLine.includes("Mozilla"), "the marker must never carry the raw user agent");

  // Deterministic within one fingerprint bucket: same IP + UA → the same attemptKey (this is the
  // dedupe key — the drain derives the ledger event id from it).
  const repeat = await runAsync(request("https://infinite.fast/download", { headers: { "x-forwarded-for": "203.0.113.7" } }));
  assertServedRedirect(repeat.response);
  assert.equal(parseAttempt(repeat.logs[0]).attemptKey, attempt.attemptKey, "same browser + bucket must produce the same attemptKey");

  // A different browser (UA) in the same bucket is a different attempt.
  const otherUa = await runAsync(
    request("https://infinite.fast/download", {
      headers: { "x-forwarded-for": "203.0.113.7", "user-agent": "Mozilla/5.0 (Windows NT 10.0)" },
    }),
  );
  assert.notEqual(parseAttempt(otherUa.logs[0]).attemptKey, attempt.attemptKey, "a different UA must produce a different attemptKey");

  // A later 30-minute bucket is a different attempt.
  Date.now = () => 1_755_513_000_000 + 30 * 60 * 1000;
  const later = await runAsync(request("https://infinite.fast/download", { headers: { "x-forwarded-for": "203.0.113.7" } }));
  assert.notEqual(parseAttempt(later.logs[0]).attemptKey, attempt.attemptKey, "a later bucket must produce a different attemptKey");
  Date.now = () => 1_755_513_000_000;

  // 3) Bounded context: normalized UTM tokens + referrer host ride along; free-text UTMs are
  //    dropped to null (never stored), and /download/ canonicalizes onto the same served path.
  const utm = await runAsync(
    request("https://infinite.fast/download/?utm_source=Newsletter&utm_medium=email&utm_campaign=launch-week&junk=1", {
      headers: { "x-forwarded-for": "203.0.113.7", referer: "https://blog.infinite.fast/some-post/" },
    }),
  );
  assertServedRedirect(utm.response);
  const utmAttempt = parseAttempt(utm.logs[0]);
  assert.equal(utmAttempt.utmSource, "newsletter");
  assert.equal(utmAttempt.utmMedium, "email");
  assert.equal(utmAttempt.utmCampaign, "launch-week");
  assert.equal(utmAttempt.referrerHost, "blog.infinite.fast");
  const freeText = await runAsync(
    request("https://infinite.fast/download?utm_source=free%20text%20with%20spaces!"),
  );
  assert.equal(parseAttempt(freeText.logs[0]).utmSource, null, "free-text UTM values must drop to null, never ship");

  // 3b) Click-ID PRESENCE flags (audit aggregate-attribution ruling + P39): booleans only —
  //     the raw click-ID value must never enter the marker. Empty params read as absent.
  assert.deepEqual(
    [utmAttempt.hasGclid, utmAttempt.hasFbclid, utmAttempt.hasMsclkid],
    [false, false, false],
    "requests without click IDs must carry three false presence flags",
  );
  const gclid = await runAsync(
    request("https://infinite.fast/download?gclid=EAIaIQobChMI_secret_value_123"),
  );
  const gclidAttempt = parseAttempt(gclid.logs[0]);
  assert.deepEqual(
    [gclidAttempt.hasGclid, gclidAttempt.hasFbclid, gclidAttempt.hasMsclkid],
    [true, false, false],
    "a gclid-bearing request must flag ONLY hasGclid",
  );
  assert.ok(!gclid.logs[0].includes("EAIaIQobChMI_secret_value_123"), "the raw gclid value must never enter the marker");
  const bothIds = await runAsync(
    request("https://infinite.fast/download?fbclid=IwAR_raw_fb_value&msclkid=abc123raw"),
  );
  const bothAttempt = parseAttempt(bothIds.logs[0]);
  assert.deepEqual(
    [bothAttempt.hasGclid, bothAttempt.hasFbclid, bothAttempt.hasMsclkid],
    [false, true, true],
    "fbclid + msclkid must flag their own presence bits",
  );
  assert.ok(!bothIds.logs[0].includes("IwAR_raw_fb_value") && !bothIds.logs[0].includes("abc123raw"), "raw fbclid/msclkid values must never enter the marker");
  const emptyId = await runAsync(request("https://infinite.fast/download?gclid="));
  assert.equal(parseAttempt(emptyId.logs[0]).hasGclid, false, "an empty gclid param is not a click-ID presence");

  // 3c) The DOCUMENT marker's visit fingerprint (the honest server-rate denominator): with the
  //     key configured, a document navigation carries a hex-64 visitKey computed with the SAME
  //     HMAC as the attempt marker — the same visitor in the same 30-min bucket produces
  //     visitKey === attemptKey, which is exactly what makes attempts ÷ visits one grain.
  const docNav = await runAsync(
    request("https://infinite.fast/privacy", { headers: { "x-forwarded-for": "203.0.113.7" } }),
  );
  const docPayload = JSON.parse(docNav.logs[0].slice("INFINITE_DOCUMENT_REQUEST_V1 ".length));
  assert.equal(docPayload.path, "/privacy/");
  assert.match(docPayload.visitKey, /^[a-f0-9]{64}$/, "the document marker must carry a hex-64 visit fingerprint");
  assert.ok(!docNav.logs[0].includes("203.0.113.7"), "the document marker must never carry the raw client IP");
  assert.ok(!docNav.logs[0].includes("Mozilla"), "the document marker must never carry the raw user agent");
  assert.equal(
    docPayload.visitKey,
    attempt.attemptKey,
    "same visitor + bucket must produce visitKey === attemptKey (the same-lane join for the attempt rate)",
  );
  // Fingerprint failure fails OPEN: the pageview marker still emits, bare — the completeness
  // lane never pays for the rate lane.
  Date.now = () => {
    throw new Error("visit fingerprint boom");
  };
  const docBare = await runAsync(request("https://infinite.fast/privacy"));
  assert.deepEqual(docBare.logs, [marker("/privacy/")], "a fingerprint failure must still emit the bare document marker");
  Date.now = () => 1_755_513_000_000;

  // 4) Coarse UA families: cli beats bot for curl (both regexes match), and the 307 is served to
  //    every family — delivery never depends on classification (the drain decides what counts).
  const curl = await runAsync(request("https://infinite.fast/download", { headers: { "user-agent": "curl/8.0" } }));
  assertServedRedirect(curl.response);
  assert.equal(parseAttempt(curl.logs[0]).uaFamily, "cli");
  const bot = await runAsync(request("https://infinite.fast/download", { headers: { "user-agent": "Googlebot/2.1" } }));
  assert.equal(parseAttempt(bot.logs[0]).uaFamily, "bot");

  // 5) A marker failure must NOT cost the redirect: force the marker path to throw (Date.now is
  //    inside the fingerprint computation) — the 307 still returns, with no marker logged.
  Date.now = () => {
    throw new Error("marker boom");
  };
  const broken = await runAsync(request("https://infinite.fast/download"));
  assertServedRedirect(broken.response);
  assert.deepEqual(broken.logs, [], "a throwing marker path must stay silent and still serve the 307");
  Date.now = () => 1_755_513_000_000;

  // 6) Non-qualifying /download requests PASS THROUGH to the vercel.json backstop and emit
  //    nothing: wrong method, preview env, foreign host.
  const head = await runAsync(request("https://infinite.fast/download", { method: "HEAD" }));
  assertPassthrough(head.response);
  assert.deepEqual(head.logs, [], "HEAD must not emit");
  const post = await runAsync(request("https://infinite.fast/download", { method: "POST" }));
  assertPassthrough(post.response);
  assert.deepEqual(post.logs, [], "POST must not emit");
  process.env.VERCEL_ENV = "preview";
  const preview = await runAsync(request("https://infinite.fast/download"));
  assertPassthrough(preview.response);
  assert.deepEqual(preview.logs, [], "preview env must not emit an attempt");
  process.env.VERCEL_ENV = "production";
  const foreign = await runAsync(request("https://attacker.example/download"));
  assertPassthrough(foreign.response);
  assert.deepEqual(foreign.logs, [], "foreign host must not emit an attempt");
} finally {
  Date.now = originalNow;
}

function parseAttempt(line) {
  assert.ok(typeof line === "string" && line.startsWith("INFINITE_DOWNLOAD_ATTEMPT_V1 "), `expected an attempt marker, got: ${line}`);
  return JSON.parse(line.slice("INFINITE_DOWNLOAD_ATTEMPT_V1 ".length));
}

function request(url, { method = "GET", headers = {} } = {}) {
  return new Request(url, {
    method,
    headers: {
      "sec-fetch-dest": "document",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
      accept: "text/html,application/xhtml+xml",
      ...headers,
    },
  });
}

/** Document paths are async now (the visitKey fingerprint) — await and return logs only. */
async function run(req) {
  return (await runAsync(req)).logs;
}

/** The /download path is async (one Web Crypto HMAC before the marker log) — await it and return
 *  BOTH the logs and the Response, so callers can assert served-307 vs backstop-passthrough. */
async function runAsync(req) {
  const logs = [];
  const originalLog = console.log;
  let response;
  console.log = (...args) => logs.push(args.join(" "));
  try {
    response = await middleware(req);
    assert.ok(response instanceof Response, "middleware must always produce a Response");
  } finally {
    console.log = originalLog;
  }
  return { logs, response };
}

function marker(path) {
  return `INFINITE_DOCUMENT_REQUEST_V1 ${JSON.stringify({ path })}`;
}
