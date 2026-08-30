#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PUBLIC_SITE_ROUTES } from "./lib/public-site-manifest.mjs";
import { renderLlmsText, renderSitemapXml } from "./lib/site-graph-renderers.mjs";

const repoRoot = new URL("..", import.meta.url).pathname;
const mode = process.argv[2];

if (!["--write", "--check"].includes(mode)) {
  console.error("Usage: node scripts/render-site-graph.mjs --write|--check");
  process.exit(2);
}

const outputs = new Map([
  ["sitemap.xml", renderSitemapXml(PUBLIC_SITE_ROUTES)],
  ["llms.txt", renderLlmsText({ routes: PUBLIC_SITE_ROUTES })],
]);

let failed = false;

for (const [file, rendered] of outputs) {
  const target = join(repoRoot, file);
  if (mode === "--write") {
    writeFileSync(target, rendered);
    continue;
  }

  const current = readFileSync(target, "utf8");
  if (current !== rendered) {
    console.error(`${file} is out of date; run node scripts/render-site-graph.mjs --write`);
    failed = true;
  }
}

if (failed) process.exit(1);
