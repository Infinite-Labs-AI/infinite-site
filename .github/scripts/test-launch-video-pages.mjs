/**
 * Contract for the two generated launch-video pages.
 *
 * These pages are BUILT, not written, so the usual "read the file and look at it" review does not
 * apply — this is the only thing standing between a bad generator change and a silently broken SEO
 * asset. It builds both pages from a fixture into a scratch dist and asserts what actually earns
 * the links: crawlable rows, correct canonicals, valid structured data, and dofollow attribution.
 *
 * Runs against a fixture rather than the live API so CI never depends on the app being up.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import { join } from "node:path";

import { datasetFixture, serveDatasetFixture } from "./fixtures/launch-videos-dataset.mjs";

const scratch = mkdtempSync(join(tmpdir(), "launch-videos-"));

const fixture = datasetFixture(60);
const row = (i) => fixture.rows[i - 1];
const dataset = await serveDatasetFixture(60);
process.env.LAUNCH_VIDEOS_DATASET_URL = dataset.url;

try {
  const { buildLaunchVideoPages } = await import("../../scripts/build-launch-videos.mjs");
  const { LAUNCH_VIDEO_FAQ } = await import("../../scripts/research/launch-video-faq.mjs");
  await buildLaunchVideoPages(scratch);

  const board = readFileSync(join(scratch, "startup-launch-videos/index.html"), "utf8");
  const study = readFileSync(join(scratch, "research/launch-videos/index.html"), "utf8");
  const ld = (html) =>
    [...html.matchAll(/type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) =>
      JSON.parse(m[1].replaceAll("\\u003c", "<")),
    );

  // ── Canonicals. Both pages are served from infinite.fast and nowhere else. ──
  assert.match(board, /<link rel="canonical" href="https:\/\/infinite\.fast\/startup-launch-videos\/">/);
  assert.match(study, /<link rel="canonical" href="https:\/\/infinite\.fast\/research\/launch-videos\/">/);

  // The app is a data source, never a page host. A page URL pointing at it would split the cluster
  // across two origins and hand the ranking signal to a host that answers 404 to the public.
  for (const [name, html] of [["leaderboard", board], ["study", study]]) {
    assert.doesNotMatch(html, /app\.ultima\.inc/, `${name} must not reference the retired app host`);
    assert.doesNotMatch(
      html, /<link rel="canonical" href="https:\/\/api\./,
      `${name} must not make the API its canonical home`,
    );
  }

  // ── The ranking must be IN THE HTML. This is the whole asset: an LLM or a crawler that does not
  //    run JavaScript still has to read every ranked startup. ──
  const bodyRows = board.split("<tbody>")[1].split("</tbody>")[0];
  const dataRows = [...bodyRows.matchAll(/<tr[ >]/g)].length;
  assert.equal(dataRows, 51, "page one must server-render the pinned row plus 50 ranked launches");
  assert.match(bodyRows, /Startup 1</, "the top-ranked startup must appear in the static markup");
  assert.match(bodyRows, /Orchid/, "the pinned, unverifiable #1 must be rendered above the ranking");

  // Dofollow links to each startup's own site are what a founder is paid in for submitting.
  assert.match(bodyRows, /<a class="llb-nmlink" href="https:\/\/startup1\.example"/);
  assert.doesNotMatch(bodyRows, /class="llb-nmlink"[^>]*rel="[^"]*nofollow/);

  // The interactive table re-renders from this blob; without it sorting and paging are dead.
  assert.match(board, /<script type="application\/json" id="llb-data">/);
  assert.match(board, /<script src="\/assets\/launch-leaderboard\.js" defer><\/script>/);

  // ── Hostile data must not become executable markup. ──
  // Every one of these values originates from a PUBLIC submission or an X profile we do not
  // control, and ends up in a static file we publish. The page had a real stored-XSS path here: an
  // unanchored submit regex accepted `javascript:...//x.com/a/status/123`, stored it raw, and the
  // renderer wrote it into an href — where the site's own 'unsafe-inline' CSP would have run it.
  {
    const hostile = {
      ...row(1),
      startup: '</script><img src=x onerror=alert(1)>',
      startup_handle: '"><script>alert(2)</script>',
      startup_url: "javascript:alert(3)",
      tweet_url: "javascript:alert(4)//x.com/a/status/1968052293912547554",
      founders: [{ name: "</script>alert(5)", handle: null, avatar: null }],
    };
    const hostileFixture = { ...fixture, count: 1, rows: [hostile] };
    const hostileServer = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(hostileFixture));
    });
    await new Promise((resolve) => hostileServer.listen(0, "127.0.0.1", resolve));
    const hostileDir = mkdtempSync(join(tmpdir(), "launch-videos-xss-"));
    try {
      process.env.LAUNCH_VIDEOS_DATASET_URL = `http://127.0.0.1:${hostileServer.address().port}/`;
      const { buildLaunchVideoPages: rebuild } = await import(
        `../../scripts/build-launch-videos.mjs?xss=${process.pid}`
      );
      await rebuild(hostileDir);
      const page = readFileSync(join(hostileDir, "startup-launch-videos/index.html"), "utf8");

      // Nowhere on the page, in any context: the build strips non-http(s) URLs before publishing,
      // so attacker script text is never served even inertly.
      assert.doesNotMatch(page, /javascript:/i, "no javascript: URL may reach the published page");

      // In the RENDERED table, hostile names must be text, never markup. (The same characters
      // appear safely inside the JSON blob as \u003c escapes, which is why this is scoped.)
      const tbody = page.split("<tbody>")[1].split("</tbody>")[0];
      assert.doesNotMatch(tbody, /<script/i, "a startup name must not open a script tag in the table");
      // The only <img> in the table is our own avatar element. An injected one would be a raw tag.
      assert.doesNotMatch(tbody, /<img(?![^>]*llb-av)/i, "an injected img tag must not survive as markup");
      // An event handler is only dangerous inside a REAL tag, and the checks above are what prove
      // no injected tag exists. Asserting on the escaped form is the precise statement: the name is
      // still displayed to the reader, and every character that could have opened a tag is escaped.
      assert.match(tbody, /&lt;img src=x onerror=alert\(1\)&gt;/, "the hostile name must render as escaped text");
      assert.match(tbody, /&lt;\/script&gt;/, "a </script> in a name must be escaped, not literal");
      // The inlined JSON blob is the other sink: </script> inside it would end the block early and
      // put the rest of the row data into the document as markup.
      const blob = page.split('<script type="application/json" id="llb-data">')[1].split("</script>")[0];
      assert.doesNotMatch(blob, /<\/script/i, "the data blob must not be able to close its own tag");
      assert.ok(blob.includes("\\u003c"), "the data blob must escape < as \\u003c");
    } finally {
      hostileServer.close();
      rmSync(hostileDir, { recursive: true, force: true });
      process.env.LAUNCH_VIDEOS_DATASET_URL = dataset.url;
    }
  }

  // ── Structured data. ──
  const boardLd = ld(board);
  assert.deepEqual(boardLd.map((d) => d["@type"]), ["Dataset", "ItemList", "WebPage"]);
  const datasetLd = boardLd[0];
  assert.equal(datasetLd.url, "https://infinite.fast/startup-launch-videos/");
  assert.ok(
    datasetLd.distribution.every((d) => d.contentUrl.startsWith("https://api.ultima.inc/api/launch-videos")),
    "the dataset downloads must point at the API that actually serves them",
  );
  assert.equal(boardLd[1].itemListElement.length, 25);

  const graph = ld(study)[0]["@graph"];
  assert.deepEqual(graph.map((n) => n["@type"]), ["Article", "BreadcrumbList", "FAQPage"]);
  assert.deepEqual(graph[1].itemListElement[1], {
    "@type": "ListItem", position: 2, name: "Research", item: "https://infinite.fast/research/",
  });

  // ── FAQ parity. Google drops the rich result when the schema claims answers the page does not
  //    show, so every question and the opening of every answer must be visible in the markup. ──
  assert.equal(graph[2].mainEntity.length, LAUNCH_VIDEO_FAQ.length);
  const escape = (v) =>
    v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("'", "&#x27;").replaceAll('"', "&quot;");
  for (const item of LAUNCH_VIDEO_FAQ) {
    assert.ok(
      study.includes(item.question) || study.includes(escape(item.question)),
      `FAQ question missing from the visible page: ${item.question}`,
    );
    const opening = item.answer.split(/[,.—]/)[0];
    assert.ok(study.includes(escape(opening)), `FAQ answer missing from the visible page: ${opening}`);
  }

  // The reserved CTA slot must be FILLED. Shipping the raw marker means the piece ends on its
  // sources with no way to act on it.
  assert.doesNotMatch(study, /PLAYBOOK_CTA_SLOT/, "the study's CTA slot must be filled, not shipped raw");
  assert.match(study, /<section class="pcta">/);
  assert.match(study, /href="\/download"/);

  // ── The two pages must point at each other, or the cluster does not compound. ──
  assert.match(board, /href="\/research\/launch-videos\/"/);
  assert.match(study, /href="\/startup-launch-videos\/"/);

  // ── Fonts must be self-hosted: this site's CSP is font-src 'self', so a remote face is a silent
  //    fallback to system sans on the whole page. ──
  for (const [name, html] of [["leaderboard", board], ["study", study]]) {
    assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/, `${name} must not fetch remote fonts`);
    assert.match(html, /@font-face\{font-family:"Hanken Grotesk"/, `${name} must declare its local faces`);
  }

  // ── A build that cannot reach the dataset must FAIL, never publish a stale ranking under a page
  //    that advertises live data. ──
  process.env.LAUNCH_VIDEOS_DATASET_URL = "http://127.0.0.1:1/";
  const isolated = mkdtempSync(join(tmpdir(), "launch-videos-fail-"));
  writeFileSync(join(isolated, ".keep"), "");
  await assert.rejects(
    () => import(`../../scripts/build-launch-videos.mjs?bust=${Date.now()}`).then((m) => m.buildLaunchVideoPages(isolated)),
    "an unreachable dataset must abort the build",
  );
  rmSync(isolated, { recursive: true, force: true });

  console.log("launch-video pages contract OK");
} finally {
  dataset.close();
  rmSync(scratch, { recursive: true, force: true });
}
