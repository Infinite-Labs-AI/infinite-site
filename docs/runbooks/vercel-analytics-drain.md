# Vercel analytics Drain runbook

Status: prepared but disabled. This repository change does not create a site source, configure or activate a Drain, change Vercel variables, deploy, or create a production receipt. Activation is prohibited until the Task 14 privacy gate and coordinated Task 15 release are explicitly approved.

Gate receipt status: Founder/counsel approval is pending, and processor and platform retention receipts are pending.

## Frozen configuration

Configure the Infinite site's Vercel Drain with all of the following and no substitutes:

- Schema: `log` version 1.
- Delivery: JSON to `https://api.ultima.inc/api/analytics/events/vercel-drain`.
- Environment: production only.
- Sources: exactly `edge` and `redirect`.
- Sampling rules: empty/absent. Do not invent a “100%” rule; no rules is the full-forwarding state, subject to delivery health.
- Signature: Vercel signature secret stored only as `VERCEL_ANALYTICS_DRAIN_SECRET` on the API deployment.
- Project: the exact Infinite site Vercel project id from an owner/admin receipt. It is intentionally not guessed in git.
- Host allowlist: `infinite.fast`. A read-only 2026-08-02 HTTP receipt showed `www.infinite.fast` is redirect-only (`308` to the apex); the authenticated source row must confirm the apex-only binding.
- State: saved and validated, then left disabled until coordinated activation.

Export or inspect the saved Drain after configuration and retain a redacted snapshot proving the project id, endpoint, schema/version, `sources=["edge","redirect"]`, `environments=["production"]`, and an empty/absent rule list. Hash the snapshot and repeat the inspection immediately before activation. Never commit the signature secret or source keys.

## Preflight gates

1. Confirm the Vercel team is Pro or Enterprise and the operator is an owner/admin.
2. Obtain explicit approval for the team-wide impact of disabling Drain IP Address Visibility, then disable it. The server lane needs request counts, not unique-person IP data.
3. Provision/reconcile the production and dedicated synthetic sources through the authenticated control plane. Do not insert rows with ad hoc SQL.
4. Record the exact Vercel project id and confirm the source's enabled verified host binding is exactly `infinite.fast`.
5. Export the authenticated browser-safe source as exact `InfinitePublicArtifact` JSON into `INFINITE_SITE_SOURCE_ARTIFACT`. Production builds require it and fail unless its normalized `productionHosts` exactly match `INFINITE_PRODUCTION_HOSTS`; when `INFINITE_SITE_SOURCE_KEY` is later enabled, it must exactly match the artifact key. The artifact alone does not activate the dormant runtime.
6. Resolve the deployed GA measurement id and PostHog token/host to the exact properties connected to the Infinite workspace. Record only non-secret identities.
7. Confirm the production site build has no `INFINITE_SITE_SOURCE_KEY`; the Drain is disabled; and no production receipt exists.
8. Publish the reviewed privacy policy and approve the data inventory, consent behavior, raw/aggregate retention, deletion workflow, and processors.

## Synthetic validation

Before activation, use a dedicated source whose immutable server-owned ingest environment is `synthetic`.

1. POST a browser `site_page_view` through `https://infinite.fast/infinite/events/collect` with `Origin: https://infinite.fast`; require `202` and a matching authenticated receipt by event UUID. A direct API-host POST does not prove the Vercel rewrite.
2. Submit one signed mixed Drain batch containing a valid document marker, a valid `/download` redirect, `HEAD`, asset, prefetch/bot, wrong-project, and wrong-host records. Require only the valid synthetic document and redirect receipts.
3. Confirm every receipt is `environment=synthetic`, excluded from production aggregates, unable to set the production source's first-receipt timestamp, and unable to advance readiness.
4. Probe the native `/download` redirect with a bot-classified guardrail user agent so the live check does not create a production redirect metric.
5. POST a redacted CSP fixture to `/api/csp-report` and require `204` after the root ESM conversion.

The site verifier supports this gate with `REQUIRE_SYNTHETIC_RECEIPTS=1` plus the separately provisioned `SYNTHETIC_*` and authenticated receipt variables documented in `.env.example`. Keep receipt and signing credentials in secret stores.

## Coordinated activation and rollback

After every preflight passes, deploy the production source key and enable the validated Drain in one approved window. Confirm one browser and one signed Drain receipt, then persist the first production receipt atomically. If either lane fails, remove the production source key and disable the Drain together; leave the dormant runtime, strict rewrite/collector, direct GA4, PostHog proxy, and optional X/Meta integrations intact. Never roll back by reopening `/tracking` or `/sdk`, accepting client-selected workspace/environment/authority, or mixing browser and server denominators.
