// Snap! engine: the 2D bench. Extracted from tmp/the-valence-lab/reimagine/snap.html (2026-09-03), reskinned to the Design tokens.
(function(){
'use strict';
function whisper(sc, who, text){ if(!sc.live) return; if(sc.say) sc.say(who, text); }
const TAU = Math.PI * 2;
const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const COL = { electron:'#A0CDFF', bead:'#F3F8FF', give:'#F0A060', take:'#5FB8F0', full:'#B8B6C4', ink:'#EFEAE2', coral:'#FF6E8B', teal:'#5FE0C4' };
const ELEM = {
  H:  { Z:1,  inner:[],    outer:1, seats:2, core:'#EAF2FF', name:'hydrogen', pitch:880, reach:26, kind:'share' },
  He: { Z:2,  inner:[],    outer:2, seats:2, core:'#F5EEDC', name:'helium',   pitch:988, reach:0,  kind:'full' },
  C:  { Z:6,  inner:[2],   outer:4, seats:8, core:'#5FE0C4', name:'carbon',   pitch:523, reach:22, kind:'share' },
  N:  { Z:7,  inner:[2],   outer:5, seats:8, core:'#6FA8FF', name:'nitrogen', pitch:494, reach:26, kind:'share' },
  O:  { Z:8,  inner:[2],   outer:6, seats:8, core:'#FF6E8B', name:'oxygen',   pitch:440, reach:30, kind:'share' },
  F:  { Z:9,  inner:[2],   outer:7, seats:8, core:'#D9A6FF', name:'fluorine', pitch:415, reach:40, kind:'take', acceptor:true },
  Ne: { Z:10, inner:[2],   outer:8, seats:8, core:'#F5EEDC', name:'neon',     pitch:392, reach:0,  kind:'full' },
  Na: { Z:11, inner:[2,8], outer:1, seats:8, core:'#FFB347', name:'sodium',   pitch:262, reach:34, kind:'give', donor:true },
  Cl: { Z:17, inner:[2,8], outer:7, seats:8, core:'#B48CFF', name:'chlorine', pitch:220, reach:36, kind:'take', acceptor:true },
  Li: { Z:3,  inner:[2],   outer:1, seats:8, core:'#FFC97A', name:'lithium',  pitch:330, reach:32, kind:'give', donor:true },
  Be: { Z:4,  inner:[2],   outer:2, seats:8, core:'#E8D8A0', name:'beryllium', pitch:349, reach:24, kind:'give', donor:true },
  B:  { Z:5,  inner:[2],   outer:3, seats:8, core:'#B9C6FF', name:'boron',    pitch:370, reach:20, kind:'share' },
  Mg: { Z:12, inner:[2,8], outer:2, seats:8, core:'#FFD29A', name:'magnesium', pitch:233, reach:30, kind:'give', donor:true },
  Al: { Z:13, inner:[2,8], outer:3, seats:8, core:'#D8DEE8', name:'aluminium', pitch:247, reach:26, kind:'give', donor:true },
  Si: { Z:14, inner:[2,8], outer:4, seats:8, core:'#8FD3C8', name:'silicon',  pitch:208, reach:22, kind:'share' },
  P:  { Z:15, inner:[2,8], outer:5, seats:8, core:'#FF9F6E', name:'phosphorus', pitch:196, reach:26, kind:'share' },
  S:  { Z:16, inner:[2,8], outer:6, seats:8, core:'#F3E36B', name:'sulfur',   pitch:185, reach:30, kind:'share' },
  Ar: { Z:18, inner:[2,8], outer:8, seats:8, core:'#F5EEDC', name:'argon',    pitch:175, reach:0,  kind:'full' },
  Cu: { Z:29, inner:[2,8,18], outer:1, seats:8, core:'#E8A070', name:'copper', pitch:294, reach:34, kind:'metal', metal:true }, // chapter 12: a metal — its outer electron belongs to the whole block
};
const SHELF = ['H','He','C','N','O','F','Ne','Na','Cl'];
const KEYORD = ['C','H','N','O','F','Cl','Na','Li','Be','B','Mg','Al','Si','P','S','He','Ne','Ar','Cu'];
const KNOWN = {
  H2:'hydrogen', O2:'oxygen', N2:'nitrogen', F2:'fluorine', Cl2:'chlorine', H2O:'water', CO2:'carbon dioxide',
  CH4:'methane', H3N:'ammonia', HF:'hydrogen fluoride', HCl:'hydrogen chloride', ClNa:'salt', FNa:'sodium fluoride',
  H2O2:'hydrogen peroxide', C2H4:'ethylene', C2H2:'acetylene', C2H6:'ethane', CO:'carbon monoxide', CHN:'hydrogen cyanide',
  F3N:'nitrogen trifluoride', CF4:'carbon tetrafluoride', CCl4:'carbon tetrachloride', H4N2:'hydrazine', CH4O:'methanol',
  C2H6O:'ethanol', CH2O:'formaldehyde', HNO:'nitroxyl', Cl2O:'dichlorine monoxide', ClF:'chlorine monofluoride', HOF:'hypofluorous acid', FHO:'hypofluorous acid',
  C8H18:'octane', C6H6:'benzene', C3H8:'propane', C4H10:'butane', C6H12:'cyclohexane', C6H14:'hexane', FLi:'lithium fluoride', Cl2Mg:'magnesium chloride', ClLi:'lithium chloride', F2Mg:'magnesium fluoride',
  C6H12O6:'glucose', C8H10N4O2:'caffeine', C9H8O4:'aspirin', C18H27NO3:'capsaicin', C2H5NO2:'glycine', C5H5N5:'adenine', H2S:'hydrogen sulfide', H3P:'phosphine', SiH4:'silane', H4Si:'silane', BH3:'borane', H3B:'borane', H2OS:'hydrogen sulfide', O2S:'sulfur dioxide', CS2:'carbon disulfide', Cl2S:'sulfur dichloride', ClH:'hydrogen chloride'
};
const CARDS = [['H2O','H₂O'],['ClNa','NaCl'],['CH4','CH₄'],['H3N','NH₃'],['CO2','CO₂'],['O2','O₂'],['N2','N₂'],['H2','H₂'],['H2O2','H₂O₂'],['C2H4','C₂H₄']];
const MADE_LINES = {
  H2O:'Water. Oxygen shares one pair with each hydrogen; its other four electrons sit on the far side and push the hydrogens into a bend.',
  ClNa:'Salt. No sharing: one electron moved from sodium to chlorine, and the two ions hold together by charge.',
  CH4:'Methane. Carbon shares four pairs, one with each hydrogen. Every outer place is filled, so nothing else can join.',
  H3N:'Ammonia. Nitrogen shares three pairs and keeps one pair to itself. That spare pair is what makes ammonia a base.',
  CO2:'Carbon dioxide. Two double bonds, and the molecule is a straight line.',
  O2:'Oxygen. A double bond, two shared pairs. In the real molecule two electrons stay unpaired; this drawing does not show that.',
  N2:'Nitrogen. A triple bond, three shared pairs, one of the strongest bonds there is.',
  H2:'Hydrogen. One shared pair, and both first shells are full.',
  H2O2:'Hydrogen peroxide. Oxygen bonded to oxygen, a hydrogen on each end.',
  C2H4:'Ethene, also called ethylene. A carbon-carbon double bond with four hydrogens. Chain thousands of these and you have polyethylene.',
};
const K_SPR = 2400, K_ANG = 140, K_TD = 8, K_REP = 260, K_ATT = 340, K_CENTER = 0.15, K_TQ = 34, DAMP_RATE = 2.2, OM_DAMP = 6, K_BD = 50, K_DRAG = 500, DRAG_DAMP = 25;
const BREAK = { 0:7, 1:6, 2:10, 3:13, ionic:11 }; // 0 = metallic // px at S=1, measured against the drag transient
const HEAT_K = 3800, K_HB = 90, ROT_DAMP = 4, K_HOLD = 6, K_RING = 1500; // K_HOLD: extra damping per bond of distance from the dragged atom (capped at 6 bonds) // whole-molecule spin decays at 4/s (half a turn's speed gone in ~0.17 s) // heat kicks (px/s per sqrt(s), scaled by S) and the hydrogen-bond pull

function hexRgb(h){ const n = parseInt(h.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function rgba(h,a){ const [r,g,b] = hexRgb(h); return 'rgba('+r+','+g+','+b+','+a+')'; }
function wrap(a){ while(a > Math.PI) a -= TAU; while(a < -Math.PI) a += TAU; return a; }
function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------- scenes ----------
function makeScene(canvas, opts){
  const sc = { canvas, ctx: canvas.getContext('2d'), atoms:[], bonds:[], effects:[], W:0, H:0, S:1, DPR:1, drag:null, live:!!(opts&&opts.live), fixedS:(opts&&opts.S)||0, lastBounce:new Map(), cool:new Map(), t:0, nextId:1, pointer:{x:0,y:0}, dragV:{x:0,y:0} };
  resize(sc); return sc;
}
function resize(sc){
  const r = sc.canvas.getBoundingClientRect(); if(!r.width) return;
  sc.DPR = Math.min(2, window.devicePixelRatio||1); sc.W = r.width; sc.H = r.height;
  sc.canvas.width = Math.round(sc.W*sc.DPR); sc.canvas.height = Math.round(sc.H*sc.DPR);
  sc.S = sc.fixedS || Math.max(0.78, Math.min(1.3, sc.W/900));
  for(const a of sc.atoms){ a.R = ringR(sc,a); }
  for(const b of sc.bonds){ b.L = bondLen(sc,b); }
}
function lewis(a){ const n = a.outer, seats = a.e.seats; const pairs = seats===2 ? (n>=2?1:0) : Math.max(0, n-4); return { pairs, hands: n - 2*pairs }; }
function usedHands(a){ let s = 0; for(const b of a.bonds) if(!b.ionic) s += b.order; return s; }
function freeHands(a){ if(a.e.metal) return 0; if(a.e.donor && a.outer>0) return 0; return lewis(a).hands - usedHands(a); }
function canGive(a){ return !!a.e.donor && a.outer>0; }
function canTake(a){ return !!a.e.acceptor && (lewis(a).hands - usedHands(a)) > 0; }
function isComplete(a){ return freeHands(a)===0 && !canGive(a); }
function ringR(sc,a){ const S = sc.S; if(a.outer===0) return (a.e.inner.length>1 ? 27 : 18)*S; return (a.e.seats===2 ? 27 : 41)*S; }
function bondLen(sc,b){ return b.metallic ? b.a.R + b.b.R - 8*sc.S : b.ionic ? b.a.R + b.b.R + 6*sc.S : b.a.R + b.b.R - 16*sc.S; }
function spawn(sc, sym, x, y){
  const e = ELEM[sym]; if(!e) return null;
  const a = { id:sc.nextId++, sym, e, x, y, vx:0, vy:0, th:Math.random()*TAU, om:0, outer:e.outer, charge:0, bonds:[], slots:[], n:0, fx:0, fy:0, tq:0, born:sc.t };
  a.R = ringR(sc,a); rebuild(sc,a); sc.atoms.push(a); return a;
}
function rebuild(sc,a){
  if(a.e.metal){ a.n=0; a.slots=[]; a.R=ringR(sc,a); for(const b of a.bonds) b.L=bondLen(sc,b); return; }
  const { pairs } = lewis(a); const cov = a.bonds.filter(b => !b.ionic); const hands = freeHands(a);
  const n = pairs + cov.length + hands; const slots = new Array(n); const used = new Set();
  // four domains: the tetrahedron seen from the side, unless the atom sits in a chain (two or three neighbours heavier than
  // hydrogen), when the heavy neighbours take slots 120° apart the way a skeletal drawing zigzags — a chain of these can close
  // into a six-ring instead of folding on itself (James, 2026-09-04)
  const heavy = cov.filter(b => other(b,a).sym!=='H'); let pat = null, heavySlots = null;
  if(n===4 && heavy.length===2){ pat = CHAIN2; heavySlots = [0,1]; } else if(n===4 && heavy.length===3){ pat = CHAIN3; heavySlots = [0,1,2]; }
  else if(heavy.length>=2 && heavy.length<n) heavySlots = heavy.map((b,i)=>i); // three domains: the heavy neighbours take 0° and 120°, so the hydrogen (or hand) points out of the bend, never into a ring
  a.pat = pat;
  if(heavySlots){ // the heavy slots run counter-clockwise, so the heavy neighbours take them in counter-clockwise order round the atom — a mirror
    // assignment fits with equal and opposite errors, the torque cancels, and the atom sits stable with its hydrogen slot pointing into the ring
    const angs = heavy.map(b => { const o = other(b,a); return Math.atan2(o.y-a.y, o.x-a.x); });
    let order = heavy.map((b,i) => i);
    if(heavy.length===2){ if(wrap(angs[1]-angs[0]) < 0) order = [1,0]; }
    else { order.sort((i,j) => ((angs[i]-angs[0]+TAU*2)%TAU) - ((angs[j]-angs[0]+TAU*2)%TAU)); // counter-clockwise from the first
      let bestR=0, bestE=1e9; for(let r=0;r<order.length;r++){ let e=0; for(let q=0;q<order.length;q++) e += Math.abs(wrap(a.th + slotBase(n,pat,heavySlots[q]) - angs[order[(q+r)%order.length]])); if(e<bestE){ bestE=e; bestR=r; } }
      order = order.map((_,q) => order[(q+bestR)%order.length]); }
    order.forEach((hi,q) => { used.add(heavySlots[q]); slots[heavySlots[q]] = { type:'bond', bond:heavy[hi] }; }); }
  for(const b of cov){ if(heavySlots && heavy.includes(b)) continue;
    const o = other(b,a); const want = Math.atan2(o.y-a.y, o.x-a.x); let best=-1, bd=1e9;
    for(let k=0;k<n;k++){ if(used.has(k)) continue; const d = Math.abs(wrap(a.th + slotBase(n,pat,k) - want)); if(d<bd){ bd=d; best=k; } }
    if(best>=0){ used.add(best); slots[best] = { type:'bond', bond:b }; }
  }
  let k = 0;
  for(let i=0;i<pairs;i++){ while(used.has(k)) k++; used.add(k); slots[k] = { type:'lone' }; }
  for(let i=0;i<hands;i++){ while(used.has(k)) k++; used.add(k); slots[k] = { type:'hand', phase:Math.random()*TAU }; }
  a.n = n; a.slots = slots; a.R = ringR(sc,a);
  for(const b of a.bonds) b.L = bondLen(sc,b);
}
const TETRA = [0, 110, 200, 270].map(d => d*Math.PI/180); // four domains drawn as a tetrahedron seen from the side
const CHAIN2 = [0, 120, 200, 280].map(d => d*Math.PI/180); // two heavy neighbours 120° apart, the rest behind
const CHAIN3 = [0, 120, 240, 300].map(d => d*Math.PI/180); // a branch point: three heavy neighbours, one small slot
function slotBase(n,pat,k){ return pat ? pat[k] : (n===4 ? TETRA[k] : k*TAU/n); }
function slotAng(a,k){ return a.th + slotBase(a.n, a.pat, k); }
function other(b,x){ return x===b.a ? b.b : b.a; }
function findBond(A,B){ for(const b of A.bonds) if(other(b,A)===B) return b; return null; }
const METAL_MAX=6; // a copper atom packs against up to six neighbours: the hexagonal block
function metalBonds(a){ let n=0; for(const b of a.bonds) if(b.metallic) n++; return n; }
function canBond(A,B){
  if(findBond(A,B)) return null;
  if(A.e.metal || B.e.metal){ return (A.e.metal && B.e.metal && metalBonds(A)<METAL_MAX && metalBonds(B)<METAL_MAX) ? 'metal' : null; }
  if(canGive(A) && canTake(B)) return 'ionic'; if(canGive(B) && canTake(A)) return 'ionic';
  if(A.e.donor || B.e.donor) return null;
  if(freeHands(A)>0 && freeHands(B)>0) return 'covalent';
  return null;
}
function link(sc, A, B, kind, forceOrder){
  if(kind==='covalent'){
    const order = forceOrder || 1; if(freeHands(A)<order || freeHands(B)<order) return null; // first contact is always a single bond; pushing the pair together again steps it up (James, 2026-09-04: a chain of doubles would not bend into a ring)
    const b = { a:A, b:B, order, ionic:false, L:0, born:sc.t }; b.L = bondLen(sc,b);
    sc.bonds.push(b); A.bonds.push(b); B.bonds.push(b); rebuild(sc,A); rebuild(sc,B); b.L = bondLen(sc,b); sc.ringsDirty = true; return b;
  }
  if(kind==='ionic'){
    const donor = canGive(A) ? A : B, acc = donor===A ? B : A;
    donor.outer -= 1; donor.charge += 1; acc.outer += 1; acc.charge -= 1;
    const b = { a:donor, b:acc, order:0, ionic:true, L:0, born:sc.t };
    sc.bonds.push(b); donor.bonds.push(b); acc.bonds.push(b); rebuild(sc,donor); rebuild(sc,acc); b.L = bondLen(sc,b); return b;
  }
  if(kind==='metal'){
    const b = { a:A, b:B, order:0, ionic:false, metallic:true, L:0, born:sc.t, phase:Math.random()*TAU }; b.L = bondLen(sc,b);
    sc.bonds.push(b); A.bonds.push(b); B.bonds.push(b); rebuild(sc,A); rebuild(sc,B); return b;
  }
  if(kind==='tether'){
    const b = { a:A, b:B, order:0, ionic:true, tether:true, L:0, born:sc.t }; b.L = bondLen(sc,b);
    sc.bonds.push(b); A.bonds.push(b); B.bonds.push(b); return b;
  }
  return null;
}
// right-click an atom on its own (chapter 7): givers and hydrogen lose an electron, takers gain one; again = back to neutral
function ionize(sc, a){
  if(a.bonds.some(b=>!b.tether)){ whisper(sc, 'bonded', cap(a.e.name)+' is bonded. Pull it free first; an atom loses or gains an electron on its own.'); return false; }
  if(a.charge!==0){ // back to neutral: the electron returns (or leaves)
    const gained = a.charge<0; a.outer=a.e.outer; a.charge=0; for(const b of a.bonds.slice()) unlink(sc,b); rebuild(sc,a);
    sc.effects.push({ type:'ionflash', atom:a, t0:sc.t, dur:0.5, gain:!gained }); sndGliss(gained ? a.e.pitch : a.e.pitch*0.75, gained ? a.e.pitch*0.75 : a.e.pitch);
    whisper(sc, 'neutral', cap(a.e.name)+' is neutral again: '+a.e.Z+' protons, '+a.e.Z+' electrons.'); if(sc.onIon) sc.onIon(a); return true; }
  if(a.e.kind==='full'){ whisper(sc, 'full', cap(a.e.name)+' holds its electrons harder than anything. A full shell does not let one go.'); sc.effects.push({ type:'ripple', atom:a, t0:sc.t, dur:0.6 }); sndThud(); return false; }
  const loses = a.e.donor || a.sym==='H' || a.e.metal || a.outer<=4; // sodium, lithium, hydrogen, carbon lose; nitrogen, oxygen, fluorine, chlorine gain
  if(loses){ a.outer-=1; a.charge+=1; } else { a.outer+=1; a.charge-=1; }
  rebuild(sc,a); sc.effects.push({ type:'ionflash', atom:a, t0:sc.t, dur:0.5, gain:!loses }); sndGliss(loses ? a.e.pitch : a.e.pitch*0.75, loses ? a.e.pitch*0.75 : a.e.pitch);
  const ne=a.e.Z-a.charge, q=(a.charge>0?'+':'−')+Math.abs(a.charge);
  if(a.sym==='H' && a.charge>0) whisper(sc, 'proton', 'Hydrogen lost its only electron. What is left is a bare proton, H⁺, and that is what an acid hands out.');
  else whisper(sc, loses?'lost':'gained', cap(a.e.name)+(loses?' lost an electron: ':' took an electron: ')+a.e.Z+' protons, '+ne+' electrons, charge '+q+'. It is an ion now, '+a.sym+(Math.abs(a.charge)>1?Math.abs(a.charge):'')+(a.charge>0?'⁺':'⁻')+'.');
  if(sc.onIon) sc.onIon(a); return true; }
function unlink(sc,b){
  sc.bonds = sc.bonds.filter(x => x!==b); b.a.bonds = b.a.bonds.filter(x => x!==b); b.b.bonds = b.b.bonds.filter(x => x!==b);
  rebuild(sc,b.a); rebuild(sc,b.b); sc.ringsDirty = true;
}
// ---------- bench editing (select / delete / copy / paste) ----------
function removeAtoms(sc, list){ const set=new Set(list); if(!set.size) return; for(const b of sc.bonds.slice()) if(set.has(b.a)||set.has(b.b)) unlink(sc,b);
  sc.atoms = sc.atoms.filter(a=>!set.has(a)); if(sc.drag && set.has(sc.drag)) sc.drag=null; if(sc.xray) sc.xray=null; sc.lastX=(sc.lastX||[]).filter(a=>!set.has(a));
  if(sc.sel) for(const a of list) sc.sel.delete(a); sc.ringsDirty=true; }
// a snapshot is positions about the centroid + the bonds among the copied atoms; restore rebuilds it anywhere (ionic pairs hand their electron over again, lone ions keep their charge)
function snapshot(sc, list){ if(!list.length) return null; const idx=new Map(list.map((a,i)=>[a,i])); let cx=0, cy=0; for(const a of list){ cx+=a.x; cy+=a.y; } cx/=list.length; cy/=list.length;
  const atoms=list.map(a=>({ sym:a.sym, x:a.x-cx, y:a.y-cy, th:a.th, charge:a.charge, outer:a.outer })); const bonds=[]; const seen=new Set();
  for(const a of list) for(const b of a.bonds){ if(seen.has(b)) continue; seen.add(b); const i=idx.get(b.a), j=idx.get(b.b); if(i===undefined||j===undefined) continue; bonds.push({ i, j, order:b.order, ionic:!!b.ionic, tether:!!b.tether, metallic:!!b.metallic }); }
  let R=0; for(const a of list) R=Math.max(R, Math.hypot(a.x-cx,a.y-cy)+a.R); return { atoms, bonds, R }; }
function restore(sc, snap, x, y){ const made=snap.atoms.map(s=>{ const a=spawn(sc,s.sym,x+s.x,y+s.y); a.th=s.th; return a; });
  for(const bb of snap.bonds){ const A=made[bb.i], B=made[bb.j]; if(bb.metallic) link(sc,A,B,'metal'); else if(bb.ionic && !bb.tether) link(sc,A,B,'ionic'); else if(!bb.ionic) link(sc,A,B,'covalent',bb.order); }
  snap.atoms.forEach((s,i)=>{ const a=made[i]; if(a.charge!==s.charge){ a.charge=s.charge; a.outer=s.outer; rebuild(sc,a); } });
  for(const bb of snap.bonds) if(bb.tether) link(sc,made[bb.i],made[bb.j],'tether');
  sc.ringsDirty=true; return made; }
function drawSelection(sc){ const ctx=sc.ctx, S=sc.S; const AMBER='#FFC43C';
  if(sc.sel && sc.sel.size){ const live=new Set(sc.atoms); for(const a of sc.sel) if(!live.has(a)) sc.sel.delete(a); } // an atom that left the bench (clear, guide, free mode) takes its highlight with it (James, 2026-09-05)
  if(sc.sel && sc.sel.size){ ctx.save(); ctx.setLineDash([4*S,4*S]); ctx.lineDashOffset=-sc.t*20; for(const a of sc.sel){ ring(ctx,a.x,a.y,a.R+7*S,AMBER,0.7,1.4*S); } ctx.restore(); }
  const m=sc.marquee; if(m){ const x=Math.min(m.x0,m.x1), y=Math.min(m.y0,m.y1), w=Math.abs(m.x1-m.x0), h=Math.abs(m.y1-m.y0); ctx.save(); ctx.fillStyle=rgba(AMBER,0.05); ctx.fillRect(x,y,w,h); ctx.setLineDash([5*S,4*S]); ctx.strokeStyle=rgba(AMBER,0.75); ctx.lineWidth=1.2*S; ctx.strokeRect(x,y,w,h); ctx.restore(); } }
// ---------- rings: five- and six-membered cycles of covalent bonds are first-class shapes ----------
// Found again whenever a bond is made or broken (cheap: one short search per covalent bond). Each ring gets a shape spring in
// substep() that pulls its atoms toward a regular convex polygon in their bond order, the way the angle springs shape
// everything else; without it a closed ring could settle dented or twisted (James, 2026-09-04, building benzene by hand).
function findRings(sc){ sc.ringsDirty = false; const rings = []; const seen = new Set();
  for(const b of sc.bonds){ if(b.ionic || b.metallic) continue; const A=b.a, B=b.b; // shortest path from A to B not using this bond, at most 5 hops
    const par = new Map([[A,null]]); let front=[A], path=null;
    for(let hops=1; hops<=5 && !path; hops++){ const next=[]; for(const x of front) for(const bb of x.bonds){ if(bb===b || bb.ionic || bb.metallic) continue; const o=other(bb,x); if(par.has(o)) continue; par.set(o,x); if(o===B){ path=[]; let c=B; while(c){ path.push(c); c=par.get(c); } break; } next.push(o); } front=next; }
    if(!path || path.length<5 || path.length>6) continue; const key = path.map(a=>a.id).sort((x,y)=>x-y).join(','); if(seen.has(key)) continue; seen.add(key); rings.push({ atoms:path, n:path.length }); }
  sc.rings = rings; }
function ringForces(sc){ if(sc.ringsDirty || (sc.rings && sc.rings.length && sc.rings.some(r=>r.atoms.some(a=>!sc.atoms.includes(a))))) findRings(sc); if(!sc.rings || !sc.rings.length) return;
  for(const r of sc.rings){ const at=r.atoms, n=r.n; let cx=0, cy=0, L=0; for(let i=0;i<n;i++){ cx+=at[i].x; cy+=at[i].y; const bb=findBond(at[i],at[(i+1)%n]); L += bb ? bb.L : 0; } cx/=n; cy/=n; L/=n; if(!L) continue;
    const Rr = L/(2*Math.sin(Math.PI/n)); const th = at.map(a=>Math.atan2(a.y-cy,a.x-cx));
    let wind=0; for(let i=0;i<n;i++) wind += wrap(th[(i+1)%n]-th[i]); const sgn = wind>=0 ? 1 : -1; // which way round the atoms run
    let sx=0, sy=0; for(let i=0;i<n;i++){ const d=th[i]-sgn*i*TAU/n; sx+=Math.cos(d); sy+=Math.sin(d); } const off=Math.atan2(sy,sx); // best-fit rotation of the polygon
    for(let i=0;i<n;i++){ const a=at[i]; const t=off+sgn*i*TAU/n; const fx=(cx+Math.cos(t)*Rr-a.x)*K_RING, fy=(cy+Math.sin(t)*Rr-a.y)*K_RING; a.fx+=fx; a.fy+=fy; a.afx=(a.afx||0)+fx; a.afy=(a.afy||0)+fy; } } }
function pathLen(A,B,max){ // bonds along the molecule from A to B, 0 if none within max
  let front=[A]; const seen=new Set(front); for(let hops=1; hops<=max; hops++){ const next=[]; for(const x of front) for(const b of x.bonds){ const o=other(b,x); if(o===B) return hops; if(!seen.has(o)){ seen.add(o); next.push(o); } } if(!next.length) return 0; front=next; } return 0; }
function component(a){ const seen = new Set([a]); const q=[a]; while(q.length){ const x=q.pop(); for(const b of x.bonds){ const o=other(b,x); if(!seen.has(o)){ seen.add(o); q.push(o); } } } return [...seen]; }
function formulaKey(atoms){ const c={}; for(const a of atoms) c[a.sym]=(c[a.sym]||0)+1; return KEYORD.filter(s=>c[s]).map(s=>s+(c[s]>1?c[s]:'')).join(''); }

// ---------- physics ----------
function step(sc, dt){ const n = Math.max(1, Math.ceil(dt/(1/240))); const h = dt/n; for(let i=0;i<n;i++) substep(sc,h); reslot(sc); }
// Every 0.2 s an atom re-picks which of its domains each bond sits in, nearest to where the neighbour actually is (this is
// bookkeeping about the flat drawing, not a twist about a bond). Without it a chain kept whatever angle pattern it got at
// contact and would not bend into a ring, and a ring vertex could stay wedged (James, 2026-09-04). Hand phases carry over.
function reslot(sc){ if(sc.t - (sc.reslotT||0) < 0.2) return; sc.reslotT = sc.t;
  for(const a of sc.atoms){ if(a.e.metal || !a.bonds.length) continue; let ok=true, cov=0; for(const b of a.bonds){ if(b.metallic){ ok=false; break; } if(!b.ionic) cov++; } if(!ok || !cov) continue;
    const phases = a.slots.filter(s=>s && s.type==='hand').map(s=>s.phase); rebuild(sc,a); let i=0; for(const s of a.slots) if(s && s.type==='hand' && i<phases.length) s.phase = phases[i++]; } }
function substep(sc, dt){
  sc.t += dt; const atoms = sc.atoms, S = sc.S; const pending = [];
  for(const a of atoms){ a.fx=0; a.fy=0; a.tq=0; }
  for(let i=0;i<atoms.length;i++) for(let j=i+1;j<atoms.length;j++){
    const A=atoms[i], B=atoms[j]; const dx=B.x-A.x, dy=B.y-A.y; const d=Math.hypot(dx,dy)||0.001; const ux=dx/d, uy=dy/d;
    if(findBond(A,B)) continue;
    const minD = (A.R+B.R)*0.92;
    if(d<minD && !pathLen(A,B,3)){ const f=(minD-d)*K_REP; A.fx-=ux*f; A.fy-=uy*f; B.fx+=ux*f; B.fy+=uy*f; } // atoms within two bonds of each other (a hydrogen and its carbon's neighbour) may pass through one another: a bond can rotate in 3-D, and a hydrogen has to be able to swing to the other side of its carbon for a chain to curl into a ring (James, 2026-09-04)
    let kind = canBond(A,B); if(kind && (sc.cool.get(A.id+':'+B.id)||0) > sc.t) kind = null;
    if(kind && d < A.R+B.R+(A.e.reach+B.e.reach)*S*1.2 && pathLen(A,B,4) > 0) kind = null; // no three- or four-membered rings: atoms fewer than five bonds apart along one molecule leave each other alone (five- and six-rings close fine)
    if(sc.hbonds && !kind) hbondForce(sc,A,B,d,ux,uy);
    if(kind){
      const reach = A.R+B.R+(A.e.reach+B.e.reach)*S*1.2;
      if(d<reach){ const f=K_ATT*(1-d/reach)*(1+0.5*(kind==='ionic')); A.fx+=ux*f; A.fy+=uy*f; B.fx-=ux*f; B.fy-=uy*f; }
      if(d < (A.R+B.R)*0.985) pending.push([A,B,kind]);
    } else {
      if(A.charge*B.charge<0){ const reach=(A.R+B.R)*3; if(d<reach){ const f=K_ATT*0.9*(1-d/reach); A.fx+=ux*f; A.fy+=uy*f; B.fx-=ux*f; B.fy-=uy*f; } if(d<A.R+B.R+8*S) pending.push([A,B,'tether']); }
      else if(sc.live && d<minD+2*S && !(sc.hbonds && hbPair(A,B))){
        const rel = (B.vx-A.vx)*ux + (B.vy-A.vy)*uy; // negative = approaching
        const key = A.id+':'+B.id; const last = sc.lastBounce.get(key)||-9;
        if(rel < -70 && sc.t-last > 1.1){ sc.lastBounce.set(key, sc.t); bounce(sc,A,B); }
      }
    }
  }
  for(const b of sc.bonds){
    const A=b.a, B=b.b; const dx=B.x-A.x, dy=B.y-A.y; const d=Math.hypot(dx,dy)||0.001; const ux=dx/d, uy=dy/d;
    const rel = (B.vx-A.vx)*ux + (B.vy-A.vy)*uy; const fd = rel*K_BD; A.fx+=ux*fd; A.fy+=uy*fd; B.fx-=ux*fd; B.fy-=uy*fd;
    const fr=(d-b.L)*(b.ionic?K_SPR*0.6:K_SPR); A.fx+=ux*fr; A.fy+=uy*fr; B.fx-=ux*fr; B.fy-=uy*fr;
    if(b.ionic || b.metallic) continue;
    for(const [X,Y] of [[A,B],[B,A]]){
      let k=-1; for(let i=0;i<X.n;i++){ const s=X.slots[i]; if(s && s.type==='bond' && s.bond===b){ k=i; break; } }
      if(k<0) continue; const ang = slotAng(X,k);
      const ax = X.x+Math.cos(ang)*b.L, ay = X.y+Math.sin(ang)*b.L; const ex=ax-Y.x, ey=ay-Y.y;
      const vx=(Y.x-X.x)/d, vy=(Y.y-X.y)/d; const along=ex*vx+ey*vy; let px=ex-along*vx, py=ey-along*vy; const pm=Math.hypot(px,py); if(pm>60*S){ px*=60*S/pm; py*=60*S/pm; }
      { const err=wrap(ang-Math.atan2(Y.y-X.y,Y.x-X.x)); if(Math.abs(err)>Math.PI/2){ const sg=err>0?1:-1; px=-vy*sg*60*S; py=vx*sg*60*S; } } // more than 90° off its slot: the sideways projection dies out near 180°, so push full-strength the short way round (a hydrogen wedged inside a ring, 2026-09-04)
      const rvx=Y.vx-X.vx, rvy=Y.vy-X.vy; const rt=rvx*(-vy)+rvy*vx; const tx=px*K_ANG - (-vy)*rt*K_TD, ty=py*K_ANG - vx*rt*K_TD;
      Y.fx+=tx; Y.fy+=ty; X.fx-=tx; X.fy-=ty; Y.afx=(Y.afx||0)+tx; Y.afy=(Y.afy||0)+ty; X.afx=(X.afx||0)-tx; X.afy=(X.afy||0)-ty;
      const want = Math.atan2(Y.y-X.y, Y.x-X.x); X.tq += wrap(want-ang)*K_TQ;
    }
  }
  // shape forces may bend a molecule but never spin it: cancel the angle springs' net torque per molecule (chains with the uneven
  ringForces(sc);
  // tetra slots otherwise turn forever — James caught propane rotating, 2026-09-03)
  { const seen=new Set();
    for(const a0 of atoms){ if(seen.has(a0) || !a0.bonds.length) continue; const comp=component(a0); for(const a of comp) seen.add(a); if(comp.length<2) continue;
      let cx=0, cy=0; for(const a of comp){ cx+=a.x; cy+=a.y; } cx/=comp.length; cy/=comp.length;
      let tau=0, I=0; for(const a of comp){ const rx=a.x-cx, ry=a.y-cy; tau += rx*(a.afy||0) - ry*(a.afx||0); I += rx*rx+ry*ry; }
      if(I>1e-6 && tau!==0){ const lam=-tau/I; for(const a of comp){ const rx=a.x-cx, ry=a.y-cy; a.fx += lam*(-ry); a.fy += lam*rx; } }
      // and a molecule that IS spinning (a snap, a drag let go) settles quickly: whole-body spin fades at ROT_DAMP per second (James: "a little rotation is ok, but it should fade rather quickly")
      if(I>1e-6){ let L=0; for(const a of comp){ const rx=a.x-cx, ry=a.y-cy; L += rx*a.vy - ry*a.vx; } const om=L/I; const k=om*ROT_DAMP; for(const a of comp){ const rx=a.x-cx, ry=a.y-cy; a.fx += k*ry; a.fy += -k*rx; } } }
    for(const a of atoms){ a.afx=0; a.afy=0; } }
  const damp = Math.exp(-DAMP_RATE*dt), odamp = Math.exp(-OM_DAMP*dt); const cx=sc.W/2, cy=sc.H/2;
  // while dragging, the rest of the molecule holds still in proportion to how many bonds away it is, so a chain bends instead of sliding as one stiff body (James, 2026-09-04: "can't get it to hold still while I bend it around")
  for(const a of atoms) a.hops=0; if(sc.drag){ const q=[sc.drag]; sc.drag.hops=0; const seen=new Set(q); while(q.length){ const x=q.shift(); for(const b of x.bonds){ const o=other(b,x); if(!seen.has(o)){ seen.add(o); o.hops=x.hops+1; q.push(o); } } } }
  const kc = (sc.kCenter!==undefined ? sc.kCenter : K_CENTER); const hk = sc.heat ? sc.heat*sc.heat*HEAT_K*S*Math.sqrt(dt) : 0;
  for(const a of atoms){
    if(a===sc.drag){ const dd=Math.exp(-DRAG_DAMP*dt); a.fx += (sc.pointer.x-a.x)*K_DRAG; a.fy += (sc.pointer.y-a.y)*K_DRAG; a.vx += a.fx*dt; a.vy += a.fy*dt; a.vx*=dd; a.vy*=dd; a.x += a.vx*dt; a.y += a.vy*dt; }
    else {
      a.fx += (cx-a.x)*kc; a.fy += (cy-a.y)*kc; if(hk){ a.vx += (Math.random()-0.5)*hk; a.vy += (Math.random()-0.5)*hk; } a.vx += a.fx*dt; a.vy += a.fy*dt; const dm = a.hops ? Math.exp(-(DAMP_RATE+K_HOLD*Math.min(a.hops,6))*dt) : damp; a.vx*=dm; a.vy*=dm; a.x += a.vx*dt; a.y += a.vy*dt;
      const m = a.R+2; if(a.x<m){ a.x=m; a.vx=Math.abs(a.vx)*0.5; } if(a.x>sc.W-m){ a.x=sc.W-m; a.vx=-Math.abs(a.vx)*0.5; } const top=(sc.topY||0)+m; if(a.y<top){ a.y=top; a.vy=Math.abs(a.vy)*0.5; } if(a.y>sc.H-m){ a.y=sc.H-m; a.vy=-Math.abs(a.vy)*0.5; }
    }
    a.om += a.tq*dt; a.om *= odamp; a.th += a.om*dt;
  }
  for(const [A,B,kind] of pending){ if(findBond(A,B)) continue; if(kind==='tether'){ if(A.charge*B.charge<0) bondEvent(sc,A,B,'tether'); } else if(canBond(A,B)===kind) bondEvent(sc,A,B,kind); }
  if(sc.drag){ const D=sc.drag; for(const b of D.bonds){ if(b.ionic || b.metallic) continue; const o=other(b,D); const pd=Math.hypot(sc.pointer.x-o.x, sc.pointer.y-o.y);
      if(b.minPd===undefined || pd<b.minPd) b.minPd=pd; // closest the cursor has come to the partner since this bond was made or last stepped up
      if(pd>b.minPd+o.R*0.5){ b.armed=true; b.minPd=pd; } // each step is its own push: the cursor has to back off half a radius and come again — one continuous shove that overshoots the contact never counts (James caught a third carbon arriving as a double, 2026-09-04)
      if(!b.armed || b.order>=3 || sc.t-b.born<0.6 || freeHands(D)<1 || freeHands(o)<1) continue;
      if(pd<o.R*0.9){ b.armed=false; b.minPd=pd; upgradeEvent(sc,b); } } } // drag one atom onto its bonded partner: share another pair
  if(sc.drag){ const behind = Math.max(0, component(sc.drag).length-2); const factor = 1 + 0.35*behind; for(const b of sc.drag.bonds.slice()){ if(sc.t-b.born < 0.8) continue; const o=other(b,sc.drag); const d=Math.hypot(o.x-sc.drag.x,o.y-sc.drag.y); sc.maxStretch=Math.max(sc.maxStretch||0,d-b.L); const limit = b.L + (b.ionic ? BREAK.ionic : BREAK[b.order])*S*factor*(sc.breakScale||1); if(d>limit && !sc.noBreak) breakEvent(sc,b); } }
  if(sc.heat>0.5){ for(const b of sc.bonds.slice()){ if(sc.t-b.born<0.8) continue; const d=Math.hypot(b.b.x-b.a.x,b.b.y-b.a.y); const limit=b.L+(b.ionic?BREAK.ionic:BREAK[b.order])*S*(sc.breakScale||1)*(2.4-1.7*sc.heat); if(d>limit) breakEvent(sc,b); } }
  sc.effects = sc.effects.filter(e => sc.t - e.t0 < e.dur);
}

// ---------- events (hero only) ----------
function bondEvent(sc,A,B,kind){
  const b = link(sc,A,B,kind); if(!b) return; if(!sc.live) return;
  const mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
  if(kind==='covalent'){
    sc.effects.push({ type:'flash', x:mx, y:my, t0:sc.t, dur:0.55, order:b.order });
    sndChord([A.e.pitch,B.e.pitch], b.order, false);
    const more = freeHands(A)>0 && freeHands(B)>0 ? ' Both still have a place open: drag one onto the other and they share a second pair.' : '';
    const w = b.order===1 ? cap(A.e.name)+' and '+B.e.name+' share one pair of electrons. A single bond; the pair counts for both.'+more
          : b.order===2 ? 'Two pairs shared: a double bond. It takes more to pull apart than a single.'
          : 'Three pairs shared: a triple bond, one of the strongest there is.';
    whisper(sc, 'snap', w);
  } else if(kind==='metal'){
    sc.effects.push({ type:'pop', x:mx, y:my, t0:sc.t, dur:0.3 }); sndThud();
    const n=component(A).length; if(sc.onMetal) sc.onMetal(n); if(n>=3 && !sc.metalSaid){ sc.metalSaid=true; whisper(sc, 'metal', 'Copper atoms pack together, and their loose outer electrons stop belonging to any one atom. They drift through the whole block. That is a metal.'); }
  } else if(kind==='ionic'){
    sc.effects.push({ type:'fly', from:b.a, to:b.b, t0:sc.t, dur:0.45 });
    sndGliss(b.a.e.pitch, b.b.e.pitch);
    whisper(sc, 'handoff', 'One electron moved from '+b.a.e.name+' to '+b.b.e.name+'. Both outer shells are full now, and the two ions hold together by charge.');
  } else {
    whisper(sc, 'charge', 'Opposite charges. They hold together again; no electron needed to move.');
  }
  checkMolecule(sc, A);
}
function upgradeEvent(sc,b){
  const A=b.a, B=b.b; b.order += 1; b.born = sc.t; b.L = bondLen(sc,b); rebuild(sc,A); rebuild(sc,B); for(const x of [A,B]) for(const bb of x.bonds) bb.L=bondLen(sc,bb);
  if(!sc.live) return;
  const mx=(A.x+B.x)/2, my=(A.y+B.y)/2; sc.effects.push({ type:'flash', x:mx, y:my, t0:sc.t, dur:0.55, order:b.order }); sndChord([A.e.pitch,B.e.pitch], b.order, false);
  whisper(sc, 'snap', b.order===2 ? 'A second pair shared: a double bond. It takes more to pull apart than a single, and it cannot twist.' : 'A third pair: a triple bond, one of the strongest there is.');
  checkMolecule(sc, A);
}
function breakEvent(sc,b){
  const A=b.a, B=b.b; unlink(sc,b);
  const k1 = Math.min(A.id,B.id)+':'+Math.max(A.id,B.id); sc.cool.set(k1, sc.t+0.9);
  const dx=B.x-A.x, dy=B.y-A.y, d=Math.hypot(dx,dy)||1; const ux=dx/d, uy=dy/d; A.vx-=ux*140; A.vy-=uy*140; B.vx+=ux*140; B.vy+=uy*140;
  if(!sc.live) return;
  const mx=(A.x+B.x)/2, my=(A.y+B.y)/2; sc.effects.push({ type:'pop', x:mx, y:my, t0:sc.t, dur:0.4 }); sndPop();
  if(sc.onBreak) sc.onBreak(b);
  if(b.ionic) whisper(sc, 'apart', 'Pulled apart. Both ions keep their charge; bring them back and they hold again.');
  else whisper(sc, 'apart', b.order===1 ? 'Pulled apart. A single bond is one shared pair, and it gives first.' : b.order===2 ? 'A double bond broke. Two shared pairs take more to separate than one.' : 'A triple bond broke. Three shared pairs; that took the most.');
}
function bounce(sc,A,B){
  const full = isComplete(A) ? A : isComplete(B) ? B : null; if(!full) return;
  sc.effects.push({ type:'ripple', atom:full, t0:sc.t, dur:0.6 }); sndThud();
  if(sc.onRefuse) sc.onRefuse(full);
  if(full.bonds.length){ const key = formulaKey(component(full)); const nm = KNOWN[key]; whisper(sc, 'no room', (nm ? cap(nm) : 'That one')+' has every outer place filled. Nothing else can bond to it.'); }
  else whisper(sc, 'full', cap(full.e.name)+'’s outer shell is already full. It does not bond.');
}
function checkMolecule(sc, a){
  const comp = component(a); if(comp.length<2) return;
  let net=0; for(const x of comp){ if(freeHands(x)>0 || canGive(x)) return; net += x.charge; } if(net!==0) return;
  const key = formulaKey(comp); const nm = KNOWN[key]; if(!nm) return;
  for(const x of comp) x.tagT=sc.t; // the name tag fades in from here
  const pitches = [...new Set(comp.map(x=>x.e.pitch))]; sndChord(pitches, 1, true);
  whisper(sc, 'made', MADE_LINES[key] || ('You made '+nm+'.'));
  if(sc.onMade) sc.onMade(key, nm);
}

let AC = null, muted = false, VOL = 1;
function out(ac){ if(!ac._master){ ac._master = ac.createGain(); ac._master.gain.value = VOL; ac._master.connect(ac.destination); } return ac._master; }
function audio(){ if(muted) return null; try{ if(!AC) AC = new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==='suspended') AC.resume(); return AC; }catch(e){ return null; } }
function tone(ac,f,t0,dur,type,g,f1){ const o=ac.createOscillator(), a=ac.createGain(); o.type=type; o.frequency.setValueAtTime(f,t0); if(f1) o.frequency.exponentialRampToValueAtTime(f1,t0+dur*0.8); a.gain.setValueAtTime(0.0001,t0); a.gain.exponentialRampToValueAtTime(g,t0+0.012); a.gain.exponentialRampToValueAtTime(0.0001,t0+dur); o.connect(a); a.connect(out(ac)); o.start(t0); o.stop(t0+dur+0.05); }
function click(ac,t0){ const len=Math.floor(ac.sampleRate*0.03); const b=ac.createBuffer(1,len,ac.sampleRate); const d=b.getChannelData(0); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3); const n=ac.createBufferSource(); const g=ac.createGain(); g.gain.value=0.22; n.buffer=b; n.connect(g); g.connect(out(ac)); n.start(t0); }
function sndChord(freqs,order,resolved){ const ac=audio(); if(!ac) return; try{ const t=ac.currentTime; click(ac,t); freqs.forEach((f,i)=>tone(ac,f,t+0.02*i,0.9+0.2*order,i?'triangle':'sine',0.09)); if(order>1) tone(ac,freqs[0]*1.5,t+0.05,0.8,'sine',0.05); if(resolved) tone(ac,freqs[0]*2,t+0.14,1.6,'sine',0.06); }catch(e){} }
function sndThud(){ const ac=audio(); if(!ac) return; try{ tone(ac,95,ac.currentTime,0.22,'sine',0.25,55); }catch(e){} }
function sndGliss(f0,f1){ const ac=audio(); if(!ac) return; try{ tone(ac,f0,ac.currentTime,0.55,'sine',0.12,f1); }catch(e){} }
function sndPop(){ const ac=audio(); if(!ac) return; try{ tone(ac,520,ac.currentTime,0.16,'triangle',0.12,180); }catch(e){} }

function glow(ctx,x,y,r,color,a){ const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,rgba(color,a)); g.addColorStop(1,rgba(color,0)); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill(); }
function bead(ctx,x,y,r,color){ glow(ctx,x,y,r*3.4,color||COL.electron,0.6); ctx.fillStyle='rgba(243,248,255,0.97)'; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill(); }
function ring(ctx,x,y,r,color,a,w){ ctx.strokeStyle=rgba(color,a); ctx.lineWidth=w; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.stroke(); }
function tendril(ctx,x0,y0,ang,len,wave,S,color){
  const dir = ang+wave; const x2=x0+Math.cos(dir)*len, y2=y0+Math.sin(dir)*len; const x1=x0+Math.cos(ang)*len*0.55, y1=y0+Math.sin(ang)*len*0.55;
  const g=ctx.createLinearGradient(x0,y0,x2,y2); g.addColorStop(0,rgba(color,0.85)); g.addColorStop(1,rgba(color,0.04));
  ctx.strokeStyle=g; ctx.lineWidth=2.6*S; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.quadraticCurveTo(x1,y1,x2,y2); ctx.stroke();
  glow(ctx,x2,y2,6*S,color,0.5); ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x2,y2,1.7*S,0,TAU); ctx.fill();
}
function nearestPartner(sc,a){
  let best=null, bd=1e9; for(const o of sc.atoms){ if(o===a) continue; const kind = canBond(a,o); if(!kind) continue; const d=Math.hypot(o.x-a.x,o.y-a.y); const reach=(a.R+o.R+(a.e.reach+o.e.reach)*sc.S*1.2)*1.5; if(d<reach && d<bd){ bd=d; best={o,d,reach}; } }
  return best;
}
function drawHalo(sc,a){ const ctx=sc.ctx; const g=ctx.createRadialGradient(a.x,a.y,0,a.x,a.y,a.R*1.55); g.addColorStop(0,sc.bgRGBA(0.92)); g.addColorStop(0.7,sc.bgRGBA(0.75)); g.addColorStop(1,sc.bgRGBA(0)); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(a.x,a.y,a.R*1.55,0,TAU); ctx.fill(); }
function drawAtom(sc,a,t){
  const ctx=sc.ctx, S=sc.S, {x,y,R}=a; const wob = RM?0:1;
  const complete = isComplete(a);
  let rc = a.e.tint || COL.electron, ra = 0.42;
  if(a.charge>0){ rc=COL.give; ra=0.55; } else if(a.charge<0){ rc=COL.take; ra=0.55; } else if(a.e.metal){ rc=a.e.core; ra=0.5; } else if(complete){ rc=COL.full; ra=0.5+0.14*wob*Math.sin(t*1.6+a.id); }
  if(a.outer>0){ glow(ctx,x,y,R*1.25,rc,complete?0.08:0.04); ring(ctx,x,y,R,rc,ra,1.4*S); }
  a.e.inner.forEach((cnt,i)=>{ const r = a.outer>0 ? R*(i===0?0.34:0.62) : R*(i===0?0.5:0.86); ring(ctx,x,y,r,a.outer>0?COL.electron:rc,a.outer>0?0.16:0.5,1*S); for(let k=0;k<cnt;k++){ const an=k*TAU/cnt+t*0.15*wob*(i?-1:1)+a.id; ctx.fillStyle=rgba(COL.electron,0.55); ctx.beginPath(); ctx.arc(x+Math.cos(an)*r,y+Math.sin(an)*r,1.3*S,0,TAU); ctx.fill(); } });
  glow(ctx,x,y,R*0.32,a.e.core,0.95); glow(ctx,x,y,R*0.16,'#FFFFFF',0.9);
  if(a.e.metal && a.charge===0 && !a.bonds.some(b=>b.metallic)){ const an=a.th+t*0.9*wob; bead(ctx,x+Math.cos(an)*R,y+Math.sin(an)*R,2.8*S); glow(ctx,x+Math.cos(an)*R,y+Math.sin(an)*R,7*S,COL.electron,0.3); } // a lone copper: its one loose electron, wandering the ring
  const near = (sc.live||true) ? nearestPartner(sc,a) : null;
  for(let k=0;k<a.n;k++){
    const s=a.slots[k]; if(!s) continue; const ang=slotAng(a,k);
    if(s.type==='lone'){ const dl = 5.5*S/R; bead(ctx,x+Math.cos(ang-dl)*R,y+Math.sin(ang-dl)*R,2.6*S); bead(ctx,x+Math.cos(ang+dl)*R,y+Math.sin(ang+dl)*R,2.6*S); }
    else if(s.type==='hand'){
      const bx=x+Math.cos(ang)*R, by=y+Math.sin(ang)*R; bead(ctx,bx,by,2.8*S);
      let dir=ang, len=a.e.reach*S*(0.75+0.25*wob*Math.sin(t*2.1+s.phase)); let wave = wob*0.42*Math.sin(t*2.6+s.phase);
      if(near){ const want=Math.atan2(near.o.y-y,near.o.x-x); const pull=Math.max(0,1-near.d/near.reach); dir = ang + wrap(want-ang)*Math.min(1,pull*1.6); wave*= (1-pull*0.7); len*= 1+0.5*pull; }
      tendril(ctx,bx,by,dir,len,wave,S,COL.electron);
    }
  }
  if(canGive(a)){ const r=R*1.32; const an=a.th+t*0.5*wob; const bx=x+Math.cos(an)*r, by=y+Math.sin(an)*r; glow(ctx,bx,by,8*S,COL.give,0.35+0.2*wob*Math.sin(t*5)); ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(bx,by,2.3*S,0,TAU); ctx.fill(); ring(ctx,x,y,r,COL.give,0.12,1*S); if(near){ const want=Math.atan2(near.o.y-by,near.o.x-bx); tendril(ctx,bx,by,want,a.e.reach*S*0.8*Math.max(0.2,1-near.d/near.reach),0,S,COL.give); } }
}
function drawBond(sc,b,t){
  const ctx=sc.ctx, S=sc.S, A=b.a, B=b.b; const mx=(A.x+B.x)/2, my=(A.y+B.y)/2; const ang=Math.atan2(B.y-A.y,B.x-A.x);
  if(b.metallic){ // the electron sea: a faint bridge and two electrons drifting along it, one each way, never settling
    ctx.strokeStyle=rgba(COL.electron,0.10); ctx.lineWidth=6*S; ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke();
    for(let k=0;k<2;k++){ const u=((t*0.35+b.phase+k*0.5)%1); const f = k===0 ? u : 1-u; const ex=A.x+(B.x-A.x)*f, ey=A.y+(B.y-A.y)*f; bead(ctx,ex,ey,2.6*S); glow(ctx,ex,ey,6*S,COL.electron,0.25); }
    return; }
  if(b.ionic){ ctx.save(); ctx.setLineDash([3*S,5*S]); const g=ctx.createLinearGradient(A.x,A.y,B.x,B.y); g.addColorStop(0,rgba(COL.give,0.5)); g.addColorStop(1,rgba(COL.take,0.5)); ctx.strokeStyle=g; ctx.lineWidth=1.6*S; ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke(); ctx.restore(); glow(ctx,mx,my,14*S,COL.full,0.12); return; }
  const age = Math.min(1,(sc.t-b.born)/0.4);
  ctx.save(); ctx.translate(mx,my); ctx.rotate(ang); const g=ctx.createRadialGradient(0,0,0,0,0,(12+4*b.order)*S); g.addColorStop(0,rgba(COL.electron,0.32*age)); g.addColorStop(1,rgba(COL.electron,0)); ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,(9+2*b.order)*S,(12+5*b.order)*S,0,0,TAU); ctx.fill(); ctx.restore();
  const px=-Math.sin(ang), py=Math.cos(ang);
  for(let i=0;i<b.order;i++){ const off=(i-(b.order-1)/2)*8.5*S; const cx=mx+px*off, cy=my+py*off; bead(ctx,cx+Math.cos(ang)*3.6*S,cy+Math.sin(ang)*3.6*S,2.5*S); bead(ctx,cx-Math.cos(ang)*3.6*S,cy-Math.sin(ang)*3.6*S,2.5*S); }
}
function drawIonFlash(sc,e){ const ctx=sc.ctx, a=e.atom; const k=(sc.t-e.t0)/e.dur; if(k>1) return; const c = e.gain ? COL.take : COL.give; ring(ctx,a.x,a.y,a.R*(1+0.9*k),c,0.7*(1-k),2*sc.S); glow(ctx,a.x,a.y,a.R*1.3,c,0.25*(1-k)); }
function drawEffects(sc){
  const ctx=sc.ctx, S=sc.S;
  for(const e of sc.effects){ const p=Math.min(1,(sc.t-e.t0)/e.dur);
    if(e.type==='flash'){ ring(ctx,e.x,e.y,(10+70*p)*S,COL.electron,(1-p)*0.7,2*S); glow(ctx,e.x,e.y,(30+20*e.order)*S,'#FFFFFF',(1-p)*0.5); }
    else if(e.type==='pop'){ ring(ctx,e.x,e.y,(6+40*p)*S,COL.coral,(1-p)*0.6,1.5*S); }
    else if(e.type==='ripple'){ const a=e.atom; ring(ctx,a.x,a.y,a.R+(4+34*p)*S,COL.full,(1-p)*0.6,1.8*S); }
    else if(e.type==='ionflash'){ drawIonFlash(sc,e); }
    else if(e.type==='fly'){ const q=p*p*(3-2*p); const x=e.from.x+(e.to.x-e.from.x)*q, y=e.from.y+(e.to.y-e.from.y)*q; glow(ctx,x,y,14*S,COL.give,0.7); bead(ctx,x,y,3*S,COL.give); }
  }
}
function isWaterO(a){ if(a.sym!=='O' || a.bonds.length!==2) return false; for(const b of a.bonds){ if(b.ionic || other(b,a).sym!=='H') return false; } return true; }
function hbPair(A,B){
  let O=null, Hh=null;
  if(A.sym==='O' && B.sym==='H'){ O=A; Hh=B; } else if(B.sym==='O' && A.sym==='H'){ O=B; Hh=A; }
  else if(A.sym==='O' && B.sym==='O'){ return (isWaterO(A) && isWaterO(B)) ? [A,B] : null; } else return null;
  if(!isWaterO(O) || Hh.bonds.length!==1) return null; const oo=other(Hh.bonds[0],Hh); if(oo===O || !isWaterO(oo)) return null; return [O,Hh];
}
function hbondForce(sc,A,B,d,ux,uy){ const hp=hbPair(A,B); if(!hp) return; const OO = hp[1].sym==='O'; const range=(A.R+B.R)*(OO?2.4:1.9); if(d>range || d<(A.R+B.R)*0.95) return; const f=(OO?K_HB*0.35:K_HB)*(1-d/range); A.fx+=ux*f; A.fy+=uy*f; B.fx-=ux*f; B.fy-=uy*f; }
function drawHBonds(sc){ const ctx=sc.ctx, at=sc.atoms; ctx.save(); ctx.setLineDash([2*sc.S,4*sc.S]); ctx.lineWidth=1.2*sc.S;
  for(let i=0;i<at.length;i++){ const A=at[i]; if(A.sym!=='O' || !isWaterO(A)) continue; for(let j=0;j<at.length;j++){ const B=at[j]; if(B.sym!=='H') continue; const hp=hbPair(A,B); if(!hp) continue; const d=Math.hypot(B.x-A.x,B.y-A.y); const range=(A.R+B.R)*1.5; if(d>range) continue; ctx.strokeStyle=rgba(COL.electron,0.1+0.45*(1-d/range)); ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke(); } }
  ctx.restore(); }


// ---------- labels: the Design rule (symbol in the nucleus; name + ledger outside the ring) ----------
function ledger(a){ // two lines, and every count names its shell (James, 2026-09-04: "2 · 1 of 8" was too obscure — keep saying which shell is the outer one)
  const n=a.e.inner.length+1; let first;
  const stripped = a.charge>0 && a.outer===0; // an ion with its outer shell emptied: an empty shell is not a thing that is there (James, 2026-09-04)
  if(n===1) first = stripped ? 'NO ELECTRONS' : 'SHELL 1: '+a.outer+' OF '+a.e.seats;
  else first=(n===2 ? 'SHELL 1 FULL' : 'SHELLS 1–'+(n-1)+' FULL')+(stripped ? ' · NO OUTER ELECTRONS' : ' · SHELL '+n+': '+a.outer+' OF '+a.e.seats);
  const fh = freeHands(a); let second;
  if(a.charge>0) second='CHARGE +'+a.charge; else if(a.charge<0) second='CHARGE −'+(-a.charge); else if(isComplete(a)) second='FULL'; else if(canGive(a)) second='GIVES '+a.outer; else if(fh>0) second='WANTS '+fh; else second='';
  return [first, second]; }
function rawLabelAngle(a){ if(!a.bonds.length) return Math.PI/2; let sx=0, sy=0, n=0; for(const x of component(a)){ if(x===a) continue; sx+=x.x; sy+=x.y; n++; } if(!n) return Math.PI/2;
  const dx=a.x-sx/n, dy=a.y-sy/n; if(Math.hypot(dx,dy) < 0.5*a.R) return null; // sitting at the centre of its own molecule: no away-direction, keep what it has
  return Math.atan2(dy, dx); }
function wrapA(d){ return Math.atan2(Math.sin(d), Math.cos(d)); }
function labelAngle(a){ const raw=rawLabelAngle(a); if(a.labTh===undefined){ a.labTh = raw==null ? Math.PI/2 : raw; a.labTo=a.labTh; }
  if(raw!=null && Math.abs(wrapA(raw-a.labTo))>0.5) a.labTo=raw; // move the label only for a real change (~30 degrees), never dither
  a.labTh += wrapA(a.labTo-a.labTh)*0.1; return a.labTh; }
function tracked(s){ return s.split('').join(' '); }
function drawLabels(sc){
  const ctx=sc.ctx; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const a of sc.atoms){
    const d=a.R*2;
    if(sc.nucleusMode){ // the guide's nucleus step: "3 protons" above the atom with an arrow down into the bare nucleus (James, 2026-09-04)
      const ps=Math.max(15, 0.17*d); ctx.font=ps+'px "Instrument Serif", serif'; ctx.fillStyle=WARM; const top=a.y-a.R-ps*1.9; ctx.fillText(a.e.Z+' proton'+(a.e.Z===1?'':'s'), a.x, top);
      ctx.strokeStyle='rgba(240,160,96,0.9)'; ctx.lineWidth=1.5; ctx.lineCap='round'; ctx.beginPath(); const y1=top+ps*0.8, y2=a.y-Math.max(6,0.07*d)-2; ctx.moveTo(a.x,y1); ctx.lineTo(a.x,y2); ctx.moveTo(a.x-5,y2-6); ctx.lineTo(a.x,y2); ctx.lineTo(a.x+5,y2-6); ctx.stroke();
      // the protons themselves: Z tiny dots packed in a spiral at the centre, so the count can be seen
      const pr=Math.max(1.6, 0.017*d), pitch=pr*2.6; ctx.fillStyle='rgba(240,160,96,0.95)';
      for(let k=0;k<a.e.Z;k++){ const rr = k===0 ? 0 : pitch*Math.sqrt(k)*0.62, th=k*2.39996; ctx.beginPath(); ctx.arc(a.x+Math.cos(th)*rr, a.y+Math.sin(th)*rr, pr, 0, TAU); ctx.fill(); } }
    else { ctx.font='600 '+Math.max(11, 0.24*d)+'px "Instrument Sans", sans-serif'; ctx.fillStyle='rgba(255,255,255,0.97)'; ctx.fillText(a.sym, a.x, a.y+0.5); }
    const th=labelAngle(a); const off = a.R + Math.max(22, 0.18*d) + 12*Math.abs(Math.cos(th));
    const lx=a.x+Math.cos(th)*off, ly=a.y+Math.sin(th)*off;
    const ns=Math.max(15, 0.17*d), ds=Math.max(9, 0.085*d);
    ctx.font=ns+'px "Instrument Serif", serif'; ctx.fillStyle=sc.inkRGBA(0.92); ctx.fillText(a.e.name, lx, ly-ds*0.75);
    ctx.font='500 '+ds+'px "JetBrains Mono", monospace'; const canSpace = 'letterSpacing' in ctx; if(canSpace) ctx.letterSpacing='0.1em';
    const nm=sc.nucleusMode; const [l1,l2]=ledger(a); ctx.fillStyle=sc.inkRGBA(0.62); ctx.fillText(l1, lx, ly+ns*0.62+(nm?ds*0.5:0));
    ctx.fillStyle=sc.inkRGBA(0.85); ctx.fillText(l2, lx, ly+ns*0.62+ds*(nm?2.3:1.5));
    drawBalance(sc, a, lx, ly+ns*0.62+ds*(nm ? 5.0 : 3.0), ds); // bespoke spacing on the nucleus step (James: tune these by hand) // the charge balance: protons against electrons, net at the end (James, 2026-09-04: whittling)
    if(sc.xmix>0.01 && sc.xset && sc.xset.has(a)){ ctx.globalAlpha=sc.xmix; ctx.fillStyle=sc.inkRGBA(0.8);
      const cfg = a.e.config || ''; if(cfg) ctx.fillText(cfg, lx, ly+ns*0.62+ds*4.6); ctx.globalAlpha=1; }
    if(canSpace) ctx.letterSpacing='0px';
  }
}
// the balance line: "5 P+  5 E−  0" in three inks — warm for protons, the electron blue for electrons, the net coloured by its sign.
// Small and dim on purpose: it sits to the side of the ledger and only speaks up when an atom becomes an ion.
const WARM='rgb(240,160,96)', COOL='rgb(160,205,255)';
function drawBalance(sc, a, x, y, ds){ const ctx=sc.ctx; const ne=a.e.Z-a.charge; const q=a.charge; const net = q===0 ? '0' : (q>0?'+':'−')+Math.abs(q); const up = sc.nucleusMode ? 1.6 : 1; // the nucleus step brings the line up to full strength
  const parts=[[a.e.Z+' P⁺', WARM, Math.min(1,0.55*up)],[' + ', null, Math.min(1,0.45*up)],[ne+' E⁻', COOL, Math.min(1,0.6*up)],[' = ', null, Math.min(1,0.45*up)],[net, q===0 ? null : (q>0?WARM:COOL), q===0 ? Math.min(1,0.5*up) : 0.95]];
  ctx.font='500 '+(ds*(sc.nucleusMode ? 1.7 : 0.95))+'px "JetBrains Mono", monospace'; let w=0; const ws=parts.map(p=>{ const m=ctx.measureText(p[0]).width; w+=m; return m; });
  let cx=x-w/2; ctx.textAlign='left'; for(let i=0;i<parts.length;i++){ const [t,c,al]=parts[i]; ctx.fillStyle = c ? c.replace('rgb(','rgba(').replace(')',','+al+')') : sc.inkRGBA(al); ctx.fillText(t, cx, y); cx+=ws[i]; } ctx.textAlign='center'; }

// ---------- X-ray: the same atom drawn as data ----------
function drawXray(sc){
  const ctx=sc.ctx, S=sc.S; sc.xmix += ((sc.xray?1:0)-sc.xmix)*(RM?1:0.12); if(sc.xmix<0.002){ sc.xset=null; return; }
  const comp = sc.xray || sc.lastX || []; sc.xset = new Set(comp); const m=sc.xmix; const z=sc.zoom||1;
  // the veil: the bench goes dark under the held molecule (drawn in world space so the camera transform stays put)
  ctx.save(); ctx.globalCompositeOperation='source-over'; ctx.fillStyle=sc.bgRGBA(0.88*m); ctx.fillRect(sc.camx-sc.W/z, sc.camy-sc.H/z, 2*sc.W/z, 2*sc.H/z); ctx.restore();
  // the cloud: the real Hartree-Fock density when the bake has this molecule (cloud.js); the layered glow otherwise
  const C=window.SnapCloud; let drew=false;
  if(C && C.data && comp.length>1){ ctx.save(); drew=C.draw(sc, comp, m); ctx.restore(); }
  if(!drew){
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for(const a of comp){ let x=a.x, y=a.y, r=a.R*1.7, al=0.5; if(a.e.seats===2){ const o=a.bonds.length ? other(a.bonds[0],a) : null; if(o){ x=o.x+(a.x-o.x)*0.78; y=o.y+(a.y-o.y)*0.78; } r=a.R*1.35; al=0.35; }
      for(let i=0;i<5;i++){ const rr=r*(0.35+0.16*i); glow(ctx,x,y,rr,i<2?'#FFFFFF':COL.electron,al*m*(0.22-0.03*i)); } }
    ctx.restore();
    ctx.save(); ctx.globalAlpha=m*0.92; ctx.font='500 '+(9.5*S)+'px "JetBrains Mono", monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='rgba(243,238,229,0.95)'; for(const a of comp) ctx.fillText('+'+a.e.Z, a.x, a.y+0.5); ctx.restore(); }
  const heavy = comp.filter(a=>a.e.seats===8);
  if(heavy.length===6 && comp.length===12){ const cx=heavy.reduce((s,a)=>s+a.x,0)/6, cy=heavy.reduce((s,a)=>s+a.y,0)/6; const rr=Math.hypot(heavy[0].x-cx,heavy[0].y-cy); ctx.save(); ctx.globalCompositeOperation='lighter'; for(let i=0;i<3;i++) ring(ctx,cx,cy,rr*(0.8+0.18*i),COL.electron,m*(0.35-0.1*i),(7-2*i)*S); ctx.restore(); }
}
// ---------- the frame (camera: zoom about camx/camy; the canvas is transparent over the dot matrix) ----------
function draw(sc){
  const ctx=sc.ctx, t=sc.t; if(!sc.W) return; const z=sc.zoom||1;
  ctx.setTransform(sc.DPR,0,0,sc.DPR,0,0); ctx.globalCompositeOperation='source-over'; ctx.clearRect(0,0,sc.W,sc.H);
  ctx.translate(sc.W/2,sc.H/2); ctx.scale(z,z); ctx.translate(-sc.camx,-sc.camy);
  const xr = sc.xmix>0.01;
  for(const a of sc.atoms) drawHalo(sc,a);
  ctx.globalCompositeOperation='lighter';
  if(sc.hbonds) drawHBonds(sc);
  ctx.globalAlpha = xr ? Math.max(0.15, 1-sc.xmix) : 1; for(const a of sc.atoms) drawAtom(sc,a,t); for(const b of sc.bonds) drawBond(sc,b,t); drawEffects(sc); ctx.globalAlpha=1;
  drawXray(sc);
  ctx.globalCompositeOperation='source-over'; drawLabels(sc); drawMoleculeTags(sc); drawSelection(sc);
}
// ---------- recognized molecules: the 24 on the panel get a name tag on the bench while they stand (James, 2026-09-04: "shouldn't it say H2O somewhere?") ----------
let PANEL=null;
function panelMap(){ if(PANEL) return PANEL; PANEL={}; for(const m of (window.SNAP_MOLECULES||[])){ PANEL[formulaKey(m.atoms.map(sym=>({sym})))]={ name:m.name, formula:m.formula }; } return PANEL; }
function drawMoleculeTags(sc){ const ctx=sc.ctx, map=panelMap(); const seen=new Set();
  for(const a of sc.atoms){ if(seen.has(a) || !a.bonds.length) continue; const comp=component(a); for(const x of comp) seen.add(x); if(comp.length<2) continue;
    let net=0, done=true; for(const x of comp){ if(freeHands(x)>0 || canGive(x)){ done=false; break; } net+=x.charge; } if(!done || net!==0) continue;
    const tag=map[formulaKey(comp)]; if(!tag) continue;
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,R=0,born=0; for(const x of comp){ x0=Math.min(x0,x.x); x1=Math.max(x1,x.x); y0=Math.min(y0,x.y); y1=Math.max(y1,x.y); R=Math.max(R,x.R); born=Math.max(born, x.tagT||0); }
    const al=Math.min(1, (sc.t-born)/0.6); if(al<=0) continue;
    const cx=(x0+x1)/2; const ns=Math.max(18, 0.22*R*2), fs=Math.max(10, 0.1*R*2); let y=y0-R-ns*1.9; if(y-ns<0) y=y1+R+ns*2.6; // above the molecule, below it if there is no room
    ctx.save(); ctx.globalAlpha=al; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=ns+'px "Instrument Serif", serif'; ctx.fillStyle=sc.inkRGBA(0.95); ctx.fillText(tag.name, cx, y);
    ctx.font='500 '+fs+'px "JetBrains Mono", monospace'; if('letterSpacing' in ctx) ctx.letterSpacing='0.14em'; ctx.fillStyle=sc.inkRGBA(0.6); ctx.fillText(tag.formula, cx, y+ns*0.85); ctx.restore(); }
}

// ---------- appetite tint: oklch to sRGB hex (the Design's colour table) ----------
function oklchHex(Lc,C,h){ const hr=h*Math.PI/180; const a=C*Math.cos(hr), b=C*Math.sin(hr);
  const l_=Lc+0.3963377774*a+0.2158037573*b, m_=Lc-0.1055613458*a-0.0638541728*b, s_=Lc-0.0894841775*a-1.2914855480*b;
  const l=l_*l_*l_, m=m_*m_*m_, s=s_*s_*s_;
  const r=4.0767416621*l-3.3077115913*m+0.2309699292*s, g=-1.2684380046*l+2.6097574011*m-0.3413193965*s, bb=-0.0041960863*l-0.7034186147*m+1.7076147010*s;
  const f=v=>{ v=Math.max(0,Math.min(1,v)); v = v<=0.0031308 ? 12.92*v : 1.055*Math.pow(v,1/2.4)-0.055; return Math.round(v*255); };
  return '#'+[r,g,bb].map(v=>f(v).toString(16).padStart(2,'0')).join(''); }
const APP_HUE = { 'wants 1':205, 'wants 2':160, 'wants 3':95, 'wants 4':40, 'gives 1':320, 'gives 2':290, 'gives 2+':290, 'gives 3':265, 'full':265 };
function appetiteHex(app, light){ const h=APP_HUE[app]||265; const C = app==='full' ? 0.015 : 0.15; return oklchHex(light?0.5:0.72, C, h); }
function tintElements(light){ for(const el of (window.SNAP_ELEMENTS||[])){ const e=ELEM[el.sym]; if(e){ e.tint = appetiteHex(el.app, light); e.core = e.tint; e.app = el.app; } } }
const CONFIG = { H:'1s¹', He:'1s²', Li:'[He] 2s¹', Be:'[He] 2s²', B:'[He] 2s² 2p¹', C:'1s² 2s² 2p²', N:'[He] 2s² 2p³', O:'[He] 2s² 2p⁴', F:'[He] 2s² 2p⁵', Ne:'[He] 2s² 2p⁶', Na:'[Ne] 3s¹', Mg:'[Ne] 3s²', Al:'[Ne] 3s² 3p¹', Si:'[Ne] 3s² 3p²', P:'[Ne] 3s² 3p³', S:'[Ne] 3s² 3p⁴', Cl:'[Ne] 3s² 3p⁵', Ar:'[Ne] 3s² 3p⁶' };
for(const k in CONFIG) if(ELEM[k]) ELEM[k].config = CONFIG[k];
function hit(sc,p){ let best=null, bd=1e9; for(const a of sc.atoms){ const d=Math.hypot(a.x-p.x,a.y-p.y); if(d<a.R+10 && d<bd){ bd=d; best=a; } } return best; }

window.SnapEngine = { APP_HUE, ELEM, KNOWN, MADE_LINES, COL, ionize, makeScene, resize, spawn, step, draw, link, rebuild, component, hit, removeAtoms, snapshot, restore, formulaKey, freeHands, canGive, isComplete, audio, setMuted:(m)=>{ muted=m; if(!m) audio(); }, isMuted:()=>muted, setVolume:(v)=>{ VOL=Math.max(0,Math.min(1,v)); if(AC && AC._master) AC._master.gain.value=VOL; }, tintElements, appetiteHex, oklchHex, slotAng, other, TAU };

})();
