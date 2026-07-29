import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const POLICY_AGENTS = [
  "*",
  "OAI-SearchBot",
  "GPTBot",
  "Claude-SearchBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
];

const FETCH_AGENTS = [
  "OAI-SearchBot/1.0",
  "GPTBot/1.2",
  "Claude-SearchBot/1.0",
  "ClaudeBot/1.0",
  "PerplexityBot/1.0",
  "CCBot/2.0",
];

const SITE_CONFIGS = [
  {
    name: "main",
    origin: "https://infinite.fast",
    robotsUrl: "https://infinite.fast/robots.txt",
    sitemapUrl: "https://infinite.fast/sitemap.xml",
    privatePaths: ["/api/", "/ingest/"],
    requiresStructuredData(url) {
      return !["/privacy/", "/terms/"].includes(new URL(url).pathname);
    },
  },
  {
    name: "blog",
    origin: "https://blog.infinite.fast",
    robotsUrl: "https://blog.infinite.fast/robots.txt",
    sitemapUrl: "https://blog.infinite.fast/sitemap.xml",
    privatePaths: ["/api/", "/auth/", "/editor/", "/preview/"],
    requiresStructuredData() {
      return true;
    },
  },
];

export function parseSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    decodeXml(match[1]),
  );
}

export function validateRobots(robots, {
  agents,
  privatePaths,
  sitemapUrl,
}) {
  const issues = [];
  const groups = robots
    .split(/\n\s*\n/)
    .filter((block) => /^User-agent:/m.test(block));

  for (const agent of agents) {
    const group = groups.find((block) =>
      block
        .split("\n")
        .some((line) => line.trim().toLowerCase() === `user-agent: ${agent}`.toLowerCase()),
    );

    if (!group) {
      issues.push(`${agent} has no explicit robots group`);
      continue;
    }
    if (!hasDirective(group, "Allow", "/")) {
      issues.push(`${agent} is missing Allow: /`);
    }
    for (const path of privatePaths) {
      if (!hasDirective(group, "Disallow", path)) {
        issues.push(`${agent} is missing Disallow: ${path}`);
      }
    }
  }

  if (!robots.split("\n").some((line) =>
    line.trim().toLowerCase() === `sitemap: ${sitemapUrl}`.toLowerCase())) {
    issues.push(`robots.txt is missing Sitemap: ${sitemapUrl}`);
  }

  return issues;
}

export function validateHtmlDocument(html, {
  expectedCanonical,
  requireStructuredData,
}) {
  const issues = [];
  const canonical = getAttributeFromTag(html, "link", "rel", "canonical", "href");
  const robots = getAttributeFromTag(html, "meta", "name", "robots", "content");
  const structuredDataBlocks = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((match) => match[1].trim());
  const bodyText = html
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html)) {
    issues.push("raw HTML is missing an h1");
  }
  if (!canonical) {
    issues.push("canonical link is missing");
  } else if (normalizeUrl(canonical) !== normalizeUrl(expectedCanonical)) {
    issues.push(`canonical is ${canonical}, expected ${expectedCanonical}`);
  }
  if (robots && /\bnoindex\b/i.test(robots)) {
    issues.push("robots meta contains noindex");
  }
  if (bodyText.length < 200) {
    issues.push("raw HTML body is too small");
  }
  if (requireStructuredData && structuredDataBlocks.length === 0) {
    issues.push("structured data is missing");
  } else if (structuredDataBlocks.some((block) => {
    try {
      JSON.parse(block);
      return false;
    } catch {
      return true;
    }
  })) {
    issues.push("structured data is invalid JSON");
  }

  return issues;
}

export async function verifySite(config) {
  const issues = [];
  const [robotsResponse, sitemapResponse] = await Promise.all([
    fetchText(config.robotsUrl, "infinite-crawler-readiness/1.0"),
    fetchText(config.sitemapUrl, "infinite-crawler-readiness/1.0"),
  ]);

  if (robotsResponse.status !== 200) {
    issues.push(`${config.robotsUrl} returned ${robotsResponse.status}`);
  } else {
    issues.push(...validateRobots(robotsResponse.body, {
      agents: POLICY_AGENTS,
      privatePaths: config.privatePaths,
      sitemapUrl: config.sitemapUrl,
    }));
  }

  if (sitemapResponse.status !== 200) {
    issues.push(`${config.sitemapUrl} returned ${sitemapResponse.status}`);
    return { name: config.name, urlCount: 0, issues };
  }

  const urls = parseSitemapUrls(sitemapResponse.body);
  const rootUrl = `${config.origin}/`;
  if (!urls.some((url) => normalizeUrl(url) === normalizeUrl(rootUrl))) {
    issues.push(`sitemap is missing ${rootUrl}`);
  }

  for (const url of urls) {
    if (new URL(url).origin !== config.origin) {
      issues.push(`sitemap contains off-origin URL ${url}`);
    }
  }

  const rootChecks = await Promise.all(
    FETCH_AGENTS.map((agent) => fetchText(rootUrl, agent)),
  );
  for (let index = 0; index < rootChecks.length; index += 1) {
    if (rootChecks[index].status !== 200) {
      issues.push(`${rootUrl} returned ${rootChecks[index].status} to ${FETCH_AGENTS[index]}`);
    }
  }

  const pageResults = await mapWithConcurrency(urls, 4, async (url) => {
    const response = await fetchText(url, "OAI-SearchBot/1.0");
    const pageIssues = [];
    if (response.status !== 200) {
      pageIssues.push(`returned ${response.status}`);
      return { url, issues: pageIssues };
    }
    if (!response.contentType.includes("text/html")) {
      pageIssues.push(`returned ${response.contentType || "no content type"}`);
    }
    if (normalizeUrl(response.url) !== normalizeUrl(url)) {
      pageIssues.push(`redirected to ${response.url}`);
    }
    pageIssues.push(...validateHtmlDocument(response.body, {
      expectedCanonical: url,
      requireStructuredData: config.requiresStructuredData(url),
    }));
    return { url, issues: pageIssues };
  });

  for (const result of pageResults) {
    for (const issue of result.issues) {
      issues.push(`${result.url}: ${issue}`);
    }
  }

  return { name: config.name, urlCount: urls.length, issues };
}

async function run() {
  const results = await Promise.all(SITE_CONFIGS.map(verifySite));
  const failures = results.flatMap((result) =>
    result.issues.map((issue) => `${result.name}: ${issue}`),
  );

  if (failures.length) {
    console.error(`Crawler readiness failed with ${failures.length} issue(s):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  const summary = results
    .map((result) => `${result.name} ${result.urlCount} URLs`)
    .join("; ");
  console.log(`Crawler readiness passed: ${summary}.`);
}

function hasDirective(group, name, value) {
  const expected = `${name}: ${value}`.toLowerCase();
  return group.split("\n").some((line) => line.trim().toLowerCase() === expected);
}

function getAttributeFromTag(html, tagName, matchName, matchValue, resultName) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
  for (const tag of tags) {
    const matchAttribute = getAttribute(tag, matchName);
    if (matchAttribute?.toLowerCase() === matchValue.toLowerCase()) {
      return getAttribute(tag, resultName);
    }
  }
  return null;
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match?.[1] ?? null;
}

function normalizeUrl(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function fetchText(url, userAgent) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": userAgent },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    return {
      status: response.status,
      url: response.url,
      contentType: response.headers.get("content-type") ?? "",
      body: await response.text(),
    };
  } catch (error) {
    return {
      status: 0,
      url,
      contentType: "",
      body: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runWorker),
  );
  return results;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  await run();
}
