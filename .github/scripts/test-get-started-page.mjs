import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../../get-started/index.html", import.meta.url), "utf8");

// ── Static markup contract ────────────────────────────────────────────────────────────────────
assert.match(html, /<link rel="canonical" href="https:\/\/infinite\.fast\/get-started\/" \/>/);
assert.match(html, /<meta property="og:url" content="https:\/\/infinite\.fast\/get-started\/" \/>/);
assert.match(html, /<meta name="robots" content="noindex, follow" \/>/, "the gate is not a landing page — keep it out of the index");
assert.doesNotMatch(html, /https:\/\/www\.infinite\.fast/);
assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/, "fonts are self-hosted like every other page");

// Exact spec copy.
assert.match(html, /Use the email you’ll sign in to Infinite with\./);
assert.match(html, /We sent a 6-digit code to <span id="gate-code-target"><\/span>\./);
assert.match(html, /<li>Open the DMG<\/li>\s*<li>Drag Infinite to Applications<\/li>\s*<li>Click Open Infinite<\/li>/);
assert.match(html, /id="gate-download-again"[^>]*>Download again</);
assert.match(html, /id="gate-open-infinite"[^>]*>Open Infinite</);
assert.match(html, /id="gate-resend"[^>]*>Resend code</);
assert.match(html, /id="gate-google"[^>]*>Continue with Google</);
assert.match(html, /id="gate-google-notice"[^>]*role="status"/);
const visibleHtml = html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
assert.doesNotMatch(visibleHtml, />[^<]*skip[^<]*</i, "hard gate: no visible skip link");
assert.doesNotMatch(visibleHtml, /href="\/download"[^>]*>[^<]*skip/i, "hard gate: no direct skip-to-download CTA");

// Every download is a /download click: the two anchors carry a bounded placement marker
// (test-prepare-static-deploy enumerates the built dist and fails on a markerless one).
const downloadAnchors = html.match(/<a\b[^>]*href="\/download"[^>]*>/g) ?? [];
assert.equal(downloadAnchors.length, 2, "exactly two /download anchors: the fail-open fallback and Download again");
assert.match(html, /<a\b[^>]*id="gate-download-again"[^>]*href="\/download"[^>]*data-download-location="get-started"/);
assert.match(html, /<p id="gate-fallback"(?![^>]*\bhidden\b)[^>]*>[\s\S]*?<a\b[^>]*href="\/download"[^>]*data-download-location="get-started-fallback"/,
  "the fail-open link is VISIBLE in the source; only a successfully initialised script hides it");
for (const id of ["gate-step-email", "gate-step-code", "gate-step-download"]) {
  assert.match(html, new RegExp(`<section id="${id}"[^>]*\\bhidden\\b`), `${id} starts hidden and is revealed by the script`);
}
assert.match(html, /<button\b[^>]*id="gate-open-infinite"[^>]*type="button"/, "Open Infinite computes the secret-bearing URL only on click");
assert.doesNotMatch(html, /id="gate-open-infinite"[^>]*href=/, "the claim secret must never sit in a DOM href");

// The privacy boundary: never read the tag's storage, never reference the retired Wave 2 endpoint.
assert.doesNotMatch(html, /infinite_analytics_visitor|infinite_analytics_session/);
assert.doesNotMatch(html, /["']\/infinite\/handoff["']/);
const scriptSources = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(scriptSources, ["/assets/supabase-js-2.89.0.js"], "Supabase JS is vendored under self because CSP blocks CDNs");

// Ad conversion signals (2026-09-03): Meta's _fbc/_fbp cookies and a URL gclid ride the claim POST
// IN FLIGHT only. The page reads them at POST time, never persists them, and never bootstraps the
// pixel itself — only the env-gated injector does, so without INFINITE_META_PIXEL_ID window.fbq
// does not exist and the dedup mirror is a guarded no-op.
assert.match(html, /document\.cookie/, "fbc/fbp are read from Meta's own first-party cookies at claim time");
assert.doesNotMatch(html, /setItem\([^)]*\b(?:fbc|fbp|gclid)\b/i, "click ids are never written to browser storage");
assert.match(html, /window\.fbq\("track", "CompleteRegistration", \{\}, \{ eventID: /, "the dedup mirror uses Meta's eventID option with the claim id");
assert.match(html, /typeof window\.fbq !== "function"/, "the mirror is a no-op when the pixel never loaded");
assert.doesNotMatch(html, /fbq\("init"|connect\.facebook\.net|fbevents\.js/, "the page never bootstraps the pixel — only the env-gated injector does");

// ── Behaviour harness ─────────────────────────────────────────────────────────────────────────
// Drives the page's ONE inline script inside node:vm against a minimal DOM built from the ids in
// the source. The script's DOM surface is deliberately tiny (getElementById, hidden, disabled,
// value, textContent, href, addEventListener, focus) so this harness stays small and honest.
const CLAIM_KEY = "infinite_get_started_claim";
const GOOGLE_CONTEXT_KEY = "infinite_get_started_google_context";
const ATTRIBUTION_KEY = "infinite_landing_attribution_v1";
const SUPABASE_STORAGE_KEY = "sb-wdxjduorvpayxixpmskf-auth-token";
const PKCE_VERIFIER_KEY = "sb-wdxjduorvpayxixpmskf-auth-token-code-verifier";
const OTP_PATH = "/infinite/auth/otp";
const CLAIM_PATH = "/infinite/auth/handoff/claim";
const USER_ID = "123e4567-e89b-42d3-a456-426614174000";
const CLAIM = {
  claimId: "0b1f5c3e-6d6a-4f5f-9d3b-1f2c3d4e5f60",
  secret: "s3cr3t_base64url-value",
  expiresAt: "2026-09-05T10:00:00.000Z",
};
const ATTRIBUTION = {
  utm_source: "Newsletter",
  utm_medium: "Email",
  utm_campaign: "Launch Week",
  utm_term: "Founder Agent",
  utm_content: "Hero CTA",
  has_gclid: true,
  has_fbclid: false,
  has_msclkid: true,
  has_ttclid: true,
  landing_path: "/",
};
const CLAIM_ATTRIBUTION = {
  utmSource: "Newsletter",
  utmMedium: "Email",
  utmCampaign: "Launch Week",
  utmTerm: "Founder Agent",
  utmContent: "Hero CTA",
  hasGclid: true,
  hasFbclid: false,
  hasMsclkid: true,
  hasTtclid: true,
  landingPath: "/",
};
const DIRECT_ATTRIBUTION = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
  has_gclid: false,
  has_fbclid: false,
  has_msclkid: false,
  has_ttclid: false,
  landing_path: "/terms/",
};
const MALFORMED_ATTRIBUTION = {
  utm_source: "Paid\u0000Search",
  utm_medium: "CPC",
  utm_campaign: "B".repeat(140),
  utm_term: "term\nwith\tcontrols",
  utm_content: "?gclid=RAW_GCLID",
  has_gclid: "true",
  has_fbclid: true,
  has_msclkid: false,
  has_ttclid: true,
  landing_path: "/?gclid=RAW_GCLID#frag",
};
// Meta's own first-party cookies (fb.<subdomainIndex>.<creationMs>.<payload>) and a Google click id
// exactly as a real browser would hold them at claim time. The distinctive fragments feed the
// at-rest sweep: none of them may ever appear in sessionStorage, localStorage, or an analytics call.
const FBP_COOKIE = "fb.1.1725350400000.1909486452";
const FBC_COOKIE = "fb.1.1725350412345.IwAR0kX9_test-fbclid.Payload";
const AD_COOKIES = `_ga=GA1.1.111.222; _fbp=${FBP_COOKIE}; _fbc=${FBC_COOKIE}; infinite_analytics_consent=granted`;
const GCLID = "CjwKCAjw_test-gclid_Value-1";
const CLICK_ID_MATERIAL = /1725350400000|1725350412345|1909486452|IwAR0kX9|CjwKCAjw/;
const META_MIRROR = ["track", "CompleteRegistration", {}, { eventID: CLAIM.claimId }];

function createPage({
  consent = "granted",
  responses = {},
  handoffContext,
  storedClaim,
  storedGoogleContext,
  storedAttribution,
  storedPkceVerifier,
  existingSessionStorage,
  search = "",
  supabaseAuth = {},
  // document.cookie as the browser would expose it; an Error makes the getter throw (blocked cookies).
  cookies = "",
  // true = the env-gated Meta pixel snippet ran and defined window.fbq; false = unconfigured (prod today).
  pixel = false,
} = {}) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  assert.equal(scripts.length, 1, "the page carries exactly one inline script");
  const elements = new Map();
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) {
    const open = html.match(new RegExp(`<([a-z0-9]+)\\b[^>]*\\bid="${id}"[^>]*>`))?.[0] ?? "";
    const attributes = Object.fromEntries([...open.matchAll(/\s([a-z-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
    elements.set(id, {
      id,
      hidden: /\shidden(?=[\s>])/.test(open),
      disabled: false,
      value: "",
      textContent: "",
      href: attributes.href ?? "",
      attributes,
      focused: false,
      listeners: new Map(),
      addEventListener(name, listener) {
        this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
      },
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      },
      getAttribute(name) {
        return this.attributes[name] ?? null;
      },
      focus() {
        this.focused = true;
      },
    });
  }
  const fetchCalls = [];
  const assigned = [];
  const replaced = [];
  const captures = [];
  const gtagCalls = [];
  const fbqCalls = [];
  // Ordered record of fetches and fbq calls, so a test can prove the mirror fired AFTER the claim.
  const timeline = [];
  const storage = existingSessionStorage ?? new Map();
  if (storedClaim) storage.set(CLAIM_KEY, JSON.stringify(storedClaim));
  if (storedGoogleContext) storage.set(GOOGLE_CONTEXT_KEY, JSON.stringify(storedGoogleContext));
  if (storedAttribution) storage.set(ATTRIBUTION_KEY, JSON.stringify(storedAttribution));
  if (storedPkceVerifier) storage.set(PKCE_VERIFIER_KEY, storedPkceVerifier);
  const localStorageWrites = [];
  const identifies = [];
  const posthogCalls = [];
  const supabaseCalls = {
    createClient: [],
    autoExchange: [],
    signInWithOAuth: [],
    exchangeCodeForSession: [],
    signOut: [],
  };
  const queues = Object.fromEntries(Object.entries(responses).map(([path, list]) => [path, [...list]]));
  const authStorageProbeValues = [];
  const window = {
    posthog: {
      capture: (name, properties) => {
        const entry = [name, cloneJson(properties)];
        captures.push(entry);
        posthogCalls.push(["capture", ...entry]);
      },
      identify: (distinctId) => {
        identifies.push(distinctId);
        posthogCalls.push(["identify", distinctId]);
      },
    },
    gtag: (...args) => gtagCalls.push(args.map((arg) => cloneJson(arg))),
    supabase: {
      createClient: (url, key, options) => {
        supabaseCalls.createClient.push({ url, key, options: cloneJson(options) });
        assert.notEqual(options.auth.storage, context.localStorage, "Supabase auth must not receive localStorage");
        assert.equal(options.auth.persistSession, true, "PKCE requires persisted custom storage across the Google redirect");
        assert.equal(options.auth.autoRefreshToken, false);
        assert.equal(options.auth.detectSessionInUrl, false, "manual exchange owns the callback so Supabase cannot consume the verifier before claim minting");
        assert.equal(options.auth.flowType, "pkce");
        const supabaseMemoryStorage = new Map();
        const effectiveAuthStorage = options.auth.persistSession
          ? options.auth.storage
          : {
              getItem: (itemKey) => supabaseMemoryStorage.get(itemKey) ?? null,
              setItem: (itemKey, value) => supabaseMemoryStorage.set(itemKey, String(value)),
              removeItem: (itemKey) => supabaseMemoryStorage.delete(itemKey),
            };
        if (options.auth.detectSessionInUrl && context.location.search.includes("code=")) {
          supabaseCalls.autoExchange.push(new URLSearchParams(context.location.search).get("code"));
          effectiveAuthStorage.removeItem(PKCE_VERIFIER_KEY);
        }
        effectiveAuthStorage.setItem("supabase.probe", "memory-only");
        authStorageProbeValues.push(effectiveAuthStorage.getItem("supabase.probe"));
        return {
          auth: {
            signInWithOAuth: (args) => {
              supabaseCalls.signInWithOAuth.push(cloneJson(args));
              effectiveAuthStorage.setItem(PKCE_VERIFIER_KEY, "pkce-verifier");
              if (supabaseAuth.signInWithOAuth instanceof Error) return Promise.resolve({ data: null, error: supabaseAuth.signInWithOAuth });
              return Promise.resolve(supabaseAuth.signInWithOAuth ?? { data: { provider: "google" }, error: null });
            },
            exchangeCodeForSession: (code) => {
              supabaseCalls.exchangeCodeForSession.push(code);
              if (supabaseAuth.requireCodeVerifier && effectiveAuthStorage.getItem(PKCE_VERIFIER_KEY) !== "pkce-verifier") {
                return Promise.resolve({ data: null, error: new Error("pkce_code_verifier_not_found") });
              }
              if (supabaseAuth.exchangeCodeForSession instanceof Error) return Promise.resolve({ data: null, error: supabaseAuth.exchangeCodeForSession });
              effectiveAuthStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify({ access_token: "google-access-token" }));
              effectiveAuthStorage.setItem(`${SUPABASE_STORAGE_KEY}-user`, JSON.stringify({ user: { id: "google-user" } }));
              effectiveAuthStorage.setItem(`${SUPABASE_STORAGE_KEY}-refresh-probe`, "refresh-token-probe");
              return Promise.resolve(
                supabaseAuth.exchangeCodeForSession ?? { data: { session: { access_token: "google-access-token" } }, error: null },
              );
            },
            signOut: (args) => {
              supabaseCalls.signOut.push(cloneJson(args));
              effectiveAuthStorage.removeItem(SUPABASE_STORAGE_KEY);
              effectiveAuthStorage.removeItem(`${SUPABASE_STORAGE_KEY}-user`);
              return Promise.resolve({ error: supabaseAuth.signOutError ?? null });
            },
          },
        };
      },
    },
  };
  if (consent === "granted") window.__infiniteConsentGate = (start) => start();
  if (consent === "withheld") window.__infiniteConsentGate = () => {};
  if (handoffContext !== undefined) window.__infiniteHandoffContext = () => handoffContext;
  if (pixel) {
    window.fbq = (...args) => {
      const call = args.map((arg) => cloneJson(arg));
      fbqCalls.push(call);
      timeline.push(["fbq", ...call]);
    };
  }
  let context;
  context = {
    window,
    document: {
      getElementById: (id) => elements.get(id) ?? null,
      get cookie() {
        if (cookies instanceof Error) throw cookies;
        return cookies;
      },
    },
    location: {
      search,
      pathname: "/get-started",
      origin: "https://infinite.fast",
      href: `https://infinite.fast/get-started${search}`,
      assign: (href) => assigned.push(href),
    },
    history: {
      replaceState: (_state, _title, href) => {
        replaced.push(href);
        context.location.href = new URL(href, context.location.href).href;
        context.location.search = new URL(context.location.href).search;
      },
    },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
      key: (index) => [...storage.keys()][index] ?? null,
      get length() {
        return storage.size;
      },
    },
    localStorage: {
      getItem: () => null,
      setItem: (key, value) => localStorageWrites.push([key, String(value)]),
      removeItem: (key) => localStorageWrites.push([key, null]),
    },
    fetch: (path, init) => {
      fetchCalls.push({ path, init, body: JSON.parse(init.body) });
      timeline.push(["fetch", path]);
      const reply = queues[path]?.shift();
      if (!reply) return Promise.reject(new Error(`unexpected fetch ${path}`));
      if (reply instanceof Error) return Promise.reject(reply);
      return Promise.resolve({
        ok: reply.status >= 200 && reply.status < 300,
        status: reply.status,
        json: () => Promise.resolve(reply.body),
      });
    },
    JSON,
    encodeURIComponent,
    decodeURIComponent,
    Promise,
    URL,
    URLSearchParams,
    console,
  };
  window.location = context.location;
  window.history = context.history;
  window.sessionStorage = context.sessionStorage;
  window.localStorage = context.localStorage;
  context.supabase = window.supabase;
  context.globalThis = context;
  runInNewContext(scripts[0], context);
  const fire = async (id, name) => {
    for (const listener of elements.get(id).listeners.get(name) ?? []) listener({ preventDefault() {} });
    await settle();
  };
  return {
    el: (id) => elements.get(id),
    fetchCalls,
    assigned,
    replaced,
    captures,
    gtagCalls,
    fbqCalls,
    timeline,
    identifies,
    posthogCalls,
    storage,
    localStorageWrites,
    supabaseCalls,
    authStorageProbeValues,
    submit: (id) => fire(id, "submit"),
    click: (id) => fire(id, "click"),
    settle,
  };
}

function cloneJson(value) {
  if (!value || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value));
}

async function settle() {
  for (let round = 0; round < 8; round += 1) await new Promise((resolve) => setImmediate(resolve));
}

const ok = (body) => ({ status: 200, body });
const err = (status, error) => ({ status, body: { error } });
const GOOGLE_FAILURE_REASONS = new Set([
  "missing_verifier",
  "invalid_grant",
  "invalid_token",
  "google_provider_required",
  "rate_limited",
  "csp_or_network",
  "server_error",
]);

// §14 at-rest sweep: after any flow, no click-id material or field name may sit in sessionStorage,
// localStorage, the stored claim, or any PostHog/GA4 call. (The in-flight claim body is the ONE
// place they may appear, and only for the request that forwards them.)
function assertNoClickIdsAtRest(page) {
  assert.doesNotMatch(JSON.stringify([...page.storage.entries()]), CLICK_ID_MATERIAL, "sessionStorage never holds fbc/fbp/gclid material");
  assert.doesNotMatch(JSON.stringify([...page.storage.entries()]), /"(?:fbc|fbp|gclid)"/, "no click-id field is ever persisted");
  assert.deepEqual(page.localStorageWrites, [], "localStorage is never written by the gate");
  assert.doesNotMatch(JSON.stringify([page.captures, page.gtagCalls, page.identifies]), CLICK_ID_MATERIAL, "PostHog/GA4 never receive click-id values");
  assert.doesNotMatch(JSON.stringify([page.captures, page.gtagCalls]), /fbc|fbp|gclid/i, "no click-id property reaches an analytics provider");
  assert.doesNotMatch(JSON.stringify(page.fbqCalls), /a@b\.co|founder@|s3cr3t|fb\.1\.|CjwKCAjw/, "the Meta mirror carries no email, secret, or click-id value");
}

function assertGoogleFailureEvent(page, reason, ctaLocation = "get-started") {
  assert.equal(GOOGLE_FAILURE_REASONS.has(reason), true, `${reason} is a bounded Google failure reason`);
  const expected = [["gate_google_failed", { cta_location: ctaLocation, reason }]];
  assert.deepEqual(page.captures, expected);
  assert.deepEqual(page.gtagCalls, expected.map(([name, properties]) => ["event", name, properties]));
  assert.doesNotMatch(
    JSON.stringify([page.captures, page.gtagCalls]),
    /a@b\.co|s3cr3t|claim_id|supabase-state|pkce-code|google-access-token|raw-secret-description/,
    "Google failure diagnostics never include email, token, code, claim id, or secret material",
  );
}

{
  const page = createPage();
  assert.equal(page.el("gate-fallback").hidden, true, "a successfully initialised script hides the fallback");
  assert.equal(page.el("gate-step-email").hidden, false);
  assert.equal(page.el("gate-step-code").hidden, true);
  assert.equal(page.el("gate-step-download").hidden, true);
  assert.equal(page.fetchCalls.length, 0, "nothing is requested before the visitor acts");
}

{
  const page = createPage({ search: "?cta=pricing&utm_source=x&utm_medium=cpc&utm_campaign=fall&gclid=SECRET&fbclid=FBSECRET" });
  await page.click("gate-google");
  assert.deepEqual(page.supabaseCalls.signInWithOAuth, [
    {
      provider: "google",
      options: {
        redirectTo: "https://infinite.fast/get-started",
        skipBrowserRedirect: false,
      },
    },
  ]);
  assert.equal(page.supabaseCalls.createClient.length, 1);
  assert.equal(page.supabaseCalls.createClient[0].url, "https://wdxjduorvpayxixpmskf.supabase.co");
  assert.match(page.supabaseCalls.createClient[0].key, /^eyJ/);
  assert.deepEqual(page.authStorageProbeValues, ["memory-only"]);
  assert.deepEqual(page.localStorageWrites, [], "the Google auth client is never given browser localStorage");
  assert.equal(page.storage.get(PKCE_VERIFIER_KEY), "pkce-verifier", "only the PKCE verifier survives the OAuth redirect in same-origin sessionStorage");
  const stored = JSON.parse(page.storage.get(GOOGLE_CONTEXT_KEY));
  assert.deepEqual(stored, {
    ctaLocation: "pricing",
    gateMethod: "google",
  });
  assert.doesNotMatch(page.storage.get(GOOGLE_CONTEXT_KEY), /SECRET|FBSECRET/, "click id values are not stored across the OAuth redirect");
  assert.deepEqual(page.captures, [["gate_google_started", { cta_location: "pricing" }]]);
  assert.deepEqual(page.gtagCalls, page.captures.map(([name, properties]) => ["event", name, properties]));
}

{
  const survivingSessionStorage = new Map([[ATTRIBUTION_KEY, JSON.stringify(ATTRIBUTION)]]);
  const firstPage = createPage({
    search: "?cta=hero&utm_source=x&utm_medium=cpc&utm_campaign=fall&gclid=SECRET",
    existingSessionStorage: survivingSessionStorage,
  });
  await firstPage.click("gate-google");
  assert.equal(
    survivingSessionStorage.get(PKCE_VERIFIER_KEY),
    "pkce-verifier",
    "the PKCE verifier must be in sessionStorage before Google destroys the page context",
  );

  const returnPage = createPage({
    search: "?code=pkce-code&state=supabase-state",
    existingSessionStorage: survivingSessionStorage,
    handoffContext: { siteSourceKey: "site_x", anonymousId: "anon-1", sessionId: "sess-1" },
    responses: { [CLAIM_PATH]: [ok({ ...CLAIM, userId: USER_ID })] },
    supabaseAuth: { requireCodeVerifier: true },
  });
  await returnPage.settle();
  assert.deepEqual(returnPage.supabaseCalls.exchangeCodeForSession, ["pkce-code"]);
  assert.deepEqual(returnPage.fetchCalls[0].body, {
    accessToken: "google-access-token",
    ctaLocation: "hero",
    anonymousId: "anon-1",
    sessionId: "sess-1",
    ...CLAIM_ATTRIBUTION,
  });
  assert.deepEqual(returnPage.identifies, [USER_ID], "Google claim success identifies the site PostHog person by Supabase UUID");
  assert.deepEqual(returnPage.assigned, ["/download"]);
  assert.equal(returnPage.el("gate-step-download").hidden, false);
  assert.doesNotMatch(JSON.stringify(returnPage.fetchCalls), /SECRET|RAW_/, "a landing-URL gclid never survives the OAuth redirect: the return URL has none and the stash holds only booleans");
  assert.deepEqual(returnPage.fbqCalls, [], "no pixel configured → no Meta mirror");
  assert.doesNotMatch(JSON.stringify([returnPage.captures, returnPage.gtagCalls, returnPage.identifies]), /SECRET|RAW_|google-access-token|founder@example\.com|claim_id|s3cr3t/, "analytics never receive raw click ids, tokens, email, claim id, or secret");
  assert.deepEqual(
    [...survivingSessionStorage.keys()].filter((key) => key === SUPABASE_STORAGE_KEY || key.startsWith(`${SUPABASE_STORAGE_KEY}-`)),
    [],
    "Supabase PKCE/session keys are purged from sessionStorage immediately after the claim POST resolves",
  );
  assert.deepEqual(returnPage.localStorageWrites, [], "the OAuth redirect path never writes Supabase state to localStorage");
}

{
  const page = createPage({
    search: "?code=pkce-code&state=supabase-state",
    storedGoogleContext: {
      ctaLocation: "navigation",
      gateMethod: "google",
    },
    storedAttribution: ATTRIBUTION,
    storedPkceVerifier: "pkce-verifier",
    handoffContext: { siteSourceKey: "site_x", anonymousId: "anon-1", sessionId: "sess-1" },
    responses: { [CLAIM_PATH]: [ok({ ...CLAIM, userId: USER_ID })] },
    supabaseAuth: { requireCodeVerifier: true },
  });
  await page.settle();
  assert.deepEqual(page.supabaseCalls.exchangeCodeForSession, ["pkce-code"]);
  assert.deepEqual(page.supabaseCalls.autoExchange, [], "Supabase must not auto-exchange the URL before the explicit claim flow");
  assert.deepEqual(page.fetchCalls[0].body, {
    accessToken: "google-access-token",
    ctaLocation: "navigation",
    anonymousId: "anon-1",
    sessionId: "sess-1",
    ...CLAIM_ATTRIBUTION,
  });
  assert.deepEqual(page.supabaseCalls.signOut, [{ scope: "local" }]);
  assert.deepEqual(page.replaced, ["/get-started"]);
  assert.deepEqual(page.identifies, [USER_ID], "PostHog identify runs before later explicit gate events on Google success");
  assert.deepEqual(page.posthogCalls.slice(0, 3), [
    ["identify", USER_ID],
    ["capture", "gate_google_completed", { cta_location: "navigation" }],
    ["capture", "gate_download_started", { cta_location: "navigation", trigger: "auto" }],
  ]);
  assert.equal(page.storage.has(PKCE_VERIFIER_KEY), false, "the PKCE verifier is cleared after the code exchange");
  assert.equal(page.storage.has(GOOGLE_CONTEXT_KEY), false, "the post-redirect attribution context is single-use");
  assert.equal(page.el("gate-step-download").hidden, false);
  assert.deepEqual(page.assigned, ["/download"]);
  assert.deepEqual(page.localStorageWrites, [], "the Google return path never writes Supabase state to localStorage");
  assert.deepEqual(page.captures, [
    ["gate_google_completed", { cta_location: "navigation" }],
    ["gate_download_started", { cta_location: "navigation", trigger: "auto" }],
  ]);
  assert.doesNotMatch(JSON.stringify([page.captures, page.gtagCalls]), /supabase-state|pkce-code|google-access-token/, "OAuth code/token are not sent to analytics");
}

for (const [status, error, reason] of [
  [400, "google_provider_required", "google_provider_required"],
  [401, "invalid_token", "invalid_token"],
  [429, "rate_limited", "rate_limited"],
]) {
  const page = createPage({
    search: "?code=pkce-code",
    storedPkceVerifier: "pkce-verifier",
    responses: { [CLAIM_PATH]: [err(status, error)] },
    supabaseAuth: { requireCodeVerifier: true },
    cookies: AD_COOKIES,
    pixel: true,
  });
  await page.settle();
  assert.equal(page.el("gate-step-email").hidden, false);
  assert.equal(page.el("gate-google-notice").hidden, false);
  assert.match(page.el("gate-google-notice").textContent, /Google sign-in didn.t complete/);
  assert.equal(page.el("gate-fallback").hidden, true, "provider/token/rate-limit failures fall back to email, not direct-download bypass");
  assert.deepEqual(page.assigned, [], "Google claim failures do not start the installer download");
  assert.deepEqual(page.supabaseCalls.signOut, [{ scope: "local" }]);
  assert.deepEqual(page.replaced, ["/get-started"]);
  assert.equal(page.storage.has(PKCE_VERIFIER_KEY), false);
  assertGoogleFailureEvent(page, reason);
  assert.deepEqual(page.fbqCalls, [], `a ${status} claim is not a registration — nothing is mirrored to Meta`);
  assertNoClickIdsAtRest(page);
}

{
  const page = createPage({
    search: "?code=pkce-code",
    storedPkceVerifier: "pkce-verifier",
    responses: { [CLAIM_PATH]: [err(500, "database_unavailable")] },
    supabaseAuth: { requireCodeVerifier: true },
  });
  await page.settle();
  assert.equal(page.el("gate-step-email").hidden, false);
  assert.equal(page.el("gate-google-notice").hidden, false);
  assert.equal(page.el("gate-fallback").hidden, false, "a Google claim server failure keeps the fail-open direct download visible");
  assert.deepEqual(page.assigned, [], "Google claim failures do not start the installer download");
  assert.deepEqual(page.supabaseCalls.signOut, [{ scope: "local" }]);
  assert.deepEqual(page.replaced, ["/get-started"]);
  assert.equal(page.storage.has(PKCE_VERIFIER_KEY), false);
  assertGoogleFailureEvent(page, "server_error");
}

{
  const page = createPage({
    search: "?code=pkce-code",
    supabaseAuth: { requireCodeVerifier: true },
  });
  await page.settle();
  assert.equal(page.el("gate-step-email").hidden, false);
  assert.equal(page.el("gate-google-notice").hidden, false);
  assert.equal(page.el("gate-fallback").hidden, true);
  assert.equal(page.fetchCalls.length, 0, "no claim request fires without the PKCE verifier");
  assert.deepEqual(page.supabaseCalls.signOut, [{ scope: "local" }]);
  assert.deepEqual(page.replaced, ["/get-started"]);
  assertGoogleFailureEvent(page, "missing_verifier");
}

{
  const page = createPage({
    search: "?code=pkce-code",
    storedPkceVerifier: "pkce-verifier",
    supabaseAuth: { requireCodeVerifier: true, exchangeCodeForSession: new Error("invalid_grant") },
  });
  await page.settle();
  assert.equal(page.el("gate-step-email").hidden, false);
  assert.equal(page.el("gate-google-notice").hidden, false);
  assert.equal(page.el("gate-fallback").hidden, true);
  assert.equal(page.fetchCalls.length, 0, "no claim request fires when Supabase rejects the code");
  assert.deepEqual(page.supabaseCalls.signOut, [{ scope: "local" }]);
  assert.deepEqual(page.replaced, ["/get-started"]);
  assertGoogleFailureEvent(page, "invalid_grant");
}

{
  const page = createPage({
    search: "?code=pkce-code",
    storedPkceVerifier: "pkce-verifier",
    supabaseAuth: { requireCodeVerifier: true, exchangeCodeForSession: new Error("server 500 unavailable") },
  });
  await page.settle();
  assert.equal(page.el("gate-step-email").hidden, false);
  assert.equal(page.el("gate-google-notice").hidden, false);
  assert.equal(page.el("gate-fallback").hidden, false, "a Supabase exchange server failure keeps the fail-open direct download visible");
  assert.equal(page.fetchCalls.length, 0, "no claim request fires when Supabase cannot exchange the code");
  assert.deepEqual(page.supabaseCalls.signOut, [{ scope: "local" }]);
  assert.deepEqual(page.replaced, ["/get-started"]);
  assertGoogleFailureEvent(page, "server_error");
}

{
  const page = createPage({
    search: "?code=pkce-code",
    storedPkceVerifier: "pkce-verifier",
    supabaseAuth: { requireCodeVerifier: true, exchangeCodeForSession: new TypeError("Failed to fetch") },
  });
  await page.settle();
  assert.equal(page.el("gate-step-email").hidden, false);
  assert.equal(page.el("gate-google-notice").hidden, false);
  assert.equal(page.el("gate-fallback").hidden, false, "a Supabase exchange network failure keeps the fail-open direct download visible");
  assert.equal(page.fetchCalls.length, 0, "no claim request fires without an access token");
  assert.deepEqual(page.supabaseCalls.signOut, [{ scope: "local" }]);
  assert.deepEqual(page.replaced, ["/get-started"]);
  assert.equal(page.storage.has(PKCE_VERIFIER_KEY), false);
  assertGoogleFailureEvent(page, "csp_or_network");
}

{
  const page = createPage({
    search: "?error=access_denied&error_description=raw-secret-description",
    storedGoogleContext: {
      ctaLocation: "hero",
      gateMethod: "google",
    },
    storedPkceVerifier: "pkce-verifier",
  });
  await page.settle();
  assert.equal(page.el("gate-step-email").hidden, false);
  assert.equal(page.el("gate-google-notice").hidden, false);
  assert.equal(page.el("gate-fallback").hidden, true);
  assert.deepEqual(page.supabaseCalls.createClient, [], "OAuth error callbacks do not need a Supabase client");
  assert.deepEqual(page.fetchCalls, []);
  assert.deepEqual(page.replaced, ["/get-started"]);
  assert.equal(page.storage.has(PKCE_VERIFIER_KEY), false);
  assert.equal(page.storage.has(GOOGLE_CONTEXT_KEY), false);
  assertGoogleFailureEvent(page, "invalid_token", "hero");
}

{
  const page = createPage({
    search: "?code=pkce-code",
    storedPkceVerifier: "pkce-verifier",
    responses: { [CLAIM_PATH]: [new TypeError("Failed to fetch")] },
    supabaseAuth: { requireCodeVerifier: true },
  });
  await page.settle();
  assert.equal(page.el("gate-step-email").hidden, false);
  assert.equal(page.el("gate-google-notice").hidden, false);
  assert.equal(page.el("gate-fallback").hidden, false, "a Google claim network failure keeps the fail-open direct download visible");
  assert.equal(page.storage.has(PKCE_VERIFIER_KEY), false);
  assertGoogleFailureEvent(page, "csp_or_network");
}

{
  const page = createPage({
    search: "?cta=hero",
    storedAttribution: ATTRIBUTION,
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "challenge-1" })], [CLAIM_PATH]: [ok({ ...CLAIM, userId: USER_ID })] },
    handoffContext: { siteSourceKey: "site_x", anonymousId: "anon-1", sessionId: "sess-1", url: "https://infinite.fast/get-started/" },
  });
  page.el("gate-email").value = "  Founder@Example.com ";
  await page.submit("gate-form-email");
  assert.deepEqual(page.fetchCalls[0].body, { email: "founder@example.com" }, "email is trimmed + lowercased like the API does");
  assert.equal(page.fetchCalls[0].init.method, "POST");
  assert.equal(page.fetchCalls[0].init.headers["content-type"], "application/json");
  assert.equal(page.fetchCalls[0].init.credentials, "same-origin");
  assert.equal(page.el("gate-step-email").hidden, true);
  assert.equal(page.el("gate-step-code").hidden, false);
  assert.equal(page.el("gate-code-target").textContent, "founder@example.com");
  assert.equal(page.el("gate-code").focused, true);

  page.el("gate-code").value = "123 456";
  await page.submit("gate-form-code");
  assert.deepEqual(page.fetchCalls[1].body, {
    email: "founder@example.com",
    token: "123456",
    challenge: "challenge-1",
    ctaLocation: "hero",
    anonymousId: "anon-1",
    sessionId: "sess-1",
    ...CLAIM_ATTRIBUTION,
  }, "a consent-qualified infinite-tag 0.6.0 handoff accessor contributes both browser ids and the originating homepage CTA");
  assert.deepEqual(page.identifies, [USER_ID], "OTP claim success identifies the site PostHog person by Supabase UUID, never email");
  assert.deepEqual(page.posthogCalls.slice(0, 3), [
    ["capture", "gate_email_submitted", { cta_location: "hero" }],
    ["identify", USER_ID],
    ["capture", "gate_code_verified", { cta_location: "hero" }],
  ]);
  assert.equal(page.el("gate-step-code").hidden, true);
  assert.equal(page.el("gate-step-download").hidden, false);
  assert.equal(page.el("gate-download-email").textContent, "founder@example.com");
  assert.equal(page.el("gate-open-infinite").href, "", "the secret-bearing handoff URL is not stored in the DOM");
  assert.equal(page.el("gate-download-again").href, "/download", "Download again stays a plain /download anchor");
  assert.deepEqual(page.assigned, ["/download"], "the download auto-starts exactly once via location.assign");
  assert.deepEqual(JSON.parse(page.storage.get(CLAIM_KEY)), { ...CLAIM, email: "founder@example.com" });
  assert.equal(page.el("gate-fallback").hidden, true);
  assert.doesNotMatch(JSON.stringify(page.fetchCalls), /EAIa|RAW_/, "without Meta cookies or a URL gclid the claim carries the presence booleans only");
  assert.deepEqual(page.fbqCalls, [], "no pixel configured → no Meta mirror");
  assert.doesNotMatch(JSON.stringify([page.captures, page.gtagCalls, page.identifies]), /EAIa|RAW_|founder@example\.com|s3cr3t|claim_id/, "analytics never receive raw click ids, email as PostHog id, or handoff secrets");
  await page.click("gate-open-infinite");
  assert.deepEqual(page.assigned, [
    "/download",
    `infinite://handoff/v1?claim_id=${encodeURIComponent(CLAIM.claimId)}&secret=${encodeURIComponent(CLAIM.secret)}`,
  ]);
}

for (const [search, expected] of [
  ["?cta=navigation", "navigation"],
  ["?cta=pricing", "pricing"],
  ["?cta=pricing-matrix", "pricing-matrix"],
  ["?cta=final-cta", "final-cta"],
  ["?cta=bad%20value", "get-started"],
  ["", "get-started"],
]) {
  const page = createPage({
    search,
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [ok(CLAIM)] },
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "123456";
  await page.submit("gate-form-code");
  assert.equal(page.fetchCalls[1].body.ctaLocation, expected, `${search || "direct entry"} maps to ctaLocation=${expected}`);
}

for (const handoffContext of [null, undefined]) {
  const page = createPage({
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [ok(CLAIM)] },
    handoffContext,
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "000000";
  await page.submit("gate-form-code");
  assert.deepEqual(
    Object.keys(page.fetchCalls[1].body).sort(),
    ["challenge", "ctaLocation", "email", "token"],
    `no browser ids when the accessor is ${handoffContext === null ? "null" : "absent"}`,
  );
}

{
  const page = createPage({
    storedAttribution: DIRECT_ATTRIBUTION,
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [ok({ ...CLAIM, userId: USER_ID })] },
    handoffContext: null,
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "000000";
  await page.submit("gate-form-code");
  assert.deepEqual(
    page.fetchCalls[1].body,
    {
      email: "a@b.co",
      token: "000000",
      challenge: "c",
      ctaLocation: "get-started",
      hasGclid: false,
      hasFbclid: false,
      hasMsclkid: false,
      hasTtclid: false,
      landingPath: "/terms/",
    },
    "a visitor with no landing campaign still completes with only false click-id flags and landingPath",
  );
  assert.deepEqual(page.identifies, [USER_ID], "missing campaign attribution never blocks PostHog identity on claim success");
  assert.equal(page.el("gate-step-download").hidden, false);
  assert.deepEqual(page.assigned, ["/download"]);
}

{
  const page = createPage({
    storedAttribution: MALFORMED_ATTRIBUTION,
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [ok({ ...CLAIM, userId: USER_ID })] },
    handoffContext: null,
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "000000";
  await page.submit("gate-form-code");
  assert.deepEqual(page.fetchCalls[1].body, {
    email: "a@b.co",
    token: "000000",
    challenge: "c",
    ctaLocation: "get-started",
    utmSource: "PaidSearch",
    utmMedium: "CPC",
    utmCampaign: "B".repeat(128),
    utmTerm: "termwithcontrols",
    hasFbclid: true,
    hasMsclkid: false,
    hasTtclid: true,
  }, "claim send re-validates client-writable attribution storage");
  assert.doesNotMatch(JSON.stringify(page.fetchCalls[1].body), /RAW_GCLID|\?|#/, "malformed stored query/click-id material is not transmitted");
}

{
  const page = createPage({ responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })] } });
  page.el("gate-email").value = "not-an-email";
  await page.submit("gate-form-email");
  assert.equal(page.fetchCalls.length, 0);
  assert.equal(page.el("gate-email-error").hidden, false);
  assert.match(page.el("gate-email-error").textContent, /email/i);
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "12";
  await page.submit("gate-form-code");
  assert.equal(page.fetchCalls.length, 1, "a malformed code is rejected locally");
  assert.match(page.el("gate-code-error").textContent, /6-digit/);
}

{
  const page = createPage({
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [err(400, "Invalid or expired code")] },
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "999999";
  await page.submit("gate-form-code");
  assert.equal(page.el("gate-step-code").hidden, false);
  assert.match(page.el("gate-code-error").textContent, /invalid or has expired/);
  assert.equal(page.el("gate-fallback").hidden, true, "a wrong code is not a reason to skip the gate");
  assert.deepEqual(page.assigned, []);
  assert.equal(page.storage.has(CLAIM_KEY), false);
  assert.equal(page.el("gate-submit-code").disabled, false, "the button is re-enabled for a retry");
}

{
  const page = createPage({ responses: { [OTP_PATH]: [err(429, "Rate limit exceeded. Please try again later.")] } });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  assert.equal(page.el("gate-step-email").hidden, false);
  assert.match(page.el("gate-email-error").textContent, /Too many codes requested/);
  assert.equal(page.el("gate-fallback").hidden, true);
}

{
  const page = createPage({ responses: { [OTP_PATH]: [err(500, "Email service is not configured")] } });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  assert.equal(page.el("gate-fallback").hidden, false, "a 5xx reveals the direct download");
  assert.match(page.el("gate-email-error").textContent, /direct download/);
}
{
  const page = createPage({ responses: { [OTP_PATH]: [err(404, "Not found")] } });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  assert.equal(page.el("gate-fallback").hidden, false, "local static servers without rewrites reveal the direct download");
  assert.match(page.el("gate-email-error").textContent, /direct download/);
}
{
  const page = createPage({ responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [new TypeError("Failed to fetch")] } });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "123456";
  await page.submit("gate-form-code");
  assert.equal(page.el("gate-fallback").hidden, false, "a network failure reveals the direct download");
  assert.match(page.el("gate-code-error").textContent, /couldn.t reach Infinite/);
}

{
  const page = createPage({ storedClaim: { ...CLAIM, email: "a@b.co" }, cookies: AD_COOKIES, pixel: true });
  assert.equal(page.el("gate-step-download").hidden, false);
  assert.equal(page.el("gate-step-email").hidden, true);
  assert.equal(page.el("gate-download-email").textContent, "a@b.co");
  assert.equal(page.el("gate-open-infinite").href, "", "restored claims also keep the secret out of the DOM");
  assert.deepEqual(page.assigned, [], "a refresh must not download again by itself");
  await page.click("gate-open-infinite");
  assert.match(page.assigned[0], /^infinite:\/\/handoff\/v1\?claim_id=/);
  assert.equal(page.fetchCalls.length, 0);
  assert.deepEqual(page.fbqCalls, [], "a refresh restores the claim without re-mirroring a registration to Meta");
}

// ── Ad conversion signals: click ids ride the claim IN FLIGHT only; Meta dedup mirror ─────────────
// The cloud (1bu-1 #3088) sends CompleteRegistration to Meta server-side with event_id = claimId and
// accepts optional fbc / fbp / gclid on the claim body to forward within the SAME invocation. The
// browser's half: read Meta's own _fbc/_fbp cookies (and a gclid only if it is literally on THIS
// page's URL) at POST time, never persist them, and after the 200 fire the same event with the same
// eventID through the pixel so Meta collapses browser + server into one conversion.
{
  const page = createPage({
    search: "?cta=hero",
    cookies: AD_COOKIES,
    pixel: true,
    storedAttribution: ATTRIBUTION,
    handoffContext: null,
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [ok({ ...CLAIM, userId: USER_ID })] },
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  assert.deepEqual(page.fetchCalls[0].body, { email: "a@b.co" }, "the OTP request carries no click ids — only the claim that mints does");
  page.el("gate-code").value = "123456";
  await page.submit("gate-form-code");
  assert.deepEqual(page.fetchCalls[1].body, {
    email: "a@b.co",
    token: "123456",
    challenge: "c",
    ctaLocation: "hero",
    ...CLAIM_ATTRIBUTION,
    fbc: FBC_COOKIE,
    fbp: FBP_COOKIE,
  }, "Meta's own _fbc/_fbp cookie values are read at POST time and forwarded verbatim; the presence booleans stay; no gclid because none is on this page's URL");
  assert.equal("gclid" in page.fetchCalls[1].body, false, "gclid is omitted, not sent empty");
  assert.deepEqual(page.fbqCalls, [META_MIRROR], "the browser mirror is CompleteRegistration with eventID = the server's claim id, and empty custom data");
  const claimAt = page.timeline.findIndex(([kind, path]) => kind === "fetch" && path === CLAIM_PATH);
  const mirrorAt = page.timeline.findIndex(([kind]) => kind === "fbq");
  assert.ok(claimAt !== -1 && mirrorAt > claimAt, "the mirror fires only after the claim request, never before");
  assert.deepEqual(page.identifies, [USER_ID]);
  assert.deepEqual(page.assigned, ["/download"]);
  assert.equal(page.el("gate-step-download").hidden, false);
  assertNoClickIdsAtRest(page);
}
{
  const page = createPage({
    search: "?code=pkce-code&state=supabase-state",
    cookies: AD_COOKIES,
    pixel: true,
    storedGoogleContext: { ctaLocation: "pricing", gateMethod: "google" },
    storedPkceVerifier: "pkce-verifier",
    responses: { [CLAIM_PATH]: [ok({ ...CLAIM, userId: USER_ID })] },
    supabaseAuth: { requireCodeVerifier: true },
  });
  await page.settle();
  assert.deepEqual(page.fetchCalls[0].body, {
    accessToken: "google-access-token",
    ctaLocation: "pricing",
    fbc: FBC_COOKIE,
    fbp: FBP_COOKIE,
  }, "the Google proof path forwards the same cookies; the OAuth return URL never carries a gclid");
  assert.deepEqual(page.fbqCalls, [META_MIRROR], "the Google path mirrors the registration with the same claim id");
  const claimAt = page.timeline.findIndex(([kind, path]) => kind === "fetch" && path === CLAIM_PATH);
  assert.ok(page.timeline.findIndex(([kind]) => kind === "fbq") > claimAt, "the mirror fires after the claim, on the Google path too");
  assert.deepEqual(page.assigned, ["/download"]);
  assert.deepEqual(
    [...page.storage.keys()].filter((key) => key === SUPABASE_STORAGE_KEY || key.startsWith(`${SUPABASE_STORAGE_KEY}-`)),
    [],
    "the Supabase purge still runs with the ad-signal additions",
  );
  assertNoClickIdsAtRest(page);
}
{
  const page = createPage({
    search: `?cta=hero&gclid=${GCLID}&fbclid=IwAR0urlonly`,
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [ok(CLAIM)] },
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "123456";
  await page.submit("gate-form-code");
  assert.deepEqual(page.fetchCalls[1].body, {
    email: "a@b.co",
    token: "123456",
    challenge: "c",
    ctaLocation: "hero",
    gclid: GCLID,
  }, "a gclid is forwarded ONLY when it is literally on the /get-started URL at POST time; a URL fbclid is never synthesised into fbc and no cookie means no fbc/fbp");
  assert.deepEqual(page.fbqCalls, [], "no pixel → no mirror, and the gate still completes");
  assert.deepEqual(page.assigned, ["/download"]);
  assertNoClickIdsAtRest(page);
}
{
  const page = createPage({
    search: `?cta=hero&gclid=${encodeURIComponent("has spaces;and=semicolons")}`,
    cookies: `_fbc=fb.1.notms.IwAR0bad; _fbp=fb.1.1725350400000.${"A".repeat(513)}`,
    pixel: true,
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [ok(CLAIM)] },
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "123456";
  await page.submit("gate-form-code");
  assert.deepEqual(
    Object.keys(page.fetchCalls[1].body).sort(),
    ["challenge", "ctaLocation", "email", "token"],
    "values failing Meta's fb.<idx>.<ms>.<payload> cookie shape or the URL-safe gclid shape (the cloud's exact rules) never leave the browser",
  );
  assert.deepEqual(page.fbqCalls, [META_MIRROR], "the mirror does not depend on the cookies");
  assert.deepEqual(page.assigned, ["/download"]);
}
{
  const page = createPage({
    cookies: new Error("SecurityError: cookies are blocked"),
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [ok(CLAIM)] },
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "123456";
  await page.submit("gate-form-code");
  assert.deepEqual(
    Object.keys(page.fetchCalls[1].body).sort(),
    ["challenge", "ctaLocation", "email", "token"],
    "blocked cookie access is not an error: the optional fields are simply omitted",
  );
  assert.deepEqual(page.assigned, ["/download"], "the gate completes exactly as before");
  assert.equal(page.el("gate-step-download").hidden, false);
  assert.equal(page.el("gate-fallback").hidden, true);
}
{
  const page = createPage({
    consent: "withheld",
    search: `?gclid=${GCLID}`,
    cookies: AD_COOKIES,
    pixel: true,
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [ok(CLAIM)] },
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "123456";
  await page.submit("gate-form-code");
  assert.deepEqual(
    Object.keys(page.fetchCalls[1].body).sort(),
    ["challenge", "ctaLocation", "email", "token"],
    "without a consent grant (DNT/GPC undecided, saved denial) no ad-network identifier is read or forwarded — the hashed-email conversion stays the server's business",
  );
  assert.deepEqual(page.fbqCalls, [], "a withheld consent gate means no Meta mirror even if a stale fbq exists");
  assert.deepEqual(page.assigned, ["/download"], "the flow itself is not consent-gated");
  assertNoClickIdsAtRest(page);
}
{
  const page = createPage({
    cookies: AD_COOKIES,
    pixel: true,
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [err(400, "Invalid or expired code")] },
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "999999";
  await page.submit("gate-form-code");
  assert.deepEqual(page.fbqCalls, [], "a rejected code is not a registration — nothing is mirrored");
  assert.equal(page.el("gate-fallback").hidden, true);
  assertNoClickIdsAtRest(page);
}
{
  const page = createPage({ storedClaim: { claimId: "x" } });
  assert.equal(page.el("gate-step-email").hidden, false, "a malformed stored claim is ignored");
}

{
  const page = createPage({
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c1" }), ok({ ok: true, challenge: "c2" })], [CLAIM_PATH]: [ok(CLAIM)] },
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  await page.click("gate-resend");
  assert.equal(page.fetchCalls.length, 2);
  assert.deepEqual(page.fetchCalls[1].body, { email: "a@b.co" });
  assert.match(page.el("gate-code-note").textContent, /We sent a new code to a@b\.co\./);
  page.el("gate-code").value = "123456";
  await page.submit("gate-form-code");
  assert.equal(page.fetchCalls[2].body.challenge, "c2", "the newest challenge is the one verified");
}
for (const [status, message] of [[500, "5xx"], [404, "local static 404"]]) {
  const page = createPage({ responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c1" }), err(status, "Unavailable")] } });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  await page.click("gate-resend");
  assert.equal(page.el("gate-fallback").hidden, false, `a resend ${message} reveals the direct download`);
  assert.match(page.el("gate-code-error").textContent, /new code|direct download/i);
}
{
  const page = createPage({ responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c1" }), new TypeError("Failed to fetch")] } });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  await page.click("gate-resend");
  assert.equal(page.el("gate-fallback").hidden, false, "a resend network failure reveals the direct download");
  assert.match(page.el("gate-code-error").textContent, /couldn.t reach Infinite/);
}
{
  const page = createPage({ responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c1" }), err(429, "Rate limit exceeded")] } });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  await page.click("gate-resend");
  assert.equal(page.el("gate-fallback").hidden, true, "a resend rate limit keeps the hard gate");
  assert.match(page.el("gate-code-error").textContent, /Too many codes requested/);
}
{
  const page = createPage({ responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c1" })] } });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  await page.click("gate-change-email");
  assert.equal(page.el("gate-step-email").hidden, false);
  assert.equal(page.el("gate-step-code").hidden, true);
}

// ── Page events: PostHog + GA4 only, behind the shared consent gate, never the ledger ──────────
{
  const page = createPage({
    search: "?cta=final-cta",
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [ok(CLAIM)] },
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "123456";
  await page.submit("gate-form-code");
  await page.click("gate-download-again");
  await page.click("gate-open-infinite");
  assert.deepEqual(page.assigned, [
    "/download",
    `infinite://handoff/v1?claim_id=${encodeURIComponent(CLAIM.claimId)}&secret=${encodeURIComponent(CLAIM.secret)}`,
  ]);
  assert.deepEqual(page.captures, [
    ["gate_email_submitted", { cta_location: "final-cta" }],
    ["gate_code_verified", { cta_location: "final-cta" }],
    ["gate_download_started", { cta_location: "final-cta", trigger: "auto" }],
    ["gate_download_started", { cta_location: "final-cta", trigger: "again" }],
    ["handoff_link_clicked", { cta_location: "final-cta" }],
  ]);
  assert.deepEqual(
    page.gtagCalls,
    page.captures.map(([name, properties]) => ["event", name, properties]),
    "GA4 mirrors the same four events with the same bounded properties",
  );
  assert.doesNotMatch(JSON.stringify([page.captures, page.gtagCalls]), /a@b\.co|s3cr3t|claim_id/, "no email, secret, or claim id ever reaches a provider");
}
{
  const page = createPage({
    consent: "withheld",
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [ok(CLAIM)] },
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "123456";
  await page.submit("gate-form-code");
  assert.deepEqual(page.captures, [], "a withheld consent gate means no PostHog events");
  assert.deepEqual(page.gtagCalls, [], "a withheld consent gate means no GA4 events");
  assert.deepEqual(page.assigned, ["/download"], "the flow itself is not consent-gated");
}
{
  const page = createPage({ consent: "absent", responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })] } });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  assert.deepEqual(page.captures, [], "no gate (un-injected build) means no events, and no throw");
  assert.equal(page.el("gate-step-code").hidden, false);
}
assert.match(html, /window\.__infiniteConsentGate\(function/, "page events defer through the shared consent gate");
assert.doesNotMatch(html, /\/infinite\/ledger|sendBeacon/, "page events never go to the first-party ledger");

console.log("test-get-started-page: behaviour OK");
