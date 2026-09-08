/* trail.js (shared with the possibility-trail study) injects a floating study bar.
   Left that file alone and drop its node here; trail.js already holds its own
   reference for the replay handler, so removing the node throws nothing. */
document.querySelector('.trail-controls')?.remove();

/* The free-audit form hands off to audit.html, which runs the scan animation and the
   booking column. Only the site travels in the query string — the email is left behind
   on purpose rather than put in a URL. */
(() => {
 const form = document.querySelector('.audit-form');
 if (!form) return;
 const button = form.querySelector('button[type="submit"]');
 const errorEl = form.querySelector('[data-audit-error]');
 const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

 const showError = msg => {
  if (!errorEl) return;
  errorEl.textContent = msg;
  errorEl.hidden = false;
 };

 form.addEventListener('submit', async e => {
  e.preventDefault();
  const site = (form.querySelector('#audit-site')?.value || '').trim().slice(0, 60);
  const email = (form.querySelector('#audit-email')?.value || '').trim().slice(0, 320);

  if (errorEl) errorEl.hidden = true;
  if (!emailRe.test(email)) { showError('Enter a valid email so we can send the audit.'); return; }

  /* Match the production leadgen-audit form: await the submit, and only move the
     visitor to the booking page once the lead is captured, so a failed submit is
     surfaced rather than silently dropped. /infinite/leads is a same-origin Vercel
     rewrite to the app's /api/leads, which inserts into landing_leads under
     source "leadgen-audit". The site is sent as fullName — the endpoint requires a
     non-empty name and we collect only site + email — real data, never invented. */
  const label = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'Sending…'; }

  try {
   const res = await fetch('/infinite/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     fullName: site || email,
     email,
     website: site,
     source: 'leadgen-audit',
     message: site ? 'Free growth audit requested for ' + site : 'Free growth audit requested',
     pagePath: '/',
    }),
   });
   if (!res.ok) {
    if (res.status === 429) throw new Error('One moment — please try again in a few seconds.');
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : 'Something went wrong. Please try again.');
   }
  } catch (err) {
   if (button) { button.disabled = false; button.textContent = label; }
   showError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
   return;
  }

  /* The email also rides in sessionStorage, not the URL, so it can prefill the Cal
     booking without landing in a server log, a referrer header, or a pasted link. */
  try { sessionStorage.setItem('infinite-audit-lead', JSON.stringify({ site, email })); } catch {}
  window.location.href = 'audit.html' + (site ? '?site=' + encodeURIComponent(site) : '');
 });
})();

/* Copy the install command. */
(() => {
 const btn = document.querySelector('.cli-copy');
 if (!btn || !navigator.clipboard) return;
 btn.addEventListener('click', async () => {
  try {
   await navigator.clipboard.writeText(btn.dataset.copy);
   btn.textContent = 'Copied'; btn.dataset.done = 'true';
   setTimeout(() => { btn.textContent = 'Copy'; btn.removeAttribute('data-done'); }, 1800);
  } catch (e) { /* clipboard blocked; the command is selectable either way */ }
 });
})();

/* Hold to claim — ported from the desktop app's onboarding CTA (hold-to-start.tsx).
   The rules that are not optional, kept verbatim in spirit:
    • Enter fires instantly. A hold with no keyboard escape hatch is an accessibility wall.
      Space holds, matching the button's native activation key.
    • A bare click TEACHES rather than doing nothing — under 14% charge the label rewrites
      itself and the pill shakes, so nobody concludes the control is broken.
    • NO pointerleave handler. Pointer capture keeps delivering pointerup even when the cursor
      slides off; a pointerleave abort fires the instant capture is taken and kills every hold. */
(() => {
 const btn = document.querySelector('.hold-btn');
 if (!btn) return;
 const label = btn.querySelector('.hold-label');
 const note = document.querySelector('.hold-note');
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');

 const HOLD_MS = 1100;
 const TEACH_THRESHOLD = 0.14;
 const HELD_BREATH_MS = 70;
 const IDLE = 'Hold to claim your spot';

 let raf = 0, start = 0, holding = false, committed = false, taught = false, breath = 0;

 const setCharge = c => btn.style.setProperty('--charge', c.toFixed(4));
 const stopLoop = () => { cancelAnimationFrame(raf); raf = 0; };

 function commit() {
  if (committed) return;
  committed = true; holding = false; stopLoop();
  setCharge(1); btn.dataset.phase = 'idle';
  /* the held breath: nothing moves at full charge. cutting it makes the release read as nothing. */
  breath = setTimeout(() => {
   btn.dataset.burst = '1';
   btn.dataset.phase = 'done';
   label.textContent = 'Spot held';
   btn.setAttribute('aria-label', 'Spot held');
   if (note) note.hidden = false;
  }, reduced.matches ? 0 : HELD_BREATH_MS);
 }

 function tick() {
  if (!holding) return;
  /* wall-clock elapsed, never accumulated frame deltas — a dropped frame must not lengthen the hold */
  const c = Math.min(1, (performance.now() - start) / HOLD_MS);
  setCharge(c);
  label.textContent = 'Charging ' + Math.round(c * 100) + '%';
  if (!reduced.matches) {
   const j = c * c * 2.2;
   btn.style.transform = 'translate(' + ((Math.random() - .5) * j).toFixed(2) + 'px,' + ((Math.random() - .5) * j).toFixed(2) + 'px)';
  }
  if (c >= 1) { commit(); return; }
  raf = requestAnimationFrame(tick);
 }

 function startHold() {
  if (committed || holding) return;
  holding = true; start = performance.now();
  btn.dataset.phase = 'charging'; setCharge(0);
  stopLoop(); raf = requestAnimationFrame(tick);
 }

 function endHold() {
  if (!holding) return;
  holding = false; stopLoop();
  btn.style.transform = '';
  const reached = Math.min(1, (performance.now() - start) / HOLD_MS);
  if (reached < TEACH_THRESHOLD) taught = true;
  btn.dataset.phase = 'declined'; setCharge(0);
  label.textContent = taught ? 'Hold to claim' : IDLE;
  setTimeout(() => { if (btn.dataset.phase === 'declined') btn.dataset.phase = 'idle'; }, 340);
 }

 btn.addEventListener('pointerdown', e => {
  e.preventDefault();
  try { btn.setPointerCapture(e.pointerId); } catch (err) { /* capture is an optimisation */ }
  startHold();
 });
 btn.addEventListener('pointerup', endHold);
 btn.addEventListener('pointercancel', endHold);
 btn.addEventListener('lostpointercapture', endHold);
 btn.addEventListener('keydown', e => {
  if (e.key === ' ') { e.preventDefault(); if (!holding) startHold(); }
  if (e.key === 'Enter') { e.preventDefault(); setCharge(1); commit(); }   /* the escape hatch */
 });
 btn.addEventListener('keyup', e => { if (e.key === ' ') endHold(); });
})();

/* Monthly / annual pricing. Each figure carries both rates as data attributes. */
(() => {
 const toggle = document.querySelector('.bill');
 if (!toggle) return;
 const btns = [...toggle.querySelectorAll('.bill-btn')];
 const swap = mode => {
  btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bill === mode)));
  document.querySelectorAll('.tier-price b, .tier-was, .tier-bill').forEach(el => {
   /* Empty string is a real value here — the done-for-you tier has no annual
      rate and Starter/Growth have no monthly anchor, so both carry data-monthly="".
      Testing truthiness left those stale on the way back from Annual to Monthly. */
   if (mode in el.dataset) el.textContent = el.dataset[mode];
  });
 };
 btns.forEach(b => b.addEventListener('click', () => swap(b.dataset.bill)));
})();
