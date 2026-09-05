// The Valence Lab — plain-English exhibit copy. This is NOT physics: it is
// display text for a curious, intelligent visitor who has never taken a
// chemistry class. Every acronym/shorthand the science modules use (1s, 2p,
// "valence", "lone pair"...) gets explained here in words before it's shown.
// Pure ESM, zero imports — never let this module drift into orbitals.js/
// density.js/valence.js (those stay physics-only per the honesty contract).
// Nothing here is asserted by the sims because nothing here is a number —
// it's prose. If a paragraph ever states a number (bond counts, %, etc.) it
// must match what valence.js / orbitals.js actually compute.

// ---------------------------------------------------------------------------
// Subshell "letter" meanings — s and p are all this lab ever fills (through
// argon, only s and p subshells are occupied).

export const SUBSHELL_TYPE = {
  s: {
    shapeName: 'a ball',
    historicName: 'sharp',
    blurb: 'An "s" cloud is shaped like a plain ball centered on the nucleus — '
      + 'the electron could turn up in any direction, it just gets less likely '
      + 'the further out you look. Every shell has exactly one s cloud, and it '
      + 'holds at most 2 electrons.',
  },
  p: {
    shapeName: 'a dumbbell',
    historicName: 'principal',
    blurb: 'A "p" cloud is shaped like a dumbbell — two lobes on opposite sides '
      + 'of the nucleus, with an empty gap right through the middle. There are '
      + 'three of these per shell, pointing in three different directions (call '
      + 'them x, y, z), so together they hold at most 6 electrons.',
  },
};

export const LETTER_ORIGIN_NOTE = 's, p, d, f are leftover labels from 19th-century '
  + 'spectroscopy — scientists were naming lines they saw through a prism '
  + '("sharp", "principal", "diffuse", "fundamental"), decades before anyone '
  + 'knew what an electron cloud even was. The shapes came later, once quantum '
  + 'mechanics explained what those lines actually meant.';

const ORDINAL = ['first', 'second', 'third', 'fourth'];

// Groups an element's raw `fill` (e.g. {'1s':2,'2s':2,'2p':6}) into shells by
// principal quantum number n, with plain labels. Pure data reshaping — the
// numbers themselves come straight from orbitals.js's ELEMENTS.
export function shellBreakdown(el) {
  const byN = new Map();
  for (const key of Object.keys(el.fill)) {
    const n = +key[0];
    const letter = key[1];
    const count = el.fill[key];
    if (!byN.has(n)) byN.set(n, { n, subshells: [], total: 0 });
    const shell = byN.get(n);
    shell.subshells.push({ key, letter, count });
    shell.total += count;
  }
  const ns = [...byN.keys()].sort((a, b) => a - b);
  const maxN = Math.max(...ns);
  return ns.map((n) => {
    const shell = byN.get(n);
    return {
      ...shell,
      ordinal: ORDINAL[n - 1] || `${n}th`,
      capacity: n === 1 ? 2 : 8, // this lab never fills a d subshell
      isOuter: n === maxN,
    };
  });
}

// ---------------------------------------------------------------------------
// Reactivity, in plain terms — shown right alongside the valence count.

export function reactivityBlurb(el) {
  const { symbol, name, seeking, valence, capacity } = el;
  if (seeking === 0) {
    return `${name}'s outer shell is completely full — ${valence} of ${capacity} `
      + `possible electrons, no vacancies. There's no room to share or steal, so `
      + `${name.toLowerCase()} mostly ignores everything around it. Chemists call `
      + `that "inert," or a "noble" element.`;
  }
  if (symbol === 'C') {
    return `${name} has exactly ${valence} of ${capacity} outer electrons — precisely `
      + `half. That balance means it doesn't strongly want to give electrons away `
      + `or steal them; instead it shares evenly, forming up to ${seeking} bonds at `
      + `once in almost any direction. That knack for even sharing is why carbon `
      + `builds chains, rings, and the entire chemistry of life.`;
  }
  if (seeking === 1) {
    return `${name} has ${valence} of ${capacity} outer electrons — just one short `
      + `of full. That makes it eager to grab, share, or give away that one `
      + `electron, which is why it bonds so readily and turns up in more `
      + `compounds than almost anything else.`;
  }
  return `${name} has ${valence} of ${capacity} outer electrons — ${seeking} short `
    + `of a full shell. That gap makes it reactive: it tends to share or grab `
    + `${seeking} more electron${seeking > 1 ? 's' : ''} from other atoms until its `
    + `outer shell is full.`;
}

// ---------------------------------------------------------------------------
// "What is this?" overview paragraphs — one per staged element, one per
// bonded molecule. Written for a smart high-schooler with zero chemistry
// background yet.

export const ELEMENT_OVERVIEW = {
  H: 'Hydrogen is the simplest, lightest, and most abundant element in the '
    + 'universe — one proton, one electron, and (in its common form) no '
    + 'neutrons at all. It was almost certainly the first element to exist, '
    + 'formed moments after the Big Bang, and stars have been fusing it into '
    + 'heavier elements ever since — that fusion is what makes the Sun shine. '
    + "On Earth it almost never sits alone — it's too eager to bond, most "
    + 'famously with oxygen to make water.',
  C: "Carbon is the backbone of every living thing you've ever met, including "
    + 'you. Its trick is a perfectly balanced outer shell — see the valence '
    + 'note below — which lets it form four strong bonds in almost any '
    + 'direction at once. That flexibility means carbon can build long chains, '
    + 'branching trees, and closed rings: the sugar in your coffee, the '
    + 'diamond in a ring, and the graphite in a pencil are all just carbon '
    + 'arranged differently.',
  N: 'Nitrogen makes up about 78% of the air you just breathed — yet it is so '
    + 'stubbornly unreactive in that form (two nitrogens locked in one of the '
    + "strongest bonds in chemistry) that most living things can't use it "
    + 'directly; farmers add "fixed" nitrogen as fertilizer for exactly this '
    + 'reason. Break that bond open, though, and nitrogen becomes essential — '
    + 'a building block of every protein and every strand of DNA.',
  O: "Oxygen is the reason fire burns and the reason you're alive — every "
    + 'breath pulls it into your blood to help burn fuel for energy. It is '
    + 'hungry for electrons (see the valence note below), which makes it one '
    + 'of the most reactive common elements around. Two oxygen atoms give you '
    + 'the O₂ you breathe; bond it to hydrogen and you get water.',
  Ne: "Neon is a noble gas: its outer shell is already perfectly full, so it "
    + 'has zero interest in bonding with anything else. That standoffishness '
    + 'is exactly why it is useful — neon glows a distinctive reddish-orange '
    + 'when electricity excites it inside a glass tube, and because it '
    + "won't react with the glass, the metal contacts, or the air, that glow "
    + "lasts for decades. It's rare on Earth but common in stars.",
  Ar: 'Argon is another noble gas, and far more common than you might think — '
    + 'almost 1% of the air around you, more than carbon dioxide. Its outer '
    + 'shell is completely full, so like neon it refuses to react with almost '
    + 'anything. That inertness is put to work anywhere you need to keep '
    + "something FROM reacting — welders flood the air around a weld with "
    + "argon so the hot metal doesn't grab oxygen and oxidize.",
};

export const MOLECULE_OVERVIEW = {
  H2: 'Two hydrogen atoms share their one electron each, pooling them into a '
    + 'single bond and completing both atoms’ outer shells at once — the '
    + 'simplest possible molecule. Hydrogen gas is what rockets burn (with '
    + 'oxygen) to reach orbit, and some see it as a future clean fuel, since '
    + 'burning it just makes water.',
  N2: 'Two nitrogen atoms share three pairs of electrons — a triple bond, one '
    + 'of the toughest in all of chemistry. That is the main reason the '
    + 'nitrogen in our air stays locked up and unreactive; breaking that bond '
    + 'takes serious energy, which is exactly what lightning, and industrial '
    + 'fertilizer plants, do.',
  O2: 'Two oxygen atoms bond together, but not as neatly as the tidy diagrams '
    + 'suggest — real O₂ keeps two electrons unpaired instead of pairing '
    + 'everything up (a "triplet"). That quirk is why liquid oxygen is '
    + 'actually slightly magnetic, something the standard textbook picture '
    + "doesn't show at all — see the note below.",
  H2O: 'One oxygen shares one electron with each of two hydrogens. Oxygen '
    + 'pulls harder on those shared electrons than hydrogen does, so the '
    + 'molecule ends up lopsided — slightly negative near the oxygen, '
    + 'slightly positive near the hydrogens. That imbalance is why water '
    + 'molecules stick to each other, why water has surface tension, and '
    + 'ultimately why life as we know it needs water to work.',
  CO2: 'One carbon sits in the middle, double-bonded to an oxygen on each '
    + 'side, in a dead straight line. It’s what you just exhaled, what '
    + 'plants breathe in to grow, and the molecule most responsible for '
    + "trapping heat in Earth's atmosphere.",
  CH4: "One carbon shares an electron with each of four hydrogens, filling "
    + "carbon's outer shell in a perfectly symmetric shape — picture four legs "
    + 'of a tripod, evenly spread in 3D. It’s the main ingredient in '
    + 'natural gas, and it’s also produced by cows, wetlands, and '
    + 'landfills.',
  NH3: "One nitrogen shares an electron with each of three hydrogens, but "
    + "nitrogen's fourth pair of outer electrons stays unshared — a \"lone "
    + 'pair." That leftover pair gives ammonia a lopsided, almost pyramid '
    + 'shape and the sharp smell you’d recognize from window cleaner.',
  H2O2: 'Two oxygens bond to each other, each also holding onto one hydrogen '
    + '— like water, but with a second oxygen wedged into the middle. That '
    + 'extra oxygen-oxygen bond is unstable and breaks apart easily, '
    + 'releasing a burst of reactive oxygen — exactly why peroxide fizzes on '
    + 'a cut, and why it can decompose dramatically (see: elephant '
    + 'toothpaste).',
  C2H4: 'Two carbons share not one but two pairs of electrons between them — '
    + 'a double bond — while each carbon also bonds to two hydrogens. That '
    + 'double bond is a little unstable compared to a single one, which is '
    + 'exactly why ethylene is so useful industrially: crack it open and the '
    + 'carbons will happily link into long chains, forming polyethylene — the '
    + 'plastic in shopping bags and milk jugs.',
};

// Small, tasteful hook line per recipe for the "try this" panel.
export const MOLECULE_HOOK = {
  H2: 'rocket fuel’s other half',
  N2: 'the stuff you’re breathing, mostly',
  O2: 'the stuff keeping you alive right now',
  H2O: 'the classic — start here',
  CO2: 'what you just exhaled',
  CH4: 'natural gas',
  NH3: 'smells like the cleaning aisle',
  H2O2: 'fizzes on a cut',
  C2H4: 'becomes plastic bags',
};

// ---------------------------------------------------------------------------
// Viewing modes — what am I actually looking at, and why are there three.

export const VIEW_MODE_TEXT = {
  swarm: 'Every glowing point is one honest "measurement" — a random sample '
    + 'of the real math (a wavefunction) describing where the electron could '
    + 'be caught if you looked right now. No single point IS the electron; '
    + 'the electron is really the whole spread of points at once. Good for '
    + 'seeing individual electron positions.',
  fog: 'The exact same measurements as Swarm — same points, same math — just '
    + 'drawn bigger and softer so they blend into one continuous haze instead '
    + 'of separate dots. This is closer to the fuzzy "electron cloud" picture '
    + 'in most textbooks. Good for seeing the overall shape at a glance.',
  shells: 'A solid, glassy boundary showing roughly where each type of cloud '
    + 'lives — a ball for an s cloud, a dumbbell for a p cloud. Unlike Swarm '
    + "or Fog, this isn't a measurement — it's a guide to the shape hiding "
    + 'underneath all those glowing points. Fade it up to see the shape '
    + 'clearly; fade it back down to watch the electrons again.',
};
