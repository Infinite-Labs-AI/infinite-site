#!/usr/bin/env node
// Read-only HTTP inspection: never execute page scripts or send analytics payloads.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { renderInfiniteBrowserTag } from "infinite-tag";
import { KNOWN_DOCUMENT_PATHS, assertPublicSiteManifest } from "./lib/public-site-manifest.mjs";

assertPublicSiteManifest();
const require = createRequire(import.meta.url);
const pinned = JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).devDependencies["infinite-tag"];
const installed = JSON.parse(readFileSync(new URL("../../package.json", pathToFileURL(require.resolve("infinite-tag"))))).version;
assert.equal(installed, pinned, "Run npm ci: installed infinite-tag must match the exact site pin");
const base = new URL(process.env.SITE_BASE_URL || "https://infinite.fast");
assert.ok(["https:", "http:"].includes(base.protocol), "SITE_BASE_URL must be HTTP(S)");
console.log(`Auditing ${KNOWN_DOCUMENT_PATHS.length} public routes against pinned infinite-tag ${pinned} (not a registry-latest check).`);
let failed = 0;
for (const path of KNOWN_DOCUMENT_PATHS) {
  try {
    const response = await fetch(new URL(path, base), {
      headers: { "user-agent": "infinite-tag-audit-readonly/1.0", accept: "text/html" },
      signal: AbortSignal.timeout(20_000),
    });
    assert.equal(response.status, 200, "document must return HTTP 200");
    const html = await response.text();
    const scripts = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
    const runtimes = scripts.filter((script) => /\bdata-infinite-runtime=["']managed["']/.test(script));
    assert.equal(runtimes.length, 1, "expected exactly one Infinite runtime");
    const config = runtimes[0].match(/\}\)\((\{.*\})\);?<\/script>$/s);
    assert.ok(config, "could not parse serialized runtime configuration");
    // Do not evaluate JavaScript or print configuration/identifiers on mismatch.
    let options;
    try { options = JSON.parse(config[1]); } catch { throw new Error("invalid runtime configuration JSON"); }
    assert.ok(renderInfiniteBrowserTag(options) === runtimes[0], "runtime differs from pinned package output");
    const code = scripts.join("\n");
    assert.equal((code.match(/posthog\.init\s*\(/g) || []).length, 1, "expected exactly one PostHog initialization");
    assert.equal((code.match(/(?:window\.)?gtag\(["']config["']/g) || []).length, 1, "expected exactly one GA4 configuration");
    assert.ok(code.includes("googletagmanager.com/gtag/js"), "missing GA4 loader");
    assert.ok(code.includes("/static/array.js"), "missing PostHog loader");
    console.log(`PASS ${path}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${path}: ${error.message}`);
  }
}
console.log(`${KNOWN_DOCUMENT_PATHS.length - failed}/${KNOWN_DOCUMENT_PATHS.length} routes passed. This checks delivered code, not execution, consent decisions, or provider receipts.`);
process.exitCode = failed ? 1 : 0;
