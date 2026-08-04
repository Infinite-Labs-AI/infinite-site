# Live analytics guardrail

This guardrail checks the bytes and routes that real visitors receive from `infinite.fast`. It exists because a stale deploy, incomplete build injection, and a PostHog region change once allowed analytics to fail silently.

## What it proves

For every maintained relative main-site path, `scripts/verify-live-analytics.mjs` requires:

- the apex canonical and Open Graph URL;
- exactly one package-owned Infinite runtime with no consent-controller UI;
- exactly one PostHog initialization using the expected public token and `/ingest` proxy;
- one direct Google tag loader definition with the expected measurement id;
- GA4's normal direct config plus an explicit `app_download_clicked` event for `/download`, with no `/gtm` loader or `transport_url`;
- the exact same-origin `/infinite/ledger` runtime path;
- Infinite browser collection configured as `not_required`, so a missing consent value cannot suppress clicks;
- the expected production `siteSourceKey` when `EXPECTED_INFINITE_SITE_SOURCE_KEY` is configured;
- no legacy `/tracking` or `/sdk` bytes and 404/405 responses from representative legacy route probes;
- CSP reporting headers and a live `204` response from `/api/csp-report`;
- a live PostHog proxy library response; and
- the native `/download` 307/308 target. The redirect probe uses a bot-classified user agent so it is excluded from production redirect metrics.

When the separately approved synthetic configuration is enabled, the same job also:

1. generates a UUID and posts `site_page_view` through `https://infinite.fast/infinite/ledger` with the dedicated synthetic source key and apex `Origin`;
2. requires `202`, polls the authenticated diagnostic route, and requires a matching `environment=synthetic` receipt;
3. submits an HMAC-signed mixed Drain batch shaped like Vercel Log Drain JSON, containing valid document/redirect records plus schema-valid `HEAD`, asset, bot/prefetch, wrong-project, and wrong-host records; and
4. requires only the valid synthetic document and redirect receipts.

A direct API-host POST does not satisfy the same-origin test. Synthetic environment is derived from the provisioned source; the browser payload has no environment field. Synthetic rows must remain excluded from production aggregates, source timestamps, and readiness.

This proves the configured delivery path at the time of the check. It does not prove mathematically 100% capture. DNT/GPC, blockers, bot filtering, networks, provider processing, and Drain delivery can all affect counts.

## Local verification

Install only the reviewed lockfile and run the focused suite:

```bash
npm ci
node .github/scripts/test-inject-analytics.mjs
node .github/scripts/test-routing-middleware.mjs
node .github/scripts/test-static-remediation.mjs
node .github/scripts/test-prepare-static-deploy.mjs
node .github/scripts/test-csp-report.mjs
node .github/scripts/test-verify-live-analytics.mjs
```

The last test starts a loopback server and exercises the full browser receipt, signed Drain receipt, download, CSP, PostHog proxy, and live-byte verifier logic without a production deploy or production row.

Running `node scripts/verify-live-analytics.mjs` with no synthetic variables checks public bytes and routes and prints a clear `SKIP` for receipts. Before activation, the scheduled workflow must set `EXPECTED_INFINITE_SITE_SOURCE_KEY`, set `REQUIRE_SYNTHETIC_RECEIPTS=1`, and provision all values listed in `.env.example`; missing receipt configuration then fails closed.

## GitHub configuration

Public provider identities use repository variables. Synthetic source keys, receipt bearer tokens, and Drain signing material use Actions secrets. Do not reuse the production browser source key for the guardrail and do not commit any secret.

Required when `REQUIRE_SYNTHETIC_RECEIPTS=1`:

| Kind | Name |
| --- | --- |
| Variable | `EXPECTED_INFINITE_SITE_SOURCE_KEY` |
| Variable | `REQUIRE_SYNTHETIC_RECEIPTS=1` |
| Variable | `ANALYTICS_RECEIPT_URL` |
| Variable | `SYNTHETIC_DRAIN_URL` |
| Variable | `SYNTHETIC_VERCEL_PROJECT_ID` |
| Secret | `SYNTHETIC_SITE_SOURCE_KEY` |
| Secret | `ANALYTICS_RECEIPT_TOKEN` |
| Secret | `SYNTHETIC_DRAIN_SECRET` |

The receipt route must be deployed and authenticated before this switch is enabled. The current cloud checkout named in the implementation handoff does not contain the locked plan's diagnostic receipt route; that cross-repository deployment remains an explicit operational gate and must not be replaced with a public raw-ledger query.

## Failure response

Read the named failure, reproduce it locally or against the public URL, and keep Infinite activation disabled until the check passes. If a page is intentionally added or removed, update the relative `PAGES` list. If either Infinite lane fails after activation, remove the production source key and disable the Drain together while leaving the dormant runtime, GA4, PostHog, and optional X/Meta integrations in place.
