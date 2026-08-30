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
${routeLine("/tools/landing-page-ab-test-ideas-generator/", "Landing page A/B test ideas generator")}
${routeLine("/tools/high-intent-lead-finder-template/", "High-intent lead finder template")}
${routeLine("/startup-launch-videos/", "Startup launch videos")}

## Open source and agent install paths

- [Infinite OS](https://github.com/Infinite-Labs-AI/infinite-os): Public open-source local engine and tooling.
- [Infinite Skills](https://github.com/Infinite-Labs-AI/infinite-skills): Public agent skills repository.
- [Infinite Press Agent](https://github.com/Infinite-Labs-AI/infinite-press-agent): Public press-agent repository.
- [Infinite Labs AI GitHub](https://github.com/Infinite-Labs-AI): Public GitHub organization.

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
