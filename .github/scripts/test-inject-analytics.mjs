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
  assert.equal(JSON.parse(readFileSync(join(repoRoot, "node_modules/infinite-tag/package.json"), "utf8")).version, "0.3.1");
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
  }

  const syntheticHtml = readFileSync(indexPath, "utf8");
  const granted = executeAnalytics(syntheticHtml, { storedConsent: "denied" });
  assert.equal(granted.infiniteEvents("site_page_view").length, 1, "Infinite emits without stored consent");
  assert.equal(granted.gaConfigs().length, 1, "GA4 keeps its direct config and automatic page view");
  assert.equal(granted.xEvents("config").length, 1, "X keeps its existing direct initialization");
  assert.equal(granted.metaEvents("init").length, 1, "Meta keeps its existing direct initialization");

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

  const dnt = executeAnalytics(syntheticHtml, { storedConsent: "granted", doNotTrack: "1" });
  assert.equal(dnt.infiniteBodies.length, 0, "DNT suppresses Infinite even with stored consent");

  const gpc = executeAnalytics(syntheticHtml, { storedConsent: "granted", globalPrivacyControl: true });
  assert.equal(gpc.infiniteBodies.length, 0, "GPC suppresses Infinite even with stored consent");

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
  const document = {
    referrer: "https://search.example/results?q=secret",
    readyState: "loading",
    createElement: (tagName) => ({ tagName, style: {}, setAttribute() {}, querySelector: () => null }),
    getElementsByTagName: () => [{ parentNode: { insertBefore: (node) => insertedScripts.push(node) } }],
    head: { appendChild: (node) => insertedScripts.push(node) },
    body: { appendChild() {} },
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
    dispatchEvent: (event) => { for (const listener of listeners.get(event.type) ?? []) listener(event); },
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
    documentListenerCount: (name) => documentListeners.get(name)?.length ?? 0,
    setConsent: (granted) => window.setInfiniteAnalyticsConsent(granted),
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
