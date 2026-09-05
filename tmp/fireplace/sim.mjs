import assert from 'node:assert/strict';import {defaults,sanitize,flicker,zoomFov,makeMotion,stepMotion,wispState} from './model.js';
assert.deepEqual(sanitize({}),defaults);assert.equal(sanitize({zoom:9}).zoom,1.2);assert.equal(sanitize({zoom:NaN}).zoom,1.2);
for(let t=0;t<3600;t+=.017){const f=flicker(t);assert(f>=.719&&f<=1.001);}
assert(Math.abs(Math.tan(zoomFov(44,1)*Math.PI/360)/Math.tan(zoomFov(44,1.2)*Math.PI/360)-1.2)<1e-12);
console.log('PASS: one-hour light bounds, invalid preset handling, exact 1.20x camera magnification');
const motions=Array.from({length:81},(_,i)=>makeMotion(i+1));let sheds=0;
for(let frame=0;frame<60*120;frame++)for(const m of motions){const old=m.clock;if(stepMotion(m,1/60,1,1,true))sheds++;assert(m.clock>old&&m.clock-old<.05);assert(m.split>=0&&m.split<=1);}
assert(sheds>200&&sheds<1000);assert(new Set(motions.map(m=>m.clock.toFixed(2))).size>70);
const stopped=makeMotion(2),initial=JSON.stringify(stopped);assert.equal(stepMotion(stopped,0,1,1,true),false);assert.equal(JSON.stringify(stopped),initial);
for(let i=0;i<6000;i++)assert.equal(stepMotion(stopped,1/60,1,0,true),false);
const inactive=makeMotion(3);for(let i=0;i<6000;i++)assert.equal(stepMotion(inactive,1/60,1,2,false),false);
for(let phase=0;phase<10;phase++)for(let a=0;a<=1.2;a+=.01){const s=wispState(a,1,phase);assert(s.alpha>=0&&s.alpha<=1&&s.scale>0&&s.rise>=0&&s.rise<=.48);}
assert.equal(wispState(1,1,0).alpha,0);
console.log('PASS: independent bounded clocks, pause, disabled/hidden emitters, detached-tip expiry; events:',sheds);

