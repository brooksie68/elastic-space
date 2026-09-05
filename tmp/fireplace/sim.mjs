import assert from 'node:assert/strict';import {defaults,sanitize,flicker,zoomFov} from './model.js';
assert.deepEqual(sanitize({}),defaults);assert.equal(sanitize({zoom:9}).zoom,1.2);assert.equal(sanitize({zoom:NaN}).zoom,1.2);
for(let t=0;t<3600;t+=.017){const f=flicker(t);assert(f>=.719&&f<=1.001);}
assert(Math.abs(Math.tan(zoomFov(44,1)*Math.PI/360)/Math.tan(zoomFov(44,1.2)*Math.PI/360)-1.2)<1e-12);
console.log('PASS: one-hour light bounds, invalid preset handling, exact 1.20x camera magnification');

