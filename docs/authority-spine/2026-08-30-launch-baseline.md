# infinite.fast authority spine launch baseline

Captured at: `2026-08-30T01:17:00Z`
Site worktree: `/Users/chaos/Github/infinite-site-worktrees/authority-spine-2026-08-30`
Branch: `feat/2026-08-30-authority-spine`
Base SHA: `e8e0117ef0e23be55fc43067d27d3c12e5848a05`
Main SHA at capture: `e8e0117ef0e23be55fc43067d27d3c12e5848a05`
Production SHA verification: `unverified: VERCEL_TOKEN or VERCEL_PROJECT_ID is missing; deploy API was not called`

This baseline is the pre-authority-spine record for production/search/analytics/GitHub state. Missing analytics is unmeasured, never zero.

Receipts live under:

`docs/authority-spine/receipts/2026-08-30/`

## Verification stance

- Site source was not changed for this baseline except this docs file and receipt files.
- The existing dirty checkout at `/Users/chaos/Github/infinite-site` was not modified.
- Live production deploy SHA was not asserted. `verified-production-sha.txt` records `unverified:` because the Vercel API credentials were absent.
- `/download` behavior is recorded as observed:
  - GET: `307`
  - HEAD: `404`
- Supabase receipts target prod project `wdxjduorvpayxixpmskf`, workspace `4cff9e34-59c3-458e-9df9-8c676741bbe7`.
- The linked Supabase project ref was confirmed from the private repo before exact receipt capture: `wdxjduorvpayxixpmskf`.
- Schema preflight passed for every selected column used by the required SQL.

## Live route inventory

Receipt: `live-route-inventory.txt`

The live sitemap exposed exactly 14 routes:

1. `https://infinite.fast/`
2. `https://infinite.fast/agents/`
3. `https://infinite.fast/tools/`
4. `https://infinite.fast/tools/high-intent-lead-finder-template/`
5. `https://infinite.fast/tools/seo-geo-brief-generator/`
6. `https://infinite.fast/tools/landing-page-ab-test-ideas-generator/`
7. `https://infinite.fast/tools/founder-content-ideas-generator/`
8. `https://infinite.fast/compare/`
9. `https://infinite.fast/compare/infinite-vs-okara/`
10. `https://infinite.fast/compare/infinite-vs-ploy/`
11. `https://infinite.fast/compare/infinite-vs-blaze/`
12. `https://infinite.fast/startup-launch-videos/`
13. `https://infinite.fast/privacy/`
14. `https://infinite.fast/terms/`

## HTTP receipts

Receipts:

- `live-sitemap.xml`
- `live-home.html`
- `live-agents.html`
- `live-tools.html`
- `live-compare.html`
- `live-startup-launch-videos.html`
- `live-privacy.html`
- `live-terms.html`
- `live-llms.txt`
- `download-get-headers.txt`
- `download-head-headers.txt`

### `/download`

GET receipt:

- Status: `307`
- Location: `https://github.com/Infinite-Labs-AI/infinite-desktop-releases/releases/latest/download/Infinite-arm64.dmg`
- Server: `Vercel`
- Captured response date: `Sun, 30 Aug 2026 01:17:02 GMT`

HEAD receipt:

- Status: `404`
- `x-vercel-error`: `NOT_FOUND`
- Server: `Vercel`
- Captured response date: `Sun, 30 Aug 2026 01:17:02 GMT`

The HEAD 404 is a real baseline fact, not a failure to hide.

## Link and footer inventory

Receipts:

- `live-link-inventory.txt`
- `live-footer-link-inventory.txt`
- `live-link-summary.json`

Summary:

- HTML receipts captured: `7`
- Link instances across captured HTML: `473`
- Unique hrefs across captured HTML: `233`
- Download link instances: `10`
- Hub link instances: `4`
- Retired `blog.infinite.fast` link instances: `7`
- Footer link rows captured: `67`

Footer observations from captured pages:

| Receipt | Footer count | Footer link count |
|---|---:|---:|
| `live-agents.html` | 1 | 11 |
| `live-compare.html` | 0 | 0 |
| `live-home.html` | 2 | 19 |
| `live-privacy.html` | 1 | 2 |
| `live-startup-launch-videos.html` | 1 | 21 |
| `live-terms.html` | 1 | 2 |
| `live-tools.html` | 1 | 12 |

Host distribution for unique hrefs includes:

- `relative`: 35
- `same-page-anchor`: 6
- `x.com`: 134
- `infinite.fast`: 7
- `blog.infinite.fast`: 1 unique href, 7 instances
- `hub.infinite.fast`: 2 unique hrefs, 4 instances
- `github.com`: 2
- `api.ultima.inc`: 2

## Installer receipts

Receipts:

- `installer-pr.json`
- `installer-smoke.json`

Installer PR:

- Repo: `Infinite-Labs-AI/infinite-os`
- PR: `https://github.com/Infinite-Labs-AI/infinite-os/pull/1`
- State: `MERGED`
- Merge commit: `855d4502c8739e4870766a74b48f4613ed555bac`
- Merged at: `2026-08-30T00:15:19Z`

Published smoke:

- Run: `https://github.com/Infinite-Labs-AI/infinite-os/actions/runs/33282886369`
- Status: `completed`
- Conclusion: `success`
- Head SHA: `855d4502c8739e4870766a74b48f4613ed555bac`

The smoke head SHA matches the installer PR merge commit.

## Supabase receipts

Project: `wdxjduorvpayxixpmskf`
Workspace: `4cff9e34-59c3-458e-9df9-8c676741bbe7`
Window definition: inclusive UTC calendar days, today plus the prior 27 dates.

Receipts:

- `supabase-project-ref.txt`
- `supabase-workspace-id.txt`
- `supabase-read-path.txt`
- `schema.json`
- `schema-selected-column-check.json`
- `gsc-pages.json`
- `gsc-queries.json`
- `aeo.json`
- `cta.json`
- `downloads.json`
- `supabase-mcp-captured-at.txt`
- `mcp-proof-summary.json`
- `mcp-proof-consistency-check.json`
- `verify-normalized-receipt-pairs.mjs`
- `supabase-summary.json`

Method note: the primary Supabase receipt provenance is now `mcp__supabase__execute_sql` against prod project `wdxjduorvpayxixpmskf`. Each primary receipt (`schema.json`, `gsc-pages.json`, `gsc-queries.json`, `aeo.json`, `cta.json`, `downloads.json`) records the MCP tool name, MCP project argument, MCP capture timestamp, the required SQL, the bounded proof SQL, the MCP result row, and the MCP untrusted-data boundary ID observed in the tool output. The earlier linked-CLI full row dumps are retained inside those files under `supplemental_full_row_dump`. `verify-normalized-receipt-pairs.mjs` reduces every dump to its selected columns, canonical scalar values, and query sort keys, then records a deterministic canonical JSON SHA-256 and row count. No sandbox project, raw `psql`, DDL, or writes were used.

MCP amendment captured at: `2026-08-30T01:33:10Z`

MCP proof consistency: the original `57/57` provenance/summary checks pass, and the normalized checker passes `6/6` retained CLI row dumps. The GSC-pages CLI rows reproduce the independently captured MCP PostgreSQL-jsonb MD5 (`81e566657a488a6ff0368ee379114a70`) at 317 rows, so this pair is verified equal despite transport-level raw-JSON MD5 differences. The other historical MCP receipts retain only summary rows and aggregate hashes, not raw MCP rows: their summary values and CLI canonical snapshots are verified, but this baseline makes no unsupported row-for-row equality claim for them.

### Schema

- Rows: `99`
- Selected-column check: passed
- MCP rowset MD5: `c9bbc491d402a554c2ec295ac374715c`

### GSC page truth

Receipt: `gsc-pages.json`

- Rows: `317`
- Dates present in returned data: `2026-08-03` through `2026-08-28`
- Date count present: `26`
- Unique pages: `56`
- Clicks: `1`
- Impressions: `2561`
- MCP rowset MD5: `81e566657a488a6ff0368ee379114a70`

Top page totals by clicks, then impressions:

| Page | Clicks | Impressions |
|---|---:|---:|
| `https://infinite.fast/` | 1 | 16 |
| `https://hub.infinite.fast/9-best-seo-automation-tools-for` | 0 | 1437 |
| `https://blog.infinite.fast/pipeline-generation-the-operators-playbook-for-consistent-revenue-flow` | 0 | 290 |
| `https://blog.infinite.fast/12-best-lead-generation-tools-for` | 0 | 263 |
| `https://infinite.fast/download` | 0 | 129 |

GSC does not have returned page rows for every date in the 28-day query window. Missing dates are unmeasured, never zero.

### GSC query sample

Receipt: `gsc-queries.json`

- Rows: `496`
- Dates present in returned data: `2026-08-03` through `2026-08-28`
- Date count present: `26`
- Unique queries: `118`
- Clicks: `0`
- Impressions: `2122`
- MCP rowset MD5: `3c7fcc713999b7617c269b01839f994e`

This is the retained query sample, not a census.

Top query/page pairs by impressions:

| Query | Page | Clicks | Impressions | Brand |
|---|---|---:|---:|---|
| `seo automation tools` | `https://hub.infinite.fast/9-best-seo-automation-tools-for` | 0 | 345 | false |
| `best seo automation tools` | `https://hub.infinite.fast/9-best-seo-automation-tools-for` | 0 | 271 | false |
| `seo lead generation software` | `https://blog.infinite.fast/12-best-lead-generation-tools-for` | 0 | 235 | false |
| `seo automation tool` | `https://hub.infinite.fast/9-best-seo-automation-tools-for` | 0 | 198 | false |
| `pipeline generation` | `https://blog.infinite.fast/pipeline-generation-the-operators-playbook-for-consistent-revenue-flow` | 0 | 185 | false |

### AEO sampled checks

Receipt: `aeo.json`

- Rows/checks: `1151`
- Dates present in returned data: `2026-08-03` through `2026-08-29`
- Date count present: `21`
- `our_domain_cited`: `25`
- MCP rowset MD5: `1563af869e51977c3161528c8f01e3be`

By platform:

| Platform | Checks | Cited | Unique prompts |
|---|---:|---:|---:|
| `chatgpt` | 532 | 15 | 30 |
| `claude` | 533 | 9 | 30 |
| `google_ai_overview` | 86 | 1 | 30 |

AEO data is sampled checks, not exhaustive visibility.

### CTA cohort

Receipt: `cta.json`

- Rows: `18`
- Dates present in returned data: `2026-08-07` through `2026-08-27`
- Date count present: `12`
- `site_clicks`: `11`
- `download_clicks`: `12`
- MCP rowset MD5: `b3ac55a1d40a2fe1e9bbe61806d2def4`

By CTA/location/destination:

| CTA | Location | Destination | Site clicks | Download clicks |
|---|---|---|---:|---:|
| `view-pricing` | `navigation` | `/` | 11 | 0 |
| `app_download` | `hero` | `/download` | 0 | 6 |
| `app_download` | `navigation` | `/download` | 0 | 5 |
| `app_download` | `pricing` | `/download` | 0 | 1 |

Missing CTA rows for dates/placements are unmeasured, never zero.

### Server-owned download/document cohort

Receipt: `downloads.json`

- Rows: `32`
- Dates present in returned data: `2026-08-03` through `2026-08-30`
- Date count present: `28`
- `document_requests`: `1890`
- `server_visits`: `1161`
- `download_attempts`: `29`
- `download_attempt_visits`: `12`
- `keyed_document_requests`: `1269`
- MCP rowset MD5: `72833d04e2191a80604ee367661a8f60`

## GitHub baseline

Receipts:

- `github-repos.jsonl`
- `github-org.json`

Org state:

- Organization: `Infinite-Labs-AI`
- Description: empty string
- Website URL: `null`
- Pinned repos: none

Public repos captured: `7`

| Repo | Description | Homepage | Stars | Forks | Pushed at |
|---|---|---|---:|---:|---|
| `infinite-skills` | Codex skills from Infinite Labs OS. | null | 44 | 4 | `2026-07-02T10:59:59Z` |
| `infinite-site` | A repository for infinite-site | `https://infinite-site-ruby.vercel.app` | 0 | 0 | `2026-08-27T21:17:46Z` |
| `hermes-health-apollo` | Hermes Health Apollo: local-first wearable, calendar, and daily-context intelligence for Hermes Agent | `https://discord.gg/AeUbSYas` | 27 | 2 | `2026-06-14T11:09:57Z` |
| `infinite-desktop-releases` | Public release feed for the Infinite desktop app -- auto-update artifacts (.dmg / .zip / latest-mac.yml) published by CI. No source; release bucket only. | null | 0 | 0 | `2026-08-29T18:42:46Z` |
| `know-your-unknowns-skills` | Know-your-unknowns skill pack for Codex and Claude | null | 2 | 0 | `2026-07-08T14:21:09Z` |
| `infinite-press-agent` | Local-first Qwoted scanner and pitching worker | null | 3 | 0 | `2026-08-17T16:40:15Z` |
| `infinite-os` | Your growth data, on your own machine -- ask it anything in plain English. Self-hosted, local-first growth-analytics runtime (MIT). | `https://infinite.fast` | 0 | 0 | `2026-08-30T00:15:20Z` |

## Comparison dates

Baseline date: `2026-08-30`

- Day 7: `2026-09-06`
- Day 28: `2026-09-27`
- Day 56: `2026-10-25`
- Day 90: `2026-11-28`

## Internal consistency

Receipt: `baseline-consistency-check.json`

Result: passed.

Checks covered:

- Worktree base SHA equals captured main SHA.
- Production SHA is either the confirmed main SHA or starts with `unverified:`.
- Live sitemap has 14 routes.
- `/download` GET is 307.
- `/download` GET location ends in `Infinite-arm64.dmg`.
- `/download` HEAD 404 is preserved.
- Installer PR is merged.
- Installer smoke is completed/success.
- Installer smoke head SHA matches installer PR merge commit.
- Schema selected columns are present.
- Supabase receipts record prod project `wdxjduorvpayxixpmskf`.
- Supabase data receipts are not `unmeasured:`.
- Supabase primary receipts use `mcp__supabase__execute_sql`.
- Supabase primary receipts retain full CLI row dumps.
- The normalized receipt checker passes; only GSC-pages claims rowset equality because only it has a reproduced MCP rowset checksum.

## Open unmeasured gates

- Production deploy SHA is unverified because `VERCEL_TOKEN` or `VERCEL_PROJECT_ID` was missing.
- GSC data returned no rows for some dates inside the inclusive 28-day query window; those dates are unmeasured, never zero.
- CTA data returned no rows for some dates/placements inside the inclusive 28-day query window; those dates/placements are unmeasured, never zero.

## Next baseline comparison rule

Day 7/28/56/90 comparisons must compare against the receipt files above. Do not backfill missing baseline data as zero. If a later source is absent or a query fails, write `unmeasured:<actual error>` and keep the comparison honest.
