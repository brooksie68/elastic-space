// The Valence Lab — orbital physics module.
// Shared between world.js (browser) and tmp/the-valence-lab/atom-sim.mjs (Node).
// Keep this file pure ESM with zero imports — no three.js, no DOM.
//
// Honesty contract: electron positions are drawn from the true |psi|^2 of
// hydrogen-like orbitals with per-shell effective nuclear charges from
// Slater's rules. Lengths are in Bohr radii (a0 = 1). The renderer may scale
// for display, but never reshape a distribution.

export const SUBSHELLS = ['1s', '2s', '2p', '3s', '3p'];

// Subshell display palette lives here so the readout legend and the GPU
// swarm can never disagree. Index matches SUBSHELLS.
export const SUBSHELL_COLORS = [0xffb36b, 0x5ee6c8, 0x54b8ff, 0xc79bff, 0xff7ad1];

const RAW = [
  { symbol: 'H',  name: 'Hydrogen', Z: 1,  neutrons: 0,  fill: { '1s': 1 },
    valence: 1, capacity: 2, seeking: 1, vialColor: 0xf2f2f2 },
  { symbol: 'C',  name: 'Carbon',   Z: 6,  neutrons: 6,  fill: { '1s': 2, '2s': 2, '2p': 2 },
    valence: 4, capacity: 8, seeking: 4, vialColor: 0x909090 },
  { symbol: 'N',  name: 'Nitrogen', Z: 7,  neutrons: 7,  fill: { '1s': 2, '2s': 2, '2p': 3 },
    valence: 5, capacity: 8, seeking: 3, vialColor: 0x3f68f8 },
  { symbol: 'O',  name: 'Oxygen',   Z: 8,  neutrons: 8,  fill: { '1s': 2, '2s': 2, '2p': 4 },
    valence: 6, capacity: 8, seeking: 2, vialColor: 0xff3d2e },
  { symbol: 'Ne', name: 'Neon',     Z: 10, neutrons: 10, fill: { '1s': 2, '2s': 2, '2p': 6 },
    valence: 8, capacity: 8, seeking: 0, vialColor: 0xb3e3f5 },
  { symbol: 'Ar', name: 'Argon',    Z: 18, neutrons: 22, fill: { '1s': 2, '2s': 2, '2p': 6, '3s': 2, '3p': 6 },
    valence: 8, capacity: 8, seeking: 0, vialColor: 0x80d1e3 },
];

// ---------------------------------------------------------------------------
// Slater's rules (s/p only — all we need through argon).
// Electron in shell n is shielded 0.35 by each other electron in shell n
// (0.30 within 1s), 0.85 by each electron in shell n-1, 1.00 by anything deeper.

export function slaterZeff(element, n) {
  const perShell = { 1: 0, 2: 0, 3: 0 };
  for (const [key, e] of Object.entries(element.fill)) perShell[+key[0]] += e;
  const same = perShell[n] - 1;
  const inner = n >= 2 ? perShell[n - 1] : 0;
  let deeper = 0;
  for (let m = 1; m <= n - 2; m++) deeper += perShell[m];
  return element.Z - (n === 1 ? 0.30 : 0.35) * same - 0.85 * inner - 1.00 * deeper;
}

// ---------------------------------------------------------------------------
// Hydrogen-like radial wavefunctions R_nl (unnormalized is fine — the
// sampling CDF is normalized numerically). rho = Zeff * r, r in a0.

export function radialR(n, l, zeff, r) {
  const p = zeff * r;
  if (n === 1 && l === 0) return Math.exp(-p);
  if (n === 2 && l === 0) return (2 - p) * Math.exp(-p / 2);
  if (n === 2 && l === 1) return p * Math.exp(-p / 2);
  if (n === 3 && l === 0) return (27 - 18 * p + 2 * p * p) * Math.exp(-p / 3);
  if (n === 3 && l === 1) return p * (6 - p) * Math.exp(-p / 3);
  throw new Error(`radialR: unsupported orbital n=${n} l=${l}`);
}

// Analytic mean radius of a hydrogen-like orbital, in a0.
export function meanRadius(n, l, zeff) {
  return (3 * n * n - l * (l + 1)) / (2 * zeff);
}

// The single radial node of a 2s orbital (rho = 2), in a0.
export function node2s(zeff) {
  return 2 / zeff;
}

// Inverse-CDF sampler for the radial density r^2 R_nl(r)^2.
export function makeRadialSampler(n, l, zeff, steps = 4096) {
  const rmax = (14 * n + 6) / zeff;
  const dr = rmax / steps;
  const rs = new Float64Array(steps + 1);
  const cdf = new Float64Array(steps + 1);
  let acc = 0;
  for (let i = 0; i <= steps; i++) {
    const r = i * dr;
    rs[i] = r;
    const R = radialR(n, l, zeff, r);
    const pdf = r * r * R * R;
    if (i > 0) acc += pdf * dr;
    cdf[i] = acc;
  }
  for (let i = 0; i <= steps; i++) cdf[i] /= acc;
  return {
    rmax,
    sample(u) {
      let lo = 0, hi = steps;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (cdf[mid] < u) lo = mid; else hi = mid;
      }
      const span = cdf[hi] - cdf[lo];
      const t = span > 0 ? (u - cdf[lo]) / span : 0.5;
      return rs[lo] + t * dr;
    },
  };
}

// Direction sampler. s orbitals are isotropic; real p orbitals go as
// cos^2(alpha) about their axis (px/py/pz), sampled exactly via
// cos(alpha) = cbrt(1 - 2u).
export function sampleDirection(l, axis, rng, out) {
  if (l === 0) {
    const z = 2 * rng() - 1;
    const phi = 2 * Math.PI * rng();
    const s = Math.sqrt(Math.max(0, 1 - z * z));
    out[0] = s * Math.cos(phi); out[1] = s * Math.sin(phi); out[2] = z;
    return out;
  }
  const c = Math.cbrt(1 - 2 * rng());
  const s = Math.sqrt(Math.max(0, 1 - c * c));
  const phi = 2 * Math.PI * rng();
  const a = s * Math.cos(phi), b = s * Math.sin(phi);
  if (axis === 'z')      { out[0] = a; out[1] = b; out[2] = c; }
  else if (axis === 'x') { out[0] = c; out[1] = a; out[2] = b; }
  else                   { out[0] = b; out[1] = c; out[2] = a; }
  return out;
}

// ---------------------------------------------------------------------------
// Elements, expanded to individual orbitals with Hund's-rule occupancy.

function expandOrbitals(el) {
  const orbitals = [];
  for (const key of SUBSHELLS) {
    const e = el.fill[key];
    if (!e) continue;
    const n = +key[0];
    const l = key[1] === 's' ? 0 : 1;
    const zeff = slaterZeff(el, n);
    const subshellIndex = SUBSHELLS.indexOf(key);
    if (l === 0) {
      orbitals.push({ key, n, l, axis: null, e, zeff, subshellIndex });
    } else {
      // Hund: singly occupy x, y, z before pairing.
      const occ = [0, 0, 0];
      for (let i = 0; i < e; i++) occ[i % 3]++;
      const axes = ['x', 'y', 'z'];
      for (let i = 0; i < 3; i++) {
        if (occ[i] > 0) orbitals.push({ key, n, l, axis: axes[i], e: occ[i], zeff, subshellIndex });
      }
    }
  }
  return orbitals;
}

function configString(el) {
  return SUBSHELLS.filter((k) => el.fill[k])
    .map((k) => `${k}${superscript(el.fill[k])}`).join(' ');
}

const SUPS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
function superscript(num) {
  return String(num).split('').map((d) => SUPS[d]).join('');
}

export const ELEMENTS = RAW.map((el) => ({
  ...el,
  orbitals: expandOrbitals(el),
  config: configString(el),
  electronCount: Object.values(el.fill).reduce((a, b) => a + b, 0),
}));

export function getElement(symbol) {
  const el = ELEMENTS.find((e) => e.symbol === symbol);
  if (!el) throw new Error(`unknown element ${symbol}`);
  return el;
}

// ---------------------------------------------------------------------------
// Whole-atom sampler: picks an orbital weighted by occupancy, then draws a
// position from that orbital's true density. Writes xyz (in a0) into `out`
// and returns the orbital's index in element.orbitals.

export function makeAtomSampler(element, steps = 4096) {
  const radial = element.orbitals.map((o) => makeRadialSampler(o.n, o.l, o.zeff, steps));
  const weights = [];
  let total = 0;
  for (const o of element.orbitals) { total += o.e; weights.push(total); }
  const dir = [0, 0, 0];
  let maxR = 0;
  for (const s of radial) maxR = Math.max(maxR, s.rmax);
  return {
    element,
    maxR,
    samplePoint(rng, out) {
      const pick = rng() * total;
      let i = 0;
      while (weights[i] < pick) i++;
      const o = element.orbitals[i];
      const r = radial[i].sample(rng());
      sampleDirection(o.l, o.axis, rng, dir);
      out[0] = dir[0] * r; out[1] = dir[1] * r; out[2] = dir[2] * r;
      return i;
    },
  };
}
