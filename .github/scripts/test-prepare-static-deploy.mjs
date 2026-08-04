import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const repoRoot = new URL("../..", import.meta.url).pathname;
const distDir = join(repoRoot, "dist");

try {
  execFileSync("node", [join(repoRoot, "scripts/prepare-static-deploy.cjs")], {
    cwd: repoRoot,
    env: {
      ...process.env,
      INFINITE_PRODUCTION_HOSTS: "infinite.fast,www.infinite.fast",
      INFINITE_SITE_SOURCE_ARTIFACT: JSON.stringify({
        siteSourceKey: "site_production_dormant",
        collectPath: "/infinite/ledger",
        productionHosts: ["infinite.fast", "www.infinite.fast"],
        staticProxy: "vercel",
      }),
      VERCEL_ENV: "production",
    },
    stdio: "pipe",
  });

  const homepage = readFileSync(join(distDir, "index.html"), "utf8");
  assert.doesNotMatch(homepage, /https:\/\/www\.infinite\.fast/);
  assert.match(homepage, /https:\/\/infinite\.fast\/#organization/);
  assert.match(homepage, /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-JE3BZS61FZ/);
  assert.equal((homepage.match(/data-infinite-runtime="managed"/g) ?? []).length, 1);
  assert.equal((homepage.match(/posthog\.init\s*\(/g) ?? []).length, 1);
  assert.match(homepage, /"collectPath":"\/infinite\/ledger"/);
  assert.doesNotMatch(homepage, /"siteSourceKey":/);
  assert.doesNotMatch(homepage, /send_page_view:\s*false/);
  assert.doesNotMatch(homepage, /data-infinite-consent-controller="managed"/);
  assert.match(homepage, /"consent":\{"mode":"not_required"\}/);
  assert.match(homepage, /gtag\("event", "app_download_clicked"/);
  assert.doesNotMatch(homepage, /transport_url/);
  assert.match(homepage, /<style data-homepage-critical>/);
  assert.equal((homepage.match(/<style\b/g) ?? []).length, 1, "only critical CSS may block first paint");
  assert.doesNotMatch(homepage, /(?:glaze-hero|problem-todesktop|light-common|light-sky|scheme-variants)\.css/);
  assert.doesNotMatch(homepage, /homepage-20260722\.css/);
  assert.doesNotMatch(homepage, /homepage-20260728-trust-logos\.css/);
  assert.doesNotMatch(homepage, /homepage-20260728-brand-logos\.css/);
  assert.doesNotMatch(homepage, /homepage-20260729-spade-logos\.css/);
  assert.doesNotMatch(homepage, /<link rel="preload" href="homepage-20260729-founder-x-posts\.css" as="style">/);
  assert.match(homepage, /<link rel="stylesheet" href="homepage-20260729-founder-x-posts\.css" media="print" onload="this\.media='all';this\.onload=null">/);
  assert.doesNotMatch(homepage, /\.ttf["')]/);

  const criticalCss = homepage.match(/<style data-homepage-critical>([\s\S]*?)<\/style>/)?.[1] ?? "";
  assert.match(criticalCss, /data-scheme=(?:["']wrangle["']|wrangle)/);
  assert.match(criticalCss, /download-compatibility/);
  assert.ok(criticalCss.length > 20_000 && criticalCss.length < 50_000, "critical CSS must cover both target viewports without embedding the full bundle");

  const homepageCss = readFileSync(join(distDir, "homepage-20260729-founder-x-posts.css"), "utf8");
  assert.match(homepageCss, /data-scheme=(?:["']wrangle["']|wrangle)/);
  assert.match(homepageCss, /fonts\/ibm-plex\/ibm-plex-sans-400\.woff2/);
  assert.ok(homepageCss.length > 180_000, "deferred homepage bundle must contain inline and external source styles");

  const sitemap = readFileSync(join(distDir, "sitemap.xml"), "utf8");
  assert.doesNotMatch(sitemap, /https:\/\/www\.infinite\.fast/);
  assert.match(sitemap, /<loc>https:\/\/infinite\.fast\/<\/loc>/);
} finally {
  rmSync(distDir, { recursive: true, force: true });
}
