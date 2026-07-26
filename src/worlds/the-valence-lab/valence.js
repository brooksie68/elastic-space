// The Valence Lab — the valence engine. Octet/duet accounting that decides
// what the scope's contents can become. Pure ESM, zero imports — shared
// verbatim with tmp/the-valence-lab/molecule-sim.mjs.
//
// Honesty notes baked into the copy: refusals never claim a compound cannot
// exist — only that this scope has no calibration for it. The one place the
// classic Lewis picture lies (O2's two unpaired electrons) is called out,
// not painted over.

const SUBS = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
const ORDER = ['C', 'H', 'N', 'O', 'Ne', 'Ar']; // Hill order, for transient mixes

// Recipe ids match the baked records in assets/molecules-data.js.
// `display` is the conventional formula (Hill order butchers NH3 and H2O).
// `path` is a TRAP-SAFE feeding order for the recipe book: bonding is
// instant, so any prefix that exactly matches a smaller recipe (H+H -> H2,
// O+O -> O2) ends the run early. Every path is asserted in molecule-sim.
// lewis: per-element shared-pair and lone-pair counts (every atom of that
// element is equivalent in all nine of these molecules).
export const RECIPES = [
  { id: 'H2', name: 'dihydrogen', display: 'H₂', formula: { H: 2 },
    path: ['H', 'H'],
    lewis: { H: { bonds: 1, lonePairs: 0 } } },
  { id: 'N2', name: 'dinitrogen', display: 'N₂', formula: { N: 2 },
    path: ['N', 'N'],
    lewis: { N: { bonds: 3, lonePairs: 1 } } },
  { id: 'O2', name: 'dioxygen', display: 'O₂', formula: { O: 2 }, unpaired: 2,
    path: ['O', 'O'],
    lewis: { O: { bonds: 2, lonePairs: 2 } },
    note: 'the Lewis picture pairs everything — the real O₂ keeps two electrons unpaired (a triplet; liquid O₂ sticks to magnets)' },
  { id: 'H2O', name: 'water', display: 'H₂O', formula: { H: 2, O: 1 },
    path: ['O', 'H', 'H'],
    lewis: { O: { bonds: 2, lonePairs: 2 }, H: { bonds: 1, lonePairs: 0 } } },
  { id: 'CO2', name: 'carbon dioxide', display: 'CO₂', formula: { C: 1, O: 2 },
    path: ['C', 'O', 'O'],
    lewis: { C: { bonds: 4, lonePairs: 0 }, O: { bonds: 2, lonePairs: 2 } } },
  { id: 'CH4', name: 'methane', display: 'CH₄', formula: { C: 1, H: 4 },
    path: ['C', 'H', 'H', 'H', 'H'],
    lewis: { C: { bonds: 4, lonePairs: 0 }, H: { bonds: 1, lonePairs: 0 } } },
  { id: 'NH3', name: 'ammonia', display: 'NH₃', formula: { N: 1, H: 3 },
    path: ['N', 'H', 'H', 'H'],
    lewis: { N: { bonds: 3, lonePairs: 1 }, H: { bonds: 1, lonePairs: 0 } } },
  { id: 'H2O2', name: 'hydrogen peroxide', display: 'H₂O₂', formula: { H: 2, O: 2 },
    path: ['H', 'O', 'O', 'H'],
    lewis: { O: { bonds: 2, lonePairs: 2 }, H: { bonds: 1, lonePairs: 0 } } },
  { id: 'C2H4', name: 'ethylene', display: 'C₂H₄', formula: { C: 2, H: 4 },
    path: ['C', 'C', 'H', 'H', 'H', 'H'],
    lewis: { C: { bonds: 4, lonePairs: 0 }, H: { bonds: 1, lonePairs: 0 } } },
];

export const NOBLE_TEXT = {
  Ne: 'neon arrives with its shell already closed — a full octet wants nothing. it goes back to the vial as it came.',
  Ar: 'argon’s outer shell is full: eight electrons, zero appetite. back to the vial.',
};

// --- contents helpers -------------------------------------------------------

export function addAtom(contents, symbol) {
  const next = { ...contents };
  next[symbol] = (next[symbol] || 0) + 1;
  return next;
}

export function countAtoms(contents) {
  return Object.values(contents).reduce((a, b) => a + b, 0);
}

export function displayFormula(contents) {
  let s = '';
  for (const sym of ORDER) {
    const c = contents[sym];
    if (!c) continue;
    s += sym + (c > 1 ? String(c).split('').map((d) => SUBS[d]).join('') : '');
  }
  return s;
}

function isSubset(contents, formula) {
  for (const [sym, c] of Object.entries(contents)) {
    if ((formula[sym] || 0) < c) return false;
  }
  return true;
}

function isExact(contents, formula) {
  const keys = new Set([...Object.keys(contents), ...Object.keys(formula)]);
  for (const k of keys) if ((contents[k] || 0) !== (formula[k] || 0)) return false;
  return true;
}

export function matchComplete(contents) {
  return RECIPES.find((r) => isExact(contents, r.formula)) || null;
}

// Recipes this partial fill could still become, nearest first.
export function completions(contents) {
  return RECIPES
    .filter((r) => isSubset(contents, r.formula) && !isExact(contents, r.formula))
    .map((r) => {
      const missing = {};
      let missingCount = 0;
      for (const [sym, c] of Object.entries(r.formula)) {
        const need = c - (contents[sym] || 0);
        if (need > 0) { missing[sym] = need; missingCount += need; }
      }
      return { recipe: r, missing, missingCount };
    })
    .sort((a, b) => a.missingCount - b.missingCount);
}

export function hintText(contents) {
  const comps = completions(contents).slice(0, 3);
  return comps.map(({ recipe, missing }) => {
    const parts = Object.entries(missing).map(([sym, c]) => `${c > 1 ? c + '×' : ''}${sym}`);
    return `+${parts.join(' +')} → ${recipe.name}`;
  }).join('  ·  ');
}

// --- the verdict ------------------------------------------------------------
// tryAdd(contents, symbol) decides what happens when a vial is clicked.
//   { ok: true, formed: recipe, contents }        — a molecule snaps together
//   { ok: true, contents, hints }                 — atom accepted, still open
//   { ok: false, reason, text }                   — refused, atom returns
// reasons: 'noble' | 'saturated' | 'no-recipe'

export function tryAdd(contents, symbol) {
  if (NOBLE_TEXT[symbol]) {
    return { ok: false, reason: 'noble', text: NOBLE_TEXT[symbol] };
  }
  const already = matchComplete(contents);
  if (already) {
    return {
      ok: false,
      reason: 'saturated',
      text: `${already.name} is saturated — every valence electron is spoken for. flush the scope to bond anew.`,
    };
  }
  const next = addAtom(contents, symbol);
  const formed = matchComplete(next);
  if (formed) return { ok: true, formed, contents: next };
  const comps = completions(next);
  if (comps.length > 0) {
    return { ok: true, contents: next, hints: hintText(next) };
  }
  return {
    ok: false,
    reason: 'no-recipe',
    text: `no calibration here for ${displayFormula(next)} — some such compounds exist in nature, but this scope holds only nine recipes.`,
  };
}

// Octet/duet bookkeeping line for the readout, e.g.
// "O: 2 shared pairs + 2 lone pairs = 8  ·  H: 1 shared pair = 2".
export function accountingLines(recipe) {
  return Object.entries(recipe.lewis).map(([sym, { bonds, lonePairs }]) => {
    const total = 2 * bonds + 2 * lonePairs;
    const pieces = [`${bonds} shared pair${bonds === 1 ? '' : 's'}`];
    if (lonePairs > 0) pieces.push(`${lonePairs} lone pair${lonePairs === 1 ? '' : 's'}`);
    return `${sym}: ${pieces.join(' + ')} = ${total}`;
  });
}
