// VENDORED — do not hand-edit. Byte-faithful bundle of Infinite's single config.mjs emitter,
// 1bu-1 src/lib/site-optimization/serving/manifest-source.ts (renderServingConfig + deps),
// produced with `esbuild manifest-source.ts --bundle --format=esm --external:node:*`.
// config.mjs must ONLY be produced by renderServingConfig (the runtime binds every signed
// assignment to JSON.stringify of its manifest entry, so key order is load-bearing and canonical
// sorting is mandatory). This copy is used at BUILD time to re-emit the manifest from the freshly
// built artifacts and ASSERT it equals the committed lib/infinite-experiments/config.mjs — a drift
// (stale config vs changed homepage bytes) fails the build closed. At go-live the AUTHORITATIVE
// config.mjs bytes come from the engine's own emitter via launch-manifest.ts; this vendored copy is
// the customer-side verifier and local author tool. Regenerate by re-bundling manifest-source.ts.
// serving/manifest-source.ts
import { isIP } from "node:net";
var ManifestError = class extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
};
var SERVING_CONSENT_COOKIE = Object.freeze({ name: "infinite_experiment_consent", grantedValue: "granted", deniedValue: "denied" });
var SERVING_PERSON_COOKIE_NAME = "__Host-infinite-person";
var SEGMENT = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
var PAGE_PATH = /^\/(?:[A-Za-z0-9_-]+\/?)*(?:[A-Za-z0-9_-]+\.html)?$/;
var HEX_64 = /^[a-f0-9]{64}$/;
var HOST = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/;
function invalid() {
  throw new ManifestError("invalid_manifest");
}
function time(value) {
  if (!Number.isSafeInteger(value) || value < 0) invalid();
  return value;
}
function hex(value) {
  if (typeof value !== "string" || !HEX_64.test(value)) invalid();
  return value;
}
var LOCAL_SUFFIX = /\.(localhost|local|internal)$/;
function productionHostList(hosts) {
  const list = [...new Set(hosts)].sort();
  if (!list.length || list.length > 10 || list.some((host) => typeof host !== "string" || host.length > 253 || isIP(host) || !HOST.test(host) || LOCAL_SUFFIX.test(host))) throw new ManifestError("invalid_hosts");
  return list;
}
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
  return value;
}
function validated(manifest) {
  if (!manifest || manifest.schemaVersion !== 2 || !Array.isArray(manifest.experiments) || manifest.experiments.length > 2) invalid();
  const experiments = manifest.experiments.map((e) => {
    if (!e || typeof e !== "object" || !SEGMENT.test(e.id) || !SEGMENT.test(e.revision)) invalid();
    if (typeof e.pagePath !== "string" || !PAGE_PATH.test(e.pagePath) || e.pagePath.startsWith("/__infinite_experiments")) invalid();
    const startsAt = time(e.startsAt), enrollmentEndsAt = time(e.enrollmentEndsAt), endsAt = time(e.endsAt);
    if (startsAt >= enrollmentEndsAt || enrollmentEndsAt > endsAt) invalid();
    if (!e.allocationBasisPoints || e.allocationBasisPoints.control !== 5e3 || e.allocationBasisPoints.test !== 5e3) invalid();
    const variants = { control: e.variants?.control, test: e.variants?.test };
    for (const arm of ["control", "test"]) {
      const variant = variants[arm];
      if (!variant || variant.path !== `/__infinite_experiments/${e.id}/${e.revision}/${arm}.html`) invalid();
      hex(variant.sha256);
      hex(variant.contentSha256);
    }
    if (hex(e.originalContentSha256) !== variants.control.contentSha256) throw new ManifestError("control_is_not_original");
    return {
      id: e.id,
      revision: e.revision,
      pagePath: e.pagePath,
      startsAt,
      enrollmentEndsAt,
      endsAt,
      allocationBasisPoints: { control: 5e3, test: 5e3 },
      originalContentSha256: e.originalContentSha256,
      variants: {
        control: { path: variants.control.path, sha256: variants.control.sha256, contentSha256: variants.control.contentSha256 },
        test: { path: variants.test.path, sha256: variants.test.sha256, contentSha256: variants.test.contentSha256 }
      }
    };
  });
  if (new Set(experiments.map((e) => e.id)).size !== experiments.length || new Set(experiments.map((e) => e.pagePath)).size !== experiments.length) invalid();
  return { schemaVersion: 2, experiments };
}
function canonicalManifestJson(manifest) {
  return JSON.stringify(sortKeys(validated(manifest)), null, 2);
}
function renderServingConfig(i) {
  const productionHosts = productionHostList(i.productionHosts);
  const manifestJson = canonicalManifestJson(i.manifest);
  const config = `// Prepared by Infinite. Empty means no test is active. Secrets belong in deployment env.
export const manifest = ${manifestJson};
const productionHosts = ${JSON.stringify(productionHosts)};
// PREVIEW TARGET ONLY. INFINITE_EXPERIMENTS_ALLOW_PREVIEW="1" lets a rehearsal run on a preview
// deployment, at that deployment's own generated hostnames and no others. Production must never set
// it: with it unset the runtime serves original on every preview, and the host list stays exactly the
// production hosts above. It is not a kill switch and not an off switch; INFINITE_EXPERIMENTS_ENABLED
// remains the only way to start or stop a test.
const allowPreview = process.env.INFINITE_EXPERIMENTS_ALLOW_PREVIEW === "1";
// A hostname the deployment supplies is filtered through the SAME shape runtime.mjs requires of
// every entry in this list (validOptions). A value it would reject does not fail alone: it fails
// the whole option object, and every request on this deployment \u2014 the production hosts included \u2014
// becomes pass("invalid_configuration"). So one malformed value costs the preview host, never the
// site. A scheme is stripped, and so is a redundant :443 (the runtime routes https only and
// compares url.host, which never carries the default port); any other port names an origin the
// runtime can never match, so it is dropped rather than widened to the bare hostname. The
// .localhost/.local/.internal suffixes the production list refuses are refused here too.
const previewHostPattern = ${HOST};
const previewHost = value => {
  const host = typeof value === "string" ? value.trim().replace(/^https?:[/][/]/i, "").replace(/:443$/, "").toLowerCase() : "";
  return host.length <= 253 && previewHostPattern.test(host) && !${LOCAL_SUFFIX}.test(host) ? host : "";
};
const previewHosts = allowPreview
  ? [process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL].map(previewHost).filter(host => host !== "")
  : [];
export const deployment = {
  productionHosts: previewHosts.length ? [...new Set([...productionHosts, ...previewHosts])] : productionHosts,
  environment: process.env.VERCEL_ENV,
  allowPreview,
  enabled: process.env.INFINITE_EXPERIMENTS_ENABLED === "1",
  signingSecret: process.env.INFINITE_EXPERIMENTS_SIGNING_SECRET,
  consentMode: "required",
  consentCookie: ${JSON.stringify(SERVING_CONSENT_COOKIE).replace(/"([a-zA-Z]+)":/g, "$1: ").replace(/,/g, ", ").replace(/\{/, "{ ").replace(/\}$/, " }")},
  personCookieName: ${JSON.stringify(SERVING_PERSON_COOKIE_NAME)},
};
`;
  return { config, manifestJson, productionHosts };
}
export {
  ManifestError,
  SERVING_CONSENT_COOKIE,
  SERVING_PERSON_COOKIE_NAME,
  canonicalManifestJson,
  productionHostList,
  renderServingConfig
};
