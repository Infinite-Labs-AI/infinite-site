import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = new URL("../..", import.meta.url).pathname;
const tempDir = mkdtempSync(join(tmpdir(), "infinite-analytics-"));

try {
  const distDir = join(tempDir, "dist");
  const indexPath = join(distDir, "index.html");

  execFileSync("mkdir", ["-p", distDir]);
  writeFileSync(
    indexPath,
    "<!doctype html><html><head><title>Test</title></head><body></body></html>",
  );

  execFileSync("node", [join(repoRoot, ".github/scripts/inject-analytics.cjs")], {
    cwd: tempDir,
    env: {
      ...process.env,
      POSTHOG_API_HOST: "https://eu.i.posthog.com",
      POSTHOG_PROJECT_TOKEN: "phc_test_project_token",
      GOOGLE_ANALYTICS_TAG_ID: "G-TEST1234",
      X_PIXEL_ID: "x-test-pixel",
      META_PIXEL_ID: "1234567890",
    },
    stdio: "pipe",
  });

  const html = readFileSync(indexPath, "utf8");

  assert.match(html, /posthog\.init\("phc_test_project_token"/);
  assert.match(html, /api_host: "https:\/\/eu\.i\.posthog\.com"/);

  assert.match(html, /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-TEST1234/);
  assert.match(html, /gtag\("config", "G-TEST1234"\)/);

  assert.match(html, /twq\("config", "x-test-pixel"\)/);

  assert.match(html, /fbq\("init", "1234567890"\)/);
  assert.match(html, /fbq\("track", "PageView"\)/);

  assert.equal((html.match(/<\/head>/g) || []).length, 1);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
