# Get Started funnel coverage

Updated 2026-09-05. The site now pins `infinite-tag` 0.9.0; it previously embedded 0.6.0.

## What shipped in the shared tooling

The infinite-os repository owns both `infinite-tag` and the `infinite analytics` CLI entry point.
These capabilities already exist; site-specific code must not rebuild the runtime:

- `908aed8` / PR #15: provider adoption, automatic click capture configuration, campaign capture.
- `724f6ad` / PR #17: shared inspect → adopt/install → conversion marking → receipt verification → report workflow.
- `72cec2e` / PR #19 and `4aa0074` / PR #18: desktop-backed verification and report delivery.
- `c6dfb74` / PR #23: richer structural CTA locations, server-side checkout detection, guided consent.
- `71dc5d7` / PR #25: identity merging and post-response capture guidance.
- `c087644` / PR #27: published infinite-tag 0.9.0 (confirmed against npm).

Provider independence is intentional. The tag emits Infinite evidence; it does not mirror all events
into PostHog or GA4. Native PostHog autocapture is disabled on this sensitive sign-in page, so the
page emits explicit bounded events. Automatic clicks cannot determine whether an OTP response was
successful or whether a desktop installation happened.

## Event map

| Observed stage/action | PostHog and GA4 | Infinite evidence |
| --- | --- | --- |
| Homepage CTA to Get Started | `get_started_clicked` with `cta_location` | `sign_up_click`, named by CTA markers |
| Page load | Native provider page view | `site_page_view`; server document-request lane |
| Email, code or download stage visible | `gate_step_viewed` with `step` | Page view only; no invented page navigation |
| Google button | `gate_google_started` | `sign_up_click` intent |
| Email submit attempt | `gate_action`, action `email_submit` | Button `site_click` |
| Email code successfully requested | `gate_email_submitted` (existing meaning retained) | No browser-minted outcome |
| Code submit attempt | `gate_action`, action `code_submit` | Button `site_click` |
| Validation/request failure | `gate_error` with bounded `step` and `reason` | No arbitrary event enum expansion |
| Google failure | `gate_google_failed` with bounded reason | No browser-minted outcome |
| Resend attempt / success | `gate_action`, action `code_resend` / `gate_code_resent` | Button `site_click` |
| Change email | `gate_action`, action `change_email` | Button `site_click` |
| Verified sign-in | `gate_code_verified` or `gate_google_completed`; PostHog identity set first | Server-created sign-in claim |
| Automatic download / download again | `gate_download_started`, trigger `auto` / `again`; retry link also has GA4 `app_download_clicked` | Retry `app_download_click`; server redirect and deduplicated attempt lanes |
| Failure fallback download | `gate_action`, action `fallback_download`; GA4 download bridge | `app_download_click`; server redirect lane |
| Open Infinite button | `handoff_link_clicked`, before protocol navigation | Button `site_click` |
| Real app first open / activation | Desktop-owned instrumentation | `app_first_open` / `app_critical_action` from authenticated desktop |

An instruction animation, a download redirect and an Open Infinite button click are not proof of
installation. Do not emit a completion merely because a scene played or a link was clicked.
No email, OTP, OAuth token, claim secret or raw query is added to these named events. Late consent
reports the current visible stage; it does not replay earlier actions. Explicit denial suppresses
subsequent page events.

## Why the installer did not bring this site up to date

This repo uses a custom static build: the homepage source is
`_agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html`, and the build injects
provider snippets into `dist`. It is not a standard root `index.html` install and does not have a
managed `.infinite/install.json` owning those injections.

A published 0.9.0 `infinite-tag harness --check --json --root <repo>` fails honestly at inspection
with `INF_DETECT_NO_FRAMEWORK`. It stops before conversion marking or verification; its initial
provider rows are not an inventory of deployed providers.
`--app-root get-started` detects static HTML, but sees only that subdirectory, not the provider
bootstraps inserted by the build. It is not a whole-site coverage audit. Do not run `--apply`
blindly against the source subdirectory or generated dist: that would establish a second owner for
analytics or write changes that the next build overwrites.

For this site, update the existing builder and package pin, run the built-output contracts, then
verify production. A generic custom-build adapter / source-to-output mapping would be a separate
improvement to the harness; none was implemented by this site change.

## Evidence and limits

Read-only production queries used Supabase project `wdxjduorvpayxixpmskf`, never the sandbox.
At audit time the raw synced `engine.posthog_event_truth` contained Google start/success/failure,
email-code-request success, code verification and download events from the prior seven days.
This is the raw table, including internal traffic; counts are not external conversion totals.
The production ledger contained document requests, download redirects/attempts, authenticated
first opens and critical actions. This proves those lanes have received events, not that each
visitor or each provider is complete. PostHog sync is delayed; lack of a recent synced event is
not proof the live provider did not ingest it.

New event delivery is exercised in the page behavior harness against both provider APIs; real
provider receipt verification is a different check. GA4 receipt counts were not queried in this
audit. No new real account, email code, or installation was created just to test analytics.

### Separate packaged CLI regression found during this audit

The machine's `~/.local/bin/infinite` wrapper targets Infinite Dev 7. Its
`infinite analytics --check --json --root <repo>` fails before the harness with
`Unable to resolve the infinite-tag package root.` Running the same read-only command through the
production app's CLI bundle reproduces the error. The production bundle identifies engine commit
`0dfd33f2ba8f1242752b8befafc3dd0e825d80d1`; Dev 7 identifies
`50d4cab9935bbd1e2d30ef36eac54eaa38929e5e`.

Root cause: `packages/instrument/src/package-manager.ts` resolves its package root at module import
by searching parent directories of `import.meta.url` for `package.json`. The desktop's single-file
CLI bundle has a different layout; `apps/cli/scripts/bundle-cli.mjs` inlines the tag without the
package metadata layout it expects. This is a packaging defect, not missing analytics capability.
The npm-distributed 0.9.0 harness has its normal package layout and runs. This site PR does not
rebuild or modify either installed desktop app. A CLI packaging fix and packaged analytics smoke
test are still needed before declaring the one-command customer path working.
