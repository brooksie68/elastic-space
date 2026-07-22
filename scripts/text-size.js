// Text-size gears for the admin panel.
// Each gear opens a −/+ stepper: 5% per step, range −1 (smaller) to +5 (bigger),
// remembered in localStorage. One site-wide gear in the masthead steps the root
// font-size (everything here is rem); each major panel also gets its own gear.
(() => {
  const SZ = { min: -1, max: 5, step: 0.05 };
  const ROOT_PX = 17; // matches html { font-size } in styles/admin.css

  function sizeGear(id, target) {
    const key = 'es-admin-size-' + id;
    let n = Math.min(SZ.max, Math.max(SZ.min, parseInt(localStorage.getItem(key), 10) || 0));
    const wrap = document.createElement('span');
    wrap.className = 'gearwrap';
    wrap.innerHTML =
      '<button class="gear" type="button" title="text size">⚙</button>' +
      '<div class="sizepop"><button class="sz-dn" type="button" title="smaller">−</button>' +
      '<span class="szval"></span><button class="sz-up" type="button" title="bigger">+</button></div>';
    const pop = wrap.querySelector('.sizepop');
    const val = wrap.querySelector('.szval');
    const dn = wrap.querySelector('.sz-dn');
    const up = wrap.querySelector('.sz-up');
    const apply = () => {
      const factor = 1 + n * SZ.step;
      if (typeof target === 'function') target(factor);
      else target.style.zoom = factor;
      val.textContent = (n > 0 ? '+' : '') + n;
      dn.disabled = n <= SZ.min;
      up.disabled = n >= SZ.max;
      localStorage.setItem(key, n);
    };
    wrap.querySelector('.gear').onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.sizepop.show').forEach((p) => { if (p !== pop) p.classList.remove('show'); });
      pop.classList.toggle('show');
    };
    pop.onclick = (e) => e.stopPropagation();
    dn.onclick = () => { n = Math.max(SZ.min, n - 1); apply(); };
    up.onclick = () => { n = Math.min(SZ.max, n + 1); apply(); };
    apply();
    return wrap;
  }

  document.addEventListener('click', () =>
    document.querySelectorAll('.sizepop.show').forEach((p) => p.classList.remove('show')));

  const site = sizeGear('site', (f) => {
    document.documentElement.style.fontSize = (ROOT_PX * f) + 'px';
  });
  site.classList.add('site-size');
  const masthead = document.querySelector('.masthead');
  const serverCard = masthead.querySelector('.server-card');
  if (serverCard) masthead.insertBefore(site, serverCard);
  else masthead.append(site);

  const panels = [
    ['pages', '.pages-panel'],
    ['toolbar', '.editor-toolbar'],
    ['drafts', '.drafts-panel'],
    ['editor', '.editor-panel'],
  ];
  for (const [id, sel] of panels) {
    const el = document.querySelector(sel);
    if (el) {
      const g = sizeGear(id, el);
      g.classList.add('panel-size');
      el.append(g);
    }
  }
})();
