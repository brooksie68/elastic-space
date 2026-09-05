// Snap! — the bench (src/worlds/snap, moved from tmp/snap 2026-09-04). Steps 1–3 of the plan in reimagine.md §13. Layout from tmp/snap/design (2a), engine from engine.js.
(function(){
'use strict';
const E = window.SnapEngine, ELS = window.SNAP_ELEMENTS;
const $ = id => document.getElementById(id);
const q = new URLSearchParams(location.search);
const root = document.documentElement;

// ---------- colours the canvas needs (dark only: James's call, 2026-09-03) ----------
function cssVar(n){ return getComputedStyle(root).getPropertyValue(n).trim(); }
function rgbOf(n){ return cssVar(n).split(/\s+/).map(Number); }
let BG=[27,24,21], INK=[243,238,229];

// ---------- the scene ----------
const cv = $('arena'), benchEl = $('bench');
const sc = E.makeScene(cv, { live:true, S:1.5 });
sc.kCenter = 0.004; sc.breakScale = 1/1.5; sc.hbonds = true; sc.heat = 0; sc.xray = null; sc.xmix = 0; sc.lastX = [];
sc.zoom = 1; sc.zoomT = 1; sc.camx = 0; sc.camy = 0;
sc.bgRGBA = a => 'rgba('+BG[0]+','+BG[1]+','+BG[2]+','+a+')';
sc.inkRGBA = a => 'rgba('+INK[0]+','+INK[1]+','+INK[2]+','+a+')';

// the text line
const lineEl=$('line'), whoEl=$('lineWho'), textEl=$('lineText'); let lineTimer=0;
function say(who, text, hold){ whoEl.textContent = who||''; textEl.innerHTML = text; lineEl.classList.add('on'); clearTimeout(lineTimer); if(!hold) lineTimer=setTimeout(()=>lineEl.classList.remove('on'), 7000); }
sc.say = say;
sc.onMade = (key, nm) => { if(guide && guide.active()) guide.onMade(key); else $('mode').textContent = 'Free · you made '+nm; };
sc.onRefuse = ()=>{ if(guide) guide.onRefuse(); }; sc.onBreak = ()=>{ if(guide) guide.onBreak(); }; sc.onIon = a=>{ if(guide) guide.onIon(a); }; sc.onMetal = n=>{ if(guide) guide.onMetal(n); };
let guide=null;

// ---------- layout ----------
function layout(){
  const stripH = (typeof lift!=='undefined' && lift.rest) ? lift.rest : $('strip').getBoundingClientRect().height; root.style.setProperty('--strip-h', stripH+'px');
  const r = cv.getBoundingClientRect(); const first = !sc.W;
  E.resize(sc); if(first || sc.camx===0){ sc.camx = sc.W/2; sc.camy = sc.H/2; }
  clampCam(); dots();
}
window.addEventListener('resize', layout);
if(window.ResizeObserver) new ResizeObserver(()=>layout()).observe(benchEl);

// ---------- camera ----------
function clampCam(){ const z=sc.zoom; if(z<=1){ sc.camx=sc.W/2; sc.camy=sc.H/2; return; } const hw=sc.W/2/z, hh=sc.H/2/z; sc.camx=Math.max(hw, Math.min(sc.W-hw, sc.camx)); sc.camy=Math.max(hh, Math.min(sc.H-hh, sc.camy)); }
function toWorld(sx,sy){ return { x:(sx-sc.W/2)/sc.zoom+sc.camx, y:(sy-sc.H/2)/sc.zoom+sc.camy }; }
function dots(){ const z=sc.zoom, zd=0.75*z, p=32*zd; const ox=sc.W/2-sc.camx*z, oy=sc.H/2-sc.camy*z; const r=Math.max(0.35, Math.min(5, 1.3*zd)), al=0.12*Math.min(1, 0.35+0.65*zd); // the dots run at 3/4 of the bench zoom: 100% looks like the old 75% (James), atoms unchanged
  benchEl.style.backgroundImage='radial-gradient(circle, rgba(255,236,214,'+al.toFixed(3)+') '+r.toFixed(2)+'px, transparent '+(r+0.6).toFixed(2)+'px)'; benchEl.style.backgroundSize=p+'px '+p+'px'; benchEl.style.backgroundPosition=(ox%p)+'px '+(oy%p)+'px'; }
let zoomAnchor=null;
cv.addEventListener('wheel', e=>{ e.preventDefault(); const r=cv.getBoundingClientRect(); const sx=e.clientX-r.left, sy=e.clientY-r.top; zoomAnchor={ sx, sy, w:toWorld(sx,sy) };
  const STEPS=[0.5,0.75,1,1.25,1.5,1.75,2]; let i=STEPS.findIndex(v=>Math.abs(v-sc.zoomT)<0.01); if(i<0) i=STEPS.reduce((b,v,k)=>Math.abs(v-sc.zoomT)<Math.abs(STEPS[b]-sc.zoomT)?k:b,0);
  i=Math.max(0, Math.min(STEPS.length-1, i+(e.deltaY<0?1:-1))); sc.zoomT=STEPS[i]; }, { passive:false }); // seven stops, James's numbers (2026-09-03)
function easeZoom(){ if(Math.abs(sc.zoomT-sc.zoom)<0.0005){ if(sc.zoom!==sc.zoomT){ sc.zoom=sc.zoomT; clampCam(); dots(); hud(); } return; }
  const z0=sc.zoom; sc.zoom += (sc.zoomT-sc.zoom)*0.18;
  if(zoomAnchor){ // keep the world point under the cursor where it was
    sc.camx = zoomAnchor.w.x - (zoomAnchor.sx-sc.W/2)/sc.zoom; sc.camy = zoomAnchor.w.y - (zoomAnchor.sy-sc.H/2)/sc.zoom; }
  clampCam(); dots(); hud(); }
function hud(){ $('hud').textContent = 'Zoom '+Math.round(sc.zoomT*100)+'% · '+(sc.xray ? 'release to close x-ray' : 'hold for x-ray'); }

// ---------- pointer on the bench: drag after 6px, X-ray after 350ms of stillness ----------
let down=null, holdTimer=0;
function spt(e){ const r=cv.getBoundingClientRect(); return toWorld(e.clientX-r.left, e.clientY-r.top); }
cv.addEventListener('pointerdown', e=>{ if(e.button===2) return; hideMenu(); E.audio(); const p=spt(e); const a=E.hit(sc,p); down={a,p,sx:e.clientX,sy:e.clientY,shift:e.shiftKey,pan:(e.button===1 || e.shiftKey) && !a}; sc.pointer=p; try{ cv.setPointerCapture(e.pointerId); }catch(err){} e.preventDefault(); clearTimeout(holdTimer);
  if(a && e.shiftKey){ toggleSel(a); down.a=null; down.pan=false; down.did=true; return; } // shift-click an atom: in or out of the selection, nothing else
  if(a) holdTimer=setTimeout(()=>{ if(down && !sc.drag){ sc.xray=E.component(a); sc.lastX=sc.xray; hud(); } },350); });
cv.addEventListener('pointermove', e=>{ if(!down) return; const p=spt(e); sc.pointer=p;
  if(!sc.drag && down.a && !sc.xray && Math.hypot(e.clientX-down.sx,e.clientY-down.sy)>6){ sc.drag=down.a; cv.classList.add('dragging'); clearTimeout(holdTimer); }
  if(down.did) return;
  if(!down.a && down.pan && sc.zoom>1){ // shift-drag or middle-drag on empty bench pans the camera
    const dx=(e.clientX-down.sx)/sc.zoom, dy=(e.clientY-down.sy)/sc.zoom; down.sx=e.clientX; down.sy=e.clientY; sc.camx-=dx; sc.camy-=dy; clampCam(); dots(); }
  else if(!down.a && !down.pan){ if(!sc.marquee && Math.hypot(e.clientX-down.sx,e.clientY-down.sy)>6) sc.marquee={ x0:down.p.x, y0:down.p.y, x1:p.x, y1:p.y }; if(sc.marquee){ sc.marquee.x1=p.x; sc.marquee.y1=p.y; } } }); // plain drag on empty bench: box-select
function release(e){ clearTimeout(holdTimer); const still = down && e && e.type==='pointerup' && Math.hypot(e.clientX-down.sx,e.clientY-down.sy)<=6; const click = down && down.a && !sc.drag && !sc.xray && still; const sym = click ? down.a.sym : null;
  if(sc.marquee){ const m=sc.marquee; const x0=Math.min(m.x0,m.x1), x1=Math.max(m.x0,m.x1), y0=Math.min(m.y0,m.y1), y1=Math.max(m.y0,m.y1); if(!(down && down.shift)) sc.sel.clear(); for(const a of sc.atoms) if(a.x>=x0 && a.x<=x1 && a.y>=y0 && a.y<=y1) sc.sel.add(a); sc.marquee=null; }
  else if(down && !down.did && still && !down.a) sc.sel.clear(); // a plain click on empty bench: nothing selected
  else if(click){ sc.sel.clear(); sc.sel.add(down.a); }
  down=null; sc.drag=null; sc.xray=null; if(sym) openElement(sym); cv.classList.remove('dragging'); hud(); try{ if(e&&e.pointerId!=null) cv.releasePointerCapture(e.pointerId); }catch(err){} }
cv.addEventListener('contextmenu', e=>{ e.preventDefault(); const a=E.hit(sc, spt(e)); E.audio(); showMenu(e.clientX, e.clientY, a); });
cv.addEventListener('pointermove', e=>{ mouse=spt(e); mouseIn=true; }); cv.addEventListener('pointerleave', ()=>{ mouseIn=false; });
cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release); cv.addEventListener('lostpointercapture', ()=>{ if(down) release(null); });

// ---------- bench editing: selection, delete, copy / paste / duplicate, the right-click menu ----------
sc.sel = new Set(); sc.marquee = null; window.__snapScene = sc; // dev handle for pane checks (the sims never use it)
let mouse=null, mouseIn=false, clip=null; // the last bench position of the cursor, and the copy buffer
if(window.SnapCloud) SnapCloud.load().then(()=>SnapCloud.warm()); // the hold view's clouds, built in idle time (served only; file:// keeps the layered glow)
function toggleSel(a){ if(sc.sel.has(a)) sc.sel.delete(a); else sc.sel.add(a); }
function selList(){ return sc.atoms.filter(a=>sc.sel.has(a)); }
function targetOf(a){ return (a && sc.sel.has(a)) ? selList() : a ? [a] : selList(); } // the menu acts on the selection when you right-clicked inside it, else on that one atom
function delAtoms(list){ if(!list.length) return; E.removeAtoms(sc, list); }
function copyAtoms(list){ if(!list.length) return; clip=E.snapshot(sc, list); }
// somewhere clear for a copy: the asked-for spot, else the nearest of a widening ring of spots (the trial-grid idea from landSet)
function clearSpot(snap, x, y){ const others=sc.atoms; const top=(sc.topY||0); const fits=(cx,cy)=>{ for(const s of snap.atoms){ const px=cx+s.x, py=cy+s.y; if(px<60||px>sc.W-60||py<top+60||py>sc.H-60) return false; for(const o of others){ if(Math.hypot(px-o.x,py-o.y) < o.R+50) return false; } } return true; };
  if(fits(x,y)) return { x, y }; let best=null; for(let r=60; r<=900 && !best; r+=60) for(let k=0;k<12;k++){ const an=k*Math.PI/6; const cx=x+Math.cos(an)*r, cy=y+Math.sin(an)*r; if(fits(cx,cy)){ best={ x:cx, y:cy }; break; } }
  return best || { x, y }; }
function pasteAt(x, y){ if(!clip) return; if(sc.atoms.length+clip.atoms.length>140){ say('enough','That is plenty for one bench. Clear some room first.'); return; } const p=clearSpot(clip, x, y); const made=E.restore(sc, clip, p.x, p.y); sc.sel.clear(); for(const a of made) sc.sel.add(a); hideInvite(); }
function pasteHere(){ const at = mouseIn && mouse ? mouse : { x:sc.camx, y:sc.camy }; pasteAt(at.x, at.y); }
function duplicateAtoms(list){ if(!list.length) return; const keep=clip; copyAtoms(list); const s=clip; let cx=0, cy=0; for(const a of list){ cx+=a.x; cy+=a.y; } cx/=list.length; cy/=list.length; pasteAt(cx+s.R*2+60, cy); clip=keep||clip; }
function selectAll(){ sc.sel.clear(); for(const a of sc.atoms) sc.sel.add(a); }
document.addEventListener('keydown', e=>{ const t=e.target; if(t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable)) return; const mod=e.ctrlKey||e.metaKey; const k=e.key.toLowerCase();
  if(e.key==='Delete' || e.key==='Backspace'){ if(sc.sel.size){ delAtoms(selList()); e.preventDefault(); } return; }
  if(mod && k==='c'){ if(sc.sel.size){ copyAtoms(selList()); e.preventDefault(); } return; }
  if(mod && k==='v'){ if(clip){ pasteHere(); e.preventDefault(); } return; }
  if(mod && k==='d'){ if(sc.sel.size){ duplicateAtoms(selList()); } e.preventDefault(); return; }
  if(mod && k==='a'){ selectAll(); e.preventDefault(); return; }
  if(e.key==='Escape'){ if(!menu.hidden){ hideMenu(); return; } if(sc.sel.size && !cardPinned && !openPanel && !lift.full) sc.sel.clear(); } });
// THE SCOPE (scope.js, an ES module with three.js — loaded the first time it is asked for; served only)
let scopeMod=null, scopeLoading=null;
function openScope(atoms){ hideCard(); closePanel(); if(scopeMod){ scopeMod.open(atoms, say); return; } if(!scopeLoading){ scopeLoading=import('./scope.js').then(m=>{ scopeMod=m; return m; }).catch(err=>{ scopeLoading=null; console.warn('scope failed to load', err); say('scope', 'The scope needs the page served; it does not open from a file on disk.'); return null; }); }
  scopeLoading.then(m=>{ if(m) m.open(atoms, say); }); }
const menu=$('menu');
function hideMenu(){ menu.hidden=true; menu.innerHTML=''; }
function showMenu(cx, cy, a){ const list=targetOf(a); const n=list.length; const items=[];
  if(a && n===1){ const lbl = a.charge!==0 ? 'back to neutral' : (a.e.metal||a.sym==='H'||a.sym==='C'||E.canGive(a)) ? 'lose an electron' : 'gain an electron'; items.push({ label:lbl, run:()=>E.ionize(sc,a) }); }
  if(a) items.push({ label:'scope', run:()=>openScope(E.component(a)) });
  if(n){ const cnt = n>1 ? ' '+n+' atoms' : ''; items.push({ label:'copy'+cnt, run:()=>copyAtoms(list) }); items.push({ label:'duplicate'+cnt, run:()=>duplicateAtoms(list) }); items.push({ label:'delete'+cnt, run:()=>delAtoms(list) }); }
  const px = mouse ? mouse.x : sc.camx, py = mouse ? mouse.y : sc.camy; items.push({ label:'paste', run:()=>pasteAt(px,py), off:!clip });
  if(sc.atoms.length){ items.push({ label:'select all', run:selectAll, off:sc.atoms.length===sc.sel.size }); items.push({ label:'clear the bench', run:()=>$('clear').click() }); }
  menu.innerHTML=''; for(const it of items){ const b=document.createElement('button'); b.type='button'; b.textContent=it.label; if(it.off) b.disabled=true; b.addEventListener('click', ()=>{ hideMenu(); it.run(); }); menu.appendChild(b); }
  menu.hidden=false; const w=menu.offsetWidth, h=menu.offsetHeight; menu.style.left=Math.min(cx, innerWidth-w-8)+'px'; menu.style.top=Math.min(cy, innerHeight-h-8)+'px'; }
document.addEventListener('pointerdown', e=>{ if(!menu.hidden && !menu.contains(e.target)) hideMenu(); }, true);
window.addEventListener('blur', hideMenu); window.addEventListener('wheel', ()=>{ if(!menu.hidden) hideMenu(); }, { passive:true });

// ---------- the table strip: a mini app (step 2, reworked on James's first read 2026-09-03) ----------
const strip=$('strip'), grid=$('grid'), handle=$('handle'); const tiles={};
const FACTS = window.SNAP_FACTS||{};
function hexA(hex,a){ const n=parseInt(hex.slice(1),16); return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'; }
function tint(t, app){ const c=E.appetiteHex(app, false); t.style.setProperty('--tc',c); t.style.setProperty('--tt', E.oklchHex(0.82, app==='full'?0.015:0.15, E.APP_HUE ? (E.APP_HUE[app]||265) : 265)); /* text tint: L 0.82 clears WCAG 4.5:1 on the tinted tile */ t.style.setProperty('--tf',hexA(c,0.16)); t.style.setProperty('--tb',hexA(c,0.45)); const h=E.APP_HUE ? (E.APP_HUE[app]||265) : 265, C=app==='full'?0.015:0.15;
  t.style.setProperty('--td', E.oklchHex(0.40, C, h));            // the divider: same hue, darker than the border reads
  t.style.setProperty('--td2', E.oklchHex(0.08, Math.min(C,0.03), h)); // the 1px shadow line to its right, darker than the tile fill
  t.style.setProperty('--th', hexA(c,0.78));                        // hover ring: the border tint, a little brighter
  return c; }
function buildTable(){
  grid.innerHTML='';
  const fi={6:0,7:0};
  for(const el of ELS){ const t=document.createElement('button'); t.type='button'; t.className='tile'+(el.f?' f':'')+(E.ELEM[el.sym]?'':' locked')+' bt'+(el.sym.length>1?' s2':' s1'); t.dataset.sym=el.sym; tint(t, el.app);
    if(el.f){ t.style.gridColumn=4+fi[el.period]; fi[el.period]++; t.style.gridRow=el.period+3; } else { t.style.gridColumn=el.group; t.style.gridRow=el.period; }
    t.innerHTML='<i class="z">'+el.Z+'</i><i class="m">'+(el.mass? el.mass.toFixed(el.mass<100?3:2) : '—')+'</i><b>'+el.sym+'</b><span class="nm">'+el.name+'</span><span class="sh">'+el.shells+'</span><span class="ap">'+el.app+'</span><i class="badge"></i>';
    tileEvents(t, el); grid.appendChild(t); tiles[el.sym]=t; }
  for(const [row,lab,title] of [[6,'La–Lu','Lanthanides'],[7,'Ac–Lr','Actinides']]){ const t=document.createElement('button'); t.type='button'; t.className='tile ph locked'; tint(t,'gives 2+'); t.style.gridColumn=3; t.style.gridRow=row;
    t.innerHTML='<i class="z">'+(row===6?57:89)+'–'+(row===6?71:103)+'</i><b>'+lab+'</b><span class="nm">'+title+'</span><span class="sh">below</span><span class="ap">gives 2+</span>';
    t.addEventListener('click',()=>{ if(!lift.full) setLift(2); }); grid.appendChild(t); }
  const lg=$('legend'); lg.innerHTML='';
  for(const app of ['wants 1','wants 2','wants 3','wants 4','gives 1','gives 2','gives 2+','gives 3','full']){ const s=document.createElement('span'); const c=E.appetiteHex(app,false); s.style.setProperty('--lc',hexA(c,0.16)); s.style.setProperty('--lb',hexA(c,0.45)); s.innerHTML='<i></i>'+app+(app==='full'?' · declines':''); lg.appendChild(s); }
}

// type that fits: every name the same size, the largest the widest name allows in one tile
const meas=document.createElement('canvas').getContext('2d');
function fitType(){
  const gap=3; const tileW=(grid.clientWidth - 17*gap)/18; if(!(tileW>0)) return;
  meas.font='400 100px "Atkinson Hyperlegible Next", Tahoma, sans-serif'; let nwMax=0; for(const el of ELS) nwMax=Math.max(nwMax, meas.measureText(el.name).width/100);
  meas.font='600 100px "Atkinson Hyperlegible Next", Tahoma, sans-serif'; let sw1=0, sw2=0; for(const el of ELS){ const w=meas.measureText(el.sym).width/100; if(el.sym.length>1) sw2=Math.max(sw2,w); else sw1=Math.max(sw1,w); }
  // the grid: symbol button = widest symbol of its letter count at 1.2× the name size + 6px each side; the divider + its shadow take 2px; the name gets 6px each side
  const per = nwMax + 1.2*sw2; const fit=Math.max(8, Math.min(16, Math.floor((tileW-12-2-12)/per*10)/10));
  const nm=Math.min(fit, 14.5); // type caps at 14.5px (James, 4K: bigger reads semibold); the tile keeps growing
  const sym=Math.round(nm*12)/10; root.style.setProperty('--sw1', Math.ceil(sym*sw1+12)+'px'); root.style.setProperty('--sw2', Math.ceil(sym*sw2+12)+'px');
  root.style.setProperty('--nm', nm+'px'); root.style.setProperty('--sym', sym+'px');
  lift.row0=Math.round(fit*2.3); // strip rows follow the UNCAPPED fit, so the tiles stay tall on a wide screen
  lift.row1=Math.max(lift.row0, Math.min(90, Math.floor((window.innerHeight-80-125)/9)));
  strip.style.setProperty('--fgap', '6px');
  grid.classList.toggle('compact-rows', lift.row1<64);
}

// three states, no in-between (James's calls): 0 = collapsed to the bar (the whole screen is bench), 1 = the strip, 2 = the full table; linear ~120ms
const lift={ t:1, full:false, row0:36, row1:90, hc:31, h0:0, h1:0, raf:0, from:1, to:1, t0:0 };
function measureLift(){
  fitType(); const wasUp=strip.classList.contains('up'); const oldH=strip.style.height;
  strip.classList.remove('up'); strip.style.height=''; grid.style.setProperty('--row',lift.row0+'px'); lift.h0=strip.offsetHeight;
  strip.classList.add('up'); grid.style.setProperty('--row',lift.row1+'px'); lift.h1=strip.offsetHeight;
  strip.classList.toggle('up', wasUp); strip.style.height=oldH; lift.hc=handle.offsetHeight+1; applyLift();
}
function liftHeight(t){ return t<=1 ? lift.hc+(lift.h0-lift.hc)*t : lift.h0+(lift.h1-lift.h0)*(t-1); }
function applyLift(){ const t=lift.t, up=t>1.5; strip.classList.toggle('up', up); lift.full = t>=2; strip.classList.toggle('collapsed', t<=0);
  grid.style.setProperty('--row', (t<=1 ? lift.row0 : lift.row0+(lift.row1-lift.row0)*(t-1)).toFixed(1)+'px');
  const h=liftHeight(t); strip.style.height = (t===1 ? '' : h.toFixed(1)+'px');
  handle.title = lift.full ? 'close the table' : t<=0 ? 'show the table' : 'open the full table';
  root.style.setProperty('--strip-top', (window.innerHeight - h)+'px');
  const rest = t<=1 ? h : lift.h0; if(lift.rest===undefined || Math.abs(rest-lift.rest)>0.5){ lift.rest=rest; root.style.setProperty('--strip-h', rest+'px'); } } // the bench grows as the strip collapses
function setLift(target){ if(!lift.h1) measureLift(); if(target===lift.t) return; lift.from=lift.t; lift.to=target; lift.t0=performance.now(); if(!lift.raf) lift.raf=requestAnimationFrame(liftTick); }
function liftTick(now){ lift.raf=0; const k=Math.min(1, (now-lift.t0)/120); lift.t=lift.from+(lift.to-lift.from)*k; applyLift(); if(k<1) lift.raf=requestAnimationFrame(liftTick); }
handle.addEventListener('click', e=>{ hideCard(); if(e.target.closest('.hidebtn')) return; setLift(lift.t>=2 ? 1 : lift.t<=0 ? 1 : 2); }); // boop up, boop down
$('hideTable').addEventListener('click', e=>{ e.stopPropagation(); hideCard(); setLift(0); }); // all the way down: the whole screen is bench
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && cardPinned){ hideCard(true); return; } if(e.key==='Escape' && lift.full){ hideCard(true); setLift(1); } });
document.addEventListener('pointerdown', e=>{ if(cardPinned && !card.contains(e.target) && !(cardFor && cardFor.contains(e.target))) hideCard(true); }, true);
window.addEventListener('resize', ()=>{ lift.h1=0; measureLift(); });

// the hover card: 0.6 s on a tile (James's calls), the same card family the panels will reuse
const card=$('card'); let cardTimer=0, cardFor=null, cardPinned=false;
const NUM=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
function num(n){ return n<=20 ? NUM[n] : String(n); }
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function paragraph(el){ const sh=el.shells.split('·').map(Number); const n=sh.length, outer=sh[n-1]; const full=(n===1?2:8); const N=cap(el.name); let s='';
  // the rule first, every time: electrons sit in shells, the first holds 2, the next 8, and atoms settle down when the outer one is full
  if(n===1) s=N+' has '+num(el.Z)+' electron'+(el.Z>1?'s':'')+'. Electrons sit in shells around the nucleus, and the first shell has room for two. ';
  else if(n===2) s=N+' has '+num(el.Z)+' electrons. Electrons sit in shells around the nucleus. The first shell holds two, and it is full. The second shell holds eight, and '+el.name+' has '+num(outer)+' in it. ';
  else s=N+' has '+num(el.Z)+' electrons, filled into '+num(n)+' shells from the inside out: '+sh.join(', ')+'. The inner shells are full. The outer shell has '+num(outer)+'. ';
  const a=el.app, m=/(\d)/.exec(a); const k=m?+m[1]:0;
  if(a==='full') s+='An atom is stable when its outer shell is full, and '+el.name+'\u2019s already is. It does not need to gain, lose, or share electrons, so it almost never reacts with anything.';
  else if(a.startsWith('wants')) s+='An atom is stable when its outer shell is full, so '+el.name+' needs '+num(k)+' more. It gets '+(k===1?'it':'them')+' by sharing electrons with other atoms. A shared pair counts for both atoms, and that is what a bond is. Near a metal, '+el.name+' can also take '+(k===1?'an electron':num(k)+' electrons')+' outright and become a negative ion, written '+el.sym+(k===1?'\u207b':k+'\u207b')+'.';
  else if(a==='gives 2+') s+='An atom is stable when its outer shell is full. For '+el.name+' the easiest way there is to give its two outer electrons away, and some from the shell underneath can go too. That is why '+el.name+' can carry more than one positive charge, and why its compounds come in different colors.';
  else s+='An atom is stable when its outer shell is full. For '+el.name+' the easiest way there is to give '+(k===1?'that one electron':'those '+num(k)+' electrons')+' away; the shell underneath is already full. Losing electrons leaves '+el.name+' with a positive charge, written '+el.sym+(k===1?'\u207a':k+'\u207a')+', and positive ions stick to negative ones.';
  return s; }
function fillCard(el){ const f=FACTS[el.sym]||{}; const c=E.appetiteHex(el.app,false); card.style.setProperty('--cc', c); card.classList.remove('mol');
  [['cMass','Mass'],['cShells','Shells'],['cPull','Pull'],['cMelt','Melts']].forEach(([id,lab])=>{ $(id).parentNode.querySelector('label').textContent=lab; });
  $('cSym').textContent=el.sym; $('cName').textContent=el.name; $('cZ').textContent='Z '+el.Z+' · '+el.app+(E.ELEM[el.sym]?'':' · not on the bench yet'); $('cPara').textContent=paragraph(el);
  $('cMass').textContent= el.mass ? el.mass.toFixed(3).replace(/0+$/,'').replace(/\.$/,'') : '—'; $('cShells').textContent=el.shells;
  $('cPull').textContent= f.en!=null ? f.en.toFixed(2) : '—'; $('cMelt').textContent= f.melt!=null ? (f.est?'~':'')+f.melt+' °C' : '—'; $('cNote').textContent=f.note||''; }
function showCard(t, el){ fillCard(el); card.hidden=false; const r=t.getBoundingClientRect(); const w=card.offsetWidth, h=card.offsetHeight;
  let x=r.left+r.width/2-w/2; x=Math.max(16, Math.min(window.innerWidth-w-16, x)); let y=r.top-h-14; if(y<80){ y=r.bottom+14; card.classList.add('below'); } else card.classList.remove('below');
  card.style.left=x+'px'; card.style.top=y+'px'; card.style.setProperty('--px', (r.left+r.width/2-x)+'px'); requestAnimationFrame(()=>card.classList.add('on')); cardFor=t; t.classList.add('lit-hover'); }
function hideCard(force){ if(cardPinned && !force) return; cardPinned=false; card.classList.remove('pinned'); clearTimeout(cardTimer); cardTimer=0; if(cardFor){ cardFor.classList.remove('lit-hover'); cardFor=null; } card.classList.remove('on'); card.hidden=true; }

const ghost=$('ghost'); let tdrag=null;
function tileEvents(t, el){
  t.addEventListener('pointerenter', ()=>{ clearTimeout(cardTimer); if(tdrag) return; cardTimer=setTimeout(()=>{ if(!tdrag){ if(cardPinned && cardFor!==t) hideCard(true); if(!cardPinned) showCard(t, el); } }, 600); });
  t.addEventListener('pointerleave', ()=>{ hideCard(); });
  t.addEventListener('pointerdown', e=>{ hideCard(); tdrag={ el, sx:e.clientX, sy:e.clientY, moving:false, id:e.pointerId, symZone: t.classList.contains('bt') && !!e.target.closest('b') }; try{ t.setPointerCapture(e.pointerId); }catch(err){} e.preventDefault(); });
  t.addEventListener('pointermove', e=>{ if(!tdrag) return; if(!tdrag.moving && Math.hypot(e.clientX-tdrag.sx,e.clientY-tdrag.sy)>6){ tdrag.moving=true; ghost.textContent=el.name; ghost.hidden=false; } if(tdrag.moving){ ghost.style.left=e.clientX+'px'; ghost.style.top=e.clientY+'px'; } });
  const end = e=>{ if(!tdrag) return; const d=tdrag; tdrag=null; ghost.hidden=true; try{ t.releasePointerCapture(d.id); }catch(err){}
    if(d.moving){ const r=cv.getBoundingClientRect(); const sr=strip.getBoundingClientRect(); if(e.clientY < sr.top){ const w=toWorld(e.clientX-r.left, e.clientY-r.top); land(el, w.x, w.y); if(lift.full) setLift(1); } }
    else if(d.symZone) openElement(el.sym); // buttonified tile: the symbol side opens the element panel (step 4), the name side lands an atom
    else land(el, sc.camx+(Math.random()-0.5)*220/sc.zoom, sc.camy+(Math.random()-0.5)*160/sc.zoom); }; // a click lands one atom, every click (James, 2026-09-03: free mode for now); the card is hover-only
  t.addEventListener('pointerup', end); t.addEventListener('pointercancel', ()=>{ tdrag=null; ghost.hidden=true; });
}
function land(el, x, y){
  E.audio(); if(window.SnapShells) window.SnapShells.show(el.sym); if(!E.ELEM[el.sym]){ say('table', el.name+' is on the table, not on the bench yet. The first eighteen are.'); return; }
  if(sc.atoms.length>=140){ say('enough','That is plenty for one bench. Clear some room first.'); return; }
  const m=60; x=Math.max(m, Math.min(sc.W-m, x)); y=Math.max(m, Math.min(sc.H-m, y));
  const a=E.spawn(sc, el.sym, x, y); a.vy=-40; hideInvite();
  const fh=E.freeHands(a);
  if(sc.atoms.length===1) say('', cap(el.name)+'. '+(E.isComplete(a) ? 'Its outer shell is full. It does not bond.' : E.canGive(a) ? 'It has '+num(a.outer)+' outer electron'+(a.outer===1?'':'s')+' to give away. Bring it something that wants '+(a.outer===1?'one':num(a.outer))+'.' : 'It wants '+num(fh)+' more. Bring it something that has electrons to share.'));
}

// ---------- rail controls ----------
// ---------- the toolbar and the molecules panel (step 3, round A) ----------
const MOLS = window.SNAP_MOLECULES||[]; const panels={ molecules:$('panelMolecules'), shells:$('panelShells'), element:$('panelElement'), contents:$('panelContents') }; let openPanel=null; const setCount={};
function tintOf(sym){ const el=ELS.find(e=>e.sym===sym); return el ? E.appetiteHex(el.app,false) : '#888'; }
function buildMolecules(){
  const g=$('molGrid'); g.innerHTML=''; $('molCount').textContent=MOLS.length+' · click to land the atoms apart';
  for(const m of MOLS){ const c=document.createElement('button'); c.type='button'; c.className='mcell'+(m.lit?'':' locked'); c.dataset.key=m.key;
    c.innerHTML='<canvas class="mpic" width="64" height="44"></canvas><span class="mname">'+m.name+'</span><span class="mform">'+m.formula+'</span>';
    g.appendChild(c); if(m.lit) window.SNAP_MINI(c.querySelector('canvas'), m, tintOf);
    c.addEventListener('click', ()=>{ hideCard(); if(m.lit) landSet(m); else say('soon', m.name+' lights up in round B.'); });
    c.addEventListener('pointerenter', ()=>{ clearTimeout(cardTimer); cardTimer=setTimeout(()=>showMolCard(c, m), 600); });
    c.addEventListener('pointerleave', hideCard); }
}
function showPanel(name){ for(const k in panels) panels[k].hidden = k!==name; openPanel=name; $('pos').classList.toggle('active', name==='contents'); document.body.classList.toggle('panel-open', !!name); document.body.classList.toggle('mol-open', name==='molecules'); document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===name)); }
function closePanel(){ if(!openPanel) return; hideCard(); showPanel(null); }
$('tabs').addEventListener('click', e=>{ const b=e.target.closest('.tab'); if(!b) return; const name=b.dataset.tab;
  if(name==='scope'){ const list=selList(); if(!list.length){ say('scope', 'Click an atom or a molecule first, then Scope.'); return; } openScope(E.component(list[0])); return; }
  if(!panels[name]){ say('soon', 'The '+name+' panel is not built yet.'); return; }
  if(openPanel===name) closePanel(); else showPanel(name); });
cv.addEventListener('pointerdown', e=>{ if(openPanel && !E.hit(sc, spt(e))) closePanel(); }); // a press on an atom keeps the panel: releasing without a drag opens that element
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && openPanel && !lift.full) closePanel(); });


// ---------- the element panel: the per-element card set (step 4) ----------
const CONTENT=window.SNAP_CONTENT||{}; const SHELL_ROOM=[2,8,18,32]; let elemSym=null, elemTab='over';
const eLadder=$('eLadder'); if(window.SnapShells) window.SnapShells.buildLadderInto(eLadder);
function shellText(el){ const sh=el.shells.split('·').map(Number); const n=sh.length, outer=sh[n-1]; const N=cap(el.name);
  let s='Electrons sit in shells around the nucleus, filled from the inside out. The first shell holds two, the second eight, the third eighteen, the fourth thirty-two. ';
  s+=N+' has '+num(el.Z)+' electron'+(el.Z>1?'s':'')+(n>1?' in '+num(n)+' shells: '+sh.join(', ')+'.':'.')+' ';
  if(n>1) s+='The inner shell'+(n>2?'s are':' is')+' full. ';
  if(el.app==='full') s+='The outer shell has '+num(outer)+', and that counts as full, so '+el.name+' is stable as it is.';
  else if(el.app.startsWith('wants')) s+='The outer shell has '+num(outer)+' and room for '+num(n===1?2:8)+', so '+el.name+' wants '+num(+el.app.slice(6))+' more.';
  else s+='The outer shell has '+num(outer)+'. Giving '+(outer===1?'it':'them')+' away leaves a full shell underneath, so that is what '+el.name+' does.';
  if(n>3 && el.app.startsWith('gives')) s+=' For the bigger atoms the inner shells fill in a more complicated order, and the outer count above is the one that matters for bonding.';
  return s; }
function numbers(el){ const f=FACTS[el.sym]||{}, k=(CONTENT[el.sym]||{}).num||{}; const rows=[['Atomic number', el.Z, 'protons'],['Mass', el.mass? el.mass.toFixed(3).replace(/0+$/,'').replace(/\.$/,'') : null, 'u'],['Shells', el.shells.replace(/·/g,' · '), null],['Pull on electrons', f.en!=null? f.en.toFixed(2) : null, 'Pauling'],['Melts', f.melt!=null? (f.est?'~':'')+f.melt : null, '°C'],['Boils', k.boil!=null? k.boil : null, '°C'],['Density', k.density||null, null],['Found', k.found||null, null]];
  return rows.filter(r=>r[1]!=null && r[1]!=='').map(r=>'<div><dt>'+r[0]+'</dt><dd>'+r[1]+(r[2]?'<small>'+r[2]+'</small>':'')+'</dd></div>').join(''); }
function fillElement(sym){ const el=ELS.find(e=>e.sym===sym); if(!el) return; elemSym=sym; const c=CONTENT[sym]||{}; const f=FACTS[sym]||{}; const tint=E.appetiteHex(el.app,false);
  panels.element.style.setProperty('--et', tint); $('eSym').textContent=el.sym; $('eName').textContent=el.name; $('eZ').textContent='Z '+el.Z+' · '+el.app+(E.ELEM[sym]?'':' · not on the bench yet');
  $('eOver').textContent = c.over || paragraph(el); $('eShellText').textContent=shellText(el); if(window.SnapShells) window.SnapShells.lightLadder(eLadder, el, tint);
  $('eNums').innerHTML=numbers(el); const world = c.world || ''; $('eWorld').textContent = world || f.note || '';
  const lines=(c.lines||[]).slice(); const pick={0:0,1:1,2:null,3:2}; for(let i=0;i<4;i++){ const k=pick[i]; $('eLine'+i).textContent = (k!=null && lines[k]) || (i===0 && !c.over && f.note ? f.note : ''); } // three lines per element: overview, shells, in the world (numbers stands alone)
  const hasWorld = !!(world || f.note); panels.element.querySelector('.etab[data-et="world"]').disabled = !hasWorld; if(elemTab==='world' && !hasWorld) setElemTab('over'); }
function setElemTab(name){ elemTab=name; panels.element.querySelectorAll('.etab').forEach(b=>b.classList.toggle('active', b.dataset.et===name)); panels.element.querySelectorAll('.epage').forEach(pg=>{ pg.hidden = pg.dataset.et!==name; }); }
function openElement(sym){ hideCard(true); fillElement(sym); if(openPanel!=='element') showPanel('element'); panels.element.scrollTop=0; }
$('etabs').addEventListener('click', e=>{ const b=e.target.closest('.etab'); if(b && !b.disabled) setElemTab(b.dataset.et); });
$('ePrev').addEventListener('click', ()=>{ const el=ELS.find(e=>e.sym===elemSym); const z=el? (el.Z===1?118:el.Z-1) : 1; openElement(ELS.find(e=>e.Z===z).sym); });
$('eNext').addEventListener('click', ()=>{ const el=ELS.find(e=>e.sym===elemSym); const z=el? (el.Z===118?1:el.Z+1) : 1; openElement(ELS.find(e=>e.Z===z).sym); });

// land a set spaced past the snap reach, on a ring around the bench centre, offset so repeats never stack
function pairReach(a,b){ return a.R+b.R+(a.e.reach+b.e.reach)*sc.S*1.2; }
function landSet(m, quiet, at){
  E.audio(); if(sc.atoms.length+m.atoms.length>140){ say('enough','That is plenty for one bench. Clear some room first.'); return; }
  const pr = openPanel==='molecules' ? panels[openPanel].getBoundingClientRect() : null; const cxw = at ? at.x : pr ? toWorld((pr.right+sc.W)/2, 0).x : sc.camx; const cyw = at ? at.y : sc.camy; // land right of an open panel, or where the guide asks
  const born=m.atoms.map(s=>E.spawn(sc, s, cxw, cyw)); hideInvite();
  let need=0; for(let i=0;i<born.length;i++) for(let j=i+1;j<born.length;j++) need=Math.max(need, pairReach(born[i],born[j])*1.4);
  const n=born.length; const r = n===1 ? 0 : Math.max(need/(2*Math.sin(Math.PI/n)), 90);
  const k=(setCount[m.key]=(setCount[m.key]||0)+1); const others=sc.atoms.filter(a=>!born.includes(a));
  let best=null; for(let trial=0; trial<15; trial++){ const rot=(k-1)*0.7+trial*0.9; const spread = n===1 ? 120 : r*0.7; const ox=((trial%5)-2)*spread, oy=(Math.floor(trial/5)-1)*spread; // a single atom still walks the trial grid (it used to land exactly on whatever was already there)
    const pos=born.map((a,i)=>({ x:cxw+ox+(n===1?0:Math.cos(rot+i*Math.PI*2/n)*r), y:cyw+oy+(n===1?0:Math.sin(rot+i*Math.PI*2/n)*r) }));
    let clear=1e9; pos.forEach((p,i)=>{ for(const o of others) clear=Math.min(clear, Math.hypot(p.x-o.x,p.y-o.y)-pairReach(born[i],o)*1.3); const m2=60; if(p.x<m2||p.x>sc.W-m2||p.y<(sc.topY||0)+m2||p.y>sc.H-m2) clear=Math.min(clear,-1); });
    if(!best || clear>best.clear) best={ clear, pos }; if(clear>0) break; }
  born.forEach((a,i)=>{ a.x=best.pos[i].x; a.y=best.pos[i].y; a.vx=0; a.vy=0; });
  if(!quiet){ say('', m.land||(m.name+', landed apart. <em>Bring them together.</em>')); $('mode').textContent='Free · '+m.name.toLowerCase()+', apart'; }
}
// the guide hands atoms in a row (the shells chapter): spaced past the snap reach, centred, two rows if the bench is narrow
// where the guide's atoms land: below the strip (text + drawing + arrow), never under it
function handY(){ const g=$('guide').getBoundingClientRect(), r=cv.getBoundingClientRect(); const below = g.height ? toWorld(0, g.bottom-r.top+110).y : sc.camy+150; return Math.max(sc.camy+150, Math.min(below, sc.H-120)); }
function landRow(syms){ E.audio(); const born=syms.map(s=>E.spawn(sc, s, sc.camx, sc.camy)); hideInvite();
  let reach=0; for(let i=0;i<born.length;i++) for(let j=i+1;j<born.length;j++) reach=Math.max(reach, pairReach(born[i],born[j]));
  const usable=sc.W-180, n=born.length; let per=n, gap=Math.min(reach*1.4, usable/(n-1)); // one row if it fits past the snap reach, else two
  if(gap<reach*1.05){ per=Math.ceil(n/2); gap=Math.min(reach*1.4, usable/(per-1)); }
  const rows=Math.ceil(n/per); const dy=Math.min(gap*0.95, (sc.H-140)/rows); const y0=handY()+(rows-1)/2*dy; // first row sits at the hand line, the rest below it
  born.forEach((a,i)=>{ const r=Math.floor(i/per), k=i%per, m=Math.min(per, n-r*per); a.x=sc.camx+(k-(m-1)/2)*gap; a.y=y0+(r-(rows-1)/2)*dy; a.vx=0; a.vy=0; }); }
function showMolCard(c, m){ card.classList.add('mol'); const main=m.atoms[0]; card.style.setProperty('--cc', tintOf(main));
  $('cSym').textContent=m.formula; $('cName').textContent=m.name; $('cZ').textContent=m.atoms.length+' atoms · '+(m.bonds||'');
  $('cPara').textContent=m.para||(m.name+' lights up in round B: its picture, its paragraph and its landing pattern.');
  const counts={}; for(const s of m.atoms) counts[s]=(counts[s]||0)+1; const from=Object.keys(counts).map(s=>ELS.find(e=>e.sym===s).name.toLowerCase()).join(', ');
  $('cMass').parentNode.querySelector('label').textContent='Atoms'; $('cMass').textContent=String(m.atoms.length);
  $('cShells').parentNode.querySelector('label').textContent='Bonds'; $('cShells').textContent=m.bonds||'—';
  $('cPull').parentNode.querySelector('label').textContent='Shape'; $('cPull').textContent=m.shape||'—';
  $('cMelt').parentNode.querySelector('label').textContent='Made of'; $('cMelt').textContent=from;
  $('cNote').textContent=m.note||''; card.hidden=false; const r=c.getBoundingClientRect(), pr=panels.molecules.getBoundingClientRect(); const w=card.offsetWidth, h=card.offsetHeight;
  let x=pr.right+16, y=r.top+r.height/2-h/2; y=Math.max(90, Math.min(window.innerHeight-h-16, y)); card.style.left=x+'px'; card.style.top=y+'px';
  card.style.setProperty('--py', (r.top+r.height/2-y)+'px'); requestAnimationFrame(()=>card.classList.add('on')); cardFor=c; c.classList.add('lit-hover'); }

const heatEl=$('heat'); let hdrag=null;
function setHeat(v){ sc.heat=Math.max(0,Math.min(1,v)); heatEl.style.setProperty('--heat-deg', (sc.heat*270)+'deg'); heatEl.style.setProperty('--knob', (225+sc.heat*270-90)+'deg'); $('heatLabel').textContent='HEAT '+sc.heat.toFixed(1); if(sc.heat>0.55 && !sc.heatWarned){ sc.heatWarned=true; say('heat','Hot. Watch which bonds go first.'); } }
heatEl.addEventListener('pointerdown', e=>{ hdrag={ y:e.clientY, h:sc.heat }; heatEl.setPointerCapture(e.pointerId); });
heatEl.addEventListener('pointermove', e=>{ if(hdrag) setHeat(hdrag.h + (hdrag.y-e.clientY)/120); });
heatEl.addEventListener('pointerup', ()=>{ hdrag=null; }); heatEl.addEventListener('wheel', e=>{ e.preventDefault(); setHeat(sc.heat - e.deltaY*0.0008); }, { passive:false });
setHeat(0);
function setMuted(m, fromControl){ E.setMuted(m); $('mute').classList.toggle('muted', m); try{ localStorage.setItem('snap-muted', m?'1':'0'); }catch(e){} if(!fromControl && soundCtl) soundCtl.setOn(!m); }
$('mute').addEventListener('click', ()=>setMuted(!E.isMuted()));
// the shared Elastic Space sound control (contract §6): Snap opens silent — sound is the greeting chords on interaction — so no autoplay attempt
let soundCtl = null;
if(window.ElasticSoundControl){ soundCtl = ElasticSoundControl.attach({ start(){ setMuted(false, true); }, stop(){ setMuted(true, true); }, setVolume(v){ E.setVolume(v); }, autoplay:false }); }
$('clear').addEventListener('click', ()=>{ hideCard(); sc.atoms=[]; sc.bonds=[]; sc.effects=[]; sc.drag=null; sc.xray=null; sc.cool.clear(); $('mode').textContent='Free · the bench is empty'; say('', 'Cleared.'); });
const invite=$('invite');
function hideInvite(byGuide){ if(invite.classList.contains('off')) return; invite.classList.add('off'); if(!byGuide && guide) setModeSw('free'); } // land something before Begin = free mode; the toggle is the way back
// ---------- guided mode (step 5) ----------
if(window.SnapGuide){ guide = window.SnapGuide.build({ sc, E, ELS, tiles, tintOf, mini:window.SNAP_MINI, audio:()=>E.audio(), setMode:t=>{ $('mode').textContent=t; },
  progress:()=>{ $('begin').querySelector('.cap').textContent='Continue'; },
  nucleus:v=>{ sc.nucleusMode=!!v; },
  enter:()=>{ hideInvite(true); document.querySelectorAll('.msw').forEach(b=>b.classList.toggle('active', b.dataset.m==='guided')); }, // a step link opens straight into the guide
  fresh:()=>{ $('begin').querySelector('.cap').textContent='Begin'; invite.classList.remove('off'); $('mode').textContent='Free · the bench is empty'; try{ history.replaceState(null, '', location.pathname+location.search); }catch(e){} },
  onPosition:(text, m)=>{ $('posText').textContent=text; document.querySelectorAll('.msw').forEach(b=>b.classList.toggle('active', b.dataset.m===m)); $('pos').hidden = m!=='guided'; if(m!=='guided' && openPanel==='contents') closePanel(); }, // the chip only shows in guided mode (James, 2026-09-04)
  closeContents:()=>{ if(openPanel==='contents') closePanel(); },
  hand:syms=>landSet({ key:'guide', name:'', atoms:syms }, true, { x:sc.camx, y:handY() }), handRow:landRow, clear:()=>{ sc.atoms.length=0; sc.bonds.length=0; sc.effects.length=0; } }); } // handed atoms land below the close-up drawing
function setModeSw(m){ if(!guide) return; if(m==='guided') guide.setGuided(); else { guide.setFree(); if(sc.atoms.length){ sc.atoms=[]; sc.bonds=[]; sc.effects=[]; sc.drag=null; sc.xray=null; sc.cool.clear(); } } /* Free always starts on a clear bench (James, 2026-09-04) */ document.querySelectorAll('.msw').forEach(b=>b.classList.toggle('active', b.dataset.m===m)); $('pos').hidden = m!=='guided'; if(m!=='guided' && openPanel==='contents') closePanel(); }
$('modesw').addEventListener('click', e=>{ const b=e.target.closest('.msw'); if(!b) return; E.audio(); hideInvite(true); setModeSw(b.dataset.m); });
$('tocRestart').addEventListener('click', ()=>{ if(!guide) return; E.audio(); closePanel(); guide.restart(); });
$('pos').addEventListener('click', ()=>{ if(!guide) return; if(openPanel==='contents') closePanel(); else { guide.contents(); showPanel('contents'); } });
$('begin').addEventListener('click', ()=>{ E.audio(); hideInvite(true); if(guide) guide.start(); else say('begin', 'Drag any element up from the table and see what it does.', true); });

// ---------- boot ----------
BG=rgbOf('--bg-rgb'); INK=rgbOf('--ink-rgb'); E.tintElements(false); buildTable(); buildMolecules(); window.SnapShells.build($('panelShells'), { ELS, tintOf });
if(q.get('mute')==='1') setMuted(true); else { try{ if(localStorage.getItem('snap-muted')==='1') setMuted(true); }catch(e){} }
layout(); if(!sc.W) setTimeout(layout, 50);
document.fonts && document.fonts.ready.then(()=>measureLift());
document.fonts && document.fonts.ready.then(()=>{});
let last=performance.now(), running=true;
// the bench's top wall sits at the guide strip's bottom while the strip shows, so nothing can drift under the text (James, 2026-09-04: hydrogens stuck behind the dead area)
function topWall(){ const g=$('guide'); if(!g.classList.contains('on') || g.classList.contains('min')){ sc.topY=0; return; } const gr=g.getBoundingClientRect(), r=cv.getBoundingClientRect(); sc.topY=Math.max(0, toWorld(0, gr.bottom-r.top+8).y); }
function loop(now){ const dt=Math.min(0.025,(now-last)/1000); last=now; if(!sc.W) layout(); if(running && sc.W){ easeZoom(); topWall(); E.step(sc,dt); E.draw(sc); } requestAnimationFrame(loop); }
document.addEventListener('visibilitychange', ()=>{ running=!document.hidden; last=performance.now(); });
requestAnimationFrame(loop);
window.__snap = { sc, say, land:(sym,x,y)=>land(ELS.find(e=>e.sym===sym), x, y), setHeat, setZoom:z=>{ sc.zoomT=z; }, lift:setLift, liftState:()=>({t:lift.t,full:lift.full,hc:lift.hc,h0:lift.h0,h1:lift.h1,rest:lift.rest,row0:lift.row0,row1:lift.row1,nm:root.style.getPropertyValue('--nm')}), card:(sym)=>{ const el=ELS.find(e=>e.sym===sym); showCard(tiles[sym], el); }, panel:showPanel, element:openElement, guide:()=>guide, elementTab:setElemTab, landSet:(k)=>landSet(MOLS.find(m=>m.key===k)), molCard:(k)=>{ const m=MOLS.find(x=>x.key===k); showMolCard(document.querySelector('.mcell[data-key="'+k+'"]'), m); }, summary:()=>({ W:sc.W, H:sc.H, atoms:sc.atoms.length, bonds:sc.bonds.length, zoom:sc.zoom }) };
})();
