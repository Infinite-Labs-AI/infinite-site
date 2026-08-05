import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const toolSlugs = fs
  .readdirSync(path.join(root, "tools"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((slug) => fs.existsSync(path.join(root, "tools", slug, "index.html")));

const workflowLinks = new Map([
  ["break-even-roas-calculator", ["profit-margin-calculator"]],
  ["profit-margin-calculator", ["break-even-roas-calculator"]],
  ["landing-page-ab-test-ideas-generator", ["landing-page-conversion-scorecard"]],
  ["landing-page-conversion-scorecard", ["landing-page-ab-test-ideas-generator"]],
  ["marketing-planner-template", ["go-to-market-plan-generator"]],
  ["go-to-market-plan-generator", ["marketing-planner-template"]],
  ["founder-content-ideas-generator", ["founder-linkedin-bio-generator"]],
  ["founder-linkedin-bio-generator", ["founder-content-ideas-generator"]],
  ["seo-geo-brief-generator", ["seo-content-roi-calculator", "content-cluster-generator", "internal-linking-map-generator"]],
  ["seo-content-roi-calculator", ["seo-geo-brief-generator", "content-cluster-generator", "internal-linking-map-generator"]],
  ["content-cluster-generator", ["seo-geo-brief-generator", "seo-content-roi-calculator", "internal-linking-map-generator"]],
  ["internal-linking-map-generator", ["seo-geo-brief-generator", "seo-content-roi-calculator", "content-cluster-generator"]],
  ["competitor-alternative-brief-generator", ["seo-geo-brief-generator", "content-cluster-generator"]],
]);

const failures = [];

for (const slug of toolSlugs) {
  const html = fs.readFileSync(path.join(root, "tools", slug, "index.html"), "utf8");
  if (!html.includes('"@type": "FAQPage"') && !html.includes('"@type":"FAQPage"')) failures.push(`${slug}: missing FAQPage schema`);
  if (!html.includes("seo-static-example")) failures.push(`${slug}: missing static example output`);
  if (!html.includes("seo-related-tools")) failures.push(`${slug}: missing related tools block`);
  for (const target of workflowLinks.get(slug) || []) {
    if (!html.includes(`/tools/${target}/`)) failures.push(`${slug}: missing related workflow link to ${target}`);
  }
}

const indexHtml = fs.readFileSync(path.join(root, "tools/index.html"), "utf8");
for (const label of ["Acquisition diagnostics", "SEO and GEO workflow", "Landing page optimization", "Founder content kit", "Unit economics"]) {
  if (!indexHtml.includes(label)) failures.push(`tools index: missing grouped section ${label}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Verified consolidated SEO content for ${toolSlugs.length} tool pages.`);
