# Live Analytics Guardrail

A tripwire that fails loudly the moment `www.infinite.fast` stops carrying its
analytics tags.

## Why this exists

Analytics on the marketing site died **silently for about a month**. The live
pages simply stopped carrying the PostHog snippet. There was no error, no crash,
no red build — the pages loaded fine, they just weren't reporting. The causes:

- a **stale deploy** (the live bytes lagged behind the repo),
- **gaps in the build-time injector** (it didn't inject every page), and
- a **PostHog region flip** (events pointed at the US host instead of EU).

Nothing in CI was watching the *live site*, so nothing caught it. This guardrail
is that watcher.

## What it checks

For every page in the maintained list in
`scripts/verify-live-analytics.mjs`, it fetches the **real production URL** and
asserts:

| Check | Why |
|-------|-----|
| Exactly **one** PostHog snippet (`posthog.init(`) | `0` = analytics dead; `2+` = double-counted events |
| PostHog token starts with `phc_` **and equals the expected value** | Catches a wrong/dev/blank token |
| PostHog `api_host` is **`https://eu.i.posthog.com`** | The region-flip tripwire (US host = wrong project) |
| A Google Analytics `gtag` loader is present | Catches GA falling off the page |

Any failure prints a message naming **the page and what's wrong**, exits non-zero,
and turns the GitHub Actions run **red**.

## How it works

Two files:

- **`scripts/verify-live-analytics.mjs`** — pure Node (no dependencies). Fetches
  the live pages over HTTPS exactly as a browser would and runs the assertions.
  It reads the *live bytes the CDN serves to real users* — it does **not** look
  at the repo, the build output, or any CI artifact.
- **`.github/workflows/verify-live-analytics.yml`** — runs the script:
  1. **after pushes to `main`** (waits ~3 min first so Vercel's independent
     build has time to go live),
  2. **daily on a schedule** (catches silent drift no deploy caused), and
  3. **on manual dispatch** (Actions tab → "Verify Live Analytics" → Run).

Expected values are supplied from repo **variables** (`VITE_POSTHOG_PROJECT_TOKEN`,
`VITE_POSTHOG_API_HOST`, `VITE_GOOGLE_ANALYTICS_TAG_ID`) and passed to the script
as env. The script also has safe public defaults, so it works even if a variable
is unset — and it runs locally with zero setup:

```bash
node scripts/verify-live-analytics.mjs
```

Overridable env (all optional): `SITE_BASE_URL`, `EXPECTED_POSTHOG_TOKEN`,
`EXPECTED_POSTHOG_API_HOST`, `EXPECTED_GA_TAG_ID`.

> The PostHog **project token** (`phc_…`) is a public, client-side identifier
> that already ships in the page HTML — it is not a secret, which is why it can
> be a hardcoded default.

## What to do when it fires

1. **Open the failed run** and read the message — it names the page and the exact
   missing/wrong thing.
2. **Reproduce locally** to confirm it's the live site, not a network blip:
   ```bash
   node scripts/verify-live-analytics.mjs
   ```
   (Transient network errors auto-retry; a real outage fails every retry.)
3. **Confirm with your own eyes** — open the page and View Source, or:
   ```bash
   curl -s https://www.infinite.fast/ | grep -E 'posthog\.init|api_host|gtag/js'
   ```
4. **Fix by failure type:**
   - *PostHog snippet MISSING* → the live build stopped injecting the tag. Check
     the deploy actually shipped, and that the build injects the snippet into
     **every** page (this was the original month-long outage). See the one rule
     below.
   - *api_host WRONG (region flip)* → set the `VITE_POSTHOG_API_HOST` repo
     variable to `https://eu.i.posthog.com` and make sure the build reads it.
   - *token MISMATCH* → align the live token with the `VITE_POSTHOG_PROJECT_TOKEN`
     repo variable (or update the variable if the token legitimately changed).
   - *GA loader MISSING* → the `gtag` snippet fell off; restore it in the build.
   - *could not fetch / HTTP 404* → the page or the whole site is down or moved.
5. **Redeploy, then re-run** the workflow (manual dispatch) to confirm green.

If a page was intentionally removed or added, **update the `PAGES` list** at the
top of `scripts/verify-live-analytics.mjs`.

## The ONE rule for replacing the site

**Your new site may change everything else — framework, build tool, file layout,
copy, design. This check only cares that the live pages carry the analytics
tags.**

When you swap the build:

- Keep `vercel.json`'s `buildCommand` analytics **injector**, **or** inline the
  PostHog + GA snippet directly into every page's `<head>`. Either is fine — the
  guardrail doesn't care *how* the tags get there, only that they're **live**.
- Keep `api_host` on **`https://eu.i.posthog.com`** and the token on the expected
  `phc_…` value.
- If your new site's live URLs change, update the `PAGES` list in
  `scripts/verify-live-analytics.mjs`.

Then let the guardrail tell you if you got it wrong. A green run means real users
are being measured; a red run means analytics is broken **before** it costs you
another silent month.
