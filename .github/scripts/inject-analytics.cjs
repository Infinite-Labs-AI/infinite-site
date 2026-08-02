const fs = require("node:fs");
const path = require("node:path");

void (async () => {
  const { renderInfiniteBrowserTag } = await import("infinite-tag");
  const distDir = "dist";
  const productionHosts = parseProductionHosts(process.env.INFINITE_PRODUCTION_HOSTS);
  const isProductionBuild = process.env.VERCEL_ENV === "production";
  const configuredSourceKey = nonEmpty(process.env.INFINITE_SITE_SOURCE_KEY);
  const siteSourceKey = isProductionBuild ? configuredSourceKey : undefined;

  if (isProductionBuild && productionHosts.length === 0) {
    throw new Error("Production analytics require INFINITE_PRODUCTION_HOSTS from verified site-source bindings.");
  }
  if (!isProductionBuild && configuredSourceKey) {
    console.warn("Ignoring INFINITE_SITE_SOURCE_KEY outside a production build.");
  }

  const posthog = posthogSnippet({
    apiHost: process.env.POSTHOG_API_HOST,
    uiHost: process.env.POSTHOG_UI_HOST,
    projectToken: process.env.POSTHOG_PROJECT_TOKEN,
  });
  const ga4 = googleAnalyticsSnippet(process.env.GOOGLE_ANALYTICS_TAG_ID);
  const mirrors = [posthog && "posthog", ga4 && "ga4"].filter(Boolean);
  const runtime = renderInfiniteBrowserTag({
    ...(siteSourceKey ? { siteSourceKey } : {}),
    collectPath: "/infinite/events/collect",
    productionHosts,
    respectDnt: true,
    consent: { mode: "required", storageKey: "infinite_analytics_consent" },
    mirrors,
  });
  const snippets = [
    consentControllerSnippet(),
    posthog,
    ga4,
    xPixelSnippet(process.env.X_PIXEL_ID, productionHosts),
    metaPixelSnippet(process.env.META_PIXEL_ID, productionHosts),
    runtime,
  ].filter(Boolean);

  const pages = findHtmlFiles(distDir);
  if (pages.length === 0) throw new Error(`No HTML pages found under ${distDir}/`);
  const headBlock = `${snippets.join("\n")}\n</head>`;

  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    if (!html.includes("</head>")) throw new Error(`Could not find </head> in ${page}`);
    if (html.includes('data-infinite-runtime="managed"')) {
      throw new Error(`Managed Infinite runtime is already present in ${page}`);
    }
    // Function replacer avoids `$`-pattern interpretation in the snippet block.
    fs.writeFileSync(page, html.replace("</head>", () => headBlock));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseProductionHosts(value) {
  const hosts = (value ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);
  return [...new Set(hosts)].sort();
}

function findHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...findHtmlFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(fullPath);
  }
  return files;
}

function consentControllerSnippet() {
  return `  <script data-infinite-consent-controller="managed">
    (function () {
      var key = "infinite_analytics_consent";
      function privacySignalBlocks() {
        return navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;
      }
      function storedChoice() {
        try { return localStorage.getItem(key); } catch (_error) { return null; }
      }
      function setChoice(granted) {
        var value = granted ? "granted" : "denied";
        try { localStorage.setItem(key, value); } catch (_error) {}
        window.dispatchEvent(new CustomEvent("infinite:analytics-consent-change", {
          detail: { granted: granted === true },
        }));
        renderControls(false);
      }
      window.setInfiniteAnalyticsConsent = setChoice;
      window.getInfiniteAnalyticsConsent = function () {
        return privacySignalBlocks() ? "blocked" : storedChoice();
      };
      function renderControls(forceOpen) {
        var existing = document.querySelector && document.querySelector("[data-infinite-consent-ui]");
        if (existing && existing.remove) existing.remove();
        if (!document.body || !document.createElement) return;
        var root = document.createElement("div");
        root.setAttribute("data-infinite-consent-ui", "managed");
        root.style.cssText = "position:fixed;z-index:2147483647;right:16px;bottom:16px;font:13px/1.45 system-ui,sans-serif;color:#f5f5f4";
        var blocked = privacySignalBlocks();
        var choice = storedChoice();
        var needsDecision = !blocked && (forceOpen === true || (choice !== "granted" && choice !== "denied"));
        root.innerHTML = '<button type="button" data-infinite-manage style="border:1px solid #555;border-radius:999px;background:#111;color:#f5f5f4;padding:8px 12px;cursor:pointer">Privacy choices</button>' +
          (needsDecision ? '<div data-infinite-consent-banner style="width:min(360px,calc(100vw - 32px));margin-top:8px;border:1px solid #444;border-radius:12px;background:#111;padding:16px;box-shadow:0 16px 50px rgba(0,0,0,.4)"><strong>Website analytics</strong><p style="margin:8px 0 12px;color:#d4d4d4">With your permission, Infinite, PostHog, and Google Analytics help us understand site use and downloads. You can change this choice anytime.</p><div style="display:flex;gap:8px"><button type="button" data-infinite-deny style="border:1px solid #666;border-radius:8px;background:transparent;color:#f5f5f4;padding:8px 12px;cursor:pointer">Decline</button><button type="button" data-infinite-grant style="border:1px solid #f5f5f4;border-radius:8px;background:#f5f5f4;color:#111;padding:8px 12px;cursor:pointer">Allow analytics</button></div><a href="/privacy/#website-visitor-analytics" style="display:inline-block;margin-top:10px;color:#b7d8ff">Privacy details</a></div>' : '');
        var grant = root.querySelector && root.querySelector("[data-infinite-grant]");
        var deny = root.querySelector && root.querySelector("[data-infinite-deny]");
        var manage = root.querySelector && root.querySelector("[data-infinite-manage]");
        if (grant) grant.addEventListener("click", function () { setChoice(true); });
        if (deny) deny.addEventListener("click", function () { setChoice(false); });
        if (manage) manage.addEventListener("click", function () {
          if (blocked) return;
          renderControls(true);
        });
        document.body.appendChild(root);
      }
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { renderControls(false); });
      else renderControls(false);
    })();
  </script>`;
}

function posthogSnippet({ apiHost, uiHost, projectToken }) {
  if (!apiHost || !projectToken) return "";
  const uiHostLine = uiHost ? `\n      ui_host: ${JSON.stringify(uiHost)},` : "";
  return `  <script>
    !(function (t, e) {
      var o, n, p, r;
      e.__SV ||
        ((window.posthog = e),
        (e._i = []),
        (e.init = function (i, s, a) {
          function g(t, e) {
            var o = e.split(".");
            2 == o.length && ((t = t[o[0]]), (e = o[1])),
              (t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); });
          }
          ((p = t.createElement("script")).type = "text/javascript"),
            (p.crossOrigin = "anonymous"),
            (p.async = !0),
            (p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js"),
            (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r);
          var u = e;
          for (
            void 0 !== a ? (u = e[a] = []) : (a = "posthog"),
              u.people = u.people || [],
              u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e; },
              u.people.toString = function () { return u.toString(1) + ".people (stub)"; },
              o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),
              n = 0;
            n < o.length;
            n++
          ) g(u, o[n]);
          e._i.push([i, s, a]);
        }),
        (e.__SV = 1));
    })(document, window.posthog || []);
    posthog.init(${JSON.stringify(projectToken)}, {
      api_host: ${JSON.stringify(apiHost)},${uiHostLine}
      defaults: "2026-01-30",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      persistence: "memory",
      opt_out_capturing_by_default: true,
    });
    posthog.register({ platform: "website" });
  </script>`;
}

function googleAnalyticsSnippet(tagId) {
  if (!tagId) return "";
  const loaderUrl = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
  return `  <!-- Google tag (gtag.js), loaded only after analytics consent -->
  <script>
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(){ window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.__infiniteGa4Consent = (function () {
      var loaded = false;
      return {
        grant: function () {
          window.gtag("consent", "update", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
          if (loaded) return;
          loaded = true;
          var script = document.createElement("script");
          script.async = true;
          script.src = ${JSON.stringify(loaderUrl)};
          document.head.appendChild(script);
          window.gtag("js", new Date());
          window.gtag("config", ${JSON.stringify(tagId)}, { send_page_view: false });
        },
        deny: function () {
          if (loaded) window.gtag("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
        },
      };
    })();
  </script>`;
}

function xPixelSnippet(pixelId, productionHosts) {
  if (!pixelId) return "";
  return `  <!-- X Pixel Code -->
  <script>
    (function () {
      var loaded = false;
      var productionHosts = ${JSON.stringify(productionHosts)};
      function allowed() {
        if (productionHosts.indexOf(location.hostname.toLowerCase()) === -1) return false;
        if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) return false;
        try { return localStorage.getItem("infinite_analytics_consent") === "granted"; } catch (_error) { return false; }
      }
      function load() {
        if (loaded || !allowed()) return;
        loaded = true;
        !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
        },s.version="1.1",s.queue=[],u=t.createElement(n),u.async=!0,u.src="https://static.ads-twitter.com/uwt.js",
        a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,"script");
        window.twq("config", ${JSON.stringify(pixelId)});
      }
      window.addEventListener("infinite:analytics-consent-change", function (event) {
        if (event.detail && event.detail.granted === true) load();
      });
      load();
    })();
  </script>`;
}

function metaPixelSnippet(pixelId, productionHosts) {
  if (!pixelId) return "";
  return `  <!-- Meta Pixel Code -->
  <script>
    (function () {
      var loaded = false;
      var productionHosts = ${JSON.stringify(productionHosts)};
      function allowed() {
        if (productionHosts.indexOf(location.hostname.toLowerCase()) === -1) return false;
        if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) return false;
        try { return localStorage.getItem("infinite_analytics_consent") === "granted"; } catch (_error) { return false; }
      }
      function load() {
        if (loaded || !allowed()) return;
        loaded = true;
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,"script",
        "https://connect.facebook.net/en_US/fbevents.js");
        window.fbq("init", ${JSON.stringify(pixelId)});
        window.fbq("track", "PageView");
      }
      window.addEventListener("infinite:analytics-consent-change", function (event) {
        if (event.detail && event.detail.granted === true) load();
      });
      load();
    })();
  </script>`;
}
