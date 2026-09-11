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
