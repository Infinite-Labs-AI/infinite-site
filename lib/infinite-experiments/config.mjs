// Prepared by Infinite. Empty means no test is active. Secrets belong in deployment env.
export const manifest = {
  "experiments": [],
  "schemaVersion": 2
};
const productionHosts = ["infinite.fast"];
// PREVIEW TARGET ONLY. INFINITE_EXPERIMENTS_ALLOW_PREVIEW="1" lets a rehearsal run on a preview
// deployment, at that deployment's own generated hostnames and no others. Production must never set
// it: with it unset the runtime serves original on every preview, and the host list stays exactly the
// production hosts above. It is not a kill switch and not an off switch; INFINITE_EXPERIMENTS_ENABLED
// remains the only way to start or stop a test.
const allowPreview = process.env.INFINITE_EXPERIMENTS_ALLOW_PREVIEW === "1";
// A hostname the deployment supplies is filtered through the SAME shape runtime.mjs requires of
// every entry in this list (validOptions). A value it would reject does not fail alone: it fails
// the whole option object, and every request on this deployment — the production hosts included —
// becomes pass("invalid_configuration"). So one malformed value costs the preview host, never the
// site. A scheme is stripped, and so is a redundant :443 (the runtime routes https only and
// compares url.host, which never carries the default port); any other port names an origin the
// runtime can never match, so it is dropped rather than widened to the bare hostname. The
// .localhost/.local/.internal suffixes the production list refuses are refused here too.
const previewHostPattern = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/;
const previewHost = value => {
  const host = typeof value === "string" ? value.trim().replace(/^https?:[/][/]/i, "").replace(/:443$/, "").toLowerCase() : "";
  return host.length <= 253 && previewHostPattern.test(host) && !/\.(localhost|local|internal)$/.test(host) ? host : "";
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
  consentCookie: { name: "infinite_experiment_consent", grantedValue: "granted", deniedValue: "denied" },
  personCookieName: "__Host-infinite-person",
};
