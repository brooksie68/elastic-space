export const defaults={count:27,height:1,speed:1,brightness:1,embers:1,light:1,zoom:1.2,text:1};
export const ranges={count:[0,81,1],height:[.4,1.8,.05],speed:[.2,2,.05],brightness:[.2,2,.05],embers:[0,2,.05],light:[.2,2,.05],zoom:[1,1.2,.01],text:[.8,1.5,.05]};
export function sanitize(input){return Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,Number.isFinite(input?.[k])?Math.max(ranges[k][0],Math.min(ranges[k][1],k==='count'?Math.round(input[k]):input[k])):v]));}
export function flicker(t){return .86+.07*Math.sin(t*6.3)+.045*Math.sin(t*11.7+2)+.025*Math.sin(t*19.1);}
export function zoomFov(degrees,zoom){return 2*Math.atan(Math.tan(degrees*Math.PI/360)/zoom)*180/Math.PI;}
