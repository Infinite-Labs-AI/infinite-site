import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const blogSitemapUrl = "https://blog.infinite.fast/sitemap.xml";

const selectedArticleLinks = [
  {
    page: "tools/seo-geo-brief-generator/index.html",
    article: "https://blog.infinite.fast/best-ai-seo-tools-for-founders",
  },
  {
    page: "tools/high-intent-lead-finder-template/index.html",
    article:
      "https://blog.infinite.fast/pipeline-generation-the-operators-playbook-for-consistent-revenue-flow",
  },
  {
    page: "tools/founder-content-ideas-generator/index.html",
    article:
      "https://blog.infinite.fast/best-ai-marketing-tools-ranked-by-use-case-for-lean-teams",
  },
  {
    page: "compare/infinite-vs-okara/index.html",
    article:
      "https://blog.infinite.fast/the-best-ai-marketing-platform-for-growing-brands-in-2026-a-complete-guide",
  },
];

const failures = [];
const liveBlogUrls = new Set(extractLocs(await fetchText(blogSitemapUrl)));

const mainSitemap = readFile("sitemap.xml");
const mainSitemapBlogUrls = extractLocs(mainSitemap).filter((url) =>
  url.startsWith("https://blog.infinite.fast"),
);

if (mainSitemapBlogUrls.length > 0) {
  failures.push(
    `Main sitemap contains blog host URLs: ${mainSitemapBlogUrls.join(", ")}`,
  );
}

const mainPageFiles = [
  ...listIndexFiles("tools"),
  ...listIndexFiles("compare"),
];
const directArticleLinks = [];

for (const file of mainPageFiles) {
  const html = readFile(file);
  for (const href of extractHrefs(html).filter((url) =>
    url.startsWith("https://blog.infinite.fast"),
  )) {
    if (href === "https://blog.infinite.fast/") continue;

    directArticleLinks.push({ page: file, href });

    if (href.startsWith("https://blog.infinite.fast/blog/")) {
      failures.push(`${file} uses a non-canonical /blog/ article URL: ${href}`);
    }

    if (!liveBlogUrls.has(href)) {
      failures.push(`${file} links to an article URL missing from live blog sitemap: ${href}`);
    }
  }
}

const uniqueArticleLinks = new Set(directArticleLinks.map(({ href }) => href));

if (uniqueArticleLinks.size < 3 || uniqueArticleLinks.size > 5) {
  failures.push(
    `Expected 3-5 unique direct blog article links across main pages, found ${uniqueArticleLinks.size}`,
  );
}

for (const { page, article } of selectedArticleLinks) {
  const html = readFile(page);

  if (!liveBlogUrls.has(article)) {
    failures.push(`Expected article is not present in live blog sitemap: ${article}`);
  }

  if (!extractHrefs(html).includes(article)) {
    failures.push(`${page} does not link to expected canonical article: ${article}`);
  }
}

if (failures.length > 0) {
  console.error("SEO article link verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `SEO article link verification passed: ${uniqueArticleLinks.size} canonical article links across ${selectedArticleLinks.length} selected pages; main sitemap has no blog host URLs.`,
);

function readFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function listIndexFiles(directory) {
  const root = path.join(repoRoot, directory);
  const files = [];

  walk(root, files);

  return files
    .filter((file) => path.basename(file) === "index.html")
    .map((file) => path.relative(repoRoot, file));
}

function walk(directory, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) =>
    match[1].trim(),
  );
}

function extractHrefs(html) {
  return [...html.matchAll(/\bhref="([^"]+)"/g)].map((match) => match[1]);
}

async function fetchText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}
