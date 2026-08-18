import { next } from "@vercel/functions";

const BOT_UA = /bot|crawler|spider|preview|headless|lighthouse|curl|wget/i;
const PRODUCTION_HOSTS = new Set(
  (process.env.INFINITE_PRODUCTION_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean),
);
// The exact set of REAL document pages the static deploy serves, as normalizedPath()
// canonicalizes them. The middleware logs BEFORE routing, so without this manifest any
// scanner sweep of a non-existent path with browser-shaped headers counted as a pageview.
// /download stays excluded: its redirect is counted by the server redirect lane.
// Guardrail: test-prepare-static-deploy.mjs fails whenever this set and the built dist's
// HTML page set disagree — update BOTH together when adding or removing a page.
export const KNOWN_DOCUMENT_PATHS = new Set([
  "/",
  "/agents/",
  "/compare/",
  "/compare/infinite-vs-blaze/",
  "/compare/infinite-vs-okara/",
  "/compare/infinite-vs-ploy/",
  "/privacy/",
  "/terms/",
  "/tools/",
  "/tools/founder-content-ideas-generator/",
  "/tools/high-intent-lead-finder-template/",
  "/tools/landing-page-ab-test-ideas-generator/",
  "/tools/seo-geo-brief-generator/",
]);

function normalizedPath(rawUrl) {
  const collapsed = new URL(rawUrl).pathname.replace(/\/{2,}/g, "/");
  const path = collapsed === "/" ? "/" : collapsed.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/download" || path === "/LICENSE") return path;
  const last = path.slice(path.lastIndexOf("/") + 1);
  return last.includes(".") ? path : `${path}/`;
}

function isProductionDocumentNavigation(request, path) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (process.env.VERCEL_ENV !== "production" || !PRODUCTION_HOSTS.has(host)) return false;
  if (request.method !== "GET") return false;
  if (!KNOWN_DOCUMENT_PATHS.has(path)) return false;
  if (isPrefetch(request)) return false;
  const destination = request.headers.get("sec-fetch-dest");
  const userAgent = request.headers.get("user-agent") ?? "";
  if (BOT_UA.test(userAgent)) return false;
  if (destination) return destination === "document";
  return /Mozilla\//.test(userAgent) && request.headers.get("accept")?.includes("text/html") === true;
}

function isPrefetch(request) {
  return [request.headers.get("purpose"), request.headers.get("sec-purpose")].some((value) =>
    value?.toLowerCase().split(/[\s,;]+/).includes("prefetch"),
  );
}

export default function middleware(request) {
  const path = normalizedPath(request.url);
  if (isProductionDocumentNavigation(request, path)) {
    console.log(`INFINITE_DOCUMENT_REQUEST_V1 ${JSON.stringify({ path })}`);
  }
  return next();
}

export const config = {
  runtime: "edge",
  matcher: ["/((?!api/|assets/|fonts/|logos/|ingest/|infinite/).*)"],
};
