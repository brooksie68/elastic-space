// Snap! — the hold view's electron cloud.
// The cloud is the genuine Hartree-Fock electron density from the Valence Lab's bake
// (assets/molecules-data.js, RHF/UHF STO-3G, nine molecules), integrated through the
// molecule's own plane into a column-density image, then fitted onto the atoms you are
// holding. Nothing here is art-directed except the colour ramp. Lengths in Bohr.
window.SnapCloud = (function(){
  let DATA=null, loading=null; const images=new Map(); const fits=new WeakMap();
  const BLUE=[110,175,255], WHITE=[255,255,255];
  let K0=0.02, CMAX=40, AMAX=1.0, TW=0.72, GA=0.55, HALO=20, HALOA=0.65; let useCache=true; // HALO: a blurred copy under the sharp one (px at bench scale), at HALOA — the layered glow // t = ln(1+col/K0)/ln(1+CMAX/K0): alpha = AMAX·t^GA, colour blue → white as t runs TW → 1 (a log ramp: the wings glow, the cores go white)
  const N=96, ZR=3.0, NZ=14, FAR=4.6, FADE=1.2; const LSKEY='snap-cloud-v3'; // the last FADE bohr before FAR ease to nothing, so the grid's cutoff never shows as a rim // grid: N×N in the plane, NZ samples through ±ZR bohr; points further than FAR (in-plane) from every nucleus are skipped; finished images cache in localStorage as PNGs
  function load(url){ if(DATA) return Promise.resolve(DATA); if(loading) return loading; loading = import(url||'./assets/molecules-data.js').then(m=>{ DATA=m.MOLECULES_DATA.molecules; return DATA; }).catch(()=>{ DATA=null; return null; }); return loading; }
  function evalBF(bf,x,y,z){ const dx=x-bf.c[0], dy=y-bf.c[1], dz=z-bf.c[2]; const r2=dx*dx+dy*dy+dz*dz; let rad=0; for(let p=0;p<bf.e.length;p++) rad+=bf.k[p]*Math.exp(-bf.e[p]*r2); let poly=1; for(let q=0;q<bf.l[0];q++) poly*=dx; for(let q=0;q<bf.l[1];q++) poly*=dy; for(let q=0;q<bf.l[2];q++) poly*=dz; return poly*rad; }
  function makeRho(mol){ const { basis, D, n } = mol; const chi=new Float64Array(n); return function(x,y,z){ for(let i=0;i<n;i++) chi[i]=evalBF(basis[i],x,y,z); let sum=0; for(let i=0;i<n;i++){ const ci=chi[i]; if(ci===0) continue; let row=0; const base=i*n; for(let j=0;j<n;j++) row+=D[base+j]*chi[j]; sum+=ci*row; } return sum>0?sum:0; }; }
  // the molecule's own plane: the direction along which its atoms spread least (a fan of 400 directions; ties — a line — take the first)
  function plane(atoms){ let cx=0,cy=0,cz=0; for(const a of atoms){ cx+=a.pos[0]; cy+=a.pos[1]; cz+=a.pos[2]; } cx/=atoms.length; cy/=atoms.length; cz/=atoms.length;
    let best=null, bs=1e9; const N=400; for(let i=0;i<N;i++){ const t=(i+0.5)/N; const ph=Math.acos(1-t); const th=i*2.399963; const n=[Math.sin(ph)*Math.cos(th), Math.sin(ph)*Math.sin(th), Math.cos(ph)]; let s=0; for(const a of atoms){ const d=(a.pos[0]-cx)*n[0]+(a.pos[1]-cy)*n[1]+(a.pos[2]-cz)*n[2]; s+=d*d; } if(s<bs-1e-9){ bs=s; best=n; } }
    const n=best; const ax = Math.abs(n[0])<0.9 ? [1,0,0] : [0,1,0]; let u=[ax[1]*n[2]-ax[2]*n[1], ax[2]*n[0]-ax[0]*n[2], ax[0]*n[1]-ax[1]*n[0]]; const ul=Math.hypot(...u); u=u.map(v=>v/ul); const v=[n[1]*u[2]-n[2]*u[1], n[2]*u[0]-n[0]*u[2], n[0]*u[1]-n[1]*u[0]];
    return { c:[cx,cy,cz], n, u, v }; }
  function counts(syms){ const c={}; for(const s of syms) c[s]=(c[s]||0)+1; return c; }
  function sameCounts(a,b){ const ka=Object.keys(a), kb=Object.keys(b); if(ka.length!==kb.length) return false; for(const k of ka) if(a[k]!==b[k]) return false; return true; }
  function molFor(syms){ if(!DATA) return null; const c=counts(syms); for(const k in DATA){ if(sameCounts(c, counts(DATA[k].atoms.map(a=>a.symbol)))) return DATA[k]; } return null; }
  // the column-density image of one molecule: N×N over ±ext bohr in its plane, integrated ±ZR through it
  function geometry(mol){ const P=plane(mol.atoms); const pts=mol.atoms.map(a=>{ const d=[a.pos[0]-P.c[0], a.pos[1]-P.c[1], a.pos[2]-P.c[2]]; return { u:d[0]*P.u[0]+d[1]*P.u[1]+d[2]*P.u[2], v:d[0]*P.v[0]+d[1]*P.v[1]+d[2]*P.v[2], Z:a.Z, sym:a.symbol }; }); let ext=0; for(const p of pts) ext=Math.max(ext, Math.abs(p.u), Math.abs(p.v)); ext+=FAR; return { P, pts, ext }; }
  function lsGet(k){ try{ return JSON.parse(localStorage.getItem(LSKEY)||'{}')[k]||null; }catch(e){ return null; } }
  function lsPut(k,v){ try{ const all=JSON.parse(localStorage.getItem(LSKEY)||'{}'); all[k]=v; localStorage.setItem(LSKEY, JSON.stringify(all)); }catch(e){} }
  function build(mol){ const key=mol.id+'|'+K0+'|'+CMAX+'|'+AMAX+'|'+TW+'|'+GA+'|'+N+'|'+NZ; if(images.has(key)) return images.get(key);
    const { P, pts, ext } = geometry(mol); const cv=document.createElement('canvas'); cv.width=N; cv.height=N; const ctx=cv.getContext('2d'); const rec={ canvas:cv, ext, pts, id:mol.id, name:mol.name, ready:false }; images.set(key,rec);
    const cached=useCache ? lsGet(key) : null; if(cached){ const im=new Image(); im.onload=()=>{ ctx.drawImage(im,0,0); rec.ready=true; }; im.src=cached; return rec; }
    const rho=makeRho(mol); const col=new Float32Array(N*N); const dw=2*ZR/NZ; const far2=FAR*FAR;
    for(let j=0;j<N;j++) for(let i=0;i<N;i++){ const gu=-ext+(i+0.5)/N*2*ext, gv=-ext+(j+0.5)/N*2*ext; let dmin=1e9; for(const p of pts){ const dd=(p.u-gu)*(p.u-gu)+(p.v-gv)*(p.v-gv); if(dd<dmin) dmin=dd; } if(dmin>=far2) continue; const dm=Math.sqrt(dmin); const fade = dm<FAR-FADE ? 1 : (()=>{ const x=(FAR-dm)/FADE; return x*x*(3-2*x); })();
      let c=0; for(let k=0;k<NZ;k++){ const w=-ZR+(k+0.5)*dw; const x=P.c[0]+P.u[0]*gu+P.v[0]*gv+P.n[0]*w, y=P.c[1]+P.u[1]*gu+P.v[1]*gv+P.n[1]*w, z=P.c[2]+P.u[2]*gu+P.v[2]*gv+P.n[2]*w; c+=rho(x,y,z); } col[j*N+i]=c*dw*fade; }
    rec.col=col; colourize(rec); rec.ready=true; if(useCache){ try{ lsPut(key, cv.toDataURL('image/png')); }catch(e){} } return rec; }
  function colourize(rec){ const ctx=rec.canvas.getContext('2d'); const img=ctx.createImageData(N,N); const d=img.data; const col=rec.col;
    const den=Math.log(1+CMAX/K0); for(let q=0;q<N*N;q++){ const c=col[q]; if(!c) continue; const tt=Math.min(1, Math.log(1+c/K0)/den); const al=AMAX*Math.pow(tt,GA); const t=Math.max(0, Math.min(1, (tt-TW)/(1-TW))); const o=q*4; d[o]=BLUE[0]+(WHITE[0]-BLUE[0])*t; d[o+1]=BLUE[1]+(WHITE[1]-BLUE[1])*t; d[o+2]=BLUE[2]+(WHITE[2]-BLUE[2])*t; d[o+3]=Math.round(255*al); }
    ctx.putImageData(img,0,0); }
  // build every baked molecule in idle time so the first hold never waits
  function warm(){ if(!DATA) return; const ids=Object.keys(DATA); let i=0; const tick=()=>{ if(i>=ids.length) return; build(DATA[ids[i++]]); (window.requestIdleCallback||((f)=>setTimeout(f,50)))(tick); }; (window.requestIdleCallback||((f)=>setTimeout(f,50)))(tick); }
  // fit the image's atom positions (bohr, in its plane) onto the bench atoms (px): the best similarity transform over every symbol-consistent pairing, reflection allowed
  function permutations(arr){ if(arr.length<=1) return [arr.slice()]; const out=[]; for(let i=0;i<arr.length;i++){ const rest=arr.slice(0,i).concat(arr.slice(i+1)); for(const p of permutations(rest)) out.push([arr[i]].concat(p)); } return out; }
  function fit(comp, rec){ const bySym={}; rec.pts.forEach((p,j)=>{ (bySym[p.sym]=bySym[p.sym]||[]).push(j); }); const groups=Object.keys(bySym).map(s=>({ s, bench:comp.filter(a=>a.sym===s), perms:permutations(bySym[s]) })); if(groups.some(g=>g.bench.length!==g.perms[0].length)) return null;
    let cx=0, cy=0; for(const a of comp){ cx+=a.x; cy+=a.y; } cx/=comp.length; cy/=comp.length; let best=null;
    const walk=(gi, assign)=>{ if(gi===groups.length){ for(const r of [1,-1]){ let sxx=0, sxy=0, qq=0; for(const [a,j] of assign){ const p=rec.pts[j]; const qx=p.u, qy=r*p.v; const px=a.x-cx, py=a.y-cy; sxx+=qx*px+qy*py; sxy+=qx*py-qy*px; qq+=qx*qx+qy*qy; } const th=Math.atan2(sxy,sxx); const s=Math.max(1e-6, Math.hypot(sxx,sxy)/qq); let err=0; for(const [a,j] of assign){ const p=rec.pts[j]; const qx=p.u, qy=r*p.v; const mx=s*(Math.cos(th)*qx-Math.sin(th)*qy), my=s*(Math.sin(th)*qx+Math.cos(th)*qy); err+=(a.x-cx-mx)**2+(a.y-cy-my)**2; } if(!best || err<best.err) best={ err, s, th, r, cx, cy, assign:assign.slice() }; } return; }
      const g=groups[gi]; for(const perm of g.perms){ const add=g.bench.map((a,i)=>[a,perm[i]]); walk(gi+1, assign.concat(add)); } };
    walk(0, []); return best; }
  function fitFor(comp, rec){ const key=comp.map(a=>a.id).sort((a,b)=>a-b).join(',')+'|'+rec.id; let f=fits.get(comp[0]); if(!f || f.key!==key || f.t<0){ f={ key, t:0, fit:fit(comp,rec) }; fits.set(comp[0], f); } return f.fit; }
  // the two-pass paint: a blurred halo under a sharp copy, added light over the veil. F = { cx, cy, s (px per bohr), th, r (±1 reflection) }
  function paint(ctx, rec, F, m){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.translate(F.cx,F.cy); ctx.rotate(F.th); ctx.scale(F.s, F.s*F.r); const e=rec.ext;
    if(HALO>0 && HALOA>0){ ctx.save(); ctx.globalAlpha=m*HALOA; try{ ctx.filter='blur('+(HALO/F.s).toFixed(2)+'px)'; }catch(err){} ctx.drawImage(rec.canvas, -e*1.08, -e*1.08, 2.16*e, 2.16*e); ctx.restore(); }
    ctx.globalAlpha=m; ctx.drawImage(rec.canvas, -e, -e, 2*e, 2*e); ctx.restore(); }
  // draw the cloud for a held component; returns false when no baked density matches (caller falls back)
  function draw(sc, comp, m){ const mol=molFor(comp.map(a=>a.sym)); if(!mol) return false; const rec=build(mol); const F=fitFor(comp, rec); if(!F) return false; const ctx=sc.ctx;
    paint(ctx, rec, F, m);
    ctx.save(); ctx.globalAlpha=m*0.92; ctx.font='500 '+(9.5*sc.S)+'px "JetBrains Mono", monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='rgba(243,238,229,0.95)';
    for(const [a,j] of F.assign){ const p=rec.pts[j]; const qx=p.u, qy=F.r*p.v; const x=F.cx+F.s*(Math.cos(F.th)*qx-Math.sin(F.th)*qy), y=F.cy+F.s*(Math.sin(F.th)*qx+Math.cos(F.th)*qy); ctx.fillText('+'+p.Z, x, y+0.5); }
    ctx.restore(); return true; }
  function setRamp(k0,cmax,amax,tw,ga,halo,haloa){ K0=k0; CMAX=cmax; if(amax!==undefined) AMAX=amax; if(tw!==undefined) TW=tw; if(ga!==undefined) GA=ga; if(halo!==undefined) HALO=halo; if(haloa!==undefined) HALOA=haloa; for(const rec of images.values()) if(rec.col) colourize(rec); } // the lab's live dials; the world never calls this
  function setCache(on){ useCache=!!on; }
  return { load, warm, molFor, build, fit, draw, paint, setRamp, setCache, get data(){ return DATA; } };
})();
