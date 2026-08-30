import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
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
const agentsSource = read("agents/index.html");
assertAgents(agentsSource, "Agents source");
assertSkillsInstallerCollisions(agentsSource);
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
  for (const [href, ctaId, text] of [
    ["/features/ai-marketing-agents/", "feature-ai-marketing-agents", "AI Marketing Agents"],
    ["/features/seo-aeo/", "feature-seo-aeo", "SEO + AEO"],
    ["/features/x-instagram-content/", "feature-x-instagram-content", "X + Instagram Content"],
    ["/features/ads/", "feature-ads", "AI Ads"],
    ["/features/email/", "feature-email", "Email — availability"],
    ["/features/websites-ab-testing/", "feature-websites-ab-testing", "Websites + A/B Ideas"],
  ]) {
    assert.match(html, new RegExp(`<a[^>]*href="${escapeRegExp(href)}"[^>]*data-analytics-cta-id="${ctaId}"[^>]*data-analytics-cta-location="homepage-capabilities"[^>]*>${escapeRegExp(text)}<\\/a>`), `${label}: Task 6 contextual feature link ${text}`);
  }

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
  assert.match(html, /INFINITE_SKILLS_REPO_URL:-https:\/\/github\.com\/Infinite-Labs-AI\/infinite-skills\.git/, `${label}: production source defaults to public GitHub`);
  assert.match(html, /git clone "\$repo_url" "\$checkout"/, `${label}: Skills checkout uses the selected source safely`);
  assert.match(html, /git -C "\$checkout" pull --ff-only/, `${label}: existing Skills checkout updates safely`);
  assert.match(html, /mkdir -p "\$skills_dir"/, `${label}: Codex discovery directory is created`);
  assert.match(html, /for skill in "\$checkout"\/skills\/\*/, `${label}: every published skill is installed`);
  assert.match(html, /set -eu/, `${label}: checkout failures stop before discovery mutation`);
  assert.match(html, /if \[ -L "\$target" \]/, `${label}: symlink destinations are checked first`);
  assert.match(html, /elif \[ -e "\$target" \]/, `${label}: files and directories are left untouched`);
  assert.match(html, /ln -s "\$skill" "\$target"/, `${label}: only absent destinations receive a symlink`);
  assert.doesNotMatch(html, /ln -sfn/, `${label}: install command never force-replaces a destination`);
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

function assertSkillsInstallerCollisions(html) {
  const command = extractSkillsInstallCommand(html);
  const scratch = mkdtempSync(join(tmpdir(), "infinite-skills-install-contract-"));
  try {
    const fixture = createSkillsFixture(scratch);

    const cleanHome = join(scratch, "home-clean");
    runSkillsInstall(command, cleanHome, fixture);
    assertCorrectSkillLinks(cleanHome, ["copywriting", "goal"]);
    const cleanGoalTarget = readlinkSync(join(cleanHome, ".codex/skills/goal"));
    const rerun = runSkillsInstall(command, cleanHome, fixture);
    assert.equal(readlinkSync(join(cleanHome, ".codex/skills/goal")), cleanGoalTarget, "rerun keeps the correct managed symlink");
    assert.match(rerun.output, /Already installed: goal/, "rerun explains the accepted correct symlink");

    const fileHome = join(scratch, "home-file");
    const fileTarget = prepareCollisionHome(fileHome, "file");
    const fileRun = runSkillsInstall(command, fileHome, fixture);
    assert.equal(readFileSync(fileTarget, "utf8"), "user-owned file\n", "regular file collision is unchanged");
    assert.equal(lstatSync(fileTarget).isSymbolicLink(), false, "regular file is not replaced by a symlink");
    assert.match(fileRun.output, /Skipped goal: destination exists; left untouched/, "regular file collision prints guidance");
    assertCorrectSkillLinks(fileHome, ["copywriting"]);

    const directoryHome = join(scratch, "home-directory");
    const directoryTarget = prepareCollisionHome(directoryHome, "directory");
    const directoryRun = runSkillsInstall(command, directoryHome, fixture);
    assert.equal(readFileSync(join(directoryTarget, "sentinel.txt"), "utf8"), "user-owned directory\n");
    assert.equal(existsSync(join(directoryTarget, "goal")), false, "directory collision never receives a nested symlink");
    assert.match(directoryRun.output, /Skipped goal: destination exists; left untouched/, "directory collision prints guidance");

    const wrongLinkHome = join(scratch, "home-wrong-link");
    const wrongLinkTarget = prepareCollisionHome(wrongLinkHome, "wrong-link");
    const beforeWrongLink = readlinkSync(wrongLinkTarget);
    const wrongLinkRun = runSkillsInstall(command, wrongLinkHome, fixture);
    assert.equal(readlinkSync(wrongLinkTarget), beforeWrongLink, "foreign symlink collision is unchanged");
    assert.match(wrongLinkRun.output, /Skipped goal: symlink points to .*left untouched/, "foreign symlink prints guidance");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function extractSkillsInstallCommand(html) {
  const match = html.match(
    /<pre class="ag-command" aria-label="Complete Infinite Skills install command"><code>([\s\S]*?)<\/code><\/pre>\s*<button[^>]*data-copy-skills-install/,
  );
  assert.ok(match, "visible complete Skills command is extractable for black-box execution");
  return match[1].trim();
}

function createSkillsFixture(scratch) {
  const fixture = join(scratch, "skills-fixture");
  for (const name of ["copywriting", "goal"]) {
    mkdirSync(join(fixture, "skills", name), { recursive: true });
    writeFileSync(join(fixture, "skills", name, "SKILL.md"), `# ${name}\n`);
  }
  execFileSync("git", ["init", "-q", fixture]);
  execFileSync("git", ["-C", fixture, "add", "."]);
  execFileSync("git", ["-C", fixture, "-c", "user.name=Contract", "-c", "user.email=contract@example.invalid", "commit", "-qm", "fixture"]);
  return fixture;
}

function runSkillsInstall(command, home, fixture) {
  mkdirSync(home, { recursive: true });
  const result = spawnSync("bash", ["-c", command], {
    encoding: "utf8",
    env: { ...process.env, HOME: home, INFINITE_SKILLS_REPO_URL: fixture },
  });
  assert.equal(result.status, 0, `Skills installer exits cleanly: ${result.stderr || result.stdout}`);
  return { output: `${result.stdout}${result.stderr}` };
}

function assertCorrectSkillLinks(home, names) {
  for (const name of names) {
    const target = join(home, ".codex", "skills", name);
    assert.equal(lstatSync(target).isSymbolicLink(), true, `${name} is Codex-discoverable through a symlink`);
    assert.equal(
      readlinkSync(target),
      join(home, ".codex", "infinite-skills", "skills", name),
      `${name} points at the exact Infinite Skills checkout path`,
    );
  }
}

function prepareCollisionHome(home, kind) {
  const skillsDir = join(home, ".codex", "skills");
  const target = join(skillsDir, "goal");
  mkdirSync(skillsDir, { recursive: true });
  if (kind === "file") writeFileSync(target, "user-owned file\n");
  if (kind === "directory") {
    mkdirSync(target);
    writeFileSync(join(target, "sentinel.txt"), "user-owned directory\n");
  }
  if (kind === "wrong-link") {
    const foreign = join(home, "foreign-goal");
    mkdirSync(foreign, { recursive: true });
    symlinkSync(foreign, target);
  }
  return target;
}

function assertAgentStyles(css) {
  const mutedHex = css.match(/--ag-muted:\s*(#[0-9a-f]{6})/i)?.[1];
  const focusHex = css.match(/--ag-focus:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(mutedHex, "Agents CSS defines the accessible muted token");
  assert.ok(focusHex, "Agents CSS defines an opaque keyboard-focus token");
  assert.match(
    css,
    /\.ag-planned-grid p\s*\{[^}]*color:\s*var\(--ag-muted\)/s,
    "planned-specialist body copy must use the shared accessible muted token",
  );

  const cardBackground = composite(rgb("#ffffff"), rgb("#f7f9fb"), 0.68);
  const ratio = contrastRatio(rgb(mutedHex), cardBackground);
  assert.ok(ratio >= 4.5, `planned-specialist normal text contrast must be >= 4.5:1, got ${ratio.toFixed(2)}:1`);

  assert.match(
    css,
    /\.ag-actions a:focus-visible,\s*\.ag-hero-link:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--ag-focus\)[^}]*box-shadow:\s*0 0 0 2px #fff/s,
    "Agents action links use the opaque two-ring focus treatment",
  );
  for (const surface of ["#ffffff", "#edf8ff", "#f2efff", "#effdf5", "#f7fbff"]) {
    const focusRatio = contrastRatio(rgb(focusHex), rgb(surface));
    assert.ok(focusRatio >= 3, `Agents focus must be >= 3:1 against ${surface}, got ${focusRatio.toFixed(2)}:1`);
  }
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
  for (const [status, route, name] of [
    ["Shipped", "/features/ai-marketing-agents/", "AI Marketing Agents"],
    ["Shipped", "/features/seo-aeo/", "SEO + AEO"],
    ["Shipped", "/features/x-instagram-content/", "X + Instagram Content"],
    ["Shipped", "/features/ads/", "AI Ads"],
    ["Current availability", "/features/email/", "Email"],
    ["CRO + A/B test ideas", "/features/websites-ab-testing/", "Websites + A/B Ideas"],
  ]) {
    assert.match(text, new RegExp(`- \\*\\*${escapeRegExp(status)}\\*\\* — \\[${escapeRegExp(name)}\\]\\(https:\\/\\/infinite\\.fast${escapeRegExp(route)}\\)`), `${label}: status-aware feature role ${name}`);
  }
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
