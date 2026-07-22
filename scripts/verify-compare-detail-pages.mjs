import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const pages = [
  {
    file: "compare/infinite-vs-okara/index.html",
    slug: "infinite-vs-okara",
    competitor: "Okara",
    competitorHost: "okara.ai",
    related: ["/compare/infinite-vs-ploy/", "/compare/infinite-vs-blaze/"],
  },
  {
    file: "compare/infinite-vs-ploy/index.html",
    slug: "infinite-vs-ploy",
    competitor: "Ploy",
    competitorHost: "ploy.ai",
    related: ["/compare/infinite-vs-okara/", "/compare/infinite-vs-blaze/"],
  },
  {
    file: "compare/infinite-vs-blaze/index.html",
    slug: "infinite-vs-blaze",
    competitor: "Blaze",
    competitorHost: "blaze.ai",
    related: ["/compare/infinite-vs-okara/", "/compare/infinite-vs-ploy/"],
  },
];

const requiredH2s = [
  "Quick verdict",
  "Methodology",
  "Key use cases",
  "Limitations and tradeoffs",
  "Sourced feature table",
  "FAQs",
  "Related comparisons",
];

const failures = [];

for (const page of pages) {
  const html = readFile(page.file);
  const h2s = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map(
    (match) => stripTags(match[1]).trim(),
  );

  if (html.includes("https://www.infinite.fast")) {
    failures.push(`${page.file} contains a www.infinite.fast absolute URL`);
  }

  requireIncludes(
    page,
    html,
    `https://infinite.fast/compare/${page.slug}/`,
    "apex canonical or metadata URL",
  );
  requireIncludes(page, html, "/assets/compare-pages.css", "comparison stylesheet");
  requireIncludes(page, html, "Last reviewed:", "last reviewed date");
  requireIncludes(page, html, "Infinite created this comparison", "publisher disclosure");
  requireIncludes(page, html, 'id="methodology"', "methodology anchor");
  requireIncludes(page, html, 'id="comparison-table"', "feature table anchor");
  requireIncludes(page, html, 'id="faqs"', "FAQ anchor");
  requireIncludes(page, html, 'href="/download"', "download CTA");
  requireIncludes(page, html, "Choose Infinite if", "Infinite fit summary");
  requireIncludes(page, html, `Choose ${page.competitor} if`, "competitor fit summary");

  for (const heading of requiredH2s) {
    if (!h2s.includes(heading)) {
      failures.push(`${page.file} missing H2: ${heading}`);
    }
  }

  for (const relatedUrl of page.related) {
    requireIncludes(page, html, `href="${relatedUrl}"`, `related link ${relatedUrl}`);
  }

  const citationCount = countMatches(
    html,
    new RegExp(
      `<a\\b[^>]*class="[^"]*compare-citation[^"]*"[^>]*href="https?:\\/\\/(?:www\\.)?${escapeRegExp(
        page.competitorHost,
      )}[^"]*"`,
      "gi",
    ),
  );

  if (citationCount < 5) {
    failures.push(
      `${page.file} has ${citationCount} official competitor citations; expected at least 5`,
    );
  }

  const tableMatch = html.match(
    /<table\b[^>]*id="comparison-table"[\s\S]*?<\/table>/i,
  );
  if (!tableMatch) {
    failures.push(`${page.file} missing sourced feature table`);
  } else {
    const rows = tableMatch[0].match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
    if (rows.length < 6) {
      failures.push(`${page.file} feature table has ${rows.length - 1} body rows; expected at least 5`);
    }
    for (const row of rows.slice(1)) {
      if (!/compare-citation/.test(row)) {
        failures.push(`${page.file} has a feature table row without a citation`);
        break;
      }
    }
  }

  const faqQuestions = countMatches(html, /<details\b[^>]*class="[^"]*compare-faq/gi);
  if (faqQuestions < 3) {
    failures.push(`${page.file} has ${faqQuestions} FAQs; expected at least 3`);
  }

  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(
    (match) => parseJsonLd(page.file, match[1]),
  );

  if (!hasSchema(ldBlocks, "BreadcrumbList")) {
    failures.push(`${page.file} missing BreadcrumbList schema`);
  }
  if (!hasSchema(ldBlocks, "FAQPage")) {
    failures.push(`${page.file} missing FAQPage schema`);
  }
  if (!hasSchema(ldBlocks, "Article")) {
    failures.push(`${page.file} missing Article schema`);
  }
}

if (failures.length > 0) {
  console.error("Comparison detail verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Comparison detail verification passed for ${pages.length} pages.`);

function readFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function requireIncludes(page, html, needle, label) {
  if (!html.includes(needle)) {
    failures.push(`${page.file} missing ${label}: ${needle}`);
  }
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function parseJsonLd(file, rawJson) {
  try {
    return JSON.parse(rawJson);
  } catch (error) {
    failures.push(`${file} contains invalid JSON-LD: ${error.message}`);
    return null;
  }
}

function hasSchema(blocks, schemaType) {
  return blocks.some((block) => containsSchemaType(block, schemaType));
}

function containsSchemaType(value, schemaType) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.some((item) => containsSchemaType(item, schemaType));
  }
  if (value["@type"] === schemaType) return true;
  if (Array.isArray(value["@graph"])) {
    return value["@graph"].some((item) => containsSchemaType(item, schemaType));
  }
  return false;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
