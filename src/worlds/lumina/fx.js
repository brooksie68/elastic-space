// Lumina — the FX rack: a WebGL post-processing chain over the field.
// The field stays the instrument; this is the pedalboard. When any fx* config
// key is nonzero the field hides its DOM tiles and hands this module an
// analytic display list each frame (design coords); we paint it to a source
// canvas, run it through feedback + geometry + color shaders, and present.
// All knobs are ordinary field config keys, so tuner sliders, mod-matrix
// targets, and compositions drive them like any other parameter.
//
//   LuminaFX.attach(field, frameEl);   // once, after mount
//   LuminaFX.beat();                   // music.js pings detected beats
(function () {
  "use strict";

  // Fill-rate cap — an FX frame never exceeds this. 1600 was fine inside the
  // old 1024px staging frame; once the frame went full-window (2026-07-27) it
  // upscaled ~1.6× across James's ~2560px viewport and EVERYTHING on the GL
  // path read as blur (his 2026-07-28 report: "blur every single time I hit
  // the dice"). 2560 keeps the canvas at least 1:1 with his CSS pixels.
  const MAX_DIM = 2560;

  const VS = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;

  // Pass 1 — compose + feedback: the scene backdrop under the tile layer,
  // then trails decay + the zoom/rotate video-feedback tunnel over the mix.
  // With no scene the uniforms collapse to the original math exactly
  // (uSceneMix 0, uTileAlpha 1, opaque tile canvas).
  const FS_FEED = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uSrc;
    uniform sampler2D uPrev;
    uniform sampler2D uScene;
    uniform float uTrails, uZoom, uZoomRot, uSceneMix, uTileAlpha, uSceneTone;
    void main() {
      vec2 c = vUv - 0.5;
      float ang = uZoomRot * 0.35;
      float s = sin(ang), co = cos(ang);
      c = mat2(co, -s, s, co) * c;
      c *= 1.0 - uZoom * 0.06;
      vec3 prev = texture2D(uPrev, c + 0.5).rgb;
      vec4 tile = texture2D(uSrc, vUv);
      vec3 scene = texture2D(uScene, vUv).rgb;
      scene = scene / (scene * uSceneTone + (1.0 - uSceneTone));
      vec3 src = mix(scene * uSceneMix, tile.rgb, tile.a * uTileAlpha);
      float zoomHold = uZoom > 0.001 ? 0.86 + uZoom * 0.12 : 0.0;
      float decay = clamp(max(uTrails * 0.985, zoomHold), 0.0, 0.985);
      gl_FragColor = vec4(max(src, prev * decay), 1.0);
    }`;


  // Pass 2 — geometry + color: kaleido, CRT barrel/tear, warp, slit-scan,
  // pixelate, RGB split, bloom, grain, scanlines, iris, shutter.
  const FS_POST = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform vec2 uRes;
    uniform float uPixel, uRgb, uWarp, uSlit, uKaleido, uBloom, uGrain,
                  uCrt, uShutter, uIris, uTime, uBeat;
    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
        mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
    }
    void main() {
      vec2 uv = vUv;
      if (uCrt > 0.0) {
        vec2 c = uv - 0.5;
        uv = 0.5 + c * (1.0 + dot(c, c) * uCrt * 0.35);
        float tearY = fract(uTime * 0.37);
        if (abs(uv.y - tearY) < 0.035 * uCrt * uBeat) uv.x += 0.07 * uCrt * uBeat;
      }
      if (uKaleido > 0.5) {
        vec2 c = uv - 0.5;
        float seg = 6.2831853 / uKaleido;
        float a = atan(c.y, c.x);
        a = mod(a, seg);
        a = abs(a - seg * 0.5);
        uv = clamp(0.5 + vec2(cos(a), sin(a)) * length(c), 0.0, 1.0);
      }
      if (uWarp > 0.0) {
        vec2 n = vec2(
          vnoise(uv * 3.0 + uTime * 0.25),
          vnoise(uv * 3.0 - uTime * 0.21 + 7.7)) - 0.5;
        uv += n * uWarp * 0.14;
      }
      if (uSlit > 0.0) uv.x += sin(uv.y * 40.0 + uTime * 2.0) * uSlit * 0.08;
      if (uPixel > 0.0) {
        vec2 px = uRes / mix(1.0, 42.0, uPixel);
        uv = (floor(uv * px) + 0.5) / px;
      }
      vec3 col;
      if (uRgb > 0.0) {
        vec2 off = vec2(uRgb * 0.02, 0.0);
        col = vec3(
          texture2D(uTex, uv + off).r,
          texture2D(uTex, uv).g,
          texture2D(uTex, uv - off).b);
      } else {
        col = texture2D(uTex, uv).rgb;
      }
      if (uBloom > 0.0) {
        vec3 acc = vec3(0.0);
        float rad = uBloom * 0.025;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.785398;
          acc += max(texture2D(uTex, uv + vec2(cos(a), sin(a)) * rad).rgb - 0.55, 0.0);
        }
        col += acc * uBloom * 0.45;
      }
      if (uGrain > 0.0) col += (hash21(vUv * uRes + fract(uTime) * 61.7) - 0.5) * uGrain * 0.35;
      if (uCrt > 0.0) col *= 1.0 - uCrt * 0.3 * (0.5 + 0.5 * sin(vUv.y * uRes.y * 3.14159));
      if (uIris > 0.0) {
        float d = length(vUv - 0.5) * 2.0;
        float open = 1.5 - uIris * 1.4;
        col *= 1.0 - smoothstep(open - 0.3, open, d);
      }
      if (uShutter > 0.0) {
        float gate = step(0.5, fract(uTime * (2.0 + uShutter * 12.0)));
        col *= mix(1.0, gate, uShutter);
      }
      gl_FragColor = vec4(col, 1.0);
    }`;

  // 2D-canvas shape painters over the unit square centered at origin.
  const SHAPE_PATHS = {
    triangle: [[0, -0.5], [0.5, 0.5], [-0.5, 0.5]],
    diamond: [[0, -0.5], [0.5, 0], [0, 0.5], [-0.5, 0]],
    hexagon: [[-0.25, -0.47], [0.25, -0.47], [0.5, 0], [0.25, 0.47], [-0.25, 0.47], [-0.5, 0]],
    chevron: [[-0.5, -0.5], [0, -0.2], [0.5, -0.5], [0.5, 0.2], [0, 0.5], [-0.5, 0.2]],
    star: [[0, -0.5], [0.11, -0.15], [0.48, -0.15], [0.18, 0.07], [0.29, 0.41], [0, 0.2], [-0.29, 0.41], [-0.18, 0.07], [-0.48, -0.15], [-0.11, -0.15]],
    cross: [[-0.17, -0.5], [0.17, -0.5], [0.17, -0.17], [0.5, -0.17], [0.5, 0.17], [0.17, 0.17], [0.17, 0.5], [-0.17, 0.5], [-0.17, 0.17], [-0.5, 0.17], [-0.5, -0.17], [-0.17, -0.17]],
  };

  function tracePath(ctx, item) {
    const { w, h, shape } = item;
    ctx.beginPath();
    if (shape === "circle") {
      ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
    } else if (shape === "ring") {
      ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
      ctx.arc(0, 0, w * 0.27, 0, Math.PI * 2, true);
    } else if (shape === "bar") {
      ctx.rect(-w / 2, -h * 0.14, w, h * 0.28);
    } else if (shape === "slit") {
      ctx.rect(-w * 0.08, -h / 2, w * 0.16, h);
    } else if (SHAPE_PATHS[shape]) {
      const pts = SHAPE_PATHS[shape];
      ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * w, pts[i][1] * h);
      ctx.closePath();
    } else if (item.radius > 0.5) {
      const r = Math.min(item.radius, w / 2);
      ctx.roundRect(-w / 2, -h / 2, w, h, r);
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }
  }

  function compile(gl, vsSrc, fsSrc) {
    const make = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error("Lumina FX shader: " + gl.getShaderInfoLog(sh));
      }
      return sh;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, make(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(prog, make(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error("Lumina FX link: " + gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  function attach(field, frameEl) {
    const canvas = document.createElement("canvas");
    canvas.className = "lum-fx-canvas";
    frameEl.appendChild(canvas);
    canvas.style.display = "none";

    const src = document.createElement("canvas");
    const sctx = src.getContext("2d");

    let gl = null;
    let progFeed = null, progPost = null;
    let quad = null;
    let texSrc = null;
    let fbos = null; // [{tex, fb}, {tex, fb}] ping-pong
    let flip = 0;
    let sized = "";
    let beatPulse = 0;
    let ok = true;

    // --- scene layer state (scenes.js programs, rendered under the tiles) ---
    const SCENES = globalThis.LuminaScenes || null;
    const sceneProgs = {};   // id -> compiled program (false = failed, skip)
    let sceneFbo = null;     // { tex, fb } the scene renders into
    let texBlack = null;     // 1×1 black — bound when no scene is active
    let flameBuf = null;     // seed attribute buffer for the flame splat
    let sceneTime = 0;       // scene clock: advances by dt * sceneSpeed
    let palKey = "";
    let palStops = new Float32Array(18);

    function sceneProgram(id) {
      if (!SCENES) return null;
      if (id in sceneProgs) return sceneProgs[id] || null;
      let prog = null;
      try {
        if (id === "flame") {
          prog = compile(gl, SCENES.FLAME.vs, SCENES.FLAME.fs);
          const seeds = new Float32Array(SCENES.FLAME.points * 3);
          let s = 1234567;
          const rnd = () => {
            // Deterministic LCG — the splat looks the same every visit.
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
          };
          for (let i = 0; i < seeds.length; i++) seeds[i] = rnd();
          flameBuf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, flameBuf);
          gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
        } else if (SCENES.FRAG[id]) {
          prog = compile(gl, VS, SCENES.FRAG[id]);
        }
      } catch (err) {
        console.warn(String(err));
        prog = null;
      }
      sceneProgs[id] = prog || false;
      return prog;
    }

    function scenePalette(cfg, genome) {
      const key = [cfg.scenePalette, cfg.low, cfg.high, cfg.sceneHue, genome && genome.id].join("|");
      if (key !== palKey) {
        palKey = key;
        palStops = SCENES.paletteStops(globalThis.LuminaField.buildLut, cfg, genome);
      }
      return palStops;
    }

    function renderScene(id, cfg, w, h, dt) {
      const prog = sceneProgram(id);
      if (!prog) return false;
      sceneTime += dt * cfg.sceneSpeed;
      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFbo.fb);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      const genome = id === "flame" ? SCENES.genomeByName(cfg.sceneGenome) : null;
      const pal = scenePalette(cfg, genome);
      gl.uniform3fv(gl.getUniformLocation(prog, "uPal"), pal);
      u(prog, "uTime", sceneTime);
      u(prog, "uScale", cfg.sceneScale);
      u(prog, "uDrive", cfg.sceneDrive);
      u(prog, "uWarp", cfg.sceneWarp);
      u(prog, "uBeat", beatPulse);
      if (id === "flame") {
        if (!genome) return false; // no genomes loaded — nothing to draw
        const gu = SCENES.flameUniforms(genome);
        gl.uniform3fv(gl.getUniformLocation(prog, "uAff1"), gu.aff1);
        gl.uniform3fv(gl.getUniformLocation(prog, "uAff2"), gu.aff2);
        gl.uniform3fv(gl.getUniformLocation(prog, "uMeta"), gu.meta);
        gl.uniform2f(gl.getUniformLocation(prog, "uCenter"), gu.frame.cx, gu.frame.cy);
        gl.uniform1i(gl.getUniformLocation(prog, "uCount"), gu.count);
        u(prog, "uFrameScale", gu.frame.scale);
        u(prog, "uAspect", w / h);
        // Per-genome gain equalizes diffuse vs concentrated attractors — a
        // spread-out genome needs more gain to read at the same brightness.
        u(prog, "uGain", (0.05 + cfg.sceneDrive * 0.045) * (gu.frame.gain || 1));
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        const loc = gl.getAttribLocation(prog, "aSeed");
        gl.bindBuffer(gl.ARRAY_BUFFER, flameBuf);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.POINTS, 0, SCENES.FLAME.points);
        gl.disable(gl.BLEND);
      } else {
        gl.uniform2f(gl.getUniformLocation(prog, "uRes"), w, h);
        drawQuad(prog);
      }
      return true;
    }

    function makeTex(w, h) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      return tex;
    }

    function initGL() {
      if (gl || !ok) return;
      gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
      if (!gl) {
        ok = false;
        console.warn("Lumina FX: WebGL unavailable — rack bypassed");
        return;
      }
      try {
        progFeed = compile(gl, VS, FS_FEED);
        progPost = compile(gl, VS, FS_POST);
      } catch (err) {
        ok = false;
        gl = null;
        console.warn(String(err));
        return;
      }
      quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    }

    function size(w, h) {
      const key = w + "x" + h;
      if (key === sized) return;
      sized = key;
      canvas.width = w;
      canvas.height = h;
      src.width = w;
      src.height = h;
      texSrc = makeTex(w, h);
      fbos = [0, 1].map(() => {
        const tex = makeTex(w, h);
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        return { tex, fb };
      });
      {
        const tex = makeTex(w, h);
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        sceneFbo = { tex, fb };
      }
      if (!texBlack) {
        texBlack = makeTex(1, 1);
        gl.bindTexture(gl.TEXTURE_2D, texBlack);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
          new Uint8Array([0, 0, 0, 255]));
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function drawQuad(prog) {
      const loc = gl.getAttribLocation(prog, "aPos");
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function paintSource(dl, cfg, sceneOn) {
      const w = src.width, h = src.height;
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.globalCompositeOperation = "source-over";
      sctx.globalAlpha = 1;
      if (sceneOn) {
        // The scene is the background — tiles paint over transparency.
        sctx.clearRect(0, 0, w, h);
      } else {
        sctx.fillStyle = dl.bg;
        sctx.fillRect(0, 0, w, h);
      }
      let sx, sy, ox, oy;
      if (cfg.fill) {
        sx = w / dl.w;
        sy = h / dl.h;
        ox = 0;
        oy = 0;
      } else {
        sx = sy = Math.min(w / dl.w, h / dl.h);
        ox = (w - dl.w * sx) / 2;
        oy = (h - dl.h * sy) / 2;
      }
      const backdropAlpha = sceneOn ? Math.max(0, 1 - cfg.sceneMix) : 1;
      for (const item of dl.items) {
        if (item.kind === "backdrop" && backdropAlpha <= 0.003) continue;
        sctx.setTransform(sx, 0, 0, sy, ox + item.x * sx, oy + item.y * sy);
        if (item.rot) sctx.rotate((item.rot * Math.PI) / 180);
        sctx.globalAlpha = item.kind === "backdrop" ? item.alpha * backdropAlpha : item.alpha;
        sctx.globalCompositeOperation = item.blend;
        sctx.fillStyle = item.color;
        tracePath(sctx, item);
        sctx.fill(item.shape === "ring" ? "evenodd" : "nonzero");
        if (item.border > 0.3 && item.shape !== "ring") {
          sctx.strokeStyle = dl.borderColor || "#ffffff";
          sctx.lineWidth = item.border;
          sctx.stroke();
        }
      }
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.globalAlpha = 1;
      sctx.globalCompositeOperation = "source-over";
    }

    function u(prog, name, v) {
      gl.uniform1f(gl.getUniformLocation(prog, name), v);
    }

    function render(dl, t, dt) {
      const cfg = field.getConfig();
      beatPulse *= Math.exp(-dt * 7);
      initGL();
      if (!ok) return;

      const rect = frameEl.getBoundingClientRect();
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      let w = Math.max(2, Math.round(rect.width * dpr));
      let h = Math.max(2, Math.round(rect.height * dpr));
      const over = Math.max(w, h) / MAX_DIM;
      if (over > 1) {
        w = Math.round(w / over);
        h = Math.round(h / over);
      }
      size(w, h);

      // Pass 0: the scene backdrop (scenes.js), into its own framebuffer.
      const wantScene = SCENES && cfg.scene && cfg.scene !== "none";
      const sceneOn = wantScene ? renderScene(cfg.scene, cfg, w, h, dt) : false;

      paintSource(dl, cfg, sceneOn);
      // Whole-canvas blur; design px → screen px is rect/design (~7× at a
      // full-window frame), so CAP the result — past ~64px the frame is a
      // featureless blob no matter the intent (the 2026-07-28 whiteout bug).
      const blurPx = Math.min(64, dl.blur * (rect.width / dl.w));
      canvas.style.filter = dl.blur > 0 ? `blur(${blurPx.toFixed(1)}px)` : "none";

      gl.viewport(0, 0, w, h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texSrc);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);

      // Pass 1: compose scene + tiles, then feedback into the ping-pong target.
      const prev = fbos[flip], next = fbos[1 - flip];
      flip = 1 - flip;
      gl.bindFramebuffer(gl.FRAMEBUFFER, next.fb);
      gl.useProgram(progFeed);
      gl.uniform1i(gl.getUniformLocation(progFeed, "uSrc"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, prev.tex);
      gl.uniform1i(gl.getUniformLocation(progFeed, "uPrev"), 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, sceneOn ? sceneFbo.tex : texBlack);
      gl.uniform1i(gl.getUniformLocation(progFeed, "uScene"), 2);
      u(progFeed, "uTrails", cfg.fxTrails);
      u(progFeed, "uZoom", cfg.fxZoom);
      u(progFeed, "uZoomRot", cfg.fxZoomRot);
      u(progFeed, "uSceneMix", sceneOn ? cfg.sceneMix : 0);
      u(progFeed, "uTileAlpha", sceneOn ? cfg.sceneTiles : 1);
      u(progFeed, "uSceneTone", sceneOn && cfg.scene === "flame" ? 0.62 : 0);
      drawQuad(progFeed);

      // Pass 2: geometry + color to the screen.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(progPost);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, next.tex);
      gl.uniform1i(gl.getUniformLocation(progPost, "uTex"), 0);
      gl.uniform2f(gl.getUniformLocation(progPost, "uRes"), w, h);
      u(progPost, "uPixel", cfg.fxPixel);
      u(progPost, "uRgb", cfg.fxRgb);
      u(progPost, "uWarp", cfg.fxWarp);
      u(progPost, "uSlit", cfg.fxSlit);
      u(progPost, "uKaleido", cfg.fxKaleido > 0 ? 2 + Math.round(cfg.fxKaleido * 10) : 0);
      u(progPost, "uBloom", cfg.fxBloom);
      u(progPost, "uGrain", cfg.fxGrain);
      u(progPost, "uCrt", cfg.fxCrt);
      u(progPost, "uShutter", cfg.fxShutter);
      u(progPost, "uIris", cfg.fxIris);
      u(progPost, "uTime", t);
      u(progPost, "uBeat", beatPulse);
      drawQuad(progPost);
    }

    field.setFrameHook((dl, t, dt) => {
      if (!dl) {
        if (canvas.style.display !== "none") canvas.style.display = "none";
        return;
      }
      if (canvas.style.display === "none") canvas.style.display = "";
      render(dl, t, dt);
    });

    api.beat = () => { beatPulse = 1; };
    return api;
  }

  const api = { attach, beat: () => {}, SOURCES: { VS, FS_FEED, FS_POST } };
  globalThis.LuminaFX = api;
})();
