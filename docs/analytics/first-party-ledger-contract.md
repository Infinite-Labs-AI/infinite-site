# Infinite.fast first-party analytics contract

Status: implementation contract. Production activation remains gated by the privacy, source-provisioning, Drain, and synthetic-receipt approvals in the runbook.

## Reviewed inputs

- Site base: `origin/main` at `95af1293de230506f107ec526f53e132a81de87c`.
- Cloud/desktop analytics implementation: `ad10d6349c45224a6fcfdbe415b653321e399d90`.
- Public package: exactly `infinite-tag@0.3.0`, published from reviewed SHA `117b444c534a2ff10bb9e8944e6f14d64b85a8c7`.
- Browser schema SHA-256: `919130276f983c61de47a75e986386c8bc7be543d4fd6706a71f0bc5481f34c0`.
- Browser fixture SHA-256: `08d5ae19194044bf0f2d144c2bd50902baacb09f5170f66067d0e9fd9b9148a9`.

The build imports `renderInfiniteBrowserTag` from the pinned npm package. It does not copy or fork the runtime. The local injector test hashes the package's shipped schema and fixture on every clean install.

## Browser lane

The shared runtime owns one logical event and translates it at provider boundaries:

| Logical event | Infinite ledger | PostHog mirror | GA4 mirror |
| --- | --- | --- | --- |
| Browser page view | `site_page_view` | `$pageview` | `page_view` |
| Meaningful managed CTA | `site_click` | `site_click` | `site_click` |
| Same-origin `/download` click | `app_download_click` | `app_download_clicked` | `app_download_clicked` |

PostHog and GA4 automatic page views are disabled. The package runtime emits the initial view only after their queue stubs exist. Optional X and Meta pixels remain supported, but initialize only after the same analytics consent grant.

The public envelope may contain only the versioned contract fields: event id/name/time, random browser visitor and session ids, clean canonical URL, referrer host, source public key, and event-specific structural properties. It may not choose a workspace, authority, environment, ingest channel, or dispatch destination. It never includes query strings, link text, DOM text, or a private cloud tracking SDK surface.

Browser delivery is the same-origin path `/infinite/events/collect`, rewritten by Vercel to `https://api.ultima.inc/api/analytics/events/collect`. The site does not expose `/tracking` or `/sdk`. No source key means the Infinite destination is dormant while consented GA4 and PostHog mirrors continue.

`infinite-tag@0.3.0` emits `app_download_click` with only `destination_path: "/download"`. Its download branch returns before reading placement metadata, so download placement is currently unavailable even though the public schema and collector permit bounded placement fields. The site retains its existing `data-download-location` markers for a future package release, but must not add a second click listener or claim that 0.3.0 preserves placement. The upstream follow-up is to update the package-owned download branch to map those markers into the same single event, add a package runtime test and download fixture proving the existing schema contract, and publish a separately reviewed version before the site dependency is changed.

## Consent and privacy signals

Analytics consent is required and stored as `infinite_analytics_consent`. One change event governs Infinite, PostHog, and GA4. DNT or GPC suppresses all three regardless of a stored grant. Consent withdrawal stops future browser emission. Server-observed document and redirect requests are disclosed separately because they occur before browser code can run and are not controlled by browser consent.

## Server lane

Root Edge Routing Middleware makes no network call. On a verified production host it logs one `INFINITE_DOCUMENT_REQUEST_V1 {"path":"..."}` marker only for a human production `GET` document navigation. It excludes previews, bots, APIs, analytics endpoints, assets, file-like paths, metadata, `/LICENSE`, and `/download`.

Vercel's native `/download` redirect remains a 307/308 redirect to the release asset. A signed Drain separately classifies document markers as `site_document_request` and redirects as `app_download_redirect`. Browser views/clicks and server requests/redirects remain different facts and are never mixed into one conversion denominator.

## Hosts and canonical paths

The build and middleware consume the exact verified-host list through `INFINITE_PRODUCTION_HOSTS`. A 2026-08-02 read-only HTTP receipt showed `www.infinite.fast` returning `308 Location: https://infinite.fast/` and the apex returning `200`, so the intended production source binding is apex-only: `infinite.fast`. The source-provisioning receipt must confirm the same list before activation.

Canonical fixtures are `/ -> /`, `/privacy -> /privacy/`, `/privacy/ -> /privacy/`, `//tools// -> /tools/`, `/download/ -> /download`, and `/LICENSE -> /LICENSE` (then excluded from document analytics). Queries and fragments are discarded before classification.

## Accuracy limits

No analytics implementation captures mathematically 100% of people. Consent, DNT/GPC, blockers, network delivery, bot classification, provider processing, and Drain health affect totals. A page request is not a browser view; a download click is not a redirect, binary transfer, installation, or first app open. GA4/PostHog disagreement during the shadow month is diagnostic evidence, not a reason to blend providers.
