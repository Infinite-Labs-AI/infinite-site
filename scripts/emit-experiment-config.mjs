// Author tool — run ONCE at go-live to produce lib/infinite-experiments/config.mjs for an A/A (or
// A/B) experiment, then commit the result. It is NOT part of the Vercel build; the build only
// verifies the committed config.mjs (build-experiment-artifacts.mjs). This is the human stand-in
// for the sealed autonomous GitHubPublisher: at go-live the AUTHORITATIVE bytes may instead come
// straight from the engine's own emitter (launch-manifest.ts) — this tool reproduces them locally
// so the operator can read out the decorated served hashes the engine `create` call needs.
//
// Prerequisite: a full site build has already produced dist/index.html (run
// `node scripts/prepare-static-deploy.cjs` first). INFINITE_SITE_SOURCE_KEY must be set.
//
// Usage:
//   INFINITE_SITE_SOURCE_KEY=site_… node scripts/emit-experiment-config.mjs \
//     --id <uuid-the-operator-minted> \
//     --starts-at <ms> --enrollment-ends-at <ms> --ends-at <ms> \
//     [--revision 1] [--page-path /] [--site-origin https://infinite.fast]
//
// It prints variants.control.sha256 / variants.test.sha256 — the DECORATED per-arm hashes the
// operator passes to the engine as `create --control <sha> --candidate <sha>`.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { renderServingConfig } from "./lib/render-serving-config.mjs";
import { buildArmsIntoDist } from "./lib/experiment-build.mjs";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}
function intArg(name) {
  const v = arg(name);
  if (v === undefined) throw new Error(`--${name} <ms epoch> is required`);
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`--${name} must be a non-negative integer (ms since epoch)`);
  return n;
}

const repoRoot = process.cwd();
const distDir = "dist";
if (!existsSync(`${repoRoot}/dist/index.html`)) {
  throw new Error("dist/index.html missing — run `node scripts/prepare-static-deploy.cjs` first");
}

const configPath = `${repoRoot}/lib/infinite-experiments/config.mjs`;
const committed = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
const hostMatch = committed.match(/const productionHosts = (\[[^\]]*\]);/);
const productionHosts = hostMatch ? JSON.parse(hostMatch[1]) : ["infinite.fast"];

const siteOrigin = arg("site-origin", `https://${productionHosts[0]}`);
const siteSourceKey = process.env.INFINITE_SITE_SOURCE_KEY;

const id = arg("id");
if (!id) throw new Error("--id <uuid> is required (mint it yourself: `uuidgen | tr A-F a-f`)");
const revision = arg("revision", "1");
const pagePath = arg("page-path", "/");
const startsAt = intArg("starts-at");
const enrollmentEndsAt = intArg("enrollment-ends-at");
const endsAt = intArg("ends-at");

const definitions = [
  {
    id,
    revision,
    pagePath,
    startsAt,
    enrollmentEndsAt,
    endsAt,
    allocationBasisPoints: { control: 5000, test: 5000 },
    sources: { original: "dist/index.html", control: "dist/index.html", test: "dist/index.html" },
  },
];

const { manifest } = buildArmsIntoDist({ repoRoot, distDir, siteSourceKey, siteOrigin, definitions });
const { config } = renderServingConfig({ productionHosts, manifest });
writeFileSync(configPath, config);

const e = manifest.experiments[0];
console.log("Wrote lib/infinite-experiments/config.mjs\n");
console.log("Experiment:", e.id, "revision", e.revision, "page", e.pagePath);
console.log("originalContentSha256 (pre-decoration, both arms):", e.originalContentSha256);
console.log("engine create --control  (control decorated sha256):", e.variants.control.sha256);
console.log("engine create --candidate (test    decorated sha256):", e.variants.test.sha256);
console.log("\nNext: commit config.mjs, then run the engine create with the two decorated hashes above.");
