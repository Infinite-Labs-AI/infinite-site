/* How it works — concept switcher plus the three concepts' interactions.
   No animation loops: everything is event-driven. */
(() => {
 const root = document.querySelector('.howto'); if (!root) return;
 const NAMES = ['sentence', 'strip', 'stack'];
 const tabs = [...root.querySelectorAll('.howto-switch a')];
 const panels = NAMES.map(n => root.querySelector('#how-' + n));
 const permalink = root.querySelector('.howto-permalink');
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');

 /* ---------- concept switcher ---------- */
 let current = null;
 function select(name, focusTab) {
  const i = NAMES.indexOf(name); if (i < 0 || name === current) return;
  current = name; root.dataset.concept = name;
  tabs.forEach((t, n) => { t.setAttribute('aria-selected', String(n === i)); t.tabIndex = n === i ? 0 : -1; });
  panels.forEach((p, n) => { p.hidden = n !== i; });
  const url = '?how=' + name + '#how-it-works';
  permalink.href = url; permalink.textContent = '?how=' + name + ' ↗';
  try { history.replaceState(null, '', url); } catch (e) {}
  if (focusTab) tabs[i].focus();
  if (name === 'sentence') drawLeader();
 }
 tabs.forEach((tab, i) => {
  tab.addEventListener('click', e => { e.preventDefault(); select(tab.dataset.concept); });
  tab.addEventListener('keydown', e => {
   let next;
   if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
   else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i + tabs.length - 1) % tabs.length;
   else if (e.key === 'Home') next = 0; else if (e.key === 'End') next = tabs.length - 1; else return;
   e.preventDefault(); select(tabs[next].dataset.concept, true);
  });
 });

 /* ---------- 02 · one sentence ---------- */
 const one = root.querySelector('#how-sentence');
 const words = one ? [...one.querySelectorAll('.one-word')] : [];
 const notes = one ? [...one.querySelectorAll('.one-note')] : [];
 const leader = one ? one.querySelector('.one-leader') : null;
 function drawLeader() {
  if (!one || one.hidden || !leader) return;
  const word = words.find(w => w.getAttribute('aria-selected') === 'true');
  const note = notes.find(n => n.dataset.on === 'true');
  const path = leader.querySelector('path'); if (!word || !note || !path) return;
  const sentence = one.querySelector('.one-sentence');
  const pr = one.getBoundingClientRect(), wr = word.getBoundingClientRect(), nr = note.getBoundingClientRect(), sr = sentence.getBoundingClientRect();
  if (!pr.width) return;
  const x1 = wr.left - pr.left + wr.width / 2, y1 = wr.bottom - pr.top + 8;
  const x2 = nr.left - pr.left + nr.width / 2, y2 = nr.top - pr.top - 10;
  /* a word above the last line would be crossed by a straight drop, so bow the
     line out past the edge of the sentence instead of through the type */
  const detour = y1 < sr.bottom - pr.top - 6;
  let d;
  if (detour) {
   const ex = x1 >= pr.width / 2
    ? Math.min(pr.width - 10, sr.right - pr.left + 54)
    : Math.max(10, sr.left - pr.left - 54);
   const ym = (y1 + y2) / 2;
   d = 'M' + x1 + ' ' + y1 + 'C' + x1 + ' ' + (y1 + 34) + ',' + ex + ' ' + (y1 + 8) + ',' + ex + ' ' + ym +
       'C' + ex + ' ' + (y2 - 26) + ',' + x2 + ' ' + (y2 - 74) + ',' + x2 + ' ' + y2;
  } else {
   d = 'M' + x1 + ' ' + y1 + 'C' + x1 + ' ' + (y1 + (y2 - y1) * .45) + ',' + x2 + ' ' + (y2 - (y2 - y1) * .45) + ',' + x2 + ' ' + y2;
  }
  leader.setAttribute('viewBox', '0 0 ' + pr.width + ' ' + pr.height);
  path.setAttribute('d', d);
  const len = path.getTotalLength();
  if (reduced.matches) { path.style.strokeDasharray = 'none'; path.style.strokeDashoffset = 0; return; }
  path.style.transition = 'none'; path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
  requestAnimationFrame(() => { path.style.transition = ''; path.style.strokeDashoffset = 0; });
 }
 function pickWord(i) {
  words.forEach((w, n) => w.setAttribute('aria-selected', String(n === i)));
  notes.forEach((n, x) => n.dataset.on = String(x === i));
  drawLeader();
 }
 words.forEach((w, i) => {
  w.addEventListener('click', () => pickWord(i));
  w.addEventListener('mouseenter', () => pickWord(i));
  w.addEventListener('focus', () => pickWord(i));
 });
 if (one && window.ResizeObserver) new ResizeObserver(() => drawLeader()).observe(one);

 /* ---------- 03 · the strip ---------- */
 root.querySelectorAll('.strip-panel').forEach(panel => {
  panel.addEventListener('click', () => panel.setAttribute('aria-pressed', panel.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'));
 });

 /* ---------- 04 · the morning stack ---------- */
 const stk = root.querySelector('.stk');
 if (stk) {
  const cards = [...stk.querySelectorAll('.stk-card')];
  const count = stk.querySelector('.stk-count');
  const yes = stk.querySelector('.stk-yes'), no = stk.querySelector('.stk-no'), again = stk.querySelector('.stk-again');
  const pad = n => String(n).padStart(2, '0');
  let at = 0;
  function stkRender() {
   cards.forEach((card, i) => {
    const rel = i - at;
    card.dataset.rel = rel < 0 ? 'gone' : rel > 2 ? 'hide' : String(rel);
    card.setAttribute('aria-hidden', String(rel !== 0));
   });
   const done = at >= cards.length;
   stk.dataset.done = String(done);
   count.textContent = pad(done ? cards.length : at + 1) + ' / ' + pad(cards.length);
  }
  function decide(kind) { if (at >= cards.length) return; cards[at].dataset.out = kind; at += 1; stkRender(); }
  yes.addEventListener('click', () => decide('yes'));
  no.addEventListener('click', () => decide('no'));
  again.addEventListener('click', () => { at = 0; cards.forEach(c => c.removeAttribute('data-out')); stkRender(); no.focus(); });
  stkRender();
 }

 /* ---------- start-up: URL decides which concept is shown ---------- */
 function fromUrl() {
  const q = new URLSearchParams(location.search).get('how');
  if (NAMES.includes(q)) return q;
  const h = location.hash.replace('#how-', '');
  if (NAMES.includes(h)) return h;
  return 'sentence';
 }
 select(fromUrl());
 addEventListener('hashchange', () => { const n = fromUrl(); if (n !== current) select(n); });
 addEventListener('load', drawLeader);

})();
