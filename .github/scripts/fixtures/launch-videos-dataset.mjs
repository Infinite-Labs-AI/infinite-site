/**
 * A stand-in for the public launch-video dataset, so CI never depends on the app being reachable.
 *
 * The REAL build fetches api.ultima.inc and must fail loudly when it cannot — that behaviour is
 * asserted in test-launch-video-pages.mjs. Everything else that merely needs the pages to exist
 * (the dist-parity guardrail) serves these rows instead, because a marketing-site build should not
 * go red when an unrelated API has a bad minute.
 */
export function datasetFixture(count = 60) {
  return {
    name: "The Startup Launch Video Leaderboard",
    description: "A public, hand-verified dataset of startup launch videos on X.",
    source: "https://infinite.fast/startup-launch-videos/",
    license: "CC BY 4.0",
    license_url: "https://creativecommons.org/licenses/by/4.0/",
    attribution: "The Startup Launch Video Leaderboard by Infinite, CC BY 4.0",
    creator: "Infinite",
    as_of: "2026-08-17",
    count,
    rows: Array.from({ length: count }, (_, index) => {
      const i = index + 1;
      return {
        rank: i, tweet_url: `https://x.com/s${i}/status/${1000 + i}`,
        views: 1000 - i * 3, likes: 100 - i, reposts: 50 - i, replies: 20, quotes: 1, bookmarks: 9,
        posted: "2026-07-01", hook_open: "talking_head", hook_strength: "strong",
        aspect_ratio: "16:9", duration_s: 52, differentiation: "strong", pacing: "dynamic",
        poster: null, startup: `Startup ${i}`, startup_slug: `startup-${i}`,
        startup_handle: `startup${i}`, startup_avatar: null,
        startup_url: `https://startup${i}.example`, movement: i % 3 === 0 ? "up" : "same",
        founders: [{ name: `Founder ${i}`, handle: `founder${i}`, avatar: null }],
      };
    }),
  };
}

/**
 * Serves the fixture on a loopback port, in a CHILD PROCESS, and resolves once it is listening.
 * Returns the URL and a close(). See serve-dataset.mjs for why the separate process is required.
 */
export async function serveDatasetFixture(count) {
  const { spawn } = await import("node:child_process");
  const child = spawn(
    process.execPath,
    [new URL("./serve-dataset.mjs", import.meta.url).pathname, String(count ?? 60)],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("dataset fixture did not start")), 10000);
    child.stdout.on("data", (chunk) => {
      const match = /PORT=(\d+)/.exec(String(chunk));
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    child.on("exit", (code) => reject(new Error(`dataset fixture exited early (${code})`)));
  });
  return { url: `http://127.0.0.1:${port}/`, close: () => child.kill() };
}
