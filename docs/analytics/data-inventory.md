# Infinite.fast analytics data inventory

Status: prepared, not approved. Founder/counsel approval and exact processor and platform retention receipts remain pending. A production Infinite source key or Vercel Drain must not be enabled before those gates are recorded.

| Data | Purpose and authority | Retention/deletion | Processor and access |
| --- | --- | --- | --- |
| Consent value `infinite_analytics_consent` | One browser decision for Infinite, PostHog, GA4, and configured X/Meta pixels | Until the visitor changes it or clears site storage | Browser local storage; readable by first-party site code |
| Random browser visitor id | First-party dedupe and exact retained-window visitors; not an account identity | Browser storage until cleared; server stores only a rotating HMAC derivative for 90 days | Browser; Infinite first-party collector and service-role ledger |
| Random browser session id | First-party exact retained-window sessions | Browser session storage until the session ends; server HMAC derivative for 90 days | Browser; Infinite first-party collector and service-role ledger |
| `site_page_view`, `site_click`, `app_download_click` envelope | Browser views and same-lane conversion reporting | Raw ledger: 90 days from receipt. Daily aggregates: 25 months | Infinite collector and service-role ledger; no member/public raw-row access |
| Canonical path, referrer host, bounded CTA id/location for `site_click`, and `/download` destination path for `app_download_click` | Aggregate page and CTA reporting; download placement is unavailable in `infinite-tag@0.3.0` | Same as the first-party event | No query strings, link text, DOM text, raw browser ids, or client-selected authority/environment |
| PostHog browser mirror | Provider-specific ongoing website comparison and historical continuity | Provider-side setting and contract; any Infinite-synced aggregates follow the workspace retention policy | PostHog; configured public project token, EU ingest proxy |
| GA4 browser mirror | Provider-specific acquisition/reporting comparison and historical continuity | Provider-side setting and contract; any Infinite-synced aggregates follow the workspace retention policy | Google Analytics; direct Google loader after consent |
| Optional X/Meta pixels | Campaign measurement only when configured | Provider-side setting and contract | X and Meta; initialized only after the shared analytics grant |
| Content Security Policy reports: sanitized document origin and path, blocked origin and path (or `inline`/`eval`/`self`), effective or violated directive, and disposition | Website security diagnostics; no query strings, script samples, full policies, account ids, or workspace ids | Bounded Vercel function logs; exact platform retention receipt remains pending; no analytics ledger or database row | Vercel function runtime and restricted platform logs |
| Vercel document marker: normalized path only | Canonical server-observed human document request | Drain delivery to the raw ledger: 90 days; Vercel platform-log retention follows the approved plan/setting | Vercel Edge logs and signed Drain; exact project/host binding |
| Vercel `/download` redirect log | Canonical redirect/request count, not completed download | Raw ledger: 90 days; daily aggregates: 25 months | Vercel redirect logs and signed Drain |
| Request IP | Short-lived quota/rate context only | Never persisted in the analytics ledger; any platform handling follows the processor setting | Vercel/network boundary; collector may derive an in-memory rotating HMAC quota key |
| User agent | Bot classification and delivery diagnostics | Bounded server processing; classification result may accompany the 90-day raw row | Vercel and Infinite collector |
| Synthetic browser/Drain events | Daily end-to-end delivery proof | Synthetic-only diagnostic retention; excluded from production aggregates and readiness | Dedicated synthetic sources; environment is server-derived |

## Activation approvals

Before production collection, record: counsel/founder approval of the consent classification and published policy; provider retention/account identities; Vercel Pro/Enterprise and owner/admin status; accepted team-wide IP visibility impact; exact Vercel project id; exact source host allowlist; redacted no-sampling-rules Drain snapshot; deployed authenticated receipt route; and proof of zero production receipts before activation.
