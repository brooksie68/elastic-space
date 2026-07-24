// Arachno-Wars 2500 — graybox test level
//
// One long traversal gauntlet, no art, no enemies. Every polygon is solid rock;
// the tank can cling to ANY perimeter, including undersides and walls.
// Sections, left to right:
//   1. spawn pad + rolling ground
//   2. ledge staircase up to a plateau
//   3. floating C-pocket (jump up, crawl inside, hang inverted)
//   4. chasm — grippable walls, a floating web-anchor rock above it
//   5. cave — ceiling slab overhead for web pulls and inverted crawling
//   6. step ledges
//   7. the curlicue — G-shaped curl, mouth facing down
//   8. goal pad

(function (g) {
  'use strict';

  const polys = [];

  // arc helper: points on a circle, degrees, y-down space
  function arc(cx, cy, r, a0deg, a1deg, steps) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = ((a0deg + (a1deg - a0deg) * (i / steps)) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }

  // C/G-shaped band: outer arc one way, inner arc back, mouth = the gap
  function curl(cx, cy, rOuter, rInner, mouthDeg, mouthHalfDeg, steps) {
    const a0 = mouthDeg + mouthHalfDeg;
    const a1 = mouthDeg + 360 - mouthHalfDeg;
    const outer = arc(cx, cy, rOuter, a0, a1, steps);
    const inner = arc(cx, cy, rInner, a1, a0, steps);
    return outer.concat(inner);
  }

  // --- 1+2+4a: ground A (spawn, rolls, staircase, plateau, chasm left lip)
  polys.push([
    [0, 780],                             // spawn pad
    [340, 780],
    [560, 800], [820, 742], [1080, 768], // rolling
    [1420, 700], [1780, 736],
    [2200, 736],                          // staircase up
    [2200, 646], [2452, 646],
    [2452, 562], [2704, 562],
    [2704, 480], [3050, 480],
    [3560, 480],                          // plateau (C-pocket floats above)
    [3920, 596], [4300, 690],             // down-slope
    [5200, 700],                          // chasm left lip
    [5200, 1500],                         // grippable chasm wall
    [0, 1500]                             // underworld floor, closes up left wall
  ]);

  // --- 3: floating C-pocket over the plateau, mouth facing right
  polys.push(curl(3300, 210, 190, 110, 0, 55, 20));

  // --- 4b: web-anchor rock floating over the chasm
  polys.push([
    [5320, 296], [5500, 296], [5500, 362], [5320, 362]
  ]);

  // --- 5a+6+7a+8: ground B (cave floor through goal pad)
  polys.push([
    [5620, 760],                          // chasm right lip
    [6000, 800], [7000, 800],             // cave floor
    [8300, 780], [8660, 724],             // out of the cave
    [9000, 764], [10040, 782],            // floor under the curlicue
    [10620, 742], [11220, 684],           // rise toward goal
    [11840, 700], [12400, 700],
    [13200, 700],                         // goal pad
    [13200, 1500],
    [5620, 1500]                          // closes up the chasm right wall
  ]);

  // --- 5b: cave ceiling slab (wavy underside, flat top you can land on)
  polys.push([
    [6100, 200], [8300, 200],             // top
    [8300, 380],
    [8000, 432], [7600, 470], [7240, 438],// wavy underside
    [6840, 478], [6420, 430],
    [6100, 398]
  ]);

  // --- 6: step ledges
  polys.push([[8550, 560], [8810, 560], [8810, 604], [8550, 604]]);
  polys.push([[9060, 428], [9320, 428], [9320, 472], [9060, 472]]);

  // --- 7: the curlicue — G-shaped curl, mouth facing straight down
  polys.push(curl(9900, 330, 250, 165, 90, 50, 24));

  g.AW25_LEVEL = {
    polys: polys,
    spawn: { x: 200, y: 640 },
    goalX: 12600,
    killY: 1620,
    worldW: 13200,
    viewTop: -140,   // camera clamp
    viewBottom: 1150,
    signs: [
      { x: 170, y: 600, t: 'WASD walk any surface · SPACE jump' },
      { x: 170, y: 636, t: 'SHIFT rocket · E web · R reset · ` debug' },
      { x: 3300, y: 520, t: 'jump up, crawl the pocket' },
      { x: 5410, y: 250, t: 'E webs the rock · SHIFT flies' },
      { x: 7200, y: 320, t: 'E: web the ceiling, walk it upside down' },
      { x: 9900, y: 96, t: 'the curlicue — enter from below' },
      { x: 12620, y: 640, t: 'GOAL PAD' }
    ]
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
