// Softly — the chord: root, fifth, ninth (C2, G2, D4), soft sine/triangle pad
// through a lowpass, a feedback delay and a generated reverb tail. Web Audio synthesis.
(() => {
  const NOTES = [65.41, 98.00, 293.66]; // root C2, fifth G2, ninth D4
  // THE CHIMES: root, fourth, fifth, sixth, ninth of C across two octaves (C4 … A5)
  const CHIMES = [261.63, 293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 698.46, 783.99, 880.00];
  const CHIME_GAP = [2.5, 8];   // seconds between chimes
  const CHIME_MAX = 4;          // most ringing at once
  // GAIN: slider → output. 50% on the slider = 85% of the old default loudness (0.8 × 0.85 / 0.5)
  const GAIN = 1.36;
  const VOL_KEY = 'softly-volume';
  const HARMONY = 0.10;         // the harmonizer: a fifth up, mixed at 10%
  let ctx = null, master = null, bus = null, level = 0.5, chimeTimer = null, ringing = 0;
  try { const v = parseFloat(localStorage.getItem(VOL_KEY)); if (v >= 0 && v <= 1) level = v; } catch (e) {}

  function impulse(ac, seconds, decay) {
    const len = Math.floor(ac.sampleRate * seconds);
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -10; limit.ratio.value = 4; limit.attack.value = 0.05; limit.release.value = 0.6;
    master.connect(limit); limit.connect(ctx.destination);

    const dry = ctx.createGain(); dry.gain.value = 0.45;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 1400; tone.Q.value = 0.3;

    // delay: dotted, soft, darkening repeats
    const delay = ctx.createDelay(4); delay.delayTime.value = 0.68;
    const fb = ctx.createGain(); fb.gain.value = 0.58;
    const fbTone = ctx.createBiquadFilter(); fbTone.type = 'lowpass'; fbTone.frequency.value = 1100;
    const delayOut = ctx.createGain(); delayOut.gain.value = 0.55;
    delay.connect(fbTone); fbTone.connect(fb); fb.connect(delay); delay.connect(delayOut);

    // a second, longer delay tap so the repeats smear instead of ticking
    const delay2 = ctx.createDelay(4); delay2.delayTime.value = 1.13;
    const fb2 = ctx.createGain(); fb2.gain.value = 0.45;
    delay2.connect(fbTone); fbTone.connect(fb2); fb2.connect(delay2); delay2.connect(delayOut);

    // reverb: long generated hall
    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 10, 2.6);
    const verbOut = ctx.createGain(); verbOut.gain.value = 1.05;
    verb.connect(verbOut);

    bus = tone;
    tone.connect(dry); tone.connect(delay); tone.connect(delay2); tone.connect(verb); delayOut.connect(verb);
    dry.connect(master); delayOut.connect(master); verbOut.connect(master);

    // each voice: sine + quiet triangle a hair detuned, breathing on its own slow swell
    NOTES.forEach((f, i) => {
      const v = ctx.createGain(); v.gain.value = 0;
      const pan = ctx.createStereoPanner(); pan.pan.value = [-0.35, 0.35, 0][i];
      v.connect(pan); pan.connect(tone);
      [['sine', 0, 0.42, 1], ['triangle', 4, 0.13, 1], ['sine', 3, 0.42 * HARMONY, 1.5]].forEach(([type, cents, g, mult]) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mult; o.detune.value = cents;
        const og = ctx.createGain(); og.gain.value = g;
        o.connect(og); og.connect(v); o.start();
      });
      // the swell: a slow LFO around a base level, each voice at its own rate
      const base = [0.9, 0.7, 0.55][i];
      v.gain.value = base;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.03 + Math.random() * 0.05;
      const depth = ctx.createGain(); depth.gain.value = base * 0.45;
      lfo.connect(depth); depth.connect(v.gain); lfo.start(ctx.currentTime + Math.random() * 10);
    });
  }

  // one chime: a soft swell in, a long fade out, a faint octave partial, its own place in the stereo
  function chime() {
    const gap = CHIME_GAP[0] + Math.random() * (CHIME_GAP[1] - CHIME_GAP[0]);
    chimeTimer = setTimeout(chime, gap * 1000);
    if (ringing >= CHIME_MAX) return;
    ringing++;
    const f = CHIMES[Math.floor(Math.random() * CHIMES.length)];
    const t = ctx.currentTime;
    const rise = 0.4 + Math.random() * 2.2, ring = 6 + Math.random() * 9;
    const peak = 0.12 + Math.random() * 0.12;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + rise);
    g.gain.setTargetAtTime(0, t + rise, ring / 4);
    const pan = ctx.createStereoPanner(); pan.pan.value = Math.random() * 1.4 - 0.7;
    g.connect(pan); pan.connect(bus);
    const end = t + rise + ring + 1;
    [[1, 1], [2, 0.15], [1.5, HARMONY]].forEach(([mult, amt]) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = f * mult; o.detune.value = Math.random() * 6 - 3;
      const og = ctx.createGain(); og.gain.value = amt;
      o.connect(og); og.connect(g); o.start(t); o.stop(end);
      if (mult === 1) o.onended = () => { g.disconnect(); ringing--; };
    });
  }

  function start() {
    if (!ctx) build();
    return ctx.resume().then(() => {
      if (ctx.state !== 'running') throw new Error('blocked');
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(level * GAIN, t + 4); // soft fade in
      if (!chimeTimer) chimeTimer = setTimeout(chime, 3000);
    });
  }
  function stop() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 1.5);
    clearTimeout(chimeTimer); chimeTimer = null;
  }
  function setVolume(v) {
    level = v;
    if (ctx && master.gain.value > 0) master.gain.setTargetAtTime(v * GAIN, ctx.currentTime, 0.2);
    try { localStorage.setItem(VOL_KEY, String(v)); } catch (e) {}
  }

  const handle = window.ElasticSoundControl.attach({ start, stop, setVolume, startOnGesture: true });
  handle.setVolume(level);
})();
