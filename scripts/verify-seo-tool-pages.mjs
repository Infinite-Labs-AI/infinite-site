import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const repoRoot = process.cwd();
const apex = "https://infinite.fast";
const pages = [
  {
    file: "tools/high-intent-lead-finder-template/index.html",
    path: "/tools/high-intent-lead-finder-template/",
    generator: "leads",
    inputs: {
      product: "InvoicePilot",
      icp: "solo consultants chasing overdue invoices",
      category: "accounts receivable automation",
      pain: "clients promise payment next week but never send it",
    },
    expectedTerms: ["InvoicePilot", "solo consultants", "accounts receivable automation", "overdue invoices"],
  },
  {
    file: "tools/seo-geo-brief-generator/index.html",
    path: "/tools/seo-geo-brief-generator/",
    generator: "seo-geo",
    inputs: {
      topic: "AI bookkeeping assistant for Shopify stores",
      product: "LedgerFlow",
      buyer: "Shopify founders",
      differentiator: "finds margin leaks from messy payouts",
    },
    expectedTerms: ["LedgerFlow", "Shopify founders", "AI bookkeeping assistant", "margin leaks"],
  },
  {
    file: "tools/landing-page-ab-test-ideas-generator/index.html",
    path: "/tools/landing-page-ab-test-ideas-generator/",
    generator: "landing-tests",
    inputs: {
      product: "ChurnRadar",
      audience: "B2B SaaS founders",
      cta: "Book a churn audit",
      goal: "increase demo requests from pricing-page visitors",
    },
    expectedTerms: ["ChurnRadar", "B2B SaaS founders", "Book a churn audit", "pricing-page visitors"],
  },
  {
    file: "tools/founder-content-ideas-generator/index.html",
    path: "/tools/founder-content-ideas-generator/",
    generator: "content",
    inputs: {
      product: "HireSignal",
      audience: "recruiting agency owners",
      channel: "LinkedIn",
      insight: "clients ask for senior candidates without a hiring process",
    },
    expectedTerms: ["HireSignal", "recruiting agency owners", "LinkedIn", "senior candidates"],
  },
];

const failures = [];
const js = readFile("assets/seo-tools.js");

for (const eventName of ["tool_started", "tool_generated", "result_copied", "download_clicked"]) {
  assert(js.includes(eventName), `assets/seo-tools.js is missing analytics event "${eventName}"`);
}

const generators = loadGenerators(js);

for (const page of pages) {
  const html = readFile(page.file);
  const expectedUrl = `${apex}${page.path}`;

  assert(!html.includes("https://www.infinite.fast"), `${page.file} still contains www canonical/metadata URLs`);
  assert(html.includes(`rel="canonical" href="${expectedUrl}"`), `${page.file} is missing apex canonical ${expectedUrl}`);
  assert(html.includes(`property="og:url" content="${expectedUrl}"`), `${page.file} is missing apex og:url ${expectedUrl}`);
  assert(html.includes(`data-generator="${page.generator}"`), `${page.file} is missing generator binding ${page.generator}`);
  assert(html.includes("data-result-controls"), `${page.file} is missing result controls container`);
  assert(html.includes("data-copy-result"), `${page.file} is missing copy result control`);
  assert(html.includes("data-download-result"), `${page.file} is missing download result control`);
  assert(html.includes('role="status"'), `${page.file} is missing accessible status feedback`);
  assert(html.includes("Example result"), `${page.file} is missing server-rendered example result`);
  assert(html.includes("Limitations"), `${page.file} is missing limitations content`);
  assert(html.includes("FAQs"), `${page.file} is missing FAQ content`);
  assert(
    extractHrefs(html).some((href) => href.startsWith("https://blog.infinite.fast/") && href !== "https://blog.infinite.fast/"),
    `${page.file} is missing a canonical blog article link`,
  );
  assert(html.includes("#generator-output"), `${page.file} is missing result CTA/link target`);

  const schemas = extractJsonLd(html, page.file);
  assert(
    schemas.some((schema) => schema["@type"] === "WebApplication" && schema.url === expectedUrl),
    `${page.file} is missing truthful WebApplication JSON-LD with apex URL`,
  );
  assert(
    schemas.some((schema) => schema["@type"] === "BreadcrumbList"),
    `${page.file} is missing BreadcrumbList JSON-LD`,
  );

  const generator = generators[page.generator];
  assert(typeof generator === "function", `assets/seo-tools.js does not expose generator "${page.generator}"`);

  if (typeof generator === "function") {
    const rendered = normalizeOutput(generator(page.inputs));
    for (const term of page.expectedTerms) {
      assert(rendered.includes(term), `${page.generator} output does not include input-dependent term "${term}"`);
    }
  }
}

if (failures.length > 0) {
  console.error("SEO tool page verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`SEO tool page verification passed for ${pages.length} tool pages.`);

function readFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function extractJsonLd(html, file) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  return blocks
    .map((match) => {
      try {
        return JSON.parse(match[1]);
      } catch (error) {
        failures.push(`${file} has invalid JSON-LD: ${error.message}`);
        return null;
      }
    })
    .filter(Boolean);
}

function loadGenerators(source) {
  const context = {
    window: {},
    document: {
      querySelectorAll() {
        return [];
      },
      querySelector() {
        return null;
      },
    },
    navigator: {},
    Blob,
    URL,
    console,
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "assets/seo-tools.js" });
  return context.window.InfiniteSeoTools?.generators || {};
}

function normalizeOutput(value) {
  return JSON.stringify(value)
    .replace(/\s+/g, " ")
    .trim();
}

function extractHrefs(html) {
  return [...html.matchAll(/\bhref="([^"]+)"/g)].map((match) => match[1]);
}
