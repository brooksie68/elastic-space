// Snap! — guided mode (step 5). The twelve chapters as data + the guide that walks them.
// Register (reimagine.md §15): calm, brief, plain. State the rule, then the case. Each step
// says one thing, shows it up close, hands you the atoms, and waits for the snap.
(function(){
'use strict';
const CAP=[2,8,18,32];
const pic1 = sym => ({ a:[[sym,0,0]], b:[] });
const pair = (a,b,o) => ({ a:[[a,-0.42,0],[b,0.42,0]], b:[[0,1,o]] });

// wait: what wakes the arrow. 'made:KEY' (the engine reports that molecule), 'made:KEY×N' (N of them
// since the step began), 'refuse' (a full atom turned something away), 'break' (a bond broke under
// heat), 'ion:SYM' (that element right-clicked into an ion), 'metal:N' (a metal block of N), null (nothing — read and go on). hand: atoms landed apart when the step begins.
// row: hand them in a line instead. nucleus: hide the symbols, show the proton counts. light: tiles lit on the table. show: the close-up drawing — ONLY on steps that
// wait for a build, as the target picture (James, 2026-09-04: a drawn atom beside a real one read as a dead atom).
const CHAPTERS = [
  { id:'hydrogen', title:'Hydrogen', tiles:['H'], steps:[
    { text:'This is hydrogen. One proton, one electron. Electrons sit in shells around the nucleus, and the first shell has room for two, so hydrogen has one open place.', show:null, light:['H'], hand:['H'] },
    { text:'Two hydrogens can fill each other’s shell by sharing. Each puts its one electron into a shared pair, and the pair counts for both. Bring the two together.', show:pair('H','H',1), light:['H'], hand:['H'], wait:'made:H2', hint:'bring them together' },
    { text:'That is H₂, the first molecule and the simplest bond there is: one shared pair, two full shells. Hydrogen gas is made of these pairs, never single atoms.', show:null, light:['H'] },
  ]},
  { id:'helium', title:'Helium', tiles:['He'], steps:[
    { text:'Helium has two electrons, and the first shell holds two. Its only shell is full. An atom with a full outer shell has no reason to bond with anything.', show:null, light:['He'], hand:['He'] },
    { text:'Try it. Push the helium into a hydrogen, or bring a hydrogen to it.', show:pic1('He'), light:['He','H'], hand:['H'], wait:'refuse', hint:'push them together' },
    { text:'Nothing sticks. That is the rule the whole table follows: a full outer shell is stable, and every other atom is trying to get one. Everything from here on is that rule at work.', show:null, light:['He'] },
  ]},
  { id:'shells', title:'The shells', tiles:['Li','Be','B','C','N','O','F','Ne'], steps:[
    { text:'Lithium through neon sit in one row of the table, and they share the same two shells. Read left to right and the outer shell fills: one electron, then two, up to eight.', show:null, light:['Li','Be','B','C','N','O','F','Ne'], hand:['Li','Be','B','C','N','O','F','Ne'], row:true },
    { text:'Every one of these atoms is neutral. Lithium has three protons in its nucleus and three electrons around it. Neon has ten and ten. Each proton carries one positive charge, each electron one negative, and they cancel exactly. The number of protons is what makes an atom the element it is. When an atom gains or loses an electron the balance tips, and a charged atom pulls on anything that can set it right again.', show:null, light:['Li','Be','B','C','N','O','F','Ne'], nucleus:true },
    { text:'Lithium has one outer electron and gives it away. Fluorine has seven and wants one. Neon has eight and is full. Press and hold any of them for the X-ray and count the outer shell.', show:null, light:['Li','F','Ne'] }, // the row on the bench is the picture; no close-up over it
    { text:'Lithium and fluorine fit each other exactly: the one electron lithium gives is the one fluorine wants. Bring lithium to fluorine.', show:pair('Li','F','i'), light:['Li','F'], wait:'made:FLi', hint:'bring lithium to fluorine' },
    { text:'One electron moved from lithium to fluorine. Both have full outer shells now, and they hold together by charge. The rest of the row can stay; clear the bench whenever you like.', show:null, light:['Li','F'] },
  ]},
  { id:'water', title:'Water', tiles:['O'], steps:[
    { text:'Oxygen has eight electrons: two in the first shell, six in the second. The second shell holds eight, so oxygen wants two more.', show:null, light:['O'], hand:['O'] },
    { text:'Hydrogen has one electron to share. Two hydrogens fill oxygen’s two places, and oxygen fills each of theirs. Bring both hydrogens to the oxygen.', show:{ a:[['O',0,-0.15],['H',-0.55,0.45],['H',0.55,0.45]], b:[[0,1,1],[0,2,1]] }, light:['O','H'], hand:['H','H'], wait:'made:H2O', hint:'bring both hydrogens in' },
    { text:'Water. The two hydrogens sit at an angle, not in a line, because oxygen’s other four electrons take up room on the far side. That bend is why water sticks to itself and dissolves so much.', show:null, light:['O','H'] },
  ]},
  { id:'double', title:'Double and triple', tiles:['O','N'], steps:[
    { text:'Two oxygens each want two. They share two pairs at once, a double bond. Bring them together.', show:pair('O','O',2), light:['O'], hand:['O','O'], wait:'made:O2', hint:'bring them together' },
    { text:'Nitrogen has five outer electrons and wants three. Two nitrogens share three pairs, a triple bond, one of the strongest there is. Bring them together.', show:pair('N','N',3), light:['N'], hand:['N','N'], wait:'made:N2', hint:'bring them together' },
    { text:'Now turn up the heat. The dial is at the top right; drag it upward and watch. Single bonds give first, then the double. The triple holds longest.', show:pair('N','N',3), light:['N','O'], wait:'break', hint:'turn the heat up' },
    { text:'The more pairs two atoms share, the harder they are to pull apart. That is why the nitrogen in the air does almost nothing. Turn the heat back down when you are ready.', show:null, light:['N'] },
  ]},
  { id:'salt', title:'Salt', tiles:['Na','Cl'], steps:[
    { text:'Sodium has one outer electron and gives it up easily. Chlorine has seven and wants one. Neither shares. The electron moves across. Bring them together.', show:pair('Na','Cl','i'), light:['Na','Cl'], hand:['Na','Cl'], wait:'made:ClNa', hint:'bring them together' },
    { text:'Sodium is now Na⁺ and chlorine is Cl⁻. They hold together by charge, not by a shared pair. That is an ionic bond.', show:null, light:['Na','Cl'] },
    { text:'Salt is not a molecule. It is a crystal: every Na⁺ sits among Cl⁻ and every Cl⁻ among Na⁺, in every direction, for as far as the grain goes. Land two more pairs and bring each together.', show:{ a:[['Na',-0.6,-0.5],['Cl',0,-0.5],['Na',0.6,-0.5],['Cl',-0.6,0.5],['Na',0,0.5],['Cl',0.6,0.5]], b:[[0,1,'i'],[1,2,'i'],[3,4,'i'],[4,5,'i'],[0,3,'i'],[1,4,'i'],[2,5,'i']] }, light:['Na','Cl'], hand:['Na','Cl','Na','Cl'], wait:'made:ClNa×2', hint:'two more pairs' },
    { text:'That is the first six chapters: one atom alone, the two ways atoms join, and what each way builds. The next six go on to ions, carbon, rings and the molecules of life.', show:null, light:[] },
  ]},
  { id:'ions', title:'Ions on their own', tiles:['Na','Cl','H'], steps:[
    { text:'An atom on its own can lose or gain an electron. Sodium holds its one outer electron loosely. Right-click the sodium and the electron leaves: eleven protons, ten electrons, and the balance tips to +1.', show:null, light:['Na'], hand:['Na'], wait:'ion:Na', hint:'right-click the sodium' },
    { text:'A charged atom is an ion. Na⁺ is still sodium, because the protons have not changed, but it is no longer neutral. Chlorine goes the other way: it wants one electron. Right-click the chlorine and it takes one, seventeen protons against eighteen electrons, −1.', show:null, light:['Na','Cl'], hand:['Cl'], wait:'ion:Cl', hint:'right-click the chlorine' },
    { text:'Opposite charges pull. Bring the two ions together and they hold as salt, and this time no electron has to move: it already did. Right-click either one again and its electron comes back.', show:pair('Na','Cl','i'), light:['Na','Cl'], wait:'made:ClNa', hint:'bring the ions together' },
    { text:'Hydrogen is the smallest case. One proton, one electron. Right-click a hydrogen and nothing is left but the proton. A bare proton is what an acid gives away: acid means loose protons in water.', show:null, light:['H'], hand:['H'], wait:'ion:H', hint:'right-click the hydrogen' },
  ]},
  { id:'carbon', title:'Carbon, the builder', tiles:['C'], steps:[
    { text:'Carbon has four outer electrons and room for eight, so it wants four more. Four is half of eight, and that is why carbon shares four bonds rather than giving or taking. Four hydrogens fill it. Bring them to the carbon.', show:{ a:[['C',0,0],['H',0,-0.85],['H',0.85,0],['H',0,0.85],['H',-0.85,0]], b:[[0,1,1],[0,2,1],[0,3,1],[0,4,1]] }, light:['C','H'], hand:['C','H','H','H','H'], wait:'made:CH4', hint:'four hydrogens on the carbon' },
    { text:'Methane. Now the thing only carbon does well: bonding to itself. Put three hydrogens on each carbon first, so each has one place left, then bring the two carbons together.', show:{ a:[['C',-0.4,0],['C',0.4,0],['H',-0.75,-0.7],['H',-0.9,0.4],['H',-0.4,0.85],['H',0.75,-0.7],['H',0.9,0.4],['H',0.4,0.85]], b:[[0,1,1],[0,2,1],[0,3,1],[0,4,1],[1,5,1],[1,6,1],[1,7,1]] }, light:['C','H'], hand:['C','C','H','H','H','H','H','H'], wait:'made:C2H6', hint:'three hydrogens each, then carbon to carbon' },
    { text:'Ethane, two carbons in a row. There is no limit. Three carbons make propane, the gas in a camping stove. Build it the same way: hydrogens first, leaving each carbon its places, then join the carbons in a chain.', show:{ a:[['C',-0.6,0.1],['C',0,-0.2],['C',0.6,0.1],['H',-0.95,-0.5],['H',-0.95,0.65],['H',-0.5,0.8],['H',-0.15,-0.9],['H',0.15,-0.9],['H',0.95,-0.5],['H',0.95,0.65],['H',0.5,0.8]], b:[[0,1,1],[1,2,1],[0,3,1],[0,4,1],[0,5,1],[1,6,1],[1,7,1],[2,8,1],[2,9,1],[2,10,1]] }, light:['C','H'], hand:['C','C','C','H','H','H','H','H','H','H','H'], wait:'made:C3H8', hint:'a chain of three' },
    { text:'Propane. The chain zigzags because each carbon holds its four bonds as far apart as they can get. Keep going and you have the waxes, the oils, the plastics, and the frames of every living thing. All of it is carbon holding carbon.', show:null, light:['C'] },
  ]},
  { id:'rings', title:'Rings and double bonds', tiles:['C'], steps:[
    { text:'Two carbons can share more than one pair. Give each carbon two hydrogens, so each has two places left, then bring the carbons together: they share two pairs at once, a double bond.', show:{ a:[['C',-0.4,0],['C',0.4,0],['H',-0.8,-0.65],['H',-0.8,0.65],['H',0.8,-0.65],['H',0.8,0.65]], b:[[0,1,2],[0,2,1],[0,3,1],[1,4,1],[1,5,1]] }, light:['C','H'], hand:['C','C','H','H','H','H'], wait:'made:C2H4', hint:'two hydrogens each, then carbon to carbon' },
    { text:'Ethene, the simplest double bond. It is stiff: a single bond can twist, a double cannot, and that stiffness is what makes shapes hold. Chain a few thousand of these and you have polyethylene, the plastic in a shopping bag.', show:null, light:['C'] },
    { text:'Six carbons can close into a ring, each with one hydrogen, and the six leftover electrons smear around the whole ring rather than sitting in three fixed double bonds. That is benzene, and it is the flat, stable core of a huge number of molecules, from aspirin to dyes.', show:{ a:[['C',0,-0.8],['C',0.7,-0.4],['C',0.7,0.4],['C',0,0.8],['C',-0.7,0.4],['C',-0.7,-0.4],['H',0,-1],['H',0.95,-0.55],['H',0.95,0.55],['H',0,1],['H',-0.95,0.55],['H',-0.95,-0.55]], b:[[0,1,2],[1,2,1],[2,3,2],[3,4,1],[4,5,2],[5,0,1],[0,6,1],[1,7,1],[2,8,1],[3,9,1],[4,10,1],[5,11,1]] }, light:['C','H'] },
  ]},
  { id:'oxygen-family', title:'Alcohol and sugar', tiles:['O','C'], steps:[
    { text:'Put an oxygen on a carbon chain and the chain changes character. Give the carbon three hydrogens and the oxygen one, then bring carbon and oxygen together. The oxygen-hydrogen end is called an OH group.', show:{ a:[['C',-0.45,0.05],['O',0.4,-0.15],['H',-0.85,-0.55],['H',-0.85,0.6],['H',-0.35,0.85],['H',0.85,0.35]], b:[[0,1,1],[0,2,1],[0,3,1],[0,4,1],[1,5,1]] }, light:['C','O','H'], hand:['C','O','H','H','H','H'], wait:'made:CH4O', hint:'three on the carbon, one on the oxygen, then join them' },
    { text:'Methanol, the simplest alcohol. The OH group is why alcohols mix with water: water is OH groups too, and like sticks to like. Ethanol, the alcohol in drinks, is the same thing on a two-carbon chain.', show:null, light:['O','C'] },
    { text:'Sugar is a carbon chain wearing an OH group on almost every carbon, usually closed into a ring. Glucose has six carbons, twelve hydrogens, six oxygens. All those OH groups are why sugar dissolves in water and why it is sticky.', show:{ a:[['C',-0.55,-0.35],['C',0.1,-0.7],['C',0.7,-0.3],['C',0.7,0.35],['C',0.1,0.7],['O',-0.55,0.35],['O',-0.95,-0.7],['O',0.1,-1.0],['O',1.0,-0.6],['O',1.0,0.7],['O',0.1,1.0]], b:[[0,1,1],[1,2,1],[2,3,1],[3,4,1],[4,5,1],[5,0,1],[0,6,1],[1,7,1],[2,8,1],[3,9,1],[4,10,1]] }, light:['C','O','H'] },
  ]},
  { id:'chains', title:'Chains of life', tiles:['N'], steps:[
    { text:'Nitrogen has five outer electrons and wants three. Three hydrogens fill it, and one pair is left over, held by the nitrogen alone. Bring the three hydrogens to the nitrogen.', show:{ a:[['N',0,-0.1],['H',-0.8,0.45],['H',0.8,0.45],['H',0,-0.9]], b:[[0,1,1],[0,2,1],[0,3,1]] }, light:['N','H'], hand:['N','H','H','H'], wait:'made:H3N', hint:'three hydrogens on the nitrogen' },
    { text:'Ammonia. That spare pair is the point: it can grab a bare proton, which is what makes ammonia a base. Swap one hydrogen for a carbon chain and you have an amine, and the smallest useful one is an amino acid: a carbon carrying an amine on one side and an acid group on the other. Glycine is the simplest. The atoms are on the bench if you want to try it.', show:{ a:[['N',-0.85,0],['C',-0.3,0.2],['C',0.35,-0.1],['O',0.85,-0.55],['O',0.7,0.5],['H',-1.0,-0.6],['H',-1.0,0.6],['H',-0.3,0.85],['H',-0.15,-0.5],['H',1.0,0.75]], b:[[0,1,1],[1,2,1],[2,3,2],[2,4,1],[0,5,1],[0,6,1],[1,7,1],[1,8,1],[4,9,1]] }, light:['N','C','O','H'], hand:['N','C','C','O','O','H','H','H','H','H'] },
    { text:'Amino acids snap head to tail: the acid end of one to the amine end of the next, a water molecule leaving each time. A chain of them is a peptide; a long, folded one is a protein. Every protein in you is twenty kinds of amino acid, joined by the same snap, thousands of times over.', show:null, light:['N','C','O'] },
  ]},
  { id:'metals', title:'Metals', tiles:['Cu'], steps:[
    { text:'Copper has one outer electron and holds it loosely, like sodium. But there is no chlorine here to give it to, only other coppers. Bring six coppers together and watch what happens to the loose electrons.', show:{ a:[['Cu',0,0],['Cu',0.62,-0.36],['Cu',0.62,0.36],['Cu',0,0.72],['Cu',-0.62,0.36],['Cu',-0.62,-0.36]], b:[] }, light:['Cu'], hand:['Cu','Cu','Cu','Cu','Cu','Cu'], wait:'metal:6', hint:'pack the coppers together' },
    { text:'The atoms pack into a block, and their outer electrons stop belonging to any one atom. They drift through the whole block, a shared sea. That is a metal. The drifting electrons are why copper carries electricity and heat, and why a metal bends without breaking: the atoms can slide and the sea follows.', show:null, light:['Cu'] },
    { text:'Turn up the heat and the block comes apart, atom by atom. That is melting. Turn it down and the atoms pack again; the electrons never cared which atom they were near. Everything on the table left of the staircase does this. That is most of the elements.', show:null, light:['Cu'] },
    { text:'That is the twelve. One atom alone, the two ways atoms join, what sharing builds, what giving builds, and the sea that metals make. Every element on the table is doing one of these things, all the time, everywhere.', show:null, light:[] },
  ]},
];

let D=null, ui=null, state={ chapter:0, step:0, badges:[], reached:{ chapter:0, step:0 } }, active=false, paused=false, waiting=null, madeCount=0, lit=[];
function load(){ try{ const s=JSON.parse(localStorage.getItem('snap-guide')||'null'); if(s && typeof s.chapter==='number') state=Object.assign(state, s); }catch(e){}
  const here={ chapter:state.chapter, step:state.step }; if(!state.reached || !before(here, state.reached)) state.reached=here; } // saves from before `reached` existed: where you are counts as reached
function save(){ try{ localStorage.setItem('snap-guide', JSON.stringify(state)); }catch(e){} }
function chapter(){ return CHAPTERS[state.chapter]; }
function step(){ const c=chapter(); return c && c.steps[state.step]; }
function built(){ return CHAPTERS.filter(c=>c.steps.length).length; }
function before(a,b){ return a.chapter<b.chapter || (a.chapter===b.chapter && a.step<=b.step); }
function seen(ch, st){ if(!state.reached) return ch===0 && st===0; return before({chapter:ch, step:st}, state.reached) || CHAPTERS[ch].tiles.every(t=>state.badges.includes(t)); }
function touch(){ const here={ chapter:state.chapter, step:state.step }; if(!state.reached || !before(here, state.reached)) state.reached=here; }
function position(){ const c=chapter(); if(!c) return 'Done'; if(waiting==='restart') return built()+' of '+CHAPTERS.length+' chapters done'; const s=step(); if(!s) return 'Chapter '+(state.chapter+1); return 'Ch '+(state.chapter+1)+' · '+c.title+' · '+(state.step+1)+' of '+c.steps.length; }
function tell(){ if(D.onPosition) D.onPosition(position(), active && !paused ? 'guided' : 'free'); if(ui.toc && !ui.toc.closest('.panel').hidden) contents(); }

function applyBadges(){ for(const sym of state.badges){ const t=D.tiles[sym]; if(t) t.classList.add('badge-on'); } }
function light(syms){ for(const s of lit){ const t=D.tiles[s]; if(t) t.classList.remove('lit'); } lit=syms.slice(); for(const s of lit){ const t=D.tiles[s]; if(t) t.classList.add('lit'); } }
function closeup(pic){ const cv=ui.closeup; if(!pic){ cv.classList.remove('on'); return; } cv.classList.add('on'); requestAnimationFrame(()=>D.mini(cv, { pic }, D.tintOf)); } // shown first so the canvas has a size to draw into
function setWait(w, hint){ waiting=w||null; madeCount=0; ui.arrow.classList.toggle('wait', !!waiting); ui.cap.textContent = waiting ? (hint||'your turn') : 'next'; }
function mode(){ const c=chapter(); D.setMode('Guided · '+(state.chapter+1)+' of '+CHAPTERS.length+' · '+c.title); }

function render(){ const c=chapter(), s=step(); if(!c || !s){ finish(); return; }
  ui.kicker.textContent='Chapter '+(state.chapter+1)+' · '+c.title+' · '+(state.step+1)+' of '+c.steps.length; ui.text.textContent=s.text;
  light(s.light||[]); closeup(s.show); setWait(s.wait, s.hint); mode(); touch(); if(D.nucleus) D.nucleus(!!s.nucleus); // nucleus steps: the symbols give way to the proton counts
  if(s.hand && s.hand.length){ if(s.row) D.handRow(s.hand); else D.hand(s.hand); }
  save(); tell(); if(active && !paused) try{ history.replaceState(null, '', hashOf()); }catch(e){} }
function finish(){ // past the last built chapter
  light([]); closeup(null); if(D.nucleus) D.nucleus(false); ui.kicker.textContent='Guided · '+built()+' of '+CHAPTERS.length+' chapters'; ui.text.textContent= built()>=CHAPTERS.length ? 'That is all twelve chapters. The bench is yours: anything on the table lands with a click, right-click makes ions, the heat dial breaks things, and the contents takes you back to any step.' : 'That is as far as the guide goes for now. The bench is yours: anything on the table lands with a click, and the panels above open on their own.';
  ui.arrow.classList.remove('wait'); ui.cap.textContent='start over'; waiting='restart'; D.setMode('Free · the guide is done'); tell(); }
function advance(){ if(!active || paused) return; if(waiting==='restart'){ restart(); return; }
  if(waiting) return; const c=chapter(); if(!c) return;
  if(state.step+1 < c.steps.length){ state.step++; render(); return; }
  for(const sym of c.tiles){ if(!state.badges.includes(sym)) state.badges.push(sym); const t=D.tiles[sym]; if(t) t.classList.add('badge-on'); }
  state.chapter++; state.step=0; if(!chapter() || !chapter().steps.length){ save(); finish(); return; } D.clear(); render(); } // a chapter starts on a cleared bench
function wake(){ if(!waiting || waiting==='restart') return; waiting=null; ui.arrow.classList.remove('wait'); ui.cap.textContent='next'; ui.arrow.classList.add('pulse'); setTimeout(()=>ui.arrow.classList.remove('pulse'), 1400); }

// ---- what the bench reports
function onMade(key){ if(!active || !waiting) return; const m=/^made:(\w+)(?:×(\d+))?$/.exec(waiting); if(!m || m[1]!==key) return; madeCount++; if(madeCount >= (+m[2]||1)) wake(); }
function onRefuse(){ if(active && waiting==='refuse') wake(); }
function onIon(a){ if(!active || !waiting) return; const m=/^ion:(\w+)$/.exec(waiting); if(m && m[1]===a.sym && a.charge!==0) wake(); }
function onMetal(n){ if(!active || !waiting) return; const m=/^metal:(\d+)$/.exec(waiting); if(m && n>=+m[1]) wake(); }
function onBreak(){ if(active && waiting==='break' && D.sc.heat>0.4) wake(); }

// the two modes (James, 2026-09-04): FREE hides the guide and leaves the bench alone; GUIDED shows the strip where you left off
function setFree(){ paused=true; if(D.nucleus) D.nucleus(false); ui.root.classList.remove('on','min'); light([]); closeup(null); D.setMode('Free'); tell(); }
function pause(){ setFree(); }
function resume(){ setGuided(); }
function setGuided(){ if(!active){ active=true; paused=false; ui.root.classList.add('on'); if(!chapter() || !chapter().steps.length) finish(); else render(); return; }
  paused=false; ui.root.classList.add('on'); ui.root.classList.remove('min'); if(waiting==='restart') finish(); else { const s=step(); if(s){ light(s.light||[]); closeup(s.show); mode(); } } tell(); }
function start(){ setGuided(); }
// jump to any step already seen (the contents panel); the bench is cleared so the step's atoms land clean
// start over = no progress at all (James: a testing tool for now — "as if I haven't seen anything yet"): state wiped, badges off, guide closed, back to the invitation
function restart(){ state={ chapter:0, step:0, badges:[], reached:{chapter:0,step:0} }; save(); for(const t of Object.values(D.tiles)) t.classList.remove('badge-on'); waiting=null; madeCount=0; active=false; paused=false; light([]); closeup(null); ui.root.classList.remove('on','min'); D.clear(); if(D.onPosition) D.onPosition('Not started','free'); if(D.fresh) D.fresh(); }
// jump anywhere (James, 2026-09-04: the contents is a table of contents, not a gate). The bench is cleared, then every
// atom the chapter handed BEFORE this step lands first, so the bench matches the text (chapter 1 step 2 needs step 1's hydrogen).
function goTo(ch, st){ const c=CHAPTERS[ch]; if(!c || !c.steps[st]) return false; state.chapter=ch; state.step=st; waiting=null; madeCount=0; D.clear();
  for(let i=0;i<st;i++){ const s=c.steps[i]; if(s.hand && s.hand.length){ if(s.row) D.handRow(s.hand); else D.hand(s.hand); } }
  if(!active || paused){ active=true; paused=false; ui.root.classList.add('on'); ui.root.classList.remove('min'); } render(); return true; }
// every step has an address: #ch3-2 is chapter 3, step 2
function hashOf(){ return '#ch'+(state.chapter+1)+'-'+(state.step+1); }
function fromHash(h){ const m=/^#ch(\d+)-(\d+)$/.exec(h||''); if(!m) return null; const ch=+m[1]-1, st=+m[2]-1; return (CHAPTERS[ch] && CHAPTERS[ch].steps[st]) ? { ch, st } : null; }
// the contents: every chapter, every step; steps you have reached are highlighted, every step is a click away
function contents(){ const box=ui.toc; if(!box) return; box.innerHTML=''; let live=0;
  CHAPTERS.forEach((c,ci)=>{ const ch=document.createElement('div'); const done=c.tiles.every(t=>state.badges.includes(t)); ch.className='tocch'+(c.steps.length?'':' locked');
    ch.innerHTML='<h3><small>'+(ci+1)+'</small>'+c.title+(done?'<span class="done">done</span>':'')+'</h3>';
    if(!c.steps.length){ const st=document.createElement('div'); st.className='tocstub'; st.textContent='not written yet'; ch.appendChild(st); }
    c.steps.forEach((s,si)=>{ const b=document.createElement('button'); b.type='button'; b.className='tocstep'+(ci===state.chapter&&si===state.step?' now':''); const ok=seen(ci,si); if(ok){ b.classList.add('seen'); live++; }
      const first=s.text.split(/(?<=[.!?])\s/)[0]; b.innerHTML='<small>'+(si+1)+' of '+c.steps.length+'</small><span>'+first+'</span>';
      b.addEventListener('click', ()=>{ D.audio(); if(goTo(ci,si) && D.closeContents) D.closeContents(); }); ch.appendChild(b); });
    box.appendChild(ch); });
  if(ui.tocCount) ui.tocCount.textContent=(live ? live+' step'+(live===1?'':'s')+' seen · ' : '')+'click any step to go there'; }

function build(deps){ D=deps; load();
  ui={ root:document.getElementById('guide'), kicker:document.getElementById('gKicker'), text:document.getElementById('gText'), arrow:document.getElementById('gArrow'), cap:document.getElementById('gCap'), closeup:document.getElementById('closeup'), pause:document.getElementById('gPause'), toc:document.getElementById('toc'), tocCount:document.getElementById('tocCount') };
  ui.arrow.addEventListener('click', ()=>{ D.audio(); if(!active) start(); else if(paused) resume(); else advance(); });
  ui.pause.addEventListener('click', ()=>{ setFree(); });
  applyBadges(); if((state.chapter>0||state.step>0) && D.progress) D.progress(); if(D.onPosition) D.onPosition((state.chapter>0||state.step>0) ? position() : 'Not started', 'free');
  const at=fromHash(location.hash); if(at){ const go=()=>{ if(D.sc.W>0 && D.sc.camx>0){ if(D.enter) D.enter(); goTo(at.ch, at.st); } else setTimeout(go, 30); }; go(); } // wait for the bench to be measured, or every atom lands at the origin (his refresh clump)
  window.addEventListener('hashchange', ()=>{ const a=fromHash(location.hash); if(a && (a.ch!==state.chapter || a.st!==state.step || !active || paused)){ if(D.enter) D.enter(); goTo(a.ch, a.st); } });
  return { start, pause, resume, advance, setFree, setGuided, goTo, restart, contents, position, onMade, onRefuse, onBreak, onIon, onMetal, state:()=>state, active:()=>active, chapters:CHAPTERS };
}
window.SnapGuide = { build, CHAPTERS };
})();
