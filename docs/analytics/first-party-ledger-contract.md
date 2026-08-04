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

Browser delivery is the same-origin path `/infinite/events/collect`, rewritten by Vercel to `https://api.ultima.inc/api/analytics/events/collect`. The site does not expose `/tracking` or `/sdk`. No source key means only the Infinite destination is dormant; GA4 and PostHog continue independently.

`infinite-tag@0.3.1` maps each valid `data-download-location` marker through its package-owned click listener into the bounded `cta_location` property on `app_download_click`, alongside `destination_path: "/download"`. A small GA4 bridge applies the same bounded properties to one `app_download_clicked` event.

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
