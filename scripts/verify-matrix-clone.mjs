import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const cloneRoot = new URL("../_agent_artifacts/matrix-clone/", import.meta.url);
const html = await readFile(new URL("index.html", cloneRoot), "utf8");

const requiredSnippets = [
  "<title>Matrix - Launch a 0-Person Company that actually earns</title>",
  'class="matrix-nav"',
  'id="runtime"',
  'id="coordination"',
  'id="benchmark"',
  'id="case"',
  'id="capabilities"',
  'id="primitives"',
  'id="economics"',
  'id="deploy"',
  'data-case-tab="video"',
  'data-case-panel="video"',
  'assets/matrix/hero/matrix-hero-rooftop.jpg',
  'assets/matrix/showcase/matrix-dashboard.png',
  'assets/matrix/cases/aivideopro-hero.png',
];

const missing = requiredSnippets.filter((snippet) => !html.includes(snippet));
if (missing.length > 0) {
  throw new Error(`Missing required Matrix clone snippets:\n${missing.join("\n")}`);
}

const localAssets = [...html.matchAll(/(?:src|href)="(assets\/matrix\/[^"#?]+)"/g)].map((match) => match[1]);
const uniqueAssets = [...new Set(localAssets)];
if (uniqueAssets.length < 20) {
  throw new Error(`Expected at least 20 local Matrix assets, found ${uniqueAssets.length}`);
}

for (const asset of uniqueAssets) {
  await access(new URL(asset, cloneRoot), constants.R_OK);
}

console.log(`Verified ${uniqueAssets.length} local Matrix assets and ${requiredSnippets.length} page markers.`);
