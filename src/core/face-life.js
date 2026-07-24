// face-life.js — shared facial animation engine for Elastic Space characters.
//
// Drives glTF morph targets (ARKit face units + Meta visemes, as produced by the
// Face Lab bust pipeline) across one or more meshes, layering:
//   1. expression — a crossfadable set of morph weights (presets)
//   2. auto-blink — periodic eyelid envelope
//   3. saccades — small conjugate eye darts via the eyeLook* morphs
//   4. speech — viseme playback from a Rhubarb mouth-cue timeline, synced to audio
//   5. idle head motion — subtle drift on a head bone (optional)
//
// Usage:
//   import { createFaceLife } from '../../core/face-life.js';
//   const life = createFaceLife({ meshes, headBone });
//   life.setExpression({ mouthSmileLeft: 0.6, mouthSmileRight: 0.6 }, { duration: 400 });
//   life.speak({ audio, cues });          // cues: Rhubarb mouthCues array
//   ...in rAF: life.update(dt);
//
// No three.js import needed — operates on morphTargetDictionary/Influences and
// a bone's rotation, all duck-typed.

const EASINGS = {
  linear: (t) => t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => t * t * (3 - 2 * t),
};

// Rhubarb extended mouth shapes -> viseme morph weights.
const RHUBARB_SHAPES = {
  A: { viseme_PP: 1.0 },                    // closed (P, B, M)
  B: { viseme_kk: 0.7, viseme_SS: 0.3 },    // slightly open, teeth together
  C: { viseme_E: 0.9 },                     // open (EH, AE)
  D: { viseme_aa: 1.0 },                    // wide open (AA)
  E: { viseme_O: 0.9 },                     // rounded (AO, ER)
  F: { viseme_U: 1.0 },                     // puckered (UW, OO, W)
  G: { viseme_FF: 1.0 },                    // teeth on lower lip (F, V)
  H: { viseme_nn: 0.9 },                    // tongue up (L)
  X: {},                                    // rest
};

const EYELOOK = {
  up: ['eyeLookUpLeft', 'eyeLookUpRight'],
  down: ['eyeLookDownLeft', 'eyeLookDownRight'],
  left: ['eyeLookOutLeft', 'eyeLookInRight'],
  right: ['eyeLookInLeft', 'eyeLookOutRight'],
};

export function createFaceLife({ meshes = [], headBone = null } = {}) {
  // name -> [{ mesh, index }] for every mesh that carries the morph
  const morphMap = new Map();
  const allNames = new Set();
  for (const mesh of meshes) {
    const dict = mesh.morphTargetDictionary;
    if (!dict) continue;
    for (const [name, index] of Object.entries(dict)) {
      allNames.add(name);
      if (!morphMap.has(name)) morphMap.set(name, []);
      morphMap.get(name).push({ mesh, index });
    }
  }

  const headRest = headBone ? headBone.rotation.clone() : null;

  const state = {
    autoBlink: true,
    saccades: true,
    idleMotion: true,
    // expression crossfade
    exprFrom: {},
    exprTo: {},
    exprT: 1,
    exprDuration: 0.45,
    exprEase: EASINGS.easeInOut,
    // blink
    blinkAt: 1.2 + Math.random() * 3,
    blinkPhase: -1, // -1 idle, else seconds into blink
    // saccade
    gaze: { x: 0, y: 0 },
    gazeTarget: { x: 0, y: 0 },
    gazeAt: 0.5 + Math.random() * 2,
    // speech
    speech: null, // { audio, cues, current: {name:val}, onEnd }
    clock: 0,
  };

  function lerpWeights(from, to, t) {
    const out = {};
    for (const k of new Set([...Object.keys(from), ...Object.keys(to)])) {
      const a = from[k] || 0;
      const b = to[k] || 0;
      const v = a + (b - a) * t;
      if (v !== 0) out[k] = v;
    }
    return out;
  }

  function blinkEnvelope(t) {
    // 70ms close, 40ms hold, 120ms open
    if (t < 0.07) return t / 0.07;
    if (t < 0.11) return 1;
    if (t < 0.23) return 1 - (t - 0.11) / 0.12;
    return null; // done
  }

  function sampleSpeech(out) {
    const sp = state.speech;
    if (!sp) return;
    const time = sp.audio ? sp.audio.currentTime : state.clock - sp.startedAt;
    let shape = 'X';
    for (const cue of sp.cues) {
      if (time >= cue.start && time < cue.end) {
        shape = cue.value;
        break;
      }
    }
    const targets = RHUBARB_SHAPES[shape] || {};
    // smooth viseme weights toward targets (fast attack, slightly slower release)
    const cur = sp.current;
    const visKeys = new Set([...Object.keys(cur), ...Object.keys(targets)]);
    for (const k of visKeys) {
      const target = targets[k] || 0;
      const now = cur[k] || 0;
      const rate = target > now ? 22 : 14; // per second
      const v = now + (target - now) * Math.min(1, rate * state.dt);
      if (v < 0.001) delete cur[k];
      else cur[k] = v;
    }
    for (const [k, v] of Object.entries(cur)) out[k] = (out[k] || 0) + v;
    const ended = sp.audio
      ? sp.audio.ended || sp.audio.paused && sp.audio.currentTime === 0
      : time > sp.cues[sp.cues.length - 1]?.end + 0.3;
    if (ended && Object.keys(cur).length === 0) {
      state.speech = null;
      if (sp.onEnd) sp.onEnd();
    }
  }

  function update(dt) {
    if (!(dt > 0)) return;
    if (dt > 0.1) dt = 0.1;
    state.dt = dt;
    state.clock += dt;

    // --- expression crossfade
    if (state.exprT < 1) {
      state.exprT = Math.min(1, state.exprT + dt / state.exprDuration);
    }
    const out = lerpWeights(state.exprFrom, state.exprTo, state.exprEase(state.exprT));

    // --- auto blink
    if (state.autoBlink) {
      if (state.blinkPhase < 0) {
        state.blinkAt -= dt;
        if (state.blinkAt <= 0) state.blinkPhase = 0;
      }
      if (state.blinkPhase >= 0) {
        state.blinkPhase += dt;
        const env = blinkEnvelope(state.blinkPhase);
        if (env === null) {
          state.blinkPhase = -1;
          state.blinkAt = 1.2 + Math.random() * 4.5;
        } else {
          out.eyeBlinkLeft = (out.eyeBlinkLeft || 0) + env;
          out.eyeBlinkRight = (out.eyeBlinkRight || 0) + env;
        }
      }
    }

    // --- saccades
    if (state.saccades) {
      state.gazeAt -= dt;
      if (state.gazeAt <= 0) {
        state.gazeTarget = {
          x: (Math.random() * 2 - 1) * 0.28,
          y: (Math.random() * 2 - 1) * 0.18,
        };
        state.gazeAt = 0.6 + Math.random() * 2.4;
      }
      const slew = Math.min(1, 16 * dt); // saccades are fast
      state.gaze.x += (state.gazeTarget.x - state.gaze.x) * slew;
      state.gaze.y += (state.gazeTarget.y - state.gaze.y) * slew;
      const gx = state.gaze.x;
      const gy = state.gaze.y;
      for (const k of EYELOOK[gx > 0 ? 'right' : 'left']) out[k] = (out[k] || 0) + Math.abs(gx);
      for (const k of EYELOOK[gy > 0 ? 'up' : 'down']) out[k] = (out[k] || 0) + Math.abs(gy);
    }

    // --- speech visemes
    sampleSpeech(out);

    // --- write to meshes
    for (const [name, entries] of morphMap) {
      const v = Math.min(1, Math.max(0, out[name] || 0));
      for (const { mesh, index } of entries) {
        mesh.morphTargetInfluences[index] = v;
      }
    }

    // --- idle head motion
    if (headBone && headRest) {
      if (state.idleMotion) {
        const t = state.clock;
        headBone.rotation.x = headRest.x + 0.012 * Math.sin(t * 0.31) + 0.006 * Math.sin(t * 0.83);
        headBone.rotation.y = headRest.y + 0.016 * Math.sin(t * 0.23 + 1.7) + 0.007 * Math.sin(t * 0.61);
        headBone.rotation.z = headRest.z + 0.008 * Math.sin(t * 0.43 + 0.6);
      } else {
        headBone.rotation.copy(headRest);
      }
    }
  }

  return {
    get morphNames() { return [...allNames]; },

    update,

    setExpression(weights, { duration = 0.45, easing = 'easeInOut' } = {}) {
      state.exprFrom = lerpWeights(state.exprFrom, state.exprTo, state.exprEase(state.exprT));
      state.exprTo = { ...(weights || {}) };
      state.exprDuration = Math.max(0.001, duration);
      state.exprEase = EASINGS[easing] || EASINGS.easeInOut;
      state.exprT = duration <= 0.001 ? 1 : 0;
    },

    getExpression() { return { ...state.exprTo }; },

    speak({ audio, cues, onEnd } = {}) {
      if (!cues || !cues.length) return;
      state.speech = { audio, cues, current: {}, onEnd, startedAt: state.clock };
      if (audio) audio.play();
    },

    stopSpeaking() {
      if (state.speech?.audio) state.speech.audio.pause();
      state.speech = null;
    },

    get speaking() { return !!state.speech; },
    get autoBlink() { return state.autoBlink; },
    set autoBlink(v) { state.autoBlink = !!v; },
    get saccadesOn() { return state.saccades; },
    set saccadesOn(v) { state.saccades = !!v; },
    get idleMotionOn() { return state.idleMotion; },
    set idleMotionOn(v) { state.idleMotion = !!v; },
  };
}
