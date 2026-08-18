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
    run(request(`https://infinite.fast${path}`)),
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
  assert.deepEqual(run(request(url)), [marker(expectedPath)], `${url} should emit one normalized marker`);
}

assert.deepEqual(run(request("https://www.infinite.fast/compare")), [marker("/compare/")], "verified www host is counted until redirect-only status is proven");
assert.deepEqual(
  run(request("https://infinite.fast/tools", { headers: { "user-agent": "Mozilla/5.0", accept: "text/html" } })),
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

for (const fixture of excluded) assert.deepEqual(run(fixture), [], `${fixture.method} ${fixture.url} must not emit`);

process.env.VERCEL_ENV = "preview";
assert.deepEqual(run(request("https://infinite.fast/privacy")), [], "preview environment must not emit");
process.env.VERCEL_ENV = "production";

// ── Download-attempt marker contract (INFINITE_DOWNLOAD_ATTEMPT_V1) ─────────────────────────
// /download is handled on its own async path: the marker is computed (one HMAC), logged, and the
// middleware ALWAYS passes through to the native vercel.json redirect — analytics can never block
// delivery. Without the fingerprint key the lane fails OPEN: no marker, one diagnostic per isolate.

// 1) Fail-open without INFINITE_ATTEMPT_FINGERPRINT_KEY: first call logs ONE shape diagnostic,
//    later calls log nothing, and the response is always an ordinary passthrough.
delete process.env.INFINITE_ATTEMPT_FINGERPRINT_KEY;
assert.deepEqual(
  await runAsync(request("https://infinite.fast/download")),
  ['INFINITE_DOWNLOAD_ATTEMPT_DIAG {"reason":"missing_fingerprint_key"}'],
  "missing fingerprint key must fail open with exactly one diagnostic",
);
assert.deepEqual(
  await runAsync(request("https://infinite.fast/download")),
  [],
  "the missing-key diagnostic must log once per isolate, never per request",
);

// 2) With the key: a browser GET /download emits exactly one bounded attempt marker.
process.env.INFINITE_ATTEMPT_FINGERPRINT_KEY = "contract-test-fingerprint-key";
const originalNow = Date.now;
Date.now = () => 1_755_513_000_000; // pin the 30-minute bucket so attemptKey is deterministic

try {
  const [attemptLine] = await runAsync(request("https://infinite.fast/download", { headers: { "x-forwarded-for": "203.0.113.7" } }));
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
  const [repeatLine] = await runAsync(request("https://infinite.fast/download", { headers: { "x-forwarded-for": "203.0.113.7" } }));
  assert.equal(parseAttempt(repeatLine).attemptKey, attempt.attemptKey, "same browser + bucket must produce the same attemptKey");

  // A different browser (UA) in the same bucket is a different attempt.
  const [otherUaLine] = await runAsync(
    request("https://infinite.fast/download", {
      headers: { "x-forwarded-for": "203.0.113.7", "user-agent": "Mozilla/5.0 (Windows NT 10.0)" },
    }),
  );
  assert.notEqual(parseAttempt(otherUaLine).attemptKey, attempt.attemptKey, "a different UA must produce a different attemptKey");

  // A later 30-minute bucket is a different attempt.
  Date.now = () => 1_755_513_000_000 + 30 * 60 * 1000;
  const [laterLine] = await runAsync(request("https://infinite.fast/download", { headers: { "x-forwarded-for": "203.0.113.7" } }));
  assert.notEqual(parseAttempt(laterLine).attemptKey, attempt.attemptKey, "a later bucket must produce a different attemptKey");
  Date.now = () => 1_755_513_000_000;

  // 3) Bounded context: normalized UTM tokens + referrer host ride along; free-text UTMs are
  //    dropped to null (never stored), and /download/ canonicalizes onto the same path.
  const [utmLine] = await runAsync(
    request("https://infinite.fast/download/?utm_source=Newsletter&utm_medium=email&utm_campaign=launch-week&junk=1", {
      headers: { "x-forwarded-for": "203.0.113.7", referer: "https://blog.infinite.fast/some-post/" },
    }),
  );
  const utmAttempt = parseAttempt(utmLine);
  assert.equal(utmAttempt.utmSource, "newsletter");
  assert.equal(utmAttempt.utmMedium, "email");
  assert.equal(utmAttempt.utmCampaign, "launch-week");
  assert.equal(utmAttempt.referrerHost, "blog.infinite.fast");
  const [freeTextLine] = await runAsync(
    request("https://infinite.fast/download?utm_source=free%20text%20with%20spaces!"),
  );
  assert.equal(parseAttempt(freeTextLine).utmSource, null, "free-text UTM values must drop to null, never ship");

  // 4) Coarse UA families: cli beats bot for curl (both regexes match), empty UA is unknown —
  //    the marker still logs (the drain flags non-browser families; rollups exclude them).
  const [curlLine] = await runAsync(request("https://infinite.fast/download", { headers: { "user-agent": "curl/8.0" } }));
  assert.equal(parseAttempt(curlLine).uaFamily, "cli");
  const [botLine] = await runAsync(request("https://infinite.fast/download", { headers: { "user-agent": "Googlebot/2.1" } }));
  assert.equal(parseAttempt(botLine).uaFamily, "bot");

  // 5) Non-qualifying /download requests emit nothing: wrong method, preview env, foreign host.
  assert.deepEqual(await runAsync(request("https://infinite.fast/download", { method: "HEAD" })), [], "HEAD must not emit");
  assert.deepEqual(await runAsync(request("https://infinite.fast/download", { method: "POST" })), [], "POST must not emit");
  process.env.VERCEL_ENV = "preview";
  assert.deepEqual(await runAsync(request("https://infinite.fast/download")), [], "preview env must not emit an attempt");
  process.env.VERCEL_ENV = "production";
  assert.deepEqual(await runAsync(request("https://attacker.example/download")), [], "foreign host must not emit an attempt");
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

function run(req) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(" "));
  try {
    const response = middleware(req);
    assert.ok(response instanceof Response, "middleware must continue with a Vercel Response");
  } finally {
    console.log = originalLog;
  }
  return logs;
}

/** The /download path is async (one Web Crypto HMAC before the marker log) — await it, and still
 *  require the ordinary passthrough Response so the redirect is provably never blocked. */
async function runAsync(req) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(" "));
  try {
    const response = await middleware(req);
    assert.ok(response instanceof Response, "middleware must continue with a Vercel Response");
  } finally {
    console.log = originalLog;
  }
  return logs;
}

function marker(path) {
  return `INFINITE_DOCUMENT_REQUEST_V1 ${JSON.stringify({ path })}`;
}
