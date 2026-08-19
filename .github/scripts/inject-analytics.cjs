const fs = require("node:fs");
const path = require("node:path");

void (async () => {
  const { renderInfiniteBrowserTag } = await import("infinite-tag");
  const distDir = "dist";
  const productionHosts = parseProductionHosts(process.env.INFINITE_PRODUCTION_HOSTS);
  const isProductionBuild = process.env.VERCEL_ENV === "production";
  const configuredSourceKey = nonEmpty(process.env.INFINITE_SITE_SOURCE_KEY);
  const configuredSourceArtifact = nonEmpty(process.env.INFINITE_SITE_SOURCE_ARTIFACT);
  const sourceArtifact = isProductionBuild
    ? parseSourceArtifact(configuredSourceArtifact)
    : undefined;
  const siteSourceKey = isProductionBuild ? configuredSourceKey : undefined;

  if (isProductionBuild && productionHosts.length === 0) {
    throw new Error("Production analytics require INFINITE_PRODUCTION_HOSTS from verified site-source bindings.");
  }
  if (isProductionBuild && !sameValues(productionHosts, sourceArtifact.productionHosts)) {
    throw new Error("Production analytics deployment productionHosts disagree with INFINITE_SITE_SOURCE_ARTIFACT.");
  }
  if (
    isProductionBuild
    && configuredSourceKey
    && configuredSourceKey !== sourceArtifact.siteSourceKey
  ) {
    throw new Error("Production analytics deployment siteSourceKey disagrees with INFINITE_SITE_SOURCE_ARTIFACT.");
  }
  if (!isProductionBuild && configuredSourceKey) {
    console.warn("Ignoring INFINITE_SITE_SOURCE_KEY outside a production build.");
  }
  if (!isProductionBuild && configuredSourceArtifact) {
    console.warn("Ignoring INFINITE_SITE_SOURCE_ARTIFACT outside a production build.");
  }

  const posthog = posthogSnippet({
    apiHost: process.env.POSTHOG_API_HOST,
    uiHost: process.env.POSTHOG_UI_HOST,
    projectToken: process.env.POSTHOG_PROJECT_TOKEN,
  });
  const ga4 = googleAnalyticsSnippet(process.env.GOOGLE_ANALYTICS_TAG_ID);
  const runtime = renderInfiniteBrowserTag({
    ...(siteSourceKey ? { siteSourceKey } : {}),
    collectPath: "/infinite/ledger",
    productionHosts,
    respectDnt: true,
    consent: { mode: "not_required" },
    mirrors: [],
  });
  const snippets = [
    consentGateSnippet(),
    posthog,
    ga4,
    ga4DownloadSnippet(process.env.GOOGLE_ANALYTICS_TAG_ID),
    xPixelSnippet(process.env.X_PIXEL_ID),
    metaPixelSnippet(process.env.META_PIXEL_ID),
    runtime,
    privacyConsentPromptSnippet(productionHosts),
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
  return normalizeProductionHosts(
    (value ?? "")
      .split(",")
      .filter(Boolean),
  );
}

function parseSourceArtifact(value) {
  if (!value) {
    throw new Error(
      "Production analytics require INFINITE_SITE_SOURCE_ARTIFACT from the authenticated site-source control plane.",
    );
  }
  let artifact;
  try {
    artifact = JSON.parse(value);
  } catch (error) {
    throw new Error(`INFINITE_SITE_SOURCE_ARTIFACT must be valid JSON: ${error.message}`);
  }
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
    throw new Error("INFINITE_SITE_SOURCE_ARTIFACT must contain one public source artifact object.");
  }
  if (!/^site_[A-Za-z0-9_-]+$/.test(artifact.siteSourceKey ?? "")) {
    throw new Error("INFINITE_SITE_SOURCE_ARTIFACT has an invalid siteSourceKey.");
  }
  if (!Array.isArray(artifact.productionHosts) || artifact.productionHosts.length === 0) {
    throw new Error("INFINITE_SITE_SOURCE_ARTIFACT requires non-empty productionHosts.");
  }
  // The provisioned artifact env may still carry the pre-rename path; both bind the same
  // server route. The rendered runtime always uses the NEW path.
  if (artifact.collectPath !== "/infinite/ledger" && artifact.collectPath !== "/infinite/events/collect") {
    throw new Error("INFINITE_SITE_SOURCE_ARTIFACT collectPath must be /infinite/ledger.");
  }
  if (artifact.staticProxy !== "vercel") {
    throw new Error("INFINITE_SITE_SOURCE_ARTIFACT staticProxy must be vercel.");
  }
  return {
    siteSourceKey: artifact.siteSourceKey,
    productionHosts: normalizeProductionHosts(artifact.productionHosts),
  };
}

function normalizeProductionHosts(values) {
  const hosts = values.map((value) => {
    if (typeof value !== "string") {
      throw new Error("Analytics production hosts must be strings.");
    }
    const host = value.trim().toLowerCase().replace(/\.$/, "");
    const labels = host.split(".");
    if (
      host.length > 253
      || labels.some(
        (label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
      )
    ) {
      throw new Error(`Invalid analytics production host: ${value}`);
    }
    return host;
  });
  return [...new Set(hosts)].sort();
}

function sameValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
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

// One shared consent gate for the third-party lanes (GA4, PostHog, X, Meta). It applies the
// SAME state machine as the Infinite runtime (infinite-tag >= 0.3.4 semantics):
// - explicit stored denial → never start (an explicit decision governs in both directions);
// - a global privacy signal (DNT/GPC) without a stored grant → wait; a live
//   "infinite:analytics-consent-change" grant (the consent prompt / manage control) starts
//   the lane right then — late init is fine, gtag config / posthog.init fire their own
//   page view on start;
// - everyone else (the normal visitor) → start immediately, exactly as before.
// Emitted BEFORE every gated snippet; each gated snippet stays otherwise self-contained.
function consentGateSnippet() {
  return `  <script>
    (function () {
      window.__infiniteConsentGate = function (start) {
        var started = false;
        function run() {
          if (started) return;
          started = true;
          try { start(); } catch (_startError) {}
        }
        try {
          window.addEventListener("infinite:analytics-consent-change", function (event) {
            if (event && event.detail && event.detail.granted === true) run();
          });
          var stored = null;
          try { stored = localStorage.getItem("infinite_analytics_consent"); } catch (_storageError) {}
          if (stored === "denied") return;
          var signal = navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;
          if (!signal || stored === "granted") run();
        } catch (_error) {}
      };
    })();
  </script>`;
}

function posthogSnippet({ apiHost, uiHost, projectToken }) {
  if (!apiHost || !projectToken) return "";
  const uiHostLine = uiHost ? `\n      ui_host: ${JSON.stringify(uiHost)},` : "";
  return `  <script>
    window.__infiniteConsentGate(function () {
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
      // Session replay and heatmaps are OFF on this site, deliberately.
      //
      // The project has them enabled server-side (sampleRate null = 100% of sessions, empty URL
      // blocklist), so every visitor was loading rrweb, taking a full DOM snapshot of a ~1,900-node
      // page, and running a document-wide MutationObserver. Heatmaps adds a capture-phase
      // mousemove listener on the document, and the scroll manager adds capture-phase scroll and
      // scrollend listeners. That is two document-level mousemove listeners and two scroll
      // listeners nobody here wrote, on a page whose main interaction is scrolling a long table and
      // hovering its rows — which is exactly the reported symptom.
      //
      // It costs most on the leaderboard, where sorting or paging swaps ~1,800 elements at once and
      // rrweb has to serialise every removal and addition as a mutation batch.
      //
      // This is a MARKETING site: GA4 owns traffic here and PostHog owns in-app product analytics,
      // so nothing downstream depends on replay of these pages. Turning these three off does not
      // affect pageviews, events or funnels.
      disable_session_recording: true,
      capture_heatmaps: false,
      capture_performance: false,
    });
    posthog.register({ platform: "website" });
    });
  </script>`;
}

function googleAnalyticsSnippet(tagId) {
  if (!tagId) return "";
  // The gtag.js loader is injected inside the gate so a non-consented signal visitor's
  // browser never even contacts googletagmanager.com.
  return `  <!-- Google tag (gtag.js) -->
  <script>
    window.__infiniteConsentGate(function () {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", ${JSON.stringify(tagId)});
      var loader = document.createElement("script");
      loader.async = true;
      loader.src = "https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}";
      document.head.appendChild(loader);
    });
  </script>`;
}

// Shown ONLY to visitors whose browser sends a global privacy signal (GPC or DNT) and who
// have not yet made a site-specific choice. Everyone else never sees it: without a signal the
// Infinite runtime collects by default (consent mode not_required), and per the GPC spec an
// explicit site-specific decision takes precedence over the global signal — the runtime
// (infinite-tag >= 0.3.4) records the decision when we dispatch the consent-change event.
// Founder-specified design (2026-08-04, rev 2): a native.no-style banner — bottom-centered
// card, "We value your privacy" cookie copy with policy links, primary "Accept All" +
// secondary "Manage". Manage swaps to a first-party-analytics toggle with "Save choices";
// the toggle defaults OFF because the visitor's privacy signal is their standing default,
// so "Accept All" is the explicit override and saving with the toggle off records a denial.
// Host-gated to the build's verified production hosts: on preview deploys / unlisted aliases
// the runtime is inert (a decision would store nothing), so the banner must not render there.
// Also exposes window.infinitePrivacyChoices() — the privacy-policy page's "Manage analytics
// preferences" control — which re-renders the banner ignoring any stored decision and without
// requiring a privacy signal, so a stored choice can always be revoked or changed.
function privacyConsentPromptSnippet(productionHosts) {
  return `  <script>
    (function () {
      try {
        var hosts = ${JSON.stringify(productionHosts)};
        if (hosts.indexOf(location.hostname.toLowerCase().replace(/\\.$/, "")) === -1) return;
        function textEl(tag, css, text) {
          var el = document.createElement(tag);
          if (css) el.style.cssText = css;
          if (text) el.appendChild(document.createTextNode(text));
          return el;
        }
        function policyLink(href, text) {
          var link = document.createElement("a");
          link.href = href;
          link.style.cssText = "color:#f5f6f8;text-decoration:underline;";
          link.appendChild(document.createTextNode(text));
          return link;
        }
        function decide(granted) {
          window.dispatchEvent(new CustomEvent("infinite:analytics-consent-change", { detail: { granted: granted } }));
          var banner = document.getElementById("infinite-privacy-prompt");
          if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
        }
        var BTN_PRIMARY = "padding:12px 24px;border:0;border-radius:10px;background:#f5f6f8;color:#111318;font:inherit;font-size:15px;font-weight:600;cursor:pointer;white-space:nowrap;";
        var BTN_SECONDARY = "padding:12px 24px;border:1px solid rgba(245,246,248,0.35);border-radius:10px;background:transparent;color:#f5f6f8;font:inherit;font-size:15px;cursor:pointer;white-space:nowrap;";
        function render() {
          if (document.getElementById("infinite-privacy-prompt")) return;
          var wrap = document.createElement("div");
          wrap.id = "infinite-privacy-prompt";
          wrap.style.cssText = "position:fixed;bottom:20px;left:0;right:0;z-index:2147483000;display:flex;justify-content:center;padding:0 16px;pointer-events:none;";
          var card = document.createElement("div");
          card.setAttribute("role", "dialog");
          card.setAttribute("aria-label", "Privacy choices");
          card.style.cssText = "pointer-events:auto;width:100%;max-width:640px;padding:24px 28px;border-radius:16px;background:#111318;color:#f5f6f8;font:14px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 16px 60px rgba(0,0,0,0.45);";

          var main = document.createElement("div");
          main.appendChild(textEl("h2", "margin:0 0 8px;font-size:17px;font-weight:700;", "We value your privacy"));
          var copy = textEl("p", "margin:0 0 16px;color:rgba(245,246,248,0.8);");
          copy.appendChild(document.createTextNode('We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. By clicking "Accept All", you consent to our use of cookies. Learn more in our '));
          copy.appendChild(policyLink("/privacy/", "Privacy Policy"));
          copy.appendChild(document.createTextNode(" and "));
          copy.appendChild(policyLink("/privacy/", "Cookie Policy"));
          copy.appendChild(document.createTextNode("."));
          main.appendChild(copy);
          var mainButtons = document.createElement("div");
          mainButtons.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;";
          var accept = textEl("button", BTN_PRIMARY + "flex:1;", "Accept All");
          accept.addEventListener("click", function () { decide(true); });
          var manage = textEl("button", BTN_SECONDARY + "flex:1;", "Manage");
          mainButtons.appendChild(accept);
          mainButtons.appendChild(manage);
          main.appendChild(mainButtons);

          var manageView = document.createElement("div");
          manageView.style.display = "none";
          manageView.appendChild(textEl("h2", "margin:0 0 8px;font-size:17px;font-weight:700;", "Manage preferences"));
          var rowLabel = document.createElement("label");
          rowLabel.style.cssText = "display:flex;align-items:flex-start;gap:12px;margin:0 0 16px;padding:12px 14px;border:1px solid rgba(245,246,248,0.18);border-radius:10px;cursor:pointer;";
          var toggle = document.createElement("input");
          toggle.type = "checkbox";
          toggle.style.cssText = "margin-top:3px;width:16px;height:16px;accent-color:#f5f6f8;";
          var labelCopy = document.createElement("span");
          labelCopy.appendChild(textEl("strong", "display:block;font-weight:600;", "Analytics"));
          labelCopy.appendChild(textEl("span", "display:block;color:rgba(245,246,248,0.7);font-size:13px;", "First-party page views and download clicks, collected by this site only."));
          rowLabel.appendChild(toggle);
          rowLabel.appendChild(labelCopy);
          manageView.appendChild(rowLabel);
          var save = textEl("button", BTN_PRIMARY + "width:100%;", "Save choices");
          save.addEventListener("click", function () { decide(toggle.checked === true); });
          manageView.appendChild(save);

          manage.addEventListener("click", function () {
            main.style.display = "none";
            manageView.style.display = "block";
          });

          card.appendChild(main);
          card.appendChild(manageView);
          wrap.appendChild(card);
          document.body.appendChild(wrap);
        }
        function renderWhenReady() {
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", render);
          } else {
            render();
          }
        }
        window.infinitePrivacyChoices = renderWhenReady;
        var signal = navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;
        if (!signal) return;
        var stored = null;
        try { stored = localStorage.getItem("infinite_analytics_consent"); } catch (_e) {}
        if (stored === "granted" || stored === "denied") return;
        renderWhenReady();
      } catch (_error) {}
    })();
  </script>`;
}

function ga4DownloadSnippet(tagId) {
  if (!tagId) return "";
  return `  <script>
    document.addEventListener("click", function (event) {
      var target = event.target && typeof event.target.closest === "function" ? event.target : null;
      var anchor = target && target.closest("a[href]");
      if (!anchor || event.defaultPrevented) return;
      try {
        var destination = new URL(anchor.href, location.href);
        if (destination.origin !== location.origin || destination.pathname.replace(/\\/+$/, "") !== "/download") return;
        // GA4 is consent-gated: when it never initialized, window.gtag does not exist. Leave
        // the navigation completely untouched then — cancelling it before a gtag throw would
        // silently kill the Download button (the server redirect lane still counts the click).
        if (typeof window.gtag !== "function") return;
        var locationToken = anchor.getAttribute("data-analytics-cta-location") || anchor.getAttribute("data-download-location");
        var sameTab = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && anchor.getAttribute("target") !== "_blank";
        var followed = false;
        function follow() {
          if (followed) return;
          followed = true;
          location.assign(destination.href);
        }
        if (sameTab) event.preventDefault();
        window.gtag("event", "app_download_clicked", {
          send_to: ${JSON.stringify(tagId)},
          ...(locationToken && /^[A-Za-z0-9_-]{1,64}$/.test(locationToken) ? { cta_location: locationToken } : {}),
          destination_path: "/download",
          ...(sameTab ? { event_callback: follow, event_timeout: 1000 } : {}),
        });
        if (sameTab) setTimeout(follow, 1000);
      } catch (_error) {}
    });
  </script>`;
}

function xPixelSnippet(pixelId) {
  if (!pixelId) return "";
  return `  <!-- X Pixel Code -->
  <script>
    window.__infiniteConsentGate(function () {
    !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
    },s.version="1.1",s.queue=[],u=t.createElement(n),u.async=!0,u.src="https://static.ads-twitter.com/uwt.js",
    a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,"script");
    window.twq("config", ${JSON.stringify(pixelId)});
    });
  </script>`;
}

function metaPixelSnippet(pixelId) {
  if (!pixelId) return "";
  return `  <!-- Meta Pixel Code -->
  <script>
    window.__infiniteConsentGate(function () {
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
    });
  </script>`;
}
