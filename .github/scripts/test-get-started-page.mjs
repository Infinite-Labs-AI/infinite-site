import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../get-started/index.html", import.meta.url), "utf8");

// ── Static markup contract ────────────────────────────────────────────────────────────────────
assert.match(html, /<link rel="canonical" href="https:\/\/infinite\.fast\/get-started\/" \/>/);
assert.match(html, /<meta property="og:url" content="https:\/\/infinite\.fast\/get-started\/" \/>/);
assert.match(html, /<meta name="robots" content="noindex, follow" \/>/, "the gate is not a landing page — keep it out of the index");
assert.doesNotMatch(html, /https:\/\/www\.infinite\.fast/);
assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/, "fonts are self-hosted like every other page");

// Exact spec copy.
assert.match(html, /Use the email you’ll sign in to Infinite with\./);
assert.match(html, /We sent a 6-digit code to <span id="gate-code-target"><\/span>\./);
assert.match(html, /<li>Open the DMG<\/li>\s*<li>Drag Infinite to Applications<\/li>\s*<li>Click Open Infinite<\/li>/);
assert.match(html, /id="gate-download-again"[^>]*>Download again</);
assert.match(html, /id="gate-open-infinite"[^>]*>Open Infinite</);
assert.match(html, /id="gate-resend"[^>]*>Resend code</);
assert.doesNotMatch(html, /skip/i, "hard gate: no skip link");

// Every download is a /download click: the two anchors carry a bounded placement marker
// (test-prepare-static-deploy enumerates the built dist and fails on a markerless one).
const downloadAnchors = html.match(/<a\b[^>]*href="\/download"[^>]*>/g) ?? [];
assert.equal(downloadAnchors.length, 2, "exactly two /download anchors: the fail-open fallback and Download again");
assert.match(html, /<a\b[^>]*id="gate-download-again"[^>]*href="\/download"[^>]*data-download-location="get-started"/);
assert.match(html, /<p id="gate-fallback"(?![^>]*\bhidden\b)[^>]*>[\s\S]*?<a\b[^>]*href="\/download"[^>]*data-download-location="get-started-fallback"/,
  "the fail-open link is VISIBLE in the source; only a successfully initialised script hides it");
for (const id of ["gate-step-email", "gate-step-code", "gate-step-download"]) {
  assert.match(html, new RegExp(`<section id="${id}"[^>]*\\bhidden\\b`), `${id} starts hidden and is revealed by the script`);
}
assert.match(html, /<a\b[^>]*id="gate-open-infinite"[^>]*href="#"/, "Open Infinite has no target until a claim exists");

// The privacy boundary: never read the tag's storage, never reference the retired Wave 2 endpoint.
assert.doesNotMatch(html, /infinite_analytics_visitor|infinite_analytics_session/);
assert.doesNotMatch(html, /["']\/infinite\/handoff["']/);
assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/, "no external scripts: one inline script only");

console.log("test-get-started-page: static markup OK");
