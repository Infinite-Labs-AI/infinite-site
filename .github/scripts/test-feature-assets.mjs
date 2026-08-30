import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = new URL("../..", import.meta.url).pathname;
const assetDir = join(repoRoot, "assets/features");

const expectedAssets = [
  {
    filename: "ai-marketing-agents-scope.svg",
    alt: "Interface diagram of buyer-intent scope flowing into a ranked lead inbox",
    sequence: ["Scope", "Ranked lead inbox"],
    cards: ["scope", "lead-inbox"],
    minTspans: 0,
  },
  {
    filename: "seo-aeo-review-loop.svg",
    alt: "Interface diagram of an SEO and AEO draft moving through review, publishing, and measurement",
    sequence: ["Question", "Review", "Publish", "Measurement"],
    cards: ["question", "review", "publish", "measurement"],
    minTspans: 8,
  },
  {
    filename: "x-instagram-review-flow.svg",
    alt: "Interface diagram of attributed X and Instagram inspiration moving through draft and human review",
    sequence: ["Attributed source", "Draft/script", "Human review"],
    cards: ["attributed-source", "draft-script", "human-review"],
    minTspans: 6,
  },
  {
    filename: "ads-approval-boundary.svg",
    alt: "Interface diagram of an ad proposal moving through confirmation, policy guards, and action history",
    sequence: ["Measured signal", "Paused proposal", "Confirmation", "Policy guard", "History"],
    cards: ["measured-signal", "paused-proposal", "confirmation", "policy-guard", "history"],
    minTspans: 8,
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
  assertAccessibleName(svg, asset.alt, label);
  assert.match(svg, />Interface diagram</, `${label}: must visibly label itself as an interface diagram`);
  assert.match(svg, />Synthetic labels only</, `${label}: must visibly disclose synthetic labels`);
  assert.match(svg, />Not a screenshot</, `${label}: must visibly avoid impersonating a screenshot`);

  assertWorkflowSequence(svg, asset.sequence, label);
  assertCardLayoutMetadata(svg, asset, label);
  assertNoUnsafeMarkup(svg, label);
}

const chromePath = findChrome();
if (chromePath) {
  assertRenderedTextBounds(chromePath, expectedAssets);
  console.log("Rendered text bounds checked with headless Chrome at 1440x900 and 720x450.");
} else {
  console.log("Headless Chrome unavailable; enforced static card-bound metadata and tspan layout contract.");
}

console.log(`Feature asset verification passed for ${expectedAssets.length} safe SVG diagrams.`);

function assertAccessibleName(svg, expectedAlt, label) {
  const ariaIds = svg.match(/\baria-labelledby="([^"]+)"/)?.[1].trim().split(/\s+/) ?? [];
  assert.equal(ariaIds.length, 2, `${label}: aria-labelledby must reference exactly title and desc IDs`);

  const titles = [...svg.matchAll(/<title\b([^>]*)>([\s\S]*?)<\/title>/g)];
  const descs = [...svg.matchAll(/<desc\b([^>]*)>([\s\S]*?)<\/desc>/g)];
  assert.equal(titles.length, 1, `${label}: must contain exactly one title`);
  assert.equal(descs.length, 1, `${label}: must contain exactly one desc`);

  const titleId = idFromAttributes(titles[0][1]);
  const descId = idFromAttributes(descs[0][1]);
  assert.equal(titleId, ariaIds[0], `${label}: first aria-labelledby ID must resolve to the title`);
  assert.equal(descId, ariaIds[1], `${label}: second aria-labelledby ID must resolve to the desc`);
  assert.equal(titles[0][2].trim(), escapeXml(expectedAlt), `${label}: title must match the exact alt contract`);
  assert.ok(descs[0][2].trim().length >= 40, `${label}: desc must be nonempty and useful`);

  const titleIndex = svg.indexOf("<title");
  const descIndex = svg.indexOf("<desc");
  const firstNonMetadataIndex = svg.indexOf("<defs");
  assert.ok(titleIndex > -1 && descIndex > titleIndex, `${label}: title must precede desc`);
  assert.ok(firstNonMetadataIndex > descIndex, `${label}: title and desc must appear before visual content`);
}

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

function assertCardLayoutMetadata(svg, asset, label) {
  const cardMatches = [...svg.matchAll(/<g\b[^>]*\bdata-card="([^"]+)"[^>]*>/g)];
  assert.deepEqual(
    cardMatches.map((match) => match[1]).sort(),
    [...asset.cards].sort(),
    `${label}: must declare exact card-bound metadata for every workflow card`,
  );
  assert.equal((svg.match(/\bdata-card-box="true"/g) ?? []).length, asset.cards.length, `${label}: every card needs a measured card box`);
  assert.ok((svg.match(/<tspan\b/g) ?? []).length >= asset.minTspans, `${label}: wrapped cards must use explicit tspan layout`);
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

function assertRenderedTextBounds(chromePath, assets) {
  const renderDir = mkdtempSync(join(tmpdir(), "feature-asset-render-"));
  try {
    for (const asset of assets) {
      const file = join(assetDir, asset.filename);
      const svg = readFileSync(file, "utf8");
      for (const size of [
        { width: 1440, height: 900 },
        { width: 720, height: 450 },
      ]) {
        const result = renderAndMeasure(chromePath, renderDir, asset.filename, svg, size);
        assert.equal(result.cards.length, asset.cards.length, `${asset.filename} ${size.width}x${size.height}: measured card count mismatch`);
        assert.deepEqual(
          result.cards.map((card) => card.id).sort(),
          [...asset.cards].sort(),
          `${asset.filename} ${size.width}x${size.height}: measured card IDs mismatch`,
        );
        assert.deepEqual(result.failures, [], `${asset.filename} ${size.width}x${size.height}: rendered text overflow:\n${result.failures.join("\n")}`);
      }
    }
  } finally {
    rmSync(renderDir, { recursive: true, force: true });
  }
}

function renderAndMeasure(chromePath, renderDir, filename, svg, size) {
  const htmlPath = join(renderDir, `${filename}-${size.width}x${size.height}.html`);
  writeFileSync(
    htmlPath,
    `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin: 0; padding: 0; width: ${size.width}px; height: ${size.height}px; overflow: hidden; }
    svg { display: block; width: ${size.width}px; height: ${size.height}px; }
  </style>
</head>
<body>
${svg}
<script>
  const failures = [];
  const cards = Array.from(document.querySelectorAll("g[data-card]")).map((card) => {
    const box = card.querySelector("[data-card-box='true']");
    if (!box) {
      failures.push(card.getAttribute("data-card") + ": missing data-card-box");
      return { id: card.getAttribute("data-card"), textCount: 0 };
    }
    const cardRect = box.getBoundingClientRect();
    const texts = Array.from(card.querySelectorAll("text"));
    for (const text of texts) {
      const textRect = text.getBoundingClientRect();
      const content = text.textContent.replace(/\\s+/g, " ").trim();
      const pad = 7;
      if (textRect.left < cardRect.left - 1 || textRect.right > cardRect.right + 1 || textRect.top < cardRect.top - 1 || textRect.bottom > cardRect.bottom + 1) {
        failures.push(card.getAttribute("data-card") + ": " + JSON.stringify(content) + " escapes card bounds");
      }
      if (textRect.width > cardRect.width - pad || textRect.height > cardRect.height - pad) {
        failures.push(card.getAttribute("data-card") + ": " + JSON.stringify(content) + " is too large for card");
      }
    }
    return { id: card.getAttribute("data-card"), textCount: texts.length };
  });
  document.body.setAttribute("data-feature-asset-result", encodeURIComponent(JSON.stringify({ cards, failures })));
</script>
</body>
</html>`,
  );
  const dom = execFileSync(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--dump-dom",
    pathToFileURL(htmlPath).href,
  ], {
    encoding: "utf8",
    timeout: 20_000,
  });
  const encoded = dom.match(/data-feature-asset-result="([^"]+)"/)?.[1];
  assert.ok(encoded, `${filename} ${size.width}x${size.height}: Chrome measurement result missing`);
  return JSON.parse(decodeURIComponent(encoded));
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function idFromAttributes(attributes) {
  return attributes.match(/\bid="([^"]+)"/)?.[1] ?? null;
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
