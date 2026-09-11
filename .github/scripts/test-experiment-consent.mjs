import assert from "node:assert/strict";

// ── Experiment-serving consent contract (opt-out parity with the site) ────────────────────────
// The site's analytics are `not_required` (inject-analytics.cjs consent.mode + the
// __infiniteConsentGate opt-out state machine): a fresh visitor is collected on load, an explicit
// stored `infinite_analytics_consent="denied"` is never collected, and a bare DNT/GPC signal without
// a stored grant WAITS — it is never persisted as a denial. The serving layer must mirror that on
// BOTH sides, or the two halves split-brain:
//   • the SERVER router: config.mjs is pure emitter output and hard-codes consentMode "required";
//     middleware.js overrides it to "not_required" at construction. The override is a spread-order
//     fact (`{ ...deployment, consentMode: "not_required", manifest }`) — reorder it and every fresh
//     visitor gets pass("consent_required") while the client still beacons. Pinned here.
//   • the CLIENT bootstrap the arm builder injects: consentMode "not_required", reading the site's
//     EXISTING storage key, so the beacon fires on load for the same visitors the router enrols.
//   • opt-out parity: explicit deny suppresses both sides (and the client persists the denial +
//     expires the identity cookies); DNT and GPC suppress both sides and the client writes NOTHING
//     (the pre-fix client persisted `infinite_experiment_consent="denied"` for a bare signal — a
//     stricter policy than the site's own gate; this file fails if that returns).

// config.mjs snapshots the deployment env at import time, so set it BEFORE the middleware import.
process.env.INFINITE_PRODUCTION_HOSTS = "infinite.fast,www.infinite.fast";
process.env.VERCEL_ENV = "production";
process.env.INFINITE_EXPERIMENTS_ENABLED = "1";
process.env.INFINITE_EXPERIMENTS_SIGNING_SECRET = "consent-contract-signing-secret-0123456789abcdef";
delete process.env.INFINITE_EXPERIMENTS_ALLOW_PREVIEW;

const { default: middleware, EXPERIMENT_ROUTER_OPTIONS } = await import("../../middleware.js");
const { deployment, manifest } = await import("../../lib/infinite-experiments/config.mjs");
const { createExperimentRouter } = await import("../../lib/infinite-experiments/runtime.mjs");
const { createExperimentClient } = await import("../../lib/infinite-experiments/client.mjs");
const { clientBootstrapSnippet } = await import("../../scripts/lib/experiment-build.mjs");

const HOMEPAGE = "https://infinite.fast/";
const T = 1_757_600_000_000; // a fixed instant inside the fixture's enrolment window
const DAY = 86_400_000;
const PERSON = "0123456789abcdef0123456789abcdef";
const ORIGINAL = "a".repeat(64);
const CONSENT = { name: "infinite_experiment_consent", grantedValue: "granted", deniedValue: "denied" };
const PERSON_COOKIE = "__Host-infinite-person";
const ASSIGNMENT_PREFIX = "__Host-infinite-exp-";

// An A/A shaped exactly as the emitter freezes one: both arms are the original (one contentSha256),
// told apart only by their decorated bytes (two sha256 values).
const FIXTURE = {
  schemaVersion: 2,
  experiments: [
    {
      id: "aa-consent-contract",
      revision: "1",
      pagePath: "/",
      startsAt: T - DAY,
      enrollmentEndsAt: T + DAY,
      endsAt: T + 2 * DAY,
      allocationBasisPoints: { control: 5000, test: 5000 },
      originalContentSha256: ORIGINAL,
      variants: {
        control: { path: "/__infinite_experiments/aa-consent-contract/1/control.html", sha256: "b".repeat(64), contentSha256: ORIGINAL },
        test: { path: "/__infinite_experiments/aa-consent-contract/1/test.html", sha256: "c".repeat(64), contentSha256: ORIGINAL },
      },
    },
  ],
};

// ── (a) the server router resolves not_required WITH the middleware.js override in place ──────
assert.equal(deployment.consentMode, "required", "config.mjs must stay pure emitter output (the emitter hard-codes required)");
assert.equal(
  EXPERIMENT_ROUTER_OPTIONS.consentMode,
  "not_required",
  "middleware.js must construct the router with consentMode not_required — the override must come AFTER the deployment spread",
);
assert.equal(EXPERIMENT_ROUTER_OPTIONS.manifest, manifest, "the router must be built from the committed manifest");
assert.equal(EXPERIMENT_ROUTER_OPTIONS.environment, "production");
assert.equal(EXPERIMENT_ROUTER_OPTIONS.enabled, true, "this contract runs the router as production would at go-live (ENABLED=1)");
assert.deepEqual(EXPERIMENT_ROUTER_OPTIONS.consentCookie, CONSENT);
assert.equal(EXPERIMENT_ROUTER_OPTIONS.personCookieName, PERSON_COOKIE);

// Dormant guard: with the committed EMPTY manifest, even ENABLED=1 + a signing secret enrols nobody —
// the composed middleware passes the homepage through with no cookie, no rewrite, no private headers.
if (manifest.experiments.length === 0) {
  const response = await silenced(() => middleware(navigation(HOMEPAGE)));
  assert.ok(response instanceof Response);
  assert.ok(response.headers.has("x-middleware-next"), "dormant: the homepage must pass through");
  assert.equal(response.headers.get("x-middleware-rewrite"), null, "dormant: no arm rewrite");
  assert.equal(response.headers.get("set-cookie"), null, "dormant: no identity or assignment cookie");
  assert.equal(response.headers.get("cache-control"), null, "dormant: an empty manifest adds no private/no-store headers");
}

// The router exactly as middleware.js constructs it, over a live-shaped manifest.
function liveRouter(overrides = {}) {
  return createExperimentRouter({ ...EXPERIMENT_ROUTER_OPTIONS, manifest: FIXTURE, now: () => T, randomId: () => PERSON, ...overrides });
}
const router = liveRouter();

const fresh = await router(navigation(HOMEPAGE));
assert.equal(fresh.kind, "rewrite", "a fresh visitor with no consent state must be enrolled (opt-out policy)");
assert.equal(fresh.reason, "enrolled");
assert.equal(fresh.context.consentState, "not_required");
assert.equal(fresh.context.personId, PERSON);
assert.ok(["control", "test"].includes(fresh.context.variant));
const issued = fresh.headers["set-cookie"].split("\n");
assert.equal(issued.length, 2, "enrolment issues exactly the person cookie and the assignment cookie");
assert.match(issued[0], /^__Host-infinite-person=[a-f0-9]{32}; Path=\/; Secure; SameSite=Lax; Expires=/);
assert.doesNotMatch(issued[0], /HttpOnly/i, "the person cookie stays readable (G2: /get-started forwards it)");
assert.match(issued[1], /^__Host-infinite-exp-aa-consent-contract=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+; Path=\/; Secure; SameSite=Lax; Expires=/);

const denied = await router(navigation(HOMEPAGE, { cookie: `${CONSENT.name}=${CONSENT.deniedValue}` }));
assert.deepEqual([denied.kind, denied.reason], ["pass", "consent_denied"], "an explicit deny must suppress the server");
assert.equal(denied.headers["set-cookie"], undefined, "a refused visitor gets no cookie");

for (const [signal, headers] of [["DNT", { dnt: "1" }], ["GPC", { "sec-gpc": "1" }]]) {
  const suppressed = await router(navigation(HOMEPAGE, headers));
  assert.deepEqual([suppressed.kind, suppressed.reason], ["pass", "privacy_signal"], `${signal} must suppress the server`);
  assert.equal(suppressed.headers["set-cookie"], undefined, `${signal}: no cookie`);
}

// Site-gate parity in the other direction: a stored explicit grant overrides a privacy signal.
const grantedUnderGpc = await router(navigation(HOMEPAGE, { cookie: `${CONSENT.name}=${CONSENT.grantedValue}`, "sec-gpc": "1" }));
assert.equal(grantedUnderGpc.kind, "rewrite", "an explicit grant overrides GPC on the server (as the site gate does)");
assert.equal(grantedUnderGpc.context.consentState, "granted");

// Non-vacuous: under the emitter's own "required" mode the same fresh visitor is refused, so the
// enrolment above is the override doing its work — not the router being permissive.
const strict = liveRouter({ consentMode: deployment.consentMode });
assert.deepEqual(
  (await strict(navigation(HOMEPAGE))).reason,
  "consent_required",
  "without the override the emitter's required mode refuses a fresh visitor — the override is load-bearing",
);

// ── (b) the injected client bootstrap resolves not_required ───────────────────────────────────
const bootstrap = clientBootstrapSnippet("site_contract");
const bootMode = bootstrap.match(/consentMode:\s*"([a-z_]+)"/)?.[1];
assert.equal(bootMode, "not_required", "the injected bootstrap must construct the client with consentMode not_required");
const bootKey = bootstrap.match(/consentStorageKey:\s*"([A-Za-z0-9_]+)"/)?.[1];
assert.equal(bootKey, "infinite_analytics_consent", "the client must read the site's EXISTING consent storage key");
assert.match(bootstrap, /consentCookie: \{ name: "infinite_experiment_consent", grantedValue: "granted", deniedValue: "denied" \}/);
assert.match(bootstrap, /personCookieName: "__Host-infinite-person"/);
assert.match(bootstrap, /\}\)\.loaded\(\);/, "the bootstrap bridges consent then records the exposure");

// ── (c) opt-out parity through the client, driven with the cookies the server just issued ─────
const META = JSON.stringify({ experimentId: "aa-consent-contract", revision: "1", pagePath: "/", variant: fresh.context.variant, contentSha256: ORIGINAL });

{
  const b = browser();
  await b.client.loaded();
  assert.equal(b.fetches.length, 1, "a fresh not_required visitor beacons on load");
  assert.equal(b.fetches[0].url, "/infinite/experiment");
  assert.equal(b.fetches[0].body.consentState, "not_required");
  assert.equal(b.fetches[0].body.personId, PERSON);
  assert.equal(b.fetches[0].body.arm, fresh.context.variant);
  assert.equal(b.fetches[0].body.contentSha256, ORIGINAL);
  assert.equal(b.jar.has(CONSENT.name), false, "a fresh not_required visitor writes no consent cookie");
  assert.equal(b.jar.get(PERSON_COOKIE), PERSON, "the identity stays");
}

{
  const b = browser({ stored: "denied" });
  await b.client.loaded();
  assert.equal(b.fetches.length, 0, "an explicit stored deny suppresses the beacon");
  assert.equal(b.jar.get(CONSENT.name), CONSENT.deniedValue, "an explicit deny IS persisted so the server refuses on the next navigation");
  assert.equal(b.jar.has(PERSON_COOKIE), false, "an explicit deny expires the person cookie");
  assert.equal([...b.jar.keys()].some((k) => k.startsWith(ASSIGNMENT_PREFIX)), false, "an explicit deny expires every assignment cookie");
  const next = await router(navigation(HOMEPAGE, { cookie: cookieHeader(b.jar) }));
  assert.equal(next.reason, "consent_denied", "the persisted deny is honoured by the server on the next navigation");
}

for (const [signal, navigatorFields] of [["DNT", { dnt: "1" }], ["GPC", { gpc: true }]]) {
  const b = browser(navigatorFields);
  await b.client.loaded();
  assert.equal(b.fetches.length, 0, `${signal} suppresses the beacon`);
  assert.equal(
    b.jar.has(CONSENT.name),
    false,
    `${signal}: a bare privacy signal is NOT an explicit decision — the client must persist NO consent cookie (the site gate waits, it never stores a denial)`,
  );
  assert.equal(b.jar.get(PERSON_COOKIE), PERSON, `${signal}: the identity is kept for the decision to come`);
  assert.ok([...b.jar.keys()].some((k) => k.startsWith(ASSIGNMENT_PREFIX)), `${signal}: the assignment is kept for the decision to come`);
}

{
  // A stale 'granted' cookie the page can no longer vouch for (no stored grant) under a privacy
  // signal: the server would honour the grant over the signal, so the client expires it and the
  // server then passes privacy_signal — fail-safe, and still no persisted denial.
  const b = browser({ gpc: true, extraCookies: [`${CONSENT.name}=${CONSENT.grantedValue}; Path=/`] });
  await b.client.loaded();
  assert.equal(b.fetches.length, 0, "GPC without a stored grant suppresses the beacon even with a stale granted cookie");
  assert.equal(b.jar.has(CONSENT.name), false, "the stale granted cookie is expired; no denial is written");
  const next = await router(navigation(HOMEPAGE, { cookie: cookieHeader(b.jar), "sec-gpc": "1" }));
  assert.equal(next.reason, "privacy_signal", "with the stale grant gone the server honours GPC");
}

{
  const b = browser({ stored: "granted", gpc: true });
  await b.client.loaded();
  assert.equal(b.fetches.length, 1, "an explicit stored grant overrides GPC on the client (as the site gate does)");
  assert.equal(b.fetches[0].body.consentState, "granted");
  assert.equal(b.jar.get(CONSENT.name), CONSENT.grantedValue, "an explicit grant is bridged to the server cookie");
}

// ── helpers ───────────────────────────────────────────────────────────────────────────────────

function navigation(url, headers = {}) {
  return new Request(url, {
    method: "GET",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
      ...headers,
    },
  });
}

async function silenced(run) {
  const originalLog = console.log;
  console.log = () => {};
  try {
    return await run();
  } finally {
    console.log = originalLog;
  }
}

function cookieHeader(jar) {
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

/** A minimal browser: a document.cookie jar that honours Max-Age=0 expiry, the arm's marker meta, the
 *  site's storage key, a navigator with the privacy signals, and a recording fetch. */
function browser({ stored = null, dnt = null, gpc = undefined, extraCookies = [] } = {}) {
  const jar = new Map();
  const doc = {
    readyState: "complete",
    visibilityState: "visible",
    addEventListener() {},
    querySelector(selector) {
      return selector === 'meta[name="infinite-experiment"]' ? { content: META } : null;
    },
    get cookie() {
      return cookieHeader(jar);
    },
    set cookie(line) {
      const [pair, ...attributes] = line.split(";").map((s) => s.trim());
      const at = pair.indexOf("=");
      const name = pair.slice(0, at);
      const value = pair.slice(at + 1);
      const maxAge = attributes.find((a) => /^max-age=/i.test(a));
      if (maxAge && Number(maxAge.split("=")[1]) <= 0) jar.delete(name);
      else jar.set(name, value);
    },
  };
  for (const line of [...issued, ...extraCookies]) doc.cookie = line;
  const fetches = [];
  const client = createExperimentClient({
    siteSourceKey: "site_contract",
    document: doc,
    location: { protocol: "https:", hostname: "infinite.fast", pathname: "/", origin: "https://infinite.fast" },
    navigator: { webdriver: false, doNotTrack: dnt, globalPrivacyControl: gpc },
    storage: { getItem: (key) => (key === bootKey ? stored : null) },
    now: () => T + 1000,
    addEventListener() {},
    fetch: (url, init) => {
      fetches.push({ url, body: JSON.parse(init.body) });
      return Promise.resolve(new Response(null, { status: 202 }));
    },
    consentMode: bootMode,
    consentStorageKey: bootKey,
    personCookieName: PERSON_COOKIE,
    consentCookie: CONSENT,
  });
  return { jar, fetches, client };
}
