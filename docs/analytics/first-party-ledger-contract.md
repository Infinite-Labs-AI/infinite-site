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

## Browser-led desktop handoff (Wave 2, dormant)

A SEPARATE lane from everything above. It is emitted only when the site build has a verified source
key **and** `INFINITE_HANDOFF_ENABLED=1`; the shipped default is off, and a dormant build carries
zero handoff bytes (pinned by `.github/scripts/test-inject-analytics.mjs` in both directions, and by
`scripts/verify-live-analytics.mjs` against the live bytes via `EXPECTED_HANDOFF_ENABLED`).

When enabled, a click on a same-origin `/download` anchor asks `window.__infiniteHandoffContext()`
for a consent-qualified context. That accessor is the consent gate: under DNT/GPC or a saved denial
it returns `null`, and the click then proceeds as an ordinary direct download with nothing minted,
nothing sent, and nothing rendered. With a context, the browser mints a claim id (UUID v4) and a
claim secret (32 random bytes, base64url, 43 characters), posts exactly

```text
{ siteSourceKey, claimId, claimSecret, anonymousId, sessionId, occurredAt, url }
```

to the same-origin path `/infinite/handoff`, which Vercel rewrites to
`https://api.ultima.inc/api/analytics/attribution/handoff/claim`. Delivery is `navigator.sendBeacon`,
falling back to one same-origin `keepalive` fetch only when the browser refuses the beacon. The
server stores only `sha256(secret)`; the raw secret exists in the browser URL and nowhere else.

The DMG opens in a NEW tab and the original page is retained with one card offering
`infinite://handoff/v1?claim_id=...&secret=...`. The custom scheme is never auto-opened: the user's
explicit click is the one browser-to-app transition. A later valid `/download` click replaces the
card's claim instead of stacking a card.

Two properties are load-bearing and easy to undo by accident:

- The handler binds in the **capture** phase. The GA4 download bridge is a bubble listener that
  cancels an ordinary same-tab click and re-navigates this tab; capture is what lets the handoff set
  `target="_blank"` before the bridge reads it, so the bridge stands down and the retained page —
  the only place the "Open Infinite" button exists — survives.
- The handler never calls `preventDefault()`. Every failure path (no accessor, no context, no
  crypto, refused beacon, thrown error) falls through to the anchor's own navigation, so the
  download always happens.

`app_download_click` and the server-side `/download` attempt are unchanged; a claim is labelled
`Attributed handoff start` and is never counted as a download, an installation, or a person.

**Package pin:** the accessor ships in `infinite-tag@0.6.0`, which is not published yet. The site
pinned `0.3.5` until 2026-08-19 and now pins `0.6.0` (accessor present); the flow was written against the documented accessor shape and was inert without
it (`typeof window.__infiniteHandoffContext !== "function"` is just another no-context path). Pin
`>= 0.6.0` and record its tarball receipt before flipping `INFINITE_HANDOFF_ENABLED`.

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
