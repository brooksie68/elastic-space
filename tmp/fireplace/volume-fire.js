// KEEP — bounded 3D heated-gas study. WebGL2 atlas computation; no external assets.
// Semi-Lagrangian transport, buoyancy, curl forcing, pressure projection, cooling.
// This is a visual gas model, not a chemical combustion solver.
import * as THREE from 'three';
export const GRID=[40,56,24],TILES=6,STEP=1/45;
const W=GRID[0]*TILES,H=GRID[1]*GRID[2]/TILES;
const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const common=`precision highp float;varying vec2 vUv;
uniform sampler2D field,pressure,divergence;uniform float dt,time,drive,turbulence,height;
const vec3 N=vec3(40.,56.,24.);const vec2 RES=vec2(240.,224.);
vec3 cell(){vec2 p=floor(gl_FragCoord.xy);return vec3(mod(p.x,40.),mod(p.y,56.),floor(p.x/40.)+6.*floor(p.y/56.));}
vec2 addr(vec3 c){c=clamp(c,vec3(0),N-1.);return (vec2(mod(c.z,6.)*40.+c.x,floor(c.z/6.)*56.+c.y)+.5)/RES;}
vec4 sample3(sampler2D tex,vec3 c){c=clamp(c,vec3(0),N-1.);float z=floor(c.z);return mix(texture2D(tex,addr(vec3(c.xy,z))),texture2D(tex,addr(vec3(c.xy,min(z+1.,23.)))),fract(c.z));}
vec3 world(vec3 c){return vec3(-1.2,.10,-.65)+(c+.5)/N*vec3(2.4,2.,1.3);}
float solid(vec3 p){float d=10.;
 d=min(d,length(vec2(p.y-(.32+.055*p.x),p.z-.22))-.135);
 d=min(d,length(vec2(p.y-(.38-.12*p.x),p.z+.20))-.135);
 d=min(d,length(vec2(p.y-(.62-.20*p.x),p.z+.05))-.12);
 return step(d,0.)*step(abs(p.x),.83);}
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
export class VolumeFire{
 constructor(renderer){this.r=renderer;if(!renderer.extensions.has('EXT_color_buffer_float'))throw Error('This volume study needs floating-point WebGL render targets.');
 const rt=()=>new THREE.WebGLRenderTarget(W,H,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false});
 this.a=rt();this.b=rt();this.pa=rt();this.pb=rt();this.div=rt();
 this.scene=new THREE.Scene();this.camera=new THREE.Camera();this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));this.quad.frustumCulled=false;this.scene.add(this.quad);
 this.u={field:{value:null},pressure:{value:null},divergence:{value:null},dt:{value:STEP},time:{value:0},drive:{value:1},turbulence:{value:1},height:{value:1}};
 const material=body=>new THREE.ShaderMaterial({uniforms:this.u,vertexShader:vertex,fragmentShader:common+body,depthTest:false,depthWrite:false,toneMapped:false});
 this.advect=material(`void main(){vec3 c=cell(),p=world(c);vec4 old=sample3(field,c);vec4 q=sample3(field,c-old.xyz*dt);
 vec3 v=q.xyz*exp(-dt*.65);float heat=max(0.,q.w-dt*(.8/height+q.w*.35));
 vec3 f=p*7.;float t=time*1.4;
 // Each component depends on the other two axes: divergence-free stirring.
 vec3 curl=vec3(sin(f.y+t)+cos(f.z*1.3-t*.7),sin(f.z+t*.8)+cos(f.x-t),sin(f.x*1.1+t*.9)+cos(f.y-t*.6));
 v+=dt*(curl*9.*turbulence+vec3(0.,heat*26.,0.));
 float tongues=noise(vec3(p.x*7.,p.z*9.,time*.9));
 float bed=exp(-pow((p.y-.27)/.105,2.)-pow(p.z/.43,4.))*(1.-smoothstep(.70,1.,abs(p.x)));
 float upper=exp(-pow((p.y-(.80-.20*p.x))/.075,2.)-pow((p.z+.05)/.14,2.))*(1.-smoothstep(.67,.88,abs(p.x)));
 float emit=(bed+upper*.7)*smoothstep(.24,.65,tongues)*1.6*drive;
 heat=min(3.2,heat+dt*emit*12.);v.y+=dt*emit*15.;
 if(solid(p)>.5){v=vec3(0);heat=0.;}
 if(c.x<1.||c.x>38.)v.x=0.;if(c.z<1.||c.z>22.)v.z=0.;if(c.y<1.)v.y=max(0.,v.y);
 if(c.y>53.)heat*=.7;
 gl_FragColor=vec4(clamp(v,vec3(-45),vec3(45)),heat);}`);
 this.divergence=material(`void main(){vec3 c=cell();float d=(sample3(field,c+vec3(1,0,0)).x-sample3(field,c-vec3(1,0,0)).x+sample3(field,c+vec3(0,1,0)).y-sample3(field,c-vec3(0,1,0)).y+sample3(field,c+vec3(0,0,1)).z-sample3(field,c-vec3(0,0,1)).z)*.5;gl_FragColor=vec4(d,0,0,1);}`);
 this.jacobi=material(`void main(){vec3 c=cell();float p=(sample3(pressure,c+vec3(1,0,0)).x+sample3(pressure,c-vec3(1,0,0)).x+sample3(pressure,c+vec3(0,1,0)).x+sample3(pressure,c-vec3(0,1,0)).x+sample3(pressure,c+vec3(0,0,1)).x+sample3(pressure,c-vec3(0,0,1)).x-texture2D(divergence,vUv).x)/6.;gl_FragColor=vec4(p,0,0,1);}`);
 this.project=material(`void main(){vec3 c=cell();vec4 q=texture2D(field,vUv);vec3 g=vec3(sample3(pressure,c+vec3(1,0,0)).x-sample3(pressure,c-vec3(1,0,0)).x,sample3(pressure,c+vec3(0,1,0)).x-sample3(pressure,c-vec3(0,1,0)).x,sample3(pressure,c+vec3(0,0,1)).x-sample3(pressure,c-vec3(0,0,1)).x)*.5;vec3 v=q.xyz-g;if(solid(world(c))>.5)v=vec3(0);gl_FragColor=vec4(v,q.w);}`);
 const oldClear=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha();renderer.setClearColor(0,0);for(const t of [this.a,this.b,this.pa,this.pb,this.div]){renderer.setRenderTarget(t);renderer.clear();}renderer.setClearColor(oldClear,oldAlpha);renderer.setRenderTarget(null);
 this.color=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});this.color.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
 this.renderU={field:{value:this.a.texture},sceneColor:{value:this.color.texture},sceneDepth:{value:this.color.depthTexture},inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},eye:{value:new THREE.Vector3()},time:{value:0},brightness:{value:1},enabled:{value:1}};
 this.composite=new THREE.ShaderMaterial({uniforms:this.renderU,vertexShader:vertex,depthTest:false,depthWrite:false,fragmentShader:`precision highp float;varying vec2 vUv;uniform sampler2D field,sceneColor,sceneDepth;uniform mat4 inverseProjection,cameraWorld;uniform vec3 eye;uniform float time,brightness,enabled;
 vec2 addr(vec3 c){c=clamp(c,vec3(0),vec3(39,55,23));return (vec2(mod(c.z,6.)*40.+c.x,floor(c.z/6.)*56.+c.y)+.5)/vec2(240,224);}
 float temp(vec3 p){vec3 c=clamp((p-vec3(-1.2,.10,-.65))/vec3(2.4,2.,1.3)*vec3(40,56,24)-.5,vec3(0),vec3(39,55,23));float z=floor(c.z);return mix(texture2D(field,addr(vec3(c.xy,z))).w,texture2D(field,addr(vec3(c.xy,min(23.,z+1.)))).w,fract(c.z));}
 void main(){vec3 bg=texture2D(sceneColor,vUv).rgb;vec4 v=inverseProjection*vec4(vUv*2.-1.,1.,1.);vec3 dir=normalize((cameraWorld*vec4(v.xyz/v.w,1.)).xyz-eye);
 vec3 inv=1./dir;vec3 a=(vec3(-1.2,.10,-.65)-eye)*inv,b=(vec3(1.2,2.1,.65)-eye)*inv;vec3 lo=min(a,b),hi=max(a,b);float nearT=max(0.,max(lo.x,max(lo.y,lo.z))),farT=min(hi.x,min(hi.y,hi.z));
 float depth=texture2D(sceneDepth,vUv).r;vec4 dp=inverseProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);vec3 wp=(cameraWorld*vec4(dp.xyz/dp.w,1.)).xyz;farT=min(farT,length(wp-eye));
 vec3 light=vec3(0);float trans=1.;if(enabled>.5&&farT>nearT){float stepSize=(farT-nearT)/48.;float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);for(int i=0;i<48;i++){vec3 p=eye+dir*(nearT+(float(i)+jitter)*stepSize);float detail=sin(p.x*35.+time*1.1+sin(p.z*22.))*sin(p.y*28.-time*3.7+sin(p.x*12.));float heat=max(0.,temp(p)-.16*(.5+.5*detail));float burn=smoothstep(.38,1.55,heat);float opacity=1.-exp(-burn*stepSize*2.5);
 vec3 c=mix(vec3(1.,.055,.001),vec3(1.,.43,.035),smoothstep(.45,1.25,heat));c=mix(c,vec3(1.,.88,.44),smoothstep(1.25,2.65,heat));light+=trans*opacity*c*(.6+heat*.65)*brightness;trans*=1.-opacity*.45;if(trans<.02)break;}}
 gl_FragColor=vec4(light,trans);
 }`});
 this.gas=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
 this.finishU={sceneColor:{value:this.color.texture},gas:{value:this.gas.texture}};
 this.finish=new THREE.ShaderMaterial({uniforms:this.finishU,vertexShader:vertex,depthTest:false,depthWrite:false,fragmentShader:`varying vec2 vUv;uniform sampler2D sceneColor,gas;void main(){vec4 f=texture2D(gas,vUv);gl_FragColor=vec4(texture2D(sceneColor,vUv).rgb*f.a+f.rgb,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 this.elapsed=0;this.accumulator=0;this.steps=0;
 }
 pass(mat,target){this.quad.material=mat;this.r.setRenderTarget(target);this.r.render(this.scene,this.camera);}
 update(delta,cfg){this.accumulator=Math.min(this.accumulator+delta,STEP*2);this.u.drive.value=cfg.count/27;this.u.turbulence.value=.35+cfg.variation;this.u.height.value=cfg.height;
 while(this.accumulator>=STEP){this.elapsed+=STEP;this.u.time.value=this.elapsed;this.u.field.value=this.a.texture;this.pass(this.advect,this.b);[this.a,this.b]=[this.b,this.a];this.u.field.value=this.a.texture;this.pass(this.divergence,this.div);this.u.divergence.value=this.div.texture;
 for(let j=0;j<6;j++){this.u.pressure.value=this.pa.texture;this.pass(this.jacobi,this.pb);[this.pa,this.pb]=[this.pb,this.pa];}
 this.u.pressure.value=this.pa.texture;this.pass(this.project,this.b);[this.a,this.b]=[this.b,this.a];this.accumulator-=STEP;this.steps++;}this.r.setRenderTarget(null);}
 render(scene,camera,cfg,enabled){const size=this.r.getDrawingBufferSize(new THREE.Vector2());if(this.color.width!==size.x||this.color.height!==size.y)this.color.setSize(size.x,size.y);
 this.r.setRenderTarget(this.color);this.r.render(scene,camera);this.renderU.field.value=this.a.texture;this.renderU.inverseProjection.value.copy(camera.projectionMatrixInverse);this.renderU.cameraWorld.value.copy(camera.matrixWorld);this.renderU.eye.value.copy(camera.position);this.renderU.brightness.value=cfg.brightness;this.renderU.enabled.value=enabled?1:0;this.renderU.time.value=this.elapsed;const gw=Math.max(1,Math.round(size.x*.65)),gh=Math.max(1,Math.round(size.y*.65));if(this.gas.width!==gw||this.gas.height!==gh)this.gas.setSize(gw,gh);this.pass(this.composite,this.gas);this.pass(this.finish,null);}
}
