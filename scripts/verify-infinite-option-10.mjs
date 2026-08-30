import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const repoRoot = new URL("../", import.meta.url);
const artifactRoot = new URL("_agent_artifacts/infinite-option-10/", repoRoot);
const pagePath = new URL("index.html", artifactRoot);
const rootIndexPath = new URL("index.html", repoRoot);
const wrangleArtifactRoot = new URL("_agent_artifacts/infinite-option-4-desktop-tokens/", repoRoot);
const wranglePagePath = new URL("index-scheme-wrangle.html", wrangleArtifactRoot);
const wrangleStylePaths = [
  new URL("homepage-critical.css", wrangleArtifactRoot),
  new URL("light-common.css", wrangleArtifactRoot),
  new URL("scheme-variants.css", wrangleArtifactRoot),
];

const failures = [];

if (pagePath.href === rootIndexPath.href) {
  failures.push("Verifier target must be _agent_artifacts/infinite-option-10/index.html, not root index.html");
}

let html = "";
try {
  html = await readFile(pagePath, "utf8");
} catch {
  failures.push("Missing artifact file: _agent_artifacts/infinite-option-10/index.html");
}

let wrangleHtml = "";
try {
  wrangleHtml = await readFile(wranglePagePath, "utf8");
} catch {
  failures.push("Missing homepage artifact file: _agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html");
}

let wrangleStyles = "";
try {
  wrangleStyles = (await Promise.all(wrangleStylePaths.map((stylePath) => readFile(stylePath, "utf8")))).join("\n");
} catch {
  failures.push("Missing homepage style source required for dead-feature checks");
}

const requiredSnippets = [
  "<title>Infinite - Growth agents for ambitious founders</title>",
  "The growth operating system for ambitious founders.",
  "Autonomous growth agents",
  "Give growth work to agents.",
  "What founders say when growth starts moving.",
  "Agents that do the work.",
  "Give Infinite the outcome. Its agents find the signal, prepare the work, and bring the right decisions back to you.",
  "Infinite Signal",
  "Raw conversation",
  "Open to tools that can automate this end to end.",
  "Automate end-to-end customer onboarding.",
  "Replay analysis",
  'signalDemo.dataset.signalState = "opportunity";',
  "Find buyers already asking for help.",
  "Ship more ads from better signal.",
  "Turn search demand into published pages.",
  "Find the leak. Launch the better page.",
  'data-feature-scene="reddit"',
  'data-feature-scene="meta"',
  'data-feature-scene="seo"',
  'data-feature-scene="conversion"',
  "More growth work shipped. Less founder bandwidth burned.",
  "Set the goal. Stay in control.",
  "Infinite handles the repeatable work. You keep the judgment calls that shape the company.",
  "All of Infinite. One operating system.",
  "One price. No usage credits.",
  "Questions, answered.",
  "../../assets/infinite/black-hole-command-hero-desktop.webp",
  "../../assets/infinite/black-hole-command-hero-mobile.webp",
  "../../assets/infinite/infinite-command-center-dark-2x.png",
  "../../assets/infinite-option-10/ag1-ads/studio-product.webp",
  "../../assets/infinite-option-10/ag1-ads/morning-routine.webp",
  "../../assets/infinite-option-10/ag1-ads/ingredient-story.webp",
];

const forbiddenSnippets = [
  "another analytics dashboard",
  "reserved for your verified",
  "Orchid, your personal assistant",
  "Matrix - Launch a 0-Person Company",
  "Obsidian - The all-in-one platform",
  'signalDemo.dataset.signalState = "split";',
  'signalDemo.dataset.signalState = "splitting";',
];

const approvedAssets = [
  "../../assets/infinite/black-hole-command-hero-desktop.webp",
  "../../assets/infinite/black-hole-command-hero-mobile.webp",
  "../../assets/infinite/infinite-command-center-dark-2x.png",
  "../../assets/infinite-option-10/ag1-ads/studio-product.webp",
  "../../assets/infinite-option-10/ag1-ads/morning-routine.webp",
  "../../assets/infinite-option-10/ag1-ads/ingredient-story.webp",
];

for (const snippet of requiredSnippets) {
  if (!html.includes(snippet)) failures.push(`Missing required snippet: ${snippet}`);
}

for (const snippet of forbiddenSnippets) {
  if (html.toLowerCase().includes(snippet.toLowerCase())) {
    failures.push(`Rejected copy or old-site snippet present: ${snippet}`);
  }
}

for (const asset of approvedAssets) {
  if (!html.includes(asset)) failures.push(`Missing approved asset reference: ${asset}`);
}

const countMatches = (pattern) => (html.match(pattern) || []).length;
const proofCardCount = countMatches(/class="[^"]*\bproof-card\b/g);
const featureSceneCount = countMatches(/class="[^"]*\bfeature-scene\b/g);
const signalWindowCount = countMatches(/class="[^"]*\bsignal-window\b/g);
const signalDividerCount = countMatches(/class="[^"]*\bsignal-divider\b/g);
const signalReplayCount = countMatches(/<button\b[^>]*\bdata-signal-replay\b/g);
const adAngleCount = countMatches(/class="[^"]*\bad-angle\b/g);
const seoTopicCount = countMatches(/class="[^"]*\bseo-topic\b/g);
const variantOptionCount = countMatches(/class="[^"]*\bvariant-option\b/g);
const workflowItemCount = countMatches(/class="[^"]*\bworkflow-item\b/g);
const billingOptionCount = countMatches(/class="[^"]*\bbilling-option\b/g);

if (proofCardCount !== 4) failures.push(`Expected exactly 4 proof cards, found ${proofCardCount}`);
if (featureSceneCount !== 4) failures.push(`Expected exactly 4 feature scenes, found ${featureSceneCount}`);
if (signalWindowCount !== 1) failures.push(`Expected exactly 1 Reddit signal window, found ${signalWindowCount}`);
if (signalDividerCount !== 1) failures.push(`Expected exactly 1 Reddit signal divider, found ${signalDividerCount}`);
if (signalReplayCount !== 1) failures.push(`Expected exactly 1 Reddit replay control, found ${signalReplayCount}`);
if (adAngleCount !== 3) failures.push(`Expected exactly 3 Meta ad angle controls, found ${adAngleCount}`);
if (seoTopicCount !== 3) failures.push(`Expected exactly 3 SEO topic controls, found ${seoTopicCount}`);
if (variantOptionCount !== 2) failures.push(`Expected exactly 2 conversion variants, found ${variantOptionCount}`);
if (workflowItemCount !== 5) failures.push(`Expected exactly 5 workflow items, found ${workflowItemCount}`);
if (billingOptionCount !== 2) failures.push(`Expected exactly 2 billing toggle options, found ${billingOptionCount}`);

for (const [label, pattern] of [
  ["Meta ad angle", /class="[^"]*\bad-angle\b[^"]*"[^>]*aria-pressed="true"/g],
  ["SEO topic", /class="[^"]*\bseo-topic\b[^"]*"[^>]*aria-pressed="true"/g],
  ["conversion variant", /class="[^"]*\bvariant-option\b[^"]*"[^>]*aria-pressed="true"/g],
]) {
  const selectedCount = countMatches(pattern);
  if (selectedCount !== 1) failures.push(`Expected exactly 1 selected ${label} control, found ${selectedCount}`);
}

const pressedBillingOptions = countMatches(/class="[^"]*\bbilling-option\b[^"]*"[^>]*aria-pressed="true"/g);
if (pressedBillingOptions !== 1) failures.push(`Expected exactly 1 active billing option, found ${pressedBillingOptions}`);

for (const action of ["seo"]) {
  if (!html.includes(`data-scene-action="${action}"`)) failures.push(`Missing ${action} scene cycle action`);
}

for (const id of [
  "reddit-signal-demo",
  "signal-raw-thread",
  "signal-opportunity",
  "signal-divider",
  "signal-phrase",
  "signal-state-label",
  "reddit-status",
  "ad-headline",
  "seo-title",
  "conversion-headline",
]) {
  if (!html.includes(`id="${id}"`)) failures.push(`Missing interactive scene output: ${id}`);
}

for (const obsoleteContract of ["lead-card", 'data-scene-action="reddit"']) {
  if (html.includes(obsoleteContract)) failures.push(`Obsolete Reddit interaction contract present: ${obsoleteContract}`);
}

if (wrangleHtml) {
  const requiredWrangleSnippets = [
    '<link rel="canonical" href="https://infinite.fast/">',
    '<meta property="og:url" content="https://infinite.fast/">',
    'https://infinite.fast/assets/infinite/ai-cmo-social-preview.png',
    '"@id": "https://infinite.fast/#organization"',
    '"@id": "https://infinite.fast/#website"',
    '"@id": "https://infinite.fast/#software"',
    '"@id": "https://infinite.fast/#faq"',
    "Find leads, automate SEO, plan landing-page CRO tests, and uncover trending content.",
    '<link rel="preload" as="image" href="assets/hero/relay-hq-dashboard-928.avif"',
    'imagesrcset="assets/hero/relay-hq-dashboard-624.avif 624w, assets/hero/relay-hq-dashboard-928.avif 928w, assets/hero/relay-hq-dashboard-1240.avif 1240w"',
    '<picture class="wrangle-product-picture">',
    '<source type="image/avif" srcset="assets/hero/relay-hq-dashboard-624.avif 624w, assets/hero/relay-hq-dashboard-928.avif 928w, assets/hero/relay-hq-dashboard-1240.avif 1240w"',
    '<source type="image/webp" srcset="assets/hero/relay-hq-dashboard-624.webp 624w, assets/hero/relay-hq-dashboard-928.webp 928w, assets/hero/relay-hq-dashboard-1240.webp 1240w"',
    'width="1238" height="866" fetchpriority="high" loading="eager" decoding="async"',
    "Loved by founders building in public",
    "assets/edyme-avatar.png",
    "assets/harshsaver-avatar.png",
    "https://x.com/justedyme",
    "https://x.com/harshsaver/status/2079496777783460227?s=20",
    "building an AI growth agent for founders that acts more like a chief of staff than another dashboard",
    "this has been a lifesaver!",
    "Put growth on <span>auto-pilot</span>",
    '"sameAs": [',
    '"offers": [',
    'data-download-location="hero"',
    'data-download-location="pricing"',
    'data-pricing-plan="max"',
    'data-pricing-plan="ultra"',
    'data-pricing-billing="monthly"',
    'data-pricing-billing="annual"',
    'data-pricing-value="max"',
    'data-pricing-value="ultra"',
    "Infinite Max",
    "Infinite Ultra",
    "AI Visibility",
    "Reels",
    "Competitor Tracking",
    "Billed monthly",
    "Demo data",
    'class="footer-label"',
  ];

  const forbiddenWrangleSnippets = [
    "https://www.infinite.fast",
    "Find leads, automates",
    "Trusted by top founders",
    "Public proof and release details",
    "Official release",
    "Current public build",
    "Growth loop</strong><em>Signal to action",
    "Put growth into a review-first loop",
    "macOS 12+",
    "Apple Silicon only",
    "Developer ID signed and Apple notarized",
    "Intel Macs are not currently supported",
    "Latest release notes",
    "Publishing, outreach, and consequential changes stay review-first",
    "Publishing, outreach, and consequential changes remain review-first",
    "filter: invert(1)",
    "Drew Lang",
    "@sanafounder",
    "Operator Notes",
    "@operator",
    "Kai Chen",
    "Nina Tran",
    "@hugo",
    "v0.2.15",
    "/releases/tag/v0.2.15",
    "calendar.app.google",
    'id="demo-modal"',
    ".demo-modal",
    ".calendar-shell",
    "calendar-frame",
    "data-open-demo",
    "Book a demo call",
    "<h4>",
    "</h4>",
    "Then $49/mo",
    '"price": "49"',
    "All in one",
  ];

  for (const snippet of requiredWrangleSnippets) {
    if (!wrangleHtml.includes(snippet)) failures.push(`Missing homepage audit snippet: ${snippet}`);
  }

  const requiredWrangleStyleSnippets = [
    ".founder-x-strip-two {",
    ".founder-x-card {",
    "box-shadow: 0 16px 40px rgba(31, 72, 112, 0.075);",
    ".pricing-tier-grid {",
    ".pricing-plan--ultra {",
    ".pricing-shared {",
  ];

  for (const snippet of requiredWrangleStyleSnippets) {
    if (!wrangleStyles.includes(snippet)) failures.push(`Missing homepage style snippet: ${snippet}`);
  }

  const ultraCtaRule = wrangleStyles.match(/\.pricing-plan--ultra \.pricing-cta\s*\{([^}]*)\}/)?.[1] ?? "";
  for (const declaration of [
    "color: #171717 !important;",
    "background: #ffffff !important;",
    "border-color: #ffffff !important;",
    "box-shadow: 0 12px 26px rgba(0, 0, 0, 0.22) !important;",
  ]) {
    if (!ultraCtaRule.includes(declaration)) {
      failures.push(`Ultra pricing CTA must override the global dark CTA: ${declaration}`);
    }
  }

  const wrangleSource = `${wrangleHtml}\n${wrangleStyles}`;
  for (const snippet of forbiddenWrangleSnippets) {
    if (wrangleSource.toLowerCase().includes(snippet.toLowerCase())) {
      failures.push(`Rejected homepage copy or metadata present: ${snippet}`);
    }
  }

  const lcpImgPattern = /<img[^>]+src="assets\/hero\/relay-hq-dashboard\.png"[^>]+alt="Infinite dashboard preview with demo data"[^>]*>/;
  if (!lcpImgPattern.test(wrangleHtml)) {
    failures.push("Missing LCP fallback image with accurate demo-data alt text");
  }

  const focusStylePattern = /:focus-visible[\s\S]*outline:\s*3px solid #128345;/;
  if (!focusStylePattern.test(wrangleHtml)) {
    failures.push("Missing visible keyboard focus style with sufficient contrast");
  }

  const homepagePricingPlanCount = (wrangleHtml.match(/data-pricing-plan="(?:max|ultra)"/g) || []).length;
  if (homepagePricingPlanCount !== 2) {
    failures.push(`Expected exactly 2 homepage pricing plans, found ${homepagePricingPlanCount}`);
  }

  const homepageBillingControlCount = (wrangleHtml.match(/data-pricing-billing="(?:monthly|annual)"/g) || []).length;
  if (homepageBillingControlCount !== 2) {
    failures.push(`Expected exactly 2 homepage billing controls, found ${homepageBillingControlCount}`);
  }

  const pricingCatalogMatch = wrangleHtml.match(/const pricingCatalog = (\{[\s\S]*?\n    \});/);
  if (!pricingCatalogMatch) {
    failures.push("Missing executable homepage pricing catalog");
  } else {
    const pricingCatalog = Function(`"use strict"; return (${pricingCatalogMatch[1]});`)();
    const expectedPricingCatalog = {
      max: {
        monthly: { price: "$60", note: "Billed monthly" },
        annual: { price: "$50", note: "Billed $600/year" },
      },
      ultra: {
        monthly: { price: "$200", note: "Billed monthly" },
        annual: { price: "$180", note: "Billed $2,160/year" },
      },
    };
    if (JSON.stringify(pricingCatalog) !== JSON.stringify(expectedPricingCatalog)) {
      failures.push(`Homepage pricing catalog mismatch: ${JSON.stringify(pricingCatalog)}`);
    }
  }

  for (const [label, pattern] of [
    ["79 agent tools", />79<\/strong><span>agent tools<\/span>/],
    ["One growth operating system", />One<\/strong><span>growth operating system<\/span>/],
  ]) {
    if (!pattern.test(wrangleHtml)) failures.push(`Missing pricing proof: ${label}`);
  }

  if (!wrangleHtml.includes("data-pricing-proof")) failures.push("Missing pricing proof strip contract");
  if (!wrangleHtml.includes("data-pricing-matrix")) failures.push("Missing expanded pricing matrix contract");
  if (!wrangleHtml.includes("data-pricing-closing-cta")) failures.push("Missing closing pricing CTA contract");

  const pricingGroupIds = [...wrangleHtml.matchAll(/data-pricing-group="([^"]+)"/g)].map((match) => match[1]);
  const expectedPricingGroupIds = [
    "leads",
    "seo",
    "ads",
    "content",
    "conversion",
    "analytics",
    "brand",
    "competitive",
  ];
  if (JSON.stringify(pricingGroupIds) !== JSON.stringify(expectedPricingGroupIds)) {
    failures.push(`Pricing group mismatch: ${JSON.stringify(pricingGroupIds)}`);
  }

  const pricingFeatureIds = [...wrangleHtml.matchAll(/data-pricing-feature="([^"]+)"/g)].map((match) => match[1]);
  if (pricingFeatureIds.length !== 21) {
    failures.push(`Expected exactly 21 pricing feature rows, found ${pricingFeatureIds.length}`);
  }
  if (new Set(pricingFeatureIds).size !== pricingFeatureIds.length) {
    failures.push("Pricing feature row IDs must be unique");
  }

  const ultraOnlyFeatureIds = [...wrangleHtml.matchAll(/data-pricing-feature="([^"]+)"[^>]*data-ultra-only="true"/g)]
    .map((match) => match[1]);
  const expectedUltraOnlyFeatureIds = [
    "ai-visibility",
    "faceless-youtube",
    "reels",
    "landing-page-cro-planning",
    "competitor-tracking",
  ];
  if (JSON.stringify(ultraOnlyFeatureIds) !== JSON.stringify(expectedUltraOnlyFeatureIds)) {
    failures.push(`Ultra-only pricing feature mismatch: ${JSON.stringify(ultraOnlyFeatureIds)}`);
  }

  for (const label of [
    "AI Visibility and citation monitoring",
    "Faceless YouTube video generation",
    "Reels creation",
    "Landing-page CRO planning and test ideas for existing pages",
    "Competitor Tracking across content, pricing, and ads",
  ]) {
    if (!wrangleHtml.includes(label)) failures.push(`Missing Ultra-only pricing label: ${label}`);
  }

  for (const [label, pattern] of [
    ["Solo founders from $0 to $10k MRR", /Solo founders<\/strong> from \$0 to \$10k MRR/],
    ["Small bootstrapped teams", /<strong>Small bootstrapped teams<\/strong>/],
    ["Content creators building distribution", /Content creators<\/strong> building distribution/],
    ["Fast-growing, venture-backed teams", /<strong>Fast-growing, venture-backed teams<\/strong>/],
    ["Companies above $10k MRR", /<strong>Companies above \$10k MRR<\/strong>/],
    ["Teams scaling multiple channels and content output", /Teams scaling multiple channels<\/strong> and content output/],
  ]) {
    if (!pattern.test(wrangleHtml)) failures.push(`Missing pricing audience statement: ${label}`);
  }

  for (const condensedLabel of [
    "Lead scanners: Reddit, X, and Facebook Groups",
    "Buyer-intent qualification, source context, and next actions",
    "Ad creative generation and research",
    "Instagram and X content intelligence",
    "Tracked links and UTMs",
    "Analytics and search connections: GA4, PostHog, and Google Search Console",
    "Growth stack connections: Meta, Instagram, X, Stripe, Shopify, Codex, and Gemini",
  ]) {
    if (!wrangleHtml.includes(condensedLabel)) failures.push(`Missing condensed pricing capability: ${condensedLabel}`);
  }

  if (!wrangleHtml.includes("Meta Ads and creative")) failures.push("Missing merged Meta Ads and creative group title");

  for (const removedCopy of [
    "21</strong><span>product surfaces",
    "Command Center and Chat with Infinite",
    "Agent tasks, status, and run history",
    "Review-first approvals",
    "Write, critique, and revise content",
    "Meta Ads performance",
    "Brand, audience, positioning, products, and goals",
  ]) {
    if (wrangleHtml.includes(removedCopy)) failures.push(`Removed pricing copy still present: ${removedCopy}`);
  }

  if (/<details[^>]*class="[^"]*pricing-matrix/.test(wrangleHtml) || wrangleHtml.includes("data-pricing-collapsed")) {
    failures.push("Expanded pricing matrix must never collapse");
  }

  const desktopMatrixRowRule = wrangleStyles.match(/\.pricing-matrix-row\s*\{([^}]*)\}/)?.[1] ?? "";
  if (!desktopMatrixRowRule.includes("grid-template-columns: minmax(0, 1fr) 92px 112px;")) {
    failures.push("Missing three-column desktop pricing matrix row contract");
  }
  if (!/@media \(max-width: 760px\)[\s\S]*?\.pricing-matrix-row\s*\{[^}]*grid-template-columns: 1fr;/.test(wrangleStyles)) {
    failures.push("Missing one-column mobile pricing matrix row contract");
  }
  if (/\.pricing-matrix[^}]*overflow-x:\s*auto/.test(wrangleStyles)) {
    failures.push("Pricing matrix must not use horizontal scrolling");
  }

  const pricingProofCardRule = wrangleStyles.match(/\.pricing-proof-strip > div\s*\{([^}]*)\}/)?.[1] ?? "";
  for (const declaration of [
    "display: grid;",
    "justify-items: center;",
    "align-content: center;",
  ]) {
    if (!pricingProofCardRule.includes(declaration)) {
      failures.push(`Pricing proof values must stack above their labels: ${declaration}`);
    }
  }
  const pricingProofValueRule = wrangleStyles.match(/\.pricing-proof-strip strong\s*\{([^}]*)\}/)?.[1] ?? "";
  if (!pricingProofValueRule.includes("font-size: clamp(38px, 5vw, 56px);")) {
    failures.push("Pricing proof values must use the larger display scale");
  }
}

if (!/id="price-value"[^>]*>\$50</.test(html)) {
  failures.push('Missing pricing default contract: id="price-value" starts at $50');
}

if (!/data-price="\$50"[^>]*data-note="Billed annually"/.test(html)) {
  failures.push("Missing annual billing data contract: $50 and Billed annually");
}

if (!/data-price="\$60"[^>]*data-note="Billed monthly"/.test(html)) {
  failures.push("Missing monthly billing data contract: $60 and Billed monthly");
}

const visibleText = html
  .replace(/<script\b[\s\S]*?<\/script>/gi, "")
  .replace(/<style\b[\s\S]*?<\/style>/gi, "")
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

if (/[–—]/.test(visibleText)) {
  failures.push("Visible content contains an em dash or en dash");
}

const localReferences = new Set();

const addReference = (value) => {
  if (!value) return;
  const trimmed = value.trim();
  if (
    trimmed === "" ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("%")
  ) {
    return;
  }
  localReferences.add(trimmed);
};

for (const match of html.matchAll(/\s(?:src|href|data-image)="([^"]+)"/g)) {
  addReference(match[1]);
}

for (const match of html.matchAll(/\ssrcset="([^"]+)"/g)) {
  for (const candidate of match[1].split(",")) {
    addReference(candidate.trim().split(/\s+/)[0]);
  }
}

for (const match of html.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
  addReference(match[1]);
}

for (const reference of localReferences) {
  try {
    await access(new URL(reference, artifactRoot), constants.R_OK);
  } catch {
    failures.push(`Missing local reference: ${reference}`);
  }
}

if (wrangleHtml) {
  const wrangleLocalReferences = new Set();
  const addWrangleReference = (value) => {
    if (!value) return;
    const trimmed = value.trim();
    if (
      trimmed === "" ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("/") ||
      trimmed.startsWith("mailto:") ||
      trimmed.startsWith("tel:") ||
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("%")
    ) {
      return;
    }
    wrangleLocalReferences.add(trimmed);
  };

  for (const match of wrangleHtml.matchAll(/\s(?:src|href|data-image)="([^"]+)"/g)) {
    addWrangleReference(match[1]);
  }

  for (const match of wrangleHtml.matchAll(/\ssrcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(",")) {
      addWrangleReference(candidate.trim().split(/\s+/)[0]);
    }
  }

  for (const match of wrangleHtml.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    addWrangleReference(match[1]);
  }

  for (const reference of wrangleLocalReferences) {
    try {
      await access(new URL(reference, wrangleArtifactRoot), constants.R_OK);
    } catch {
      failures.push(`Missing homepage local reference: ${reference}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Verified Infinite Option 10: ${localReferences.size} local references, ${proofCardCount} proof cards, ${featureSceneCount} interactive feature scenes, ${workflowItemCount} workflow items.`
);
