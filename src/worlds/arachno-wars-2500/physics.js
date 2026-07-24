// Arachno-Wars 2500 — movement physics (graybox b1)
//
// Pure logic module: no DOM, no canvas, no timers. Loaded as a plain script by
// index.html AND imported by the Node sim (tmp/arachno-wars-2500/movement-sim.mjs).
// Everything the tank does physically lives here so the sim exercises the real code.
//
// Coordinates: screen space, y grows DOWN. Gravity is +y.
// Terrain: solid simple polygons. The tank clings to polygon perimeters
// (any orientation), or is in ballistic flight, or is reeling on a web.

(function (g) {
  'use strict';

  const P = {};

  // ---------------------------------------------------------------- params

  P.defaults = function () {
    return {
      WALK_SPEED: 340,     // px/s along surface
      RIDE: 16,            // body-center height above surface
      GRAV: 1500,
      JUMP_V: 620,         // push off along surface normal
      JUMP_CARRY: 0.8,     // fraction of walk speed carried into a jump
      DETACH_POP: 170,     // normal pop when rocket fires off a surface
      ROCKET_ACCEL: 2300,
      FUEL_BURN_TIME: 1.6, // seconds of continuous burn on a full tank
      FUEL_REGEN: 0.9,     // fuel/s while attached
      AIR_CTRL: 700,       // px/s^2 horizontal air control
      AIR_DRAG: 0.6,       // /s on vx
      MAX_FALL: 1700,
      WEB_RANGE: 720,
      WEB_REEL: 980,
      WEB_DONE: 26,        // arrive distance at anchor
      WEB_RELEASE_KEEP: 0.5 // fraction of reel speed kept on release
    };
  };

  // ---------------------------------------------------------------- vectors

  function hyp(x, y) { return Math.sqrt(x * x + y * y); }

  // ---------------------------------------------------------------- terrain

  function pointInPoly(pts, x, y) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }
  P.pointInPoly = pointInPoly;

  // polysPoints: array of [[x,y],...] simple polygons (any winding).
  P.buildTerrain = function (polysPoints) {
    const polys = polysPoints.map(function (raw, pi) {
      // drop consecutive duplicate points (incl. wrap-around)
      const pts = [];
      for (let i = 0; i < raw.length; i++) {
        const prev = pts.length ? pts[pts.length - 1] : null;
        if (!prev || Math.abs(prev[0] - raw[i][0]) > 1e-6 || Math.abs(prev[1] - raw[i][1]) > 1e-6) {
          pts.push([raw[i][0], raw[i][1]]);
        }
      }
      while (pts.length > 1) {
        const a = pts[0], b = pts[pts.length - 1];
        if (Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) pts.pop();
        else break;
      }

      const edges = [];
      let total = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const len = hyp(dx, dy);
        if (len < 1e-6) continue;
        const tx = dx / len, ty = dy / len;
        // outward normal: whichever perpendicular leaves the polygon
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        let nx = ty, ny = -tx;
        if (pointInPoly(pts, mx + nx * 1.5, my + ny * 1.5)) { nx = -nx; ny = -ny; }
        edges.push({
          ax: a[0], ay: a[1], bx: b[0], by: b[1],
          len: len, tx: tx, ty: ty, nx: nx, ny: ny, cum: total
        });
        total += len;
      }
      // bbox for cheap culling
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of pts) {
        if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
      }
      return { pi: pi, pts: pts, edges: edges, total: total,
               minX: minX, minY: minY, maxX: maxX, maxY: maxY };
    });
    return { polys: polys };
  };

  // attachment: { pi, ei, t }  (t in [0,1] along edge ei of poly pi)

  P.surfaceInfo = function (terr, att) {
    const e = terr.polys[att.pi].edges[att.ei];
    return {
      x: e.ax + (e.bx - e.ax) * att.t,
      y: e.ay + (e.by - e.ay) * att.t,
      tx: e.tx, ty: e.ty, nx: e.nx, ny: e.ny
    };
  };

  // advance ds (signed px) along the perimeter, crossing corners freely
  P.walk = function (terr, att, ds) {
    let pi = att.pi, ei = att.ei, t = att.t;
    const edges = terr.polys[pi].edges;
    let guard = 256;
    while (guard-- > 0 && ds !== 0) {
      const e = edges[ei];
      if (ds > 0) {
        const rem = (1 - t) * e.len;
        if (ds <= rem) { t += ds / e.len; ds = 0; }
        else { ds -= rem; ei = (ei + 1) % edges.length; t = 0; }
      } else {
        const rem = t * e.len;
        if (-ds <= rem) { t += ds / e.len; ds = 0; }
        else { ds += rem; ei = (ei - 1 + edges.length) % edges.length; t = 1; }
      }
    }
    return { pi: pi, ei: ei, t: t };
  };

  // nearest point on any perimeter within maxD, or null
  P.closestOnTerrain = function (terr, x, y, maxD) {
    let best = null, bestD2 = maxD * maxD;
    for (const poly of terr.polys) {
      if (x < poly.minX - maxD || x > poly.maxX + maxD ||
          y < poly.minY - maxD || y > poly.maxY + maxD) continue;
      for (let ei = 0; ei < poly.edges.length; ei++) {
        const e = poly.edges[ei];
        const abx = e.bx - e.ax, aby = e.by - e.ay;
        let u = ((x - e.ax) * abx + (y - e.ay) * aby) / (e.len * e.len);
        u = u < 0 ? 0 : u > 1 ? 1 : u;
        const px = e.ax + abx * u, py = e.ay + aby * u;
        const dx = x - px, dy = y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = { d: Math.sqrt(d2), pi: poly.pi, ei: ei, t: u,
                   x: px, y: py, nx: e.nx, ny: e.ny };
        }
      }
    }
    return best;
  };

  // first surface hit moving p -> q, only edges we move INTO. null if none.
  P.sweep = function (terr, px, py, qx, qy) {
    const rx = qx - px, ry = qy - py;
    if (Math.abs(rx) < 1e-9 && Math.abs(ry) < 1e-9) return null;
    const loX = Math.min(px, qx), hiX = Math.max(px, qx);
    const loY = Math.min(py, qy), hiY = Math.max(py, qy);
    let best = null, bestS = Infinity;
    for (const poly of terr.polys) {
      if (hiX < poly.minX || loX > poly.maxX || hiY < poly.minY || loY > poly.maxY) continue;
      for (let ei = 0; ei < poly.edges.length; ei++) {
        const e = poly.edges[ei];
        if (rx * e.nx + ry * e.ny >= 0) continue; // not moving into this face
        const sx = e.bx - e.ax, sy = e.by - e.ay;
        const denom = rx * sy - ry * sx;
        if (Math.abs(denom) < 1e-9) continue;
        const wx = e.ax - px, wy = e.ay - py;
        const s = (wx * sy - wy * sx) / denom;   // along movement
        const u = (wx * ry - wy * rx) / denom;   // along edge
        if (s >= 1e-6 && s <= 1 && u >= -1e-6 && u <= 1 + 1e-6 && s < bestS) {
          bestS = s;
          const uc = u < 0 ? 0 : u > 1 ? 1 : u;
          best = { s: s, pi: poly.pi, ei: ei, t: uc,
                   x: px + rx * s, y: py + ry * s, nx: e.nx, ny: e.ny };
        }
      }
    }
    return best;
  };

  // first surface hit from (x,y) along unit dir within maxDist, entering faces only
  P.raycast = function (terr, x, y, dx, dy, maxDist) {
    const hit = P.sweep(terr, x, y, x + dx * maxDist, y + dy * maxDist);
    if (!hit) return null;
    hit.dist = hit.s * maxDist;
    return hit;
  };

  // ---------------------------------------------------------------- tank

  P.makeTank = function (level) {
    return {
      mode: 'flight',            // 'attached' | 'flight' | 'web'
      att: null,
      x: level.spawn.x, y: level.spawn.y,
      vx: 0, vy: 0,
      facing: 1,
      fuel: 1,
      burning: false,
      web: null,                 // { ax, ay, att }
      speedAlong: 0,
      safe: { x: level.spawn.x, y: level.spawn.y },
      deaths: 0,
      goal: false,
      justLanded: false,
      justDied: false,
      time: 0
    };
  };

  function attachAt(tank, terr, hit, C) {
    tank.att = { pi: hit.pi, ei: hit.ei, t: hit.t };
    tank.mode = 'attached';
    tank.x = hit.x + hit.nx * C.RIDE;
    tank.y = hit.y + hit.ny * C.RIDE;
    tank.vx = 0; tank.vy = 0;
    tank.web = null;
    tank.justLanded = true;
  }

  function tryWeb(tank, terr, dirx, diry, C) {
    let dx = dirx, dy = diry;
    const l = hyp(dx, dy);
    if (l < 0.01) { dx = 0; dy = -1; } else { dx /= l; dy /= l; }
    const hit = P.raycast(terr, tank.x, tank.y, dx, dy, C.WEB_RANGE);
    if (!hit) return false;
    tank.web = { ax: hit.x, ay: hit.y, att: { pi: hit.pi, ei: hit.ei, t: hit.t },
                 nx: hit.nx, ny: hit.ny };
    tank.mode = 'web';
    tank.att = null;
    return true;
  }

  // input: { mx, my (-1..1 desired dir, my<0 is up), jump, rocket, web }
  // jump/web are edge-triggered (true only on the press frame); rocket is held.
  P.stepTank = function (terr, level, tank, input, dt, C) {
    tank.time += dt;
    tank.justLanded = false;
    tank.justDied = false;
    tank.burning = false;

    let dx = input.mx || 0, dy = input.my || 0;
    const il = hyp(dx, dy);
    if (il > 1e-6) { dx /= il; dy /= il; }

    if (tank.mode === 'attached') {
      const s = P.surfaceInfo(terr, tank.att);
      let v = 0;
      if (il > 1e-6) v = C.WALK_SPEED * (dx * s.tx + dy * s.ty);
      tank.speedAlong = v;
      tank.att = P.walk(terr, tank.att, v * dt);
      const s2 = P.surfaceInfo(terr, tank.att);
      const px = tank.x;
      tank.x = s2.x + s2.nx * C.RIDE;
      tank.y = s2.y + s2.ny * C.RIDE;
      if (Math.abs(tank.x - px) > 0.5 * dt * C.WALK_SPEED * 0.2) {
        tank.facing = tank.x > px ? 1 : -1;
      }
      tank.vx = v * s2.tx; tank.vy = v * s2.ty;
      tank.fuel = Math.min(1, tank.fuel + C.FUEL_REGEN * dt);
      if (s2.ny < -0.5) { tank.safe.x = tank.x; tank.safe.y = tank.y; }

      if (input.web && tryWeb(tank, terr, dx, dy, C)) {
        // gone webbing
      } else if (input.jump) {
        tank.mode = 'flight';
        tank.att = null;
        tank.vx = s2.nx * C.JUMP_V + v * s2.tx * C.JUMP_CARRY;
        tank.vy = s2.ny * C.JUMP_V + v * s2.ty * C.JUMP_CARRY;
      } else if (input.rocket && tank.fuel > 0.05) {
        tank.mode = 'flight';
        tank.att = null;
        tank.vx = s2.nx * C.DETACH_POP + v * s2.tx * 0.6;
        tank.vy = s2.ny * C.DETACH_POP + v * s2.ty * 0.6;
      }

    } else if (tank.mode === 'web') {
      const w = tank.web;
      let ax = w.ax - tank.x, ay = w.ay - tank.y;
      const dist = hyp(ax, ay);
      if (input.web || input.jump) {
        // release
        tank.mode = 'flight';
        if (dist > 1e-6) {
          tank.vx = (ax / dist) * C.WEB_REEL * C.WEB_RELEASE_KEEP;
          tank.vy = (ay / dist) * C.WEB_REEL * C.WEB_RELEASE_KEEP;
        }
        tank.web = null;
      } else if (dist <= C.WEB_DONE) {
        attachAt(tank, terr, { pi: w.att.pi, ei: w.att.ei, t: w.att.t,
                               x: w.ax, y: w.ay, nx: w.nx, ny: w.ny }, C);
      } else {
        const step = Math.min(C.WEB_REEL * dt, dist);
        const nxp = tank.x + (ax / dist) * step;
        const nyp = tank.y + (ay / dist) * step;
        const hit = P.sweep(terr, tank.x, tank.y, nxp, nyp);
        if (hit) attachAt(tank, terr, hit, C);
        else { tank.x = nxp; tank.y = nyp; }
      }

    } else { // flight
      let axl = dx * C.AIR_CTRL, ayl = C.GRAV;
      if (input.rocket && tank.fuel > 0) {
        let rx = dx, ry = dy;
        if (il < 1e-6) { rx = 0; ry = -1; }
        axl += rx * C.ROCKET_ACCEL;
        ayl += ry * C.ROCKET_ACCEL;
        tank.fuel = Math.max(0, tank.fuel - dt / C.FUEL_BURN_TIME);
        tank.burning = true;
      }
      tank.vx += axl * dt;
      tank.vx *= Math.max(0, 1 - C.AIR_DRAG * dt);
      tank.vy = Math.min(tank.vy + ayl * dt, C.MAX_FALL);
      if (Math.abs(tank.vx) > 30) tank.facing = tank.vx > 0 ? 1 : -1;

      const nxp = tank.x + tank.vx * dt;
      const nyp = tank.y + tank.vy * dt;

      if (input.web && tryWeb(tank, terr, dx, dy, C)) {
        // web caught mid-air
      } else {
        const hit = P.sweep(terr, tank.x, tank.y, nxp, nyp);
        if (hit) attachAt(tank, terr, hit, C);
        else { tank.x = nxp; tank.y = nyp; }
      }

      if (tank.y > level.killY) {
        tank.deaths += 1;
        tank.justDied = true;
        tank.x = tank.safe.x; tank.y = tank.safe.y;
        tank.vx = 0; tank.vy = 0;
        tank.fuel = 1;
        tank.web = null;
        tank.mode = 'flight';
      }
    }

    if (!tank.goal && tank.mode === 'attached' && tank.x >= level.goalX) {
      tank.goal = true;
    }
    return tank;
  };

  g.AW25_PHYS = P;
})(typeof globalThis !== 'undefined' ? globalThis : this);
