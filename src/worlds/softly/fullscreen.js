// Softly — the fullscreen toggle (James, 2026-10-16): a third round button under the
// speaker, or the F key, does what F11 does; the button, Escape or a double-click leaves. Once in fullscreen the three corner icons
// fade out after 3 s without the mouse moving; moving it fades them back in, slowly;
// 3 s after it stops they fade away again. Escape leaves fullscreen (the browser's rule).
(() => {
  const IDLE = 3000;      // ms of no mouse motion before the icons go
  const FADE_OUT = 2000;  // ms
  const FADE_IN = 2000;   // ms

  const style = document.createElement('style');
  style.textContent = `
    .softly-fs {
      align-items: center; appearance: none; cursor: pointer; display: flex; justify-content: center;
      background: rgba(20, 20, 20, 0.45); border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 50%;
      color: rgba(255, 255, 255, 0.85); height: 2.5rem; width: 2.5rem; padding: 0;
      position: fixed; right: 1rem; top: 4.25rem; z-index: 2147483000;
      transition: background 200ms ease, color 200ms ease;
    }
    html[data-es-dash] .softly-fs { top: 7.5rem; }
    .softly-fs:hover, .softly-fs:focus-visible { background: rgba(20, 20, 20, 0.7); color: #fff; }
    .softly-fs svg { height: 1.15rem; width: 1.15rem; }
    .softly-fs .exit { display: none; }
    html:fullscreen .softly-fs .enter { display: none; }
    html:fullscreen .softly-fs .exit { display: block; }
    /* the idle fade: every corner icon, only in fullscreen */
    .es-dash, .es-sound, .softly-fs { transition: opacity ${FADE_IN}ms ease; }
    html.softly-idle .es-dash, html.softly-idle .es-sound, html.softly-idle .softly-fs {
      opacity: 0; transition: opacity ${FADE_OUT}ms ease;
    }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'softly-fs';
  btn.innerHTML = `
    <svg class="enter" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>
    </svg>
    <svg class="exit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>
    </svg>`;
  document.body.appendChild(btn);

  const root = document.documentElement;
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const isFull = () => !!fsEl();
  function label() {
    const l = isFull() ? 'Leave fullscreen (Esc)' : 'Fullscreen';
    btn.title = l; btn.setAttribute('aria-label', l);
  }
  // LEAVING: every exit the browser knows, retried until nothing is fullscreen, and no
  // entering allowed for a second afterwards — nothing can bounce you back in.
  let noEnterUntil = 0, leaving = null;
  function leave() {
    noEnterUntil = performance.now() + 1000;
    clearInterval(leaving);
    const once = () => {
      if (!isFull()) { clearInterval(leaving); leaving = null; label(); return; }
      try { const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
    };
    once();
    leaving = setInterval(once, 150);
    setTimeout(() => { clearInterval(leaving); leaving = null; label(); }, 2000);
  }
  function enter() {
    if (performance.now() < noEnterUntil || isFull()) return;
    try { const p = root.requestFullscreen ? root.requestFullscreen() : root.webkitRequestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  }
  // the button: in fullscreen it only ever leaves; out of it, it only ever enters
  btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (isFull()) leave(); else enter(); });
  // Escape always leaves (the page does it itself, caught before anything else can
  // swallow it); F enters, never leaves — leaving is the button or Escape only
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') { if (isFull()) leave(); return; }
    if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey && !isFull()) enter();
  }, true);
  // a double-click anywhere on the picture also leaves
  window.addEventListener('dblclick', () => { if (isFull()) leave(); });

  // the idle fade
  let timer = null;
  const overControl = () => !!document.querySelector('.es-dash:hover, .es-sound:hover, .softly-fs:hover');
  function arm() {
    clearTimeout(timer);
    if (!isFull()) return;
    timer = setTimeout(() => {
      if (overControl()) { arm(); return; }
      root.classList.add('softly-idle');
    }, IDLE);
  }
  function wake() {
    root.classList.remove('softly-idle');
    arm();
  }
  window.addEventListener('mousemove', wake);
  window.addEventListener('pointerdown', wake, true);
  // hidden icons stay clickable: the button works whether you can see it or not
  ['fullscreenchange', 'webkitfullscreenchange'].forEach((t) => document.addEventListener(t, () => {
    label();
    if (isFull()) arm();
    else { clearTimeout(timer); root.classList.remove('softly-idle'); }
  }));
  label();
})();
