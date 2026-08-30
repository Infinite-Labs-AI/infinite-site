import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const repoRoot = new URL("../..", import.meta.url).pathname;
const assetDir = join(repoRoot, "assets/features");

const expectedAssets = [
  {
    filename: "ai-marketing-agents-scope.svg",
    alt: "Interface diagram of buyer-intent scope flowing into a ranked lead inbox",
    sequence: ["Scope", "Ranked lead inbox"],
  },
  {
    filename: "seo-aeo-review-loop.svg",
    alt: "Interface diagram of an SEO and AEO draft moving through review, publishing, and measurement",
    sequence: ["Question", "Review", "Publish", "Measurement"],
  },
  {
    filename: "x-instagram-review-flow.svg",
    alt: "Interface diagram of attributed X and Instagram inspiration moving through draft and human review",
    sequence: ["Attributed source", "Draft/script", "Human review"],
  },
  {
    filename: "ads-approval-boundary.svg",
    alt: "Interface diagram of an ad proposal moving through confirmation, policy guards, and action history",
    sequence: ["Measured signal", "Paused proposal", "Confirmation", "Policy guard", "History"],
  },
];

const expectedFilenames = expectedAssets.map((asset) => asset.filename).sort();

assert.ok(existsSync(assetDir), "assets/features must exist");
assert.deepEqual(
  readdirSync(assetDir).filter((file) => file.endsWith(".svg")).sort(),
  expectedFilenames,
  "assets/features must contain exactly the four Task 5 SVG assets",
);

for (const asset of expectedAssets) {
  const file = join(assetDir, asset.filename);
  const svg = readFileSync(file, "utf8");
  const label = basename(file);

  assert.match(svg, /^<svg\b[^>]*\bwidth="1440"[^>]*\bheight="900"[^>]*\bviewBox="0 0 1440 900"/, `${label}: root SVG must be 1440×900 with the exact viewBox`);
  assert.match(svg, /\brole="img"/, `${label}: SVG must expose image semantics`);
  assert.match(svg, /\baria-labelledby="[^"]+"/, `${label}: SVG must link title and description`);
  assert.match(svg, new RegExp(`<title\\b[^>]*>${escapeRegExp(escapeXml(asset.alt))}<\\/title>`), `${label}: title must match the exact alt contract`);
  assert.match(svg, /<desc\b[^>]*>[\s\S]{40,}<\/desc>/, `${label}: SVG must include an accessible description`);
  assert.match(svg, />Interface diagram</, `${label}: must visibly label itself as an interface diagram`);
  assert.match(svg, />Synthetic labels only</, `${label}: must visibly disclose synthetic labels`);
  assert.match(svg, />Not a screenshot</, `${label}: must visibly avoid impersonating a screenshot`);

  assertWorkflowSequence(svg, asset.sequence, label);
  assertNoUnsafeMarkup(svg, label);
}

console.log(`Feature asset verification passed for ${expectedAssets.length} safe SVG diagrams.`);

function assertWorkflowSequence(svg, sequence, label) {
  let cursor = -1;
  for (const step of sequence) {
    const needle = `>${escapeXml(step)}<`;
    const index = svg.indexOf(needle);
    assert.notEqual(index, -1, `${label}: missing workflow step ${JSON.stringify(step)}`);
    assert.ok(index > cursor, `${label}: workflow step ${JSON.stringify(step)} must appear in the brief-defined order`);
    cursor = index;
  }
}

function assertNoUnsafeMarkup(svg, label) {
  assert.doesNotMatch(svg, /<script\b|javascript:|on[a-z]+\s*=/i, `${label}: scripts and event handlers are forbidden`);
  assert.doesNotMatch(svg, /<image\b|<foreignObject\b|data:image|base64/i, `${label}: embedded screenshots/raster payloads are forbidden`);
  assert.doesNotMatch(svg.replace('xmlns="http://www.w3.org/2000/svg"', ""), /https?:\/\//i, `${label}: external URLs are forbidden`);
  assert.doesNotMatch(svg, /\b(?:href|xlink:href)=/i, `${label}: linked external resources are forbidden`);
  assert.doesNotMatch(svg, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, `${label}: email addresses are forbidden`);
  assert.doesNotMatch(svg, /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i, `${label}: account-like UUIDs are forbidden`);
  assert.doesNotMatch(svg, /\b(?:acct|account|cus|customer|org|user|workspace)[_-]?[A-Za-z0-9]{6,}\b/, `${label}: account/customer IDs are forbidden`);
  assert.doesNotMatch(svg, /\/Users\/|\/private\/|\/root\/|Github\/|1bu-1|legendary-teeth|infinite-site-worktrees/i, `${label}: private paths are forbidden`);
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
