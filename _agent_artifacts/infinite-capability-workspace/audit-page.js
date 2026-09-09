/* Audit-in-progress page: the scan animation on the left, booking on the right.
   unfair.so books through Cal.com (data-cal-link="team/unfair/gtm", click-to-modal);
   this uses the same vendor as an inline embed so it can hold a column.

   20 minutes, a personal 1:1 (cal.com/team/founders-ultima is a 404, so founders-ultima is
   a user, not a team — the call already goes to one calendar).

   Renaming to Infinite happens in the Cal dashboard, not here. When the event slug changes,
   this is the single line to update — e.g. 'founders-ultima/infinite-demo'. If the username
   changes too, note that 1bu-1's production welcome page hardcodes
   'founders-ultima/ultima-onboarding' and would break with it. */
const CAL_LINK = 'founders-ultima/infinite-demo';
const CAL_ORIGIN = 'https://cal.com/';
const CAL_TIMEOUT_MS = 6000;

/* ---- the site being audited ----------------------------------------- */
/* Only the site travels in the URL — the email stays out of it on purpose. */
(() => {
 const raw = new URLSearchParams(location.search).get('site') || '';
 const site = raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').slice(0, 60);
 if (!site) return;
 for (const el of document.querySelectorAll('[data-site], [data-site-chip]')) el.textContent = site;
 document.title = `Auditing ${site} — Infinite`;
})();

/* The lead, handed over from the audit form. sessionStorage rather than the query string:
   it survives the navigation but never lands in a server log, a referrer header, or
   anything the visitor might paste to somebody else. */
const lead = (() => {
 try { return JSON.parse(sessionStorage.getItem('infinite-audit-lead') || '{}') || {}; }
 catch { return {}; }
})();

/* ---- the four passes ------------------------------------------------- */
(() => {
 const list = document.querySelector('[data-steps]');
 if (!list) return;
 const steps = [...list.children];
 const meter = document.querySelector('[data-meter]');
 const label = document.querySelector('[data-phase-label]');
 const foot = document.querySelector('[data-foot]');
 const PASS_MS = 2400;

 const setMeter = fraction => { if (meter) meter.style.width = Math.min(1, fraction) * 100 + '%'; };
 const finish = () => {
  if (label) label.textContent = 'All four agents at work';
  if (foot) foot.textContent = 'Your audit lands in your inbox within a day. Grab a slot and we’ll go through it together.';
  setMeter(1);
 };

 if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  steps.forEach(s => s.dataset.state = 'done');
  finish();
  return;
 }

 let i = 0;
 const enter = () => {
  steps[i].dataset.state = 'running';
  if (label) label.textContent = `Pass 0${i + 1} of 0${steps.length}`;
  setMeter((i + 0.45) / steps.length);
  setTimeout(() => {
   steps[i].dataset.state = 'done';
   setMeter((i + 1) / steps.length);
   i += 1;
   if (i < steps.length) enter(); else finish();
  }, PASS_MS);
 };
 setMeter(0.45 / steps.length);
 enter();
})();

/* ---- booking ---------------------------------------------------------- */
/* The site and email were already given on the homepage form, so the calendar shows
   straight away, prefilled. Someone who reaches this page cold (no lead, no query) still
   gets a working calendar — booking the call is the goal, so nothing blocks it. */
(() => {
 const mount = document.getElementById('cal-inline');
 const fallback = document.querySelector('[data-fallback]');
 const direct = document.querySelector('[data-cal-fallback]');
 const directLink = document.querySelector('[data-cal-direct]');
 if (!mount) return;

 const urlSite = new URLSearchParams(location.search).get('site') || '';

 const buildPrefill = (email, site) => {
  const prefill = {};
  if (email) prefill.email = email;
  if (site) {
   prefill.url = site;
   prefill.notes = `Free growth audit requested for ${site}.`;
  }
  return prefill;
 };

 /* Cal.com's published loader, reduced to the default namespace — the only one here. */
 const installCal = () => {
  if (window.Cal) return;
  (function (C, A, L) {
   const p = (a, ar) => { a.q.push(ar); };
   const d = C.document;
   C.Cal = function () {
    const cal = C.Cal, ar = arguments;
    if (!cal.loaded) {
     cal.ns = {}; cal.q = cal.q || [];
     const el = d.createElement('script');
     el.src = A;
     /* Blocked by CSP or offline: show the fallback now rather than after the
        watchdog, so nobody stares at an empty panel for six seconds. */
     el.addEventListener('error', showFallback);
     d.head.appendChild(el);
     cal.loaded = true;
    }
    if (ar[0] === L) {
     const api = function () { p(api, arguments); };
     const namespace = ar[1];
     api.q = api.q || [];
     if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); }
     else p(cal, ar);
     return;
    }
    p(cal, ar);
   };
  })(window, 'https://app.cal.com/embed/embed.js', 'init');
 };

 const showFallback = () => {
  mount.removeAttribute('data-live');
  if (direct) direct.hidden = false;
 };

 /* A script blocked by CSP does not reliably fire the element's own error event —
    several browsers only raise a document-level securitypolicyviolation. Listen for
    both, so the CSP case (which is this page's actual failure mode today) falls back
    immediately rather than waiting out the watchdog. */
 document.addEventListener('securitypolicyviolation', event => {
  if (String(event.blockedURI || '').includes('cal.com')) showFallback();
 });

 const mountCal = (email, site) => {
  const prefill = buildPrefill(email, site);
  installCal();

  Cal('init', { origin: 'https://cal.com' });   /* matches 1bu-1's CalEmbedInline */

  Cal('inline', {
   elementOrSelector: '#cal-inline',
   calLink: CAL_LINK,
   config: { theme: 'light', layout: 'month_view', useSlotsViewOnSmallScreen: 'true', ...prefill },
  });

  /* The heading already says what the call is and how long it runs, so Cal's own
     title/duration/description block is redundant — hide it and repaint what is left.
     Token names verified against Cal's own stylesheet (76 --cal-* vars). Note that
     doublespeed sets 'cal-border-booker-width', which does not exist in the current
     CSS — 'cal-border-booker' is the real one, and it defaults to --cal-border-subtle. */
  Cal('ui', {
   hideEventTypeDetails: true,
   showTimezoneWhenEventDetailsHidden: true,
   cssVarsPerTheme: {
    light: {
     'cal-brand': '#3d3df5',              /* --blue: the selected slot and Confirm */
     'cal-brand-emphasis': '#2929cb',     /* --blue-dark: its hover */
     'cal-brand-text': '#ffffff',
     'cal-bg': '#ffffff',
     'cal-bg-muted': '#fcfcff',           /* the panel it sits in */
     'cal-bg-subtle': '#f4f5fb',
     'cal-bg-emphasis': '#e9ecf8',
     'cal-border': '#e3e5ef',             /* --line */
     'cal-border-subtle': '#eceef7',
     'cal-border-emphasis': '#cfd4e8',
     'cal-border-booker': 'transparent',  /* flush in the column, no double border */
     'cal-text': '#4a4f66',
     'cal-text-emphasis': '#242532',      /* --ink */
     'cal-text-subtle': '#7b7d8d',        /* --muted */
     'cal-text-muted': '#9aa0b8',
    },
   },
  });

  Cal('on', {
   action: 'bookingSuccessfulV2',
   callback: () => {
    const title = document.getElementById('book-title');
    const sub = document.querySelector('.book-sub');
    if (title) title.textContent = "You're booked.";
    if (sub) sub.textContent = 'The invite is in your inbox. The audit follows within a day.';
   },
  });

  mount.dataset.live = '';
  fallback?.remove();

  /* If the iframe never arrives, hand over a prefilled cal.com link rather than an
     empty panel. Same watchdog doublespeed runs, same 6s. */
  if (directLink) {
   /* The href stays bare (a cal.com link with no query). Two reasons:
      1. PII — putting the email in a URL attribute would hand it to session replay
         (rrweb does not mask attribute values) and to autocapture, which reads the
         href on click — the same leak the get-started gate was patched for.
      2. Attribution — a bare cal.com anchor is exactly what the infinite-tag
         outbound classifier keys off (host-based: cal.com/calendly.com → external_booking).
         Keeping this a real anchor means the existing classifier tags the click; we
         deliberately do NOT write a second capture here, which would only drift.
      The prefilled URL is built at click time and opened via window.open. */
   directLink.href = CAL_ORIGIN + CAL_LINK;
   directLink.addEventListener('click', event => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(prefill)) if (v) params.set(k, v);
    const q = params.toString();
    if (!q) return;
    event.preventDefault();
    window.open(`${CAL_ORIGIN}${CAL_LINK}?${q}`, '_blank', 'noopener');
   });
  }
  setTimeout(() => {
   if (mount.querySelector('iframe')) return;
   showFallback();
  }, CAL_TIMEOUT_MS);
 };

 mountCal(lead.email || '', urlSite || lead.site || '');
})();
