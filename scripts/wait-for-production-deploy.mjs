// Wait for the Vercel PRODUCTION deployment of one exact git commit to be READY,
// instead of blindly sleeping and hoping the deploy settled.
//
// WHY: the guardrail's live-bytes check is only meaningful when the live site is
// serving the commit that triggered the run. The old fixed `sleep 180` had two
// failure modes: a slow build made the live check read STALE bytes (a false
// verdict about this commit), and a FAILED build made the live check pass
// against the previous deploy while the new commit never shipped at all.
//
// CONTRACT:
//   EXPECTED_SHA        (required)  — the git SHA the production deploy must carry.
//   VERCEL_TOKEN        (optional)  — Vercel API token. WITHOUT it the API cannot
//                                     be polled; we fall back to the bounded legacy
//                                     settle wait with a loud warning rather than
//                                     failing every push on a missing secret.
//                                     Provision it to get real SHA-verified gating.
//   VERCEL_PROJECT_ID   (optional)  — defaults to the infinite-site Vercel project.
//   DEPLOY_POLL_TIMEOUT_SECONDS   (optional, default 480)
//   DEPLOY_POLL_INTERVAL_SECONDS  (optional, default 15)
//   FALLBACK_SETTLE_SECONDS       (optional, default 180) — tokenless fallback only.
//
// EXIT: 0 when a READY production deployment for EXPECTED_SHA exists (plus a short
// alias-propagation grace), or after the tokenless fallback wait. 1 with a clear
// message when the deploy for this SHA terminally failed or the poll timed out.

const expectedSha = (process.env.EXPECTED_SHA ?? "").trim();
const token = (process.env.VERCEL_TOKEN ?? "").trim();
const projectId = (process.env.VERCEL_PROJECT_ID ?? "").trim() || "prj_ouLsgX7HVm33TQjXNvN8ZoVVcJQp";
const timeoutSeconds = boundedInt(process.env.DEPLOY_POLL_TIMEOUT_SECONDS, 480, 30, 3600);
const intervalSeconds = boundedInt(process.env.DEPLOY_POLL_INTERVAL_SECONDS, 15, 5, 120);
const fallbackSettleSeconds = boundedInt(process.env.FALLBACK_SETTLE_SECONDS, 180, 0, 600);
const aliasGraceSeconds = 10;

function boundedInt(raw, fallback, min, max) {
  const value = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function log(message) {
  process.stdout.write(`[wait-for-production-deploy] ${message}\n`);
}

function fail(message) {
  process.stderr.write(`[wait-for-production-deploy] FAIL: ${message}\n`);
  process.exit(1);
}

const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

if (!expectedSha) fail("EXPECTED_SHA is required (the workflow passes github.sha).");

if (!token) {
  log("WARNING: VERCEL_TOKEN is not configured, so the Vercel API cannot be polled.");
  log("WARNING: falling back to the bounded legacy settle wait — the live check may read");
  log("WARNING: stale bytes if the deploy is slow or failed. Provision the VERCEL_TOKEN");
  log(`WARNING: repo secret to enable SHA-verified deploy gating for ${expectedSha}.`);
  log(`Sleeping ${fallbackSettleSeconds}s (legacy settle window)...`);
  await sleep(fallbackSettleSeconds);
  log("Fallback settle wait complete. Proceeding to the live checks WITHOUT deploy-SHA proof.");
  process.exit(0);
}

const deadline = Date.now() + timeoutSeconds * 1000;
const listUrl = `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&target=production&limit=20`;
let lastError = null;
let attempts = 0;

log(`Polling Vercel for a READY production deployment of ${expectedSha}`);
log(`project=${projectId} timeout=${timeoutSeconds}s interval=${intervalSeconds}s`);

while (Date.now() < deadline) {
  attempts += 1;
  let payload = null;
  try {
    const response = await fetch(listUrl, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      lastError = `Vercel API responded ${response.status}`;
      log(`attempt ${attempts}: ${lastError}; retrying in ${intervalSeconds}s`);
      await sleep(intervalSeconds);
      continue;
    }
    payload = await response.json();
  } catch (error) {
    lastError = `Vercel API request failed: ${error?.message ?? error}`;
    log(`attempt ${attempts}: ${lastError}; retrying in ${intervalSeconds}s`);
    await sleep(intervalSeconds);
    continue;
  }

  const deployments = Array.isArray(payload?.deployments) ? payload.deployments : [];
  const matching = deployments.filter(
    (deployment) => deployment?.meta?.githubCommitSha === expectedSha,
  );
  const stateOf = (deployment) =>
    String(deployment?.readyState ?? deployment?.state ?? "UNKNOWN").toUpperCase();

  const ready = matching.find((deployment) => stateOf(deployment) === "READY");
  if (ready) {
    log(`READY production deployment found for ${expectedSha}: ${ready.url ?? ready.uid ?? "(no url)"}`);
    log(`Waiting ${aliasGraceSeconds}s for alias propagation before the live checks...`);
    await sleep(aliasGraceSeconds);
    log("Deploy confirmed. Proceeding to the live checks.");
    process.exit(0);
  }

  if (matching.length > 0) {
    const states = matching.map(stateOf);
    const terminalFailures = new Set(["ERROR", "CANCELED"]);
    const allFailed = states.every((state) => terminalFailures.has(state));
    if (allFailed) {
      fail(
        `every production deployment for ${expectedSha} is in a terminal failed state ` +
          `(${states.join(", ")}). The live site is still serving a PREVIOUS deploy, so the ` +
          `live checks would report on stale bytes. Fix or redeploy this commit, then re-run.`,
      );
    }
    log(`attempt ${attempts}: deployment for ${expectedSha} in state(s) ${states.join(", ")}; waiting...`);
  } else {
    log(`attempt ${attempts}: no production deployment for ${expectedSha} listed yet; waiting...`);
  }

  await sleep(intervalSeconds);
}

fail(
  `timed out after ${timeoutSeconds}s waiting for a READY production deployment of ` +
    `${expectedSha} on project ${projectId}` +
    (lastError ? ` (last error: ${lastError})` : "") +
    `. The live checks were NOT run against unverified bytes; investigate the Vercel deploy, ` +
    `then re-run this workflow.`,
);
