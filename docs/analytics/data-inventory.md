# Infinite.fast analytics data inventory

Status: production behavior inventory. Founder/counsel review and exact processor and platform retention receipts remain operational follow-ups.

| Data | Purpose and authority | Retention/deletion | Processor and access |
| --- | --- | --- | --- |
| Random browser visitor id | First-party dedupe and exact retained-window visitors; not an account identity | Browser storage until cleared; server stores only a rotating HMAC derivative for 90 days | Browser; Infinite first-party collector and service-role ledger |
| Random browser session id | First-party exact retained-window sessions | Browser session storage until the session ends; server HMAC derivative for 90 days | Browser; Infinite first-party collector and service-role ledger |
| `site_page_view`, `site_click`, `app_download_click` envelope | Browser views and same-lane conversion reporting | Raw ledger: 90 days from receipt. Daily aggregates: 25 months | Infinite collector and service-role ledger; no member/public raw-row access |
| Canonical path, referrer host, bounded CTA id/location for `site_click`, and bounded CTA location plus `/download` destination path for `app_download_click` | Aggregate page, CTA, and download-placement reporting | Same as the first-party event | No query strings, link text, DOM text, raw browser ids, or client-selected authority/environment |
| PostHog browser analytics | Provider-specific ongoing website comparison and historical continuity | Provider-side setting and contract; any Infinite-synced aggregates follow the workspace retention policy | PostHog; configured public project token, EU ingest proxy |
| GA4 browser analytics | Provider-specific acquisition/reporting comparison and historical continuity | Provider-side setting and contract; any Infinite-synced aggregates follow the workspace retention policy | Google Analytics; direct Google loader |
| Optional X/Meta pixels | Campaign measurement only when configured | Provider-side setting and contract | X and Meta; initialized when configured |
| Content Security Policy reports: sanitized document origin and path, blocked origin and path (or `inline`/`eval`/`self`), effective or violated directive, and disposition | Website security diagnostics; no query strings, script samples, full policies, account ids, or workspace ids | Bounded Vercel function logs; exact platform retention receipt remains pending; no analytics ledger or database row | Vercel function runtime and restricted platform logs |
| Vercel document marker: normalized path only | Canonical server-observed human document request | Drain delivery to the raw ledger: 90 days; Vercel platform-log retention follows the approved plan/setting | Vercel Edge logs and signed Drain; exact project/host binding |
| Vercel `/download` redirect log | Canonical redirect/request count, not completed download | Raw ledger: 90 days; daily aggregates: 25 months | Vercel redirect logs and signed Drain |
| Request IP | Short-lived quota/rate context only | Never persisted in the analytics ledger; any platform handling follows the processor setting | Vercel/network boundary; collector may derive an in-memory rotating HMAC quota key |
| User agent | Bot classification and delivery diagnostics | Bounded server processing; classification result may accompany the 90-day raw row | Vercel and Infinite collector |
| Synthetic browser/Drain events | Daily end-to-end delivery proof | Synthetic-only diagnostic retention; excluded from production aggregates and readiness | Dedicated synthetic sources; environment is server-derived |
| Get-started sign-in claim: random claim UUID, SHA-256 claim-secret hash, verified email and profile id, originating CTA location, user agent, issue/expiry/redemption timestamps, redeeming install id, and - when `infinite-tag@0.6.0` returns a consent-qualified context - the ledger's rotating visitor/session ids | One-time desktop sign-in after email verification on `/get-started`; `redeemed_at IS NULL` doubles as "verified on the site, never opened the app" | 90 days, bounded job; profile deletion cascades | Service role only; no member/public RLS. The raw claim secret is never stored; it exists only in the visitor's browser, the `infinite://handoff/v1` URL, and the confirmation email |

A sign-in claim is created only after the 6-digit code emailed from `/get-started` verifies; a typed
email alone creates nothing. Browser visitor/session ids ride along when the consent-gated
`window.__infiniteHandoffContext()` accessor returns a context; it returns null under Do Not Track,
Global Privacy Control without a site grant, a saved denial, blocked storage, an unverified host, or
a dormant site source. The ids are never inferred from IP address, user agent, or timing. The claim
expires after 48 hours and redeems once; redeeming it signs the desktop app in to the account whose
email was just verified and authorizes nothing else.

## Operational follow-ups

Record founder/counsel review of the published policy, provider retention/account identities, Vercel plan and owner/admin status, accepted team-wide IP visibility impact, exact Vercel project id, exact source host allowlist, redacted no-sampling-rules Drain snapshot, and the deployed authenticated receipt route.
