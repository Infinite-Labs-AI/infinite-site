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
assert.doesNotMatch(html, /skip/i, "hard gate: no skip link");

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
assert.match(html, /<a\b[^>]*id="gate-open-infinite"[^>]*href="#"/, "Open Infinite has no target until a claim exists");

// The privacy boundary: never read the tag's storage, never reference the retired Wave 2 endpoint.
assert.doesNotMatch(html, /infinite_analytics_visitor|infinite_analytics_session/);
assert.doesNotMatch(html, /["']\/infinite\/handoff["']/);
assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/, "no external scripts: one inline script only");

// ── Behaviour harness ─────────────────────────────────────────────────────────────────────────
// Drives the page's ONE inline script inside node:vm against a minimal DOM built from the ids in
// the source. The script's DOM surface is deliberately tiny (getElementById, hidden, disabled,
// value, textContent, href, addEventListener, focus) so this harness stays small and honest.
const CLAIM_KEY = "infinite_get_started_claim";
const OTP_PATH = "/infinite/auth/otp";
const CLAIM_PATH = "/infinite/auth/handoff/claim";
const CLAIM = {
  claimId: "0b1f5c3e-6d6a-4f5f-9d3b-1f2c3d4e5f60",
  secret: "s3cr3t_base64url-value",
  expiresAt: "2026-09-05T10:00:00.000Z",
};

function createPage({ consent = "granted", responses = {}, handoffContext, storedClaim } = {}) {
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
  const captures = [];
  const gtagCalls = [];
  const storage = new Map(storedClaim ? [[CLAIM_KEY, JSON.stringify(storedClaim)]] : []);
  const queues = Object.fromEntries(Object.entries(responses).map(([path, list]) => [path, [...list]]));
  const window = {
    posthog: { capture: (name, properties) => captures.push([name, cloneJson(properties)]) },
    gtag: (...args) => gtagCalls.push(args.map((arg) => cloneJson(arg))),
  };
  if (consent === "granted") window.__infiniteConsentGate = (start) => start();
  if (consent === "withheld") window.__infiniteConsentGate = () => {};
  if (handoffContext !== undefined) window.__infiniteHandoffContext = () => handoffContext;
  const context = {
    window,
    document: { getElementById: (id) => elements.get(id) ?? null },
    location: { assign: (href) => assigned.push(href) },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
    },
    fetch: (path, init) => {
      fetchCalls.push({ path, init, body: JSON.parse(init.body) });
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
    Promise,
    console,
  };
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
    captures,
    gtagCalls,
    storage,
    submit: (id) => fire(id, "submit"),
    click: (id) => fire(id, "click"),
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

{
  const page = createPage();
  assert.equal(page.el("gate-fallback").hidden, true, "a successfully initialised script hides the fallback");
  assert.equal(page.el("gate-step-email").hidden, false);
  assert.equal(page.el("gate-step-code").hidden, true);
  assert.equal(page.el("gate-step-download").hidden, true);
  assert.equal(page.fetchCalls.length, 0, "nothing is requested before the visitor acts");
}

{
  const page = createPage({
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "challenge-1" })], [CLAIM_PATH]: [ok(CLAIM)] },
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
    ctaLocation: "get-started",
    anonymousId: "anon-1",
    sessionId: "sess-1",
  });
  assert.equal(page.el("gate-step-code").hidden, true);
  assert.equal(page.el("gate-step-download").hidden, false);
  assert.equal(page.el("gate-download-email").textContent, "founder@example.com");
  assert.equal(
    page.el("gate-open-infinite").href,
    `infinite://handoff/v1?claim_id=${encodeURIComponent(CLAIM.claimId)}&secret=${encodeURIComponent(CLAIM.secret)}`,
  );
  assert.equal(page.el("gate-download-again").href, "/download", "Download again stays a plain /download anchor");
  assert.deepEqual(page.assigned, ["/download"], "the download auto-starts exactly once via location.assign");
  assert.deepEqual(JSON.parse(page.storage.get(CLAIM_KEY)), { ...CLAIM, email: "founder@example.com" });
  assert.equal(page.el("gate-fallback").hidden, true);
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
  const page = createPage({ storedClaim: { ...CLAIM, email: "a@b.co" } });
  assert.equal(page.el("gate-step-download").hidden, false);
  assert.equal(page.el("gate-step-email").hidden, true);
  assert.equal(page.el("gate-download-email").textContent, "a@b.co");
  assert.match(page.el("gate-open-infinite").href, /^infinite:\/\/handoff\/v1\?claim_id=/);
  assert.deepEqual(page.assigned, [], "a refresh must not download again by itself");
  assert.equal(page.fetchCalls.length, 0);
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
    responses: { [OTP_PATH]: [ok({ ok: true, challenge: "c" })], [CLAIM_PATH]: [ok(CLAIM)] },
  });
  page.el("gate-email").value = "a@b.co";
  await page.submit("gate-form-email");
  page.el("gate-code").value = "123456";
  await page.submit("gate-form-code");
  await page.click("gate-download-again");
  await page.click("gate-open-infinite");
  assert.deepEqual(page.captures, [
    ["gate_email_submitted", { cta_location: "get-started" }],
    ["gate_code_verified", { cta_location: "get-started" }],
    ["gate_download_started", { cta_location: "get-started", trigger: "auto" }],
    ["gate_download_started", { cta_location: "get-started", trigger: "again" }],
    ["handoff_link_clicked", { cta_location: "get-started" }],
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
