// Lumina — the performance timeline (2026-07-31). James's brief: he can't
// play a whole track perfectly in real time, so he records SEGMENTS — punch
// in over a region, try a move, scrub back, try again — and builds the set
// up over time. NO QUANTIZE, on his explicit instruction: his hands decide
// where the beat is, and every move is stored at the exact audio time he
// made it. The grid never touches this data.
//
// This file is the DOM-free core: the event model, the punch-in merge rules,
// and the replay cursor. music.js wires it to the audio clock and the host;
// tuner.js draws the card. tmp/lumina/timeline-sim.mjs runs THIS code.
//
// Event kinds (all carry t = audio seconds, raw):
//   { t, k, v }          one control moved (a slider point, a chip click)
//   { t, base: {...} }   a whole-look jump (preset, dice, melt landing)
//   { t, punch, on }     a perform pad going down or up
//   { t, freeze, on }    the picture freezing / resuming
(function () {
  "use strict";

  const sortByTime = (events) => events.slice().sort((a, b) => a.t - b.t);

  // Keys a take "touched" — used for the per-parameter overwrite rule.
  function touchedKeys(take) {
    const keys = new Set();
    take.forEach((e) => { if (e.k) keys.add(e.k); });
    return keys;
  }

  // Punch-in merge. The contract (James-approved design, 2026-07-31):
  //   - Everything OUTSIDE [tIn, tOut) survives untouched.
  //   - Inside the region, a prior per-key event dies only if the new take
  //     touched that key — your color move from take one survives while you
  //     redo the kaleido move in take five.
  //   - A whole-look jump in the new take wipes the region completely (a new
  //     look resets every parameter, stale riders would fight it).
  //   - Prior whole-look jumps inside the region survive a keys-only take
  //     (later per-key events win over them at playback anyway).
  //   - Prior pad/freeze moves die only if the new take performed pads or
  //     freezes of its own.
  function mergeTake(events, take, tIn, tOut) {
    const touched = touchedKeys(take);
    const takeHasLook = take.some((e) => e.base);
    const takeHasPunch = take.some((e) => e.punch !== undefined || e.freeze !== undefined);
    const kept = events.filter((e) => {
      if (e.t < tIn || e.t >= tOut) return true;
      if (takeHasLook) return false;
      if (e.k) return !touched.has(e.k);
      if (e.punch !== undefined || e.freeze !== undefined) return !takeHasPunch;
      return true; // prior whole-look survives a keys-only overdub
    });
    return sortByTime(kept.concat(take));
  }

  // Fold every config event at or before t into one partial — what the world
  // should look like if you seek straight to t. Pads and freezes are
  // transient and deliberately NOT folded (a held pad from 40s ago is not
  // still held), except freeze's latest state, which is sticky by nature.
  function foldTo(events, t) {
    const partial = {};
    let freeze = null;
    for (const e of events) {
      if (e.t > t) break;
      if (e.base) Object.assign(partial, e.base);
      else if (e.k) partial[e.k] = e.v;
      else if (e.freeze !== undefined) freeze = !!e.on;
    }
    return { partial, freeze };
  }

  // Replay cursor: fire(e) every event in [last t, now t], in order. Seeking
  // backward (or a big jump forward) refolds so the look is correct before
  // playback resumes from the middle.
  function makePlayer(events) {
    const evs = sortByTime(events);
    let cursor = 0;
    return {
      seek(t) {
        cursor = 0;
        while (cursor < evs.length && evs[cursor].t <= t) cursor++;
        return foldTo(evs, t);
      },
      step(t, fire) {
        while (cursor < evs.length && evs[cursor].t <= t) {
          fire(evs[cursor]);
          cursor++;
        }
      },
      get length() { return evs.length; },
    };
  }

  globalThis.LuminaTimeline = { mergeTake, foldTo, makePlayer, touchedKeys };
})();
