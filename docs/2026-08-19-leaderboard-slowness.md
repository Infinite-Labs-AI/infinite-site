# Launch Video Leaderboard — "it feels slow" investigation

**Status:** cause identified with high confidence, not yet fixed in production.
**Date:** 2026-08-19
**Written for:** a second opinion. Assume no prior context.

---

## 1. The symptom

The owner reports, repeatedly and after several rounds of fixes:

> "I scroll the leaderboard, I scroll the page, I hover over the leaderboard. Things are a little bit slow."
> "It's still slow man. I think something's wrong. I can't quite picture what is wrong but it's still slow."

Two live pages:

| | |
|---|---|
| Leaderboard | https://infinite.fast/startup-launch-videos/ |
| Study | https://infinite.fast/research/launch-videos/ |

The complaint is about **interaction feel** — scroll and hover — not about a slow first byte.

---

## 2. What the thing is

`infinite.fast` is a marketing site for Infinite, an AI growth product for startup founders.

**It is a hand-written static site.** No framework, no bundler. Repo: `Infinite-Labs-AI/infinite-site`.
`npm run build` = `node scripts/prepare-static-deploy.cjs` → `dist/` → Vercel.

The leaderboard is a public ranking of ~193 startup launch videos from X. It is an SEO/backlink
asset: founders submit a launch video and each ranked startup gets a dofollow link.

Generated at deploy time:

| File | Role |
|---|---|
| `scripts/build-launch-videos.mjs` | entry; fetches a JSON dataset from `api.ultima.inc`, writes both pages |
| `assets/launch-leaderboard.js` | **one renderer run twice** — Node server-renders the table at build; the browser re-renders it on sort/search/page from a ~133 KB JSON blob inlined in the page |
| `scripts/lib/launch-leaderboard-css.mjs` | leaderboard CSS as a string (~24 KB, inlined) |
| `scripts/lib/launch-video-chrome.mjs` | shared nav/footer + `@font-face` |
| `scripts/research/launch-video-index.mjs` | ~1,400 lines generating the study page |
| `.github/scripts/inject-analytics.cjs` | injects GA4 + PostHog into every built page |

Page shape: 50 table rows × 9 columns, ~78 avatar `<img>`, 1,917 DOM nodes, 45 KB gzipped document.

---

## 3. What was already tried (and did NOT fix it)

All of these shipped before the investigation. Listing them so a second opinion doesn't re-suggest them.

1. **Asset caching** — the media bucket served every object `cache-control: no-cache`. Media moved to a
   same-origin `/lv/` path (a `vercel.json` rewrite to Supabase) with `max-age=31536000, immutable`.
   ⚠️ **This only half-worked — see finding C.**
2. **`backdrop-filter: blur(18px)` removed** from the sticky nav.
3. **Hero video paused offscreen** via IntersectionObserver.
4. **`decoding="async"`** on avatars.
5. **`contain: paint` on table rows.** ⚠️ **This is a no-op — see finding D.**
6. **Avatars right-sized** — 76 objects, 215 KB total, largest 5 KB.
7. **Hero video re-encoded** 1,916 KB → 532 KB (1280×720, CRF 33, no audio). It sits under a
   `rgba(10,12,22,.44)→.95` gradient, so quality loss is invisible.
8. **Hero poster** 212 KB → 154 KB.

None of it changed the reported feel.

---

## 4. What was measured and RULED OUT

Benchmarked directly, so a second opinion can skip these:

| Suspect | Measurement | Verdict |
|---|---|---|
| Renderer re-render (resolve + 50 rows + pagers) | **0.23 ms** | irrelevant |
| `JSON.parse` of the 133 KB inlined blob | **0.16 ms**, once, from a deferred script | irrelevant |
| Forced sync layout in `paint()` | zero geometry reads; `querySelector` doesn't flush layout | not present |
| Per-row event handlers | none — one delegated listener | not present |
| Search debounce | 180 ms, no per-keystroke work | fine |
| DOM node count | 1,917 (leaderboard) / 1,242 (study) | small |
| Document transfer | 45 KB gzipped, TTFB ~122–132 ms | fast |
| Avatar weight | ~3 KB each | fine |
| Hover CSS | one row background + one box-shadow | cheap |

**Conclusion: the page's own code is not the problem.**

---

## 5. FINDINGS

### A. PostHog session replay + heatmaps run on 100% of visitors — primary suspect

`.github/scripts/inject-analytics.cjs` calls `posthog.init` with only `api_host`, `ui_host` and
`defaults`. **Nothing is disabled.** The project has replay and heatmaps enabled server-side.

Verified live against `POST /ingest/flags?v=2&config=true`:

```
sessionRecording : ON   sampleRate = null (= 100% of sessions)   urlBlocklist = []
heatmaps         : true
autocapture_opt_out : false
capturePerformance  : { network_timing: true, web_vitals: true }
```

Consequences on a page whose only interactions are scrolling and hovering:

- **Heatmaps** installs a **capture-phase `mousemove` listener on `document`**, with a `clearTimeout`/
  `setTimeout` churned on every event.
- The **scroll manager** installs capture-phase `scroll`, `scrollend` and `resize` listeners.
- **Session replay** loads rrweb (`/ingest/static/recorder.js`), takes a full DOM snapshot of the
  1,917-node page, installs a document-wide MutationObserver, and adds *its own* mousemove sampler
  and scroll recorder.

That is **two document-level mousemove listeners and two scroll listeners nobody here wrote.**

Multiplier: sorting or paging replaces **~1,806 elements** (91.6 KB of HTML) in one `innerHTML` swap.
rrweb must serialise 1,806 removals + 1,806 additions as a mutation batch, every time.

Payload: PostHog `array.js` = 82 KB wire / **256 KB parsed**. GA4 `gtag.js` = 169 KB wire /
**498 KB parsed**. ≈900 KB of uncompressed third-party JS against ~8 KB of our own.

**Proposed fix** — `disable_session_recording: true`, `capture_heatmaps: false`,
`capture_performance: false` at the `posthog.init` call (or turn them off in the PostHog project).
Rationale for it being safe here: this is a *marketing* site; GA4 owns traffic and PostHog owns
in-app product analytics, so no funnel depends on replaying these pages.

**Confidence:** high that it is running; high that it is the dominant client-side cost.
**Not yet proven** to be *the* felt cause — see §7.

### B. The study page never received the asset-path fix

`scripts/research/launch-video-index.mjs:795` and `:804` hardcode absolute bucket URLs rather than
using the `VBASE` constant, so a global `VBASE` change missed them:

- `hero-collage.mp4?v=grid` (532 KB, `preload="auto"`)
- `hero-poster.jpg?v=grid` (159 KB)
- `playbooks/author-river.jpg`

Those URLs still return `cache-control: no-cache`. **700 KB+ re-downloaded on every view** of the
study, from a second origin (extra DNS + TLS). **Fix:** point them at `/lv/…`. Confidence: high, verified.

### C. The `/lv/` proxy is not cached at Vercel's edge — the caching fix only half-worked

Every `/lv/` request returns `x-vercel-cache: MISS`, on repeat, forever. Verified over three
consecutive requests.

Cause: the Supabase upstream sits behind Cloudflare, which sets
`set-cookie: __cf_bm=…; Domain=supabase.co` on **every** response. Vercel's CDN will not store a
response carrying `Set-Cookie`.

Effect: returning visitors are fine (the browser honours `max-age=31536000, immutable`), but every
**first-time** visitor proxies ~80 objects + the video + the poster through Vercel → Supabase, one at
a time.

**Proposed fix:** strip `Set-Cookie` on that path in `vercel.json`. Alternative worth considering:
the avatars total only 215 KB — commit them to the repo and serve them statically, dropping the
third-party origin entirely. Confidence: high, verified.

### D. `contain: paint` on `<tr>` does nothing

`scripts/lib/launch-leaderboard-css.mjs` → `.llb-table tbody tr{contain:paint}`.

Per CSS Containment L2, `contain` does not apply to internal table boxes other than table-cell.
`display: table-row` is excluded. It belongs on `td`. Confidence: high (spec text), **not empirically
verified**.

### E. `table-layout: auto` on 9 columns × 51 rows

`grep table-layout` across `scripts/` and `assets/` returns nothing, so `.llb-table` is `auto`. Auto
layout makes the engine compute intrinsic min/max widths for all **450 `<td>`s** — containing images,
flexboxes, ellipsised text and inline SVG — and redo it on every relayout, including each of ~9 font
swaps during load, and every `paint()`.

Rows already have a fixed `height: 62px`. **Proposed fix:** `table-layout: fixed` + explicit `<col>`
widths. Described as "the biggest layout win available, two lines". Confidence: high, reasoned.

### F. The study page's scroll handler forces a layout every scroll event

`scripts/research/launch-video-index.mjs:1409-1415`:

```js
function onScroll() {
  var h = document.documentElement.scrollHeight - window.innerHeight;  // layout-forcing READ
  prog.style.width = h > 0 ? (window.scrollY / h) * 100 + "%" : "0%";  // layout-dirtying WRITE
  bar.classList.toggle("is-stuck", window.scrollY > window.innerHeight * 0.7);
}
window.addEventListener("scroll", onScroll, { passive: true });
```

Read-after-write across events: each event's `scrollHeight` read flushes the layout the previous
event's `style.width` write dirtied. Not rAF-throttled. Runs on every scroll tick on a 1,242-node page
with 17 `<video>` elements and inline SVG. `.prog i` also transitions **`width`** (a layout property)
and restarts that transition on every scroll event.

**Proposed fix:** cache `scrollHeight`, guard with a `ticking` flag + `requestAnimationFrame`, animate
`transform: scaleX()` with `transform-origin:left`. Confidence: high, reasoned.

### G. IBM Plex Sans ships unsubsetted — 216 KB for the nav pill and the footer

Parsed from the `maxp`/`cmap` tables: **971 glyphs / 891 mapped codepoints** (Latin-Ext + Greek +
Cyrillic + Vietnamese).

| file | woff2 | decompressed |
|---|---|---|
| ibm-plex-sans-400 | 69,952 | 206,244 |
| ibm-plex-sans-600 | 76,604 | 206,264 |
| ibm-plex-sans-700 | 69,420 | 206,184 |
| hanken-grotesk-400 | 13,416 | 32,408 |

IBM Plex Sans is used **only** by `.seo-nav*` and `.wrangle-footer*`. Nine font files (~314 KB) load
with `font-display: swap` and **none are preloaded**; each arrival relayouts the document, which is
expensive because of finding E.

**Options:** subset it (~12 KB each, saves ~180 KB), or use Hanken Grotesk there and delete the family
(saves 216 KB). Confidence: high, verified.

### H. Smaller items

- **Avatar hover** — `.llb-avlink` transitions `box-shadow`, which is not compositable, so each hover
  is a ~120 ms main-thread repaint; the `transform` half promotes/de-promotes a layer per hover.
  Dragging down 78 rows fires these back to back. Same pattern on 20+ footer links.
- **`.llb-timer-dot`** — `animation: llb-pulse 2.4s infinite` animating `box-shadow` spread;
  non-composited, repaints every frame it is on screen, over the video hero.
- **The leaderboard CSS has no `prefers-reduced-motion` block at all** (the study page has one).
- **Sticky table header doesn't stick** — `.llb-table thead th{position:sticky;top:0}` lives inside
  `.llb-scroll{overflow-x:auto}`. Because `overflow-x` isn't `visible`, `overflow-y` computes to
  `auto`, so `.llb-scroll` is the sticky container; it has auto height and never scrolls vertically.
  Nine sticky elements of compositing bookkeeping for zero visible behaviour.
- **Hero video `preload="auto"`** fetches the whole file at high priority during the window that
  decides how the page feels. The IntersectionObserver already calls `play()` on visibility, which
  triggers the load anyway. `preload="none"` proposed.
- **Hero poster is 159 KB** and visible for well under a second. A 1600×900 AVIF/WebP at q≈55 would be
  25–40 KB.

---

## 6. Errors made during this investigation

Recorded so a second opinion does not inherit them:

1. **Claimed the site does not host Space Grotesk.** It does —
   `fonts/infinite-ui/space-grotesk-{500,600,700}.woff2` exist and serve 200 at 12.8 KB. The
   leaderboard's display font was switched to Hanken Grotesk on that false premise, and a comment in
   `launch-video-chrome.mjs` still asserts it.
2. **Reported the hero video as 1 MB.** It was 1.9 MB (a byte-rounding error floored it).
3. **`contain: paint` on `<tr>`** was shipped as a fix and is a no-op (finding D).
4. **The `/lv/` caching fix was reported as working.** It works for returning browsers but not at
   Vercel's edge (finding C).
5. **A first attempt at recompressing the hero poster produced a LARGER file** (212 KB → 247 KB) and
   was briefly live before being measured properly.

---

## 7. What a second opinion should evaluate

1. **Is finding A actually the felt cause, or just the largest number?** ≈900 KB of analytics JS is
   real, but is it what makes *hover* feel bad, versus finding E (`table-layout: auto`) or finding H
   (non-composited hover transitions)? Nobody has produced a profile.
2. **Is disabling session replay the right call for the business**, or should it be sampled / URL-
   blocklisted for these two pages only?
3. **Is there something none of this covers?** The owner's instinct is that "something's wrong" in a
   way that the numbers so far don't fully explain. That instinct has been right so far.
4. **Ordering.** Which of E, A, F is worth doing first if only one gets done?
5. **Is the `Set-Cookie` strip in finding C safe**, or does it break something about the proxied
   responses?

**Nobody has run a browser profile.** Browser automation was unavailable in this session. The single
most valuable next artefact is a Chrome DevTools Performance recording (4× CPU throttle, Fast 4G,
Disable cache) of:

1. Reload of `/startup-launch-videos/` — look for `array.js` / `recorder.js` Evaluate Script, and
   count Layout entries during the font-swap window.
2. Moving the mouse slowly down the table for 5 s, no clicks — a dense band of short tasks implicates
   finding A; Recalculate Style + Paint implicates finding H.
3. Clicking the "Likes" column header — the 1,806-node swap. Repeat with analytics denied to isolate
   rrweb's share.
4. Scrolling `/research/launch-videos/` — watch for "Forced reflow" warnings (finding F).

**A 10-second confirmation of finding A, no profiler needed.** In the console on infinite.fast:

```js
localStorage.setItem("infinite_analytics_consent", "denied"); location.reload();
```

The `__infiniteConsentGate` wrapper returns early on `"denied"`, so PostHog and GA4 never initialise.
If the page suddenly feels fine, finding A is confirmed and most of the rest is polish.

---

## 8. Constraints — do not "optimise" these away

These are load-bearing for the business, not preferences:

1. **The full ranking must stay in the server-rendered HTML** (50 rows on page one). Crawlers and LLMs
   that never run JavaScript must read every ranked startup — that IS the asset. No client-only
   rendering, no JS skeleton, no lazy-mounted rows. Hiding a column with CSS is fine; omitting it from
   the markup is not.
2. **Links to each startup must stay `dofollow`.** That backlink is what a founder is paid in for
   submitting. Never add `rel="nofollow"`.
3. **One renderer, two environments.** `assets/launch-leaderboard.js` runs in BOTH Node (build) and the
   browser. It must stay a plain script assigning to the global. Do not split it — the two copies
   would drift.
4. **No frameworks, bundlers or npm UI dependencies.** The repo is deliberately hand-written.
5. **The CSP is strict:** `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`,
   `font-src 'self'` (so **no Google Fonts** — every face must be a local woff2), `img-src 'self' data: https:`,
   `media-src 'self' <supabase bucket>`.
6. **Do not change the desktop design.** It is signed off. Mobile work must be additive.
7. **No fallbacks that mask failures** (house rule) — prefer failing loudly.

---

## 9. Reproduction

```bash
git clone git@github.com:Infinite-Labs-AI/infinite-site.git && cd infinite-site && npm ci

# Build both pages without the live API:
node .github/scripts/fixtures/serve-dataset.mjs 200      # prints PORT=<n>
LAUNCH_VIDEOS_DATASET_URL=http://127.0.0.1:<n>/ node scripts/build-launch-videos.mjs /tmp/lvdist
open /tmp/lvdist/startup-launch-videos/index.html

# Contract tests — all seven must pass before shipping anything:
for f in .github/scripts/test-*.mjs; do echo "== $f"; node "$f" || break; done
```

`test-launch-video-pages.mjs` asserts the ranking is server-rendered, that links are not `nofollow`,
and that hostile submitted data stays escaped. Any change to `rowHtml` must keep it passing.

---

## 10. Current state

- Findings A and C have fixes written on branch `perf/2026-08-19-analytics-weight`, **not merged**.
- Findings B, D, E, F, G, H are **not fixed** — a separate agent is editing the CSS, the build script
  and the study generator for mobile responsiveness, and touching them concurrently would collide.
- Nothing here has been verified in a real browser by anyone.
