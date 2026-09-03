# Infinite.fast first-party analytics contract

Status: implementation contract. Production activation remains gated by the privacy, source-provisioning, Drain, and synthetic-receipt approvals in the runbook.

## Reviewed inputs

- Site base: `origin/main` at `95af1293de230506f107ec526f53e132a81de87c`.
- Cloud/desktop analytics implementation: `ad10d6349c45224a6fcfdbe415b653321e399d90`.
- Public package: exactly `infinite-tag@0.3.1`, published from reviewed SHA `96937b5`.
- Registry dist-tag receipt: `latest=0.3.1`.
- Registry tarball SHA-256: `dbde47d58fd2db7ea52cc30325a54d833dcec2b7a39e3f20ac48d9a6ed4b91f6`.
- Browser schema SHA-256: `919130276f983c61de47a75e986386c8bc7be543d4fd6706a71f0bc5481f34c0`.
- Browser fixture SHA-256: `08d5ae19194044bf0f2d144c2bd50902baacb09f5170f66067d0e9fd9b9148a9`.

The build imports `renderInfiniteBrowserTag` from the pinned npm package. It does not copy or fork the runtime. The local injector test hashes the package's shipped schema and fixture on every clean install.

## Browser lane

Infinite owns the first-party browser events. Existing provider integrations stay independent:

| Logical event | Infinite ledger | PostHog mirror | GA4 mirror |
| --- | --- | --- | --- |
| Browser page view | `site_page_view` | automatic | automatic |
| Meaningful managed CTA | `site_click` | automatic where configured | not mirrored |
| Same-origin `/download` click | `app_download_click` | automatic where configured | explicit `app_download_clicked` |

GA4 retains its direct loader and automatic page view, which explains why page views worked without custom download tracking. The site explicitly sends `app_download_clicked` because the visible link is the extensionless same-origin `/download` route and cannot be reliably classified as a file by automatic enhanced measurement.

The public envelope may contain only the versioned contract fields: event id/name/time, random browser visitor and session ids, clean canonical URL, referrer host, source public key, and event-specific structural properties. It may not choose a workspace, authority, environment, ingest channel, or dispatch destination. It never includes query strings, link text, DOM text, or a private cloud tracking SDK surface.

Browser delivery is the same-origin path `/infinite/ledger`, rewritten by Vercel to `https://api.ultima.inc/api/analytics/events/collect`. The site does not expose `/tracking` or `/sdk`. No source key means only the Infinite destination is dormant; GA4 and PostHog continue independently.

`infinite-tag@0.3.1` maps each valid `data-download-location` marker through its package-owned click listener into the bounded `cta_location` property on `app_download_click`, alongside `destination_path: "/download"`. A small GA4 bridge applies the same bounded properties to one `app_download_clicked` event.

## Get-started sign-in handoff

The browser-to-desktop handoff is a **sign-in grant, not attribution**. It replaced the "Wave 2"
attribution snippet on 2026-09-03 - that snippet was live in production from 2026-08-19 but inert
until `infinite-tag@0.6.0` shipped the consent-qualified accessor it depended on. The injector
snippet, its site-side build flag, the guardrail's repo variable and the `/infinite/handoff` rewrite
were deleted; `.github/scripts/test-inject-analytics.mjs` and `scripts/verify-live-analytics.mjs`
now fail if those bytes ever reappear. The cloud attribution routes
(`/api/analytics/attribution/handoff/*`) are a 1bu-1 concern and were not changed by the site.

`/get-started` (a static page built like every other, spec:
`1bu-1/docs/superpowers/specs/2026-09-03-email-gated-download-design.md`) gates the installer behind
Google sign-in or an emailed 6-digit code. Google sign-in uses Supabase Auth with same-tab
`sessionStorage` for the PKCE redirect exchange; OAuth tokens may live there only for the few
seconds needed to mint the one-time claim, then the page signs out locally and purges every
Supabase auth key. The site never writes Google tokens to local storage.
It calls the cloud through same-origin rewrites, so no CORS exists:

```text
POST /infinite/auth/otp            -> https://api.ultima.inc/api/auth/otp             { email }                 -> { ok, challenge }
POST /infinite/auth/handoff/claim  -> https://api.ultima.inc/api/auth/handoff/claim   { email, token, challenge, anonymousId?, sessionId?, ctaLocation? } -> { claimId, secret, expiresAt, emailSent }
POST /infinite/auth/handoff/claim  -> https://api.ultima.inc/api/auth/handoff/claim   { accessToken, anonymousId?, sessionId?, ctaLocation? }              -> { claimId, secret, expiresAt, emailSent }
```

A claim is minted **only after Google verifies server-side or the code verifies** (the same challenge
HMAC and `profiles` ensure as `/api/auth/otp/verify`); a typed email alone never yields anything. The
Google route rejects `invalid_token` (401) and `google_provider_required` (400), then the page falls
back to the email-code path. The server stores only `sha256(secret)`, the verified email and profile
id, the CTA location, and the timestamps. The claim expires after 48 hours, redeems once, and is
deleted after 90 days. The page keeps
`{ claimId, secret, email, expiresAt }` in `sessionStorage` so a refresh keeps the **Open Infinite**
button (`infinite://handoff/v1?claim_id=...&secret=...`) working; the raw secret exists in that
browser, that URL and the confirmation email, and nowhere else.

`infinite-tag@0.6.0` defines `window.__infiniteHandoffContext()`. `anonymousId`/`sessionId`
ride the claim when that accessor returns a consent-qualified context; it returns null under
DNT/GPC without a site grant, a saved denial, blocked storage, an unverified host, or a dormant
site source. The page never reads `infinite_analytics_visitor` / `infinite_analytics_session`
directly, and absence or null means browser ids are omitted.

Downloads are unchanged facts: after verification the page runs `location.assign("/download")`, which
hits the server `/download` redirect lane, and renders **Download again** as
`<a href="/download" data-download-location="get-started">`, whose browser click fires
`app_download_click` and the GA4 `app_download_clicked` bridge as before. The homepage CTAs now point
at `/get-started?cta=<origin>` and carry `data-analytics-cta-id="get-started"` plus
`data-analytics-cta-location="<origin>"`, which is what makes them `site_click` events (the runtime
emits `site_click` only from that pair). `/get-started` sends the bounded origin token as
`ctaLocation` on both email and Google claim POSTs; direct or invalid entries fall back to
`get-started`. Before the Google OAuth redirect, the page stores only the origin CTA, UTM source /
medium / campaign values, click-id presence booleans, `gate_method=google`, and Supabase's same-tab
PKCE state in `sessionStorage`; it never stores raw click-id values or OAuth tokens in local storage. The
page's own funnel events - `gate_email_submitted`,
`gate_code_verified`, `gate_google_started`, `gate_google_completed`, `gate_google_failed { reason }`,
`gate_download_started { trigger }`, `handoff_link_clicked` - go to PostHog and GA4 behind
`window.__infiniteConsentGate` and never to the ledger, whose event enum is unchanged.

Fail-open: the page's source renders a plain `<a href="/download">` link; a successfully initialised
script hides it, and any script failure, network failure or 5xx reveals it again. A wrong or
expired code (400) and a rate limit (429) do not - the gate is hard by design.

## Consent and privacy signals

Infinite is configured with `consent.mode = "not_required"`; it does not depend on a stored consent value. Its configured DNT/GPC handling still suppresses Infinite browser events. GA4 and PostHog retain their pre-existing direct initialization. Server-observed document and redirect requests occur before browser code can run and remain separate.

## Server lane

Root Edge Routing Middleware makes no network call. On a verified production host it logs one `INFINITE_DOCUMENT_REQUEST_V1 {"path":"..."}` marker only for a human production `GET` document navigation. It excludes previews, bots, APIs, analytics endpoints, assets, file-like paths, metadata, `/LICENSE`, and `/download`.

Vercel's native `/download` redirect remains a 307/308 redirect to the release asset. A signed Drain separately classifies document markers as `site_document_request` and redirects as `app_download_redirect`. Browser views/clicks and server requests/redirects remain different facts and are never mixed into one conversion denominator.

## Hosts and canonical paths

The build and middleware consume the exact verified-host list through `INFINITE_PRODUCTION_HOSTS`. A 2026-08-02 read-only HTTP receipt showed `www.infinite.fast` returning `308 Location: https://infinite.fast/` and the apex returning `200`, so the intended production source binding is apex-only: `infinite.fast`. The source-provisioning receipt must confirm the same list before activation.

Canonical fixtures are `/ -> /`, `/privacy -> /privacy/`, `/privacy/ -> /privacy/`, `//tools// -> /tools/`, `/download/ -> /download`, and `/LICENSE -> /LICENSE` (then excluded from document analytics). Queries and fragments are discarded before classification.

## Accuracy limits

No analytics implementation captures mathematically 100% of people. DNT/GPC, blockers, network delivery, bot classification, provider processing, and Drain health affect totals. A page request is not a browser view; a download click is not a redirect, binary transfer, installation, or first app open. GA4/PostHog disagreement during the shadow month is diagnostic evidence, not a reason to blend providers.
