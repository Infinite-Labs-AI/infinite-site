(() => {
  const world = document.querySelector('.founder-world');
  if (!world) return;
  const stage = world.querySelector('.station-stage');
  const mode = world.dataset.world;
  const scene = world.querySelector('.space-scene');
  const planets = [...world.querySelectorAll('.solar-planet')].map(node => ({node, radius:Number(node.dataset.radius), phase:Number(node.dataset.phase), speed:Number(node.dataset.speed)}));
  const decks = [...world.querySelectorAll('.deck-rotor')];
  const toggle = world.querySelector('.station-toggle');
  const people = [...world.querySelectorAll('[data-founder]')];
  const quotes = [...world.querySelectorAll('.founder-quote')];
  const narrow = matchMedia('(max-width: 700px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let angle = 0, paused = motion.matches, visible = false, interacting = false;
  let drag = null, frame = 0, last = 0;
  function paint() {
    if (mode === 'station') {
      const turn = Math.sin(angle * Math.PI / 180) * 23;
      scene.style.transform = `perspective(1000px) rotateY(${turn}deg)`;
      decks.forEach((deck,i) => deck.setAttribute('transform', `rotate(${angle * (i % 2 ? -1 : 1)})`));
      people.forEach((person,i) => {
        // Spread founders across the station span by index so any count fits
        // (two-founder endpoints preserved: index 0 -> 289/408, last -> 628/235).
        const spread = people.length > 1 ? i / (people.length - 1) : 0;
        const x = 289 + spread * (628 - 289);
        person.style.left = `${(450 + (x - 450) * Math.cos(turn * Math.PI/180)) / 9}%`;
        person.style.top = `${(408 + spread * (235 - 408)) / 6.2}%`;
      });
    } else {
      planets.forEach(({node, radius, phase, speed}) => {
        const t = (phase + angle * speed) * Math.PI / 180, tilt = -16 * Math.PI / 180;
        const x = radius * Math.cos(t), y = radius * .61 * Math.sin(t);
        node.setAttribute('transform', `translate(${450+x*Math.cos(tilt)-y*Math.sin(tilt)} ${315+x*Math.sin(tilt)+y*Math.cos(tilt)})`);
      });
      const flight = people.map((person,i) => {
        const t = angle * Math.PI / 180;
        // Spread all N founders evenly across ~2pi so their flight paths
        // stay phase-separated regardless of count (founder 0 stays at -0.9,
        // matching the original two-founder look).
        const phase = -.9 + (i / people.length) * 2 * Math.PI;
        // Overlapping waves create a broad, non-orbital flight path.
        const x = 450 + 255 * Math.sin(t * .71 + phase) + 58 * Math.sin(t * 1.43 + phase);
        const y = 320 + 112 * Math.sin(t * .91 + phase) + 42 * Math.cos(t * 1.17 + phase);
        const dx = 255 * .71 * Math.cos(t * .71 + phase) + 58 * 1.43 * Math.cos(t * 1.43 + phase);
        return {x, y, dx, t, phase};
      });
      // Pairwise separation pass: push apart any two ships closer than the
      // clearance, for every pair, so none overlap regardless of count.
      const clearance = narrow.matches ? 230 : 145;
      for (let a = 0; a < flight.length; a++) {
        for (let b = a + 1; b < flight.length; b++) {
          const gapX = flight[b].x - flight[a].x, gapY = flight[b].y - flight[a].y;
          const distance = Math.hypot(gapX, gapY);
          if (distance < clearance) {
            const push = (clearance - distance) / 2;
            const nx = distance ? gapX / distance : 1, ny = distance ? gapY / distance : 0;
            flight[a].x -= nx * push; flight[a].y -= ny * push;
            flight[b].x += nx * push; flight[b].y += ny * push;
          }
        }
      }
      people.forEach((person,i) => {
        const {x, y, dx, t, phase} = flight[i];
        person.style.left = `${Math.max(115,Math.min(785,x)) / 9}%`;
        person.style.top = `${y / 6.2}%`;
        const ship = person.querySelector('.founder-ship');
        if (ship) ship.style.transform = `rotate(${Math.sin(t + phase) * 7}deg) scaleX(${dx < 0 ? -1 : 1})`;

      });
    }
  }
  function tick(now) {
    frame = 0;
    if (!visible || paused || interacting || drag || document.hidden) { last = 0; return; }
    if (last) angle += Math.min(now - last, 50) * (mode === 'solar' ? .007 : .004);
    last = now; paint(); frame = requestAnimationFrame(tick);
  }
  function run() { if (!frame) { last = 0; frame = requestAnimationFrame(tick); } }
  function select(index) {
    if (world.dataset.active === String(index) && world.classList.contains('is-ready')) return;
    world.dataset.active = String(index);
    quotes.forEach((quote, i) => { quote.hidden = i !== index; });
    people.forEach((person, i) => person.setAttribute('aria-pressed', String(i === index)));
  }
  people.forEach((person, index) => {
    person.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') select(index); });
    person.addEventListener('focus', () => select(index));
    person.addEventListener('click', () => select(index));
    person.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation(); people[(index + 1) % people.length].focus();
    });
  });
  /* the visible pause control was removed; motion still stops for prefers-reduced-motion */
  function label() { if (!toggle) return; toggle.textContent = paused ? 'Play motion' : 'Pause motion'; toggle.setAttribute('aria-pressed', String(paused)); }
  if (toggle) toggle.addEventListener('click', () => { paused = !paused; label(); run(); });
  motion.addEventListener('change', () => { paused = motion.matches; label(); run(); });
  const readingTarget = target => target && target.closest && target.closest('.globe-person, .founder-quotes');
  world.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    interacting = mode === 'station' || !!readingTarget(e.target) || world.contains(document.activeElement);
    run();
  });
  world.addEventListener('pointerout', e => {
    interacting = (mode === 'station' ? world.contains(e.relatedTarget) : !!readingTarget(e.relatedTarget)) || world.contains(document.activeElement);
    run();
  });
  world.addEventListener('focusin', () => { interacting = true; });
  world.addEventListener('focusout', e => { interacting = world.contains(e.relatedTarget); run(); });
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || e.button !== 0) return;
    drag = { id:e.pointerId, x:e.clientX, angle };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    angle = drag.angle + (e.clientX - drag.x) * .45; paint();
  });
  function release(e) { if (drag && e.pointerId === drag.id) { drag = null; run(); } }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('lostpointercapture', release);
  stage.addEventListener('keydown', e => {
    if (!['ArrowLeft','ArrowRight'].includes(e.key)) return;
    e.preventDefault(); angle += e.key === 'ArrowRight' ? 15 : -15; paint();
  });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; run(); }, {threshold:.1}).observe(world);
  document.addEventListener('visibilitychange', run);
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
  select(0); paint(); label(); world.classList.add('is-ready');
})();
