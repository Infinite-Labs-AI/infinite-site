# Old site to new site — analytics port

Every analytics behaviour the live site has, what the new site must do to match it, and the
handful of things the new pages need that the old site never had.

Compiled from the served `infinite.fast` bytes, `middleware.js`, `vercel.json`,
`.github/scripts/inject-analytics.cjs`, `scripts/verify-live-analytics.mjs` and
`scripts/audit-live-tag-runtime.mjs`, then corrected by three independent adversarial reviews.

> **Two things are dead rather than unmeasured.** The prototype has zero analytics — no posthog,
> gtag, data-analytics or consent in any of its four files. And the live CSP blocks the Cal booking
> embed outright, so the booking column works on localhost and nowhere else.
>
> Everything marked **BLOCKER** is in that category: not a metrics gap, something that does not function.

**Fetch before you grep.** The analytics work is merged and on `origin/main` — it is not on some
side branch. What misleads is a stale *local* `main`: at the time of writing it sat at `e8e0117`
(2026-08-27), **47 commits behind** `origin/main` (`100ee81`, 2026-09-06), and grepping it finds
none of the current analytics and makes this document look wrong. `git fetch` first, then read
`origin/main`. Anchor on the served bytes either way.

---

## Part one — parity

Read each row as: this is what the old site does, so this is what the new site has to do.

### Getting the tags into the page

- [ ] **Run the new pages through the same injector. Do not hand-write the tags.** — BLOCKER
  - *Old:* a build step writes roughly eight snippets into every built HTML file before the closing head tag.
  - The highest-leverage item here. "Four lanes" undersells what ships: the consent-gate wrapper, the
    GA4 download bridge, the privacy prompt, the landing-attribution capture and the get-started CTA
    bridge are all separate snippets. Port the whole set.
  - **And do not call the injector on its own.** It reads PostHog's and GA4's configuration straight
    out of the environment with no fallback — the defaults live one level up as `||=` assignments in
    the wrapper. Call it directly without setting those four and PostHog and GA4 ship **dark** while
    everything else passes. The wrapper is also hardcoded to the current site's sources, so wiring the
    new pages into it is a real build step, not a copy.

  ```
  .github/scripts/inject-analytics.cjs   reads process.env, returns empty if unset
  scripts/prepare-static-deploy.cjs      holds the defaults:
    GOOGLE_ANALYTICS_TAG_ID ||= "G-JE3BZS61FZ"
    POSTHOG_API_HOST        ||= "/ingest"
    POSTHOG_UI_HOST         ||= "https://eu.posthog.com"
    POSTHOG_PROJECT_TOKEN   ||= …
  ```

- [ ] **Keep the snippet order. The gate must be defined before the first gated snippet.**
  - *Old:* snippets are emitted in a fixed order, and a test pins it.
  - The GA4 download bridge is a bubble-phase listener that calls `preventDefault` on the same click,
    so anything you add on bubble after it never runs — bind on capture if you need to see that click.
    The retired Wave-2 handoff used to be the example; the ordering rule outlived it.

- [x] **Pin `infinite-tag@0.9.1`. Not 0.6.0.** — already correct on `origin/main` and on this branch
  - *Old:* the runtime comes from a pinned npm package with recorded tarball and schema hashes, never copied inline.
  - The 0.6.0 → 0.9.x jump moved the browser-collect schema hash (`3040f263` → `91ad5d30`) and changed
    the runtime's behaviour: 0.9.x autocaptures unmarked buttons as ledger `site_click` and emits
    `sign_up_click` on get-started-intent navigation. A 0.6.0 port is non-parity on both counts.
    Current ingest expects the 0.9.x schema, with campaign fields and an automation marker; whether an
    older payload is hard-rejected was not established, but the events differ either way.
  - Source of truth is `test-inject-analytics.mjs`. The ledger contract doc is frozen at older hashes
    and will mislead you — as does any `node_modules` in a checkout where `npm ci` has not been run
    recently. Read the pin in `package.json`, not the installed version.

### Delivery and routing

- [ ] **Carry the rewrites with their wildcards intact.** — BLOCKER
  - *Old:* PostHog is proxied first-party through `/ingest`, and the ledger posts to `/infinite/*`.
  - The `(.*)` is load-bearing — a bare `:path` matches one segment while PostHog fetches multi-segment
    paths, so those requests 404 against your own origin with no error anywhere.
  - Re-derive from production, not an old checkout: `/infinite/handoff` has been retired and three
    `/infinite/auth/*` routes added. Eight analytics rewrites plus two unrelated ones.

  ```
  /ingest/static/:path(.*)  → https://eu-assets.i.posthog.com/static/:path
  /ingest/array/:path(.*)   → https://eu-assets.i.posthog.com/array/:path
  /ingest/:path(.*)         → https://eu.i.posthog.com/:path
  /infinite/ledger          → api.ultima.inc/api/analytics/events/collect
  /infinite/events/collect  → api.ultima.inc/api/analytics/events/collect
  + /infinite/auth/otp, /infinite/auth/site/verify, /infinite/auth/handoff/claim
  ```

- [x] **`productionHosts` already covers this host.** — same project, `INFINITE_PRODUCTION_HOSTS=infinite.fast`, and `/audit/` ships on infinite.fast
  - *Old:* the first-party runtime only emits on a host in its allowlist.
  - The nastiest failure here. On an unlisted host the runtime returns early while `collectPath`,
    `consent.mode` and `siteSourceKey` all still appear in the bytes and pass their assertions. Dead
    lane, clean verifier. The same gate also suppresses the consent prompt.

- [ ] **Apex host only. Canonical and og:url must both resolve there.**
  - *Old:* serves from the apex; the build rewrites www to apex across every HTML, XML and text file.

- [ ] **Keep the middleware matcher exclusions.**
  - *Old:* edge middleware skips the proxy paths so the rewrites are never intercepted.
  - `matcher: ["/((?!api/|assets/|fonts/|logos/|ingest/|infinite/).*)"]`

- [ ] **Set all four environment variables.**
  - *Old:* four env vars, one of which is a hard build failure when it disagrees.

  ```
  INFINITE_PRODUCTION_HOSTS
  INFINITE_ATTEMPT_FINGERPRINT_KEY  ← unset fails OPEN: the 307 still serves, the attempt is uncounted
  INFINITE_SITE_SOURCE_ARTIFACT     ← build throws if its hosts disagree
  INFINITE_SITE_SOURCE_KEY
  ```

- [x] **CSP reporting already ships.** — `api/csp-report.js` is in the repo; the directives and header are already on the shared CSP
  - *Old:* the CSP names a reporting endpoint, and a serverless function receives and sanitises the reports.
  - This is how a blocked resource becomes visible at all — there is no console on the static deploy,
    so a CSP failure is otherwise silent. It matters more than usual because the new pages introduce
    the first third-party embed the site has ever had. Note the two directives share a single OR'd
    assertion and the JSON header is not asserted, so the verifier passing does not prove all three landed.

  ```
  report-uri /api/csp-report
  report-to csp-endpoint
  Reporting-Endpoints: csp-endpoint="…"
  POST /api/csp-report → 204
  ```

- [x] **The Log Drain already exists.** — same Vercel project; the drain has been active in production since 2026-08-02, host binding infinite.fast
  - *Old:* the whole server lane is three `console.log` calls — two markers and a fail-open diagnostic —
    turned into rows by a Drain.
  - A new project has none, so both edge markers write to logs nobody reads. The runbook holds the
    frozen config: sources edge and redirect, production only, empty sampling, plus the drain secret
    and host allowlist.

### Page registration and the server markers

- [x] **Register each new page in the shared route manifest. That single entry is the whole registration.** — audit page done
  - *Old:* every public page is one entry — path, source file, owner, title, sitemap fields — imported
    by middleware, both verifiers and five tests.
  - `PUBLIC_ROUTES` is a rich object array — `id`, `path`, `source`, `owner`, `title`, `llmsSummary`,
    `lastmod`, `changefreq`, `priority` — and everything else is derived from it:

    ```js
    export const KNOWN_DOCUMENT_PATHS = Object.freeze(
      PUBLIC_ROUTES.filter((r) => r.documentLog).map((r) => r.path));
    export const SITEMAP_ROUTES = Object.freeze(
      PUBLIC_ROUTES.filter((r) => r.indexable && r.sitemap));
    ```

  - So it is one entry, but **the flags decide what consumes it.** A route registered without
    `documentLog` is a real route that middleware never counts. There is also an assertion that every
    known document path is a public route, which throws if the two drift.
  - Existing entries point `source` at `_agent_artifacts/…` paths — exactly where the prototype lives,
    so the new pages register the way the home page already does.
  - `scripts/lib/public-site-manifest.mjs`

- [x] **Give every route a trailing-slash `path`. The source filename does not matter.** — done for `/audit/`
  - *Old:* every page is a directory index, so its path canonicalises with a trailing slash.
  - Path normalisation returns anything containing a dot unchanged, so a path like `/audit.html`
    never gains its slash and can never match the manifest — it emits no document marker at all.
  - **Corrected:** this constrains the route's `path`, not the source file. The build maps
    `source` → dist path (the home route's source is a flat `index-scheme-wrangle.html` and is written
    to `dist/index.html`), so `solar.html` and `audit.html` can stay as they are. Declare
    `path: "/audit/"` and let the build place it.
  - Still true: the in-page links `'audit.html'` and `'solar.html'` must become root-relative, because
    the built pages sit at a different depth than the sources.
  - `return last.includes(".") ? path : path + "/";`

- [ ] **Expect both edge markers. The document marker is what records pageviews.**

  ```
  INFINITE_DOCUMENT_REQUEST_V1   every counted navigation
  INFINITE_DOWNLOAD_ATTEMPT_V1   /download only
  ```

- [ ] **Do not add a host-config redirect for `/download`.**
  - *Old:* middleware owns the path and serves the 307 itself.
  - A host-level redirect executes before edge middleware, so the marker never fires. That entry was
    removed deliberately after being found in production.

### The tags themselves

- [ ] **One PostHog init, same token, same options.**

  ```js
  posthog.init("phc_wUuv4hpsa4jfi6fNSzWU9t3JSKneFHusRunsYenhjndJ", {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
  })
  posthog.register({ platform: "website" })
  ```

- [ ] **Carry both replay exclusion lists — and add the audit page.**
  - *Old:* replay off on the leaderboard for performance; replay and autocapture both off on
    get-started because it renders a verified email.

  ```
  NO_REPLAY_PATHS  = ["/startup-launch-videos"]
  SENSITIVE_PATHS  = ["/get-started"]
  ```

- [ ] **Same GA4 measurement ID, same direct loader.**
  - *Old:* GA4 loads directly with its automatic page view intact. No tag manager, no transport_url.

  ```js
  gtag("config", "G-JE3BZS61FZ")
  googletagmanager.com/gtag/js?id=G-JE3BZS61FZ
  // never ship: send_page_view: false, /gtm, transport_url
  ```

- [ ] **Keep the gtag guard on the download bridge.** — BLOCKER
  - *Old:* the bridge sits outside the consent gate and self-guards on gtag existing.
  - A functional bug without it, not a metrics gap: the handler intercepts the navigation, so a visitor
    who sent a GPC signal and never consented gets a Download button that does nothing at all.
  - `if (typeof window.gtag === "function") { … }`

- [ ] **Do not add an explicit PostHog capture for downloads — autocapture already has it.**

  ```
  ledger    app_download_click     package click listener
  PostHog   (autocapture)          no explicit capture call
  GA4       app_download_clicked   explicit bridge

  get_started_clicked  → explicitly sent to PostHog and GA4
  ```

- [ ] **Carry the ledger config verbatim. Wrapping this lane in the consent gate is a hard fail.**
  - *Old:* the ledger runs first-party — not consent-gated, but still suppressed by DNT or GPC through its own config.

  ```
  "collectPath":"/infinite/ledger"
  "consent":{"mode":"not_required"}
  "respectDnt":true
  ```

- [ ] **Know the ledger's ten-second gesture window exists before debugging a split.**
  - A programmatically dispatched consent grant starts PostHog and GA4 while leaving the ledger's
    stored decision untouched.

- [ ] **Leave the retired surfaces dead.**
  - `/tracking` · `/tracking/events` · `/sdk` · `/sdk/infinite.js` — must answer 404 or 405.

### Consent

- [ ] **Port the shared gate and keep the same lanes inside it.**
  - The verifier only checks the name appears somewhere in the bytes — it never checks the lanes are
    actually inside it. This one is on you.
  - `window.__infiniteConsentGate(function () { /* lane */ });`

- [ ] **Same precedence, same key.**
  - *Old:* a stored denial blocks outright; a stored grant overrides a browser privacy signal; DNT or
    GPC otherwise suppresses.

  ```js
  localStorage["infinite_analytics_consent"]   // "denied" | "granted"
  navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true
  ```

- [ ] **Port the later-grant listener and the revocation hook.** The hook's absence is a hard fail.
  - `addEventListener("infinite:analytics-consent-change", …)` · `infinitePrivacyChoices`

- [ ] **Port landing attribution verbatim, including the presence-only click-ID handling.**

  ```js
  sessionStorage["infinite_landing_attribution_v1"] = {
    utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    has_gclid, has_fbclid, has_msclkid, has_ttclid, landing_path
  }
  ```

### CTA tagging

- [x] **CTAs tagged.** — 9 across the two pages: download-mac/hero+final-cta, audit-request/navigation+hero+pricing, view-pricing/final-cta, audit-submit/audit
  - *Old:* 37 CTA ids across 10 location tokens, site-wide. The homepage alone uses 31 and 8 — do not
    take those as the site totals.
  - Inventing a synonym for a surface that already has a token quietly splits a funnel in two.

  ```
  hero · navigation · pricing · pricing-matrix · get-started
  homepage-capabilities · homepage-install · final-cta
  site-footer · agents-directory
  ```

- [ ] **Mark every `/download` anchor, including template-rendered ones.**
  - CI walks both HTML and JS to enforce it.
  - `data-download-location` (or `data-analytics-cta-location`)

- [ ] **Expect 0.9.x autocapture on the new pages.**
  - It captures unmarked buttons as `site_click` and emits `sign_up_click` regardless of your tags.
    Leaving a CTA untagged does not lose the click — it files it under a generated name nobody will
    recognise later. Tagging is about legibility, not capture.
  - **Unresolved — check on first install.** `sign_up_click` now has two documented triggers: the
    runtime's own get-started-intent navigation, and the `data-conversion="signup"` form below. Confirm
    they do not both fire on one audit-form submit, or that conversion is double-counted. Neither can be
    checked from the repo — the behaviour lives in the npm runtime, and the locally installed copy is
    **0.3.5**, which contains no `sign_up_click` at all. Three versions are in play: 0.3.5 installed,
    0.6.0 in the docs, 0.9.1 in production. Verify against 0.9.1 once it is installed.

- [x] **The lead now lands in `landing_leads`.** — done
  - The homepage form POSTs to `/infinite/leads` (new Vercel rewrite → `api.ultima.inc/api/leads`),
    which inserts into `landing_leads` under `source: "leadgen-audit"` — a value already whitelisted in
    the table's CHECK constraint (migration 191). No new table, no new endpoint. Fire-and-forget with
    keepalive so booking is never blocked; local submits 404/501 against the missing proxy and are
    dropped, so testing never writes to production. One seam: `/api/leads` requires a non-empty
    `fullName` and the form collects only site + email, so the site is sent as the name — real data,
    never a fabricated person. Add a name field if a cleaner value is wanted.
- [x] **Audit form marked `data-conversion="signup"`.** — emits sign_up_click; email field now type=email required
  - A CTA id on the button buys nothing on a submit — the runtime's listener keys off the attribute on
    the form itself.
  - `<form data-conversion="signup">` → `sign_up_click`

---

## Part two — the new bits

Things the new pages need that the old site has no equivalent for.

> **The audit page renders the visitor's email.** That is exactly the condition `SENSITIVE_PATHS`
> exists for — the old site put get-started in that list because it "renders a verified email", and
> one of the forward-fixes after the gate revert was specifically about keeping identity out of
> analytics events. Easy to miss, because the page looks like an ordinary marketing page.

### The audit page

- [x] **Audit page added to `SENSITIVE_PATHS`.** — `["/get-started", "/audit"]`, verified in the built output
  - It holds the visitor's email in `sessionStorage` and prefills it into the booking widget. With
    replay and autocapture on, that is a PII leak into analytics.

- [x] **Keep the email out of URLs and attributes.** — done
  - Session replay does not mask attribute values and autocapture reads an href on click. The fallback
    booking link is now bare; the prefilled URL is opened at click time and the href is never rewritten.
    Verified: the email appears nowhere in the rendered DOM.
  - **This does not replace the item above.** Keeping PII out of the markup narrows the exposure; only
    turning replay and autocapture off reliably stops capture.

- [x] **The audit page is a lead form, not a gate.** — settled
  - Website + email are taken on the homepage form; the audit page shows the scan and the calendar,
    prefilled, and tells them the audit lands tomorrow. There is no unlock and no re-entry — the
    client-side "gate" was removed. It does NOT reuse the get-started claim vocabulary because there is
    no claim: it is a marketing lead capture, so it uses its own `audit` location token.
  - The real work it still needs is a place to store the lead — see the next item.

- [x] **Email field fixed.** — type=email, required, and the handler validates before firing
  - It is `type="text"` under `novalidate`, so a truthy-but-malformed value passes the gate straight
    into the Cal prefill.

### Cal.com booking

- [x] **Add cal.com to two CSP directives — script-src and frame-src.** — done
  - *Old:* the CSP lists no booking vendor, because nothing on the old site books anything.
  - Not three. The widget's own fetches run inside cal.com's iframe under cal.com's policy, so
    `connect-src` does not need it. Until this lands, the embed script is blocked, no iframe mounts and
    every visitor falls through to the direct link — which is itself CSP-safe, being a top-level navigation.

  ```
  script-src  … https://app.cal.com                          ← added
  frame-src   … https://cal.com https://app.cal.com          ← added
  connect-src … unchanged, and the pixel hosts left in place
  ```
  - Applied to `vercel.json` on `brand-website-refresh`. Verified `connect-src` untouched, the four
    pixel hosts still present, and no other key in the file changed.

- [x] **Fail to the direct link immediately, not after a timeout.** — done
  - The loader listens for the script's own error event, so a CSP block shows the fallback at once
    instead of leaving a blank 520px panel for six seconds. The watchdog remains for the slower failure
    where the script loads but no iframe ever mounts.

- [ ] **Route the booking click through the existing outbound classifier.**
  - It already maps cal.com and calendly.com hosts, subdomains included. A second classifier guarantees drift.
  - `external_booking` · `external_link` · `external_checkout`

- [ ] **Wire the existing Cal webhook rather than building one.**
  - **This already exists in 1bu-1** — see the section below. The server-side booking signal is built,
    signed and buffered; what is missing is the last hop to the ad platforms.

- [ ] **Wire the booked call + audit lead to Meta CAPI.** — 1bu-1 SERVER work, needs the fleet
  - River's call: track ad conversions, wire Meta CAPI. The relay ALREADY EXISTS —
    `src/lib/analytics/meta-capi-relay.ts` (PR #3059), fired from `/api/analytics/events/server`,
    opt-in per source, only when a pixel is on file. It maps `signup→CompleteRegistration`,
    `lead→Lead`, `purchase→Purchase`.
  - What's missing, all server-side in 1bu-1: (a) NO `booking`/`meeting_booked → Schedule` mapping in
    the alias table; (b) the Cal webhook (`/api/webhooks/cal`, BOOKING_CREATED) does not emit an
    outcome event into the server-ingest pipe; (c) the audit lead (`/api/leads` → landing_leads) does
    not emit a `lead` outcome. Dedup on `booking_uid`.
  - **The analytics-architecture skill is explicit: a booked call is server-truth (the webhook), never
    a browser event** — "a browser event is never webhook authority", and the pixel's event enum is
    locked with no `track()`. So this cannot be fired from the marketing page; it belongs entirely in
    the 1bu-1 app, anchored on the Cal webhook.
  - **Blocked from here:** this local 1bu-1 checkout is BEHIND the relay merge (the file does not exist
    in it), and this surface is under an active review-gated fleet. It must be done on current
    origin/main through the proper branch and review — not edited from a stale checkout. Scoped and
    handed off, not implemented here.

- [ ] **Rename the Cal event from Ultima to Infinite.**
  - Dashboard work, not code. The event title changes no URL; the slug does, and then `CAL_LINK` is one
    line. Renaming the username would break the production welcome page, which hardcodes the onboarding
    event — hold that unless someone updates it in the same pass.

### Shipping the prototype's own assets

- [x] **Copy every cross-directory asset into the bundle and rewrite the paths.** — done
  - 11 files consolidated into `fonts/` and `assets/`: four faces, the hero screenshot, both avatars,
    `trail.css`/`trail.js`, and the two ad creatives `trail.js` pulls in on its own. 18 references
    rewritten across `solar.html`, `audit.html` and `trail.js`. Verified: zero `../` references remain
    in the shipping files, and every asset the page requests returns 200.
  - Ivory, Fraunces and Bricolage were dropped rather than copied — they became unreachable when the
    typeface picker was removed and `<body>` was pinned to Space Grotesk. Three fewer font files to ship.

- [ ] **Name the ad pixels and their env vars, and do not prune their CSP entries.**
  - Meta and X are real injector lanes, currently dark by design — no default, env unset, zero `fbq`/`twq`
    in the served bytes, not in the verifier contract. Omitting them does not break parity. But the
    injector auto-lights a pixel on any project that sets the id, so a CSP pruned on a four-lane reading
    would then block it silently.

  ```
  INFINITE_META_PIXEL_ID   X_PIXEL_ID
  keep: static.ads-twitter.com · analytics.twitter.com
        connect.facebook.net · www.facebook.com
  ```

---

## The Cal.com webhook already exists

Worth knowing before anyone builds a second one. Two routes in `1bu-1`, plus schema.

| Piece | Location | What it does |
| --- | --- | --- |
| Receiver | `src/app/api/webhooks/cal/route.ts` (250 lines) | Receives `BOOKING_CREATED`, verifies HMAC-SHA256 over the raw body against `x-cal-signature-256` with a length check and timing-safe compare, extracts attendee data, enriches the matching `schedule` record |
| Connection config | `src/app/api/workspace/cal-webhook/route.ts` (106 lines) | Reads, upserts and deletes rows in `cal_connections` — per-workspace webhook config |
| Schema | migration `158_cal_webhook_integration.sql` | `cal_connections` (one row per workspace, carries `cal_link`) and `cal_pending_bookings`, a race buffer for webhooks arriving before their local record |
| Constraint | migration `169_low_severity_rls_hardening.sql` | Unique index on `cal_pending_bookings (workspace_id, booking_uid)` |
| Workspace field | migration `142_workspace_cal_link.sql` | `workspaces.cal_com_link`, used by the cal-embed section to auto-fill `calLink` |

Trigger events referenced across the codebase: `BOOKING_CREATED`, `BOOKING_REQUEST`,
`MEETING_BOOKED`, `MEETING_COMPLETED`.

**What is missing is the forward to the ad platforms** — neither route contains `fbc`, `fbp`,
`CompleteRegistration`, CAPI or a conversions endpoint. A booking already produces a signed,
deduplicated, server-side event; it stops at the database.

But do not build that forward as a copy of the get-started one. Four differences make it a
**browser-and-server pair, not a one-line server hop**:

- **Different conversion.** A booked call is not a registration — pick the right Meta and Google event
  (Schedule or Lead), not `CompleteRegistration`.
- **Same hashing.** The get-started forward matches on `sha256(email)`. The Cal receiver extracts
  attendee data, so hash the attendee email identically or enhanced matching will not line up.
- **Dedup across two legs.** The browser fires `bookingSuccessfulV2` and the webhook fires
  `BOOKING_CREATED`. If both forward, you double-count unless they share an id — `booking_uid` is the
  natural shared key, which is the `eventID=claimId` discipline applied to bookings.
- **Click IDs only exist in the browser.** `_fbc` and `_fbp` are cookies; the webhook cannot supply
  them. The browser leg has to carry the click IDs, so the server leg alone is not sufficient.

---

## Part three — proving it

- [ ] **Run the runtime audit** — the only live guard that the tag is not forked or version-drifted.
  - It re-renders the runtime from the pinned package and demands the served bytes be byte-identical,
    then checks one init, one config and both loaders per route.
  - `npm ci && SITE_BASE_URL=<host> node scripts/audit-live-tag-runtime.mjs`

- [ ] **Run the contract verifier** — consent, CSP, routing, ledger, download marker, receipts.
  - 23 byte assertions run per page across the manifest, plus roughly a dozen route, header and receipt
    checks outside them. A clean run prints PASS and SKIP lines keyed by page and route.
  - `SITE_BASE_URL=<host> node scripts/verify-live-analytics.mjs`

- [ ] **Build for the host you verify, and do not use the packaged harness CLI to prove coverage.**
  - The verifier compares canonical and og:url against its own base URL while the build hardcodes apex
    URLs, so pointing it at a preview fails on every page before reaching a real finding — and the
    ledger is inert there anyway, the host not being in `productionHosts`.
  - Prior art on this same chain documents the published `infinite-tag harness` CLI false-greening on
    this site: exiting 0 while missing the modern runtime and mislabelling Meta.

---

## Testing the events without poisoning production

The four lanes route to four different destinations, so **no single mechanism isolates all of them.**
The guardrail's synthetic-key approach is right for two and a category error for the other two.

| Lane | Destination | Isolation |
| --- | --- | --- |
| Infinite ledger | synthetic source, if keyed that way | Synthetic source key — works |
| Edge markers | Drain | Probe headers + bot UA — works, with a caveat |
| PostHog | the **real** project, via the real token | Synthetic key does nothing — needs a test project |
| GA4 | the **real** property, via gtag | Synthetic key does nothing — needs a test property |

The guardrail's own mechanism works *for the guardrail* because its probe is a server-side fetch that
never executes page JS, so it never fires PostHog or GA4 at all. A browser-driven test is the exact
opposite: the page's own JS runs, and both land in the real project and property. The synthetic key
gives zero protection there — and downstream filtering does not help, because the events have already
arrived.

**Ledger and edge markers** — reuse the documented path: `REQUIRE_SYNTHETIC_RECEIPTS=1`, the dedicated
synthetic source key, the synthetic Drain URL, and the authenticated diagnostic route that must return
an `environment=synthetic` receipt. The guardrail doc is explicit that the production browser source
key must never be reused for this. *Caveat:* a bot-shaped UA makes the Drain **drop** the marker, so
such a run proves the marker fired only if you read the raw log line — it does not prove a real visit
would be counted. Fine for a fires-or-not test; you cannot check counting in the same run.

**PostHog and GA4** — point the staged build at separate test destinations. No code change is needed:
the injector already reads both from the environment, which the unit-test fixtures (`G-TEST1234`,
`phc_test_project_token`) demonstrate. Provision a real test project and property and set them at
build time. GA4 DebugView plus an internal-traffic filter is an acceptable alternative for GA4 alone.

### Three things that specifically bite a browser test

1. **`productionHosts` makes a naive staging test fire nothing.** On a host outside the allowlist the
   first-party runtime returns early *and* the consent prompt is suppressed — and since PostHog and
   GA4 live inside the consent gate and never receive a grant, none of the three browser lanes fire.
   To exercise them you must add the staging host, which then makes the synthetic ledger key mandatory.
2. **Consent has to be granted.** PostHog and GA4 only start after a grant — a real click, or a
   dispatched `infinite:analytics-consent-change`.
3. **The ten-second gesture window will fool you.** A programmatic grant more than ten seconds after
   the last real pointer or key event is ignored by the ledger while still starting PostHog and GA4.
   The browser lanes fire, the ledger stays dark, and it reads exactly like a ledger bug. Drive the
   grant from a real synthesized input event, inside the window.

**Do not use one user agent for both jobs.** A bot-shaped UA is right for keeping the server marker out
of the counted aggregate and wrong for the browser lanes, which classify differently under it and are
not a real-visitor path either way.

None of this requires a flip — it all runs on staging.

---

## Traps

**The frozen contract doc will mislead you on versions.**
`first-party-ledger-contract.md` records hashes from an older pin and is not maintained as the source
of truth for the package version. `test-inject-analytics.mjs` is. The byte verifier will not catch a
wrong pin either, because it compares the served runtime against whatever you pinned locally — pin the
wrong version and both agree with each other while disagreeing with production.

**`VERCEL_ENV=production` is the unnamed master gate.** Vercel sets it automatically on production and
leaves it unset on preview, which darkens the ledger identity and the edge markers there regardless of
everything else on this list.
