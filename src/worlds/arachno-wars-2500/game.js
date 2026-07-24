// Arachno-Wars 2500 — graybox b1
// Rendering, input, legs, camera. All movement physics lives in physics.js
// (shared with tmp/arachno-wars-2500/movement-sim.mjs — keep it pure).

(function () {
  'use strict';

  const BUILD = 'AW2500 GRAYBOX b1 · 2026-07-24';

  const P = globalThis.AW25_PHYS;
  const LEVEL = globalThis.AW25_LEVEL;
  const C = P.defaults();
  const terr = P.buildTerrain(LEVEL.polys);

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  function fit() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener('resize', fit);
  fit();

  // ------------------------------------------------------------- input

  const held = { mxNeg: false, mxPos: false, myNeg: false, myPos: false, rocket: false };
  const pending = { jump: false, web: false, reset: false };
  let debug = false;

  const KEYMAP = {
    KeyA: 'mxNeg', ArrowLeft: 'mxNeg',
    KeyD: 'mxPos', ArrowRight: 'mxPos',
    KeyW: 'myNeg', ArrowUp: 'myNeg',
    KeyS: 'myPos', ArrowDown: 'myPos',
    ShiftLeft: 'rocket', ShiftRight: 'rocket'
  };
  window.addEventListener('keydown', function (e) {
    if (e.repeat) { if (e.code === 'Space') e.preventDefault(); return; }
    if (KEYMAP[e.code]) { held[KEYMAP[e.code]] = true; e.preventDefault(); }
    else if (e.code === 'Space') { pending.jump = true; e.preventDefault(); }
    else if (e.code === 'KeyE') { pending.web = true; }
    else if (e.code === 'KeyR') { pending.reset = true; }
    else if (e.code === 'Backquote') { debug = !debug; }
  });
  window.addEventListener('keyup', function (e) {
    if (KEYMAP[e.code]) held[KEYMAP[e.code]] = false;
  });
  window.addEventListener('blur', function () {
    for (const k in held) held[k] = false;
  });

  // ------------------------------------------------------------- state

  let tank = P.makeTank(LEVEL);
  let upX = 0, upY = -1;          // smoothed body up vector
  let landDip = 0;                // body squash on landing
  let goalShownAt = -1;

  // legs: 4, body-frame hip x offsets
  const LEG_DEFS = [
    { hx: -30, splayX: -48, splayY: 16 },
    { hx: -13, splayX: -22, splayY: 26 },
    { hx: 13, splayX: 22, splayY: 26 },
    { hx: 30, splayX: 48, splayY: 16 }
  ];
  const L1 = 27, L2 = 38;         // leg segment lengths
  const legs = LEG_DEFS.map(function (d) {
    return {
      def: d,
      fx: tank.x + d.splayX, fy: tank.y + 30,   // current foot
      sx: 0, sy: 0, tx2: 0, ty2: 0,             // step from/to
      stepT: 1,                                  // 1 = planted
      catchAt: -1                                // forced re-step time
    };
  });

  const particles = [];           // rocket plume, capped
  const MAX_PARTICLES = 150;

  // camera
  const cam = { cx: LEVEL.spawn.x, cy: LEVEL.spawn.y, scale: 1 };

  // ------------------------------------------------------------- physics loop

  const STEP = 1 / 120;
  let acc = 0, last = performance.now();
  let landedThisFrame = false;

  function currentInput(useEdges) {
    return {
      mx: (held.mxPos ? 1 : 0) - (held.mxNeg ? 1 : 0),
      my: (held.myPos ? 1 : 0) - (held.myNeg ? 1 : 0),
      rocket: held.rocket,
      jump: useEdges && pending.jump,
      web: useEdges && pending.web
    };
  }

  function physicsFrame(dt) {
    if (pending.reset) {
      tank = P.makeTank(LEVEL);
      goalShownAt = -1;
      pending.reset = false;
    }
    acc = Math.min(acc + dt, 8 * STEP);
    let first = true;
    while (acc >= STEP) {
      P.stepTank(terr, LEVEL, tank, currentInput(first), STEP, C);
      if (first) { pending.jump = false; pending.web = false; first = false; }
      if (tank.justLanded) landedThisFrame = true;
      acc -= STEP;
    }
  }

  // ------------------------------------------------------------- body & legs

  function angLerp(a, b, k) {
    let d = b - a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return a + d * k;
  }

  function updateBody(dt) {
    let tuX = 0, tuY = -1;
    if (tank.mode === 'attached') {
      const s = P.surfaceInfo(terr, tank.att);
      tuX = s.nx; tuY = s.ny;
    } else {
      tuX = -tank.vx * 0.00035; tuY = -1; // slight velocity tilt in flight
      const l = Math.hypot(tuX, tuY); tuX /= l; tuY /= l;
    }
    const a = angLerp(Math.atan2(upY, upX), Math.atan2(tuY, tuX),
                      Math.min(1, 11 * dt));
    upX = Math.cos(a); upY = Math.sin(a);

    if (landedThisFrame) {
      landDip = 1;
      const now = tank.time;
      legs.forEach(function (leg, i) { leg.catchAt = now + i * 0.035; });
      landedThisFrame = false;
    }
    landDip = Math.max(0, landDip - 5 * dt);
  }

  function legFrame() {
    // body axes: up = (upX,upY); right = perpendicular
    return { rx: -upY, ry: upX, ux: upX, uy: upY };
  }

  function updateLegs(dt) {
    const F = legFrame();
    const anyStepping = legs.filter(function (l) { return l.stepT < 1; }).length;

    legs.forEach(function (leg, i) {
      const d = leg.def;
      const hipX = tank.x + F.rx * d.hx + F.ux * -2;
      const hipY = tank.y + F.ry * d.hx + F.uy * -2;

      if (tank.mode === 'attached') {
        const lead = Math.max(-30, Math.min(30, tank.speedAlong * 0.1));
        const s = P.surfaceInfo(terr, tank.att);
        const probeX = hipX - F.ux * (C.RIDE + 30) + s.tx * lead;
        const probeY = hipY - F.uy * (C.RIDE + 30) + s.ty * lead;
        const target = P.closestOnTerrain(terr, probeX, probeY, 84);

        if (target) {
          const dist = Math.hypot(leg.fx - target.x, leg.fy - target.y);
          const forced = leg.catchAt >= 0 && tank.time >= leg.catchAt;
          const canStep = leg.stepT >= 1 &&
            (forced || dist > 70 || (dist > 30 && anyStepping < 2));
          if (canStep && (dist > 8 || forced)) {
            leg.sx = leg.fx; leg.sy = leg.fy;
            leg.tx2 = target.x; leg.ty2 = target.y;
            leg.stepT = 0;
            leg.catchAt = -1;
          }
        }
        if (leg.stepT < 1) {
          leg.stepT = Math.min(1, leg.stepT + dt / 0.1);
          // whip profile: slow reach for 62% of the step, then SNAP
          const p = leg.stepT;
          const reach = p < 0.62
            ? 0.26 * (p / 0.62)
            : 0.26 + 0.74 * Math.pow((p - 0.62) / 0.38, 3);
          const lift = Math.sin(p * Math.PI) * 13;
          leg.fx = leg.sx + (leg.tx2 - leg.sx) * reach + F.ux * lift;
          leg.fy = leg.sy + (leg.ty2 - leg.sy) * reach + F.uy * lift;
        }
      } else {
        // flight / web: splay in body frame, quick lerp
        const tx = tank.x + F.rx * d.splayX + F.ux * -d.splayY;
        const ty = tank.y + F.ry * d.splayX + F.uy * -d.splayY;
        const k = Math.min(1, 14 * dt);
        leg.fx += (tx - leg.fx) * k;
        leg.fy += (ty - leg.fy) * k;
        leg.stepT = 1;
      }
    });
  }

  function solveKnee(hx, hy, fx, fy) {
    let dx = fx - hx, dy = fy - hy;
    let d = Math.hypot(dx, dy);
    const maxD = L1 + L2 - 0.5;
    if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; fx = hx + dx; fy = hy + dy; }
    if (d < 1e-4) { d = 1e-4; dx = d; dy = 0; }
    const a = Math.atan2(dy, dx);
    const cosA = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
    const off = Math.acos(cosA);
    // two candidates; knees arch AWAY from the surface (toward body up)
    const k1x = hx + L1 * Math.cos(a + off), k1y = hy + L1 * Math.sin(a + off);
    const k2x = hx + L1 * Math.cos(a - off), k2y = hy + L1 * Math.sin(a - off);
    const s1 = (k1x - hx) * upX + (k1y - hy) * upY;
    const s2 = (k2x - hx) * upX + (k2y - hy) * upY;
    return s1 > s2 ? { kx: k1x, ky: k1y, fx: fx, fy: fy }
                   : { kx: k2x, ky: k2y, fx: fx, fy: fy };
  }

  // ------------------------------------------------------------- particles

  let pSeed = 12345;
  function pRnd() { pSeed = (pSeed * 1664525 + 1013904223) >>> 0; return pSeed / 4294967296; }

  function updateParticles(dt) {
    if (tank.burning) {
      for (let i = 0; i < 3; i++) {
        if (particles.length >= MAX_PARTICLES) particles.shift();
        particles.push({
          x: tank.x + (pRnd() - 0.5) * 10 - upX * 8,
          y: tank.y + (pRnd() - 0.5) * 10 - upY * 8,
          vx: -upX * (180 + pRnd() * 120) + (pRnd() - 0.5) * 90 - tank.vx * 0.2,
          vy: -upY * (180 + pRnd() * 120) + (pRnd() - 0.5) * 90 - tank.vy * 0.2,
          ttl: 0.3 + pRnd() * 0.15, age: 0
        });
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.ttl) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  // ------------------------------------------------------------- camera

  function updateCamera(dt) {
    cam.scale = Math.max(0.45, Math.min(1.4, canvas.height / 1000));
    const viewW = canvas.width / cam.scale, viewH = canvas.height / cam.scale;

    // dead-zone follow, no rotation ever
    let txc = cam.cx, tyc = cam.cy;
    const dzx = 90, dzy = 70;
    if (tank.x - cam.cx > dzx) txc = tank.x - dzx;
    if (tank.x - cam.cx < -dzx) txc = tank.x + dzx;
    if (tank.y - cam.cy > dzy) tyc = tank.y - dzy;
    if (tank.y - cam.cy < -dzy) tyc = tank.y + dzy;

    const k = 1 - Math.exp(-5 * dt);
    cam.cx += (txc - cam.cx) * k;
    cam.cy += (tyc - cam.cy) * k;

    // clamps
    if (viewW < LEVEL.worldW) {
      cam.cx = Math.max(viewW / 2, Math.min(LEVEL.worldW - viewW / 2, cam.cx));
    } else cam.cx = LEVEL.worldW / 2;
    const vr = LEVEL.viewBottom - LEVEL.viewTop;
    if (viewH < vr) {
      cam.cy = Math.max(LEVEL.viewTop + viewH / 2,
               Math.min(LEVEL.viewBottom - viewH / 2, cam.cy));
    } else cam.cy = LEVEL.viewTop + vr / 2;
  }

  // ------------------------------------------------------------- render

  function render() {
    const w = canvas.width, h = canvas.height;

    // sky
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0c11');
    grad.addColorStop(0.6, '#111520');
    grad.addColorStop(1, '#151a26');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // world transform
    ctx.setTransform(cam.scale, 0, 0, cam.scale,
      w / 2 - cam.cx * cam.scale, h / 2 - cam.cy * cam.scale);

    const viewW = w / cam.scale, viewH = h / cam.scale;
    const x0 = cam.cx - viewW / 2, x1 = cam.cx + viewW / 2;
    const y0 = cam.cy - viewH / 2, y1 = cam.cy + viewH / 2;

    // faint grid
    ctx.strokeStyle = 'rgba(140,160,190,0.05)';
    ctx.lineWidth = 1 / cam.scale;
    ctx.beginPath();
    for (let gx = Math.floor(x0 / 250) * 250; gx <= x1; gx += 250) {
      ctx.moveTo(gx, y0); ctx.lineTo(gx, y1);
    }
    for (let gy = Math.floor(y0 / 250) * 250; gy <= y1; gy += 250) {
      ctx.moveTo(x0, gy); ctx.lineTo(x1, gy);
    }
    ctx.stroke();

    // terrain
    for (const poly of terr.polys) {
      if (poly.maxX < x0 || poly.minX > x1 || poly.maxY < y0 || poly.minY > y1) continue;
      ctx.beginPath();
      ctx.moveTo(poly.pts[0][0], poly.pts[0][1]);
      for (let i = 1; i < poly.pts.length; i++) ctx.lineTo(poly.pts[i][0], poly.pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = '#232833';
      ctx.fill();
      ctx.strokeStyle = '#3d4656';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // goal pad stripes
    ctx.save();
    ctx.beginPath();
    ctx.rect(LEVEL.goalX, 688, LEVEL.worldW - LEVEL.goalX, 12);
    ctx.clip();
    for (let sx = LEVEL.goalX - 24; sx < LEVEL.worldW; sx += 24) {
      ctx.fillStyle = ((sx / 24) | 0) % 2 ? '#e09c1a' : '#1c202a';
      ctx.beginPath();
      ctx.moveTo(sx, 700); ctx.lineTo(sx + 12, 688);
      ctx.lineTo(sx + 24, 688); ctx.lineTo(sx + 12, 700);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // signs
    ctx.fillStyle = '#5b6577';
    ctx.font = '15px monospace';
    ctx.textAlign = 'center';
    for (const s of LEVEL.signs) {
      if (s.x < x0 - 300 || s.x > x1 + 300) continue;
      ctx.fillText(s.t, s.x, s.y);
    }

    // debug overlay: edges + normals
    if (debug) {
      ctx.lineWidth = 1.5 / cam.scale;
      for (const poly of terr.polys) {
        for (const e of poly.edges) {
          const mx = (e.ax + e.bx) / 2, my = (e.ay + e.by) / 2;
          ctx.strokeStyle = 'rgba(80,255,140,0.8)';
          ctx.beginPath(); ctx.moveTo(e.ax, e.ay); ctx.lineTo(e.bx, e.by); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,120,80,0.7)';
          ctx.beginPath(); ctx.moveTo(mx, my);
          ctx.lineTo(mx + e.nx * 16, my + e.ny * 16); ctx.stroke();
        }
      }
    }

    // rocket plume
    for (const p of particles) {
      const f = 1 - p.age / p.ttl;
      ctx.fillStyle = 'rgba(255,' + ((120 + 100 * f) | 0) + ',30,' + (0.5 * f).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 + 4 * f, 0, Math.PI * 2);
      ctx.fill();
    }

    // web silk
    if (tank.mode === 'web' && tank.web) {
      ctx.strokeStyle = 'rgba(230,238,250,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tank.x, tank.y);
      ctx.lineTo(tank.web.ax, tank.web.ay);
      ctx.stroke();
      ctx.fillStyle = 'rgba(230,238,250,0.9)';
      ctx.beginPath();
      ctx.arc(tank.web.ax, tank.web.ay, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    drawTank();
    drawHud(w, h);
  }

  function drawTank() {
    const F = legFrame();

    // legs (world space)
    for (const leg of legs) {
      const d = leg.def;
      const hipX = tank.x + F.rx * d.hx + F.ux * -2;
      const hipY = tank.y + F.ry * d.hx + F.uy * -2;
      const k = solveKnee(hipX, hipY, leg.fx, leg.fy);
      ctx.strokeStyle = '#0d0f15';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(k.kx, k.ky);
      ctx.stroke();
      // lower segment thins to a needle
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(k.kx, k.ky);
      ctx.lineTo(k.fx, k.fy);
      ctx.stroke();
      ctx.fillStyle = '#39404f';
      ctx.beginPath();
      ctx.arc(k.fx, k.fy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // body (local frame)
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(Math.atan2(upY, upX) + Math.PI / 2);
    const squash = 1 - landDip * 0.22;

    // underglow
    ctx.fillStyle = 'rgba(255,140,0,0.16)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 21, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // hull — low, wide
    ctx.fillStyle = '#14161d';
    ctx.strokeStyle = '#2b3140';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -1, 28, 9.5 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // ball turret + barrel
    ctx.beginPath();
    ctx.arc(0, -11 * squash, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#191d27';
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(0, -11 * squash);
    ctx.rotate(tank.facing > 0 ? -0.35 : Math.PI + 0.35);
    ctx.strokeStyle = '#2b3140';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(34, 0); ctx.stroke();
    ctx.fillStyle = '#39404f';
    ctx.beginPath(); ctx.arc(34, 0, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // eye cluster
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.arc(tank.facing * 16, -4, 1.8, 0, Math.PI * 2);
    ctx.arc(tank.facing * 21, -2.5, 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawHud(w, h) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = 'left';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#5b6577';
    ctx.fillText(BUILD, 12, h - 14);

    // fuel bar
    ctx.fillStyle = '#5b6577';
    ctx.fillText('ROCKET', 12, h - 52);
    ctx.fillStyle = '#1c212c';
    ctx.fillRect(12, h - 44, 140, 9);
    ctx.fillStyle = tank.fuel > 0.25 ? '#ff8c00' : '#d33c2a';
    ctx.fillRect(12, h - 44, 140 * tank.fuel, 9);

    // clock + deaths
    ctx.textAlign = 'right';
    const t = tank.time | 0;
    const mm = String((t / 60) | 0).padStart(2, '0');
    const ss = String(t % 60).padStart(2, '0');
    ctx.fillStyle = '#5b6577';
    ctx.fillText(mm + ':' + ss + '  ·  falls ' + tank.deaths, w - 14, 24);

    if (debug) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#50ff8c';
      ctx.fillText('mode=' + tank.mode +
        '  x=' + tank.x.toFixed(0) + ' y=' + tank.y.toFixed(0) +
        '  v=' + tank.vx.toFixed(0) + ',' + tank.vy.toFixed(0) +
        '  fuel=' + tank.fuel.toFixed(2), 12, 24);
    }

    // goal banner
    if (tank.goal) {
      if (goalShownAt < 0) goalShownAt = tank.time;
      const age = tank.time - goalShownAt;
      const a = age < 5 ? 1 : Math.max(0.25, 1 - (age - 5) * 0.5);
      ctx.textAlign = 'center';
      ctx.font = '700 34px monospace';
      ctx.fillStyle = 'rgba(224,156,26,' + a.toFixed(2) + ')';
      ctx.fillText('GRAYBOX CLEARED', w / 2, h * 0.3);
      ctx.font = '14px monospace';
      ctx.fillStyle = 'rgba(139,148,164,' + a.toFixed(2) + ')';
      ctx.fillText(mm + ':' + ss + ' · ' + tank.deaths +
        ' falls · keep roaming or R to run it again', w / 2, h * 0.3 + 28);
    }
  }

  // ------------------------------------------------------------- main loop

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    physicsFrame(dt);
    updateBody(dt);
    updateLegs(dt);
    updateParticles(dt);
    updateCamera(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
