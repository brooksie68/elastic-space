// The Reich Machine — Web Audio player. Turns engine events into sound: the sampler (voice
// banks, nearest-note + rate bend, hit/hold articulations with a real release crossfade), a
// per-track effects chain, a master chain, and the lookahead scheduler that keeps the drift
// sample-accurate. Falls back to a synthesized tone voice when banks can't load (file://).
(function (root) {
  'use strict';
  const E = root.ReichEngine;

  const LOOKAHEAD = 0.15, TICK = 25, CHUNK = 0.025, XFADE = 0.015;

  function create(opts) {
    const m = opts.machine;
    const ac = new (root.AudioContext || root.webkitAudioContext)();
    const base = opts.base || './assets/voices/';
    const P = { ac, machine: m, voices: {}, list: [], chains: {}, events: [], loading: {}, ready: false, masterFx: { reverb: 0.15, compressor: 0.4 } };

    // ---- master chain ---------------------------------------------------------------
    const master = ac.createGain(); master.gain.value = 0.7;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
    const limiter = ac.createDynamicsCompressor(); limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.08;
    const out = ac.createGain(); out.gain.value = 1;
    const reverb = ac.createConvolver(); reverb.buffer = makeIR(ac, 2.6, 0.5);
    const reverbSend = ac.createGain(); reverbSend.gain.value = 0.15;
    master.connect(comp); comp.connect(limiter); limiter.connect(out); out.connect(ac.destination);
    master.connect(reverbSend); reverbSend.connect(reverb); reverb.connect(limiter);
    const meter = ac.createAnalyser(); meter.fftSize = 512; out.connect(meter);
    P.nodes = { master, comp, limiter, out, reverb, reverbSend, meter };
    // levels for the meters: RMS of the last 512 samples, master + every live track chain
    const meterBuf = new Float32Array(512);
    function rms(an) { an.getFloatTimeDomainData(meterBuf); let s = 0; for (let i = 0; i < meterBuf.length; i++) s += meterBuf[i] * meterBuf[i]; return Math.sqrt(s / meterBuf.length); }
    P.levels = () => { const tracks = {}; for (const id in P.chains) tracks[id] = rms(P.chains[id].meter); return { master: rms(meter), tracks }; };
    P.setVolume = v => { out.gain.setTargetAtTime(v, ac.currentTime, 0.02); };
    P.setMasterFx = fx => { Object.assign(P.masterFx, fx); reverbSend.gain.setTargetAtTime(P.masterFx.reverb, ac.currentTime, 0.05);
      comp.threshold.setTargetAtTime(-4 - 26 * P.masterFx.compressor, ac.currentTime, 0.05); comp.ratio.setTargetAtTime(1.5 + 6 * P.masterFx.compressor, ac.currentTime, 0.05); };

    // ---- voices ---------------------------------------------------------------------
    P.voiceList = () => P.list;
    P.loadList = async () => {
      try {
        const r = await fetch(base + 'voices.json'); if (!r.ok) throw new Error(r.status);
        P.list = await r.json(); P.list.forEach(v => { P.voices[v.slug] = Object.assign({ buffers: { hit: {}, hold: {} }, loaded: false }, v); });
      } catch (e) { P.list = []; }
      P.list.push(TONE_VOICE); P.voices.tone = Object.assign({ buffers: null, loaded: true, synth: true }, TONE_VOICE);
      P.ready = true; return P.list;
    };
    P.loadVoice = async (slug) => {
      const v = P.voices[slug]; if (!v || v.loaded || v.synth) return v;
      if (P.loading[slug]) return P.loading[slug];
      P.loading[slug] = (async () => {
        const jobs = [];
        for (const art of ['hit', 'hold']) for (const n of v.notes) jobs.push((async () => {
          try { const r = await fetch(`${base}${slug}/${art}/${n}.${v.format || 'mp3'}`); const b = await ac.decodeAudioData(await r.arrayBuffer()); v.buffers[art][n] = b; }
          catch (e) { /* missing note: nearest neighbour covers it */ }
        })());
        await Promise.all(jobs); v.loaded = true; return v;
      })();
      return P.loading[slug];
    };
    P.isLoaded = slug => !!(P.voices[slug] && P.voices[slug].loaded);

    // ---- per-track chains -------------------------------------------------------------
    function chainFor(t) {
      let c = P.chains[t.id]; if (c) return c;
      c = {};
      c.input = ac.createGain();
      c.shaper = ac.createWaveShaper(); c.shaper.curve = driveCurve(0); c.shaper.oversample = '2x';
      c.ringDry = ac.createGain(); c.ringWet = ac.createGain(); c.ringMul = ac.createGain(); c.ringMul.gain.value = 0;
      c.ringOsc = ac.createOscillator(); c.ringOsc.type = 'sine'; c.ringOsc.frequency.value = 220; c.ringOsc.connect(c.ringMul.gain); c.ringOsc.start();
      c.wah = ac.createBiquadFilter(); c.wah.type = 'bandpass'; c.wah.Q.value = 4; c.wahDry = ac.createGain(); c.wahWet = ac.createGain();
      c.wahLfo = ac.createOscillator(); c.wahLfo.frequency.value = 1.2; c.wahDepth = ac.createGain(); c.wahDepth.gain.value = 0; c.wahLfo.connect(c.wahDepth); c.wahDepth.connect(c.wah.frequency); c.wahLfo.start();
      c.vibeDry = ac.createGain(); c.vibeWet = ac.createGain(); c.vibeStages = []; c.vibeLfo = ac.createOscillator(); c.vibeLfo.frequency.value = 0.9; c.vibeDepth = ac.createGain(); c.vibeDepth.gain.value = 0; c.vibeLfo.connect(c.vibeDepth); c.vibeLfo.start();
      let last = null;
      for (let i = 0; i < 4; i++) { const ap = ac.createBiquadFilter(); ap.type = 'allpass'; ap.frequency.value = 300 + i * 400; ap.Q.value = 0.7; c.vibeDepth.connect(ap.frequency); if (last) last.connect(ap); c.vibeStages.push(ap); last = ap; }
      c.comp = ac.createDynamicsCompressor(); c.comp.threshold.value = 0; c.comp.ratio.value = 1; c.comp.attack.value = 0.005; c.comp.release.value = 0.15;
      c.delay = ac.createDelay(2.0); c.delay.delayTime.value = 0.375; c.delayFb = ac.createGain(); c.delayFb.gain.value = 0.35; c.delayWet = ac.createGain(); c.delayWet.gain.value = 0;
      c.delayTone = ac.createBiquadFilter(); c.delayTone.type = 'lowpass'; c.delayTone.frequency.value = 4000;
      c.reverbSend = ac.createGain(); c.reverbSend.gain.value = 0;
      c.gain = ac.createGain(); c.gain.value = 0.8;
      c.meter = ac.createAnalyser(); c.meter.fftSize = 512; c.gain.connect(c.meter);
      // wiring: input → shaper → ring(dry/wet) → wah(dry/wet) → vibe(dry/wet) → comp → gain → master (+ delay loop, + reverb send)
      c.input.connect(c.shaper);
      c.shaper.connect(c.ringDry); c.shaper.connect(c.ringMul); c.ringMul.connect(c.ringWet);
      const ringSum = ac.createGain(); c.ringDry.connect(ringSum); c.ringWet.connect(ringSum);
      ringSum.connect(c.wahDry); ringSum.connect(c.wah); c.wah.connect(c.wahWet);
      const wahSum = ac.createGain(); c.wahDry.connect(wahSum); c.wahWet.connect(wahSum);
      wahSum.connect(c.vibeDry); wahSum.connect(c.vibeStages[0]); last.connect(c.vibeWet);
      const vibeSum = ac.createGain(); c.vibeDry.connect(vibeSum); c.vibeWet.connect(vibeSum);
      vibeSum.connect(c.comp); c.comp.connect(c.gain);
      c.gain.connect(master);
      c.gain.connect(c.delay); c.delay.connect(c.delayTone); c.delayTone.connect(c.delayFb); c.delayFb.connect(c.delay); c.delayTone.connect(c.delayWet); c.delayWet.connect(master);
      c.gain.connect(c.reverbSend); c.reverbSend.connect(reverb);
      P.chains[t.id] = c; applyFx(t, c); return c;
    }
    function applyFx(t, c) {
      const f = t.fx, now = ac.currentTime, k = 0.03;
      const anySolo = m.tracks.some(x => x.solo);
      c.gain.gain.setTargetAtTime(t.mute || (anySolo && !t.solo) ? 0 : t.gain, now, k);
      c.shaper.curve = driveCurve(f.distortion);
      c.ringDry.gain.setTargetAtTime(1 - f.ringMod, now, k); c.ringWet.gain.setTargetAtTime(f.ringMod, now, k); c.ringOsc.frequency.setTargetAtTime(f.ringHz, now, k);
      c.wahDry.gain.setTargetAtTime(1 - f.autoWah, now, k); c.wahWet.gain.setTargetAtTime(f.autoWah * 1.6, now, k); c.wah.frequency.value = 900; c.wahDepth.gain.setTargetAtTime(700 * f.autoWah, now, k);
      c.vibeDry.gain.setTargetAtTime(1 - f.univibe, now, k); c.vibeWet.gain.setTargetAtTime(f.univibe, now, k); c.vibeDepth.gain.setTargetAtTime(500 * f.univibe, now, k);
      c.comp.threshold.setTargetAtTime(-30 * f.compressor, now, k); c.comp.ratio.setTargetAtTime(1 + 11 * f.compressor, now, k);
      c.delay.delayTime.setTargetAtTime(f.delayTime, now, k); c.delayFb.gain.setTargetAtTime(Math.min(0.9, f.delayFeedback), now, k); c.delayWet.gain.setTargetAtTime(f.delayMix, now, k);
      c.reverbSend.gain.setTargetAtTime(f.reverb, now, k);
    }
    P.refreshFx = () => { for (const t of m.tracks) { const c = P.chains[t.id]; if (c) applyFx(t, c); } };
    P.dropChain = id => { const c = P.chains[id]; if (!c) return; try { c.gain.disconnect(); c.input.disconnect(); c.ringOsc.stop(); c.wahLfo.stop(); c.vibeLfo.stop(); } catch (e) {} delete P.chains[id]; };

    // ---- the sampler ----------------------------------------------------------------
    // Plays one note into `dest` at audio time `when` for `dur` seconds. Returns nothing; cleans itself up.
    function trigger(voiceSlug, midi, cents, vel, when, dur, articulation, dest, envDepth) {
      const v = P.voices[voiceSlug] || P.voices.tone;
      const noteGain = ac.createGain(); noteGain.gain.value = vel * (v.rms ? Math.min(3, 0.1 / v.rms) : 1);
      let head = noteGain;
      if (envDepth > 0) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3 + 6 * envDepth; const f0 = 200, f1 = 200 + 6000 * envDepth;
        lp.frequency.setValueAtTime(f1, when); lp.frequency.exponentialRampToValueAtTime(f0, when + Math.max(0.08, Math.min(0.6, dur))); lp.connect(noteGain); head = lp; }
      noteGain.connect(dest);
      if (v.synth || !v.buffers) return synthNote(midi + cents / 100, when, dur, head, noteGain);
      const sampled = nearest(v.notes, midi);
      const rate = Math.pow(2, (midi + cents / 100 - sampled) / 12);
      const useHit = articulation === 'hit' || (articulation === 'auto' && dur <= (v.hitTail || 0.3) * 0.9);
      const art = useHit && v.buffers.hit[sampled] ? 'hit' : 'hold';
      const buf = v.buffers[art][sampled]; if (!buf) return;
      const start = when - (v.lead || 0);
      const src = ac.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate; src.connect(head);
      src.start(Math.max(ac.currentTime, start));
      if (art === 'hold') {
        const holdEnd = (v.holdEnd || 4) / rate;                 // the release begins here, in output seconds
        const off = when + dur;
        if (dur < holdEnd - XFADE) {
          // note-off before the baked release: cross into the release segment of the same sample
          const g1 = ac.createGain(); const g2 = ac.createGain();
          src.disconnect(); src.connect(g1); g1.connect(head);
          g1.gain.setValueAtTime(1, off); g1.gain.linearRampToValueAtTime(0, off + XFADE); src.stop(off + XFADE + 0.005);
          const rel = ac.createBufferSource(); rel.buffer = buf; rel.playbackRate.value = rate; rel.connect(g2); g2.connect(head);
          g2.gain.setValueAtTime(0, off); g2.gain.linearRampToValueAtTime(1, off + XFADE);
          rel.start(Math.max(ac.currentTime, off), (v.holdEnd || 4));
          rel.onended = () => { try { noteGain.disconnect(); } catch (e) {} };
        } else src.onended = () => { try { noteGain.disconnect(); } catch (e) {} };
      } else src.onended = () => { try { noteGain.disconnect(); } catch (e) {} };
    }
    function synthNote(midi, when, dur, head, noteGain) {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = o.frequency.value * 2;
      const g = ac.createGain(); g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(0.5, when + 0.005); g.gain.exponentialRampToValueAtTime(0.25, when + 0.12);
      g.gain.setValueAtTime(0.25, when + dur); g.gain.exponentialRampToValueAtTime(0.001, when + dur + 0.25);
      const g2 = ac.createGain(); g2.gain.value = 0.15;
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(head); o.start(when); o2.start(when); o.stop(when + dur + 0.3); o2.stop(when + dur + 0.3);
      o.onended = () => { try { noteGain.disconnect(); } catch (e) {} };
    }
    P.trigger = trigger;
    // immediate preview (the keyboard)
    P.preview = (voiceSlug, midi, dur, fx, vel) => { if (ac.state === 'suspended') ac.resume(); trigger(voiceSlug, midi, 0, vel == null ? 1 : vel, ac.currentTime + 0.01, dur || 0.4, 'auto', master, (fx && fx.envFilter) || 0); };

    // ---- the scheduler --------------------------------------------------------------
    let timer = null, scheduledUntil = 0;
    function tick() {
      const now = ac.currentTime;
      // Background tabs throttle timers to one tick a second: look further ahead there so the
      // drift never stalls. If we still fell behind, advance the engine through the gap (phase
      // stays continuous) and drop the notes that are already in the past.
      const look = (typeof document !== 'undefined' && document.hidden) ? 1.4 : LOOKAHEAD;
      while (scheduledUntil < now + look) {
        const events = E.advance(m, CHUNK);
        for (const e of events) {
          const t = m.tracks.find(x => x.id === e.track); if (!t) continue;
          const c = chainFor(t);
          const when = scheduledUntil + e.at;
          if (when < now - 0.01) continue;
          if (P.isLoaded(e.voice) || (P.voices[e.voice] && P.voices[e.voice].synth)) {
            trigger(e.voice, e.n, e.cents, e.vel, when, e.dur, e.articulation, c.input, t.fx.envFilter);
            if (t.fx.harmonizer && t.fx.harmonizerMix > 0) trigger(e.voice, e.n + t.fx.harmonizer, e.cents, e.vel * t.fx.harmonizerMix, when, e.dur, e.articulation, c.input, t.fx.envFilter);
          }
          P.events.push({ time: when, track: e.track, step: e.step, n: e.n, dur: e.dur });
        }
        scheduledUntil += CHUNK;
      }
      // prune the event log for the face
      while (P.events.length && P.events[0].time < now - 2) P.events.shift();
    }
    P.start = () => { if (ac.state === 'suspended') ac.resume(); if (timer) return; E.play(m); scheduledUntil = ac.currentTime + 0.05; timer = setInterval(tick, TICK); tick(); };
    P.stop = () => { if (!timer) return; clearInterval(timer); timer = null; E.stop(m); };
    P.isPlaying = () => !!timer;
    P.now = () => ac.currentTime;
    P.resume = () => { if (ac.state === 'suspended') ac.resume(); };
    P.suspend = () => { if (ac.state === 'running') ac.suspend(); };
    return P;
  }

  const TONE_VOICE = { slug: 'tone', name: 'plain tone (built in)', author: 'synthesis', notes: [], rms: 0.1, hitTail: 0.3, holdEnd: 4 };

  function nearest(list, midi) { let b = list[0], bd = 1e9; for (const n of list) { const d = Math.abs(n - midi); if (d < bd) { bd = d; b = n; } } return b; }
  function driveCurve(amount) {
    const n = 1024, c = new Float32Array(n), k = amount * 60;
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = k > 0 ? ((1 + k) * x) / (1 + k * Math.abs(x)) : x; }
    return c;
  }
  function makeIR(ac, seconds, damp) {
    const sr = ac.sampleRate, n = Math.floor(sr * seconds), b = ac.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < n; i++) { const env = Math.pow(1 - i / n, 2.2 + damp * 2); const w = (Math.random() * 2 - 1); lp += (w - lp) * 0.35; d[i] = lp * env; } }
    return b;
  }

  root.ReichPlayer = { create };
})(typeof globalThis !== 'undefined' ? globalThis : this);
