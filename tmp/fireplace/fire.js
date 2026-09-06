import * as THREE from 'three';
const volumeMode=new URLSearchParams(location.search).has('volume');
const settingsKey=volumeMode?'fireplace-volume-v1':'fireplace-study-v1';
import {defaults,ranges,sanitize,flicker,zoomFov,makeMotion,stepMotion,wispState} from './model.js';
const $=id=>document.getElementById(id);
let cfg={...defaults};try{cfg=sanitize(JSON.parse(localStorage.getItem(settingsKey)));}catch{}
let seed=892;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;document.body.prepend(renderer.domElement);
renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{throw new Error('Fire shader failed: '+gl.getProgramInfoLog(program)+' '+gl.getShaderInfoLog(fragment));};
const scene=new THREE.Scene();scene.background=new THREE.Color('#080605');
const camera=new THREE.PerspectiveCamera(44,innerWidth/innerHeight,.05,30);camera.position.set(0,1.42,4.05);
scene.add(new THREE.HemisphereLight(0x8996aa,0x4b2c16,.24));
const fill=new THREE.DirectionalLight(0xc8c0b3,.65);fill.position.set(-2,3,4);scene.add(fill);
const firelight=new THREE.PointLight(0xff852b,17,6,2);firelight.position.set(-.15,1.05,.55);firelight.castShadow=true;firelight.shadow.mapSize.set(1024,1024);firelight.shadow.radius=4;firelight.shadow.bias=-.002;firelight.shadow.normalBias=.025;scene.add(firelight);
const other=new THREE.PointLight(0xffb24c,5,4,2);other.position.set(.55,1.15,.05);scene.add(other);
function texture(kind,size=1024){const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');const img=ctx.createImageData(size,size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,n=rnd();let base;
  if(kind==='brick')base=60+9*Math.sin(x*.027+Math.sin(y*.013)*2)+7*Math.sin(y*.043)+n*23;
  else if(kind==='stone')base=42+10*Math.sin(x*.022+y*.06)+n*25;
  else base=26+12*Math.sin(x*.09+Math.sin(y*.017)*2)+n*24;
  img.data[i]=base;img.data[i+1]=base*(kind==='brick'?.67:.88);img.data[i+2]=base*(kind==='brick'?.49:.77);img.data[i+3]=255;
 }ctx.putImageData(img,0,0);
 if(kind==='bark'){for(let i=0;i<360;i++){const x=rnd()*size,y=rnd()*size;ctx.strokeStyle=`rgba(4,3,2,${.3+rnd()*.6})`;ctx.lineWidth=1+rnd()*6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+8*rnd(),y+30+rnd()*150);ctx.stroke();}
 for(let i=0;i<220;i++){const x=rnd()*size,y=rnd()*size;ctx.strokeStyle='#080605';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+12+rnd()*33,y+2+rnd()*7);ctx.stroke();}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;}
const brickMap=texture('brick'),stoneMap=texture('stone'),barkMap=texture('bark');
function box(w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);return m;}
const mortar=new THREE.MeshStandardMaterial({color:0x28211a,roughness:1});
box(3.65,2.55,.14,0,1.22,-.85,mortar);box(.16,2.55,1.55,-1.78,1.22,-.12,mortar);box(.16,2.55,1.55,1.78,1.22,-.12,mortar);
const brickMats=Array.from({length:10},()=>new THREE.MeshStandardMaterial({map:brickMap,bumpMap:brickMap,bumpScale:.003,color:new THREE.Color().setRGB(.48+rnd()*.32,.48+rnd()*.2,.43+rnd()*.25),roughness:1}));
for(let row=0;row<12;row++){for(let col=0;col<9;col++){let x=-1.75+col*.45+(row%2)*.225;if(x>1.75)continue;const width=Math.min(.429,1.8-x+.214);box(width,.19,.13,x,.07+row*.217,-.745,brickMats[Math.floor(rnd()*10)]);}
 for(let side of [-1,1])for(let col=0;col<4;col++)box(.14,.19,.365,side*1.685,.07+row*.217,-.59+col*.39,brickMats[Math.floor(rnd()*10)]);}
const stoneMat=new THREE.MeshStandardMaterial({map:stoneMap,bumpMap:stoneMap,bumpScale:.025,roughness:.95,color:0x777b80});
for(let i=0;i<5;i++)box(.76,.105,1.85,(i-2)*.78,-.09,.24,stoneMat);
const iron=new THREE.MeshStandardMaterial({color:0x181615,roughness:.83,metalness:.75});
for(let x=-.94;x<1;x+=.24)box(.034,.045,.8,x,.17,.02,iron);
for(let z of [-.34,.38])box(2.03,.065,.045,0,.16,z,iron);
for(let x of [-.94,.94])for(let z of [-.31,.35])box(.055,.2,.055,x,.06,z,iron);
for(let x of [-.97,.97]){box(.045,.35,.045,x,.28,.4,iron);const b=new THREE.Mesh(new THREE.SphereGeometry(.046,16,12),iron);b.position.set(x,.465,.4);scene.add(b);}
const noiseGLSL=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .55*noise(p)+.27*noise(p*2.03)+.13*noise(p*4.07)+.05*noise(p*8.13);}
vec2 cells(vec2 p){vec2 ip=floor(p),fp=fract(p);float a=8.,b=8.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y));vec2 q=o+vec2(hash(ip+o),hash(ip+o+17.4))-fp;float d=dot(q,q);if(d<a){b=a;a=d;}else b=min(b,d);}return vec2(sqrt(a),sqrt(b)-sqrt(a));}
`;
const coalUniforms=[];
function hotMaterial(cap=false){const m=new THREE.MeshStandardMaterial({map:barkMap,bumpMap:barkMap,bumpScale:.003,roughness:1,color:cap?0x77614b:0x77716a});
 m.onBeforeCompile=s=>{s.uniforms.uCoal={value:cfg.embers};s.uniforms.uTime={value:0};coalUniforms.push(s.uniforms);s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float uCoal;uniform float uTime;\n'+noiseGLSL);
 s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 vec2 p=vMapUv*vec2(24.,34.); p+=vec2(noise(p*.7)*.45,noise(p*.4)*.6);
 vec2 cell=cells(p);float crack=1.-smoothstep(.009,.045,cell.y);
 float hot=smoothstep(.44,.72,fbm(vMapUv*vec2(9.,6.)+vec2(2.3,4.1)));
 float ember=crack*hot*uCoal*(.8+.2*sin(uTime*.65+vMapUv.y*17.));
 totalEmissiveRadiance+=vec3(1.25,.12,.003)*ember;
 float plate=(.025+.045*fbm(p*3.))*(.3+.7*smoothstep(.01,.12,cell.y));
 diffuseColor.rgb=vec3(plate,plate*.82,plate*.66);
 `);};m.customProgramCacheKey=()=>cap?'cap':'bark';return m;}
const bark=hotMaterial(),end=hotMaterial(true);
const transforms=[[-.08,.32,.22,.05,.025,.055],[.1,.38,-.20,-.14,-.03,-.12],[-.04,.62,-.05,.08,.15,-.20],[.26,.48,.0,-.10,-.28,.24],[-.35,.29,-.4,.05,.2,.10]];
window.FIREPLACE_LOGS.forEach((data,i)=>{const g=new THREE.BufferGeometry();for(let k of ['position','normal','uv'])g.setAttribute(k,new THREE.Float32BufferAttribute(data[k],k==='uv'?2:3));let start=0,last=data.groups[0];for(let j=1;j<=data.groups.length;j++){if(data.groups[j]!==last){g.addGroup(start*3,(j-start)*3,last);start=j;last=data.groups[j];}}
 const m=new THREE.Mesh(g,[bark,end]);const [x,y,z,rx,ry,rz]=transforms[i];m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=m.receiveShadow=true;scene.add(m);});
const coals=[];const coalGeo=new THREE.DodecahedronGeometry(1,1);
for(let i=0;i<260;i++){const heat=Math.pow(rnd(),4)*.55;const mat=new THREE.MeshStandardMaterial({map:stoneMap,bumpMap:stoneMap,bumpScale:.006,color:new THREE.Color().setRGB(.09+rnd()*.15,.075+rnd()*.08,.06),roughness:1,emissive:0xff2301,emissiveIntensity:heat});const m=new THREE.Mesh(coalGeo,mat);m.position.set((rnd()-.5)*2.05,.025+rnd()*.04,(rnd()-.5)*1.06+.1);m.scale.set(.015+rnd()*.055,.008+rnd()*.02,.025+rnd()*.04);m.rotation.set(rnd()*3,rnd()*3,rnd()*3);scene.add(m);coals.push({m,phase:rnd()*9,heat});}
// Thin wisps have independent anchors, lift and curl; logs depth-occlude rear layers.
const flames=[];const flameGroup=new THREE.Group();scene.add(flameGroup);
const flameFrag=`precision highp float;varying vec2 vUv;uniform float time,seed,brightness,split;${noiseGLSL}
void main(){float y=vUv.y;float t=time;float sway=sin(y*5.-t*2.1+seed)*.12*y+sin(y*11.-t*3.4+seed)*.055*y;
 float x=(vUv.x-.5-sway)*2.;vec2 flow=vec2(x*3.+seed,y*4.-t*2.3);
 float n=fbm(flow+vec2(fbm(flow*.7+t*.12)*2.,0.));
 float width=(1.-y)*(.57+.24*n);float body=width-abs(x)+(.5-n)*.28;
 float taper=smoothstep(0.,.12,y)*(1.-smoothstep(.73+noise(vec2(t*.7,seed))*.22,1.,y));
 float a=smoothstep(-.025,.10,body)*taper;
 float separation=smoothstep(.15,.7,split);a*=1.-separation*smoothstep(.74,.82,y);
 float holes=smoothstep(.25,.55,fbm(flow*1.7+7.));a*=.50+.5*holes;
 float core=smoothstep(.05,.34,body)*(1.-y);
 vec3 color=mix(vec3(1.,.085,.002),vec3(1.,.48,.035),smoothstep(0.,.16,body));
 color=mix(color,vec3(1.,.86,.40),core*.85);a*=.65;
 if(a<.012)discard;gl_FragColor=vec4(color*brightness,a);}
`;
let flameSeedAfterOriginal;
for(let i=0;i<81;i++){if(i===27)flameSeedAfterOriginal=seed;const u={time:{value:0},seed:{value:rnd()*30},brightness:{value:cfg.brightness},split:{value:0}};const mat=new THREE.ShaderMaterial({uniforms:u,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:flameFrag,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});const h=.35+rnd()*.6,w=.13+rnd()*.18;const g=new THREE.PlaneGeometry(w,h);g.translate(0,h/2,0);const m=new THREE.Mesh(g,mat);const rear=i%27<17;const x=(rnd()-.5)*1.7;m.position.set(x,rear?.46+rnd()*.19:.27+rnd()*.1,rear?-.12-rnd()*.3:.30);m.rotation.y=(rnd()-.5)*.5;flameGroup.add(m);flames.push({m,u,h,w,phase:rnd()*9,motion:makeMotion(i+1)});}
seed=flameSeedAfterOriginal;
// Fixed pool: detached tips rise independently and fade; no per-frame allocations.
const wispGeometry=new THREE.PlaneGeometry(1,1);wispGeometry.translate(0,.5,0);
const wisps=Array.from({length:24},()=>{
 const u={time:{value:0},phase:{value:0},opacity:{value:0},brightness:{value:1}};
 const mat=new THREE.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec2 vUv;uniform float time,phase,opacity,brightness;${noiseGLSL}
 void main(){float y=vUv.y;float x=(vUv.x-.5)*2.+sin(y*5.-time*3.+phase)*.19;
 float n=fbm(vec2(x*4.+phase,y*5.-time*2.));float width=sin(y*3.14159)*.47;
 float a=smoothstep(-.05,.10,width-abs(x)+(n-.5)*.22)*sin(y*3.14159)*opacity;
 if(a<.008)discard;gl_FragColor=vec4(mix(vec3(1.,.13,.006),vec3(1.,.63,.12),n)*brightness,a*.62);}`});
 const mesh=new THREE.Mesh(wispGeometry,mat);mesh.visible=false;flameGroup.add(mesh);return {mesh,u,active:false,age:0,life:1,x:0,y:0,z:0,width:0,height:0,phase:0};
});
function shedTip(v){const q=wisps.find(w=>!w.active);if(!q)return;const y=.82,t=v.motion.clock,seed=v.u.seed.value;
 const sway=Math.sin(y*5-t*2.1+seed)*.12*y+Math.sin(y*11-t*3.4+seed)*.055*y;
 q.active=true;q.mesh.visible=true;q.age=0;q.life=.65+v.motion.random()*.65;
 q.x=v.m.position.x+sway*v.w;q.y=v.m.position.y+v.h*v.m.scale.y*.76;q.z=v.m.position.z;
 q.width=v.w*.43;q.height=v.h*v.m.scale.y*.23;q.phase=v.phase;q.u.phase.value=v.phase;
 q.mesh.rotation.y=v.m.rotation.y;
}
const sparkCount=38,sparkPos=new Float32Array(sparkCount*3),sparkSeeds=Array.from({length:sparkCount},()=>({x:(rnd()-.5)*1.55,t:rnd()*25,v:.3+rnd()*.35}));
const sparkGeo=new THREE.BufferGeometry();sparkGeo.setAttribute('position',new THREE.BufferAttribute(sparkPos,3));const sparks=new THREE.Points(sparkGeo,new THREE.PointsMaterial({color:0xff9d31,size:.012,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));flameGroup.add(sparks);
const volume=volumeMode?new (await import('./volume-fire.js')).VolumeFire(renderer):null;
if(volumeMode)$('note').innerHTML='Fireplace / 3D gas volume<span>Silent · reactive gas, curling flow & burning tips · scroll to zoom</span>';
const names={count:'Flame count',height:'Flame height',speed:'Movement speed',variation:'Speed variation',wisps:'Tip wisps',brightness:'Flame brightness',embers:'Ember glow',light:'Firelight',zoom:'Zoom',text:'Text size'};
if(volumeMode){names.count='Fuel feed';names.height='Flame lifetime';names.variation='Turbulence';}
const inputs={};for(const k of Object.keys(defaults)){if(volumeMode&&k==='wisps')continue;const l=document.createElement('label');l.textContent=names[k];const o=document.createElement('output'),i=document.createElement('input');i.type='range';i.min=ranges[k][0];i.max=ranges[k][1];i.step=ranges[k][2];i.value=cfg[k];i.setAttribute('aria-label',names[k]);o.textContent=Number(cfg[k]).toFixed(2);l.append(o,i);$('controls').append(l);inputs[k]={i,o};i.oninput=()=>{cfg[k]=+i.value;apply();};}
function apply(){cfg=sanitize(cfg);flames.forEach((v,i)=>{const rank=Math.floor(i/27)*27+(i%27*10)%27;v.m.visible=rank<cfg.count;});camera.fov=zoomFov(44,cfg.zoom);camera.updateProjectionMatrix();$('panel').style.setProperty('--ui-scale',cfg.text);for(const k in inputs){inputs[k].i.value=cfg[k];inputs[k].o.textContent=cfg[k].toFixed(k==='count'?0:2);}try{localStorage.setItem(settingsKey,JSON.stringify(cfg));}catch{}}
apply();let paused=false,logsOnly=false;
$('toggle').onclick=()=>{$('panel').hidden=!$('panel').hidden;$('toggle').setAttribute('aria-expanded',!$('panel').hidden);};
document.addEventListener('pointerdown',e=>{if(!$('panel').contains(e.target)&&e.target!==$('toggle')){$('panel').hidden=true;$('toggle').setAttribute('aria-expanded','false');}});
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';};$('still').onclick=()=>{logsOnly=!logsOnly;flameGroup.visible=!logsOnly;$('still').textContent=logsOnly?'Show flames':'Logs only';};$('reset').onclick=()=>{cfg={...defaults};apply();};
let px=0,py=0;renderer.domElement.addEventListener('pointermove',e=>{px=(e.clientX/innerWidth-.5)*.16;py=(e.clientY/innerHeight-.5)*.1;});renderer.domElement.addEventListener('pointerleave',()=>{px=py=0;});renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();cfg.zoom=Math.max(1,Math.min(1.2,cfg.zoom-e.deltaY*.0003));apply();},{passive:false});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
let clock=0,last=performance.now(),frames=0,start=last;const frameTimes=[];
addEventListener('visibilitychange',()=>{last=performance.now();});
function frame(now){const realDt=Math.max(0,(now-last)/1000),dt=Math.min(realDt,.05);last=now;if(document.hidden&&$('stats').dataset.ready){requestAnimationFrame(frame);return;}const fireDt=paused?0:dt*cfg.speed;clock+=fireDt;if(volume){volume.update(paused?0:realDt,cfg);flameGroup.visible=false;}
 const f=flicker(clock);firelight.intensity=3.8*f*cfg.light;other.intensity=1.8*(.94+.06*Math.sin(clock*4.1))*cfg.light;
 for(const v of flames){const shed=stepMotion(v.motion,fireDt,cfg.variation,cfg.wisps,v.m.visible&&!logsOnly);
 v.u.time.value=v.motion.clock;v.u.split.value=v.motion.split;v.u.brightness.value=cfg.brightness;
 v.m.scale.y=cfg.height*(.89+.11*Math.sin(v.motion.clock*2+v.phase));if(shed)shedTip(v);}
 for(const q of wisps){if(!q.active)continue;q.age+=fireDt;if(q.age>=q.life||cfg.count===0||cfg.wisps===0){q.active=false;q.mesh.visible=false;continue;}
 const f=wispState(q.age,q.life,q.phase);q.mesh.position.set(q.x+f.drift,q.y+f.rise,q.z);
 q.mesh.scale.set(q.width*f.scale,q.height*f.scale,1);q.u.time.value=q.age+q.phase;q.u.opacity.value=f.alpha;q.u.brightness.value=cfg.brightness;}
 for(const u of coalUniforms){u.uCoal.value=cfg.embers;u.uTime.value=clock;}
 for(const c of coals)c.m.material.emissiveIntensity=cfg.embers*c.heat*(.7+.3*Math.sin(clock*.7+c.phase));
 for(let i=0;i<sparkCount;i++){const s=sparkSeeds[i],age=(clock*s.v+s.t)%5;const y=age<2?age:0;sparkPos[i*3]=s.x+Math.sin(age*3+s.t)*age*.035;sparkPos[i*3+1]=age<2?.35+y:-2;sparkPos[i*3+2]=-.1;}sparkGeo.attributes.position.needsUpdate=true;
 camera.position.x+=(px-camera.position.x)*Math.min(1,dt*2);camera.position.y+=(1.42-py-camera.position.y)*Math.min(1,dt*2);camera.lookAt(0,.93,-.13);if(volume)volume.render(scene,camera,cfg,!logsOnly);else renderer.render(scene,camera);
 $('stats').dataset.ready='true';
 if(volume){$('stats').dataset.volumeSteps=volume.steps;$('stats').dataset.volumeTime=volume.elapsed.toFixed(4);$('stats').dataset.volumeDropped=volume.clock.dropped.toFixed(4);$('stats').dataset.volumePending=volume.clock.pending.toFixed(4);}
 $('stats').dataset.activeWisps=wisps.filter(q=>q.active).length;
 frames++;if(dt>0)frameTimes.push(dt*1000);if(frameTimes.length>300)frameTimes.shift();if(now-start>1000){$('stats').textContent=`${Math.round(frames*1000/(now-start))} fps · ${Math.round(cfg.zoom*100)}% · ${volumeMode?'volume'+(volume.clock.pending>.1?' · simulation behind':''):'silent'}`;frames=0;start=now;}
 window.fireStudyMetrics={triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,meanFrameMs:frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length,zoom:cfg.zoom,flameLayers:cfg.count,paused,logsOnly};requestAnimationFrame(frame);}
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();window.fireStudyFailure('The graphics context was lost');});
$('stats').textContent='Starting fire…';
frame(performance.now());

