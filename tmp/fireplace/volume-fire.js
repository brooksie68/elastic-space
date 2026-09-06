// KEEP — reactive volume study, WebGL2. Limited MacCormack flame transport,
// world-space velocity, noise curl and vorticity confinement. Not chemical CFD.
import * as THREE from 'three';
import * as S from './volume-shaders.js';
import {VolumeClock,STEP} from './volume-clock.js';
export {STEP};
export const GRID=[40,56,24],TILES=6;
const W=240,H=224;
export class VolumeFire {
 constructor(renderer){
 this.r=renderer;if(!renderer.extensions.has('EXT_color_buffer_float'))throw Error('This volume study needs floating-point WebGL render targets.');
 const rt=()=>new THREE.WebGLRenderTarget(W,H,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false});
 this.a=rt();this.b=rt();this.fuel=rt();this.fuelNext=rt();this.forward=rt();this.reverse=rt();this.corrected=rt();this.pa=rt();this.pb=rt();this.div=rt();this.curl=rt();
 this.scene=new THREE.Scene();this.camera=new THREE.Camera();this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));this.quad.frustumCulled=false;this.scene.add(this.quad);
 this.u=Object.fromEntries(['field','source','forwardField','reverseField','pressure','divergence','curlField'].map(k=>[k,{value:null}]));
 for(const [k,v] of Object.entries({dt:STEP,time:0,drive:1,turbulence:1,height:1}))this.u[k]={value:v};
 this.materials={};for(const name of ['advect','correct','combustion','curl','forces','divergence','jacobi','project'])this.materials[name]=new THREE.ShaderMaterial({uniforms:this.u,vertexShader:S.vertex,fragmentShader:S.common+S[name],depthTest:false,depthWrite:false,toneMapped:false});
 const oldClear=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha();renderer.setClearColor(0,0);
 for(const t of [this.a,this.b,this.fuel,this.fuelNext,this.forward,this.reverse,this.corrected,this.pa,this.pb,this.div,this.curl]){renderer.setRenderTarget(t);renderer.clear();}
 renderer.setClearColor(oldClear,oldAlpha);renderer.setRenderTarget(null);
 this.color=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});this.color.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
 this.renderU={field:{value:this.fuel.texture},sceneDepth:{value:this.color.depthTexture},inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},eye:{value:new THREE.Vector3()},brightness:{value:1},enabled:{value:1}};
 this.composite=new THREE.ShaderMaterial({uniforms:this.renderU,vertexShader:S.vertex,depthTest:false,depthWrite:false,fragmentShader:`precision highp float;varying vec2 vUv;uniform sampler2D field,sceneDepth;uniform mat4 inverseProjection,cameraWorld;uniform vec3 eye;uniform float brightness,enabled;
 ${S.sampling}
 void main(){vec4 v=inverseProjection*vec4(vUv*2.-1.,1.,1.);vec3 dir=normalize((cameraWorld*vec4(v.xyz/v.w,1.)).xyz-eye);
 vec3 inv=1./dir,a=(vec3(-1.2,.10,-.65)-eye)*inv,b=(vec3(1.2,2.1,.65)-eye)*inv,lo=min(a,b),hi=max(a,b);float nearT=max(0.,max(lo.x,max(lo.y,lo.z))),farT=min(hi.x,min(hi.y,hi.z));
 float depth=texture2D(sceneDepth,vUv).r;vec4 dp=inverseProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);vec3 wp=(cameraWorld*vec4(dp.xyz/dp.w,1.)).xyz;farT=min(farT,length(wp-eye));
 vec3 light=vec3(0);float trans=1.;if(enabled>.5&&farT>nearT){float stepSize=(farT-nearT)/48.;float jitter=fract(dot(gl_FragCoord.xy,vec2(.75487766,.56984029)));for(int i=0;i<48;i++){
 vec3 p=eye+dir*(nearT+(float(i)+jitter)*stepSize);vec2 state=sample3(field,(p-vec3(-1.2,.10,-.65))/DX-.5).rg;
 float burn=state.r,heat=state.g;
 float edge=smoothstep(.08,.22,burn),core=smoothstep(.36,.80,burn)*smoothstep(.25,1.2,heat);
 vec3 color=mix(vec3(1.,.065,.002),vec3(1.,.48,.025),smoothstep(.12,.4,burn));color=mix(color,vec3(1.,.88,.5),core);
 float opacity=1.-exp(-edge*stepSize*3.);light+=trans*opacity*color*(.4+core*2.5)*brightness;trans*=1.-opacity*.22;
 }}gl_FragColor=vec4(light,trans);}`});
 this.gas=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
 this.finishU={sceneColor:{value:this.color.texture},gas:{value:this.gas.texture}};
 this.finish=new THREE.ShaderMaterial({uniforms:this.finishU,vertexShader:S.vertex,depthTest:false,depthWrite:false,fragmentShader:`varying vec2 vUv;uniform sampler2D sceneColor,gas;void main(){vec4 f=texture2D(gas,vUv);gl_FragColor=vec4(texture2D(sceneColor,vUv).rgb*f.a+f.rgb,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 this.clock=new VolumeClock();this.elapsed=0;this.steps=0;
 }
 pass(mat,target){this.quad.material=mat;this.r.setRenderTarget(target);this.r.render(this.scene,this.camera);}
 step(dt,time){const u=this.u,m=this.materials;u.dt.value=dt;u.time.value=time;u.field.value=this.a.texture;
 // Scalar MacCormack: forward, reverse, bounded correction. Velocity stays fixed
 // throughout these passes; eight source neighbours bound every corrected value.
 u.source.value=this.fuel.texture;this.pass(m.advect,this.forward);
 u.dt.value=-dt;u.source.value=this.forward.texture;this.pass(m.advect,this.reverse);
 u.dt.value=dt;u.source.value=this.fuel.texture;u.forwardField.value=this.forward.texture;u.reverseField.value=this.reverse.texture;this.pass(m.correct,this.corrected);
 u.source.value=this.corrected.texture;this.pass(m.combustion,this.fuelNext);[this.fuel,this.fuelNext]=[this.fuelNext,this.fuel];
 u.source.value=this.a.texture;this.pass(m.advect,this.b);[this.a,this.b]=[this.b,this.a];
 u.field.value=this.a.texture;this.pass(m.curl,this.curl);
 u.curlField.value=this.curl.texture;u.source.value=this.fuel.texture;this.pass(m.forces,this.b);[this.a,this.b]=[this.b,this.a];
 u.field.value=this.a.texture;this.pass(m.divergence,this.div);u.divergence.value=this.div.texture;
 for(let i=0;i<6;i++){u.pressure.value=this.pa.texture;this.pass(m.jacobi,this.pb);[this.pa,this.pb]=[this.pb,this.pa];}
 u.pressure.value=this.pa.texture;this.pass(m.project,this.b);[this.a,this.b]=[this.b,this.a];
 }
 update(seconds,cfg){this.u.drive.value=cfg.count/27;this.u.turbulence.value=cfg.variation;this.u.height.value=cfg.height;
 this.clock.advance(seconds,cfg.speed,(dt,time)=>this.step(dt,time));this.elapsed=this.clock.elapsed;this.steps=this.clock.steps;this.r.setRenderTarget(null);}
 render(scene,camera,cfg,enabled){const size=this.r.getDrawingBufferSize(new THREE.Vector2());if(this.color.width!==size.x||this.color.height!==size.y)this.color.setSize(size.x,size.y);
 this.r.setRenderTarget(this.color);this.r.render(scene,camera);this.renderU.field.value=this.fuel.texture;this.renderU.inverseProjection.value.copy(camera.projectionMatrixInverse);this.renderU.cameraWorld.value.copy(camera.matrixWorld);this.renderU.eye.value.copy(camera.position);this.renderU.brightness.value=cfg.brightness;this.renderU.enabled.value=enabled?1:0;
 const gw=Math.max(1,Math.round(size.x*.65)),gh=Math.max(1,Math.round(size.y*.65));if(this.gas.width!==gw||this.gas.height!==gh)this.gas.setSize(gw,gh);this.pass(this.composite,this.gas);this.pass(this.finish,null);}
}
