/**
 * Shared chrome for the leaderboard (`/startup-launch-videos/`). The study it cites now lives on
 * the hub — see STUDY_URL.
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

import { renderSiteFooter } from "./site-footer.mjs";

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
export const ORIGIN = "https://infinite.fast";
export const LEADERBOARD_URL = `${ORIGIN}${LEADERBOARD_PATH}`;
/**
 * The study moved to the hub on 2026-08-19 — it is a research paper, and the hub is the publication.
 * ABSOLUTE and off-origin on purpose: `/research/*` on this domain is now a 301 (see vercel.json),
 * and linking through a redirect would spend a hop on every reader and every crawler.
 */
export const STUDY_URL = "https://hub.infinite.fast/research/launch-videos";
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
  ["https://hub.infinite.fast/research", "Research"],
  ["/compare/", "Compare"],
  ["https://hub.infinite.fast/", "Hub"],
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
  return renderSiteFooter({ status });
}

/**
 * NO backdrop-filter on the nav, deliberately.
 *
 * It is `position:sticky` over a page carrying a looping video and ~76 avatars, so a blur made the
 * browser re-composite the strip under it on every scrolled frame — the single biggest source of
 * the scroll jank here. The bar is 94% opaque, so the blur was barely visible behind it anyway.
 * If it ever comes back, it needs to come back with a scroll profile.
 */
export const NAV_CSS = `
.seo-nav{position:sticky;top:16px;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:24px;
  width:min(1120px,calc(100% - 32px));margin:16px auto 0;padding:10px 14px;border:1px solid #dfe7ef;border-radius:999px;
  background:rgba(255,255,255,.94);box-shadow:0 18px 60px rgba(32,54,78,.1);
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

export const FOOTER_CSS = "";

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
