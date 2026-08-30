import { absoluteSiteUrl, DOWNLOAD_PATH, HUB_ORIGIN, SITE_ORIGIN } from "./public-site-manifest.mjs";

export function renderSitemapXml(routes) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(renderSitemapRoute).join("\n")}
</urlset>
`;
}

export function renderLlmsText({ routes }) {
  const routeByPath = new Map(routes.map((route) => [route.path, route]));
  const routeLine = (path, label = routeByPath.get(path)?.title) =>
    `- [${label}](${absoluteSiteUrl(path)}): ${routeByPath.get(path)?.llmsSummary}`;

  return `# Infinite

> Infinite is an AI CMO for founders: a desktop app whose agents run search, content, ads, lead generation and conversion, then measure whether AI answer engines actually cite the work.

Infinite is built for solo founders and small teams who have no marketing hire. The public site graph below is generated from the same manifest that drives the sitemap, middleware document inventory, and sitewide footer.

## Product

${routeLine("/", "Infinite")}
${routeLine("/agents/", "Agents")}
- [Download](${SITE_ORIGIN}${DOWNLOAD_PATH}): Mac desktop app (Apple silicon). The server-owned /download path remains the primary conversion route.
${routeLine("/tools/", "Tools")}

## Features and availability

- **Shipped** — [AI Marketing Agents](${absoluteSiteUrl("/features/ai-marketing-agents/")}): ${routeByPath.get("/features/ai-marketing-agents/")?.llmsSummary}
- **Shipped** — [SEO + AEO](${absoluteSiteUrl("/features/seo-aeo/")}): ${routeByPath.get("/features/seo-aeo/")?.llmsSummary}
- **Shipped** — [X + Instagram Content](${absoluteSiteUrl("/features/x-instagram-content/")}): ${routeByPath.get("/features/x-instagram-content/")?.llmsSummary}
- **Shipped** — [AI Ads](${absoluteSiteUrl("/features/ads/")}): ${routeByPath.get("/features/ads/")?.llmsSummary}
- **Current availability** — [Email](${absoluteSiteUrl("/features/email/")}): ${routeByPath.get("/features/email/")?.llmsSummary}
- **CRO + A/B test ideas** — [Websites + A/B Ideas](${absoluteSiteUrl("/features/websites-ab-testing/")}): ${routeByPath.get("/features/websites-ab-testing/")?.llmsSummary}

## Pricing

- [Max](https://infinite.fast/#pricing): $60/month billed monthly, or $50/month billed annually at $600/year.
- [Ultra](https://infinite.fast/#pricing): $200/month billed monthly, or $180/month billed annually at $2,160/year.

## Hub and research

- [Growth Hub](${HUB_ORIGIN}/): Guides on AEO, AI search visibility, SEO for founders, Reddit GTM and AI content operations.
- [Research](${HUB_ORIGIN}/research): Research index on the Infinite Hub.
- [Hub llms.txt](${HUB_ORIGIN}/llms.txt): Machine-readable hub index.

## Comparisons and alternatives

${routeLine("/compare/", "All comparisons")}
${routeLine("/compare/infinite-vs-okara/", "Infinite vs Okara")}
${routeLine("/compare/infinite-vs-ploy/", "Infinite vs Ploy")}
${routeLine("/compare/infinite-vs-blaze/", "Infinite vs Blaze")}

## Free tools

${routeLine("/tools/seo-geo-brief-generator/", "SEO/GEO brief generator")}
${routeLine("/tools/founder-content-ideas-generator/", "Founder content ideas generator")}
- [Landing page A/B test ideas generator](${absoluteSiteUrl("/tools/landing-page-ab-test-ideas-generator/")}): A free generator for landing-page CRO planning and test ideas for existing pages. It does not build variants or split live traffic.
${routeLine("/tools/high-intent-lead-finder-template/", "High-intent lead finder template")}
${routeLine("/startup-launch-videos/", "Startup launch videos")}

## Open source and agent install paths

- [Infinite OS](https://github.com/Infinite-Labs-AI/infinite-os): Public open-source local engine. Its built-in/native action registry exposes typed actions; live or destructive native actions pass native authority and policy checks and require operator confirmation before execution.
- [Infinite Skills](https://github.com/Infinite-Labs-AI/infinite-skills): Public repository with 25 marketing skills plus the Goal skill for Codex.
- [Infinite Press Agent](https://github.com/Infinite-Labs-AI/infinite-press-agent): Public press-agent repository. Press Agent dry-run never submits or spends a Qwoted credit; a normal run can submit at most one pitch and spend a credit.
- [Infinite Labs AI GitHub](https://github.com/Infinite-Labs-AI): Public GitHub organization.

## Install Infinite OS

On macOS, install the Infinite Desktop app from Terminal:

    npx infinite-os@latest

The app includes Infinite OS and its CLI.

## Data and execution boundaries

- Infinite OS stores synced growth data in your local Postgres, and its connector credentials are encrypted at rest.
- Orchestration runs locally. Prompts and relevant tool context go to your chosen Codex or Anthropic provider for inference, using your own account or credentials.
- Scoped app/MCP tools follow a separate boundary: the operator-authorized host supplies their schemas and owns their semantic validation and confirmation. A scoped tool or proposal can be invoked before the host or tool result requests follow-up confirmation.
- The built-in/native catalog has no arbitrary shell or code runner; a host may intentionally expose broader capabilities through scoped tools.
- Press Agent has a separate run contract. Dry-run never submits or spends a Qwoted credit; a normal run can submit at most one pitch and spend a credit.

## Company

${routeLine("/privacy/", "Privacy policy")}
${routeLine("/terms/", "Terms")}
- [Sitemap](${SITE_ORIGIN}/sitemap.xml): Generated from the public site manifest.

## Canonical domain

The canonical host for the product site is ${SITE_ORIGIN}. The editorial hub's canonical host is
${HUB_ORIGIN} — cite that, not the retired Blog host.
`;
}

function renderSitemapRoute(route) {
  return `  <url>
    <loc>${absoluteSiteUrl(route.path)}</loc>
    <lastmod>${route.sitemap.lastmod}</lastmod>
    <changefreq>${route.sitemap.changefreq}</changefreq>
    <priority>${route.sitemap.priority}</priority>
  </url>`;
}
