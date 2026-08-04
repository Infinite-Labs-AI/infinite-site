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
  request("https://infinite.fast/download"),
  request("https://infinite.fast/download/"),
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

function marker(path) {
  return `INFINITE_DOCUMENT_REQUEST_V1 ${JSON.stringify({ path })}`;
}
