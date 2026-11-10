// Softly — his track (assets/audio/Softly.mp3) on a loop, fading in over 4 s and out over
// 1.5 s, through the shared sound control. The synthesised chord + chimes it replaced live
// in git history (2026-10-16, rounds three to nine).
(() => {
  const SRC = './assets/audio/Softly.mp3';
  const FADE_IN = 4, FADE_OUT = 1.5;   // seconds
  const VOL_KEY = 'softly-volume';
  let level = 0.5;
  try { const v = parseFloat(localStorage.getItem(VOL_KEY)); if (v >= 0 && v <= 1) level = v; } catch (e) {}

  const media = new Audio(SRC);
  media.loop = true;
  media.preload = 'auto';
  media.volume = 0;

  // a fade on the element's own volume: from where it is to `to` over `seconds`
  let fade = null;
  function fadeTo(to, seconds, then) {
    cancelAnimationFrame(fade);
    const from = media.volume, t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / (seconds * 1000));
      media.volume = from + (to - from) * k;
      if (k < 1) fade = requestAnimationFrame(step);
      else if (then) then();
    };
    fade = requestAnimationFrame(step);
  }

  function start() {
    return media.play().then(() => fadeTo(level, FADE_IN));
  }
  function stop() {
    fadeTo(0, FADE_OUT, () => media.pause());
  }
  function setVolume(v) {
    level = v;
    if (!media.paused) fadeTo(v, 0.2);
    try { localStorage.setItem(VOL_KEY, String(v)); } catch (e) {}
  }

  const handle = window.ElasticSoundControl.attach({ start, stop, setVolume, startOnGesture: true });
  handle.setVolume(level);
})();
