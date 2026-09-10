// Shared sticky site header — one component injected across every public page
// at build time, the same way renderSiteFooter is. Links are real cross-page
// routes (the homepage's Work/Stack/Proof in-page anchors do not generalise);
// /#pricing and /#faq navigate home then scroll, so they work from any page.

export const SITE_HEADER_STYLESHEET = "/assets/site-header.css?v=4";
export const SITE_BASE_STYLESHEET = "/assets/site-base.css";

const NAV = [
  { label: "GTM Hub", href: "https://hub.infinite.fast/", external: true },
];

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// A nav link is "current" when the page path is within its route subtree.
function isCurrent(currentPath, href) {
  if (!href.startsWith("/") || href.startsWith("/#")) return false;
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(href);
}

export function renderSiteHeader({ currentPath = "/" } = {}) {
  const links = NAV.map((item) => {
    const current = isCurrent(currentPath, item.href) ? ' aria-current="page"' : "";
    if (item.external) {
      return `<a href="${escapeHtml(item.href)}" target="_blank" rel="noopener">${escapeHtml(item.label)} <span aria-hidden="true">↗</span></a>`;
    }
    return `<a href="${escapeHtml(item.href)}"${current}>${escapeHtml(item.label)}</a>`;
  }).join("");
  return `<header class="site-header" data-site-header="public-route-graph-v1">
  <div class="site-header-inner">
    <a class="site-header-logo" href="/" aria-label="Infinite home"><span class="sh-mark" aria-hidden="true">✳</span>infinite</a>
    <nav class="site-header-nav" aria-label="Primary">${links}</nav>
    <div class="site-header-right">
      <a class="site-header-cta" href="/get-started" data-analytics-cta-id="get-started" data-analytics-cta-location="navigation">Get Infinite <span aria-hidden="true">↗</span></a>
      <button class="site-header-burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="site-header-nav"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>
<script>(function(){var h=document.currentScript.previousElementSibling;var darks=[];var chk=function(){var p=h.getBoundingClientRect().top+h.offsetHeight/2,d=false;for(var i=0;i<darks.length;i++){var r=darks[i].getBoundingClientRect();if(r.top<=p&&r.bottom>=p){d=true;break;}}h.dataset.onDark=d?"true":"false";};var f=function(){h.dataset.scrolled=(window.scrollY>4)?"true":"false";chk();};var boot=function(){darks=[].slice.call(document.querySelectorAll("[data-nav-dark]"));f();};if(document.readyState==="loading"){addEventListener("DOMContentLoaded",boot);}else{boot();}addEventListener("scroll",f,{passive:true});addEventListener("resize",chk,{passive:true});var b=h.querySelector(".site-header-burger"),n=h.querySelector(".site-header-nav");if(b&&n){n.id="site-header-nav";var t=function(o){h.dataset.menuOpen=o?"true":"false";b.setAttribute("aria-expanded",o?"true":"false");};b.addEventListener("click",function(){t(h.dataset.menuOpen!=="true");});n.addEventListener("click",function(e){if(e.target.closest("a"))t(false);});addEventListener("keydown",function(e){if(e.key==="Escape")t(false);});}})();</script>`;
}
