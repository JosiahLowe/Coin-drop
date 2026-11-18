'use strict';
const DEBRIS_TYPES={
 bone:{mass:.7,friction:.85,color:'#ddd1aa',vertices:[[-21,-3],[-17,-5],[17,-5],[21,-3],[21,3],[17,5],[-17,5],[-21,3]]},
 rock:{mass:4.5,friction:1.3,color:'#85939c',vertices:[[-15,-7],[-7,-15],[9,-13],[17,-3],[12,12],[-5,16],[-16,7]]},
 wood:{mass:2,friction:1.05,color:'#a6784e',vertices:[[-23,-6],[23,-6],[23,6],[-23,6]]}
};
const CLUTTER_CONFIG={lowerCoins:30,debrisCount:9,minimumEach:1,debrisWeights:{bone:4,rock:2,wood:3},attempts:300};
function debrisBody(type,x,y){const d=DEBRIS_TYPES[type],body=coin(x,y,0);return Object.assign(body,{debris:type,polygon:d.vertices.map(v=>[...v]),mass:d.mass,resistance:d.friction,radius:Math.max(...d.vertices.map(v=>Math.hypot(...v))),angularVelocity:0});}
function worldVertices(body){const ca=Math.cos(body.angle),sa=Math.sin(body.angle);return body.polygon.map(([x,y])=>({x:body.x+x*ca-y*sa,y:body.y+x*sa+y*ca}));}
function bodyExtent(body,axis){return body.polygon?Math.max(...worldVertices(body).map(v=>Math.abs(v[axis]-body[axis]))):radiusOf(body);}
function shapeContact(a,b){
 const dx=b.x-a.x,dy=b.y-a.y,r=radiusOf(a)+radiusOf(b);
 if(Math.abs(dx)>=r||Math.abs(dy)>=r||dx*dx+dy*dy>=r*r)return null;
 if(!a.polygon&&!b.polygon){const distance=Math.hypot(dx,dy);return {nx:distance>.001?dx/distance:1,ny:distance>.001?dy/distance:0,depth:r-distance};}
 const av=a.polygon?worldVertices(a):null,bv=b.polygon?worldVertices(b):null,axes=[];
 for(const vs of [av,bv])if(vs)for(let i=0;i<vs.length;i++){const p=vs[i],q=vs[(i+1)%vs.length],length=Math.hypot(q.x-p.x,q.y-p.y);axes.push({x:-(q.y-p.y)/length,y:(q.x-p.x)/length});}
 if(!av||!bv){const circle=av?b:a,vs=av||bv,nearest=vs.reduce((p,v)=>Math.hypot(v.x-circle.x,v.y-circle.y)<Math.hypot(p.x-circle.x,p.y-circle.y)?v:p);const x=nearest.x-circle.x,y=nearest.y-circle.y,l=Math.hypot(x,y);if(l>1e-8)axes.push({x:x/l,y:y/l});}
 const projection=(body,vs,n)=>{if(!vs){const center=body.x*n.x+body.y*n.y;return [center-radiusOf(body),center+radiusOf(body)];}const values=vs.map(v=>v.x*n.x+v.y*n.y);return [Math.min(...values),Math.max(...values)];};
 let best=null;
 for(const n of axes){const ap=projection(a,av,n),bp=projection(b,bv,n),positive=ap[1]-bp[0],negative=bp[1]-ap[0];if(positive<=0||negative<=0)return null;const sign=positive<negative?1:-1,depth=Math.min(positive,negative);if(!best||depth<best.depth)best={nx:n.x*sign,ny:n.y*sign,depth};}
 // Closest surface point gives off-center impacts a rotational lever arm.
 const nearestPoint=(vs,point)=>{let bestPoint=null,distance=Infinity;for(let i=0;i<vs.length;i++){const p=vs[i],q=vs[(i+1)%vs.length],x=q.x-p.x,y=q.y-p.y,t=Math.max(0,Math.min(1,((point.x-p.x)*x+(point.y-p.y)*y)/(x*x+y*y))),v={x:p.x+t*x,y:p.y+t*y},d=Math.hypot(v.x-point.x,v.y-point.y);if(d<distance){distance=d;bestPoint=v;}}return bestPoint;};
 best.point=av?nearestPoint(av,b):nearestPoint(bv,a);return best;
}
function supportFootprint(a,b){return (!a.polygon&&!b.polygon)||!!shapeContact(a,b);}
function rotationalInverse(body,point,nx,ny){if(!body.polygon)return {inverse:0,lever:0};const inertia=(body.load||body.mass)*body.radius*body.radius/3,lever=(point.x-body.x)*ny-(point.y-body.y)*nx;return {inverse:1/inertia,lever};}
function drawDebris(ctx,c){ctx.save();ctx.translate(c.x,c.y-Math.max(0,c.z)*.38);ctx.rotate(c.angle);if(c.tip)ctx.scale(1,Math.max(.25,Math.cos(c.tip*1.25)));if(c.falling){ctx.globalAlpha=Math.max(0,1+c.z/80);const scale=Math.max(.3,1+c.z/100);ctx.scale(scale,scale);}const d=DEBRIS_TYPES[c.debris];ctx.fillStyle=d.color;ctx.strokeStyle='#26312b';ctx.lineWidth=2;ctx.beginPath();c.polygon.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke();ctx.lineWidth=1;
 if(c.debris==='wood'){ctx.strokeStyle='#68472e';for(const y of [-2,3]){ctx.beginPath();ctx.moveTo(-19,y);ctx.lineTo(19,y);ctx.stroke();}ctx.fillStyle='#d0a777';ctx.fillRect(-21,-4,3,3);}
 else if(c.debris==='rock'){ctx.strokeStyle='#b8c2c5';ctx.beginPath();ctx.moveTo(-10,-5);ctx.lineTo(-3,-10);ctx.lineTo(8,-8);ctx.stroke();}
 else {ctx.fillStyle='#f2e4c5';ctx.fillRect(-18,-3,5,6);ctx.fillRect(13,-3,5,6);ctx.fillStyle='#b7aa87';ctx.fillRect(-10,1,20,1);}ctx.restore();}
function populateLowerClutter(){
 const reserved=body=>Math.hypot(body.x-110,body.y-340)<radiusOf(body)+23||startingPlans.some(p=>Math.hypot(body.x-p.x,body.y-p.y)<radiusOf(body)+p.radius+2);
 const place=body=>{for(let attempt=0;attempt<CLUTTER_CONFIG.attempts;attempt++){const r=radiusOf(body);body.x=LEFT+r+2+Math.random()*(RIGHT-LEFT-2*r-4);body.y=pusherY+r+8+Math.random()*(EDGE-pusherY-2*r-30);body.angle=Math.random()*Math.PI*2;if(reserved(body)||coins.some(c=>Math.abs(c.z)<THICKNESS&&(shapeContact(body,c)||Math.hypot(c.x-body.x,c.y-body.y)<radiusOf(c)+r+1)))continue;coins.push(body);return true;}return false;};
 for(let i=0;i<CLUTTER_CONFIG.debrisCount;i++){let value=Math.random()*Object.values(CLUTTER_CONFIG.debrisWeights).reduce((a,b)=>a+b,0),type='bone';for(const [key,weight] of Object.entries(CLUTTER_CONFIG.debrisWeights)){value-=weight;if(value<0){type=key;break;}}if(i<Object.keys(DEBRIS_TYPES).length*CLUTTER_CONFIG.minimumEach)type=Object.keys(DEBRIS_TYPES)[i%Object.keys(DEBRIS_TYPES).length];place(debrisBody(type,0,0));}
 for(let i=0;i<CLUTTER_CONFIG.lowerCoins;i++)place(coin(0,0,0));
}
