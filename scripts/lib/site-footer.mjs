import { FOOTER_COLUMNS } from "./public-site-manifest.mjs";

export const SITE_FOOTER_STYLESHEET = "/assets/site-footer.css";

export function renderSiteFooter({ status = "Public route graph" } = {}) {
  return `<footer class="public-site-footer" data-site-footer="public-route-graph-v1">
  <div class="public-site-footer-inner">
    <div class="public-site-footer-brand">
      <span class="public-site-footer-mark" aria-hidden="true"><img src="/logos/infinite-ring-clean-96.webp" width="26" height="26" alt="" loading="lazy" decoding="async"></span>
      <strong>Infinite</strong>
      <p>AI CMO workspace for founders and small teams. The public graph links only to shipped routes and verified public resources.</p>
    </div>
    ${FOOTER_COLUMNS.map(renderColumn).join("\n    ")}
  </div>
  <div class="public-site-footer-bottom">
    <span>© 2026 Ultima AI, Inc.</span>
    <span>${escapeHtml(status)}</span>
  </div>
</footer>`;
}

function renderColumn(column) {
  return `<nav aria-label="${escapeHtml(column.label)}">
      <span class="public-site-footer-column-label">${escapeHtml(column.label)}</span>
      ${column.links.map(renderLink).join("\n      ")}
    </nav>`;
}

function renderLink(link) {
  const isExternal = /^https:\/\//.test(link.href);
  const attrs = [
    `href="${escapeHtml(link.href)}"`,
    ...(isExternal ? ['rel="noopener"'] : []),
    ...(link.ctaId ? [`data-analytics-cta-id="${escapeHtml(link.ctaId)}"`] : []),
    ...(link.ctaLocation ? [`data-analytics-cta-location="${escapeHtml(link.ctaLocation)}"`] : []),
    ...(link.downloadLocation ? [`data-download-location="${escapeHtml(link.downloadLocation)}"`] : []),
  ];
  return `<a ${attrs.join(" ")}>${escapeHtml(link.label)}</a>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
