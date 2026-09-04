// Snap! — the Shells panel: a short reader about shells themselves (step 3 round B, 2026-09-03).
// Five sections, each a picture and a few paragraphs. Register: the rule first, then the count. No story.
(function(){
'use strict';
const TAU=Math.PI*2;
const TEXT = {
  s1: { h:'What a shell is', p:[
    'Electrons sit in layers around the nucleus. Each layer is called a shell, and the shells fill from the inside out. The first shell holds two electrons. The second holds eight. The third can hold eighteen, and the fourth thirty-two.',
    'Oxygen has eight electrons. Two fill the first shell, and the other six sit in the second. Slide the bar to add electrons one at a time and watch where each one goes. Click any tile in the table and it shows here.' ] },
  s2: { h:'Why they matter', p:[
    'Everything an atom does with other atoms happens in its outer shell. If the outer shell is full, the atom does nothing; helium, neon and argon almost never react. If it is a few electrons short, the atom takes or shares electrons to fill it. If it holds only one or two, the atom gives them away and shows the full shell underneath.',
    'One row of the table shows the whole pattern. Lithium has one outer electron and gives it. Neon has eight and is done. In between, the pull on electrons rises step by step, and the tints on the table follow it.' ] },
  s3: { h:'What they look like', p:[
    'A shell is not a ring. It is a set of rooms called orbitals, and each room holds two electrons. The first shell has one room, an s orbital, shaped like a ball. So it holds two. The second shell has four rooms: one s ball and three p dumbbells, each pointing a different way. Four rooms, two electrons each, eight. The third shell adds five d rooms shaped like cloverleafs, for eighteen.',
    'These pictures are not drawings. Each dot is one place the electron might be, computed from the same equations chemists use. Where the dots are thick, the electron spends most of its time.' ] },
  s4: { h:'Is the electron a dot?', p:[
    'No. An electron has no measurable size, and inside its room it behaves like a wave spread through the whole space. The cloud shows where you would find it if you looked. Look, and you find it in one place. Look again, and it is somewhere else in the same cloud.',
    'The rings on the bench are bookkeeping. They count right, and counting is what bonding is about. Hold an atom for the X-ray and you see the cloud instead of the ring. Below, the same room three ways: the ring, the dots, and the fog they add up to.' ] },
  s5: { h:'Why the table has its shape', p:[
    'The rows of the table are the shells. Row one has two elements because the first shell holds two. Rows two and three have eight because the s and p rooms together hold eight. Then things go out of order: the d rooms of the third shell fill after the s room of the fourth. That is why row four is eighteen wide, and why the table has a block in the middle.',
    'For the eighteen elements on the bench, the two-then-eight rule holds exactly. Past calcium it still works for the outer shell, but the shells underneath fill in a more complicated order.' ] },
};
const CAP=[2,8,18,32];
let deps=null, panel=null, ladder=null, walk=null, walkName=null, current='O';

// ---------- the ladder ----------
function buildLadder(){
  ladder.innerHTML='';
  for(let i=0;i<4;i++){ const row=document.createElement('div'); row.className='lrow'; row.dataset.shell=i+1;
    row.innerHTML='<span class="ltag">Shell '+(i+1)+'</span><span class="lplaces"></span><span class="lcount"></span>';
    const pl=row.querySelector('.lplaces'); for(let k=0;k<CAP[i];k++){ const s=document.createElement('i'); pl.appendChild(s); }
    ladder.appendChild(row); }
  const extra=document.createElement('div'); extra.className='lextra'; ladder.appendChild(extra);
}
function showElement(sym){
  const el=deps.ELS.find(e=>e.sym===sym); if(!el) return; current=sym;
  const sh=el.shells.split('·').map(Number); const n=sh.length; const tint=deps.tintOf(sym);
  ladder.style.setProperty('--lt', tint);
  ladder.querySelectorAll('.lrow').forEach((row,i)=>{ const have=sh[i]||0; const cap=CAP[i]; row.classList.toggle('empty', have===0);
    row.querySelectorAll('.lplaces i').forEach((p,k)=>{ p.classList.toggle('lit', k<have); });
    const outer = i===n-1; let c = have===0 ? '' : have+' of '+cap;
    if(outer){ if(el.app==='full') c+=' · full'; else if(el.app.startsWith('wants')) c+=' · '+el.app; else if(el.app==='gives 2+') c+=' · gives 2, sometimes more'; else c+=' · '+el.app; }
    else if(have){ c+=' · full'; }
    row.querySelector('.lcount').textContent=c; row.classList.toggle('outer', outer); });
  const extra=ladder.querySelector('.lextra'); const more=sh.slice(4);
  extra.textContent = more.length ? 'And '+more.join(', ')+' more in shell'+(more.length>1?'s ':' ')+more.map((_,k)=>5+k).join(', ')+'. Past the fourth shell the filling order gets complicated; the outer shell still reads as above.' : '';
  walkName.innerHTML='<b style="color:'+tint+'">'+el.sym+'</b> '+el.name+' <span>· '+el.Z+' electron'+(el.Z>1?'s':'')+' · '+el.shells.replace(/·/g,' · ')+'</span>';
  if(el.Z<=20) walk.value=el.Z;
}

// ---------- the ramp: lithium to neon ----------
function miniAtom(cv, el){ const d=cv.width=cv.height=Math.round(72*Math.min(2, devicePixelRatio||1)); const ctx=cv.getContext('2d'); const s=d/72; ctx.scale(s,s);
  const c=deps.tintOf(el.sym); const sh=el.shells.split('·').map(Number); const cx=36, cy=36;
  const hexA=(h,a)=>{ const n=parseInt(h.slice(1),16); return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'; };
  const g=ctx.createRadialGradient(cx,cy,4,cx,cy,34); g.addColorStop(0,hexA(c,0.3)); g.addColorStop(1,hexA(c,0)); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,34,0,TAU); ctx.fill();
  ctx.fillStyle=hexA(c,0.95); ctx.beginPath(); ctx.arc(cx,cy,5,0,TAU); ctx.fill();
  sh.forEach((cnt,i)=>{ const r = i===0 ? 13 : 28; ctx.strokeStyle=hexA(c, i===sh.length-1?0.9:0.35); ctx.lineWidth=1.1; ctx.beginPath(); ctx.arc(cx,cy,r,0,TAU); ctx.stroke();
    for(let k=0;k<cnt;k++){ const a=-Math.PI/2+k*TAU/(i===0?2:8); const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r; ctx.fillStyle='#f3f8ff'; ctx.shadowColor='rgba(160,205,255,0.9)'; ctx.shadowBlur=6; ctx.beginPath(); ctx.arc(x,y,2.6,0,TAU); ctx.fill(); ctx.shadowBlur=0; } });
}
function buildRamp(){
  const ramp=panel.querySelector('#shellRamp'); ramp.innerHTML='';
  for(const sym of ['Li','Be','B','C','N','O','F','Ne']){ const el=deps.ELS.find(e=>e.sym===sym); const b=document.createElement('button'); b.type='button'; b.className='rampcell';
    b.innerHTML='<canvas width="72" height="72"></canvas><b>'+el.sym+'</b><span>'+el.shells+'</span><em>'+el.app+'</em>'; b.style.setProperty('--tc', deps.tintOf(sym));
    miniAtom(b.querySelector('canvas'), el); b.addEventListener('click', ()=>{ showElement(sym); ladder.scrollIntoView({block:'nearest', behavior:'smooth'}); }); ramp.appendChild(b); }
}

// ---------- orbital clouds: hydrogen-like |psi|^2, sampled honestly (inverse-CDF radius, rejection on the angle) ----------
function radialR(n,l,p){ if(n===1&&l===0) return Math.exp(-p); if(n===2&&l===0) return (2-p)*Math.exp(-p/2); if(n===2&&l===1) return p*Math.exp(-p/2); if(n===3&&l===2) return p*p*Math.exp(-p/3); return 0; }
function radialSampler(n,l){ const steps=2048, rmax=14*n+6, dr=rmax/steps; const cdf=new Float64Array(steps+1); let acc=0;
  for(let i=0;i<=steps;i++){ const r=i*dr; const R=radialR(n,l,r); if(i>0) acc+=r*r*R*R*dr; cdf[i]=acc; } for(let i=0;i<=steps;i++) cdf[i]/=acc;
  return u=>{ let lo=0, hi=steps; while(hi-lo>1){ const m=(lo+hi)>>1; if(cdf[m]<u) lo=m; else hi=m; } const span=cdf[hi]-cdf[lo]; return (lo+(span>0?(u-cdf[lo])/span:0.5))*dr; }; }
function rng(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
// 3-D direction with the orbital's angular weight; the drawing is the x-y projection. p along x; d is d_xy (in-plane cloverleaf). sign = lobe sign
function sampleDir(kind, R){ for(;;){ const z=2*R()-1, phi=TAU*R(), s=Math.sqrt(1-z*z); const x=s*Math.cos(phi), y=s*Math.sin(phi);
  if(kind==='s') return [x,y,z,1];
  if(kind==='p'){ if(R() < x*x) return [x,y,z, x>0?1:-1]; continue; }
  if(kind==='d'){ const w=(2*x*y)*(2*x*y); if(R() < w) return [x,y,z, x*y>0?1:-1]; continue; } } }
function cloud(cv, n, l, kind, seed, opts){ opts=opts||{}; const px=Math.round(cv.clientWidth||150), py=Math.round(cv.clientHeight||150); const dpr=Math.min(2, devicePixelRatio||1);
  cv.width=px*dpr; cv.height=py*dpr; const ctx=cv.getContext('2d'); ctx.scale(dpr,dpr); const R=rng(seed); const rad=radialSampler(n,l); const scale=(Math.min(px,py)/2-6)/(opts.rmax||(n===1?5:n===2?14:22));
  const N=opts.count||2600; const cx=px/2, cy=py/2;
  if(opts.fog){ for(let i=0;i<N;i++){ const r=rad(R()); const [x,y]=sampleDir(kind,R); const X=cx+x*r*scale, Y=cy+y*r*scale; const g=ctx.createRadialGradient(X,Y,0,X,Y,9); g.addColorStop(0,'rgba(160,205,255,0.05)'); g.addColorStop(1,'rgba(160,205,255,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(X,Y,9,0,TAU); ctx.fill(); } return; }
  for(let i=0;i<N;i++){ const r=rad(R()); const [x,y,z,sg]=sampleDir(kind,R); const X=cx+x*r*scale, Y=cy+y*r*scale; const depth=0.55+0.45*(z+1)/2;
    ctx.fillStyle = sg>0 ? 'rgba(160,205,255,'+(0.55*depth).toFixed(2)+')' : 'rgba(255,190,150,'+(0.55*depth).toFixed(2)+')'; ctx.fillRect(X,Y,1.2,1.2); }
  ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(cx,cy,1.6,0,TAU); ctx.fill();
}
function ringDrawing(cv){ const px=Math.round(cv.clientWidth||150), py=Math.round(cv.clientHeight||150); const dpr=Math.min(2, devicePixelRatio||1); cv.width=px*dpr; cv.height=py*dpr; const ctx=cv.getContext('2d'); ctx.scale(dpr,dpr);
  const cx=px/2, cy=py/2; ctx.strokeStyle='rgba(160,205,255,0.5)'; ctx.lineWidth=1.2; for(const r of [22,52]){ ctx.beginPath(); ctx.arc(cx,cy,r,0,TAU); ctx.stroke(); }
  ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(cx,cy,3,0,TAU); ctx.fill();
  const dot=(r,a)=>{ ctx.fillStyle='#f3f8ff'; ctx.shadowColor='rgba(160,205,255,0.9)'; ctx.shadowBlur=6; ctx.beginPath(); ctx.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,3,0,TAU); ctx.fill(); ctx.shadowBlur=0; };
  dot(22,-Math.PI/2); dot(22,Math.PI/2); dot(52,0); dot(52,Math.PI); // the 2p_x pair on the outer ring, left and right
}

// ---------- the table's shape: s / p / d / f blocks ----------
function tableShape(cv){ const px=Math.round(cv.clientWidth||400), py=Math.round(cv.clientHeight||170); const dpr=Math.min(2, devicePixelRatio||1); cv.width=px*dpr; cv.height=py*dpr; const ctx=cv.getContext('2d'); ctx.scale(dpr,dpr);
  const cw=(px-6)/18, ch=Math.min(cw, (py-30)/9), gap=2; const col={ s:'rgba(255,179,107,0.75)', p:'rgba(84,184,255,0.75)', d:'rgba(94,230,200,0.7)', f:'rgba(199,155,255,0.7)' };
  const cell=(c,r,k)=>{ ctx.fillStyle=col[k]; ctx.fillRect(3+c*cw+gap/2, r*ch+gap/2, cw-gap, ch-gap); };
  cell(0,0,'s'); cell(17,0,'s'); for(let r=1;r<7;r++){ cell(0,r,'s'); cell(1,r,'s'); for(let c=12;c<18;c++) cell(c,r,'p'); } for(let r=3;r<7;r++) for(let c=2;c<12;c++) cell(c,r,'d'); for(let r=7;r<9;r++) for(let c=3;c<17;c++) cell(c,r+0.35,'f');
  ctx.font='600 11px "Atkinson Hyperlegible Next", Tahoma, sans-serif'; ctx.textBaseline='middle'; ctx.textAlign='center';
  const lab=(c,r,t,k)=>{ ctx.fillStyle='#1b1815'; ctx.fillText(t, 3+(c+0.5)*cw, (r+0.5)*ch); };
  lab(0.5,4,'s'); lab(14.5,4,'p'); lab(6.5,5,'d'); lab(9.5,8.35,'f');
  ctx.fillStyle='rgba(243,238,229,0.66)'; ctx.font='9.5px "JetBrains Mono", monospace'; ctx.textAlign='left'; ctx.fillText('s holds 2 · p holds 6 · d holds 10 · f holds 14 · a row is one shell filling up', 3, py-8);
}

// ---------- build ----------
function build(panelEl, d){ deps=d; panel=panelEl; ladder=panel.querySelector('#shellLadder'); walk=panel.querySelector('#shellWalk'); walkName=panel.querySelector('#shellWalkName');
  for(const k in TEXT){ const sec=panel.querySelector('[data-sec="'+k+'"]'); sec.querySelector('h3').textContent=TEXT[k].h; const box=sec.querySelector('.stext'); box.innerHTML=TEXT[k].p.map(t=>'<p>'+t+'</p>').join(''); }
  buildLadder(); buildRamp(); walk.addEventListener('input', ()=>{ const el=deps.ELS.find(e=>e.Z===+walk.value); if(el) showElement(el.sym); });
  cloud(panel.querySelector('#orb1s'),1,0,'s',11,{rmax:5}); cloud(panel.querySelector('#orb2s'),2,0,'s',12,{rmax:14}); cloud(panel.querySelector('#orb2p'),2,1,'p',13,{rmax:14}); cloud(panel.querySelector('#orb3d'),3,2,'d',14,{rmax:24});
  ringDrawing(panel.querySelector('#way1')); cloud(panel.querySelector('#way2'),2,1,'p',21,{rmax:14}); cloud(panel.querySelector('#way3'),2,1,'p',22,{rmax:14,fog:true,count:1800});
  tableShape(panel.querySelector('#tableShape')); showElement('O');
}
window.SnapShells = { build, show:showElement, current:()=>current };
})();
