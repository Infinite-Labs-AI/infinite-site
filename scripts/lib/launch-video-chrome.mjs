/**
 * Shared chrome for the two launch-video pages (`/startup-launch-videos/`, `/research/launch-videos/`).
 *
 * Both pages are assembled as HTML strings rather than written by hand, so their nav, footer and
 * webfonts live here — one definition, so the two cannot drift apart and every link between them
 * stays reciprocal.
 *
 * FONTS ARE SELF-HOSTED, AND THAT IS NOT A PREFERENCE. This site's CSP is `font-src 'self' data:`,
 * so a Google Fonts stylesheet would be blocked outright and both pages would silently fall back to
 * system sans. Every face below points at a woff2 already in /fonts. The study asks for the hub's
 * unspaced family names (HankenGrotesk / IBMPlexSans / IBMPlexMono), so those aliases are declared
 * against the same files rather than the study's CSS being rewritten.
 *
 * Display face is Hanken Grotesk on both pages. The leaderboard originally named Space Grotesk,
 * which this site does not host and the CSP will not let it fetch — so it would have rendered as
 * system sans. Using the face we actually have makes the two pages match.
 */

export const FONT_CSS = `
@font-face{font-family:"Hanken Grotesk";font-style:normal;font-display:swap;font-weight:400;src:url("/fonts/infinite-ui/hanken-grotesk-400.woff2") format("woff2")}
@font-face{font-family:"Hanken Grotesk";font-style:normal;font-display:swap;font-weight:500;src:url("/fonts/infinite-ui/hanken-grotesk-500.woff2") format("woff2")}
@font-face{font-family:"Hanken Grotesk";font-style:normal;font-display:swap;font-weight:600;src:url("/fonts/infinite-ui/hanken-grotesk-600.woff2") format("woff2")}
@font-face{font-family:"Hanken Grotesk";font-style:normal;font-display:swap;font-weight:700;src:url("/fonts/infinite-ui/hanken-grotesk-700.woff2") format("woff2")}
@font-face{font-family:"HankenGrotesk";font-style:normal;font-display:swap;font-weight:400;src:url("/fonts/infinite-ui/hanken-grotesk-400.woff2") format("woff2")}
@font-face{font-family:"HankenGrotesk";font-style:normal;font-display:swap;font-weight:500;src:url("/fonts/infinite-ui/hanken-grotesk-500.woff2") format("woff2")}
@font-face{font-family:"HankenGrotesk";font-style:normal;font-display:swap;font-weight:600;src:url("/fonts/infinite-ui/hanken-grotesk-600.woff2") format("woff2")}
@font-face{font-family:"HankenGrotesk";font-style:normal;font-display:swap;font-weight:700;src:url("/fonts/infinite-ui/hanken-grotesk-700.woff2") format("woff2")}
@font-face{font-family:"IBM Plex Sans";font-style:normal;font-display:swap;font-weight:400;src:url("/fonts/ibm-plex/ibm-plex-sans-400.woff2") format("woff2")}
@font-face{font-family:"IBM Plex Sans";font-style:normal;font-display:swap;font-weight:600;src:url("/fonts/ibm-plex/ibm-plex-sans-600.woff2") format("woff2")}
@font-face{font-family:"IBM Plex Sans";font-style:normal;font-display:swap;font-weight:700;src:url("/fonts/ibm-plex/ibm-plex-sans-700.woff2") format("woff2")}
@font-face{font-family:"IBMPlexSans";font-style:normal;font-display:swap;font-weight:400;src:url("/fonts/ibm-plex/ibm-plex-sans-400.woff2") format("woff2")}
@font-face{font-family:"IBMPlexSans";font-style:normal;font-display:swap;font-weight:600;src:url("/fonts/ibm-plex/ibm-plex-sans-600.woff2") format("woff2")}
@font-face{font-family:"IBMPlexSans";font-style:normal;font-display:swap;font-weight:700;src:url("/fonts/ibm-plex/ibm-plex-sans-700.woff2") format("woff2")}
@font-face{font-family:"IBMPlexMono";font-style:normal;font-display:swap;font-weight:500;src:url("/fonts/ibm-plex/ibm-plex-mono-500.woff2") format("woff2")}
@font-face{font-family:"JetBrains Mono";font-style:normal;font-display:swap;font-weight:400;src:url("/fonts/infinite-ui/jetbrains-mono-400.woff2") format("woff2")}
@font-face{font-family:"JetBrains Mono";font-style:normal;font-display:swap;font-weight:500;src:url("/fonts/infinite-ui/jetbrains-mono-500.woff2") format("woff2")}
`;

export const LEADERBOARD_PATH = "/startup-launch-videos/";
export const STUDY_PATH = "/research/launch-videos/";
export const ORIGIN = "https://infinite.fast";
export const LEADERBOARD_URL = `${ORIGIN}${LEADERBOARD_PATH}`;
export const STUDY_URL = `${ORIGIN}${STUDY_PATH}`;
/**
 * The headless API that publishes the dataset. The PAGES live here; the DATA lives there.
 *
 * Overridable so a preview deploy can build against a preview API (and so the CI contract can build
 * against a fixture) without the published page ever pointing anywhere but production.
 */
export const DATASET_API = "https://api.ultima.inc/api/launch-videos";
export function datasetSource() {
  // Read at call time, not module load: a caller (the contract test, a preview build) sets the
  // override after this module is already imported, and a cached constant would ignore it.
  return process.env.LAUNCH_VIDEOS_DATASET_URL || DATASET_API;
}

const RING = "/logos/infinite-ring-clean.png";

const NAV_LINKS = [
  ["/tools/", "Tools"],
  ["/agents/", "Agents"],
  ["/research/", "Research"],
  ["/compare/", "Compare"],
  ["https://blog.infinite.fast/", "Blog"],
  ["/#pricing", "Pricing"],
];

/** Sticky pill nav. NOT for the study — its reading bar is position:fixed and the two would collide. */
export function navHtml() {
  return `<nav class="seo-nav" aria-label="Primary navigation">
  <a class="seo-brand" href="/"><img src="${RING}" alt="" width="26" height="26">infinite</a>
  <div class="seo-nav-links">${NAV_LINKS.map(([h, l]) => `<a href="${h}">${l}</a>`).join("")}</div>
  <a class="seo-nav-cta" href="/download" data-download-location="navigation">Get Infinite</a>
</nav>`;
}

export function footerHtml(status) {
  const col = (label, links) =>
    `<div><span class="footer-label">${label}</span>${links
      .map(([h, l]) => `<a href="${h}">${l}</a>`)
      .join("")}</div>`;
  return `<footer class="wrangle-footer">
  <div class="wr-shell">
    <div class="wrangle-footer-grid">
      <div><span class="wrangle-footer-mark" aria-hidden="true"><img src="${RING}" width="24" height="24" alt="" loading="lazy"></span></div>
      ${col("Platform", [["/#command", "Buyer intent"], ["/#command", "SEO + GEO"], ["/#command", "Landing tests"], ["/#leads", "Claude Code"]])}
      ${col("Research", [[STUDY_PATH, "The Launch Video Index"], [LEADERBOARD_PATH, "Launch video leaderboard"], [DATASET_API, "Dataset (JSON)"], [`${DATASET_API}/csv`, "Dataset (CSV)"]])}
      ${col("Free tools", [["/tools/high-intent-lead-finder-template/", "Lead finder template"], ["/tools/seo-geo-brief-generator/", "SEO + GEO brief generator"], ["/tools/founder-content-ideas-generator/", "Content ideas"], ["/agents/", "Agents directory"]])}
      ${col("Compare", [["/compare/infinite-vs-okara/", "Infinite vs Okara"], ["/compare/infinite-vs-ploy/", "Infinite vs Ploy"], ["/compare/infinite-vs-blaze/", "Infinite vs Blaze"], ["/compare/", "All comparisons"]])}
      ${col("Company", [["/#proof", "Proof"], ["/#pricing", "Pricing"], ["https://blog.infinite.fast/", "Blog"], ["/privacy/", "Privacy Policy"], ["/terms/", "Terms of Service"]])}
    </div>
    <div class="wrangle-footer-bottom"><span>&copy; 2026 Infinite. All rights reserved.</span><span class="wrangle-status">${status}</span></div>
  </div>
  <div class="wrangle-giant-word" aria-hidden="true">Infinite</div>
</footer>`;
}

export const NAV_CSS = `
.seo-nav{position:sticky;top:16px;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:24px;
  width:min(1120px,calc(100% - 32px));margin:16px auto 0;padding:10px 14px;border:1px solid #dfe7ef;border-radius:999px;
  background:rgba(255,255,255,.9);box-shadow:0 18px 60px rgba(32,54,78,.1);backdrop-filter:blur(18px);
  font-family:"IBM Plex Sans",-apple-system,"Helvetica Neue",Arial,sans-serif}
.seo-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;color:#111;text-decoration:none}
.seo-brand img{width:26px;height:26px;border-radius:8px;display:block}
.seo-nav-links{display:flex;align-items:center;gap:24px;color:#5c6470;font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
.seo-nav-links a{color:inherit;text-decoration:none}
.seo-nav-links a:hover{color:#1f2328}
.seo-nav-cta{display:inline-flex;align-items:center;min-height:40px;padding:0 18px;border-radius:999px;
  background:#111;color:#fff;font-weight:800;font-size:14px;text-decoration:none;box-shadow:0 16px 40px rgba(20,20,20,.12)}
.seo-nav-cta:hover{background:#000}
@media(max-width:760px){.seo-nav-links{display:none}}
`;

export const FOOTER_CSS = `
.wrangle-footer{position:relative;overflow:hidden;margin-top:64px;padding:82px 0 38px;border-top:1px solid #edf1f4;background:#fff;
  font-family:"IBM Plex Sans",-apple-system,"Helvetica Neue",Arial,sans-serif;font-size:12px;line-height:1.5;letter-spacing:normal;text-align:left}
.wr-shell{position:relative;z-index:1;width:min(1120px,calc(100% - 40px));margin:0 auto}
.wrangle-footer-grid{display:grid;grid-template-columns:1.2fr repeat(5,minmax(84px,.7fr));gap:28px;align-items:start}
.wrangle-footer-mark{display:inline-grid;width:38px;height:38px;place-items:center;border:1px solid #e1e6eb;
  border-radius:12px;background:#fff;box-shadow:0 12px 28px rgba(31,72,112,.08)}
.wrangle-footer-mark img{width:24px;height:24px;border-radius:8px;display:block}
.wrangle-footer .footer-label{display:block;margin:0 0 11px;color:#4a5157;font-size:11px;font-weight:800}
.wrangle-footer a{display:block;margin:7px 0;color:#5f6870;font-size:12px;font-weight:600;text-decoration:none;transition:color .15s ease,transform .15s ease}
.wrangle-footer a:hover{color:#171717;transform:translateX(2px)}
.wrangle-footer-bottom{display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;margin-top:56px;color:#68737b;font-size:11.5px;font-weight:600}
.wrangle-status{display:inline-flex;align-items:center;gap:6px}
.wrangle-status::before{content:"";width:6px;height:6px;border-radius:50%;background:#23c56d;flex:none}
.wrangle-giant-word{position:absolute;right:46px;bottom:-54px;z-index:0;color:transparent;
  background:linear-gradient(90deg,rgba(188,243,255,.82),rgba(255,193,220,.72));-webkit-background-clip:text;background-clip:text;
  font-family:"Hanken Grotesk",sans-serif;font-size:clamp(88px,16vw,220px);font-weight:800;line-height:.8;pointer-events:none}
@media(max-width:760px){
  .wrangle-footer-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 18px}
  .wrangle-footer-grid>div:first-child{grid-column:1/-1}
  .wrangle-footer-bottom{flex-direction:column;gap:10px}
  .wrangle-giant-word{right:14px;bottom:-18px;font-size:72px}}
`;

/** Escape a value for interpolation into HTML text or a double-quoted attribute. */
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Serialise JSON-LD for a <script> block. Escaping the slash in `</script>` is the standard defence
 * against a string in the data closing the tag early; the value parses byte-identically.
 */
export function jsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
