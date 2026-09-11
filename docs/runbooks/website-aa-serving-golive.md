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

---

## 0. The experiment ↔ manifest coupling (why the order below is fixed)

The **operator declares the experiment id; the engine admits it** (candidate-bound
admission). For an A/A ("create") the operator mints the UUID and passes it, and
`reserve_website_experiment` is idempotent on it
(`1bu-1 src/lib/site-optimization/lifecycle/service.ts:120`,
`scripts/website-experiment.mts:593`). The engine does **not** mint the id.

The engine reserves a `website_experiments` row + an immutable
`website_experiment_revisions` row that freezes:
- `control_artifact` / `candidate_artifact` = the **pre-decoration** page hash (for
  an A/A both equal the original — `service.ts:1301` `controlArtifact: original,
  candidateArtifact: original`), and
- `control_sha256` / `candidate_sha256` = the **decorated served** hashes, which the
  operator **passes in** as `--control` / `--candidate`
  (`route.ts:46-48` `served:{control,candidate}`; `website-experiment.mts:635`;
  `service.ts:1264` rejects equal arms `artifact_identity_invalid`). The engine
  never fetches them.

So the **site must be built with the chosen id first**, because the decorated
per-arm hash embeds the id+revision+variant in the marker. Our builder prints them:
`variants.control.sha256` / `variants.test.sha256` (see step 2). At create time the
engine also fetches the **live** homepage and refuses if it already carries an
experiment marker (`service.ts:1284` `original_not_served`) — so create must run
while prod still serves the plain page (i.e. before go-live).

A/A design: `design:"aa"` — both arms are the original, decorated twice
(`service.ts:126,1254,1287`). Route accepts it at `route.ts:47`.

**Proof caveat (must-read).** The exposure route verifies an **ECDSA** assignment
proof only for revisions where a proof manifest has been registered
(`exposure/route.ts:110`, `exposure/manifest-source.ts:14`). Our shipped serving
runtime signs assignments with **HMAC only** and emits no ECDSA proof
(`runtime-source.ts:97-120`), so the beacon carries none. For this pilot **do not
register a proof manifest** for the revision: `proof_required` stays false, the
beacon is accepted and recorded unverified (HTTP 202, `route.ts:44-46`). Registering
a manifest would make the same beacon `invalid_exposure` (`route.ts:113-114`).

**Consent gotcha.** The site's analytics policy is `not_required`
(`.github/scripts/inject-analytics.cjs:47`) but the serving router's `config.mjs`
is `consentMode:"required"`. So the A/A **only enrolls visitors who explicitly
grant** via the site banner (event `infinite:analytics-consent-change` / storage
`infinite_analytics_consent`). Undecided visitors get the original page and no
assignment. Expect lower enrollment than raw traffic; this is intended and safe.

---

## 1. Engine-side: create the A/A (prod DB write — NOT crossing-free)

Creating the experiment writes `website_experiments` + `website_experiment_revisions`
(`service.ts:1300` → `reserve_website_experiment`). It requires the lane ON and the
pilot scope, so it is done deliberately by the operator, not from this branch.

Engine env (on `api.ultima.inc`, the 1bu-1 deployment) before creating:
- `WEBSITE_EXPERIMENTS_ENABLED=1` — gates create/mark_ready/rehearse/launch and the
  exposure beacon; anything else = `lane_off` 404 (`experiments/route.ts:125`,
  `exposure/route.ts:63`). Emergency actions (kill/rollback/settle/halt/resume) work
  with it off.
- `WEBSITE_PILOT_WORKSPACE_ID=4cff9e34-59c3-458e-9df9-8c676741bbe7` — every lifecycle
  action and every exposure is refused unless the workspace matches
  (`service.ts:1262` `experiments_pilot_only`; `exposure/route.ts:86-89`
  `source_forbidden`).

Mechanism — the operator CLI `scripts/website-experiment.mts` (POST
`/api/site-optimization/experiments`, `route.ts:120`). **The decorated hashes come
from step 2's build**, so run step 2 first, then:

```
uuidgen | tr 'A-F' 'a-f'        # mint the experiment id
node scripts/website-experiment.mts create \
  --engine-project <active-project-id> \
  --experiment <that-uuid> \
  --design aa --page / \
  --control  <variants.control.sha256 from step 2> \
  --candidate <variants.test.sha256  from step 2> \
  --starts-at <ms> --enrollment-ends-at <ms> --ends-at <ms>
# → website_experiments row, state "preparing"
node scripts/website-experiment.mts mark-ready ...   # preparing → ready (service.ts:1311)
```

State path for an A/A: `preparing → ready → (rehearse) → launching → running`
(`contracts.ts:7`; CLI `create`/`mark-ready`/`rehearse`/`launch` at
`website-experiment.mts:425,430,435,444`). Note the A/B binding gate
(`launch-server.ts:46-49`) explicitly does **not** launch an A/A calibration; the
A/A goes live through the readiness/rehearsal path (`service.ts:383` `armsServedProof`),
which requires the deployed site to already serve **both arms** (verified by the
`rehearse` receipts, `service.ts:729,890`). Hence the preview rehearsal in step 4.

---

## 2. Author config.mjs + read the served hashes (local, crossing-free)

On the branch, with the production pixel key exported (public key, safe to hold):

```
node scripts/prepare-static-deploy.cjs                 # build dist/index.html (dormant)
INFINITE_SITE_SOURCE_KEY=site_e603190d2f6b46648771e7e49e3c341b \
  node scripts/emit-experiment-config.mjs \
  --id <that-uuid> --revision 1 \
  --starts-at <ms> --enrollment-ends-at <ms> --ends-at <ms>
```

This injects the exposure client into the final homepage, builds the arms, writes
`lib/infinite-experiments/config.mjs` via the single emitter (`renderServingConfig`),
and **prints** `variants.control.sha256` (→ `--control`) and `variants.test.sha256`
(→ `--candidate`) for step 1. Commit the resulting `config.mjs`. (Equivalently, take
the authoritative `config.mjs` bytes straight from the engine's own emitter,
`launch-manifest.ts:39`, and commit those.)

The build then self-checks on every deploy: `scripts/build-experiment-artifacts.mjs`
rebuilds the arms and asserts the re-emitted manifest is byte-identical to committed
`config.mjs` — a homepage change under a frozen manifest **fails the build closed**.

---

## 3. SITE Vercel env (project `prj_ouLsgX7HVm33TQjXNvN8ZoVVcJQp`)

| Variable | Production | Preview (rehearsal only) |
|---|---|---|
| `INFINITE_EXPERIMENTS_SIGNING_SECRET` | random ≥ 32 chars | same value |
| `INFINITE_EXPERIMENTS_ENABLED` | **unset** until go-live (step 6) | `1` for the rehearsal |
| `INFINITE_EXPERIMENTS_ALLOW_PREVIEW` | **never set** | `1` on the preview target only |
| `INFINITE_SITE_SOURCE_KEY` | `site_e603190d2f6b46648771e7e49e3c341b` (already set for the pixel) | same |

`INFINITE_EXPERIMENTS_ENABLED` is the only switch that starts/stops a test;
`ALLOW_PREVIEW` only lets the preview deployment answer for its own generated
hostnames (`config.mjs` / `INSTALL.md`). Rotating the signing secret invalidates
live assignments (those visitors fall back to original); it is not an off switch.

---

## 4. PR → preview rehearsal

Open the PR from this branch into the site's default branch **with `config.mjs`
still dormant (empty manifest)** for review, OR with the authored `config.mjs` from
step 2 for the actual go-live PR. On the PR's Vercel **preview** deployment set
`INFINITE_EXPERIMENTS_ALLOW_PREVIEW=1` **and** `INFINITE_EXPERIMENTS_ENABLED=1`
(preview target only). Then verify the deployed **bytes** of both arms with
`verifyServedBytes` (`1bu-1 src/lib/site-optimization/serving/verify-bytes.ts:118`):

For each arm, present the arm's cookies and assert `matched === true`
(`contentSha256 === expect.contentSha256`, status 200):
- **control**: `verifyServedBytes(previewUrl + "/", { contentSha256: <originalContentSha256>, personCookie, assignmentCookie: <__Host-infinite-exp-… for control>, consentCookie: "infinite_experiment_consent=granted" })`
- **test**: same with the test assignment cookie.
- **original escape**: `previewUrl + "/?__infinite_original=1"` must serve the
  plain page (no marker) — the escape can only remove treatment (`runtime-source.ts:132`).

Cookie-attribute assertion on a fresh consenting navigation (no cookies): the
response sets `__Host-infinite-person=<32-hex>` with `Secure; Path=/; SameSite=Lax`
and **no `HttpOnly`** (readable, so `/get-started` forwards it as `experimentPersonId`
— G2). Verified locally: two `Set-Cookie` headers, person cookie 32-hex + Secure +
Path=/ + non-HttpOnly.

Confirm both arms serve, the exposure beacon POSTs to `/infinite/experiment` and the
engine records it (lane ON, pilot scope), and no proof manifest is registered.

## 5. Merge dormant

Merge the PR to the default branch **without** setting `INFINITE_EXPERIMENTS_ENABLED`
on production. Production auto-deploys via Vercel but stays inert: dormant/unset →
every visitor gets the original page (proven: dormant build serves byte-identical,
router passes on "/"). The engine row can sit at `ready`; create in step 1 must have
run while prod still served the plain page.

## 6. Go-live (the watched crossing)

The validator confirms readiness, then:
1. Engine `rehearse` against the deployed production site to produce the
   `control_serving`/`test_serving` receipts (`website-experiment.mts:435`).
2. Set `INFINITE_EXPERIMENTS_ENABLED=1` on **production** and redeploy the site.
3. **Target-match gate**: the validator re-runs `verifyServedBytes` on
   `https://infinite.fast/` for both arms (as in step 4) — this is the deploy's
   target-match. Engine-side, launch is allowed only once `assessLaunch` passes on
   those arms-served receipts (`service.ts:393`).
4. Engine `launch` (`website-experiment.mts:444`): `ready → launching → running`;
   first exposures set the running clock.

## 7. Kill switch (one flip)

Set `INFINITE_EXPERIMENTS_ENABLED` to anything ≠ `"1"` (or unset) on the SITE
production env and redeploy. Fresh and returning visitors alike get the original
page immediately (`runtime-source.ts:134` `pass('disabled')`; `INSTALL.md`).
Engine-side `kill`/`rollback` work even with the lane off (`route.ts:118`
`LANE_OFF_ACTIONS`).

---

## Blockers (cannot be done crossing-free)

1. **Experiment create is a prod DB write** (`website_experiments` /
   `website_experiment_revisions`) requiring `WEBSITE_EXPERIMENTS_ENABLED=1` +
   pilot scope — step 1. Deferred to the operator; not performed on this branch.
2. **`WEBSITE_EXPERIMENTS_ENABLED` / `WEBSITE_PILOT_WORKSPACE_ID` on the engine**
   and the SITE Vercel env changes — human-set, not touched here.
3. **Exposure/manifest migrations on prod.** The exposure route exists on
   `origin/main` (`exposure/route.ts:56`) but records through
   `record_website_exposure`; the exposure tables
   (`20260906215026_website_experiment_exposures.sql`) must be applied on prod for
   the recorded path (route header note). Validator confirms before go-live.
4. **Do not register a proof manifest** for the pilot revision, or the HMAC-only
   beacon is rejected (see §0 proof caveat).
