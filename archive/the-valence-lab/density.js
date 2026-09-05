// The Valence Lab — molecular electron density evaluation and sampling.
// Shared verbatim by world.js (browser), the bake pipeline, and the Node
// verification sim. Pure ESM, zero imports — the orbitals.js of Phase B.
//
// Honesty contract: rho(r) is the genuine Hartree-Fock electron density
// reconstructed from the baked STO-3G density matrix — the same D the SCF
// converged, with nothing art-directed. The Metropolis sampler's equilibrium
// distribution is rho/Ne exactly; the sim checks its moments against direct
// grid integration of the same density. Lengths in Bohr throughout.

// Evaluate one contracted Cartesian Gaussian basis function at (x, y, z).
// bf: { c: [cx,cy,cz], l: [i,j,k], e: [exps], k: [coefs] } (coefs normalized).
export function evalBasisFunction(bf, x, y, z) {
  const dx = x - bf.c[0], dy = y - bf.c[1], dz = z - bf.c[2];
  const r2 = dx * dx + dy * dy + dz * dz;
  let radial = 0;
  for (let p = 0; p < bf.e.length; p++) radial += bf.k[p] * Math.exp(-bf.e[p] * r2);
  let poly = 1;
  for (let q = 0; q < bf.l[0]; q++) poly *= dx;
  for (let q = 0; q < bf.l[1]; q++) poly *= dy;
  for (let q = 0; q < bf.l[2]; q++) poly *= dz;
  return poly * radial;
}

// Build a density evaluator for a baked molecule record
// ({ basis, D, n }). Returns rho(x, y, z) in electrons / a0^3.
export function makeDensity(mol) {
  const { basis, D, n } = mol;
  const chi = new Float64Array(n);
  return function rho(x, y, z) {
    for (let i = 0; i < n; i++) chi[i] = evalBasisFunction(basis[i], x, y, z);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const ci = chi[i];
      if (ci === 0) continue;
      let row = 0;
      const base = i * n;
      for (let j = 0; j < n; j++) row += D[base + j] * chi[j];
      sum += ci * row;
    }
    return Math.max(sum, 0); // guard tiny negative round-off
  };
}

// ---------------------------------------------------------------------------
// Metropolis sampler over rho. A pool of independent walkers equilibrates at
// rho/Ne; each samplePoint() advances one walker several steps and emits its
// position. Asymptotically every emitted point is a true draw from the
// molecular density (verified statistically in the sim).

export function makeMoleculeSampler(mol, {
  walkerCount = 96,
  step = 0.45,       // proposal sigma, a0
  thin = 6,          // Metropolis steps between emissions
  burnIn = 260,      // steps per walker before first use
  rng = Math.random,
} = {}) {
  const rho = makeDensity(mol);
  const maxR = mol.maxR;
  const wx = new Float64Array(walkerCount);
  const wy = new Float64Array(walkerCount);
  const wz = new Float64Array(walkerCount);
  const wRho = new Float64Array(walkerCount);

  // Start walkers hugging random nuclei so burn-in is short.
  for (let w = 0; w < walkerCount; w++) {
    const at = mol.atoms[Math.floor(rng() * mol.atoms.length)];
    wx[w] = at.pos[0] + gauss(rng) * 0.7;
    wy[w] = at.pos[1] + gauss(rng) * 0.7;
    wz[w] = at.pos[2] + gauss(rng) * 0.7;
    wRho[w] = rho(wx[w], wy[w], wz[w]);
  }

  function advance(w, steps) {
    for (let s = 0; s < steps; s++) {
      const nx = wx[w] + gauss(rng) * step;
      const ny = wy[w] + gauss(rng) * step;
      const nz = wz[w] + gauss(rng) * step;
      if (nx * nx + ny * ny + nz * nz > maxR * maxR * 4) continue; // stray guard
      const nRho = rho(nx, ny, nz);
      if (nRho >= wRho[w] || rng() < nRho / (wRho[w] || 1e-300)) {
        wx[w] = nx; wy[w] = ny; wz[w] = nz; wRho[w] = nRho;
      }
    }
  }

  for (let w = 0; w < walkerCount; w++) advance(w, burnIn);
  let cursor = 0;

  return {
    molecule: mol,
    maxR,
    // Writes a genuine density sample into out[0..2] (a0) and returns the
    // index of the nearest atom (display coloring only — not physics).
    samplePoint(out) {
      const w = cursor;
      cursor = (cursor + 1) % walkerCount;
      advance(w, thin);
      out[0] = wx[w]; out[1] = wy[w]; out[2] = wz[w];
      let best = 0, bestD = Infinity;
      for (let a = 0; a < mol.atoms.length; a++) {
        const p = mol.atoms[a].pos;
        const d = (out[0] - p[0]) ** 2 + (out[1] - p[1]) ** 2 + (out[2] - p[2]) ** 2;
        if (d < bestD) { bestD = d; best = a; }
      }
      return best;
    },
  };
}

function gauss(rng) {
  // Box-Muller, one value per call.
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

// ---------------------------------------------------------------------------
// Ghost-shell isosurface: marching tetrahedra over a grid of the true
// density. Built at runtime from the same baked D that drives the swarm —
// nothing is shipped or faked. Returns { positions, indices } (a0 units).

export function buildIsoMesh(mol, { iso = 0.004, targetH = 0.34, maxDim = 40 } = {}) {
  const rho = makeDensity(mol);
  let ext = 0;
  for (const at of mol.atoms) ext = Math.max(ext, Math.hypot(at.pos[0], at.pos[1], at.pos[2]));
  const half = ext + 3.2;
  const dim = Math.min(maxDim, 2 * Math.ceil(half / targetH) + 1);
  const h = (2 * half) / (dim - 1);
  const origin = [-half, -half, -half];
  const values = new Float64Array(dim * dim * dim);
  let vi = 0;
  for (let k = 0; k < dim; k++) {
    for (let j = 0; j < dim; j++) {
      for (let i = 0; i < dim; i++) {
        values[vi++] = rho(origin[0] + i * h, origin[1] + j * h, origin[2] + k * h);
      }
    }
  }
  return marchingTets(values, dim, origin, h, iso);
}

// Six tetrahedra per cube sharing the 0-6 diagonal — consistent across
// neighboring cubes, so the surface is watertight.
const MT_CUBE = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const MT_TETS = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];

function marchingTets(values, dim, origin, h, iso) {
  const nx = dim, ny = dim, nz = dim;
  const gid = (i, j, k) => (k * ny + j) * nx + i;
  const positions = [], indices = [];
  const vertCache = new Map();

  function vertexOnEdge(a, b) {
    const key = a < b ? a * 16777216 + b : b * 16777216 + a;
    const hit = vertCache.get(key);
    if (hit !== undefined) return hit;
    const va = values[a], vb = values[b];
    const t = Math.max(0.001, Math.min(0.999, (iso - va) / (vb - va)));
    const ai = a % nx, aj = Math.floor(a / nx) % ny, ak = Math.floor(a / (nx * ny));
    const bi = b % nx, bj = Math.floor(b / nx) % ny, bk = Math.floor(b / (nx * ny));
    const index = positions.length / 3;
    positions.push(
      origin[0] + (ai + (bi - ai) * t) * h,
      origin[1] + (aj + (bj - aj) * t) * h,
      origin[2] + (ak + (bk - ak) * t) * h,
    );
    vertCache.set(key, index);
    return index;
  }

  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        for (const tet of MT_TETS) {
          const ids = tet.map((c) => {
            const [di, dj, dk] = MT_CUBE[c];
            return gid(i + di, j + dj, k + dk);
          });
          const inIds = ids.filter((id) => values[id] > iso);
          const outIds = ids.filter((id) => values[id] <= iso);
          if (inIds.length === 0 || inIds.length === 4) continue;
          if (inIds.length === 1) {
            indices.push(
              vertexOnEdge(inIds[0], outIds[0]),
              vertexOnEdge(inIds[0], outIds[1]),
              vertexOnEdge(inIds[0], outIds[2]),
            );
          } else if (inIds.length === 3) {
            indices.push(
              vertexOnEdge(inIds[0], outIds[0]),
              vertexOnEdge(inIds[1], outIds[0]),
              vertexOnEdge(inIds[2], outIds[0]),
            );
          } else {
            const v00 = vertexOnEdge(inIds[0], outIds[0]);
            const v01 = vertexOnEdge(inIds[0], outIds[1]);
            const v10 = vertexOnEdge(inIds[1], outIds[0]);
            const v11 = vertexOnEdge(inIds[1], outIds[1]);
            indices.push(v00, v01, v11, v00, v11, v10);
          }
        }
      }
    }
  }
  return { positions, indices };
}
