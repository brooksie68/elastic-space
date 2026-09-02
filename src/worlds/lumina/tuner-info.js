// Lumina — the ⓘ library: verbose plain-language explanations + animated
// mini-demos for every control and card. Loaded before tuner.js in BOTH
// index.html and tuner.html.
//
// Contract (2026-08-03, James's brief — "reduce the descriptive text into a
// small i icon... become more verbose about what it does and show some
// significant visual examples"): the panel surface shows short labels only;
// ALL explanation lives here, behind the ⓘ. Every new control or card must
// add an entry. The factories fall back to any inline `desc` string they were
// passed, so a missing entry degrades to a short sentence — never to nothing.
//
//   LUMINA_INFO.INFO[id] -> { t: "verbose text", demo: "demoName" }
//     id: "field:<key>" | "music:<key>" | "card:<card id>" | "row:<row id>"
//   LUMINA_INFO.DEMOS[name] -> factory() -> draw(ctx, w, h, tSeconds)
//     A factory per open popover, so stateful demos (trails) start fresh.
(function () {
  "use strict";

  const TAU = Math.PI * 2;

  // The swept dial: 0 → 1 → 0 so you watch the knob itself being turned.
  const sweep = (t, period) => 0.5 - 0.5 * Math.cos((t / (period || 4)) * TAU);
  const hash = (i) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // Gold readout bar along the bottom: where the swept knob is right now.
  function knobBar(ctx, w, h, k) {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(10, h - 8, w - 20, 3);
    ctx.fillStyle = "#e3b968";
    ctx.fillRect(10, h - 8, (w - 20) * k, 3);
  }

  // ---------------------------------------------------------------------------
  // The mini flash-field engine: a 3×4 pork-style grid with ONE parameter
  // exaggerated and swept. `mode` picks which behavior k drives.
  // ---------------------------------------------------------------------------
  function tiles(mode, opts) {
    const o = opts || {};
    return () => (ctx, w, h, t) => {
      const k = sweep(t, o.period || 4.5);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0e0e12";
      ctx.fillRect(0, 0, w, h);

      const R = 3, C = 4;
      let m = 16, gap = 7;
      if (mode === "margins") m = 6 + k * 34;
      if (mode === "gaps") gap = 1 + k * 22;
      const innerW = w - m * 2, innerH = h - m * 2 - 8;
      const cw = (innerW - gap * (C - 1)) / C;
      const ch = (innerH - gap * (R - 1)) / R;

      if (mode === "blur") ctx.filter = `blur(${(k * 4).toFixed(1)}px)`;

      const rate = mode === "speed" ? 0.25 + k * 2.2 : 0.8;

      const drawPass = (ghost) => {
        for (let r = 0; r < R; r++) {
          for (let c = 0; c < C; c++) {
            const i = r * C + c;
            // phase spacing
            let ph = i / (R * C);
            if (mode === "spread") ph = (i / (R * C)) * (0.15 + 0.85 * k);
            if (mode === "desync") ph += (hash(i) - 0.5) * 1.2 * k;
            let v = 0.5 + 0.5 * Math.cos((t * rate - ph) * TAU);
            if (ghost) v = 1 - v;
            if (mode === "ease") {
              const sq = v > 0.5 ? 1 : 0;
              v = sq * (1 - k) + v * k;
            }
            if (mode === "holds") {
              const p = 1 + k * 6; // dwell at the ends
              v = v < 0.5 ? 0.5 * Math.pow(v * 2, p) : 1 - 0.5 * Math.pow((1 - v) * 2, p);
            }

            let cx = m + c * (cw + gap) + cw / 2;
            let cy = m + r * (ch + gap) + ch / 2;
            let sw = cw, sh = ch, rot = 0;
            if (mode === "size") { const s = 0.45 + k * 1.5; sw *= s; sh *= s; }
            if (mode === "pulse") { const s = 1 + 0.5 * k * Math.sin(t * 2.2 + i * 1.7); sw *= s; sh *= s; }
            if (mode === "displace") {
              cx += Math.sin(t * 1.3 + i * 2.1) * k * cw * 0.55;
              cy += Math.cos(t * 1.1 + i * 3.3) * k * ch * 0.55;
            }
            if (mode === "rotate") rot = (hash(i) - 0.5) * 1.5 * k;
            if (mode === "spin") rot = t * (0.3 + k * 2.5) + i;

            ctx.save();
            ctx.translate(cx, cy);
            if (rot) ctx.rotate(rot);
            const g = Math.round(20 + v * 225);
            if (mode === "hue") {
              ctx.fillStyle = `hsl(${(k * 360).toFixed(0)}, 60%, ${(15 + v * 55).toFixed(0)}%)`;
            } else {
              ctx.fillStyle = `rgb(${g},${g},${g})`;
            }
            if (ghost) ctx.globalAlpha = 0.4 * k;
            const rad = mode === "radius" ? Math.min(sw, sh) * 0.5 * k : 2;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-sw / 2, -sh / 2, sw, sh, rad);
            else ctx.rect(-sw / 2, -sh / 2, sw, sh);
            ctx.fill();
            if (mode === "border" && k > 0.02) {
              ctx.strokeStyle = "rgba(255,255,255,0.9)";
              ctx.lineWidth = 0.5 + k * 4;
              ctx.stroke();
            }
            if (mode === "nest" && k > 0.03) {
              const ig = Math.round(20 + (1 - v) * 225);
              ctx.fillStyle = `rgba(${ig},${ig},${ig},${k.toFixed(2)})`;
              ctx.fillRect(-sw / 4, -sh / 4, sw / 2, sh / 2);
            }
            ctx.restore();
            ctx.globalAlpha = 1;
          }
        }
      };

      drawPass(false);
      if (mode === "counter") {
        ctx.save();
        ctx.translate(cw * 0.5 + gap * 0.5, ch * 0.5 + gap * 0.5);
        drawPass(true);
        ctx.restore();
      }
      if (mode === "merge" && k > 0.05) {
        // two cells fused into one block, riding the same flash
        const v = 0.5 + 0.5 * Math.cos(t * 0.8 * TAU);
        const g = Math.round(20 + v * 225);
        ctx.fillStyle = `rgba(${g},${g},${g},${Math.min(1, k * 1.4).toFixed(2)})`;
        ctx.fillRect(m + 1 * (cw + gap), m + 1 * (ch + gap), cw * 2 + gap, ch);
      }
      ctx.filter = "none";
      knobBar(ctx, w, h, k);
    };
  }

  // ---------------------------------------------------------------------------
  // The FX stage: a little asymmetric doodle, then a cartoon of each effect.
  // ---------------------------------------------------------------------------
  function doodle(ctx, w, h, t) {
    ctx.fillStyle = "#16161c";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2 + Math.cos(t * 0.9) * w * 0.18;
    const cy = h / 2 + Math.sin(t * 1.3) * h * 0.16;
    ctx.fillStyle = "#dfe8ff";
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#8fb4ff";
    ctx.fillRect(w * 0.22, h * 0.6 + Math.sin(t * 1.7) * 6, 34, 12);
    ctx.fillStyle = "#ffd27d";
    ctx.beginPath();
    ctx.moveTo(w * 0.72, h * 0.3);
    ctx.lineTo(w * 0.72 + 26, h * 0.3 + 8);
    ctx.lineTo(w * 0.72 + 4, h * 0.3 + 24);
    ctx.closePath();
    ctx.fill();
  }

  function fxDemo(kind) {
    return () => {
      let trail = null; // offscreen for the stateful ones
      return (ctx, w, h, t) => {
        const k = sweep(t, 4.5);
        if (kind === "trails" || kind === "zoom" || kind === "zoomrot") {
          if (!trail) {
            trail = document.createElement("canvas");
            trail.width = w; trail.height = h;
          }
          const tc = trail.getContext("2d");
          // feedback: last frame re-drawn slightly transformed, then the doodle
          tc.save();
          if (kind === "trails") {
            tc.globalAlpha = 0.75 + k * 0.22;
            tc.drawImage(trail, 0, 0);
          } else {
            const s = 1 - 0.06 - k * 0.0; // constant zoom, k drives opacity
            tc.globalAlpha = 0.55 + k * 0.4;
            tc.translate(w / 2, h / 2);
            if (kind === "zoomrot") tc.rotate(0.05 + k * 0.12);
            tc.scale(s, s);
            tc.translate(-w / 2, -h / 2);
            tc.drawImage(trail, 0, 0);
          }
          tc.restore();
          tc.globalAlpha = 1;
          // fresh doodle on top, faded so the loop shows
          tc.save();
          tc.globalAlpha = kind === "trails" ? 1 : 0.9;
          const sub = document.createElement("canvas");
          sub.width = w; sub.height = h;
          const sc = sub.getContext("2d");
          doodle(sc, w, h, t);
          tc.drawImage(sub, 0, 0);
          tc.restore();
          // dim the accumulation so it can't white out
          tc.fillStyle = `rgba(14,14,18,${kind === "trails" ? (0.16 - k * 0.12).toFixed(3) : 0.05})`;
          tc.fillRect(0, 0, w, h);
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(trail, 0, 0);
          knobBar(ctx, w, h, k);
          return;
        }

        // stateless cartoons
        ctx.clearRect(0, 0, w, h);
        if (kind === "pixel") {
          const px = Math.max(1, Math.round(1 + k * 14));
          const sub = document.createElement("canvas");
          sub.width = Math.max(2, Math.round(w / px));
          sub.height = Math.max(2, Math.round(h / px));
          const sc = sub.getContext("2d");
          sc.scale(sub.width / w, sub.height / h);
          doodle(sc, w, h, t);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(sub, 0, 0, w, h);
          ctx.imageSmoothingEnabled = true;
        } else if (kind === "rgb") {
          const off = k * 14;
          const sub = document.createElement("canvas");
          sub.width = w; sub.height = h;
          doodle(sub.getContext("2d"), w, h, t);
          ctx.fillStyle = "#16161c";
          ctx.fillRect(0, 0, w, h);
          ctx.globalCompositeOperation = "lighter";
          [["#ff5050", -off], ["#50ff70", 0], ["#5080ff", off]].forEach(([tint, dx]) => {
            const c2 = document.createElement("canvas");
            c2.width = w; c2.height = h;
            const cc = c2.getContext("2d");
            cc.drawImage(sub, dx, 0);
            cc.globalCompositeOperation = "multiply";
            cc.fillStyle = tint;
            cc.fillRect(0, 0, w, h);
            cc.globalCompositeOperation = "destination-in";
            cc.drawImage(sub, dx, 0);
            ctx.drawImage(c2, 0, 0);
          });
          ctx.globalCompositeOperation = "source-over";
        } else if (kind === "warp" || kind === "slit") {
          const sub = document.createElement("canvas");
          sub.width = w; sub.height = h;
          doodle(sub.getContext("2d"), w, h, t);
          ctx.fillStyle = "#16161c";
          ctx.fillRect(0, 0, w, h);
          const slices = 24;
          const sh = h / slices;
          for (let s = 0; s < slices; s++) {
            const dx = kind === "warp"
              ? Math.sin(t * 2 + s * 0.55) * k * 18
              : Math.sin(t * 0.9 - s * 0.35) * k * 26; // rows lag in time
            ctx.drawImage(sub, 0, s * sh, w, sh, dx, s * sh, w, sh);
          }
        } else if (kind === "kaleido") {
          const seg = Math.max(2, Math.round(2 + k * 8));
          const sub = document.createElement("canvas");
          sub.width = w; sub.height = h;
          doodle(sub.getContext("2d"), w, h, t);
          ctx.fillStyle = "#16161c";
          ctx.fillRect(0, 0, w, h);
          const r = Math.max(w, h);
          for (let s = 0; s < seg; s++) {
            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.rotate((s / seg) * TAU);
            if (s % 2) ctx.scale(1, -1);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, r, -TAU / (seg * 2), TAU / (seg * 2));
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(sub, -w / 2, -h / 2);
            ctx.restore();
          }
        } else if (kind === "bloom") {
          doodle(ctx, w, h, t);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.filter = `blur(${(2 + k * 10).toFixed(1)}px)`;
          ctx.globalAlpha = k * 0.9;
          ctx.drawImage(ctx.canvas, 0, 0);
          ctx.restore();
          ctx.filter = "none";
        } else if (kind === "grain") {
          doodle(ctx, w, h, t);
          const n = Math.round(k * 900);
          for (let i = 0; i < n; i++) {
            const a = hash(i * 7.3 + Math.floor(t * 12) * 91.7);
            ctx.fillStyle = `rgba(255,255,255,${(a * 0.35).toFixed(2)})`;
            ctx.fillRect(hash(i + t) * w, hash(i * 3.1 + t) * h, 1.5, 1.5);
          }
        } else if (kind === "crt") {
          doodle(ctx, w, h, t);
          ctx.fillStyle = `rgba(0,0,0,${(k * 0.5).toFixed(2)})`;
          for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
          const tearY = (t * 30) % h;
          if (k > 0.3) {
            const band = ctx.getImageData(0, tearY, w, 6);
            ctx.putImageData(band, k * 16, tearY);
          }
        } else if (kind === "shutter") {
          const open = (Math.sin(t * 7) > (0.9 - k * 1.8));
          if (open || k < 0.05) doodle(ctx, w, h, t);
          else { ctx.fillStyle = "#0a0a0d"; ctx.fillRect(0, 0, w, h); }
        } else if (kind === "iris") {
          doodle(ctx, w, h, t);
          ctx.fillStyle = "#0a0a0d";
          ctx.beginPath();
          ctx.rect(0, 0, w, h);
          const rx = (w * 0.62) * (1 - k * 0.8);
          const ry = (h * 0.62) * (1 - k * 0.8);
          ctx.ellipse(w / 2, h / 2, Math.max(6, rx), Math.max(6, ry), 0, 0, TAU, true);
          ctx.fill("evenodd");
        }
        knobBar(ctx, w, h, k);
      };
    };
  }

  // ---------------------------------------------------------------------------
  // The scene stage: soft blob backdrop UNDER a small tile grid.
  // ---------------------------------------------------------------------------
  function sceneDemo(kind) {
    return () => (ctx, w, h, t) => {
      const k = sweep(t, 4.5);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0e0e12";
      ctx.fillRect(0, 0, w, h);

      // backdrop: three drifting radial blobs
      const mix = kind === "mix" ? k : 0.8;
      const spd = kind === "speed" ? 0.2 + k * 2.4 : 0.7;
      const scl = kind === "scale" ? 0.5 + k * 1.6 : 1;
      const drive = kind === "drive" ? 0.25 + k * 1.1 : 0.8;
      const warp = kind === "warp" ? k : 0;
      ctx.save();
      ctx.globalAlpha = Math.min(1, mix);
      ctx.translate(w / 2, h / 2);
      ctx.scale(scl, scl);
      ctx.translate(-w / 2, -h / 2);
      for (let i = 0; i < 3; i++) {
        let bx = w * (0.3 + 0.4 * hash(i)) + Math.cos(t * spd + i * 2.1) * w * 0.18;
        let by = h * (0.3 + 0.4 * hash(i + 5)) + Math.sin(t * spd * 1.2 + i * 1.7) * h * 0.18;
        if (warp) bx += Math.sin(by * 0.08 + t * 2) * warp * 26;
        const hue = kind === "hue" ? (k * 360 + i * 40) % 360 : 205 + i * 55;
        const rad = (28 + i * 16) * (0.7 + drive * 0.6);
        const g = ctx.createRadialGradient(bx, by, 2, bx, by, rad);
        g.addColorStop(0, `hsla(${hue}, 75%, ${35 + drive * 30}%, ${0.85 * drive})`);
        g.addColorStop(1, "hsla(0,0%,0%,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, rad, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      // tiles over it
      const tileA = kind === "tiles" ? k : 0.85;
      const R = 2, C = 4, m = 22, gap = 8;
      const cw = (w - m * 2 - gap * (C - 1)) / C;
      const ch = (h - m * 2 - 14 - gap * (R - 1)) / R;
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          const i = r * C + c;
          const v = 0.5 + 0.5 * Math.cos((t * 0.8 - i / (R * C)) * TAU);
          const g = Math.round(20 + v * 225);
          ctx.fillStyle = `rgba(${g},${g},${g},${tileA.toFixed(2)})`;
          ctx.fillRect(m + c * (cw + gap), m + r * (ch + gap), cw, ch);
        }
      }
      knobBar(ctx, w, h, k);
    };
  }

  // ---------------------------------------------------------------------------
  // Envelope demos for the audio knobs: a jumping level bar + the follower.
  // ---------------------------------------------------------------------------
  function envDemo(kind) {
    return () => {
      let follow = 0, beatFlash = 0, last = 0;
      return (ctx, w, h, t) => {
        const k = sweep(t, 5);
        const dt = last ? Math.min(0.1, t - last) : 0.016;
        last = t;
        // the "music": a square-ish pumping level
        const src = (Math.sin(t * 4) > 0.2 ? 0.95 : 0.15) + Math.sin(t * 13) * 0.04;
        let up = 24, down = 3;
        if (kind === "attack") { up = 30 - k * 28; down = 6; }
        if (kind === "release") { up = 26; down = 12 - k * 11.5; }
        const rate = src > follow ? up : down;
        follow += (src - follow) * Math.min(1, rate * dt);

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "#0e0e12";
        ctx.fillRect(0, 0, w, h);

        if (kind === "master") {
          const applied = follow * (k * 2);
          bar(w * 0.28, "sound", follow, "#8fb4ff");
          bar(w * 0.62, "picture", Math.min(1, applied), "#e3b968");
        } else if (kind === "beatsense") {
          const th = 0.9 - k * 0.7;
          if (src > th) beatFlash = 1;
          beatFlash = Math.max(0, beatFlash - dt * 5);
          bar(w * 0.3, "sound", src, "#8fb4ff");
          ctx.strokeStyle = "#e3b968";
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          const ty = h - 16 - (h - 40) * th;
          ctx.moveTo(w * 0.2, ty);
          ctx.lineTo(w * 0.52, ty);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = `rgba(227,185,104,${beatFlash.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(w * 0.72, h / 2, 14, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = "rgba(227,185,104,0.5)";
          ctx.beginPath();
          ctx.arc(w * 0.72, h / 2, 14, 0, TAU);
          ctx.stroke();
        } else if (kind === "decay") {
          const period = 1.2;
          const ph = (t % period) / period;
          const len = 0.08 + k * 0.85;
          const v = ph < len ? 1 - ph / len : 0;
          bar(w * 0.3, "hit", ph < 0.06 ? 1 : 0.08, "#8fb4ff");
          bar(w * 0.62, "thump", v, "#e3b968");
        } else {
          bar(w * 0.28, "sound", src, "#8fb4ff");
          bar(w * 0.62, "picture", follow, "#e3b968");
        }
        knobBar(ctx, w, h, k);

        function bar(x, label, v, color) {
          const bw = w * 0.14;
          const bh = (h - 40) * Math.max(0, Math.min(1, v));
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.fillRect(x, 16, bw, h - 40);
          ctx.fillStyle = color;
          ctx.fillRect(x, 16 + (h - 40) - bh, bw, bh);
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.font = "10px Roboto, sans-serif";
          ctx.fillText(label, x, h - 12);
        }
      };
    };
  }

  const DEMOS = {
    "tiles-speed": tiles("speed"),
    "tiles-holds": tiles("holds"),
    "tiles-desync": tiles("desync"),
    "tiles-ease": tiles("ease"),
    "tiles-border": tiles("border"),
    "tiles-spread": tiles("spread"),
    "tiles-hue": tiles("hue"),
    "tiles-merge": tiles("merge"),
    "tiles-rotate": tiles("rotate"),
    "tiles-spin": tiles("spin"),
    "tiles-displace": tiles("displace"),
    "tiles-pulse": tiles("pulse"),
    "tiles-counter": tiles("counter"),
    "tiles-nest": tiles("nest"),
    "tiles-size": tiles("size"),
    "tiles-blur": tiles("blur"),
    "tiles-gaps": tiles("gaps"),
    "tiles-margins": tiles("margins"),
    "tiles-radius": tiles("radius"),
    "fx-trails": fxDemo("trails"),
    "fx-zoom": fxDemo("zoom"),
    "fx-zoomrot": fxDemo("zoomrot"),
    "fx-pixel": fxDemo("pixel"),
    "fx-rgb": fxDemo("rgb"),
    "fx-warp": fxDemo("warp"),
    "fx-slit": fxDemo("slit"),
    "fx-kaleido": fxDemo("kaleido"),
    "fx-bloom": fxDemo("bloom"),
    "fx-grain": fxDemo("grain"),
    "fx-crt": fxDemo("crt"),
    "fx-shutter": fxDemo("shutter"),
    "fx-iris": fxDemo("iris"),
    "scene-mix": sceneDemo("mix"),
    "scene-tiles": sceneDemo("tiles"),
    "scene-speed": sceneDemo("speed"),
    "scene-scale": sceneDemo("scale"),
    "scene-drive": sceneDemo("drive"),
    "scene-warp": sceneDemo("warp"),
    "scene-hue": sceneDemo("hue"),
    "env-attack": envDemo("attack"),
    "env-release": envDemo("release"),
    "env-master": envDemo("master"),
    "env-beatsense": envDemo("beatsense"),
    "env-decay": envDemo("decay"),
  };

  // ---------------------------------------------------------------------------
  // The copy. Verbose on purpose — this text lives behind the ⓘ, so it can
  // afford whole sentences, context, and tips the old one-liners couldn't.
  // ---------------------------------------------------------------------------
  const INFO = {
    // --- looks card ---------------------------------------------------------
    "card:looks": {
      t: "Whole looks, not single knobs. A look is every visual setting at once — the grid, the pattern, the colors, the FX, all of it. Recall a saved one from the menu, roll the dice for a brand new one, or bank whatever's on screen with keep. The three big sliders below are the ones you'll reach for most, so they live up top.",
    },
    "row:looks-presets": {
      t: "The preset menu holds built-in looks, your saved ones, and “last session” — wherever you left off last time. 🎲 rolls a completely new look; ↩ takes back the last roll or preset jump (slider tweaks are never undone, only whole-look changes); keep banks what's on screen under a name you can recall later. save does the same with no suggested name. set as default overwrites the special “default launch” preset — the look this page opens on every time.",
    },
    "field:speed": {
      t: "The master tempo of the flashing — every tile's cycle scales through it. ×1 is the original 2002 timing; all the way down parks the picture mid-flash; ×8 is mania. This is separate from the music's tempo — to make the flashing follow the track, use sync in beat lock instead, or wire a mod-matrix row to speed.",
      demo: "tiles-speed",
    },
    "field:tileSize": {
      t: "The size of the little squares themselves. Grid spacing stays put, so as tiles grow they close their gaps, butt up against each other, overlap, and eventually swallow the frame whole. Small sizes turn the field into a starfield of dots.",
      demo: "tiles-size",
    },
    "field:blur": {
      t: "A soft-focus blur over the entire field. A few pixels melts the hard tile edges into glow; way up, the whole picture becomes fog and color. The dice deliberately lands here only rarely.",
      demo: "tiles-blur",
    },

    // --- perform ------------------------------------------------------------
    "card:perform": {
      t: "Play it live while the music runs. The pads are momentary: hold one and it fires, let go and the picture snaps back to exactly where it was — nothing you do here is ever saved. Keys 1–6 are the stock pads left to right, hold-to-fire. When a scene is playing, its own gold verbs join the strip — each scene brings its own moves. The XY pad drags two knobs at once with one finger: X is the first menu, Y the second — pick any two parameters and ride them.",
    },

    // --- timeline -----------------------------------------------------------
    "card:timeline": {
      t: "Record your own set for the current track. Hit ● record, make moves — sliders, dice rolls, pads — and punch out with ■. Play it back with “your set” in the player. Re-record any stretch: only the controls you actually touch in the new take get replaced, everything else you built stays. Your timing lands exactly as you played it — the strip shows seconds and the track's energy, and nothing ever gets nudged onto a grid.",
    },
    "row:timeline-strip": {
      t: "Click the strip to jump anywhere in the track; drag a stretch to set a loop — a looping armed pass banks a take every lap, so you can try a section over and over and keep the last pass. Double-click clears the loop. Gold ticks are your recorded moves (tall ones are whole-look jumps, blue ones are pads); the red playhead means you're armed. undo take rolls back the last take; clear track wipes the whole recording after a confirm.",
    },

    // --- pulse --------------------------------------------------------------
    "card:pulse": {
      t: "The feel of each flash — what one tile's journey from dark to bright and back feels like, and whether the tiles travel together or apart.",
    },
    "field:holdScale": {
      t: "How long each flash rests at full bright and full dark before turning around. Short holds keep the field always in motion; long holds make it blink — snap, dwell, snap. The 2002 original sits in the middle.",
      demo: "tiles-holds",
    },
    "field:desync": {
      t: "Knocks the tiles out of step with each other by a random amount. At 0% every tile obeys the pattern exactly, like 2002. Turned up, the choreography dissolves into individual fireflies. Great mid-way: the pattern is still legible but alive.",
      demo: "tiles-desync",
    },
    "field:ease": {
      t: "The shape of the fade. Low is hard corners — tiles snap between dark and bright like switches. High is soft breathing, all sine curves. This changes the personality of the whole piece more than it looks like it should.",
      demo: "tiles-ease",
    },
    "field:border": {
      t: "A drawn outline around each tile. Zero removes it entirely; heavier weights read as neon frames, and the outline holds its brightness even when the tile inside goes dark.",
      demo: "tiles-border",
    },

    // --- structure ----------------------------------------------------------
    "card:structure": {
      t: "What the tiles are: how they're arranged, what shape they take, what colors they flash, and the motion laid over them. The chips at the top are live pickers — arrangement, shape, wave, palette — and the sliders below add motion: fusing, tilting, spinning, shaking, swelling.",
    },
    "field:layout": { t: "How the tiles are arranged in space — the classic grid, rings, spirals, waves, scatter. Changing layout keeps everything else: same pattern, same colors, same motion, new geometry. Each chip plots the real arrangement." },
    "field:shape": { t: "The shape of each tile — squares, circles, diamonds, bars, and friends. Purely cosmetic, endlessly effective, especially with rotation or spin on top." },
    "field:wave": {
      t: "The flash curve — the exact path a tile takes from dark to bright and back. Sine breathes, square snaps, triangle sweeps, and the others each put a different accent on the same journey. The chips draw the actual curve.",
    },
    "field:palette": {
      t: "What colors the tiles flash between. “duo” uses the two color pickers down in canvas — that pair is the 2002 original — and the rest are ready-made ramps through more than two colors. The backdrop has its own palette in the scene card; they don't have to match.",
    },
    "field:hueShift": {
      t: "Spins every color in the current palette around the color wheel by the same amount. A slow mod-matrix wire into this (try phrase → hue) drifts the whole piece through moods without ever changing the palette itself.",
      demo: "tiles-hue",
    },
    "field:merge": {
      t: "Fuses some neighboring tiles into bigger blocks that flash as one. A little reads as texture — the grid develops landmarks. A lot turns the field into large plates of light.",
      demo: "tiles-merge",
    },
    "field:rotate": {
      t: "Tilts each tile by its own random, fixed amount. The grid keeps its positions but loses its discipline — like tiles shaken loose. Pairs beautifully with non-square shapes.",
      demo: "tiles-rotate",
    },
    "field:spin": {
      t: "Every tile turns continuously, each at its own rate. Unlike rotate (a fixed tilt), this is endless motion — the field becomes a machine of little propellers.",
      demo: "tiles-spin",
    },
    "field:displace": {
      t: "Shakes tiles off their home positions by a wandering offset. Low is a nervous shimmer; high sends the grid drifting apart. Wire bass → displace in the mod matrix and the whole field jolts with the low end.",
      demo: "tiles-displace",
    },
    "field:sizePulse": {
      t: "Tiles swell and shrink in slow rolling waves that travel across the field — a second rhythm layered under the flashing. This is the knob the stock reactivity pushes with the bass.",
      demo: "tiles-pulse",
    },
    "field:counter": {
      t: "A ghost twin of the whole field, offset by half a tile and flashing opposite. Where the real field goes dark, the ghost glows — interference patterns, moiré, woven light.",
      demo: "tiles-counter",
    },
    "field:nest": {
      t: "Puts a smaller tile inside each tile, flashing in opposition — dark centers in bright tiles, bright hearts in dark ones. Two levels deep at maximum. Adds instant intricacy to any pattern.",
      demo: "tiles-nest",
    },

    // --- scene --------------------------------------------------------------
    "card:scene": {
      t: "An animated painting rendered underneath the tiles — flowing ink, ridged terrain, a bred flame fractal, or a star tunnel. The tiles float over it; slide their opacity down and the backdrop IS the show. The shared sliders here work on every scene; below them, the playing scene adds its own controls when it has some, and its own pads appear in the perform strip.",
    },
    "field:scene": { t: "Which backdrop plays. “none” is the classic plain field — and also the cheapest to render. Each scene has its own character and responds to drive, warp and scale in its own way." },
    "field:scenePalette": { t: "The backdrop's colors, chosen separately from the tiles' palette. “genome” is special: when the flame scene is playing, it uses the flame's own bred colors." },
    "field:sceneMix": {
      t: "The backdrop's brightness. At zero it's off entirely (and costs nothing). Up high, the scene takes over and the tiles become a pattern floating on top of it.",
      demo: "scene-mix",
    },
    "field:sceneTiles": {
      t: "How solid the tiles look over the backdrop. Zero hides them completely — pure scene. In between, the tiles become translucent panes the backdrop glows through.",
      demo: "scene-tiles",
    },
    "field:sceneSpeed": {
      t: "How fast the backdrop itself moves — completely separate from the tiles' flashing tempo. Slowing the scene under fast tiles (or the reverse) is one of the best tricks in the whole rig.",
      demo: "scene-speed",
    },
    "field:sceneScale": {
      t: "Zooms the backdrop in and out. Small scale shows the pattern's fine structure; large scale turns it into weather — huge soft masses moving behind the grid.",
      demo: "scene-scale",
    },
    "field:sceneDrive": {
      t: "The backdrop's energy: glow, density, agitation. Each scene interprets it its own way — ink gets more turbulent, flame gets hotter, the tunnel gets brighter. The stock reactivity pushes this with the overall level.",
      demo: "scene-drive",
    },
    "field:sceneWarp": {
      t: "Bends the backdrop — each scene warps in its own style, from a gentle lean to full liquid distortion. Wire a mid or high band into it for motion that follows the melody rather than the beat.",
      demo: "scene-warp",
    },
    "field:sceneHue": {
      t: "Spins the backdrop's colors around the wheel, independent of the tiles' hue. Drift it slowly and the scene passes through seasons while the tiles stay loyal to their palette.",
      demo: "scene-hue",
    },
    "field:sceneGenome": { t: "Which bred flame plays when the scene is “flame.” These twenty are the survivors of a 7,307-render overnight farm, hand-picked. Set scene palette to “genome” to see each one's true bred colors." },

    // --- beat lock ----------------------------------------------------------
    "card:beat lock": {
      t: "Ties the flashing to the beat of the track that's playing — not by listening and chasing, but by locking to the measured grid, so there's no lag. This is different from reactivity (which follows loudness): beat lock is about WHEN the flashes land.",
    },
    "field:accent": { t: "Which sixteenth-notes the pulse fires on — straight quarters, offbeats, a clave, and friends. The pulse itself does nothing until you wire it: put a ▸ pulse row in the mod matrix and aim it at any knob. Accents wait for the track's first real downbeat before firing." },
    "field:syncBeats": {
      t: "Locks one full flash cycle to exactly 1, 2, 4, 8 or 16 beats of the playing track — the field breathes in bars, perfectly in time, however fast the track is. “free” unhooks it and speed runs at its own rate again.",
    },

    // --- pattern ------------------------------------------------------------
    "card:pattern": {
      t: "The choreography — which tiles flash when, and in what order. Every chip is a live preview running the real timing math at postage-stamp size. The note under the chips describes the selected pattern, and twist reshuffles it in a way each pattern defines for itself.",
    },
    "field:spread": {
      t: "How far apart in time the tiles flash. At zero they all flash together — one big beacon. Turned up, the pattern's sequence stretches out until it reads as a wave traveling through the field.",
      demo: "tiles-spread",
    },
    "field:twist": {
      t: "Each pattern's own remix knob — the note above the sliders says what it does for the selected pattern (reverse it, rotate it, braid it...). Zero is always the pattern as designed.",
    },

    // --- grid ---------------------------------------------------------------
    "card:grid": {
      t: "How many tiles fill the frame. 3×4 is the 2002 original. “fill” stretches the whole composition edge-to-edge — the house default look uses it with the column count matched to the window's shape. More tiles means finer patterns and a dimmer, busier field; fewer means big bold panels of light.",
    },
    "field:rows": { t: "How many rows of tiles. 3 is the 2002 original. Changing the grid rebuilds the field but keeps the clock — motion never restarts." },
    "field:cols": { t: "How many tiles per row. 4 is the 2002 original." },

    // --- margins ------------------------------------------------------------
    "card:margins": {
      t: "Breathing room: the space around the whole field and between the tiles. Tight everything for wall-to-wall light; open it up and the composition floats in the dark.",
    },
    "field:marginTop": { t: "Space above the field.", demo: "tiles-margins" },
    "field:marginRight": { t: "Space to the right of the field.", demo: "tiles-margins" },
    "field:marginBottom": { t: "Space below the field.", demo: "tiles-margins" },
    "field:marginLeft": { t: "Space to the left of the field.", demo: "tiles-margins" },
    "field:gapX": { t: "The space between tiles, side to side. Zero welds each row into a single strip.", demo: "tiles-gaps" },
    "field:gapY": { t: "The space between rows.", demo: "tiles-gaps" },
    "field:inset": { t: "How far each row's glow box reaches past its tiles — the soft halo the 2002 original drew around every row." },

    // --- corners ------------------------------------------------------------
    "card:corners": {
      t: "How rounded everything is. Tiles at 50% become circles; the row boxes and the outer frame round independently. Sharp everything is architectural; round everything is candy.",
    },
    "field:radiusTile": { t: "Tile corners: 0 is square, 50% turns every tile into a circle.", demo: "tiles-radius" },
    "field:radiusRow": { t: "Rounds the glow boxes behind each row." },
    "field:radiusOuter": { t: "Rounds the outer frame of the whole composition." },

    // --- fx rack ------------------------------------------------------------
    "card:fx rack": {
      t: "Projector tricks layered over the finished picture — they don't change what the field does, they change how it reaches your eye. Every effect stacks with every other, and a little goes a long way. All of them are prime mod-matrix targets: a beat wired into feedback or warp is instant drama.",
    },
    "field:fxTrails": {
      t: "Ghost trails: old frames linger and fade instead of vanishing, so anything that moves paints with light. At high strength the picture becomes one continuous smear of history.",
      demo: "fx-trails",
    },
    "field:fxZoom": {
      t: "Video feedback: the picture is fed back into itself slightly smaller, forever — the classic infinite tunnel. What's actually on screen matters less than what it leaves behind.",
      demo: "fx-zoom",
    },
    "field:fxZoomRot": {
      t: "Adds a turn to each feedback generation, twisting the tunnel into a spiral. Even a small amount sets the whole picture slowly wheeling.",
      demo: "fx-zoomrot",
    },
    "field:fxPixel": {
      t: "Chunky mosaic pixels, like the picture is being displayed on a much smaller screen. Snaps all the soft gradients into hard blocks of color.",
      demo: "fx-pixel",
    },
    "field:fxRgb": {
      t: "The red, green and blue in the picture slip apart sideways, broken-projector style. Edges grow colored fringes; at full strength the picture becomes three pictures.",
      demo: "fx-rgb",
    },
    "field:fxWarp": {
      t: "The picture ripples like heat haze, then like water, then like liquid glass. The distortion drifts, so nothing ever holds still.",
      demo: "fx-warp",
    },
    "field:fxSlit": {
      t: "Slit-scan: each row of the picture lags a little further behind in time. Anything that moves smears into taffy — vertical motion becomes waves, flashes become curtains.",
      demo: "fx-slit",
    },
    "field:fxKaleido": {
      t: "Folds the picture into mirrored wedges around the center, from a simple mirror up to a twelve-way mandala. Everything the field does becomes symmetrical ornament. The three kal knobs below deepen it: rings, refolds, spin — they do nothing until this one is on.",
      demo: "fx-kaleido",
    },
    "field:fxKalRing": {
      t: "Folds the kaleidoscope in radius as well as angle, so the mandala grows concentric bands of repeated ornament — the engraved-medallion look. Low is a gentle ring structure; high is tight tree-rings. Only works while kaleido is on.",
    },
    "field:fxKalIter": {
      t: "Folds the folded wedge again — once or twice — multiplying the ornament into finer lace. What was one mirrored motif becomes a braid of them. Only works while kaleido is on.",
    },
    "field:fxKalSpin": {
      t: "Sets the whole mandala slowly wheeling. The picture underneath doesn't turn — the fold itself does, so the ornament continuously becomes new ornament. A little goes a long way. Only works while kaleido is on.",
    },
    "field:fxBloom": {
      t: "Bright spots glow and spill light into their surroundings, like fog on a lens. This is the knob that makes flashes feel like light sources instead of white rectangles.",
      demo: "fx-bloom",
    },
    "field:fxGrain": {
      t: "Animated film grain over everything. A touch adds texture and age; a lot is a blizzard.",
      demo: "fx-grain",
    },
    "field:fxCrt": {
      t: "Old TV: scanlines, curved glass at the corners, and — when there's a beat — a horizontal sync tear that rides it.",
      demo: "fx-crt",
    },
    "field:fxShutter": {
      t: "A strobing gate chops the whole picture on and off. Different from the tiles' own flashing — this cuts everything, backdrop included, like a club strobe over the whole room.",
      demo: "fx-shutter",
    },
    "field:fxIris": {
      t: "Closes the picture down to an oval, old-film style. Mid-way it's a vignette; high, the show plays through a keyhole. The dice rolls it only rarely.",
      demo: "fx-iris",
    },

    // --- canvas -------------------------------------------------------------
    "card:canvas": {
      t: "The raw materials: the two colors the tiles flash between when the palette is “duo” (they're the 2002 pair by default), the page color behind everything, and the size of the stage itself. reset here returns every visual control to the decoded-GIF original.",
    },
    "row:frame": {
      t: "The stage, in pixels — any size, any aspect ratio, scaled down to fit the window. “fit screen” is the default and follows the window as it resizes; typing a size pins it for this session. Frame sizes are never saved — every visit starts fitted to the screen.",
    },

    // --- my deck ------------------------------------------------------------
    "card:my deck": {
      t: "Your pinned controls. Hit the ☆ on any control anywhere and a copy appears here — on top of the board. The original stays where it lives; this is a second handle on it. Un-star to remove.",
    },

    // --- audio: player ------------------------------------------------------
    "card:player": {
      t: "What's playing and who's driving the visuals. Tracks dropped into the sound-tracks folder appear in the menu automatically. The visual dj menu is the big switch: claude's set plays a light show composed for the exact track; free play hands the field to your sliders; your set replays what you recorded on the timeline.",
    },
    "row:player-dj": {
      t: "claude's set: a composed, bar-synced light show authored for each measured track — your sliders come back the moment you switch away. free play: the field obeys you and the reactivity settings only. your set: your own timeline recording drives the field, exactly as you performed it.",
    },

    // --- audio: reactivity --------------------------------------------------
    "card:reactivity": {
      t: "How strongly the music grips the picture, and how quickly it reacts. These shape the envelope followers that everything in the mod matrix rides on. This card lives on the visual board by default because it changes the look as much as any visual card.",
    },
    "music:master": {
      t: "The master grip: every mod-matrix mapping scales through this one knob. Zero unplugs the music from the picture entirely (and instantly restores your clean settings); past ×1 everything digs in harder than designed.",
      demo: "env-master",
    },
    "music:attack": {
      t: "How fast the picture reacts when sound arrives. Instant attack snaps on every transient; slow attack lets the picture lean into swells and ignore the little hits.",
      demo: "env-attack",
    },
    "music:release": {
      t: "How fast the picture lets go after the sound drops. Short is twitchy and precise; long leaves light hanging in the air after every hit.",
      demo: "env-release",
    },
    "music:beatSense": {
      t: "How eager the beat detector is. The dot beside the slider flashes every time it fires — tune until the dot agrees with your foot. Too eager and every hi-hat counts as a beat; too strict and it sleeps through the kick.",
      demo: "env-beatsense",
    },
    "music:beatDecay": {
      t: "How long each detected beat's thump lasts inside the mod matrix — the length of the “beat” source's pulse, from a tick to a wave.",
      demo: "env-decay",
    },
    "music:accentDecay": {
      t: "How long each on-the-grid pulse lasts — the ▸ pulse source's shape. Short is a camera flash on the beat; long is a swell that fills the gap to the next one.",
      demo: "env-decay",
    },

    // --- audio: mod matrix --------------------------------------------------
    "card:mod matrix": {
      t: "Patch cables between the music and the picture. Each row listens to one source — a frequency band, the overall level, the detected beat, or the grid-locked ▸ sources (pulse, bar, phrase, swing — those fire exactly on the measured grid, no lag) — and pushes one visual knob by the amount you set. Negative amounts pull the knob down instead: bass that CLOSES the iris, hits that darken. Your slider positions stay untouched underneath; stop the music and everything returns.",
    },

    // --- audio: react presets ----------------------------------------------
    "card:react presets": {
      t: "Save and recall complete reactivity setups — the envelope knobs plus the whole mod matrix — separate from the visual presets. “per track” remembers the current settings for whichever song is playing and brings them back whenever that song comes on. reset returns the music side — reactivity, matrix, shuffle, per track, set choice — to stock and leaves playback alone.",
    },
    "row:react-pertrack": {
      t: "per track ties the current reactivity settings to the playing song: switch tracks and each one recalls its own setup. Great once a track has a personality — Angular's likes aren't Timber's.",
    },
  };

  globalThis.LUMINA_INFO = { INFO, DEMOS };
})();
