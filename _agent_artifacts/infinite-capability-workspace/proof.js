(() => {
  const world = document.querySelector('.founder-world');
  if (!world) return;
  const stage = world.querySelector('.station-stage');
  const rotor = world.querySelector('.station-rotor');
  const toggle = world.querySelector('.station-toggle');
  const people = [...world.querySelectorAll('[data-founder]')];
  const quotes = [...world.querySelectorAll('.founder-quote')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let angle = 0, paused = motion.matches, visible = false, interacting = false;
  let drag = null, frame = 0, last = 0;
  function paint() {
    rotor.setAttribute('transform', `rotate(${angle})`);
    people.forEach((person, i) => {
      const a = (angle + (i ? 25 : 155)) * Math.PI / 180;
      const x = 290 * Math.cos(a), y = 290 * Math.sin(a) * .6;
      const tilt = -12 * Math.PI / 180;
      person.style.left = `${(450 + x * Math.cos(tilt) - y * Math.sin(tilt)) / 9}%`;
      person.style.top = `${(300 + x * Math.sin(tilt) + y * Math.cos(tilt)) / 6}%`;
    });
  }
  function tick(now) {
    frame = 0;
    if (!visible || paused || interacting || drag || document.hidden) { last = 0; return; }
    if (last) angle = (angle + Math.min(now - last, 50) * .004) % 360;
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
  function label() { toggle.textContent = paused ? 'Play rotation' : 'Pause rotation'; toggle.setAttribute('aria-pressed', String(paused)); }
  toggle.addEventListener('click', () => { paused = !paused; label(); run(); });
  motion.addEventListener('change', () => { paused = motion.matches; label(); run(); });
  world.addEventListener('pointerenter', e => { if(e.pointerType !== 'touch') interacting = true; });
  world.addEventListener('pointerleave', () => { interacting = world.contains(document.activeElement); run(); });
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
