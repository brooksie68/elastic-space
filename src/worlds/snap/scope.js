// Snap! — THE SCOPE. The Valence Lab's coherence scope, pulled out over whatever you
// are looking at on the bench (James, 2026-09-04/05). A round lens opens with the atom
// or molecule inside it in 3-D: thousands of glowing dots, each one a real sample of
// where the electron could be found (hydrogen-like |ψ|² with Slater screening for a
// lone atom; the baked Hartree-Fock density for a molecule), faint shells you can fade
// in (the ρ = 0.004 isosurface of that same density; s spheres and p dumbbells for an
// atom), and the nucleus as a jittering cluster of protons and neutrons, magnified.
// Nothing here reshapes a distribution — the physics modules are the lab's own.
// Loaded on demand by app.js (served only; under file:// there is no scope).
import * as THREE from '../../lib/three/three.module.js';
import { ELEMENTS, getElement, makeAtomSampler, radialR, SUBSHELL_COLORS } from './orbitals.js';
import { makeMoleculeSampler, buildIsoMesh } from './density.js';
import { MOLECULES_DATA } from './assets/molecules-data.js';

const MAX_POINTS = 12000, POINTS = 7000, LIFE = 1.6, SCALE = 1.5; // world units per bohr
const ELEMENT_GLOW = { H: 0xf0f4f8, C: 0xb9c4d0, N: 0x6f8dff, O: 0xff7a60 };
const MOLS = MOLECULES_DATA.molecules;
const NAMES = { H2:'hydrogen', N2:'nitrogen', O2:'oxygen', H2O:'water', CO2:'carbon dioxide', CH4:'methane', NH3:'ammonia', H2O2:'hydrogen peroxide', C2H4:'ethene' };

let ui=null, R=null; // the DOM once, the renderer once
const st = { open:false, mode:null, el:null, mol:null, sampler:null, quat:new THREE.Quaternion(), spin:true, dist:24, tDist:24, yaw:0, pitch:0.2, raf:0, t:0, last:0, seedT:0 };
const dials = { cloud:1.0, shells:0.10, nucleus:1.0 };
const SAVE='snap-scope';
try{ const s=JSON.parse(localStorage.getItem(SAVE)||'{}'); for(const k in dials) if(typeof s[k]==='number') dials[k]=s[k]; }catch(e){}
function save(){ try{ localStorage.setItem(SAVE, JSON.stringify(dials)); }catch(e){} }

// ---------- what the scope can read ----------
function counts(syms){ const c={}; for(const s of syms) c[s]=(c[s]||0)+1; return c; }
function same(a,b){ const ka=Object.keys(a), kb=Object.keys(b); return ka.length===kb.length && ka.every(k=>a[k]===b[k]); }
export function molFor(syms){ const c=counts(syms); for(const k in MOLS) if(same(c, counts(MOLS[k].atoms.map(a=>a.symbol)))) return MOLS[k]; return null; }
export function canRead(atoms){ if(atoms.length===1){ const a=atoms[0]; return ELEMENTS.some(e=>e.symbol===a.sym) ? { mode:'atom' } : { refuse:'The scope reads the first eighteen elements. '+a.e.name.charAt(0).toUpperCase()+a.e.name.slice(1)+' is past its range for now.' }; }
  const mol=molFor(atoms.map(a=>a.sym)); if(mol) return { mode:'molecule', mol };
  return { refuse:'The scope has no reading for that molecule yet. It reads the nine on the shelf: water, oxygen, nitrogen, hydrogen, carbon dioxide, methane, ammonia, hydrogen peroxide and ethene.' }; }

// ---------- the scene ----------
function build(){
  const canvas=document.createElement('canvas'); R={ canvas };
  R.renderer=new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true }); R.renderer.setPixelRatio(Math.min(devicePixelRatio,2)); R.renderer.setClearColor(0x000000, 0);
  R.scene=new THREE.Scene(); R.camera=new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  R.scene.add(new THREE.AmbientLight(0xffffff, 0.35)); const key=new THREE.PointLight(0xfff1dc, 60, 0, 1.6); key.position.set(6,9,10); R.scene.add(key);
  R.root=new THREE.Group(); R.scene.add(R.root);
  // the swarm
  R.pos=new Float32Array(MAX_POINTS*3); R.birth=new Float32Array(MAX_POINTS); R.life=new Float32Array(MAX_POINTS); R.slot=new Float32Array(MAX_POINTS); R.rand=new Float32Array(MAX_POINTS);
  const g=new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(R.pos,3)); g.setAttribute('aBirth', new THREE.BufferAttribute(R.birth,1)); g.setAttribute('aLife', new THREE.BufferAttribute(R.life,1)); g.setAttribute('aShell', new THREE.BufferAttribute(R.slot,1)); g.setAttribute('aRand', new THREE.BufferAttribute(R.rand,1)); g.boundingSphere=new THREE.Sphere(new THREE.Vector3(),80); R.geo=g;
  R.palette=[0,1,2,3,4].map(()=>new THREE.Color(0xffffff));
  R.su={ uTime:{value:0}, uDotSize:{value:1.0}, uAlpha:{value:1}, uCoreDim:{value:0.45}, uValenceStart:{value:0}, uPalette:{value:R.palette}, uPixelRatio:{value:Math.min(devicePixelRatio,2)} };
  const mat=new THREE.ShaderMaterial({ uniforms:R.su, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader:`attribute float aBirth; attribute float aLife; attribute float aShell; attribute float aRand; uniform float uTime,uDotSize,uCoreDim,uValenceStart,uPixelRatio; uniform vec3 uPalette[5]; varying float vAlpha; varying vec3 vColor;
      void main(){ float t=clamp((uTime-aBirth)/aLife,0.0,1.0); float env=smoothstep(0.0,0.18,t)*(1.0-smoothstep(0.65,1.0,t)); int si=int(aShell+0.5); vColor=uPalette[si]; float dim=(aShell+0.5<uValenceStart)?uCoreDim:1.0; vAlpha=env*dim; vec4 mv=modelViewMatrix*vec4(position,1.0); float size=uDotSize*(0.7+0.6*aRand); gl_PointSize=size*uPixelRatio*120.0/-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`precision highp float; uniform float uAlpha; varying float vAlpha; varying vec3 vColor; void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c)*2.0; float disk=1.0-smoothstep(0.45,1.0,d); float a=vAlpha*uAlpha*disk*0.85; if(a<0.004) discard; gl_FragColor=vec4(vColor,a); }` });
  R.swarm=new THREE.Points(g, mat); R.swarm.frustumCulled=false; R.root.add(R.swarm);
  // the shells
  R.ghostMat=new THREE.ShaderMaterial({ transparent:true, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, uniforms:{ uOpacity:{value:dials.shells}, uColor:{value:new THREE.Color(0x9fdcff)} },
    vertexShader:`varying vec3 vN,vV; void main(){ vN=normalMatrix*normal; vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`precision highp float; uniform float uOpacity; uniform vec3 uColor; varying vec3 vN,vV; void main(){ float fres=1.0-abs(dot(normalize(vN),normalize(vV))); float a=uOpacity*(0.25+0.9*pow(fres,2.2)); if(a<0.003) discard; gl_FragColor=vec4(uColor,a); }` });
  R.ghosts=new THREE.Group(); R.root.add(R.ghosts);
  // the nucleus
  R.nuc=new THREE.Group(); R.root.add(R.nuc); R.nuclei=[];
  R.protonMat=new THREE.MeshStandardMaterial({ color:0xb35a33, emissive:0xff7f45, emissiveIntensity:0.55, roughness:0.5 });
  R.neutronMat=new THREE.MeshStandardMaterial({ color:0x8b939c, emissive:0x3a4148, emissiveIntensity:0.35, roughness:0.6 });
  R.nucleonGeo=new THREE.SphereGeometry(0.13, 14, 12); R.m4=new THREE.Matrix4(); R.ghostCache={};
}
function clearNuclei(){ for(const c of R.nuclei){ R.nuc.remove(c.group); c.protons.dispose(); c.neutrons.dispose(); } R.nuclei=[]; }
function addNucleus(el, offset){ const A=el.Z+el.neutrons; const ballR=Math.max(0.001, 0.22*Math.cbrt(A)-0.1); const base=[];
  for(let i=0;i<A;i++){ let p=null; for(let tries=0; tries<60; tries++){ const c=new THREE.Vector3(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1); if(c.lengthSq()>1) continue; c.multiplyScalar(ballR); if(base.every(b=>b.distanceTo(c)>0.2)){ p=c; break; } } base.push(p || new THREE.Vector3().randomDirection().multiplyScalar(ballR*Math.cbrt(Math.random()))); }
  const protons=new THREE.InstancedMesh(R.nucleonGeo, R.protonMat, el.Z); const neutrons=new THREE.InstancedMesh(R.nucleonGeo, R.neutronMat, Math.max(1, el.neutrons)); neutrons.visible=el.neutrons>0;
  const group=new THREE.Group(); group.position.copy(offset); group.add(protons, neutrons); R.nuc.add(group); R.nuclei.push({ group, protons, neutrons, base, phases:Float32Array.from({length:A}, ()=>Math.random()*6.28), Z:el.Z, N:el.neutrons }); }
function tickNuclei(t){ for(const c of R.nuclei){ for(let i=0;i<c.Z+c.N;i++){ const b=c.base[i], ph=c.phases[i]; R.m4.makeTranslation(b.x+Math.sin(t*2.1+ph)*0.02, b.y+Math.sin(t*2.7+ph*1.7)*0.02, b.z+Math.cos(t*2.4+ph*0.6)*0.02); if(i<c.Z) c.protons.setMatrixAt(i, R.m4); else c.neutrons.setMatrixAt(i-c.Z, R.m4); } c.protons.instanceMatrix.needsUpdate=true; if(c.N>0) c.neutrons.instanceMatrix.needsUpdate=true; } }
// shells: the lab's geometry, verbatim
function tailRadius(n,l,zeff,frac){ const rmax=(14*n+6)/zeff; const steps=900; const vals=new Float64Array(steps+1); let peak=0; for(let i=0;i<=steps;i++){ const r=(i/steps)*rmax; const Rr=radialR(n,l,zeff,r); vals[i]=r*r*Rr*Rr; peak=Math.max(peak, vals[i]); } for(let i=steps;i>=0;i--) if(vals[i]>=peak*frac) return (i/steps)*rmax; return rmax*0.5; }
function pLobeGeometry(n,zeff){ const rTip=tailRadius(n,1,zeff,0.12); const Rsq=(r)=>{ const Rr=radialR(n,1,zeff,r); return Rr*Rr; }; let rPk=rTip*0.3, best=0; for(let i=1;i<=400;i++){ const r=(i/400)*rTip; if(Rsq(r)>best){ best=Rsq(r); rPk=r; } } const C=Rsq(rTip); const upper=[]; const NSEG=24;
  for(let s=0;s<=NSEG;s++){ const th=(s/NSEG)*(Math.PI/2-0.05); const target=C/(Math.cos(th)*Math.cos(th)); let r=0; if(Rsq(rPk)>=target){ let lo=rPk, hi=rTip*1.5; for(let b=0;b<36;b++){ const mid=0.5*(lo+hi); if(Rsq(mid)>=target) lo=mid; else hi=mid; } r=0.5*(lo+hi); } upper.push(new THREE.Vector2(Math.max(0.02, r*Math.sin(th)), r*Math.cos(th))); }
  const pts=[new THREE.Vector2(0.02, rTip), ...upper.slice(1)]; const lower=[...pts].reverse().map(p=>new THREE.Vector2(p.x,-p.y)); return new THREE.LatheGeometry([...pts, ...lower], 30); }
function atomGhostParts(el){ if(!R.ghostCache[el.symbol]){ const parts=[]; const maxN=Math.max(...el.orbitals.map(o=>o.n)); for(const o of el.orbitals){ if(o.n!==maxN) continue; if(o.l===0) parts.push({ geo:new THREE.SphereGeometry(tailRadius(o.n,0,o.zeff,0.12), 28, 20), axis:null }); else parts.push({ geo:pLobeGeometry(o.n,o.zeff), axis:o.axis }); } R.ghostCache[el.symbol]=parts; } return R.ghostCache[el.symbol]; }
function molGhost(mol){ const k='mol:'+mol.id; if(!R.ghostCache[k]){ const mesh=buildIsoMesh(mol, { iso:MOLECULES_DATA.meta.ghostIso }); const geo=new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions,3)); geo.setIndex(mesh.indices); geo.computeVertexNormals(); R.ghostCache[k]=geo; } return R.ghostCache[k]; }

// ---------- loading a target ----------
const out=[0,0,0]; const rng=Math.random;
function seed(i, stagger){ if(st.mode==='molecule'){ const ai=st.sampler.samplePoint(out); R.pos[i*3]=out[0]*SCALE; R.pos[i*3+1]=out[1]*SCALE; R.pos[i*3+2]=out[2]*SCALE; R.slot[i]=st.slotOf[st.mol.atoms[ai].symbol]; }
  else { const oi=st.sampler.samplePoint(rng, out); R.pos[i*3]=out[0]*SCALE; R.pos[i*3+1]=out[1]*SCALE; R.pos[i*3+2]=out[2]*SCALE; R.slot[i]=st.el.orbitals[oi].subshellIndex; }
  R.rand[i]=Math.random(); R.life[i]=LIFE*(0.6+0.8*Math.random()); R.birth[i]=st.t+(stagger ? Math.random()*1.4 : 0); }
function reseed(){ for(let i=0;i<POINTS;i++) seed(i,true); R.geo.setDrawRange(0,POINTS); for(const k of ['position','aBirth','aLife','aShell','aRand']) R.geo.getAttribute(k).needsUpdate=true; }
function load(atoms, read){ R.ghosts.clear(); clearNuclei(); st.mode=read.mode; st.quat.identity(); st.yaw=0; st.pitch=0.2; st.spin=true; let extent=0;
  if(read.mode==='atom'){ st.el=getElement(atoms[0].sym); st.mol=null; st.sampler=makeAtomSampler(st.el); SUBSHELL_COLORS.forEach((c,i)=>R.palette[i].set(c)); const maxN=Math.max(...st.el.orbitals.map(o=>o.n)); R.su.uValenceStart.value=Math.min(...st.el.orbitals.filter(o=>o.n===maxN).map(o=>o.subshellIndex));
    for(const part of atomGhostParts(st.el)){ const m=new THREE.Mesh(part.geo, R.ghostMat); m.scale.setScalar(SCALE); if(part.axis==='x') m.rotation.z=-Math.PI/2; else if(part.axis==='z') m.rotation.x=Math.PI/2; R.ghosts.add(m); }
    addNucleus(st.el, new THREE.Vector3()); extent=1.2+Math.max(...st.el.orbitals.filter(o=>o.n===maxN).map(o=>tailRadius(o.n,o.l,o.zeff,0.12))); } // frame the valence shell's visible edge, not the sampler's far tail
  else { st.mol=read.mol; st.el=null; st.sampler=makeMoleculeSampler(st.mol, { rng }); const syms=[...new Set(st.mol.atoms.map(a=>a.symbol))]; st.slotOf={}; syms.forEach((s,i)=>{ st.slotOf[s]=i; R.palette[i].set(ELEMENT_GLOW[s]||0xffffff); }); R.su.uValenceStart.value=0;
    const m=new THREE.Mesh(molGhost(st.mol), R.ghostMat); m.scale.setScalar(SCALE); R.ghosts.add(m);
    for(const at of st.mol.atoms){ addNucleus(getElement(at.symbol), new THREE.Vector3(at.pos[0],at.pos[1],at.pos[2]).multiplyScalar(SCALE)); extent=Math.max(extent, Math.hypot(at.pos[0],at.pos[1],at.pos[2])+2.6); } }
  st.dist=st.tDist=Math.max(16, extent*SCALE*3.1); st.t=0; reseed(); applyDials(); }
function applyDials(){ R.su.uAlpha.value=dials.cloud; R.ghostMat.uniforms.uOpacity.value=dials.shells; R.nuc.visible=dials.nucleus>0.02; R.nuc.scale.setScalar(0.35+0.65*dials.nucleus); }

// ---------- the lens (DOM) ----------
function buildUI(){ ui={}; ui.veil=document.createElement('div'); ui.veil.className='scope'; ui.veil.hidden=true;
  ui.veil.innerHTML=`<div class="lens-wrap">
    <div class="plate lens-head"><span class="kicker">specimen</span><h2 class="lens-name"></h2><span class="lens-formula mono"></span></div>
    <div class="rim"><div class="rim-ticks"></div><div class="lens"></div></div>
    <div class="plate lens-cap"><span class="kicker">reading</span><p>Every dot is one place the electron could be found. The electron is the whole spread, not any one dot. The nucleus is drawn thousands of times too large; at true scale it would be invisible.</p></div>
    <div class="plate lens-bar"><label>cloud<input type="range" min="0" max="1" step="0.01" data-dial="cloud"></label><label>shells<input type="range" min="0" max="1" step="0.01" data-dial="shells"></label><label>nucleus<input type="range" min="0" max="1" step="0.01" data-dial="nucleus"></label><button type="button" class="lens-close" aria-label="close the scope">close</button></div></div>`;
  document.body.appendChild(ui.veil); ui.lens=ui.veil.querySelector('.lens'); ui.lens.appendChild(R.canvas); ui.name=ui.veil.querySelector('.lens-name'); ui.formula=ui.veil.querySelector('.lens-formula');
  for(const inp of ui.veil.querySelectorAll('input[data-dial]')){ inp.value=dials[inp.dataset.dial]; inp.addEventListener('input', ()=>{ dials[inp.dataset.dial]=+inp.value; save(); applyDials(); }); }
  ui.veil.querySelector('.lens-close').addEventListener('click', close);
  ui.veil.addEventListener('pointerdown', e=>{ if(e.target===ui.veil) close(); });
  // rotate with the mouse, zoom with the wheel
  let drag=null; ui.lens.addEventListener('pointerdown', e=>{ drag={ x:e.clientX, y:e.clientY }; st.spin=false; try{ ui.lens.setPointerCapture(e.pointerId); }catch(err){} });
  ui.lens.addEventListener('pointermove', e=>{ if(!drag) return; st.yaw+=(e.clientX-drag.x)*0.008; st.pitch=Math.max(-1.4, Math.min(1.4, st.pitch+(e.clientY-drag.y)*0.008)); drag={ x:e.clientX, y:e.clientY }; });
  const up=()=>{ drag=null; }; ui.lens.addEventListener('pointerup', up); ui.lens.addEventListener('pointercancel', up);
  ui.lens.addEventListener('wheel', e=>{ e.preventDefault(); st.tDist=Math.max(2.5, Math.min(80, st.tDist*(1+Math.sign(e.deltaY)*0.12))); }, { passive:false });
  document.addEventListener('keydown', e=>{ if(st.open && e.key==='Escape'){ e.stopPropagation(); close(); } }, true); }
function fit(){ const r=ui.lens.getBoundingClientRect(); const w=Math.max(2, Math.round(r.width)), h=Math.max(2, Math.round(r.height)); R.renderer.setSize(w,h,false); R.camera.aspect=w/h; R.camera.updateProjectionMatrix(); }
function frame(now){ if(!st.open) return; st.raf=requestAnimationFrame(frame); const dt=Math.min(0.05, (now-st.last)/1000||0.016); st.last=now; st.t+=dt; R.su.uTime.value=st.t;
  if(st.spin) st.yaw+=dt*0.25; st.dist+=(st.tDist-st.dist)*0.12; R.su.uDotSize.value=Math.max(0.6, Math.min(3, st.dist/22)); // dots hold their size on screen whatever the distance
  R.root.rotation.set(st.pitch, st.yaw, 0); R.camera.position.set(0, 0, st.dist); R.camera.lookAt(0,0,0);
  let touched=false; for(let i=0;i<POINTS;i++){ if(st.t-R.birth[i]>R.life[i]){ seed(i,false); touched=true; } } if(touched) for(const k of ['position','aBirth','aLife','aShell','aRand']) R.geo.getAttribute(k).needsUpdate=true;
  tickNuclei(st.t); R.renderer.render(R.scene, R.camera); }

// ---------- API ----------
export function open(atoms, say){ const read=canRead(atoms); if(read.refuse){ if(say) say('scope', read.refuse); return false; }
  if(!R) build(); if(!ui) buildUI(); load(atoms, read);
  if(read.mode==='atom'){ ui.name.textContent=st.el.name; ui.formula.textContent=st.el.config; } else { ui.name.textContent=NAMES[st.mol.id]||st.mol.name; ui.formula.textContent=st.mol.id.replace(/(\d+)/g, (m)=>[...m].map(d=>'₀₁₂₃₄₅₆₇₈₉'[+d]).join('')); }
  ui.veil.hidden=false; st.open=true; st.last=performance.now(); fit(); cancelAnimationFrame(st.raf); st.raf=requestAnimationFrame(frame); return true; }
export function close(){ if(!st.open) return; st.open=false; cancelAnimationFrame(st.raf); ui.veil.hidden=true; }
export function isOpen(){ return st.open; }
window.addEventListener('resize', ()=>{ if(st.open) fit(); });
