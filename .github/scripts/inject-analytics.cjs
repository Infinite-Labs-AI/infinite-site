const fs = require("node:fs");
const path = require("node:path");

const distDir = "dist";

const snippets = [
  posthogSnippet({
    apiHost: process.env.POSTHOG_API_HOST,
    uiHost: process.env.POSTHOG_UI_HOST,
    projectToken: process.env.POSTHOG_PROJECT_TOKEN,
  }),
  googleAnalyticsSnippet(process.env.GOOGLE_ANALYTICS_TAG_ID),
  xPixelSnippet(process.env.X_PIXEL_ID),
  metaPixelSnippet(process.env.META_PIXEL_ID),
].filter(Boolean);

if (snippets.length === 0) {
  process.exit(0);
}

const headBlock = `${snippets.join("\n")}\n</head>`;
const pages = findHtmlFiles(distDir);

if (pages.length === 0) {
  throw new Error(`No HTML pages found under ${distDir}/`);
}

for (const page of pages) {
  const html = fs.readFileSync(page, "utf8");

  if (!html.includes("</head>")) {
    throw new Error(`Could not find </head> in ${page}`);
  }

  // Function replacer avoids `$`-pattern interpretation in the snippet block.
  fs.writeFileSync(page, html.replace("</head>", () => headBlock));
}

function findHtmlFiles(dir) {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
}

function posthogSnippet({ apiHost, uiHost, projectToken }) {
  if (!apiHost || !projectToken) {
    return "";
  }

  // The proxy only fronts ingestion, so ui_host stays the real PostHog host (toolbar + app links).
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
              (t[e] = function () {
                t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
              });
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
              u.toString = function (t) {
                var e = "posthog";
                return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e;
              },
              u.people.toString = function () {
                return u.toString(1) + ".people (stub)";
              },
              o =
                "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(
                  " ",
                ),
              n = 0;
            n < o.length;
            n++
          )
            g(u, o[n]);
          e._i.push([i, s, a]);
        }),
        (e.__SV = 1));
    })(document, window.posthog || []);
    posthog.init(${JSON.stringify(projectToken)}, {
      api_host: ${JSON.stringify(apiHost)},${uiHostLine}
      defaults: "2026-01-30",
    });
    posthog.register({ platform: "website" });
  </script>`;
}

function googleAnalyticsSnippet(tagId) {
  if (!tagId) {
    return "";
  }

  // First-party proxied (see vercel.json "/gtm" rewrites): the gtag.js loader is served through
  // /gtm/gtag/js (→ googletagmanager.com) and measurement hits are sent to /gtm/g/collect via
  // transport_url (→ google-analytics.com), so ad blockers can't strip the direct Google hosts.
  // NOTE: this is the LIGHTWEIGHT proxy — gtag.js hardcodes Google's hosts for some internal
  // sub-requests, so it recovers the core pageview/event measurement, not necessarily 100%.
  return `  <!-- Google tag (gtag.js) — first-party proxied -->
  <script async src="/gtm/gtag/js?id=${encodeURIComponent(tagId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", ${JSON.stringify(tagId)}, { transport_url: "/gtm" });
  </script>`;
}

function xPixelSnippet(pixelId) {
  if (!pixelId) {
    return "";
  }

  return `  <!-- X Pixel Code -->
  <script>
    !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
    },s.version="1.1",s.queue=[],u=t.createElement(n),u.async=!0,u.src="https://static.ads-twitter.com/uwt.js",
    a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,"script");
    twq("config", ${JSON.stringify(pixelId)});
  </script>`;
}

function metaPixelSnippet(pixelId) {
  if (!pixelId) {
    return "";
  }

  return `  <!-- Meta Pixel Code -->
  <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,"script",
    "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", ${JSON.stringify(pixelId)});
    fbq("track", "PageView");
  </script>`;
}
