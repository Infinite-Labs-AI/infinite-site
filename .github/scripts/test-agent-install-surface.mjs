import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { serveDatasetFixture } from "./fixtures/launch-videos-dataset.mjs";

const repoRoot = new URL("../..", import.meta.url).pathname;
const distDir = join(repoRoot, "dist");
const installCommand =
  "curl -fsSL https://raw.githubusercontent.com/Infinite-Labs-AI/infinite-os/main/scripts/install.sh | bash";
const repositories = {
  os: "https://github.com/Infinite-Labs-AI/infinite-os",
  skills: "https://github.com/Infinite-Labs-AI/infinite-skills",
  press: "https://github.com/Infinite-Labs-AI/infinite-press-agent",
};

assertHomepage(read("_agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html"), "homepage source");
assertAgents(read("agents/index.html"), "Agents source");
assertAgentStyles(read("assets/agents-pages.css"));
assertLlms(read("llms.txt"), "llms source");
assertReadme(read("README.md"));

const dataset = await serveDatasetFixture();
try {
  execFileSync(process.execPath, [join(repoRoot, "scripts/prepare-static-deploy.cjs")], {
    cwd: repoRoot,
    env: {
      ...process.env,
      INFINITE_PRODUCTION_HOSTS: "infinite.fast,www.infinite.fast",
      INFINITE_SITE_SOURCE_ARTIFACT: JSON.stringify({
        siteSourceKey: "site_production_dormant",
        collectPath: "/infinite/ledger",
        productionHosts: ["infinite.fast", "www.infinite.fast"],
        staticProxy: "vercel",
      }),
      LAUNCH_VIDEOS_DATASET_URL: dataset.url,
      VERCEL_ENV: "production",
    },
    stdio: "inherit",
  });

  assertHomepage(read("dist/index.html"), "homepage build");
  assertAgents(read("dist/agents/index.html"), "Agents build");
  assertLlms(read("dist/llms.txt"), "llms build");
} finally {
  dataset.close();
  rmSync(distDir, { recursive: true, force: true });
}

function assertHomepage(html, label) {
  const privateRepositoryName = ["1bu", "1"].join("-");
  assert.equal(html.includes(privateRepositoryName), false, `${label}: private repository name must not appear`);
  assert.match(html, /href="\/download"/, `${label}: desktop download remains visible`);
  assert.match(html, /data-agent-install/, `${label}: terminal install panel is present`);
  assert.ok(
    html.indexOf('href="/download"') < html.indexOf("data-agent-install"),
    `${label}: primary desktop download must precede the secondary terminal install panel`,
  );
  assert.match(html, new RegExp(escapeRegExp(installCommand)), `${label}: exact published installer is visible`);
  assert.match(html, /data-copy-agent-install/, `${label}: installer has an accessible copy control`);
  assertAnchor(html, {
    href: repositories.os,
    ctaId: "infinite-os-github",
    location: "homepage-install",
    label,
  });
  assert.match(html, /href="\/agents\/"[^>]*>Explore the agent ecosystem</, `${label}: Agents path is visible`);

  const graph = jsonLdGraph(html, label);
  const desktop = graphById(graph, "https://infinite.fast/#desktop", label);
  assert.equal(desktop["@type"], "SoftwareApplication", `${label}: desktop is a SoftwareApplication`);
  assert.equal(desktop.downloadUrl, "https://infinite.fast/download");
  assert.equal(desktop.operatingSystem, "macOS");
  assert.equal(Object.hasOwn(desktop, "codeRepository"), false, `${label}: desktop has no source-repository claim`);
  assert.equal(Object.hasOwn(desktop, "license"), false, `${label}: desktop has no MIT-license claim`);

  const os = graphById(graph, "https://infinite.fast/#infinite-os", label);
  assert.equal(os["@type"], "SoftwareSourceCode");
  assert.equal(os.codeRepository, repositories.os);
  assert.equal(os.license, `${repositories.os}/blob/main/LICENSE`);
  assert.equal(os.programmingLanguage, "TypeScript");

  const skills = graphById(graph, "https://infinite.fast/#infinite-skills", label);
  assert.equal(skills["@type"], "SoftwareSourceCode");
  assert.equal(skills.codeRepository, repositories.skills);
  assert.equal(skills.license, `${repositories.skills}/blob/main/LICENSE`);
  assert.equal(graph.some((node) => node["@id"] === "https://infinite.fast/#software"), false);
}

function assertAgents(html, label) {
  for (const text of ["Infinite OS", "Infinite Skills", "Press Agent", "Planned specialists"]) {
    assert.match(html, new RegExp(escapeRegExp(text)), `${label}: ${text} is visible`);
  }
  assert.ok(
    html.indexOf("Infinite OS") < html.indexOf("Planned specialists"),
    `${label}: shipped assets must render before planned specialists`,
  );

  for (const [key, ctaId] of [
    ["os", "infinite-os-github"],
    ["skills", "infinite-skills-github"],
    ["press", "press-agent-github"],
  ]) {
    assertAnchor(html, { href: repositories[key], ctaId, location: "agents-directory", label });
  }

  assert.match(html, new RegExp(escapeRegExp(installCommand)), `${label}: OS installer is visible`);
  assert.match(html, /git clone https:\/\/github\.com\/Infinite-Labs-AI\/infinite-skills\.git/, `${label}: Skills install path is visible`);
  assert.match(html, /git -C ~\/\.codex\/infinite-skills pull --ff-only/, `${label}: existing Skills checkout updates safely`);
  assert.match(html, /mkdir -p ~\/\.codex\/skills/, `${label}: Codex discovery directory is created`);
  assert.match(html, /for skill in ~\/\.codex\/infinite-skills\/skills\/\*/, `${label}: every published skill is installed`);
  assert.match(html, /ln -sfn "\$skill" ~\/\.codex\/skills\//, `${label}: Skills are linked into Codex discovery`);
  assert.match(html, /data-copy-skills-install/, `${label}: complete Skills install command is copyable`);
  assert.match(html, /Restart Codex after installation/, `${label}: discovery restart is explicit`);
  assert.match(html, /25 marketing skills plus the Goal skill/, `${label}: audited Skills count is precise`);
  assert.match(html, /press-agent run --once --dry-run/, `${label}: safe Press first run is visible`);
  assert.match(html, /Dry-run never submits or spends a Qwoted credit/, `${label}: Press dry-run boundary is visible`);
  assert.match(html, /normal run can submit at most one pitch and spend a credit/, `${label}: Press submission risk is visible`);

  assert.match(html, /data-proof="skills-stars">&mdash;<\/strong>/, `${label}: Skills stars fail to an em dash`);
  assert.match(html, /data-proof="skills-forks">&mdash;<\/strong>/, `${label}: Skills forks fail to an em dash`);
  assert.match(html, /api\.github\.com\/repos\/Infinite-Labs-AI\/infinite-skills/, `${label}: proof reads the audited Skills repository`);
  assert.doesNotMatch(html, /api\.github\.com\/repos\/Infinite-Labs-AI\/(?:infinite-os|infinite-press-agent)/, `${label}: weak repositories are not foregrounded as proof`);
  assert.match(html, /if \(value > 0\)/, `${label}: zero proof never replaces the em dash fallback`);

  const graph = jsonLdGraph(html, label);
  const collection = graphById(graph, "https://infinite.fast/agents/#page", label);
  assert.deepEqual(collection.mainEntity, [
    { "@id": "https://infinite.fast/agents/#infinite-os" },
    { "@id": "https://infinite.fast/agents/#infinite-skills" },
    { "@id": "https://infinite.fast/agents/#press-agent" },
  ]);
  assert.equal(graphById(graph, "https://infinite.fast/agents/#infinite-os", label)["@type"], "SoftwareSourceCode");
  assert.equal(graphById(graph, "https://infinite.fast/agents/#infinite-skills", label)["@type"], "SoftwareSourceCode");
  assert.equal(graphById(graph, "https://infinite.fast/agents/#press-agent", label)["@type"], "SoftwareApplication");

  const plannedNames = [
    "Content Repurposer",
    "SEO Brief Writer",
    "Landing Page Optimizer",
    "Review Collector",
    "Changelog Broadcaster",
    "Newsletter Composer",
    "Onboarding Auditor",
  ];
  for (const name of plannedNames) {
    assert.equal(
      graph.some((node) => node.name === name),
      false,
      `${label}: planned ${name} must not be a structured shipped entity`,
    );
  }
}

function assertAgentStyles(css) {
  const mutedHex = css.match(/--ag-muted:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(mutedHex, "Agents CSS defines the accessible muted token");
  assert.match(
    css,
    /\.ag-planned-grid p\s*\{[^}]*color:\s*var\(--ag-muted\)/s,
    "planned-specialist body copy must use the shared accessible muted token",
  );

  const cardBackground = composite(rgb("#ffffff"), rgb("#f7f9fb"), 0.68);
  const ratio = contrastRatio(rgb(mutedHex), cardBackground);
  assert.ok(ratio >= 4.5, `planned-specialist normal text contrast must be >= 4.5:1, got ${ratio.toFixed(2)}:1`);
}

function assertLlms(text, label) {
  assert.doesNotMatch(text, /href=/, `${label}: Markdown must not contain HTML href attributes`);
  assert.match(text, new RegExp(escapeRegExp(installCommand)), `${label}: installer command is model-readable`);
  assert.match(text, /`infinite local setup`/, `${label}: first setup command is explicit`);
  assert.match(text, /25 marketing skills plus the Goal skill/, `${label}: Skills count is precise`);
  for (const url of Object.values(repositories)) assert.match(text, new RegExp(escapeRegExp(url)));
  assert.match(text, /live or destructive native actions[\s\S]*operator confirmation/i);
  assert.match(text, /Dry-run never submits or spends a Qwoted credit/);
  assert.match(text, /normal run can submit at most one pitch and spend a credit/);
  assert.match(text, /synced growth data[\s\S]*local Postgres/i);
  assert.doesNotMatch(text, /\/features\//, `${label}: Task 6 owns feature roles`);
}

function assertReadme(text) {
  assert.match(text, /public website source/i);
  assert.match(text, /not the source for the Infinite desktop app/i);
  assert.match(text, /npm ci/);
  assert.match(text, /render-site-graph\.mjs --check/);
  assert.match(text, /fixture-backed/i);
  assert.match(text, /Vercel/i);
}

function jsonLdGraph(html, label) {
  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(blocks.length > 0, `${label}: JSON-LD block is present`);
  return blocks.flatMap((match) => {
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed];
  });
}

function graphById(graph, id, label) {
  const node = graph.find((candidate) => candidate["@id"] === id);
  assert.ok(node, `${label}: JSON-LD node ${id} is present`);
  return node;
}

function assertAnchor(html, { href, ctaId, location, label }) {
  const anchors = html.match(/<a\b[^>]*>/g) ?? [];
  const found = anchors.find(
    (anchor) =>
      anchor.includes(`href="${href}"`) &&
      anchor.includes(`data-analytics-cta-id="${ctaId}"`) &&
      anchor.includes(`data-analytics-cta-location="${location}"`),
  );
  assert.ok(found, `${label}: ${ctaId} CTA points to ${href} at ${location}`);
}

function read(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function composite(foreground, background, alpha) {
  return foreground.map((channel, index) => Math.round(channel * alpha + background[index] * (1 - alpha)));
}

function contrastRatio(left, right) {
  const [lighter, darker] = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function luminance(color) {
  return color
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}
