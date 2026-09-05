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
//           melee   a reach attack from the muzzle     train   sweeps the row, breaks walls
//           summon  a creature that hunts              self    happens to you
//           swap    trade places                       recurse fires another gag on landing
//           plate   nothing but the words
//
//   outcome how the victim goes (see OUTCOMES); scar = what stays on the floor until you leave the level.
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
    hole:      { r: 0.55, hazard: 'fall' },
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
  add({ id: 'bullet', name: 'A BULLET', tier: 'dispatch', kind: 'beam', range: 14, outcome: 'expire', verb: 'SHOT', sprite: 'none', sound: 'gunshot', line: 'Just a bullet. Huh.' });
  add({ id: 'knives', name: 'A HAIL OF KNIVES', tier: 'dispatch', kind: 'bolt', count: 9, spread: 0.5, speed: 11, life: 1.6, hitR: 0.45, outcome: 'gib', verb: 'PERFORATED', sprite: 'knife', scar: 'knives', sound: 'knives', line: 'The cutlery drawer is empty now.' });
  add({ id: 'chainsaw', name: 'A FLYING CHAINSAW', tier: 'dispatch', kind: 'bolt', speed: 7, life: 2.2, hitR: 0.6, pierce: true, spin: true, outcome: 'gib', verb: 'SAWED IN HALF', sprite: 'chainsaw', scar: 'blood', sound: 'chainsaw', line: 'It was running. Of course it was running.' });
  add({ id: 'rocket', name: 'A ROCKET', tier: 'dispatch', kind: 'bolt', speed: 9, life: 2.5, hitR: 0.4, splash: 1.6, outcome: 'gib', verb: 'BLOWN UP', sprite: 'rocket', scar: 'scorch', sound: 'rocket', line: 'The classic.' });
  add({ id: 'baseballs', name: 'A HAIL OF BASEBALLS', tier: 'dispatch', kind: 'bolt', count: 12, spread: 0.6, speed: 10, life: 1.5, hitR: 0.45, outcome: 'expire', verb: 'BEANED', sprite: 'baseball', scar: 'balls', sound: 'baseballs', line: 'Heads up.' });
  add({ id: 'pie', name: 'A FROZEN BLUEBERRY PIE', tier: 'dispatch', kind: 'lob', speed: 7, arc: 1.2, splash: 0.9, outcome: 'freeze', verb: 'PIED', sprite: 'pie', scar: 'pie', sound: 'splat', line: 'Frozen. Not thawed. There is a difference.' });
  add({ id: 'sand', name: 'A GRAIN OF SAND AT ALMOST THE SPEED OF LIGHT', tier: 'dispatch', kind: 'beam', range: 60, pierce: true, walls: true, outcome: 'vapor', verb: 'ATOMIZED', sprite: 'none', sound: 'sand', flash: 1, line: 'You will hear the boom in a moment.' });
  add({ id: 'fist', name: 'A HUGE FIST', tier: 'dispatch', kind: 'melee', reach: 3.2, arc: 0.7, outcome: 'squash', verb: 'PUNCHED FLAT', sprite: 'fist', sound: 'thud', line: 'Whose fist? Nobody asks.' });
  add({ id: 'jello', name: 'A SMOTHERING BLAST OF JELLO', tier: 'dispatch', kind: 'lob', speed: 6, arc: 1.0, splash: 1.5, outcome: 'smother', sprite: 'jello', scar: 'jello', sound: 'jello', line: 'Lime. It is always lime.' });
  add({ id: 'flamethrower', name: 'A FLAMETHROWER', tier: 'dispatch', kind: 'stream', rate: 40, dur: 1.1, speed: 6, range: 4.5, hitR: 0.5, outcome: 'burn', sprite: 'flame', scar: 'scorch', sound: 'flame', line: 'Well, that is warm.' });
  add({ id: 'gas', name: 'POISON GAS', tier: 'dispatch', kind: 'area', mode: 'linger', r: 1.7, dur: 9, dps: 40, outcome: 'gas', sprite: 'gascloud', scar: 'gas', sound: 'hiss', line: 'Hold your breath. It is not going anywhere.' });
  add({ id: 'eagle', name: 'A RABID HARPY EAGLE', tier: 'dispatch', kind: 'summon', speed: 6.5, turn: 5, life: 5, hitR: 0.55, outcome: 'chew', verb: 'EATEN BY AN EAGLE', sprite: 'eagle', scar: 'feathers', sound: 'screech', line: 'Rabid. Somebody should tell the eagle.' });
  add({ id: 'glue', name: 'A FIREHOSE OF GLUE', tier: 'dispatch', kind: 'stream', rate: 30, dur: 1.3, speed: 7, range: 5, hitR: 0.5, outcome: 'glue', sprite: 'glueblob', scar: 'glue', sound: 'hose', line: 'Non-toxic. Very sticky.' });
  add({ id: 'piranhas', name: 'A STREAM OF LIVE PIRANHAS', tier: 'dispatch', kind: 'stream', rate: 18, dur: 1.4, speed: 6, range: 5, hitR: 0.5, outcome: 'chew', verb: 'NIBBLED TO DEATH', sprite: 'piranha', scar: 'fish', sound: 'chomp', line: 'They are very much alive.' });
  add({ id: 'blackhole', name: 'A TINY BLACK HOLE', tier: 'dispatch', kind: 'area', mode: 'pull', r: 2.6, dur: 1.8, pullsPlayer: 2.0, outcome: 'vapor', verb: 'SPAGHETTIFIED', sprite: 'blackhole', sound: 'blackhole', line: 'Tiny. Still a black hole.' });
  add({ id: 'train', name: 'A FREIGHT TRAIN', tier: 'dispatch', kind: 'train', speed: 9, breaks: 6, width: 0.8, outcome: 'squash', verb: 'RUN OVER BY A TRAIN', sprite: 'train', scar: 'rails', sound: 'train', line: 'It does not stop for walls either.' });
  add({ id: 'lava', name: 'LAVA', tier: 'dispatch', kind: 'lob', speed: 6, arc: 0.8, splash: 1.1, outcome: 'burn', verb: 'MELTED', sprite: 'lavablob', scar: 'lava', sound: 'lava', line: 'The floor is lava now. Actually.' });
  add({ id: 'mousetrap', name: 'A GIANT MOUSETRAP', tier: 'dispatch', kind: 'area', mode: 'instant', r: 0.9, outcome: 'squash', verb: 'SNAPPED IN A TRAP', sprite: 'mousetrap', scar: 'trap', sound: 'snap', line: 'It was baited with a wheel of cheese.' });
  add({ id: 'hole', name: 'A HOLE', tier: 'dispatch', kind: 'area', mode: 'instant', r: 0.7, outcome: 'drop', verb: 'DROPPED', sprite: 'hole', scar: 'hole', sound: 'hole', line: 'It goes down. Nobody knows how far.' });
  add({ id: 'kick', name: 'A DONKEY KICK', tier: 'dispatch', kind: 'melee', reach: 2.4, arc: 0.6, outcome: 'fling', verb: 'KICKED BY A DONKEY', sprite: 'hoof', sound: 'kick', line: 'The donkey is not shown. The donkey is implied.' });
  add({ id: 'tornado', name: 'A TORNADO', tier: 'dispatch', kind: 'area', mode: 'wander', r: 1.6, dur: 7, speed: 2.2, hurtsPlayer: 14, outcome: 'fling', verb: 'CARRIED OFF BY A TORNADO', sprite: 'tornado', sound: 'tornado', line: 'It will wander. Mind it.' });
  add({ id: 'gravel', name: 'A PULVERIZING ONSLAUGHT OF GRAVEL', tier: 'dispatch', kind: 'stream', rate: 50, dur: 1.2, speed: 9, range: 5, hitR: 0.45, outcome: 'squash', verb: 'PULVERIZED', sprite: 'rock', scar: 'gravel', sound: 'gravel', line: 'Three-quarter inch. Crushed.' });
  add({ id: 'handbag', name: "A LADY'S HANDBAG, SWUNG BY A DISEMBODIED OLD LADY'S ARM", tier: 'dispatch', kind: 'melee', reach: 2.6, arc: 0.8, outcome: 'expire', verb: 'PURSED', sprite: 'purse', scar: 'purse', sound: 'purse', line: 'She kept bricks in it.' });
  add({ id: 'vines', name: 'A BUNCH OF KILLER VINES', tier: 'dispatch', kind: 'area', mode: 'instant', r: 1.5, outcome: 'expire', verb: 'STRANGLED BY VINES', sprite: 'vines', scar: 'vines', sound: 'vines', line: 'They came up through the floor.' });
  add({ id: 'anvil', name: 'AN ANVIL', tier: 'dispatch', kind: 'drop', fallT: 0.55, splash: 0.7, outcome: 'squash', verb: 'ANVILED', sprite: 'anvil', scar: 'anvil', sound: 'clang', line: 'From where? Up.' });
  add({ id: 'piano', name: 'A PIANO', tier: 'dispatch', kind: 'drop', fallT: 0.7, splash: 1.1, outcome: 'squash', verb: 'FLATTENED BY A PIANO', sprite: 'piano', scar: 'piano', sound: 'piano', line: 'A Steinway. Was.' });
  add({ id: 'bees', name: 'A SWARM OF ANGRY BEES', tier: 'dispatch', kind: 'summon', speed: 4.5, turn: 6, life: 6, hitR: 0.7, outcome: 'expire', verb: 'STUNG TO DEATH', sprite: 'bees', sound: 'buzz', line: 'They were having a bad day already.' });
  add({ id: 'lightning', name: 'A LIGHTNING BOLT', tier: 'dispatch', kind: 'beam', range: 12, chain: 2.6, outcome: 'burn', verb: 'ELECTROCUTED', sprite: 'none', sound: 'zap', flash: 0.6, scar: 'scorch', line: 'It jumps. Stand back.' });
  add({ id: 'cow', name: 'A COW', tier: 'dispatch', kind: 'lob', speed: 6, arc: 1.4, splash: 1.0, outcome: 'squash', verb: 'SQUASHED BY A COW', sprite: 'cow', scar: 'cow', sound: 'moo', line: 'The cow is fine. The cow is always fine.' });
  add({ id: 'wetcat', name: 'A WET CAT', tier: 'dispatch', kind: 'bolt', speed: 8, life: 1.6, hitR: 0.5, outcome: 'chew', verb: 'CLAWED TO RIBBONS', sprite: 'cat', scar: 'cat', sound: 'yowl', line: 'Nobody wanted this. Least of all the cat.' });
  add({ id: 'sneeze', name: 'A SNEEZE', tier: 'dispatch', kind: 'melee', reach: 3.6, arc: 0.9, outcome: 'fling', verb: 'SNEEZED ON', sprite: 'snotblast', scar: 'snot', sound: 'sneeze', line: 'Bless it.' });
  add({ id: 'shrinkray', name: 'A SHRINK RAY', tier: 'dispatch', kind: 'beam', range: 10, outcome: 'shrink', verb: 'SHRUNK', sprite: 'none', sound: 'ray', flash: 0.3, line: 'Smaller. Smaller. Gone.' });
  add({ id: 'legos', name: 'AN AVALANCHE OF LEGOS', tier: 'dispatch', kind: 'lob', speed: 6, arc: 0.9, splash: 1.3, outcome: 'expire', verb: 'DONE IN BY LEGOS', sprite: 'legos', scar: 'legos', sound: 'legos', line: 'Barefoot. Every last one of them.' });
  add({ id: 'porcupine', name: 'A PORCUPINE, FIRED LIKE A SHOTGUN', tier: 'dispatch', kind: 'bolt', speed: 9, life: 1.4, hitR: 0.5, splash: 1.0, outcome: 'gib', verb: 'QUILLED', sprite: 'porcupine', scar: 'quills', sound: 'porcupine', line: 'The porcupine did not consent.' });
  add({ id: 'sneaker', name: 'A VERY LARGE SNEAKER', tier: 'dispatch', kind: 'drop', fallT: 0.5, splash: 1.0, outcome: 'squash', verb: 'STEPPED ON', sprite: 'sneaker', scar: 'footprint', sound: 'stomp', line: 'Size 400.' });
  add({ id: 'gravy', name: 'A TIDAL WAVE OF GRAVY', tier: 'dispatch', kind: 'lob', speed: 6, arc: 0.7, splash: 1.6, outcome: 'smother', verb: 'DROWNED IN GRAVY', sprite: 'gravy', scar: 'gravy', sound: 'gravy', line: 'Brown. Warm. Endless.' });
  add({ id: 'skunk', name: 'A SKUNK', tier: 'dispatch', kind: 'summon', speed: 3.5, turn: 4, life: 6, hitR: 0.6, cloud: 'stink', outcome: 'gas', verb: 'SKUNKED', sprite: 'skunk', scar: 'stink', sound: 'skunk', line: 'It will linger. So will the smell.' });
  add({ id: 'meteor', name: 'A METEOR', tier: 'dispatch', kind: 'drop', fallT: 0.8, splash: 1.8, outcome: 'burn', verb: 'HIT BY A METEOR', sprite: 'meteor', scar: 'crater', sound: 'meteor', flash: 0.8, line: 'Statistically overdue.' });
  add({ id: 'papercuts', name: 'A SWARM OF PAPER CUTS', tier: 'dispatch', kind: 'stream', rate: 45, dur: 1.2, speed: 8, range: 5, hitR: 0.5, outcome: 'gib', verb: 'PAPER-CUT TO DEATH', sprite: 'paper', scar: 'paper', sound: 'paper', line: 'Ten thousand of them. Each one tiny.' });
  add({ id: 'nitrogen', name: 'LIQUID NITROGEN', tier: 'dispatch', kind: 'stream', rate: 35, dur: 1.0, speed: 7, range: 4.5, hitR: 0.5, outcome: 'freeze', verb: 'FROZEN AND SHATTERED', sprite: 'frost', scar: 'frost', sound: 'nitrogen', line: 'Minus 320. Fahrenheit. Whatever.' });
  add({ id: 'goose', name: 'AN ANGRY GOOSE', tier: 'dispatch', kind: 'summon', speed: 5.5, turn: 6, life: 6, hitR: 0.55, outcome: 'chew', verb: 'GOOSED', sprite: 'goose', scar: 'feathers', sound: 'honk', line: 'There is no such thing as a calm goose.' });
  add({ id: 'catbag', name: 'A BAG OF CATS', tier: 'dispatch', kind: 'lob', speed: 7, arc: 1.0, splash: 0.6, burst: { sprite: 'cat', count: 4, speed: 6, turn: 7, life: 4, hitR: 0.5 }, outcome: 'chew', verb: 'CLAWED BY SEVERAL CATS', sprite: 'bag', scar: 'cat', sound: 'catbag', line: 'Four cats. One bag. Zero happiness.' });
  add({ id: 'cannonball', name: 'A CANNONBALL', tier: 'dispatch', kind: 'bolt', speed: 12, life: 1.6, hitR: 0.5, pierce: true, outcome: 'squash', verb: 'CANNONBALLED', sprite: 'cannonball', scar: 'cannonball', sound: 'cannon', line: 'Old school.' });
  add({ id: 'swatter', name: 'A GIANT FLY SWATTER', tier: 'dispatch', kind: 'melee', reach: 3.4, arc: 1.2, outcome: 'squash', verb: 'SWATTED', sprite: 'swatter', sound: 'swat', line: 'Thwap.' });
  add({ id: 'slapfight', name: 'TWO HUNDRED SLAPS', tier: 'dispatch', kind: 'melee', reach: 2.2, arc: 0.6, outcome: 'expire', verb: 'SLAPPED TWO HUNDRED TIMES', sprite: 'slaphands', sound: 'slaps', line: 'The hands belong to no one.' });
  add({ id: 'burrito', name: 'A MICROWAVE BURRITO', tier: 'dispatch', kind: 'lob', speed: 8, arc: 0.6, splash: 0.7, outcome: 'burn', verb: 'SCALDED BY A BURRITO', sprite: 'burrito', scar: 'burrito', sound: 'sizzle', line: 'Frozen outside. The core is nineteen hundred degrees.' });
  add({ id: 'curse', name: 'EXPLOSIVE DIARRHEA (THEIRS)', tier: 'dispatch', kind: 'beam', range: 9, outcome: 'expire', verb: 'DONE IN FROM BEHIND', sprite: 'none', sound: 'curse', scar: 'puddle', line: 'We are so sorry.' });
  add({ id: 'vending', name: 'A VENDING MACHINE', tier: 'dispatch', kind: 'drop', fallT: 0.6, splash: 0.9, outcome: 'squash', verb: 'CRUSHED BY A VENDING MACHINE', sprite: 'vending', scar: 'machine', sound: 'vending', line: 'It ate the dollar first.' });
  add({ id: 'sumo', name: 'A SUMO WRESTLER', tier: 'dispatch', kind: 'summon', speed: 4, turn: 3, life: 5, hitR: 0.9, outcome: 'fling', verb: 'THROWN BY A SUMO', sprite: 'sumo', sound: 'sumo', line: 'Yokozuna. Retired. Not that retired.' });
  add({ id: 'piledriver', name: 'A PILE DRIVER', tier: 'dispatch', kind: 'drop', fallT: 0.4, splash: 0.7, outcome: 'squash', verb: 'PILE-DRIVEN', sprite: 'piledriver', sound: 'piledriver', line: 'Municipal grade.' });
  add({ id: 'drill', name: "A DENTIST'S DRILL", tier: 'dispatch', kind: 'summon', speed: 7, turn: 8, life: 4, hitR: 0.45, outcome: 'expire', verb: 'DRILLED', sprite: 'drill', scar: 'teeth', sound: 'drill', line: 'Open wide.' });
  add({ id: 'mosquitoes', name: 'A CLOUD OF MOSQUITOES', tier: 'dispatch', kind: 'summon', speed: 4, turn: 6, life: 7, hitR: 0.8, outcome: 'shrink', verb: 'DRAINED', sprite: 'mosquitoes', sound: 'whine', line: 'Every last drop.' });
  add({ id: 'doll', name: 'A HAUNTED DOLL', tier: 'dispatch', kind: 'summon', speed: 2.2, turn: 3, life: 8, hitR: 0.6, outcome: 'expire', verb: 'FRIGHTENED TO DEATH', sprite: 'doll', scar: 'doll', sound: 'doll', line: 'She walks slowly. She always gets there.' });
  add({ id: 'bus', name: 'THE BUS', tier: 'dispatch', kind: 'train', speed: 8, breaks: 0, width: 0.8, outcome: 'squash', verb: 'HIT BY THE BUS', sprite: 'bus', sound: 'bus', line: 'Route 9. Not in service.' });
  add({ id: 'cart', name: 'A SHOPPING CART', tier: 'dispatch', kind: 'bolt', speed: 7, life: 3, hitR: 0.55, bounce: true, outcome: 'fling', verb: 'CARTED', sprite: 'cart', sound: 'cart', line: 'One wheel wobbles. All of them, actually.' });
  add({ id: 'bowling', name: 'A BOWLING BALL', tier: 'dispatch', kind: 'bolt', speed: 8, life: 2.5, hitR: 0.5, pierce: true, roll: true, outcome: 'squash', verb: 'BOWLED OVER', sprite: 'bowling', scar: 'pins', sound: 'bowling', line: 'Strike.' });
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
  add({ id: 'balloon', name: 'A BALLOON', tier: 'weird', kind: 'bolt', speed: 2.2, life: 5, hitR: 0.6, floats: true, outcome: 'expire', altOutcome: 'pacify', altChance: 0.5, verb: 'STARTLED TO DEATH BY A BALLOON', sprite: 'balloon', sound: 'balloon', line: 'It pops. Somebody has a weak heart.' });
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
  add({ id: 'confetti', name: 'CONFETTI', tier: 'dud', kind: 'melee', reach: 2.5, arc: 1.2, sprite: 'confetti', scar: 'confetti', sound: 'confetti', line: 'Happy birthday, I guess.' });
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
  add({ id: 'recoil', name: 'A DONKEY KICK, BACKWARDS', tier: 'backfire', kind: 'self', dmg: 12, knock: 3.5, sprite: 'hoof', sound: 'kick', line: 'Same donkey. Other end.' });
  add({ id: 'boomerang', name: 'A BOOMERANG', tier: 'backfire', kind: 'bolt', speed: 8, life: 3.2, hitR: 0.5, returns: 1.1, selfDmg: 15, outcome: 'expire', verb: 'BOOMERANGED', sprite: 'boomerang', sound: 'boomerang', line: 'It comes back. Move.' });
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
