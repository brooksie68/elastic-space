// Moon Battle 2100 — the structures on the ground.
//
// Pure line drawings: every kind is a list of segments [x0, y0, x1, y1] in
// feet, origin at the centre of the footprint on the ground, y up. Both
// renderers (the lander's and the tank's) draw from this file so the two halves
// of the game show the same buildings. No three.js, no DOM, no Math.random.
//
// Classes (the target system, world CLAUDE.md "Round one design"):
//   civ   — civilian. Lots of them. Never targetable.
//   open  — hostile in the open. Targetable from anywhere. 1X–2X.
//   hard  — hostile hardened: `hard` says the trick (overhang / ridge / door /
//           shield). 3X–5X.
// `w` / `h` are the solid footprint the ship can crash into (the core uses
// them). Drawings may spill a little past `w` (an antenna, a rover) — the box
// is the body, not the whiskers.
//
// Side-effect global (`globalThis.LunarStructures`) like game-core.js, so the
// same file runs in the browser, in Node sims, and in the tank's pages.
(function () {
  'use strict';

  const K = [];
  const BY_ID = {};

  // ---- little drawing helpers -------------------------------------------------
  function seg(out, x0, y0, x1, y1) { out.push([+x0.toFixed(2), +y0.toFixed(2), +x1.toFixed(2), +y1.toFixed(2)]); }
  function poly(out, pts, closed) {
    for (let i = 1; i < pts.length; i++) seg(out, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    if (closed) seg(out, pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1]);
  }
  function box(out, x0, y0, x1, y1) { poly(out, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true); }
  // an arc from a0 to a1 (radians) around (cx, cy), n pieces
  function arc(out, cx, cy, r, a0, a1, n, ry) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * (ry === undefined ? r : ry)]); }
    poly(out, pts, false);
  }
  // a lattice tower: two tapering legs with cross braces
  function lattice(out, wBase, wTop, h, bays) {
    for (let i = 0; i < bays; i++) {
      const t0 = i / bays, t1 = (i + 1) / bays;
      const w0 = wBase + (wTop - wBase) * t0, w1 = wBase + (wTop - wBase) * t1;
      const y0 = h * t0, y1 = h * t1;
      seg(out, -w0 / 2, y0, -w1 / 2, y1); seg(out, w0 / 2, y0, w1 / 2, y1);
      seg(out, -w1 / 2, y1, w1 / 2, y1);
      if (i % 2 === 0) seg(out, -w0 / 2, y0, w1 / 2, y1); else seg(out, w0 / 2, y0, -w1 / 2, y1);
    }
  }
  function dish(out, cx, cy, r, tilt) {
    // a parabola opening up-and-left, drawn as an arc, with a feed strut
    const pts = [];
    for (let i = 0; i <= 8; i++) { const u = -1 + 2 * i / 8; pts.push([cx + u * r, cy + u * u * r * 0.55]); }
    const rot = tilt || 0, c = Math.cos(rot), s = Math.sin(rot);
    const R = pts.map((p) => [cx + (p[0] - cx) * c - (p[1] - cy) * s, cy + (p[0] - cx) * s + (p[1] - cy) * c]);
    poly(out, R, false);
    const f = [cx - s * r * 0.6, cy + c * r * 0.6];
    seg(out, cx, cy, f[0], f[1]);
  }

  // THE TAGS (2026-09-12): a short word for the maps and the sitrep boxes — the lander's strip, the
  // tank's minimap and the M map all label hostiles with these, so a glance names the kind.
  const TAGS = { sam: 'SAM', gunpit: 'GUN', radar: 'RADAR', jammer: 'JAM', datacentre: 'DATA', depot: 'DEPOT', bunker: 'BUNKER', core: 'CORE', base: 'BASE',
    laserturret: 'LASER', pelletgun: 'PELLET', tower: 'TOWER', hangar: 'HANGAR' };
  function def(o) {
    const segs = [];
    o.draw(segs);
    const kind = { id: o.id, name: o.name, cls: o.cls, w: o.w, h: o.h, d: o.d || Math.min(o.w, 40), mult: o.mult || 0, hard: o.hard || null, segs: segs, segs3: null, tag: TAGS[o.id] || null };
    if (o.dynDraw) {
      // THE MOVING PART (2026-09-12): a barrel or tube drawn pointing +x around (0, 0); the lander's
      // renderer turns it to the structure's `aim` about `pivot`; at `rest` it points where the
      // drawing meant it to. The tank's solid() bakes it in at rest.
      const dyn = [];
      o.dynDraw(dyn);
      kind.dyn = dyn; kind.pivot = o.pivot || [0, 0]; kind.rest = o.rest === undefined ? 0 : o.rest;
    }
    K.push(kind); BY_ID[o.id] = kind;
  }

  // THE SOLID (2026-09-06, James: "use the same wire model and build it into
  // a 3-D shape"): the flat drawing is the PROFILE; the solid is that profile
  // extruded through the kind's depth `d` (feet, z toward the camera in the
  // lander's frame, centred on z = 0) — a front face at +d/2, a back face at
  // -d/2, and a depth edge at every corner the profile touches. One model,
  // both games: the lander's side view draws it foreshortened, the tank's
  // first person walks around it. Segments are [x0,y0,z0,x1,y1,z1], cached.
  // ---- 3-D helpers for the round kinds (the tank session's ask: a sphere
  // drawn as a box with a circle on each face looks like a box up close) ----
  // a ring of n segments in the plane given by two unit axes u, v around c
  function ring3(out, c, r, u, v, n) {
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * 2 * i / n, a1 = Math.PI * 2 * (i + 1) / n;
      out.push([c[0] + (Math.cos(a0) * u[0] + Math.sin(a0) * v[0]) * r, c[1] + (Math.cos(a0) * u[1] + Math.sin(a0) * v[1]) * r, c[2] + (Math.cos(a0) * u[2] + Math.sin(a0) * v[2]) * r,
                c[0] + (Math.cos(a1) * u[0] + Math.sin(a1) * v[0]) * r, c[1] + (Math.cos(a1) * u[1] + Math.sin(a1) * v[1]) * r, c[2] + (Math.cos(a1) * u[2] + Math.sin(a1) * v[2]) * r]);
    }
  }
  // a cylinder along z (rings at both ends + generators), centre (cx, cy), from z0 to z1
  function cylinderZ(out, cx, cy, r, z0, z1, n, half) {
    const m = half ? n / 2 : n;
    for (let i = 0; i < m; i++) {
      const a0 = Math.PI * 2 * i / n, a1 = Math.PI * 2 * (i + 1) / n;
      const x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r, x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
      out.push([x0, y0, z0, x1, y1, z0]); out.push([x0, y0, z1, x1, y1, z1]);
      if (i % 2 === 0) out.push([x0, y0, z0, x0, y0, z1]);
    }
    if (half) { out.push([cx + r, cy, z0, cx - r, cy, z0]); out.push([cx + r, cy, z1, cx - r, cy, z1]); }
  }
  // a sphere: three latitude rings + four meridians (a wire globe)
  function sphere3(out, c, r, lat0, lat1) {
    const L0 = lat0 === undefined ? -1 : lat0, L1 = lat1 === undefined ? 1 : lat1;
    for (const t of [-0.6, -0.2, 0.2, 0.6]) if (t >= L0 && t <= L1) ring3(out, [c[0], c[1] + r * t, c[2]], r * Math.sqrt(1 - t * t), [1, 0, 0], [0, 0, 1], 16);
    for (let m = 0; m < 4; m++) {
      const a = Math.PI * m / 4, u = [Math.cos(a), 0, Math.sin(a)];
      const pts = [];
      for (let i = 0; i <= 12; i++) { const t = L0 + (L1 - L0) * i / 12; const rr = r * Math.sqrt(Math.max(0, 1 - t * t)); pts.push([c[0] + u[0] * rr, c[1] + r * t, c[2] + u[2] * rr]); }
      for (let i = 1; i < pts.length; i++) out.push([pts[i - 1][0], pts[i - 1][1], pts[i - 1][2], pts[i][0], pts[i][1], pts[i][2]]);
    }
  }
  const BUILD3 = {
    dome(out, k) {
      const d = k.d / 2;
      // the drum: a box the profile already gives, then the dome as a hemisphere on it
      for (const g of [[-20, 0, 20, 0], [20, 0, 20, 14], [20, 14, -20, 14], [-20, 14, -20, 0]]) { out.push([g[0], g[1], d, g[2], g[3], d]); out.push([g[0], g[1], -d, g[2], g[3], -d]); }
      for (const x of [-20, 20]) out.push([x, 0, d, x, 0, -d], [x, 14, d, x, 14, -d]);
      sphere3(out, [0, 14, 0], 21, 0, 1);
      out.push([0, 35, 0, 0, 27, 0], [3, 34.5, 0, 3, 27, 0]);   // the slit
    },
    tanks(out, k) {
      for (const cx of [-32, 0, 32]) {
        // a horizontal cylinder along x: rings around x, generators along x
        for (const x of [-9, 0, 9]) ring3(out, [cx + x, 13, 0], 9, [0, 1, 0], [0, 0, 1], 12);
        for (let i = 0; i < 6; i++) { const a = Math.PI * 2 * i / 6; out.push([cx - 9, 13 + Math.sin(a) * 9, Math.cos(a) * 9, cx + 9, 13 + Math.sin(a) * 9, Math.cos(a) * 9]); }
        for (const z of [-5, 5]) out.push([cx - 10, 0, z, cx - 8, 4, z], [cx + 10, 0, z, cx + 8, 4, z]);
      }
      out.push([-40, 24, 0, 40, 24, 0], [40, 24, 0, 46, 24, 0], [46, 24, 0, 46, 0, 0]);
    },
    core(out, k) {
      sphere3(out, [0, 24, 0], 14);
      for (const z of [-6, 6]) out.push([-14, 24, z, -22, 0, z], [14, 24, z, 22, 0, z], [-26, 0, z, 26, 0, z]);
      out.push([0, 38, 0, 0, 44, 0]);
      // the shield: a cap of a larger sphere over the core
      sphere3(out, [0, 24, 0], 24, 0.45, 1);
      ring3(out, [0, 24 + 24 * 0.45, 0], 24 * Math.sqrt(1 - 0.45 * 0.45), [1, 0, 0], [0, 0, 1], 20);
    },
    depot(out, k) {
      const d = k.d / 2;
      for (const cx of [-26, 0, 26]) {
        cylinderZ(out, cx, 0, 11, -d, d, 12, true);
        out.push([cx - 3, 0, d, cx - 3, 6, d], [cx + 3, 0, d, cx + 3, 6, d], [cx - 3, 6, d, cx + 3, 6, d]);
      }
      out.push([-40, 0, d, 40, 0, d], [-40, 0, -d, 40, 0, -d]);
    },
  };
  function solid(id) {
    const kind = BY_ID[id];
    if (!kind) return null;
    if (kind.segs3) return kind.segs3;
    const out = [];
    if (BUILD3[id]) {
      BUILD3[id](out, kind);
      kind.segs3 = out.map((g) => g.map((v) => +v.toFixed(2)));
      return kind.segs3;
    }
    const hz = kind.d / 2;
    const corners = new Map();
    const all = kind.segs.slice();
    if (kind.dyn) {
      // the moving part at rest, baked in for the tank
      const c = Math.cos(kind.rest), s = Math.sin(kind.rest), px = kind.pivot[0], py = kind.pivot[1];
      for (const g of kind.dyn) all.push([+(px + g[0] * c - g[1] * s).toFixed(2), +(py + g[0] * s + g[1] * c).toFixed(2), +(px + g[2] * c - g[3] * s).toFixed(2), +(py + g[2] * s + g[3] * c).toFixed(2)]);
    }
    for (const g of all) {
      out.push([g[0], g[1], hz, g[2], g[3], hz]);
      out.push([g[0], g[1], -hz, g[2], g[3], -hz]);
      corners.set(g[0] + ',' + g[1], [g[0], g[1]]);
      corners.set(g[2] + ',' + g[3], [g[2], g[3]]);
    }
    for (const c of corners.values()) out.push([c[0], c[1], hz, c[0], c[1], -hz]);
    kind.segs3 = out;
    return out;
  }

  // ---- civilian ---------------------------------------------------------------------
  def({ id: 'hab', name: 'HAB MODULES', cls: 'civ', w: 66, h: 18, draw(o) {
    for (const cx of [-22, 0, 22]) {
      poly(o, [[cx - 10, 0], [cx - 11, 8], [cx - 7, 16], [cx + 7, 16], [cx + 11, 8], [cx + 10, 0]], false);
      seg(o, cx - 3, 8, cx + 3, 8);   // window
    }
    seg(o, -12, 6, -10, 6); seg(o, 10, 6, 12, 6);   // the tubes between modules
    seg(o, 28, 0, 28, 5); seg(o, 28, 5, 34, 5); seg(o, 34, 5, 34, 0);   // airlock
  } });
  def({ id: 'comm', d: 14, name: 'COMM TOWER', cls: 'civ', w: 14, h: 95, draw(o) {
    lattice(o, 14, 5, 80, 6);
    seg(o, 0, 80, 0, 95);
    seg(o, -4, 90, 4, 90); seg(o, -2.5, 95, 2.5, 95);
    dish(o, -5, 62, 5, 0.6); dish(o, 5, 48, 5, -0.6);
  } });
  def({ id: 'generator', name: 'POWER GENERATOR', cls: 'civ', w: 48, h: 40, draw(o) {
    box(o, -22, 0, 12, 22);
    seg(o, 12, 0, 22, 0); seg(o, 22, 0, 22, 8); seg(o, 12, 8, 22, 8);   // the intake box
    seg(o, -14, 22, -14, 40); seg(o, -8, 22, -8, 40); seg(o, -14, 40, -8, 40);   // stack
    for (let i = 0; i < 4; i++) seg(o, -4 + i * 4, 22, -4 + i * 4, 30);   // radiator fins
    seg(o, -4, 30, 8, 30);
  } });
  def({ id: 'solar', d: 30, name: 'SOLAR FARM', cls: 'civ', w: 120, h: 16, draw(o) {
    for (let i = 0; i < 5; i++) {
      const cx = -48 + i * 24;
      seg(o, cx, 0, cx, 6);
      poly(o, [[cx - 10, 3], [cx + 10, 9], [cx + 10, 16], [cx - 10, 10]], true);
      seg(o, cx, 6.5, cx, 13);
    }
    seg(o, -56, 0, 56, 0);
  } });
  def({ id: 'tanks', d: 26, name: 'TANK FARM', cls: 'civ', w: 96, h: 26, draw(o) {
    for (const cx of [-32, 0, 32]) {
      arc(o, cx - 8, 13, 9, Math.PI / 2, Math.PI * 1.5, 6);
      arc(o, cx + 8, 13, 9, -Math.PI / 2, Math.PI / 2, 6);
      seg(o, cx - 8, 22, cx + 8, 22); seg(o, cx - 8, 4, cx + 8, 4);
      seg(o, cx - 10, 0, cx - 8, 4); seg(o, cx + 10, 0, cx + 8, 4);   // cradle
    }
    seg(o, -40, 24, 40, 24); seg(o, 40, 24, 46, 24); seg(o, 46, 24, 46, 0);   // manifold
  } });
  def({ id: 'dishes', name: 'DISH ARRAY', cls: 'civ', w: 84, h: 30, draw(o) {
    for (const cx of [-28, 0, 28]) { seg(o, cx, 0, cx, 14); dish(o, cx, 18, 11, 0.5); }
    seg(o, -34, 0, 34, 0);
  } });
  def({ id: 'drill', d: 30, name: 'MINING DRILL', cls: 'civ', w: 30, h: 72, draw(o) {
    lattice(o, 30, 10, 64, 5);
    seg(o, -8, 64, 8, 64); seg(o, -8, 64, -8, 72); seg(o, 8, 64, 8, 72); seg(o, -8, 72, 8, 72);   // crown block
    seg(o, 0, 0, 0, 60);   // the string
    box(o, 15, 0, 27, 10);   // pump house
  } });
  def({ id: 'garage', name: 'ROVER GARAGE', cls: 'civ', w: 72, h: 24, draw(o) {
    poly(o, [[-36, 0], [-36, 18], [-30, 24], [30, 24], [36, 18], [36, 0]], false);
    box(o, -14, 0, 14, 16);   // the door
    seg(o, -14, 8, 14, 8);
    // a rover outside
    box(o, 40, 4, 58, 10); seg(o, 43, 10, 43, 14); seg(o, 43, 14, 49, 14);
    arc(o, 43, 3, 3, 0, Math.PI * 2, 6); arc(o, 55, 3, 3, 0, Math.PI * 2, 6);
  } });
  def({ id: 'dome', d: 44, name: 'OBSERVATORY', cls: 'civ', w: 44, h: 36, draw(o) {
    box(o, -20, 0, 20, 14);
    arc(o, 0, 14, 20, 0, Math.PI, 10, 22);
    seg(o, 0, 36, 0, 26); seg(o, 3, 35.5, 3, 27);   // the slit
  } });
  def({ id: 'greenhouse', name: 'GREENHOUSE', cls: 'civ', w: 90, h: 20, draw(o) {
    arc(o, -35, 0, 10, 0, Math.PI, 6, 20); arc(o, 35, 0, 10, 0, Math.PI, 6, 20);
    seg(o, -35, 20, 35, 20);
    for (let i = 0; i < 7; i++) { const x = -30 + i * 10; seg(o, x, 0, x, 20); }
    seg(o, -45, 0, 45, 0);
  } });

  // ---- hostile, in the open ------------------------------------------------------------------
  def({ id: 'sam', name: 'SAM SITE', cls: 'open', mult: 2, w: 56, h: 26, draw(o) {
    box(o, -28, 0, -6, 10);   // the hut
    seg(o, -20, 10, -20, 16);
    seg(o, 4, 0, 4, 8); seg(o, 12, 0, 12, 8); seg(o, 2, 8, 14, 8);   // the mount
    // the rail at 45° with two missiles on it
    seg(o, 0, 8, 26, 26);
    seg(o, 3, 13, 21, 27); seg(o, 5, 9, 25, 23);
    seg(o, 21, 27, 24, 29); seg(o, 25, 23, 28, 25);
  } });
  def({ id: 'gunpit', name: 'GUN PIT', cls: 'open', mult: 1, w: 36, h: 14, draw(o) {
    poly(o, [[-18, 0], [-14, 6], [14, 6], [18, 0]], false);
    arc(o, 0, 6, 8, 0, Math.PI, 5, 5);
    seg(o, 0, 9, 16, 22);   // the barrel — spills past h on purpose; the box is the pit
  } });
  def({ id: 'radar', d: 30, name: 'RADAR TOWER', cls: 'open', mult: 1, w: 30, h: 60, draw(o) {
    lattice(o, 30, 12, 46, 4);
    seg(o, 0, 46, 0, 52);
    poly(o, [[-16, 52], [16, 52], [14, 60], [-14, 60]], true);   // the panel
    seg(o, -8, 56, 8, 56);
  } });
  def({ id: 'jammer', d: 16, name: 'JAMMER MAST', cls: 'open', mult: 2, w: 16, h: 70, draw(o) {
    seg(o, -2, 0, -2, 60); seg(o, 2, 0, 2, 60);
    for (let i = 1; i < 6; i++) seg(o, -2, i * 10, 2, i * 10);
    seg(o, 0, 60, 0, 70);
    for (let i = 0; i < 6; i++) { const a = Math.PI * 2 * i / 6; seg(o, 0, 64, Math.cos(a) * 8, 64 + Math.sin(a) * 6); }
    box(o, -8, 0, 8, 6);
  } });

  // ---- hostile, in the open — the two that shoot back at the lander (2026-09-12, James: "lasers
  // targeting and hitting the lander and some like mini accelerators that fire streams of tungsten
  // pellets like a machine gun"). Both targetable from anywhere, both destroyable. The lander core
  // owns their fire (TURRET / PELLET); `aim` on the seated structure is where the head points.
  def({ id: 'laserturret', d: 26, name: 'LASER TURRET', cls: 'open', mult: 2, w: 34, h: 30, draw(o) {
    box(o, -17, 0, 17, 8);                       // the base block
    seg(o, -6, 8, -4, 18); seg(o, 6, 8, 4, 18);  // the pedestal
    arc(o, 0, 20, 8, 0, Math.PI * 2, 10);        // the head: a ring
    seg(o, -3, 17, 3, 23); seg(o, -3, 23, 3, 17);// the lens cross
    seg(o, -12, 8, -12, 12); seg(o, -14, 12, -10, 12);   // a cooling vane
  }, pivot: [0, 20], rest: Math.PI * 0.16, dynDraw(o) {
    seg(o, 7, 1.2, 25, 1.2); seg(o, 7, -1.2, 25, -1.2); seg(o, 25, 1.2, 25, -1.2);   // the barrel, turned to the aim
  } });
  def({ id: 'pelletgun', d: 22, name: 'PELLET GUN', cls: 'open', mult: 2, w: 40, h: 22, draw(o) {
    poly(o, [[-20, 0], [-16, 6], [16, 6], [20, 0]], false);   // the mount
    box(o, -14, 6, -4, 16); seg(o, -9, 6, -9, 16);          // the pellet drum
    seg(o, -4, 11, 2, 11);                                   // the feed
    arc(o, 2, 11, 4, 0, Math.PI * 2, 8);                     // the trunnion
  }, pivot: [2, 11], rest: Math.PI * 0.13, dynDraw(o) {
    // the mini accelerator: a coil tube of five rings along the aim
    for (let i = 0; i < 5; i++) { const x = 4 + i * 5; seg(o, x, -3, x, 3); }
    seg(o, 3, 3, 24, 3); seg(o, 3, -3, 24, -3);              // the tube's two rails
    seg(o, 24, 3, 27, 4.5); seg(o, 24, -3, 27, -4.5);        // the muzzle flare
  } });

  // ---- hostile, hardened ---------------------------------------------------------------------
  def({ id: 'datacentre', name: 'DATA CENTRE', cls: 'hard', hard: 'overhang', mult: 4, w: 110, h: 46, draw(o) {
    box(o, -30, 0, 30, 20);
    for (let i = 0; i < 5; i++) seg(o, -24 + i * 12, 4, -24 + i * 12, 16);   // rack doors
    // the rock lip: a jagged shelf over the building, rooted on the left, open on the right
    poly(o, [[-55, 0], [-52, 18], [-48, 30], [-40, 40], [-25, 46], [-5, 45], [15, 42], [32, 38], [44, 33], [48, 28]], false);
    poly(o, [[-40, 40], [-36, 34], [-30, 30]], false);
    seg(o, 48, 28, 40, 26); seg(o, 40, 26, 34, 28);
  } });
  def({ id: 'depot', d: 30, name: 'AMMO DEPOT', cls: 'hard', hard: 'ridge', mult: 3, w: 80, h: 18, draw(o) {
    for (const cx of [-26, 0, 26]) { arc(o, cx, 0, 11, 0, Math.PI, 6, 16); seg(o, cx - 3, 0, cx - 3, 6); seg(o, cx + 3, 0, cx + 3, 6); seg(o, cx - 3, 6, cx + 3, 6); }
    seg(o, -40, 0, 40, 0);
  } });
  def({ id: 'bunker', name: 'BUNKER', cls: 'hard', hard: 'door', mult: 3, w: 60, h: 34, draw(o) {
    poly(o, [[-30, 0], [-30, 16], [-24, 22], [24, 22], [30, 16], [30, 0]], false);
    box(o, -10, 0, 10, 14); seg(o, -10, 7, 10, 7); seg(o, 0, 0, 0, 14);   // the blast door, shut
    // its own SAM on the roof
    seg(o, 8, 22, 8, 26); seg(o, 4, 26, 12, 26); seg(o, 6, 26, 22, 34); seg(o, 9, 30, 19, 35);
  } });
  def({ id: 'core', d: 40, name: 'POWER CORE', cls: 'hard', hard: 'shield', mult: 5, w: 60, h: 50, draw(o) {
    arc(o, 0, 24, 14, 0, Math.PI * 2, 12);
    seg(o, -14, 24, -22, 0); seg(o, 14, 24, 22, 0); seg(o, -26, 0, 26, 0);   // cradle
    seg(o, 0, 38, 0, 44);
    arc(o, 0, 24, 24, Math.PI * 0.15, Math.PI * 0.85, 10);   // the shield, an arc over it
  } });

  // ---- THE BASE (Moon Battle 2100, level 3's end) -------------------------------------------------
  // A wide hull with a command block and mast, a hangar door, two SAM rails
  // on the shoulders. Its shield is NOT in these strokes: the renderer draws
  // it (`shieldSegs`) only while the base's shield stands, so the strokes
  // fall away as the laser cuts it. mult 20 = 2,000 points.
  def({ id: 'base', d: 120, name: 'THE BASE', cls: 'hard', hard: 'base', mult: 20, w: 220, h: 80, draw(o) {
    // the hull: a long low block with sloped ends
    poly(o, [[-110, 0], [-104, 26], [104, 26], [110, 0]], false);
    seg(o, -104, 26, -96, 34); seg(o, 96, 34, 104, 26); seg(o, -96, 34, 96, 34);
    for (let i = 0; i < 9; i++) { const x = -88 + i * 22; seg(o, x, 6, x, 20); }   // the bays
    // the hangar door, centre-left
    box(o, -70, 0, -30, 22); seg(o, -50, 0, -50, 22); seg(o, -70, 11, -30, 11);
    // the command block and the mast
    box(o, -24, 34, 24, 58); seg(o, -16, 40, 16, 40); seg(o, -16, 52, 16, 52);
    seg(o, 0, 58, 0, 80); seg(o, -6, 74, 6, 74); seg(o, -4, 80, 4, 80);
    // two SAM rails on the shoulders, aimed outward
    for (const sx of [-1, 1]) {
      const bx = sx * 72;
      seg(o, bx - 6, 34, bx - 6, 42); seg(o, bx + 6, 34, bx + 6, 42); seg(o, bx - 8, 42, bx + 8, 42);
      seg(o, bx - sx * 4, 42, bx + sx * 22, 62); seg(o, bx - sx * 1, 46, bx + sx * 19, 63); seg(o, bx + sx * 1, 40, bx + sx * 23, 58);
    }
  } });
  // the shield: a dome of an ellipse over the whole base, drawn by the renderer while it stands
  (function () {
    const segs = [];
    arc(segs, 0, 4, 128, Math.PI * 0.04, Math.PI * 0.96, 22, 96);
    for (let i = 1; i <= 3; i++) arc(segs, 0, 4, 128 - i * 4, Math.PI * 0.3 + i * 0.05, Math.PI * 0.7 - i * 0.05, 8, 96 - i * 3);
    BY_ID.base.shieldSegs = segs;
  })();

  // ---- THE TANK'S GROUND (Moon Battle 2100, 2026-09-11) --------------------------------------------
  // Gun towers and the base's hangar are hostile kinds the TANK seats on its
  // route (the lander's plan never deals them); the LANDMARKS are the places
  // along the tank's route — civilian to both halves, never targetable, each
  // one unique so the pilot knows where the road has taken them. The lander
  // seats none of these; both renderers can draw them.
  def({ id: 'tower', d: 24, name: 'GUN TOWER', cls: 'open', mult: 2, w: 24, h: 70, tank: true, draw(o) {
    lattice(o, 24, 10, 52, 4);
    box(o, -9, 52, 9, 62); seg(o, -9, 57, 9, 57);
    seg(o, 0, 62, 0, 70); seg(o, 9, 58, 24, 66); seg(o, 9, 56, 23, 63);   // the gun, out to the right
  } });
  def({ id: 'hangar', d: 90, name: 'THE HANGAR', cls: 'open', mult: 5, w: 90, h: 36, tank: true, draw(o) {
    poly(o, [[-45, 0], [-45, 24], [-30, 36], [30, 36], [45, 24], [45, 0]], false);
    box(o, -28, 0, 28, 22); seg(o, -28, 11, 28, 11); seg(o, 0, 0, 0, 22);   // the doors
    for (let i = 0; i < 4; i++) seg(o, -36 + i * 24, 26, -28 + i * 24, 26);
    seg(o, 30, 36, 30, 44); seg(o, 26, 44, 34, 44);
  } });
  const LANDMARK_DEFS = [
    { id: 'freighter', d: 40, name: 'THE CRASHED FREIGHTER', w: 140, h: 42, draw(o) {
      poly(o, [[-70, 0], [-64, 18], [-50, 30], [-10, 34], [30, 30], [56, 20], [70, 6], [70, 0]], false);
      seg(o, -50, 30, -46, 42); seg(o, -46, 42, -30, 40); seg(o, -30, 40, -34, 33);   // the torn bridge
      for (let i = 0; i < 6; i++) seg(o, -40 + i * 18, 10, -34 + i * 18, 22);
      seg(o, 30, 30, 44, 38); seg(o, 44, 38, 48, 28);
      seg(o, -70, 0, -84, 4); seg(o, -84, 4, -78, 12);   // a shed plate
      seg(o, 56, 20, 62, 8); seg(o, 20, 0, 26, 8); seg(o, 26, 8, 40, 8);
    } },
    { id: 'massdriver', d: 20, name: 'THE MASS DRIVER', w: 170, h: 40, draw(o) {
      for (let i = 0; i < 5; i++) { const x = -80 + i * 40; seg(o, x - 6, 0, x, 22 + i * 4); seg(o, x + 6, 0, x, 22 + i * 4); seg(o, x - 6, 0, x + 6, 0); }
      poly(o, [[-80, 22], [-40, 26], [0, 30], [40, 34], [80, 38]], false);
      poly(o, [[-80, 25], [-40, 29], [0, 33], [40, 37], [80, 41]], false);
      for (let i = 0; i < 9; i++) { const x = -80 + i * 20; seg(o, x, 22 + i * 2, x, 25 + i * 2); }
      seg(o, 80, 38, 92, 44); seg(o, 80, 41, 92, 47); seg(o, 92, 44, 92, 47);
    } },
    { id: 'monolith', d: 8, name: 'THE MONOLITH', w: 22, h: 96, draw(o) {
      poly(o, [[-11, 0], [-10, 96], [10, 96], [11, 0]], true);
      seg(o, -10, 96, 10, 96);
      for (let i = 1; i < 4; i++) seg(o, -8, 24 * i, 8, 24 * i - 3);
    } },
    { id: 'pylons', d: 12, name: 'THE PYLON LINE', w: 160, h: 56, draw(o) {
      for (let i = 0; i < 3; i++) {
        const x = -60 + i * 60;
        seg(o, x - 8, 0, x - 3, 46); seg(o, x + 8, 0, x + 3, 46); seg(o, x - 3, 46, x + 3, 46);
        seg(o, x - 14, 34, x + 14, 34); seg(o, x - 10, 42, x + 10, 42); seg(o, x, 46, x, 56);
        seg(o, x - 8, 0, x + 8, 0);
      }
      // the lines sag between the arms
      for (const y of [34, 42]) for (let i = 0; i < 2; i++) { const x0 = -60 + i * 60, x1 = x0 + 60; poly(o, [[x0 + 14, y], [x0 + 30, y - 5], [x1 - 14, y]], false); }
    } },
    { id: 'wreckcrater', d: 60, name: 'THE IMPACT CRATER', w: 130, h: 16, draw(o) {
      poly(o, [[-65, 0], [-50, 10], [-30, 14], [30, 14], [50, 10], [65, 0]], false);
      poly(o, [[-40, 8], [-20, 3], [20, 3], [40, 8]], false);
      seg(o, -6, 3, 4, 16); seg(o, 4, 16, 10, 12); seg(o, -2, 9, 8, 9);   // the thing that made it
    } },
    { id: 'lavatube', d: 70, name: 'THE LAVA TUBE', w: 96, h: 44, draw(o) {
      arc(o, 0, 0, 44, 0, Math.PI, 12, 40);
      arc(o, 0, 0, 30, Math.PI * 0.08, Math.PI * 0.92, 10, 28);
      seg(o, -48, 0, 48, 0);
      seg(o, -30, 0, -24, 8); seg(o, 30, 0, 22, 10); seg(o, 0, 28, 0, 20);   // rubble at the mouth, a stalactite
    } },
    { id: 'antennas', d: 30, name: 'THE ANTENNA FIELD', w: 120, h: 64, draw(o) {
      for (let i = 0; i < 7; i++) { const x = -54 + i * 18, h = 30 + ((i * 7) % 4) * 9; seg(o, x, 0, x, h); seg(o, x - 5, h - 8, x + 5, h - 8); seg(o, x - 3, h - 16, x + 3, h - 16); seg(o, x - 4, 0, x + 4, 0); }
      seg(o, -60, 0, 60, 0);
    } },
    { id: 'fueldepot', d: 40, name: 'THE FUEL DEPOT', w: 110, h: 34, draw(o) {
      for (const cx of [-36, 0, 36]) { arc(o, cx, 14, 13, 0, Math.PI * 2, 12); seg(o, cx - 8, 0, cx - 8, 4); seg(o, cx + 8, 0, cx + 8, 4); seg(o, cx - 10, 4, cx + 10, 4); }
      seg(o, -49, 27, 49, 27); seg(o, 49, 27, 55, 27); seg(o, 55, 27, 55, 0); seg(o, 55, 20, 60, 34); seg(o, 60, 34, 64, 34);
    } },
  ];
  for (const L of LANDMARK_DEFS) def(Object.assign({ cls: 'civ', landmark: true }, L));
  for (const L of LANDMARK_DEFS) BY_ID[L.id].landmark = true;
  BY_ID.tower.tank = true; BY_ID.hangar.tank = true;
  const LANDMARKS = LANDMARK_DEFS.map((L) => L.id);

  const CIV = K.filter((k) => k.cls === 'civ' && !k.landmark).map((k) => k.id);
  const OPEN = K.filter((k) => k.cls === 'open' && !k.tank).map((k) => k.id);   // the tank-only kinds (tower, hangar) are seated by the tank core
  const HARD = K.filter((k) => k.cls === 'hard' && k.id !== 'base').map((k) => k.id);   // the base is dealt by the level plan only

  globalThis.LunarStructures = { KINDS: K, BY_ID: BY_ID, CIV: CIV, OPEN: OPEN, HARD: HARD, LANDMARKS: LANDMARKS, TAGS: TAGS, solid: solid };
})();
