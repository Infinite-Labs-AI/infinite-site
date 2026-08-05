import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const indexHtml = fs.readFileSync(path.join(root, "tools/index.html"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const script = fs.readFileSync(path.join(root, "assets/seo-tools.js"), "utf8");

const expectedTools = [
  { slug: "high-intent-lead-finder-template", generator: "leads" },
  { slug: "seo-geo-brief-generator", generator: "seo-geo" },
  { slug: "landing-page-ab-test-ideas-generator", generator: "landing-tests" },
  { slug: "founder-content-ideas-generator", generator: "content" },
  { slug: "meta-tag-generator", generator: "snippets" },
  { slug: "product-title-generator", generator: "product-titles" },
  { slug: "break-even-roas-calculator", generator: "break-even-roas" },
  { slug: "profit-margin-calculator", generator: "profit-margin" },
  { slug: "creative-brief-builder", generator: "creative-brief" },
  { slug: "marketing-planner-template", generator: "marketing-planner" },
  { slug: "seo-content-roi-calculator", generator: "seo-content-roi" },
  { slug: "competitor-alternative-brief-generator", generator: "competitor-alternative" },
  { slug: "landing-page-conversion-scorecard", generator: "landing-scorecard" },
  { slug: "content-cluster-generator", generator: "content-cluster" },
  { slug: "customer-acquisition-bottleneck-finder", generator: "acquisition-bottleneck" },
  { slug: "internal-linking-map-generator", generator: "internal-linking-map" },
  { slug: "founder-linkedin-bio-generator", generator: "linkedin-bio" },
  { slug: "go-to-market-plan-generator", generator: "gtm-plan" },
];

const failures = [];

for (const tool of expectedTools) {
  const pagePath = path.join(root, "tools", tool.slug, "index.html");
  if (!fs.existsSync(pagePath)) {
    failures.push(`Missing page: tools/${tool.slug}/index.html`);
    continue;
  }

  const html = fs.readFileSync(pagePath, "utf8");
  if (!html.includes(`data-generator="${tool.generator}"`)) failures.push(`Missing generator binding for ${tool.slug}`);
  if (!html.includes("https://infinite.fast/")) failures.push(`Missing infinite.fast canonical context for ${tool.slug}`);
  if (!html.includes("src=\"/assets/seo-tools.js")) failures.push(`Missing shared tool script on ${tool.slug}`);
  if (!indexHtml.includes(`/tools/${tool.slug}/`)) failures.push(`Missing catalog link for ${tool.slug}`);
  if (!sitemap.includes(`https://infinite.fast/tools/${tool.slug}/`)) failures.push(`Missing sitemap URL for ${tool.slug}`);
  if (!script.includes(`"${tool.generator}"`)) failures.push(`Missing shared generator ${tool.generator}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Verified ${expectedTools.length} deterministic Infinite tool pages.`);
