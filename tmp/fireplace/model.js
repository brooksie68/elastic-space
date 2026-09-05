export const defaults={count:27,height:1,speed:1,variation:1,wisps:1,brightness:1,embers:1,light:1,zoom:1.2,text:1};
export const ranges={count:[0,81,1],height:[.4,1.8,.05],speed:[.2,2,.05],variation:[0,1.5,.05],wisps:[0,2,.05],brightness:[.2,2,.05],embers:[0,2,.05],light:[.2,2,.05],zoom:[1,1.2,.01],text:[.8,1.5,.05]};
export function sanitize(input){return Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,Number.isFinite(input?.[k])?Math.max(ranges[k][0],Math.min(ranges[k][1],k==='count'?Math.round(input[k]):input[k])):v]));}
export function flicker(t){return .86+.07*Math.sin(t*6.3)+.045*Math.sin(t*11.7+2)+.025*Math.sin(t*19.1);}
export function zoomFov(degrees,zoom){return 2*Math.atan(Math.tan(degrees*Math.PI/360)/zoom)*180/Math.PI;}
export function makeMotion(seed){let state=(seed*100003+17)>>>0;const random=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);return {random,base:.55+random()*.95,rate:1,target:1,wait:random()*2,clock:random()*20,tip:3+random()*16,split:0};}
export function stepMotion(m,dt,variation,wisps,active){
 if(dt<=0)return false;
 m.wait-=dt;if(m.wait<=0){m.target=.45+m.random()*1.25;m.wait=.35+m.random()*2.8;}
 m.rate+=(m.target-m.rate)*(1-Math.exp(-dt*2.4));
 const speed=Math.max(.15,1+variation*(m.base*m.rate-1));m.clock+=dt*speed;
 m.split=Math.max(0,m.split-dt/0.65);
 if(active&&wisps>0){m.tip-=dt*wisps;if(m.tip<=0){m.tip=8+m.random()*24;m.split=1;return true;}}
 return false;
}
export function wispState(age,life,phase){const p=Math.max(0,Math.min(1,age/life));return {rise:.48*p,drift:.065*Math.sin(p*5+phase)*p,scale:1+.45*Math.sin(p*Math.PI)-.8*p,alpha:(1-p)*(1-p)};}
