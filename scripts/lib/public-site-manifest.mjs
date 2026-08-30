export const SITE_ORIGIN = "https://infinite.fast";
export const HUB_ORIGIN = "https://hub.infinite.fast";
export const GITHUB_ORIGIN = "https://github.com/Infinite-Labs-AI";

export const PUBLIC_SITE_ROUTES = Object.freeze([
  route("/", "Infinite — AI CMO for founders", "2026-07-22", "weekly", "1.0", "AI marketing operators, launch systems, and growth tools for solo founders and small teams."),
  route("/agents/", "AI agents", "2026-08-17", "weekly", "0.8", "Public entry point for Infinite's AI agent surfaces and open-source agent paths."),
  route("/tools/", "Free AI marketing tools", "2026-07-22", "weekly", "0.8", "A directory of free founder-facing tools for lead research, SEO briefs, landing-page tests, and content ideas."),
  route("/tools/high-intent-lead-finder-template/", "High-intent lead finder template", "2026-07-22", "monthly", "0.7", "A free template for turning buyer-intent signals into an actionable lead list."),
  route("/tools/seo-geo-brief-generator/", "SEO + GEO brief generator", "2026-07-22", "monthly", "0.7", "A free brief generator for SEO, GEO, and AI-answer visibility planning."),
  route("/tools/landing-page-ab-test-ideas-generator/", "Landing-page A/B test ideas generator", "2026-07-22", "monthly", "0.7", "A free generator for landing-page experiments and conversion hypotheses."),
  route("/tools/founder-content-ideas-generator/", "Founder content ideas generator", "2026-07-22", "monthly", "0.7", "A free generator for founder-led content angles and campaign ideas."),
  route("/compare/", "Infinite comparisons", "2026-07-22", "monthly", "0.8", "A hub for comparing Infinite with adjacent AI marketing and content tools."),
  route("/compare/infinite-vs-okara/", "Infinite vs Okara", "2026-07-22", "monthly", "0.7", "A focused comparison for founders evaluating Infinite and Okara."),
  route("/compare/infinite-vs-ploy/", "Infinite vs Ploy", "2026-07-22", "monthly", "0.7", "A focused comparison for founders evaluating Infinite and Ploy."),
  route("/compare/infinite-vs-blaze/", "Infinite vs Blaze", "2026-07-22", "monthly", "0.7", "A focused comparison for founders evaluating Infinite and Blaze."),
  route("/startup-launch-videos/", "Startup launch video leaderboard", "2026-08-19", "daily", "0.9", "A public leaderboard and study surface for startup launch videos."),
  route("/privacy/", "Privacy policy", "2026-08-02", "yearly", "0.3", "Infinite's public privacy policy and analytics preference entry point."),
  route("/terms/", "Terms of service", "2026-07-22", "yearly", "0.3", "Infinite's public terms of service."),
]);

export const KNOWN_DOCUMENT_PATHS = Object.freeze(PUBLIC_SITE_ROUTES.map((route) => route.path));

export const FOOTER_COLUMNS = Object.freeze([
  footerColumn("Agents & Open Source", [
    internal("AI Agents", "/agents/"),
    github("Infinite OS", "/infinite-os", "github-infinite-os"),
    github("Infinite Skills", "/infinite-skills", "github-infinite-skills"),
    github("Press Agent", "/infinite-press-agent", "github-press-agent"),
    github("GitHub", "", "github-org"),
  ]),
  footerColumn("Free Tools", [
    internal("All Tools", "/tools/"),
    internal("Lead Finder Template", "/tools/high-intent-lead-finder-template/"),
    internal("SEO + GEO Brief Generator", "/tools/seo-geo-brief-generator/"),
    internal("Landing Page A/B Ideas", "/tools/landing-page-ab-test-ideas-generator/"),
    internal("Founder Content Ideas", "/tools/founder-content-ideas-generator/"),
  ]),
  footerColumn("Resources", [
    external("Growth Hub", `${HUB_ORIGIN}/`, "hub-home"),
    external("Research", `${HUB_ORIGIN}/research`, "hub-research"),
    internal("Launch Video Leaderboard", "/startup-launch-videos/"),
    external("Launch Video Study", `${HUB_ORIGIN}/research/launch-videos`, "hub-launch-video-study"),
    external("Hub RSS", `${HUB_ORIGIN}/feed.xml`, "hub-rss"),
  ]),
  footerColumn("Compare", [
    internal("All Comparisons", "/compare/"),
    internal("Infinite vs Okara", "/compare/infinite-vs-okara/"),
    internal("Infinite vs Ploy", "/compare/infinite-vs-ploy/"),
    internal("Infinite vs Blaze", "/compare/infinite-vs-blaze/"),
  ]),
  footerColumn("Company", [
    download("Download for Mac"),
    internal("Pricing", "/#pricing", "view-pricing"),
    internal("Privacy", "/privacy/"),
    internal("Terms", "/terms/"),
    internal("Sitemap", "/sitemap.xml"),
  ]),
]);

export function absoluteSiteUrl(path) {
  return `${SITE_ORIGIN}${path === "/" ? "/" : path}`;
}

function route(path, title, lastmod, changefreq, priority, description) {
  return Object.freeze({ path, title, lastmod, changefreq, priority, description });
}

function footerColumn(label, links) {
  return Object.freeze({ label, links: Object.freeze(links) });
}

function internal(label, href, ctaId = null) {
  return Object.freeze({
    label,
    href,
    ...(ctaId ? { ctaId, ctaLocation: "site-footer" } : {}),
  });
}

function download(label) {
  return Object.freeze({
    label,
    href: "/download",
    ctaId: "app_download",
    ctaLocation: "site-footer",
    downloadLocation: "site-footer",
  });
}

function github(label, path, ctaId) {
  return external(label, `${GITHUB_ORIGIN}${path}`, ctaId);
}

function external(label, href, ctaId) {
  return Object.freeze({
    label,
    href,
    ctaId,
    ctaLocation: "site-footer",
  });
}
