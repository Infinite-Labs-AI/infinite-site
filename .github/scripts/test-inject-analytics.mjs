import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const tempDir = mkdtempSync(join(tmpdir(), "infinite-analytics-"));
const injectorPath = join(repoRoot, ".github/scripts/inject-analytics.cjs");
const contractHashes = {
  "browser-collect-v1.schema.json": "919130276f983c61de47a75e986386c8bc7be543d4fd6706a71f0bc5481f34c0",
  "browser-collect-v1.fixture.json": "08d5ae19194044bf0f2d144c2bd50902baacb09f5170f66067d0e9fd9b9148a9",
};
const downloadLocations = ["navigation", "hero", "pricing", "final-cta"];

const sourceArtifact = (siteSourceKey, productionHosts) => JSON.stringify({
  siteSourceKey,
  collectPath: "/infinite/ledger",
  productionHosts,
  staticProxy: "vercel",
});

const page = (title) => `<!doctype html><html><head><title>${title}</title></head><body>
  <a href="/pricing" data-analytics-cta-id="view-pricing" data-analytics-cta-location="navigation">Pricing</a>
  ${downloadLocations.map((location) => `<a href="/download" data-download-location="${location}">Download for Mac</a>`).join("\n  ")}
</body></html>`;

try {
  assert.equal(JSON.parse(readFileSync(join(repoRoot, "node_modules/infinite-tag/package.json"), "utf8")).version, "0.3.5");
  for (const [name, expectedHash] of Object.entries(contractHashes)) {
    const bytes = readFileSync(join(repoRoot, "node_modules/infinite-tag/contracts", name));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedHash, `${name} must match the reviewed public contract`);
  }

  const distDir = join(tempDir, "dist");
  const indexPath = join(distDir, "index.html");
  const nestedPath = join(distDir, "terms", "index.html");
  mkdirSync(join(distDir, "terms"), { recursive: true });
  writeFileSync(indexPath, page("Test"));
  writeFileSync(nestedPath, page("Terms"));

  runInjector(tempDir, {
    POSTHOG_API_HOST: "/ingest",
    POSTHOG_UI_HOST: "https://eu.posthog.com",
    POSTHOG_PROJECT_TOKEN: "phc_test_project_token",
    GOOGLE_ANALYTICS_TAG_ID: "G-TEST1234",
    X_PIXEL_ID: "x-test-pixel",
    META_PIXEL_ID: "1234567890",
    INFINITE_SITE_SOURCE_KEY: "site_synthetic_test",
    INFINITE_PRODUCTION_HOSTS: "infinite.fast,www.infinite.fast",
    INFINITE_SITE_SOURCE_ARTIFACT: sourceArtifact(
      "site_synthetic_test",
      ["WWW.INFINITE.FAST.", "infinite.fast"],
    ),
    VERCEL_ENV: "production",
  });

  for (const outputPath of [indexPath, nestedPath]) {
    const html = readFileSync(outputPath, "utf8");
    assert.equal((html.match(/data-infinite-runtime="managed"/g) ?? []).length, 1, "one package-owned runtime per page");
    assert.equal((html.match(/posthog\.init\s*\(/g) ?? []).length, 1, "one PostHog initialization per page");
    assert.equal((html.match(/www\.googletagmanager\.com\/gtag\/js/g) ?? []).length, 1, "one direct GA loader definition per page");
    assert.equal((html.match(/twq\("config"/g) ?? []).length, 1, "one optional X pixel per page");
    assert.equal((html.match(/fbq\("init"/g) ?? []).length, 1, "one optional Meta pixel per page");
    assert.doesNotMatch(html, /send_page_view:\s*false/);
    assert.doesNotMatch(html, /data-infinite-consent-controller="managed"/);
    assert.match(html, /"consent":\{"mode":"not_required"\}/);
    assert.match(html, /event_callback/);
    assert.match(html, /event_timeout:\s*1000/);
    assert.match(html, /send_to:\s*"G-TEST1234"/);
    assert.match(html, /setTimeout\(follow, 1000\)/);
    assert.match(html, /"collectPath":"\/infinite\/ledger"/);
    assert.match(html, /"siteSourceKey":"site_synthetic_test"/);
    assert.match(html, /"productionHosts":\["infinite\.fast","www\.infinite\.fast"\]/);
    assert.doesNotMatch(html, /appDownloadTrackingSnippet|link_text|textContent/);
    assert.doesNotMatch(html, /_1BU|\/api\/events\/track|custom_app_download_redirect/);
    assert.doesNotMatch(html, /\/gtm\/|transport_url|app\.ultima\.inc|\/tracking\/|\/sdk\//);
    assert.equal((html.match(/<\/head>/g) ?? []).length, 1);
    // Consent gating structure: one shared gate defined before the first gated snippet,
    // and all four third-party lanes (PostHog, GA4, X, Meta) defer through it.
    assert.equal((html.match(/window\.__infiniteConsentGate = function/g) ?? []).length, 1, "exactly one shared consent gate per page");
    assert.equal((html.match(/window\.__infiniteConsentGate\(function/g) ?? []).length, 4, "PostHog, GA4, X, and Meta must all defer through the shared consent gate");
    assert.ok(
      html.indexOf("window.__infiniteConsentGate = function") < html.indexOf("posthog.init("),
      "the consent gate must be defined before the first gated snippet",
    );
    assert.match(html, /typeof window\.gtag !== "function"/);
    assert.match(html, /window\.infinitePrivacyChoices/);
  }

  const syntheticHtml = readFileSync(indexPath, "utf8");
  // No stored decision: not_required collects by default.
  const granted = executeAnalytics(syntheticHtml, {});
  assert.equal(granted.infiniteEvents("site_page_view").length, 1, "Infinite emits with no stored decision");

  // infinite-tag >= 0.3.5: an explicit decision governs in BOTH directions — a recorded
  // denial sticks even without any privacy signal.
  const declined = executeAnalytics(syntheticHtml, { storedConsent: "denied" });
  assert.equal(declined.infiniteBodies.length, 0, "an explicit stored denial sticks");
  // The gate applies the same both-directions rule to the third-party lanes.
  assert.equal(declined.gaConfigs().length, 0, "an explicit stored denial gates GA4 even without a privacy signal");
  assert.equal(declined.loaderSrcs().length, 0, "an explicit stored denial loads no third-party libraries");
  assert.equal(declined.xEvents("config").length, 0, "an explicit stored denial gates the X pixel");
  assert.equal(declined.metaEvents("init").length, 0, "an explicit stored denial gates the Meta pixel");
  assert.equal(granted.gaConfigs().length, 1, "GA4 keeps its direct config and automatic page view");
  assert.equal(granted.xEvents("config").length, 1, "X keeps its existing direct initialization");
  assert.equal(granted.metaEvents("init").length, 1, "Meta keeps its existing direct initialization");
  assert.ok(granted.loaderSrcs().some((src) => src.includes("/static/array.js")), "PostHog loads immediately for a no-signal visitor");
  assert.ok(granted.loaderSrcs().some((src) => src.includes("www.googletagmanager.com/gtag/js")), "gtag.js loads immediately for a no-signal visitor");

  granted.click(granted.cta);
  assert.equal(granted.infiniteEvents("site_click").length, 1);
  assert.deepEqual(granted.infiniteEvents("site_click")[0].properties, {
    cta_id: "view-pricing",
    cta_location: "navigation",
    destination_path: "/pricing/",
  });
  assert.equal(granted.documentListenerCount("click"), 2, "Infinite and the explicit GA4 download bridge each bind once");
  for (const [index, location] of downloadLocations.entries()) {
    const click = granted.click(granted.downloads[location]);
    const infiniteDownloads = granted.infiniteEvents("app_download_click");
    const gaDownloads = granted.gaEvents("app_download_clicked");
    assert.equal(infiniteDownloads.length, index + 1, `${location} must emit one Infinite download event`);
    assert.equal(gaDownloads.length, index + 1, `${location} must emit one explicit GA4 download event`);
    assert.deepEqual(infiniteDownloads[index].properties, {
      cta_location: location,
      destination_path: "/download",
    });
    assert.equal(gaDownloads[index][2].cta_location, location);
    assert.equal(gaDownloads[index][2].destination_path, "/download");
    assert.equal(click.defaultPrevented, true, `${location} must wait briefly for GA4 delivery before same-tab navigation`);
  }
  assert.doesNotMatch(JSON.stringify(granted.infiniteBodies), /Download for Mac|Pricing/);

  // The global privacy signal is the DEFAULT: it suppresses only visitors with no decision.
  // Since the consent-gate fix, GA4 and PostHog honor the exact same state machine.
  const dntUndecided = executeAnalytics(syntheticHtml, { doNotTrack: "1" });
  assert.equal(dntUndecided.infiniteBodies.length, 0, "DNT suppresses Infinite while undecided");
  assert.equal(dntUndecided.gaConfigs().length, 0, "DNT suppresses GA4 while undecided");
  assert.equal(dntUndecided.loaderSrcs().length, 0, "DNT loads no third-party libraries while undecided");
  assert.equal(dntUndecided.xEvents("config").length, 0, "DNT suppresses the X pixel while undecided");
  assert.equal(dntUndecided.metaEvents("init").length, 0, "DNT suppresses the Meta pixel while undecided");
  // With GA4 un-initialized, the download bridge must leave the click completely alone:
  // cancelling the navigation before an undefined-gtag throw would silently kill the
  // Download button. The server /download redirect lane still counts the click.
  const gatedDownloadClick = dntUndecided.click(dntUndecided.downloads.hero);
  assert.equal(gatedDownloadClick.defaultPrevented, false, "without gtag the download listener must not preventDefault");
  assert.equal(dntUndecided.gaEvents("app_download_clicked").length, 0, "without gtag no GA4 download event is attempted");

  const gpcUndecided = executeAnalytics(syntheticHtml, { globalPrivacyControl: true });
  assert.equal(gpcUndecided.infiniteBodies.length, 0, "GPC suppresses Infinite while undecided");
  assert.equal(gpcUndecided.gaConfigs().length, 0, "GPC suppresses GA4 while undecided");
  assert.equal(gpcUndecided.loaderSrcs().length, 0, "GPC loads no third-party libraries while undecided");

  // Per the GPC spec (infinite-tag >= 0.3.5), the user's explicit site-specific choice
  // takes precedence over the global signal — this is what the consent prompt records.
  const dnt = executeAnalytics(syntheticHtml, { storedConsent: "granted", doNotTrack: "1" });
  assert.equal(dnt.infiniteEvents("site_page_view").length, 1, "a stored grant overrides DNT");
  assert.equal(dnt.gaConfigs().length, 1, "a stored grant restores GA4 under DNT");
  assert.ok(dnt.loaderSrcs().some((src) => src.includes("/static/array.js")), "a stored grant restores PostHog under DNT");

  const gpc = executeAnalytics(syntheticHtml, { storedConsent: "granted", globalPrivacyControl: true });
  assert.equal(gpc.infiniteEvents("site_page_view").length, 1, "a stored grant overrides GPC");
  assert.equal(gpc.gaConfigs().length, 1, "a stored grant restores GA4 under GPC");

  // Live decisions through the banner: a GPC/DNT visitor with no stored decision sees the
  // prompt; accepting initializes GA4 + PostHog + pixels right then (late init fires their
  // own page views); saving with the toggle off records a denial and keeps everything off.
  const liveGrant = executeAnalytics(syntheticHtml, { doNotTrack: "1" });
  assert.equal(liveGrant.hasPrivacyChoices(), true, "production hosts expose the manual privacy-choices control");
  liveGrant.fireDomContentLoaded();
  assert.equal(liveGrant.bannerVisible(), true, "a signal visitor with no decision sees the banner");
  liveGrant.pressBanner("Accept All");
  assert.equal(liveGrant.bannerVisible(), false, "deciding dismisses the banner");
  assert.deepEqual(liveGrant.consentChanges(), [true], "Accept All dispatches one granted consent change");
  assert.equal(liveGrant.gaConfigs().length, 1, "a live grant initializes GA4 immediately");
  assert.ok(liveGrant.loaderSrcs().some((src) => src.includes("www.googletagmanager.com/gtag/js")), "a live grant loads gtag.js");
  assert.ok(liveGrant.loaderSrcs().some((src) => src.includes("/static/array.js")), "a live grant loads PostHog");
  assert.equal(liveGrant.xEvents("config").length, 1, "a live grant initializes the X pixel");
  assert.equal(liveGrant.metaEvents("init").length, 1, "a live grant initializes the Meta pixel");

  const liveDeny = executeAnalytics(syntheticHtml, { globalPrivacyControl: true });
  liveDeny.fireDomContentLoaded();
  liveDeny.pressBanner("Manage");
  liveDeny.pressBanner("Save choices");
  assert.equal(liveDeny.bannerVisible(), false, "saving dismisses the banner");
  assert.deepEqual(liveDeny.consentChanges(), [false], "saving with the toggle off records a denial");
  assert.equal(liveDeny.gaConfigs().length, 0, "a live denial keeps GA4 off");
  assert.equal(liveDeny.loaderSrcs().length, 0, "a live denial loads no third-party libraries");

  // The banner is host-gated: where the runtime is inert (previews, unlisted aliases) a
  // decision would store nothing, so neither the banner nor the manual control may exist.
  const previewSignal = executeAnalytics(syntheticHtml, { doNotTrack: "1", hostname: "branch-preview.vercel.app" });
  assert.equal(previewSignal.hasPrivacyChoices(), false, "unlisted hosts must not expose the manual control");
  previewSignal.fireDomContentLoaded();
  assert.equal(previewSignal.bannerVisible(), false, "unlisted hosts must never render the banner");

  // Revocation: the privacy-policy page's control re-renders the banner ignoring the
  // stored decision and without any privacy signal, so a stored grant can be withdrawn.
  const revoke = executeAnalytics(syntheticHtml, { storedConsent: "granted" });
  assert.equal(revoke.gaConfigs().length, 1, "stored grant without a signal initializes GA4 as usual");
  assert.equal(revoke.hasPrivacyChoices(), true);
  revoke.openPrivacyChoices();
  revoke.fireDomContentLoaded();
  assert.equal(revoke.bannerVisible(), true, "the manual control renders the banner despite a stored decision and no signal");
  revoke.pressBanner("Manage");
  revoke.pressBanner("Save choices");
  assert.equal(revoke.bannerVisible(), false);
  assert.deepEqual(revoke.consentChanges(), [false], "saving with the toggle off revokes the stored grant");

  const preview = executeAnalytics(syntheticHtml, {
    storedConsent: "granted",
    hostname: "branch-preview.vercel.app",
  });
  assert.equal(preview.infiniteBodies.length, 0, "unverified preview hosts suppress Infinite");

  const dormantDir = mkdtempSync(join(tmpdir(), "infinite-analytics-dormant-"));
  try {
    mkdirSync(join(dormantDir, "dist"), { recursive: true });
    writeFileSync(join(dormantDir, "dist/index.html"), page("Dormant"));
    runInjector(dormantDir, {
      POSTHOG_API_HOST: "/ingest",
      POSTHOG_PROJECT_TOKEN: "phc_test_project_token",
      GOOGLE_ANALYTICS_TAG_ID: "G-TEST1234",
      INFINITE_PRODUCTION_HOSTS: "infinite.fast",
      INFINITE_SITE_SOURCE_ARTIFACT: sourceArtifact("site_production_dormant", ["infinite.fast"]),
      VERCEL_ENV: "production",
    });
    const dormantHtml = readFileSync(join(dormantDir, "dist/index.html"), "utf8");
    assert.doesNotMatch(dormantHtml, /"siteSourceKey":/);
    const dormant = executeAnalytics(dormantHtml, { storedConsent: "granted" });
    assert.equal(dormant.infiniteBodies.length, 0, "missing source key keeps Infinite dormant");
    assert.equal(dormant.gaConfigs().length, 1, "missing Infinite source does not disable GA4");
  } finally {
    rmSync(dormantDir, { recursive: true, force: true });
  }

  const previewDir = mkdtempSync(join(tmpdir(), "infinite-analytics-preview-"));
  try {
    mkdirSync(join(previewDir, "dist"), { recursive: true });
    writeFileSync(join(previewDir, "dist/index.html"), page("Preview"));
    runInjector(previewDir, {
      INFINITE_SITE_SOURCE_KEY: "site_must_not_reach_preview",
      INFINITE_PRODUCTION_HOSTS: "infinite.fast",
      VERCEL_ENV: "preview",
    });
    assert.doesNotMatch(
      readFileSync(join(previewDir, "dist/index.html"), "utf8"),
      /site_must_not_reach_preview/,
      "preview builds must omit a configured production source key",
    );
  } finally {
    rmSync(previewDir, { recursive: true, force: true });
  }

  const invalidProductionDir = mkdtempSync(join(tmpdir(), "infinite-analytics-invalid-production-"));
  try {
    mkdirSync(join(invalidProductionDir, "dist"), { recursive: true });
    writeFileSync(join(invalidProductionDir, "dist/index.html"), page("Invalid production"));
    assert.throws(
      () => runInjector(invalidProductionDir, {
        INFINITE_PRODUCTION_HOSTS: "",
        INFINITE_SITE_SOURCE_ARTIFACT: sourceArtifact("site_production", ["infinite.fast"]),
        VERCEL_ENV: "production",
      }),
      (error) => String(error.stderr).includes("Production analytics require INFINITE_PRODUCTION_HOSTS"),
      "production builds fail closed without verified host bindings",
    );
  } finally {
    rmSync(invalidProductionDir, { recursive: true, force: true });
  }

  const missingArtifactDir = mkdtempSync(join(tmpdir(), "infinite-analytics-missing-artifact-"));
  try {
    mkdirSync(join(missingArtifactDir, "dist"), { recursive: true });
    writeFileSync(join(missingArtifactDir, "dist/index.html"), page("Missing artifact"));
    assert.throws(
      () => runInjector(missingArtifactDir, {
        INFINITE_PRODUCTION_HOSTS: "infinite.fast",
        VERCEL_ENV: "production",
      }),
      (error) => String(error.stderr).includes("INFINITE_SITE_SOURCE_ARTIFACT"),
      "production builds require the authenticated public source artifact",
    );
  } finally {
    rmSync(missingArtifactDir, { recursive: true, force: true });
  }

  const wrongHostDir = mkdtempSync(join(tmpdir(), "infinite-analytics-wrong-host-"));
  try {
    mkdirSync(join(wrongHostDir, "dist"), { recursive: true });
    writeFileSync(join(wrongHostDir, "dist/index.html"), page("Wrong host"));
    assert.throws(
      () => runInjector(wrongHostDir, {
        INFINITE_SITE_SOURCE_KEY: "site_production",
        INFINITE_PRODUCTION_HOSTS: "wrong.example",
        INFINITE_SITE_SOURCE_ARTIFACT: sourceArtifact("site_production", ["infinite.fast"]),
        VERCEL_ENV: "production",
      }),
      (error) => String(error.stderr).includes("productionHosts disagree"),
      "production builds reject host inputs that disagree with the source artifact",
    );
  } finally {
    rmSync(wrongHostDir, { recursive: true, force: true });
  }

  const wrongKeyDir = mkdtempSync(join(tmpdir(), "infinite-analytics-wrong-key-"));
  try {
    mkdirSync(join(wrongKeyDir, "dist"), { recursive: true });
    writeFileSync(join(wrongKeyDir, "dist/index.html"), page("Wrong key"));
    assert.throws(
      () => runInjector(wrongKeyDir, {
        INFINITE_SITE_SOURCE_KEY: "site_wrong",
        INFINITE_PRODUCTION_HOSTS: "infinite.fast",
        INFINITE_SITE_SOURCE_ARTIFACT: sourceArtifact("site_production", ["infinite.fast"]),
        VERCEL_ENV: "production",
      }),
      (error) => String(error.stderr).includes("siteSourceKey disagrees"),
      "production builds reject source keys that disagree with the source artifact",
    );
  } finally {
    rmSync(wrongKeyDir, { recursive: true, force: true });
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function runInjector(cwd, env) {
  execFileSync(process.execPath, [injectorPath], {
    cwd,
    env: { ...process.env, ...env },
    stdio: "pipe",
  });
}

function executeAnalytics(html, {
  storedConsent,
  doNotTrack = "0",
  globalPrivacyControl = false,
  hostname = "infinite.fast",
}) {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .filter((script) => script.trim() && !script.includes("application/ld+json"));
  const infiniteBodies = [];
  const listeners = new Map();
  const storage = new Map(storedConsent ? [["infinite_analytics_consent", storedConsent]] : []);
  const sessionStorage = new Map();
  const insertedScripts = [];
  const timers = [];
  const origin = `https://${hostname}`;
  const cta = element({
    href: `${origin}/pricing?campaign=secret`,
    attributes: {
      "data-analytics-cta-id": "view-pricing",
      "data-analytics-cta-location": "navigation",
    },
  });
  const downloads = Object.fromEntries(downloadLocations.map((location) => [
    location,
    element({
      href: `${origin}/download?campaign=secret`,
      attributes: { "data-download-location": location },
    }),
  ]));
  const documentListeners = new Map();
  const consentChanges = [];
  const body = createNode("body");
  const document = {
    referrer: "https://search.example/results?q=secret",
    readyState: "loading",
    createElement: (tagName) => createNode(tagName),
    createTextNode: (text) => ({ nodeType: 3, data: String(text) }),
    getElementById: (id) => findNodeById(body, id),
    getElementsByTagName: () => [{ parentNode: { insertBefore: (node) => insertedScripts.push(node) } }],
    head: { appendChild: (node) => insertedScripts.push(node) },
    body,
    addEventListener: (name, listener) => {
      documentListeners.set(name, [...(documentListeners.get(name) ?? []), listener]);
    },
  };
  const window = {
    location: {
      href: `${origin}/tools/?campaign=secret#fragment`,
      origin,
      hostname,
      pathname: "/tools/",
    },
    addEventListener: (name, listener) => listeners.set(name, [...(listeners.get(name) ?? []), listener]),
    dispatchEvent: (event) => {
      if (event.type === "infinite:analytics-consent-change") consentChanges.push(event.detail?.granted);
      for (const listener of listeners.get(event.type) ?? []) listener(event);
    },
    posthog: [],
  };
  const context = {
    URL,
    Date,
    JSON,
    Array,
    Object,
    Set,
    Promise,
    window,
    posthog: window.posthog,
    document,
    location: window.location,
    history: { pushState() {}, replaceState() {} },
    navigator: {
      doNotTrack,
      globalPrivacyControl,
      sendBeacon: (_path, body) => { infiniteBodies.push(JSON.parse(body)); return true; },
    },
    localStorage: storageApi(storage),
    sessionStorage: storageApi(sessionStorage),
    crypto: { randomUUID },
    fetch: () => Promise.resolve({ ok: true }),
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout() {},
    console,
  };
  context.globalThis = context;

  for (const script of scripts) runInNewContext(script, context);
  while (timers.length > 0) timers.shift()();

  const posthogEvents = (name) => (window.posthog ?? []).filter((entry) => entry[0] === "capture" && entry[1] === name);
  const gaEvents = (name) => (window.dataLayer ?? []).filter((entry) => entry[0] === "event" && entry[1] === name);
  const gaConfigs = () => (window.dataLayer ?? []).filter((entry) => entry[0] === "config");
  const xEvents = (name) => (window.twq?.queue ?? []).filter((entry) => entry[0] === name);
  const metaEvents = (name) => (window.fbq?.queue ?? []).filter((entry) => entry[0] === name);
  return {
    cta,
    downloads,
    infiniteBodies,
    infiniteEvents: (name) => infiniteBodies.filter((body) => body.eventName === name),
    posthogEvents,
    gaEvents,
    gaConfigs,
    xEvents,
    metaEvents,
    insertedScripts,
    loaderSrcs: () => insertedScripts.map((node) => String(node.src ?? "")),
    documentListenerCount: (name) => documentListeners.get(name)?.length ?? 0,
    setConsent: (granted) => window.setInfiniteAnalyticsConsent(granted),
    consentChanges: () => [...consentChanges],
    fireDomContentLoaded: () => { for (const listener of documentListeners.get("DOMContentLoaded") ?? []) listener(); },
    bannerVisible: () => Boolean(findNodeById(body, "infinite-privacy-prompt")),
    pressBanner: (label) => {
      const banner = findNodeById(body, "infinite-privacy-prompt");
      if (!banner) throw new Error("privacy banner is not rendered");
      const button = findButton(banner, label);
      if (!button) throw new Error(`privacy banner button not found: ${label}`);
      for (const listener of button.listeners.get("click") ?? []) listener({});
    },
    hasPrivacyChoices: () => typeof window.infinitePrivacyChoices === "function",
    openPrivacyChoices: () => window.infinitePrivacyChoices(),
    click: (target) => {
      const event = {
        target,
        button: 0,
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; },
      };
      for (const listener of documentListeners.get("click") ?? []) listener(event);
      return event;
    },
  };
}

function storageApi(map) {
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
  };
}

// Minimal DOM node for scripts that BUILD UI (the consent banner): tracks children,
// attributes, and per-node listeners so tests can find and press rendered buttons.
function createNode(tagName) {
  const node = {
    tagName,
    style: {},
    children: [],
    listeners: new Map(),
    attributes: {},
    parentNode: null,
    setAttribute(name, value) { node.attributes[name] = String(value); },
    getAttribute(name) { return node.attributes[name] ?? null; },
    appendChild(child) {
      if (child && typeof child === "object") child.parentNode = node;
      node.children.push(child);
      return child;
    },
    removeChild(child) { node.children = node.children.filter((existing) => existing !== child); },
    addEventListener(name, listener) { node.listeners.set(name, [...(node.listeners.get(name) ?? []), listener]); },
    querySelector: () => null,
  };
  return node;
}

function findNodeById(node, id) {
  if (!node || typeof node !== "object") return null;
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

function findButton(node, label) {
  if (!node || typeof node !== "object") return null;
  if (node.tagName === "button" && (node.children ?? []).some((child) => child?.data === label)) return node;
  for (const child of node.children ?? []) {
    const found = findButton(child, label);
    if (found) return found;
  }
  return null;
}

function element({ href, attributes }) {
  const node = {
    href,
    getAttribute: (name) => attributes[name] ?? null,
  };
  node.closest = (selector) => {
    if (selector === "a[href]") return node;
    if (selector === "[data-analytics-cta-id]" && attributes["data-analytics-cta-id"]) return node;
    return null;
  };
  return node;
}
