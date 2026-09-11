// POST-build step for the Infinite page-experiments serving layer. Runs LAST inside
// prepare-static-deploy.cjs, after dist/index.html is fully assembled, analytics-injected and
// apex-normalized — buildExperimentArtifacts must see the exact final bytes a visitor receives.
//
// Behaviour is driven entirely by the committed lib/infinite-experiments/config.mjs manifest:
//   • empty manifest (the shipped dormant state) → build nothing; only assert the committed
//     config.mjs is untouched emitter output (a hand-edit fails the build closed).
//   • non-empty manifest (an experiment authored via emit-experiment-config.mjs) → inject the
//     client bootstrap, publish the client module, build the immutable control/test arms into
//     dist, then ASSERT the manifest re-emitted from the freshly built artifacts is byte-identical
//     to the committed config.mjs. A drift means the homepage bytes changed under a frozen
//     manifest (the assignment binding + exposure marker would no longer match) — fail, never ship.
//
// This never writes config.mjs; config.mjs is authored once (emit-experiment-config.mjs, or the
// engine's own emitter at go-live) and only verified here.

import { readFileSync } from "node:fs";
import { renderServingConfig } from "./lib/render-serving-config.mjs";
import { buildArmsIntoDist, definitionsFromManifest } from "./lib/experiment-build.mjs";
import { deployment as _deployment, manifest } from "../lib/infinite-experiments/config.mjs";

const repoRoot = process.cwd();
const distDir = "dist";
const configPath = `${repoRoot}/lib/infinite-experiments/config.mjs`;
const committed = readFileSync(configPath, "utf8");

// The static production host list baked into config.mjs (never the preview-augmented
// deployment.productionHosts) — this is what the single emitter must reproduce.
const hostMatch = committed.match(/const productionHosts = (\[[^\]]*\]);/);
if (!hostMatch) throw new Error("[experiments] cannot read productionHosts from config.mjs");
const productionHosts = JSON.parse(hostMatch[1]);
const siteOrigin = `https://${productionHosts[0]}`;

function assertEmitterMatch(freshManifest) {
  const emitted = renderServingConfig({ productionHosts, manifest: freshManifest }).config;
  if (emitted !== committed) {
    throw new Error(
      "[experiments] config.mjs is not the current emitter output for its manifest.\n" +
        "  Either it was hand-edited, or the homepage bytes changed under a frozen manifest.\n" +
        "  Re-author with: node scripts/emit-experiment-config.mjs (then commit lib/infinite-experiments/config.mjs).",
    );
  }
}

if (!manifest.experiments.length) {
  assertEmitterMatch({ schemaVersion: 2, experiments: [] });
  console.log("[experiments] dormant — empty manifest, no arms built, config.mjs verified");
  process.exit(0);
}

const siteSourceKey = process.env.INFINITE_SITE_SOURCE_KEY;

// PROD-GATE. A populated manifest pins the REAL production homepage bytes and binds the arms to the
// live pixel's source key. Reproducing those bytes — and therefore building/verifying the arms —
// requires BOTH a production build (VERCEL_ENV=production, so inject-analytics.cjs:14 embeds the
// site source key and the prod pixel ids) AND the INFINITE_SITE_SOURCE_KEY secret itself. Vercel's
// production deploy has both; a non-prod build does NOT:
//   • the .github/scripts/test-*.mjs contract suite builds with VERCEL_ENV=production but no
//     INFINITE_SITE_SOURCE_KEY (a dormant fixture), so the arm build would throw at
//     experiment-build.mjs:88 for the missing key;
//   • a build that has the key but VERCEL_ENV!=="production" drops the key from the analytics tag
//     (inject-analytics.cjs:14), so its homepage bytes can never match the prod-pinned manifest and
//     assertEmitterMatch would throw on the wrong target.
// Either way the throw fires BEFORE dist is finished and has nothing to say about production. So a
// non-prod build behaves like the dormant (empty-manifest) case: it does NOT build arms, but it
// STILL verifies the committed config.mjs is exactly the emitter output for its own committed
// manifest — a hand-edit to the hosts/format/structure still fails closed. The full arm build +
// fresh-emitter equality + A/A byte-identity below run ONLY on the production/deploy path, so the
// HIGH-1 guarantee (config.mjs must match the real prod build byte-for-byte, and the prod build
// fails closed on any homepage-bytes drift) is unchanged.
const isProductionServingBuild =
  process.env.VERCEL_ENV === "production" && /^site_[A-Za-z0-9_-]+$/.test(siteSourceKey || "");
if (!isProductionServingBuild) {
  assertEmitterMatch(manifest);
  console.log(
    "[experiments] non-production build (VERCEL_ENV!=production or no INFINITE_SITE_SOURCE_KEY) — " +
      "arms not built; committed config.mjs verified as emitter output for its manifest",
  );
  process.exit(0);
}

const { manifest: fresh, files } = buildArmsIntoDist({
  repoRoot,
  distDir,
  siteSourceKey,
  siteOrigin,
  definitions: definitionsFromManifest(manifest),
});

assertEmitterMatch(fresh);

for (const e of fresh.experiments) {
  const identical =
    e.originalContentSha256 === e.variants.control.contentSha256 &&
    e.originalContentSha256 === e.variants.test.contentSha256;
  if (!identical) {
    throw new Error(`[experiments] A/A byte-identity broken for ${e.id}: control/test not the untouched original`);
  }
  if (e.variants.control.sha256 === e.variants.test.sha256) {
    throw new Error(`[experiments] arms are byte-equal for ${e.id} (marker missing) — both arms would be one row`);
  }
}

console.log(`[experiments] built ${files.length} arm file(s) for ${fresh.experiments.length} experiment(s); config.mjs verified`);
for (const f of files) console.log(`  ${f}`);
