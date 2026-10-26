// Jabberwocky — THE TABLE. Every pull of the trigger rolls a tier, then a gag from that tier.
// Pure data; no DOM. core.js reads it, draw.js draws it, sound.js plays it.
//
//   tier    dispatch — kills what it hits
//           weird    — works, but not the way anyone meant
//           dud      — nothing, or nearly nothing
//           backfire — the rifle hurts you instead
//
//   kind    beam    instant line (hitscan)             bolt    flies straight
//           lob     arcs and lands (splash)            stream  many small things in a cone
//           area    appears at the aim point           drop    falls from the ceiling on the aim point
//           melee   a reach attack from the muzzle     train   drives straight down the aim, breaks walls
//           summon  a creature that hunts              self    happens to you
//           swap    trade places                       recurse fires another gag on landing
//           plate   nothing but the words
//
//   outcome how the victim goes (see OUTCOMES); scar = what stays on the floor until you leave the level.
//   cuts.js beside this file (written by the dev server from the weapon lab's TRASH verdicts) lists ids the roll
//   skips — core.js liveGags(). Delete a trashed gag from this table for real only at ship, on James's word.
(function () {
  const OUTCOMES = {
    squash:  { verb: 'SQUASHED',            dur: 1.6 },
    freeze:  { verb: 'FROZEN SOLID',        dur: 2.3 },
    glue:    { verb: 'GLUED TO THE FLOOR',  dur: 2.8 },
    gas:     { verb: 'GASSED',              dur: 2.1 },
    fling:   { verb: 'FLUNG',               dur: 1.6 },
    drop:    { verb: 'DROPPED DOWN A HOLE', dur: 1.2 },
    burn:    { verb: 'BURNED UP',           dur: 2.0 },
    chew:    { verb: 'CHEWED UP',           dur: 1.9 },
    gib:     { verb: 'SHREDDED',            dur: 1.0 },
    vapor:   { verb: 'VAPORIZED',           dur: 0.8 },
    expire:  { verb: 'DONE IN',             dur: 2.4 },
    shrink:  { verb: 'SHRUNK TO NOTHING',   dur: 1.9 },
    smother: { verb: 'SMOTHERED',           dur: 2.1 },
    inflate: { verb: 'POPPED',              dur: 2.3 },
    pacify:  { verb: 'PACIFIED',            dur: 0, lethal: false },
    scrap:   { verb: 'HELD UP',             dur: 0, lethal: false, fight: true },
    flee:    { verb: 'SCARED OFF',          dur: 2.4 },   // the doll (James 2026-10-26): they run away in terror and are gone — counted as a kill, no corpse   // the goose (James 2026-10-25): the victim stops to fight it, kills it in a shower of blood, and keeps coming
  };

  // scars: what the gag leaves behind. hazard = what it does to anyone standing in it
  const SCARS = {
    knives:    { r: 0.6 },
    blood:     { r: 0.55 },
    scorch:    { r: 0.7 },
    balls:     { r: 0.7 },
    pie:       { r: 0.6 },
    jello:     { r: 0.9, hazard: 'slow', slow: 0.45 },
    gas:       { r: 1.7, hazard: 'dps', dps: 9, life: 9 },
    feathers:  { r: 0.6 },
    glue:      { r: 1.0, hazard: 'slow', slow: 0.3 },
    fish:      { r: 0.8 },
    rails:     { r: 0.5 },
    lava:      { r: 1.1, hazard: 'dps', dps: 22, life: 14 },
    trap:      { r: 0.7 },
    hole:      { r: 0.69, hazard: 'fall', life: 12 },   /* 25% larger (James 2026-09-10); closes over after twelve seconds (James 2026-09-11, 'should eventually disappear') */
    gravel:    { r: 0.8 },
    purse:     { r: 0.4 },
    vines:     { r: 1.2, hazard: 'slow', slow: 0.5 },
    anvil:     { r: 0.5 },
    piano:     { r: 0.9 },
    cow:       { r: 0.9 },
    cat:       { r: 0.4 },
    snot:      { r: 0.8, hazard: 'slow', slow: 0.7 },
    legos:     { r: 1.0, hazard: 'dps', dps: 6 },
    quills:    { r: 0.6 },
    footprint: { r: 0.9 },
    gravy:     { r: 1.0, hazard: 'slow', slow: 0.5 },
    stink:     { r: 1.5, hazard: 'dps', dps: 5, life: 12 },
    crater:    { r: 1.1 },
    paper:     { r: 0.8 },
    frost:     { r: 0.8, hazard: 'slow', slow: 0.6 },
    cannonball:{ r: 0.4 },
    burrito:   { r: 0.5 },
    puddle:    { r: 0.7, hazard: 'slow', slow: 0.6 },
    machine:   { r: 0.6 },
    teeth:     { r: 0.5 },
    frogs:     { r: 0.9 },
    sink:      { r: 0.5 },
    chowder:   { r: 0.8 },
    herring:   { r: 0.4 },
    confetti:  { r: 0.9 },
    hairball:  { r: 0.3 },
    receipt:   { r: 0.7 },
    glitter:   { r: 1.0 },
    pins:      { r: 0.8 },
    rose:      { r: 0.3 },
    ring:      { r: 0.25 },
    cookie:    { r: 0.3 },
    flag:      { r: 0.4 },
    doll:      { r: 0.4 },
    tent:      { r: 0.9 },
  };

  const G = [];
  const add = (o) => { G.push(o); return o; };

  // ---------------------------------------------------------------- DISPATCH
  add({ id: 'bullet', name: 'A LASER BLAST', tier: 'dispatch', kind: 'beam', range: 14, outcome: 'expire', verb: 'LASERED', sprite: 'none', sound: 'gunshot', line: 'Pew. Just pew.' });   // was A BULLET; James 2026-09-08: 'it looks like a laser blast' (id kept: ranks/notes/verdicts key on it)
  add({ id: 'knives', name: 'A HAIL OF KNIVES', tier: 'dispatch', kind: 'bolt', count: 4, spread: 0.4, speed: 7, life: 2.8, hitR: 0.45, outcome: 'gib', verb: 'PERFORATED', sprite: 'knife', scar: 'knives', sound: 'knives', line: 'The cutlery drawer is empty now.' });
  add({ id: 'chainsaw', name: 'A FLYING CHAINSAW', tier: 'dispatch', kind: 'bolt', speed: 7, life: 2.2, hitR: 0.6, pierce: true, spin: true, outcome: 'gib', verb: 'SAWED IN HALF', sprite: 'chainsaw', scar: 'blood', sound: 'chainsaw', line: 'It was running. Of course it was running.' });
  add({ id: 'rocket', name: 'A ROCKET', tier: 'dispatch', kind: 'bolt', speed: 9, life: 2.5, hitR: 0.4, splash: 1.6, outcome: 'gib', verb: 'BLOWN UP', sprite: 'rocket', scar: 'scorch', sound: 'rocket', line: 'The classic.' });
  add({ id: 'baseballs', name: 'A HAIL OF BASEBALLS', tier: 'dispatch', kind: 'bolt', count: 20, spread: 0.7, speed: 10, speedVar: 0.9, life: 1.9, hitR: 0.45, outcome: 'expire', verb: 'BEANED', sprite: 'baseball', scar: 'balls', sound: 'baseballs', line: 'Heads up.' });
  add({ id: 'pie', name: 'A FROZEN BLUEBERRY PIE', tier: 'dispatch', kind: 'lob', speed: 7, arc: 1.2, splash: 0.9, outcome: 'freeze', verb: 'PIED', sprite: 'pie', scar: 'pie', sound: 'splat', splashSound: 'splat', line: 'Frozen. Not thawed. There is a difference.' });   // splashSound: what the landing plays instead of the explosion (2026-09-08)
  add({ id: 'sand', name: 'A GRAIN OF SAND AT ALMOST THE SPEED OF LIGHT', tier: 'dispatch', kind: 'beam', range: 60, pierce: true, walls: true, outcome: 'expire', verb: 'HOLED CLEAN THROUGH', sprite: 'none', sound: 'sand', flash: 1, line: 'You will hear the boom in a moment.' });
  add({ id: 'fist', name: 'A HUGE FIST', tier: 'dispatch', kind: 'melee', reach: 6.4, arc: 0.7, swingLife: 0.54, outcome: 'squash', verb: 'PUNCHED FLAT', sprite: 'fist', sound: 'thud', line: 'Whose fist? Nobody asks.' });
  add({ id: 'jello', name: 'A SMOTHERING BLAST OF JELLO', tier: 'dispatch', kind: 'lob', speed: 6, arc: 1.0, splash: 1.5, outcome: 'smother', sprite: 'jello', scar: 'jello', sound: 'jello', splashSound: 'splat', line: 'Lime. It is always lime.' });
  add({ id: 'flamethrower', name: 'A FLAMETHROWER', tier: 'dispatch', kind: 'stream', rate: 40, dur: 1.1, speed: 6, range: 4.5, hitR: 0.5, outcome: 'burn', sprite: 'flame', scar: 'scorch', sound: 'flame', line: 'Well, that is warm.' });
  add({ id: 'gas', name: 'POISON GAS', tier: 'dispatch', kind: 'area', mode: 'linger', r: 1.7, dur: 9, dps: 40, outcome: 'gas', sprite: 'gascloud', scar: 'gas', sound: 'gasss', line: 'Hold your breath. It is not going anywhere.' });
  add({ id: 'eagle', name: 'A RABID HARPY EAGLE', tier: 'dispatch', kind: 'summon', speed: 6.5, turn: 5, life: 5, hitR: 0.55, outcome: 'chew', verb: 'EATEN BY AN EAGLE', sprite: 'eagle', scar: 'feathers', sound: 'eagleattack',   /* his eagleattack.mp3 the moment the eagle flies out, nothing on the hit (James 2026-09-08, round four) */ line: 'Rabid. Somebody should tell the eagle.' });
  add({ id: 'glue', name: 'A FIREHOSE OF GLUE', tier: 'dispatch', kind: 'stream', rate: 40, dur: 1.6, speed: 7, range: 5, hitR: 0.5, jitter: 0.08, hose: true, outcome: 'glue', sprite: 'glueblob', scar: 'glue', sound: 'hose', line: 'Non-toxic. Very sticky.' });
  add({ id: 'piranhas', name: 'A STREAM OF LIVE PIRANHAS', tier: 'dispatch', kind: 'stream', rate: 22, dur: 1.4, speed: 6, range: 5, hitR: 0.5, jitter: 0.4, outcome: 'chew', verb: 'NIBBLED TO DEATH', sprite: 'piranha', scar: 'fish', sound: 'chomp', line: 'They are very much alive.' });
  add({ id: 'blackhole', name: 'A TINY BLACK HOLE', tier: 'dispatch', kind: 'area', mode: 'pull', r: 2.6, dur: 2.2, travel: 0.7,   /* flies out as a dark sphere for 0.7 s, then the disk opens (James 2026-09-10) */ pullsPlayer: 2.0, outcome: 'vapor', verb: 'SPAGHETTIFIED', sprite: 'blackhole', sound: 'blackhole', line: 'Tiny. Still a black hole.' });
  add({ id: 'train', name: 'A FREIGHT TRAIN', tier: 'dispatch', kind: 'train', speed: 9, breaks: 6, width: 0.8, outcome: 'squash', verb: 'RUN OVER BY A TRAIN', sprite: 'train', scar: 'rails', sound: 'train', line: 'It does not stop for walls either.' });
  add({ id: 'lava', name: 'LAVA', tier: 'dispatch', kind: 'stream', rate: 40, dur: 1.6, speed: 6, range: 5, hitR: 0.5, jitter: 0.08, hose: true, chunks: true, pools: 0.04,   /* 2026-09-10 James: a firehose of lava that arcs, chunks flying out where it pours */ outcome: 'burn', verb: 'MELTED', sprite: 'lavablob', scar: 'lava', sound: 'lava', line: 'The floor is lava now. Actually.' });
  add({ id: 'mousetrap', name: 'A GIANT MOUSETRAP', tier: 'dispatch', kind: 'area', mode: 'instant', r: 0.9, outcome: 'squash', verb: 'SNAPPED IN A TRAP', sprite: 'mousetrap', scar: 'trap', sound: 'snap', line: 'It was baited with a wheel of cheese.' });
  add({ id: 'hole', name: 'A HOLE', tier: 'dispatch', kind: 'area', mode: 'instant', r: 0.7, outcome: 'drop', verb: 'DROPPED', sprite: 'hole', scar: 'hole', sound: 'hole', deathSound: 'hole-death',   /* James's hole-death-01..04, one at random (2026-09-10) */ line: 'It goes down. Nobody knows how far.' });
  add({ id: 'kick', name: 'A DONKEY KICK', tier: 'dispatch', kind: 'melee', reach: 2.4, arc: 0.6, outcome: 'fling', verb: 'KICKED BY A DONKEY', sprite: 'hoof', sound: 'kick', line: 'The donkey is not shown. The donkey is implied.' });
  add({ id: 'tornado', name: 'A TORNADO', tier: 'dispatch', kind: 'area', mode: 'wander', r: 1.6, dur: 7, speed: 2.2, hurtsPlayer: 14, outcome: 'fling', verb: 'CARRIED OFF BY A TORNADO', sprite: 'tornado', sound: 'none', loop: 'tornado',   /* James's tornado.mp3 loops while it is on screen (2026-09-10) */ line: 'It will wander. Mind it.' });
  add({ id: 'gravel', name: 'A PULVERIZING ONSLAUGHT OF GRAVEL', tier: 'dispatch', kind: 'stream', rate: 48, dur: 1.2, speed: 9, range: 5, hitR: 0.45, outcome: 'squash', verb: 'PULVERIZED', sprite: 'rock',   /* 48/s: six Meshy pebbles, real meshes, half size, darker, half again as many (James 2026-09-10) */ scar: 'gravel', sound: 'gravel', line: 'Three-quarter inch. Crushed.' });
  add({ id: 'handbag', name: "A LADY'S HANDBAG, SWUNG BY A DISEMBODIED OLD LADY'S ARM", tier: 'dispatch', kind: 'melee', reach: 2.2, arc: 0.8, swingLife: 0.6, hold: 0.52, earlySound: true, outcome: 'expire', verb: 'PURSED', sprite: 'purse',   /* purse.mp3 the instant the trigger is pulled, the swing 0.8 s after it (James 2026-09-10) */ deathSound: 'none',   /* purse.mp3 has the yell in it — no scream on top (James 2026-09-10) */ scar: null, sound: 'purse',   /* no purse sticker on the floor: the real purse is in the hand (James 2026-09-10) */ line: 'She kept bricks in it.' });
  add({ id: 'vines', name: 'A BUNCH OF KILLER VINES', tier: 'dispatch', kind: 'area', mode: 'instant', r: 1.5, outcome: 'smother', longDeath: 3.4, deathSound: 'scream', verb: 'STRANGLED BY VINES',   /* a struggle and a yell for a second or two, then the crush (James 2026-09-10) */   /* 2026-09-10 James: coil up around the creature, pull it down and crush it (smother, rendered as coils) */ sprite: 'vines', scar: 'vines', sound: 'vines', line: 'They came up through the floor.' });
  add({ id: 'anvil', name: 'AN ANVIL', tier: 'dispatch', kind: 'drop', fallT: 0.55, splash: 0.7, outcome: 'squash', verb: 'ANVILED', sprite: 'anvil', scar: 'anvil', sound: 'clang', line: 'From where? Up.' });
  add({ id: 'piano', name: 'A PIANO', tier: 'dispatch', kind: 'drop', fallT: 0.7, splash: 1.1, outcome: 'squash', verb: 'FLATTENED BY A PIANO', sprite: 'piano', scar: 'piano', sound: 'piano', splashSound: 'pianocrash', line: 'A Steinway. Was.' });
  add({ id: 'bees', name: 'A SWARM OF ANGRY BEES', tier: 'dispatch', kind: 'summon', speed: 4.5, turn: 6, life: 9, hitR: 0.7, pierce: true, sting: 2.0, stingReach: 3.5,   /* sting = how long the swarm parks on a victim (NOT hold — hold is the pull-to-launch delay, which made a phantom first swarm, James 2026-09-11) */   /* the swarm keeps hunting for nine seconds, one creature after another (James 2026-09-11: 'they disappear too fast… used to swarm around the monsters') */ outcome: 'expire', verb: 'STUNG TO DEATH', sprite: 'bees', sound: 'buzz', line: 'They were having a bad day already.' });
  add({ id: 'lightning', name: 'A LIGHTNING BOLT', tier: 'dispatch', kind: 'beam', range: 12, chain: 2.6, outcome: 'expire', verb: 'ELECTROCUTED',   /* 2026-09-10 James: the shock first — a hop, arms out, the skeleton flickering through — then the fall */ sprite: 'none', sound: 'zap', flash: 0.6, scar: 'scorch', line: 'It jumps. Stand back.' });
  add({ id: 'cow', name: 'A COW', tier: 'dispatch', kind: 'lob', speed: 6, arc: 1.4, splash: 1.0, outcome: 'squash', verb: 'SQUASHED BY A COW', sprite: 'cow', scar: 'cow', sound: 'moo', line: 'The cow is fine. The cow is always fine.' });
  add({ id: 'wetcat', name: 'A WET CAT', tier: 'dispatch', kind: 'bolt', speed: 8, life: 1.6, hitR: 0.5, outcome: 'chew', verb: 'CLAWED TO RIBBONS', sprite: 'cat', scar: 'cat', sound: 'yowl', line: 'Nobody wanted this. Least of all the cat.' });
  add({ id: 'sneeze', name: 'A SNEEZE', tier: 'dispatch', kind: 'melee', reach: 3.6, arc: 0.9, outcome: 'fling', verb: 'SNEEZED ON', sprite: 'none', gust: true, scar: null, sound: 'sneeze',   /* 2026-09-10 James: no snot — a blast of wind, pale wisps in an expanding cone from the gun */ line: 'Bless it.' });
  add({ id: 'shrinkray', name: 'A SHRINK RAY', tier: 'dispatch', kind: 'beam', range: 10, outcome: 'shrink', verb: 'SHRUNK', sprite: 'none', sound: 'ray', flash: 0.3, line: 'Smaller. Smaller. Gone.' });
  add({ id: 'legos', name: 'AN AVALANCHE OF LEGOS', tier: 'dispatch', kind: 'drop', fallT: 1.3, splash: 1.3, outcome: 'expire',   /* 2026-09-11 James: out of the ceiling — a couple of hundred real bricks rain down and pile up (render3d brickRain) */ verb: 'DONE IN BY LEGOS', sprite: 'legos', scar: 'legos', sound: 'legos', line: 'Barefoot. Every last one of them.' });
  add({ id: 'porcupine', name: 'A PORCUPINE, FIRED LIKE A SHOTGUN', tier: 'dispatch', kind: 'bolt', speed: 9, life: 1.4, hitR: 0.5, splash: 1.0, outcome: 'gib', verb: 'QUILLED', sprite: 'porcupine', scar: 'quills', sound: 'porcupine', line: 'The porcupine did not consent.' });
  add({ id: 'sneaker', name: 'A VERY LARGE SNEAKER', tier: 'dispatch', kind: 'drop', fallT: 0.42, splash: 1.0, outcome: 'squash', verb: 'STEPPED ON', sprite: 'sneaker', scar: 'footprint', sound: 'stomp', line: 'Size 400.' });
  add({ id: 'gravy', name: 'A TIDAL WAVE OF GRAVY', tier: 'dispatch', kind: 'area', mode: 'wave', r: 0.9, range: 5, spread: 0.7, dur: 2.0, outcome: 'smother',   /* 2026-09-11 James: a thick lumpy fan out of the gun, low and slow, chicken gravy, steam (core wave zone + render3d gravyWave); the lob and the floor blob are gone */ verb: 'DROWNED IN GRAVY', sprite: 'gravy', scar: 'gravy', sound: 'gravy', line: 'Brown. Warm. Endless.' });
  add({ id: 'skunk', name: 'A SKUNK', tier: 'dispatch', kind: 'summon', speed: 3.5, turn: 4, life: 6, hitR: 0.6, cloud: 'stink', outcome: 'gas', verb: 'SKUNKED', sprite: 'skunk', scar: 'stink', sound: 'skunk', line: 'It will linger. So will the smell.' });
  add({ id: 'meteor', name: 'A METEOR', tier: 'dispatch', kind: 'drop', fallT: 0.8, splash: 1.8, outcome: 'burn', verb: 'HIT BY A METEOR', sprite: 'meteor', scar: 'crater', sound: 'meteor', flash: 0.8, line: 'Statistically overdue.' });
  add({ id: 'papercuts', name: 'A SWARM OF PAPER CUTS', tier: 'dispatch', kind: 'stream', rate: 45, dur: 1.2, speed: 8, range: 5, hitR: 0.5, outcome: 'gib', verb: 'PAPER-CUT TO DEATH', sprite: 'paper', scar: 'paper', sound: 'paper', line: 'Ten thousand of them. Each one tiny.' });
  add({ id: 'nitrogen', name: 'LIQUID NITROGEN', tier: 'dispatch', kind: 'stream', rate: 35, dur: 1.0, speed: 7, range: 4.5, hitR: 0.5, outcome: 'freeze', verb: 'FROZEN AND SHATTERED', sprite: 'frost', scar: 'frost', sound: 'nitrogen', line: 'Minus 320. Fahrenheit. Whatever.' });
  add({ id: 'goose', name: 'AN ANGRY GOOSE', tier: 'weird', kind: 'summon', speed: 5.5, turn: 6, life: 6, hitR: 0.55, outcome: 'scrap', fight: 2.8, verb: 'GOOSED', sprite: 'goose', scar: 'feathers', sound: 'honk', line: 'There is no such thing as a calm goose. There is such a thing as a dead one.' });   // 2026-10-25 James: a distraction — holds the victim 2.8 s (fight), then it dies in blood and the victim keeps coming
  add({ id: 'catbag', name: 'A BAG OF CATS', tier: 'dispatch', kind: 'lob', speed: 7, arc: 1.0, burst: { sprite: 'catball', count: 1, speed: 3.6, turn: 8, life: 6, hitR: 0.8 }, maul: 1.4, outcome: 'gib', verb: 'SHREDDED BY A BALL OF CATS', sprite: 'catbag', scar: 'cat', sound: 'catbag', line: 'Eight cats. One bag. Zero happiness.' });   // 2026-10-25 James: THE CAT BALL — the sack bursts into one writhing ball of claws (eight Meshy cats, Blender-jumbled) that rolls at the nearest creature and shreds it: blood, body parts, cat parts
  add({ id: 'cannonball', name: 'A CANNONBALL', tier: 'dispatch', kind: 'bolt', speed: 12, life: 1.6, hitR: 0.5, pierce: true, outcome: 'squash', verb: 'CANNONBALLED', sprite: 'cannonball', scar: 'cannonball', sound: 'cannon', line: 'Old school.' });
  add({ id: 'swatter', name: 'A GIANT FLY SWATTER', tier: 'dispatch', kind: 'melee', reach: 3.4, arc: 1.2, swingLife: 0.75, hitDelay: 0.3, outcome: 'squash', deathSound: 'splat', verb: 'SWATTED', sprite: 'swatter', sound: 'swat', line: 'Thwap.' });   // 2026-10-25 James: a Meshy swatter swung down from overhead (PROPS motion swat), the hit lands when the head hits the floor (hitDelay), a splat on the kill
  add({ id: 'slapfight', name: 'TWO HUNDRED SLAPS', tier: 'dispatch', kind: 'bolt', speed: 7, life: 1.3, hitR: 0.65, maul: 1.0, outcome: 'expire', deathSound: 'scream', verb: 'SLAPPED SILLY', sprite: 'slap', sound: 'slaps', line: 'The hand belongs to no one.' });   // 2026-10-25 James: a Meshy hand that flies forward slapping side to side like a fish tail; whatever it hits flies off the way it was hit, blood and a yell
  add({ id: 'burrito', name: 'A MICROWAVE BURRITO', tier: 'dispatch', kind: 'lob', speed: 8, arc: 0.6, splash: 0.7, outcome: 'burn', verb: 'SCALDED BY A BURRITO', sprite: 'burrito', scar: 'burrito', sound: 'sizzle', line: 'Frozen outside. The core is nineteen hundred degrees.' });
  add({ id: 'curse', name: 'EXPLOSIVE DIARRHEA (THEIRS)', tier: 'dispatch', kind: 'beam', range: 9, outcome: 'expire', longDeath: 3.6, deathSound: 'scream', verb: 'DONE IN FROM BEHIND', sprite: 'none', sound: 'curse', scar: 'puddle', line: 'We are so sorry.' });   // 2026-10-25 James: the brown stream from behind (render outcomeFx curse), lumps + entrails + steam in the puddle, a yell
  add({ id: 'vending', name: 'A VENDING MACHINE', tier: 'dispatch', kind: 'drop', fallT: 0.6, splash: 0.9, outcome: 'squash', verb: 'CRUSHED BY A VENDING MACHINE', sprite: 'vending', scar: 'machine', sound: 'vending', line: 'It ate the dollar first.' });
  add({ id: 'sumo', name: 'A SUMO WRESTLER', tier: 'dispatch', kind: 'summon', speed: 4.5, turn: 4, life: 6, hitR: 0.9, maul: 1.1, outcome: 'gib', verb: 'SPLATTED BY A SUMO', sprite: 'sumo', sound: 'sumoyell', earlySound: true, line: 'Yokozuna. Retired. Not that retired.' });
  add({ id: 'piledriver', name: 'A PILE DRIVER', tier: 'dispatch', kind: 'drop', fallT: 0.55, splash: 0.4, splashSound: 'piledriver', outcome: 'squash', deathSound: 'crunch', deathTrim: { hold: 0.4, fade: 0.2 }, verb: 'PILE-DRIVEN', sprite: 'piledriver', sound: 'none', line: 'Municipal grade.' });   // 2026-10-25 James: a Meshy drop-hammer ram on a cable out of the ceiling, a little bounce on the hit, his piledriver.mp3 AT the hit (the pull is silent)
  add({ id: 'drill', name: "A DENTIST'S DRILL", tier: 'dispatch', kind: 'summon', speed: 7, turn: 8, life: 4, hitR: 0.45, outcome: 'expire', verb: 'DRILLED', sprite: 'drill', scar: 'teeth', sound: 'drill', line: 'Open wide.' });
  add({ id: 'mosquitoes', name: 'A CLOUD OF MOSQUITOES', tier: 'dispatch', kind: 'summon', speed: 4, turn: 6, life: 7, hitR: 0.8, outcome: 'shrink', verb: 'DRAINED', sprite: 'mosquitoes', sound: 'whine', line: 'Every last drop.' });
  add({ id: 'doll', name: 'A HAUNTED DOLL', tier: 'dispatch', kind: 'summon', speed: 2.2, turn: 3, life: 8, hitR: 0.6, loop: 'creepydoll', maul: 1.3, splash: 2.4, splashSound: 'dollscream', outcome: 'flee', verb: 'SCARED OFF', sprite: 'doll', scar: 'doll', sound: 'none',   /* 2026-10-26 James: at the creature she holds a second (arms out, the scream clip when the rig lands), then bursts into flames (render boom/doll), dollscream.mp3, and everyone within 2.4 cells runs away and vanishes */ line: 'She walks slowly. She always gets there.' });
  add({ id: 'bus', name: 'THE BUS', tier: 'dispatch', kind: 'train', speed: 7, rev: 1.2, breaks: 0, width: 1.0, nose: 2.5, outcome: 'squash', deathSound: 'bushonk', verb: 'HIT BY THE BUS', sprite: 'mbtabus', sound: 'busrev', line: 'Route 9. Not in service.' });   // 2026-10-26 James: an MBTA-style Meshy bus at life size (PROPS mbtabus), busrev.mp3 as it appears, bushonk.mp3 as it hits each creature
  add({ id: 'cart', name: 'A SHOPPING CART', tier: 'dispatch', kind: 'bolt', speed: 7, life: 3, hitR: 0.55, bounce: true, outcome: 'fling', verb: 'CARTED', sprite: 'cart', sound: 'cart', line: 'One wheel wobbles. All of them, actually.' });
  add({ id: 'bowling', name: 'A BOWLING BALL', tier: 'dispatch', kind: 'bolt', speed: 8, life: 2.5, hitR: 0.5, pierce: true, roll: true, outcome: 'squash', deathSound: 'strike', verb: 'BOWLED OVER', sprite: 'bowling', scar: 'pins', sound: 'bowling', line: 'Strike.' });   // 2026-10-26 James: strike.mp3 on the hit
  add({ id: 'chowder', name: 'A BOWL OF BOILING CHOWDER', tier: 'dispatch', kind: 'lob', speed: 7, arc: 0.9, splash: 0.9, outcome: 'burn', verb: 'CHOWDERED', sprite: 'chowder', scar: 'chowder', sound: 'splat', line: 'New England. Obviously.' });
  add({ id: 'jack', name: 'A JACK-IN-THE-BOX', tier: 'dispatch', kind: 'lob', speed: 7, arc: 1.0, splash: 1.3, outcome: 'expire', verb: 'STARTLED TO DEATH', sprite: 'jackbox', sound: 'jackbox', line: 'Pop goes the weasel.' });
  add({ id: 'frogs', name: 'A RAIN OF FROGS', tier: 'dispatch', kind: 'drop', fallT: 0.6, splash: 1.4, outcome: 'smother', verb: 'BURIED IN FROGS', sprite: 'frogs', scar: 'frogs', sound: 'frogs', line: 'Biblical. Slightly.' });
  add({ id: 'sink', name: 'THE KITCHEN SINK', tier: 'dispatch', kind: 'drop', fallT: 0.5, splash: 0.8, outcome: 'squash', verb: 'SUNK', sprite: 'sink', scar: 'sink', sound: 'clang', line: 'Everything else was already fired.' });
  add({ id: 'yak', name: 'A YAK, BACKWARDS', tier: 'dispatch', kind: 'lob', speed: 5.5, arc: 1.3, splash: 1.0, outcome: 'squash', verb: 'YAKKED', sprite: 'yak', scar: 'cow', sound: 'moo', line: 'It went in the wrong way. It came out the wrong way.' });
  add({ id: 'ham', name: 'A CHRISTMAS HAM', tier: 'dispatch', kind: 'bolt', speed: 9, life: 1.5, hitR: 0.5, outcome: 'squash', verb: 'HAMMED', sprite: 'ham', sound: 'thud', line: 'Spiral cut. Glazed.' });
  add({ id: 'trombone', name: 'A TROMBONE SOLO', tier: 'dispatch', kind: 'melee', reach: 4, arc: 1.4, outcome: 'expire', verb: 'PLAYED TO DEATH', sprite: 'trombone', sound: 'trombone', line: 'Wah. Wah. Waaaah.' });
  add({ id: 'grandma', name: "SOMEBODY'S GRANDMA", tier: 'dispatch', kind: 'summon', speed: 2.8, turn: 3, life: 8, hitR: 0.7, outcome: 'expire', verb: 'PINCHED TO DEATH BY A GRANDMA', sprite: 'grandma', sound: 'grandma', line: 'She wants to know why you never call.' });
  add({ id: 'tent', name: 'THE WHOLE CIRCUS TENT', tier: 'dispatch', kind: 'drop', fallT: 0.9, splash: 2.2, outcome: 'smother', verb: 'TENTED', sprite: 'tent', scar: 'tent', sound: 'tent', line: 'The show is over.' });

  // ---------------------------------------------------------------- WEIRD
  add({ id: 'balloon', name: 'A BALLOON', tier: 'weird', kind: 'bolt', speed: 1.5, life: 7, hitR: 0.6, floats: true, wander: 1.4, wanderAfter: 0.7,   /* 2026-10-26 James: a real balloon (render prim), slower, erratic (wander = how hard its heading drifts) */ outcome: 'expire', altOutcome: 'pacify', altChance: 0.5, verb: 'STARTLED TO DEATH BY A BALLOON', sprite: 'balloon', sound: 'balloon', line: 'It pops. Somebody has a weak heart.' });
  add({ id: 'hairdryer', name: 'A HAIR DRYER', tier: 'weird', kind: 'melee', reach: 3, arc: 0.7, outcome: 'pacify', verb: 'GIVEN A BLOWOUT', sprite: 'hairdryer', sound: 'dryer', line: 'Look at that volume. They are done fighting.' });
  add({ id: 'rose', name: 'A SINGLE ROSE', tier: 'weird', kind: 'bolt', speed: 6, life: 2, hitR: 0.5, outcome: 'pacify', verb: 'MOVED TO TEARS', sprite: 'rose', scar: 'rose', sound: 'rose', line: 'They were not expecting kindness.' });
  add({ id: 'lovepotion', name: 'A LOVE POTION', tier: 'weird', kind: 'lob', speed: 7, arc: 1.0, splash: 1.2, outcome: 'pacify', verb: 'MADE TO FALL IN LOVE WITH A WALL', sprite: 'potion', sound: 'potion', line: 'They have found someone. It is the wall.' });
  add({ id: 'mirror', name: 'A MIRROR', tier: 'weird', kind: 'bolt', speed: 7, life: 2, hitR: 0.55, outcome: 'expire', altOutcome: 'pacify', altChance: 0.5, verb: 'SHOWN THEMSELVES', sprite: 'mirror', sound: 'mirror', line: 'Some scream. Some pose.' });
  add({ id: 'swap', name: 'A TRADE', tier: 'weird', kind: 'swap', range: 9, sprite: 'none', sound: 'swap', line: 'You are where they were. Think fast.' });
  add({ id: 'ring', name: 'A WEDDING RING', tier: 'weird', kind: 'bolt', speed: 7, life: 2, hitR: 0.5, outcome: 'vapor', verb: 'REFUSED', sprite: 'ring', scar: 'ring', sound: 'ring', line: 'They proposed. You said nothing. They left.' });
  add({ id: 'monkeypaw', name: "A MONKEY'S PAW", tier: 'weird', kind: 'lob', speed: 7, arc: 1.0, splash: 0.8, outcome: 'vapor', verb: 'WISHED AWAY', sprite: 'paw', sound: 'paw', line: 'They wished to be anywhere else. Granted.' });
  add({ id: 'audit', name: 'A TAX AUDIT', tier: 'weird', kind: 'bolt', speed: 7, life: 2.2, hitR: 0.55, outcome: 'expire', longDeath: 3.6, verb: 'AUDITED', sprite: 'envelope', sound: 'audit', line: 'Seven years of receipts. They have none.' });
  add({ id: 'wetwilly', name: 'A WET WILLY', tier: 'weird', kind: 'melee', reach: 1.8, arc: 0.6, outcome: 'pacify', altOutcome: 'expire', altChance: 0.4, verb: 'EMBARRASSED TO DEATH', sprite: 'finger', sound: 'wetwilly', line: 'A disembodied finger. Very wet.' });
  add({ id: 'cupcake', name: 'A CUPCAKE', tier: 'weird', kind: 'bolt', speed: 6, life: 2, hitR: 0.5, outcome: 'inflate', verb: 'FED A VERY RICH CUPCAKE', sprite: 'cupcake', sound: 'cupcake', line: 'They ate it. Give it a second.' });
  add({ id: 'karaoke', name: 'A KARAOKE MACHINE', tier: 'weird', kind: 'area', mode: 'instant', r: 2.4, outcome: 'pacify', verb: 'MADE TO SING', sprite: 'karaoke', sound: 'karaoke', line: 'Everyone nearby has a song in them.' });
  add({ id: 'littlerifle', name: 'A SMALLER JABBERWOCKY RIFLE', tier: 'weird', kind: 'recurse', speed: 6, arc: 1.0, sprite: 'rifle', sound: 'rifle', line: 'It fires on landing. At whatever.' });
  add({ id: 'yourmom', name: 'A VERY DISAPPOINTED MOTHER', tier: 'weird', kind: 'melee', reach: 3.5, arc: 1.2, outcome: 'pacify', altOutcome: 'expire', altChance: 0.35, verb: 'DISAPPOINTED TO DEATH', sprite: 'mother', sound: 'mother', line: 'She is not angry. That is the problem.' });
  add({ id: 'bagpipes', name: 'BAGPIPES', tier: 'weird', kind: 'area', mode: 'instant', r: 2.2, outcome: 'fling', altOutcome: 'pacify', altChance: 0.4, verb: 'PIPED', sprite: 'bagpipes', sound: 'bagpipes', line: 'Some flee. Some weep. All are moved.' });

  // ---------------------------------------------------------------- DUD
  add({ id: 'herring', name: 'A HERRING', tier: 'dud', kind: 'bolt', speed: 6, life: 1.6, hitR: 0.45, sprite: 'herring', scar: 'herring', sound: 'flop', line: 'It flopped.' });
  add({ id: 'confetti', name: 'CONFETTI', tier: 'dud', kind: 'drop', fallT: 1.5, splash: 1.2, splashSound: 'none', sprite: 'confetti', sound: 'confetti', line: 'Happy birthday, I guess.' });   // 2026-10-25 James: out of the ceiling — a drift of little squares and streamers around the creature, no harm, a clown horn + a slide whistle (render3d confettiRain; the floor streaks scar is gone)
  add({ id: 'bangflag', name: 'A FLAG THAT SAYS BANG', tier: 'dud', kind: 'plate', scar: 'flag', sprite: 'flag', sound: 'flag', line: 'It unfurled with real conviction.' });
  add({ id: 'feather', name: 'A FEATHER', tier: 'dud', kind: 'bolt', speed: 1.2, life: 6, hitR: 0.3, floats: true, sprite: 'feather', scar: 'feathers', sound: 'feather', line: 'It is still falling.' });
  add({ id: 'fortune', name: 'A FORTUNE COOKIE', tier: 'dud', kind: 'lob', speed: 6, arc: 1.0, splash: 0, scar: 'cookie', sprite: 'cookie', sound: 'cookie', fortunes: ['YOU WILL DIE IN A MAZE.', 'A GREAT FORTUNE AWAITS SOMEBODY ELSE.', 'THE RIFLE KNOWS WHAT IT DID.', 'HELP, I AM TRAPPED IN A COOKIE FACTORY.', 'YOUR LUCKY NUMBER IS THE ONE YOU JUST USED UP.', 'BEWARE OF COWS.'] });
  add({ id: 'hairball', name: 'A HAIRBALL', tier: 'dud', kind: 'plate', scar: 'hairball', sprite: 'hairball', sound: 'cough', line: 'The rifle coughed it up.' });
  add({ id: 'apology', name: 'A SINCERE APOLOGY', tier: 'dud', kind: 'plate', sprite: 'none', sound: 'sorry', line: 'The rifle is sorry. For everything. Genuinely.' });
  add({ id: 'receipt', name: 'A RECEIPT', tier: 'dud', kind: 'plate', scar: 'receipt', sprite: 'receipt', sound: 'receipt', line: 'For one (1) rifle. No returns.' });
  add({ id: 'glitter', name: 'A PUFF OF GLITTER', tier: 'dud', kind: 'melee', reach: 2, arc: 1.4, sprite: 'glitter', scar: 'glitter', sound: 'glitter', line: 'You will never get it all.' });
  add({ id: 'click', name: 'A CLICK', tier: 'dud', kind: 'plate', sprite: 'none', sound: 'click', line: 'Just the click.' });
  add({ id: 'thought', name: 'A THOUGHT', tier: 'dud', kind: 'plate', sprite: 'none', sound: 'hum', line: 'The rifle had a thought. It kept it to itself.' });

  // ---------------------------------------------------------------- BACKFIRE
  add({ id: 'recoil', name: 'A DONKEY KICK, BACKWARDS', tier: 'backfire', kind: 'self', dmg: 12, knock: 3.5, scene: 'donkey', kickAt: 1.6, sceneDur: 3.2, downClicks: 6, sceneDist: 0.95, sprite: 'donkey', sound: 'none', line: 'Same donkey. Other end.' });   // 2026-10-26 James: a Meshy donkey appears, neighs (horseneigh.mp3), back-kicks (horsekick.mp3) — you go down looking at the ceiling and click six times to get up
  add({ id: 'boomerang', name: 'A BOOMERANG', tier: 'backfire', kind: 'bolt', speed: 7, life: 4.5, hitR: 0.5, returns: 1.2, curve: 1.4, miss: true, selfDmg: 15,   /* 2026-10-26 James: flies out on a curve, misses, curves back and hits you in the face */ outcome: 'expire', verb: 'BOOMERANGED', sprite: 'boomerang', sound: 'boomerang', line: 'It comes back. Move.' });
  add({ id: 'sneezeback', name: 'A SNEEZE, ON YOU', tier: 'backfire', kind: 'self', dmg: 6, effect: 'snot', dur: 3.5, sprite: 'snotblast', sound: 'sneeze', line: 'Bless you.' });
  add({ id: 'wrongway', name: 'A ROCKET, THE OTHER WAY', tier: 'backfire', kind: 'bolt', backwards: true, speed: 9, life: 2, hitR: 0.4, splash: 1.5, selfSplash: 10, outcome: 'gib', verb: 'ROCKETED', sprite: 'rocket', scar: 'scorch', sound: 'rocket', line: 'If something was behind you, congratulations.' });
  add({ id: 'anvilyou', name: 'AN ANVIL, ON YOU', tier: 'backfire', kind: 'self', dmg: 15, effect: 'lump', dur: 1.5, sprite: 'anvil', sound: 'clang', line: 'That is a lump.' });
  add({ id: 'beesyou', name: 'BEES, ON YOU', tier: 'backfire', kind: 'self', dmg: 10, effect: 'bees', dur: 3, sprite: 'bees', sound: 'buzz', line: 'Not the bees.' });
  add({ id: 'hiccup', name: 'A HICCUP', tier: 'backfire', kind: 'self', dmg: 0, effect: 'teleport', sprite: 'none', sound: 'hiccup', line: 'You are somewhere else now.' });
  add({ id: 'playdead', name: 'THE RIFLE IS PLAYING DEAD', tier: 'backfire', kind: 'self', dmg: 0, effect: 'dead', dur: 2.4, sprite: 'none', sound: 'playdead', line: 'It will get up. Eventually.' });
  add({ id: 'confusion', name: 'A SPIN', tier: 'backfire', kind: 'self', dmg: 0, effect: 'spin', dur: 1.2, sprite: 'none', sound: 'spin', line: 'The rifle turned you around. Where were you going?' });

  const TIERS = ['dispatch', 'weird', 'dud', 'backfire'];
  const byId = {};
  for (const g of G) byId[g.id] = g;

  globalThis.JABBERWOCKY_GAGS = { GAGS: G, byId, OUTCOMES, SCARS, TIERS };
})();
