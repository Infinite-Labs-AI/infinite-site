import { next } from "@vercel/functions";

const BOT_UA = /bot|crawler|spider|preview|headless|lighthouse|curl|wget/i;
const PRODUCTION_HOSTS = new Set(
  (process.env.INFINITE_PRODUCTION_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean),
);
const EXCLUDED_PREFIXES = ["/api/", "/assets/", "/fonts/", "/logos/", "/ingest/", "/infinite/"];
const EXCLUDED_PATHS = new Set([
  "/download",
  "/LICENSE",
  "/favicon-16.png",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/logo.png",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
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
  if (EXCLUDED_PATHS.has(path) || EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  if (path.slice(path.lastIndexOf("/") + 1).includes(".")) return false;
  const destination = request.headers.get("sec-fetch-dest");
  const userAgent = request.headers.get("user-agent") ?? "";
  if (BOT_UA.test(userAgent)) return false;
  if (destination) return destination === "document";
  return /Mozilla\//.test(userAgent) && request.headers.get("accept")?.includes("text/html") === true;
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
