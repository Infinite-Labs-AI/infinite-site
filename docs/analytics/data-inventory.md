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
| Desktop handoff claim: random claim UUID, SHA-256 claim-secret hash, existing visitor/session HMACs, site source/workspace/environment, issue/expiry/redemption timestamps, redeemed Supabase user UUID, app version/runtime kind, internal-user boolean | Consent-qualified browser download-start to authenticated desktop-open attribution and aggregate activation analysis | 90 days, bounded cron; workspace/source deletion cascades; auth-user deletion sets `redeemed_user_id` null | Service role only; no member/public RLS. The raw claim secret, email, IP, UA and raw browser ids are not stored. The secret exists only in the browser and in the `infinite://handoff/v1` URL the visitor clicks |

The handoff claim row exists only while the two-keyed browser-to-desktop handoff is enabled (site
`INFINITE_HANDOFF_ENABLED` plus cloud `INFINITE_HANDOFF_ATTRIBUTION_ENABLED`); both ship off. A claim
is created only by an explicit `/download` click from a consent-qualified visitor, and it is joined
to an account only when that visitor explicitly clicks "Open Infinite" and then authenticates in the
desktop app. An unused, expired, denied, or cross-browser journey is left unlinked; it is never
inferred from IP address, user agent, email, time proximity, or the server visit fingerprint.

## Operational follow-ups

Record founder/counsel review of the published policy, provider retention/account identities, Vercel plan and owner/admin status, accepted team-wide IP visibility impact, exact Vercel project id, exact source host allowlist, redacted no-sampling-rules Drain snapshot, and the deployed authenticated receipt route.
