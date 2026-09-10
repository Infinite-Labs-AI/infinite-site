import { FOOTER_COLUMNS } from "./public-site-manifest.mjs";

export const SITE_FOOTER_STYLESHEET = "/assets/site-footer.css";

export function renderSiteFooter({ status = "Public route graph" } = {}) {
  // The Company links move into the bottom bar as one inline row (between the
  // copyright and the status), so the main grid holds brand + the 5 remaining
  // columns and fills its 6 tracks cleanly.
  const gridColumns = FOOTER_COLUMNS.filter((column) => column.label !== "Company");
  const company = FOOTER_COLUMNS.find((column) => column.label === "Company");
  const companyLinks = company ? company.links.map(renderLink).join("\n      ") : "";
  return `<footer class="public-site-footer" data-site-footer="public-route-graph-v1">
  <div class="public-site-footer-inner">
    <div class="public-site-footer-brand">
      <span class="public-site-footer-mark" aria-hidden="true"><img src="/logos/infinite-ring-clean-96.webp" width="26" height="26" alt="" loading="lazy" decoding="async"></span>
      <strong>Infinite</strong>
      <p>AI CMO workspace for founders and small teams.</p>
    </div>
    ${gridColumns.map(renderColumn).join("\n    ")}
  </div>
  <div class="public-site-footer-bottom">
    <span>© 2026 Ultima AI, Inc.</span>
    ${company ? `<nav class="public-site-footer-bottom-links" aria-label="${escapeHtml(company.label)}">
      ${companyLinks}
    </nav>` : ""}
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
