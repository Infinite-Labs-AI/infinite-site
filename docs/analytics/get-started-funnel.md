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

## Repeatable runtime adoption audit (2026-09-05)

Run `npm ci && node scripts/audit-live-tag-runtime.mjs`. It reads every route from
`KNOWN_DOCUMENT_PATHS`, requires exactly one Infinite runtime and one PostHog/GA4 bootstrap,
and compares each delivered runtime byte-for-byte with `renderInfiniteBrowserTag` from the exact
site package pin using the delivered configuration. It does not execute scripts, submit forms,
or emit browser analytics. `SITE_BASE_URL` optionally selects a deployment to inspect.
It checks the pinned version, not npm latest; compare `npm view infinite-tag version` separately.
Runtime configuration correctness and provider delivery remain separate guardrail/receipt checks.

The read-only production audit on 2026-09-05 passed all 22 routes against 0.9.0, which npm reported
as latest at audit time. GA4 and PostHog each had one bootstrap per page. Meta and X were dark.
The custom Meta injector had missed the newer tag's `autoConfig` protection: it now queues
`fbq("set", "autoConfig", "false", pixelId)` before `init`, with a behavior test for the exact order.
The site's consent gate and auth replay/autocapture exclusions remain intentional provider settings.

A scratch snapshot of all 22 live documents was also run through the published 0.9.0 harness:

- `--check` exited 0 and adopted GA4/PostHog, but skipped the modern Infinite inline runtime.
  The detector recognizes legacy Infinite loader signatures. It also treated a guarded Meta event
  call as adoption despite no deployed Meta bootstrap. These states are not deployment truth.
- `--plan` exited 0, proposed 200 conversion marks and skipped 338; it neither marked nor verified.
- `--verify-only` exited 0 but explicitly skipped receipts because no `.infinite/install.json` exists.

These successful process exits do not establish completed whole-site coverage or receipt verification.
Do not create a fabricated install manifest or apply to generated output to make the harness green.
Whole-site harness support needs explicit custom-build ownership and source/output mapping, modern
runtime detection, and a receipt path for existing provider installations. Existing manifest-driven
CI tests and daily live guardrails remain the ongoing coverage checks; the parity audit can be rerun
after every package upgrade or deployment. No raw production snapshots are committed here.

## Shared harness fixes and package adoption (0.9.1)

The findings above describe the 0.9.0 audit. Engine PR #29 fixed CLI packaging; the signed
production desktop 0.3.33 was updated and its actual bundled CLI passed a read-only analytics
check. The terminal wrapper still targets the older Dev 7 app; its target was not changed.

Engine PR #30 (`7d1ebd723b6a6c8dc91f29ae7c08b1c4f9b4b893`) publishes infinite-tag 0.9.1,
which this site now pins exactly. It recognizes the modern Infinite runtime, requires genuine
provider initialization, reports stale exact pins and source/output ownership, and refuses unsafe
automatic installation into this custom build or its generated output. `--brief` provides manual
integration and testing instructions for the existing builder. Explicit `--verify-only` now fails
with `INF_VERIFY_INCOMPLETE` when receipt verification cannot run, including a missing manifest.
It does not turn this custom site into an automatically managed installation.

Reports and agent briefs now require an action matrix covering attempts, outcomes, failures and
retries; keyboard/pointer and navigation tests; consent, identity and URL privacy checks; built/live
route deduplication; browser execution and provider receipts; and the shipped executable. The
browser runtime and receipt contracts are unchanged in 0.9.1. Rebuild through the existing injector
and rerun the live parity audit; that audit still proves delivered code parity, not provider receipts.
