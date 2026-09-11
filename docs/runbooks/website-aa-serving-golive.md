# A/A serving go-live runbook (infinite.fast homepage)

The founder + validator drive every step below. This repo branch
(`feature/2026-09-11-website-aa-serving`) is **dormant**: with the shipped empty
manifest, or `INFINITE_EXPERIMENTS_ENABLED` unset, every visitor gets the
untouched homepage. Nothing here is autonomous — the deploy is a human PR, never
the sealed GitHubPublisher (A.7 stays sealed).

Coordinates: workspace `4cff9e34-59c3-458e-9df9-8c676741bbe7`, host `infinite.fast`,
SITE Vercel project `prj_ouLsgX7HVm33TQjXNvN8ZoVVcJQp`, Supabase `wdxjduorvpayxixpmskf`.
Production site source key: **`site_e603190d2f6b46648771e7e49e3c341b`**
(`analytics_site_sources` row `66503484-…`, `ingest_environment='production'`,
`enabled=true`; the other two rows for this workspace are synthetic fixtures).

**The order is fixed and the steps are numbered in the only order that works:**

1. author `config.mjs` from a **production-env-identical** build (§2);
2. merge it **dormant** to production, `INFINITE_EXPERIMENTS_ENABLED` unset (§3);
3. **create** the experiment against **production** as it then serves (§4);
4. **mark-ready** + **rehearse on production** (§5);
5. **launch** — the engine flips `INFINITE_EXPERIMENTS_ENABLED=1` for go-live (§6).

There is **no preview rehearsal** (§3 says why). Two earlier drafts of this runbook got
the order wrong in ways that fail closed but fail every time: authoring from a bare local
build (§2) and creating before the dormant merge (§4). Both are explained at the step.

---

## 0. The experiment ↔ manifest coupling (why the order above is fixed)

The **operator declares the experiment id; the engine admits it** (candidate-bound
admission). For an A/A ("create") the operator mints the UUID and passes it, and
`reserve_website_experiment` is idempotent on it
(`1bu-1 src/lib/site-optimization/lifecycle/service.ts:1289`,
`scripts/website-experiment.mts:593`). The engine does **not** mint the id.

The engine reserves a `website_experiments` row + an immutable
`website_experiment_revisions` row that freezes:
- `control_artifact` / `candidate_artifact` = the **pre-decoration** page hash, which the
  engine reads **itself** from the LIVE canonical URL at create time
  (`service.ts:1280-1291` `observeBytes` → `controlArtifact: original, candidateArtifact:
  original`). It refuses if the live page already carries an experiment marker
  (`original_not_served`) or is not a 200 (`original_unobservable`); and
- `control_sha256` / `candidate_sha256` = the **decorated served** hashes, which the
  operator **passes in** as `--control` / `--candidate` (`route.ts:48`
  `served:{control,candidate}`; `website-experiment.mts:633-638`; `service.ts:1255,1288`
  reject equal arms or an arm equal to the original as `artifact_identity_invalid`).
  The engine never fetches them.

Every later verification judges the deployed site against exactly that pair
(`service.ts:320-323` `artifacts()`): a fresh person's rewritten arm must hash to the
passed decorated sha256 **and** its marker's `contentSha256` must equal the
`controlArtifact` the engine observed live. So the bytes the engine observes at create
must be the very bytes the deployed build decorates — which is what pins the order:
**author from production bytes (§2), deploy them (§3), then create against them (§4).**

The decorated per-arm hash embeds `{experimentId, revision, pagePath, variant,
contentSha256}` in the marker (`lib/infinite-experiments/build-artifacts.mjs:55`) — the
dates do **not** enter it — so the site must be built with the chosen id first. The
committed `config.mjs` then carries both hashes: `variants.control.sha256` (→ `--control`)
and `variants.test.sha256` (→ `--candidate`).

A/A design: `design:"aa"` — both arms are the original, decorated twice
(`service.ts:1254,1291`). Route accepts it at `route.ts:47`.

**Proof caveat (must-read).** The exposure route verifies an **ECDSA** assignment
proof only for revisions where a proof manifest has been registered
(`exposure/route.ts:39-41`, `exposure_proof_required` is a one-way flag). Our shipped
serving runtime signs assignments with **HMAC only** and emits no ECDSA proof, so the
beacon carries none. For this pilot **do not register a proof manifest** for the
revision: `proof_required` stays false, the beacon is accepted and recorded unverified
(HTTP 202). Registering a manifest would make the same beacon `invalid_exposure`.

**Consent (opt-out, mirrors the site — no new UI).** The site's analytics are
`not_required` (`inject-analytics.cjs:47`) with an opt-out state machine that
already gates GA4/PostHog/pixel (`inject-analytics.cjs:224-241`
`__infiniteConsentGate`): a fresh visitor is collected **on load**; an explicit
stored `infinite_analytics_consent="denied"` is never collected; a bare DNT/GPC
signal without a stored grant **waits** — it is not collected and it is **not** stored
as a denial. The serving mirrors this **exactly** and adds **no banner, no prompt, no
new storage**:
- the router is constructed with `consentMode:"not_required"`
  (`middleware.js` `EXPERIMENT_ROUTER_OPTIONS`, overriding the emitter's hard-coded
  `"required"`, which config.mjs keeps as pure emitter output) → a fresh visitor
  **enrolls on the first request**; an `infinite_experiment_consent="denied"` cookie ⇒
  `consent_denied`, a DNT/GPC header without an explicit grant ⇒ `privacy_signal`
  (`runtime.mjs:142-146`);
- the injected client runs with `consentMode:"not_required"` and reads the site's
  EXISTING key `infinite_analytics_consent` + DNT/GPC (`client.mjs:31-44`) →
  a fresh visitor's beacon records on load (`consentState:"not_required"`); an
  **explicit** opt-out suppresses the beacon, persists `infinite_experiment_consent=
  denied` for the router and expires the person/assignment cookies; a **bare DNT/GPC
  signal** suppresses the beacon for that visit and **writes nothing** (`client.mjs:59-70`
  — the site gate treats a signal as "wait", so does this; a stale `granted` cookie the
  page can no longer vouch for is expired so the router never enrols on it).

Pinned by `.github/scripts/test-experiment-consent.mjs` (CI matrix): the override's
spread order, the bootstrap's `not_required`, and opt-out parity on both sides (fresh ⇒
enroll + beacon; explicit deny ⇒ neither; DNT ⇒ neither and no cookie; GPC ⇒ same).

---

## 1. Prerequisites (engine env, site env, connections)

**Engine env** (on `api.ultima.inc`, the 1bu-1 deployment):
- `WEBSITE_EXPERIMENTS_ENABLED=1` — gates create/mark_ready/rehearse/launch and the
  exposure beacon; anything else = `lane_off` 404 (`experiments/route.ts`,
  `exposure/route.ts:64`). Emergency actions (kill/rollback/settle/halt/resume) work
  with it off.
- `WEBSITE_PILOT_WORKSPACE_ID=4cff9e34-59c3-458e-9df9-8c676741bbe7` — every lifecycle
  action and every exposure is refused unless the workspace matches
  (`service.ts:1253` `experiments_pilot_only`; `exposure/route.ts:85-88`
  `source_forbidden`).

**Engine connections** (the engine reads and WRITES production through these — see §5):
- a **repository connection** with adapter `vercel-static`, `status='connected'`,
  `productionHost='infinite.fast'`, bound to the production site source
  (`service.ts:298-304` `sourceOf`) — without it `create` refuses `connection_unavailable`;
- a **Vercel hosting connection** (`status='connected'`, with an encrypted integration
  grant) bound to that repository (`service.ts:309-313` `binding`) — without it
  `rehearse` and `launch` refuse `connection_unavailable`. The grant is what lets the engine
  set `INFINITE_EXPERIMENTS_ENABLED` and redeploy production itself
  (`hosting/control.ts:179` `setSwitch`, `:213` `redeployProduction`).

**SITE Vercel env** (project `prj_ouLsgX7HVm33TQjXNvN8ZoVVcJQp`), production target only:

| Variable | Production |
|---|---|
| `INFINITE_EXPERIMENTS_SIGNING_SECRET` | random ≥ 32 chars — set **before** §5 (the rehearsal's redeploys pick it up; without it the router passes `invalid_configuration`, i.e. original) |
| `INFINITE_EXPERIMENTS_ENABLED` | **unset** through §2-§4. From §5 on the **engine** writes it (`1` for the arms-served half / go-live, `0` for the original-served half); the human only ever writes it to kill (§7) |
| `INFINITE_EXPERIMENTS_ALLOW_PREVIEW` | **never set** (there is no preview rehearsal) |
| `INFINITE_SITE_SOURCE_KEY` | `site_e603190d2f6b46648771e7e49e3c341b` (already set for the pixel) |

`INFINITE_EXPERIMENTS_ENABLED` is the only switch that starts/stops a test. Rotating the
signing secret invalidates live assignments (those visitors fall back to original); it is
not an off switch.

---

## 2. Author config.mjs from a PRODUCTION-ENV-IDENTICAL build (local, crossing-free)

**Why a bare local build is wrong.** The built homepage bytes are **env-dependent**:
`.github/scripts/inject-analytics.cjs:8,14` embed the site source key only when
`VERCEL_ENV=production`, and `:57-58` embed the X/Meta pixel ids from env. A bare
`node scripts/prepare-static-deploy.cjs` therefore produces a **different**
`dist/index.html` from Vercel's production build (measured on this branch: bare
`ddfc25bf…` vs production-env `11f36148…`; each is deterministic run-to-run). A
`config.mjs` authored from the bare build freezes the wrong `contentSha256`; on the
next production deploy `scripts/build-experiment-artifacts.mjs:34-43` `assertEmitterMatch`
re-emits the manifest from Vercel's own bytes, finds it differs and **throws** — the build
fails closed, production keeps serving the PREVIOUS deployment, and **every subsequent
deploy fails the same way until `config.mjs` is re-authored**. Preview bytes differ from
production bytes for the same reason (no source key on preview), so a preview build can
never author it either.

**Do this instead** — reproduce Vercel's production build exactly (`vercel.json`:
`npm ci` + `node scripts/prepare-static-deploy.cjs`), with the production env:

```
# 1. the SITE project's production env, pulled OUTSIDE the repo (it contains secrets; never commit it)
vercel link --project prj_ouLsgX7HVm33TQjXNvN8ZoVVcJQp      # once
vercel env pull ~/site.production.env --environment=production

# 2. the same build, same env, same Node major as the Vercel project setting
set -a; . ~/site.production.env; set +a
export VERCEL_ENV=production                               # Vercel sets this itself; set it explicitly
npm ci
node scripts/prepare-static-deploy.cjs                     # dist/index.html = production bytes, pre-injection

# 3. PROD-IDENTITY CHECK before authoring: the branch's homepage must hash-equal what
#    production serves today (this branch changes no homepage bytes; only the serving layer)
shasum -a 256 dist/index.html
curl -sS -H 'Accept: text/html' https://infinite.fast/ | shasum -a 256
#    → the two digests MUST be equal. If not, the local env is not production's (or main moved):
#      STOP, do not author.

# 4. author (the pre-injection dist/index.html is what emit injects and hashes)
uuidgen | tr 'A-F' 'a-f'                                    # mint the experiment id, keep it
node scripts/emit-experiment-config.mjs \
  --id <that-uuid> --revision 1 \
  --starts-at <ms> --enrollment-ends-at <ms> --ends-at <ms>
```

`emit-experiment-config.mjs` injects the exposure bootstrap into the final homepage,
builds the arms, writes `lib/infinite-experiments/config.mjs` via the single emitter
(`renderServingConfig`), and **prints** `originalContentSha256` (= sha256 of the INJECTED
homepage: what production will serve after §3 and what the engine will observe in §4),
`variants.control.sha256` (→ `--control`) and `variants.test.sha256` (→ `--candidate`).
**Commit `config.mjs` and nothing else** (dist is untracked).

Dates: the marker carries no dates, so they never change the hashes. Mirror the engine's own
formula (`lifecycle/launch-manifest.ts:51-52`): `enrollmentEndsAt = startsAt +
plan.durationDays·DAY`, `endsAt = enrollmentEndsAt + plan.attributionDays·DAY`, with
`startsAt` at or before the intended go-live instant. `durationDays`/`attributionDays` are
in the `create` output (§4); if they differ from what you froze, re-run the emit with the
corrected dates (same hashes) and re-commit before §5.

(The engine's own emitter `launch-manifest.ts:39` renders the identical `config.mjs`
bytes from the same `{experiment, artifacts, productionHosts, startsAt}` — it is the same
`renderServingConfig`, vendored byte-faithfully at `scripts/lib/render-serving-config.mjs`
— but it takes the arm hashes as input rather than building them, so it cannot replace this
build; it is a cross-check, not an alternative.)

The build then self-checks on every deploy: `scripts/build-experiment-artifacts.mjs`
rebuilds the arms and asserts the re-emitted manifest is byte-identical to committed
`config.mjs` — a homepage change under a frozen manifest **fails the build closed**.

---

## 3. Merge DORMANT to production (`INFINITE_EXPERIMENTS_ENABLED` unset)

Open the PR from this branch into the site's default branch **with the authored
`config.mjs` from §2**. Expect the PR's Vercel **preview** build to FAIL — preview bytes ≠
production bytes (§2), and `experiment-build.mjs:87-89` requires `INFINITE_SITE_SOURCE_KEY`
which preview does not embed. That failure is the fail-closed check doing its job on the
wrong target; it is not a signal about production. **There is no preview rehearsal**
(the byte divergence and the create ordering in §4 both break it). Merge; production
auto-deploys via Vercel; the production build must be GREEN (`[experiments] built 2 arm
file(s) …; config.mjs verified` in the build log — a red production build means §2 was not
production-identical: production keeps the previous deployment, go back to §2).

**What "dormant" now means — accurately.** With `INFINITE_EXPERIMENTS_ENABLED` unset the
router passes every visitor to the original page (`runtime.mjs:130` `pass('disabled')`),
so nobody is enrolled, no cookie is set and no arm is served. But the merged-dormant
homepage is **not byte-identical to the old one, and not inert**: "inert / byte-identical"
is true only for the EMPTY manifest. With the manifest AUTHORED:

- (a) the homepage **carries the bootstrap** — `<script type="module">` importing
  `/assets/infinite-experiments/client.mjs` before `</body>`
  (`scripts/lib/experiment-build.mjs:100-104`). The client runs on every visit: with no
  marker meta it records no beacon; it bridges consent (an explicitly opted-out visitor gets
  the `infinite_experiment_consent=denied` cookie; everyone else gets nothing);
- (b) every `/` response gets `cache-control: private, no-store, max-age=0`,
  `cdn-cache-control: no-store`, `vercel-cdn-cache-control: no-store` and `vary: Cookie`
  (`runtime.mjs:124` builds them for any configured path BEFORE the enabled check at
  `:130`; `vercel.mjs:12-23` merges them onto the pass-through). **The homepage is
  CDN-uncacheable from the merge on**, ENABLED or not: every `/` request runs the edge
  middleware and reaches the static origin uncached. Expect the homepage TTFB and the
  Vercel edge-request/bandwidth numbers to move at the merge, not at go-live; the kill switch
  (§7) does NOT restore caching — only an empty manifest does.
- The two arm files exist in dist but the middleware 404s `/__infinite_experiments/…`
  (`vercel.mjs:4-6`); the client module at `/assets/infinite-experiments/client.mjs` is
  public.

**Post-merge live checks** (validator, read-only):

```
curl -sS -D - -o /tmp/home.html -H 'Accept: text/html' https://infinite.fast/
shasum -a 256 /tmp/home.html            # MUST equal originalContentSha256 in config.mjs
grep -c 'infinite-experiments/client.mjs' /tmp/home.html      # 1 (bootstrap present)
grep -c 'name="infinite-experiment"'   /tmp/home.html          # 0 (no marker: original)
# headers: cache-control: private, no-store, max-age=0 / vary: Cookie present; NO set-cookie
curl -sS -o /dev/null -w '%{http_code}\n' https://infinite.fast/__infinite_experiments/<id>/1/control.html   # 404
```

If the digest does not match `originalContentSha256`, production is not serving the bytes
`config.mjs` froze — do not proceed to §4.

---

## 4. Create the experiment against PRODUCTION (prod DB write — NOT crossing-free)

**Why create must come AFTER the dormant merge.** `create` freezes `controlArtifact =
sha256(homepage LIVE at create time)` (`service.ts:1282-1291`). Before §3 the live page is
the plain homepage (`H_plain`); after §3 it is the injected one (`H_injected` =
`originalContentSha256`). Every serving verification — the rehearsal's arms-served and
original-served halves, the launch, the monitor — compares what production serves against
`controlArtifact` (`service.ts:320-323`). Created against the plain page,
`controlArtifact = H_plain ≠ H_injected`: `verifyOriginalServed` never matches, the
rollback rehearsal never resolves, `assessLaunch` refuses, launch never passes. Created
after §3 the live page is marker-free (so `original_not_served` does not fire) and hashes
to `H_injected` — the same bytes both arms decorate.

Creating writes `website_experiments` + `website_experiment_revisions`
(`service.ts:1289` → `reserve_website_experiment`). It requires the lane ON, the pilot
scope and the connections in §1, so it is done deliberately by the operator, not from this
branch. Mechanism — the operator CLI `scripts/website-experiment.mts` (POST
`/api/site-optimization/experiments`). The decorated hashes are read **from the committed
`config.mjs`** (`variants.control.sha256` / `variants.test.sha256`):

```
npx tsx scripts/website-experiment.mts create --project <engine-project-id> \
  --experiment <the-uuid-from-§2> \
  --site 66503484-<the production analytics_site_sources id> --page / \
  --goal <conversion-taxonomy goal key> --min-effect <e.g. 0.2> \
  --control   <config.mjs variants.control.sha256> \
  --candidate <config.mjs variants.test.sha256>
# → website_experiments row, state "preparing"; output includes original.contentSha256 (MUST equal
#   config.mjs originalContentSha256) and the plan's durationDays / attributionDays (→ §2 dates)
npx tsx scripts/website-experiment.mts mark-ready --project … --experiment … --revision 1
# preparing → ready (service.ts:1310); asserts no fact
```

(`create` takes no dates and no `--design`: the design is `aa` in the route body, the plan is
proposed by the engine from the baseline cohort; `website-experiment.mts:516,608-638`.)

State path for an A/A: `preparing → ready → (rehearse) → launching → running`
(`contracts.ts`; CLI `create`/`mark-ready`/`rehearse`/`launch` at
`website-experiment.mts:425-444`). The A/B binding gate explicitly does **not** launch an
A/A calibration; the A/A goes live through the readiness/rehearsal path
(`service.ts:365-393` `buildReadiness` → `assessLaunch`), which consumes ONLY the
rehearsal's own receipts (`control_serving`/`test_serving`, ruling R58) — nothing is read
live at launch time, and no human action can substitute for those receipts.

---

## 5. Rehearse ON PRODUCTION (the env-flip dance, spelled out)

`rehearse` (`website-experiment.mts:435` → `service.ts:714-733` `rehearseRollback`) runs
only from `ready` with no exposure yet recorded and no effect in flight. It is **one route
call that drives two production redeploys with an env flip between them**, because the
rollback rehearsal needs two facts that cannot be observed from one deployment:

1. **Arms-served half** — needs `INFINITE_EXPERIMENTS_ENABLED=1` **deployed**. The engine
   records serving-intent ON, writes the SITE production env
   `INFINITE_EXPERIMENTS_ENABLED=1` through the Vercel grant (`service.ts:922`
   `setSwitch`), triggers a **production redeploy** of the verified commit (`:930-936`
   `redeployProduction`), then fetches `https://infinite.fast/` as 24 fresh persons and
   requires BOTH arms observed served (`:953-955` `verifyArmsServed`: rewritten arm hashes
   to `--control`/`--candidate`, marker `contentSha256` = `controlArtifact`). Receipt:
   `test_serving` (`bothArmsServed`, `rollbackVerified` once the second half exists).
2. **Original-served half** — needs `INFINITE_EXPERIMENTS_ENABLED` **off, deployed**. The
   engine records serving-intent OFF, writes `INFINITE_EXPERIMENTS_ENABLED=0`, triggers a
   second **production redeploy**, then requires the untouched original served to fresh
   persons (`:949-951` `verifyOriginalServed`: full-body sha256 = `controlArtifact`,
   no marker). Receipt: `control_serving` (`originalServed`).

Both receipts land on this revision; `buildReadiness` consumes them within `liveMaxAgeMs`
(a stale rehearsal cannot launch anything). **Production ends exactly where the cycle found
it: switched off** — the second half runs whatever the first half showed (`:723-732`).

**The human's part of the dance:**
- Before: `INFINITE_EXPERIMENTS_ENABLED` unset/`0` on production; the signing secret set (§1).
- During: **do not hand-flip the switch or redeploy** from the Vercel dashboard. A reconcile
  reads the switch and, if it does not hold the effect's value, leaves the row `unknown`
  (`:906-916`, ruling R82); a hand flip mid-cycle strands the half.
- After: confirm on the Vercel dashboard that production `INFINITE_EXPERIMENTS_ENABLED`
  reads `0` and the latest production deployment is READY; confirm with the §3 curl block
  that `/` serves the original (digest = `originalContentSha256`, no marker, no cookie).
  Read the CLI output: `armsServed.status` and `original.status` both `resolved`,
  `readiness.buildVerified` and `readiness.rollbackVerified` true.
- If either half ends `cancelled`/`unknown`: run `settle`, fix the cause, `rehearse` again
  (the switch is off either way; nothing is live).

**Real visitors during the arms-served half.** For the minutes ENABLED=1 is deployed, real
visitors ARE enrolled (person + assignment cookies, arm served, beacon posted). For an A/A
the served bytes are the original either way, so nothing is visible. Their exposures are
recorded under the revision but the launch receipt counts only exposures after
`launchRequestedAt` (`service.ts:946,960`); their retained assignments simply resume
(`retained_assignment`) when §6 turns serving on again.

**If `rehearse` refuses `connection_unavailable`**, the Vercel hosting connection/grant
in §1 is missing. There is no manual substitute: a human env flip + redeploy produces no
`control_serving`/`test_serving` receipt, and `assessLaunch` refuses without them. Fix the
connection, then rehearse.

**Target-match (validator, during the arms-served half or at §6):** `verifyServedBytes`
(`1bu-1 src/lib/site-optimization/serving/verify-bytes.ts:118`) on `https://infinite.fast/`
for each arm, presenting that arm's cookies, asserting `matched === true`
(`contentSha256 === expect.contentSha256`, status 200):
- **control**: `verifyServedBytes("https://infinite.fast/", { contentSha256: <originalContentSha256>, personCookie, assignmentCookie: <__Host-infinite-exp-… for control>, consentCookie: "infinite_experiment_consent=granted" })`
- **test**: same with the test assignment cookie.
- **original escape**: `https://infinite.fast/?__infinite_original=1` must serve the plain
  page (no marker) — the escape can only remove treatment (`runtime.mjs:128`).

Cookie-attribute assertion on a fresh navigation (no cookies) while enabled: the response
sets `__Host-infinite-person=<32-hex>` with `Secure; Path=/; SameSite=Lax` and **no
`HttpOnly`** (readable, so `/get-started` forwards it as `experimentPersonId` — G2).
Verified locally and pinned in `test-experiment-consent.mjs`: two `Set-Cookie` headers,
person cookie 32-hex + Secure + Path=/ + non-HttpOnly.

Confirm the exposure beacon POSTs to `/infinite/experiment` and the engine records it (lane
ON, pilot scope), and no proof manifest is registered.

---

## 6. Go-live (the watched crossing)

The validator confirms readiness (§5 receipts resolved, `buildVerified` +
`rollbackVerified` true, exposure tables applied — Blockers 3), then:
1. Engine `launch` (`website-experiment.mts:444` → `service.ts:392-404` `requestLaunch`):
   `assessLaunch` must pass on the rehearsal receipts; the engine then records intent ON,
   writes `INFINITE_EXPERIMENTS_ENABLED=1` on production and **redeploys** (the same
   `setSwitch` + `redeployProduction` path as the arms-served half) — this is the flip.
   A human setting `1` first is redundant: `setSwitch` is idempotent and the engine
   redeploys regardless.
2. **Target-match gate**: the validator re-runs the §5 `verifyServedBytes` block on
   `https://infinite.fast/` for both arms — this is the deploy's target-match.
3. `ready → launching`; the `test_serving` receipt resolves once both arms are observed served
   AND the first human exposure after `launchRequestedAt` is recorded (`service.ts:946,960-961`
   — it stays deferred until then) → `running`; that first exposure sets the running clock.

## 7. Kill switch (one flip)

Set `INFINITE_EXPERIMENTS_ENABLED` to anything ≠ `"1"` (or unset) on the SITE
production env and redeploy — from the Vercel dashboard, or engine `kill`/`rollback`
(`route.ts` `LANE_OFF_ACTIONS`, work even with the lane off). Fresh and returning visitors
alike get the original page immediately (`runtime.mjs:130` `pass('disabled')`). After a
dashboard kill the engine can never turn serving back on by reconciling (ruling R82,
`service.ts:906-916`: a reconcile only READS the switch). The kill does not restore
homepage CDN caching (§3(b)); only merging an empty manifest does.

---

## Blockers (cannot be done crossing-free)

1. **Experiment create is a prod DB write** (`website_experiments` /
   `website_experiment_revisions`) requiring `WEBSITE_EXPERIMENTS_ENABLED=1` +
   pilot scope — §4. Deferred to the operator; not performed on this branch.
2. **`WEBSITE_EXPERIMENTS_ENABLED` / `WEBSITE_PILOT_WORKSPACE_ID` on the engine**, the
   repository + Vercel hosting connections (§1), and the SITE Vercel env changes —
   human-set, not touched here.
3. **Exposure/manifest migrations on prod.** The exposure route
   (`src/app/api/site-optimization/exposure/route.ts`) records through
   `record_website_exposure`; the exposure tables
   (`20260906215026_website_experiment_exposures.sql`) must be applied on prod for
   the recorded path. Validator confirms before §5 (the rehearsal's `exposureVerified`
   reads them).
4. **Do not register a proof manifest** for the pilot revision, or the HMAC-only
   beacon is rejected (see §0 proof caveat).
5. **The production build for the go-live PR must be authored from production bytes** (§2)
   or the deploy fails closed and blocks every later deploy until re-authored.
