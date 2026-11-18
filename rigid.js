'use strict';
// Planar sequential impulses for contacts involving debris. Vertical gravity,
// shelf support, collection, and ordinary disc/disc contacts stay in the game.
const RIGID_CONFIG={friction:.45,positionSlop:.04,positionRate:.55,maxCorrection:2,warmFactor:.75};
let rigidStep=0,rigidContacts=new Map(),rigidIds=new WeakMap(),rigidNextId=1,rigidConstraints=null;
const rigidId=b=>{if(!rigidIds.has(b))rigidIds.set(b,rigidNextId++);return rigidIds.get(b);};
function clearRigidContacts(){rigidContacts.clear();rigidStep=0;rigidConstraints=null;}
function beginRigidStep(){rigidStep++;rigidConstraints=null;for(const [key,c] of rigidContacts)if(c.step<rigidStep-1)rigidContacts.delete(key);}
function polygonProperties(vertices){
 let area2=0,x=0,y=0,moment=0;
 for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],cross=a[0]*b[1]-b[0]*a[1];area2+=cross;x+=(a[0]+b[0])*cross;y+=(a[1]+b[1])*cross;moment+=cross*(a[0]**2+a[0]*b[0]+b[0]**2+a[1]**2+a[1]*b[1]+b[1]**2);}
 const cx=x/(3*area2),cy=y/(3*area2);
 return {cx,cy,inertia:moment/(6*area2)-cx*cx-cy*cy};
}
function inverseInertia(b){
 if(!b||b.static)return 0;
 if(b.rigidInverseInertia!==undefined)return b.rigidInverseInertia;
 if(b.polygon&&!b.unitInertia)b.unitInertia=polygonProperties(b.polygon).inertia;
 return 1/((b.load||b.mass||1)*(b.polygon?b.unitInertia:radiusOf(b)**2/2));
}
const inverseMass=b=>!b||b.static?0:b.rigidInverseMass??1/(b.load||b.mass||1);
function polygonIntersection(subject,clip){
 let result=subject;
 for(let i=0;i<clip.length&&result.length;i++){
  const a=clip[i],b=clip[(i+1)%clip.length],side=p=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x),input=result;result=[];
  for(let j=0;j<input.length;j++){
   const p=input[j],q=input[(j+1)%input.length],sp=side(p),sq=side(q),pin=sp>=-1e-7,qin=sq>=-1e-7;
   if(pin)result.push(p);
   if(pin!==qin){const t=sp/(sp-sq);result.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});}
  }
 }
 return result;
}
function contactManifold(a,b,c){
 if(!a.polygon||!b.polygon)return [c.point];
 const av=worldVertices(a),bv=worldVertices(b),intersection=polygonIntersection(av,bv);
 if(!intersection.length)return [c.point];
 const tx=-c.ny,ty=c.nx,along=intersection.map(p=>p.x*tx+p.y*ty);
 const low=Math.min(...along),high=Math.max(...along);
 const plane=(Math.max(...av.map(p=>p.x*c.nx+p.y*c.ny))+Math.min(...bv.map(p=>p.x*c.nx+p.y*c.ny)))/2;
 const point=t=>({x:c.nx*plane+tx*t,y:c.ny*plane+ty*t});
 return high-low>.5?[point(low),point(high)]:[point((low+high)/2)];
}
function velocityAt(b,p){if(!b)return {x:0,y:0};const w=b.angularVelocity||0;return {x:(b.vx||0)-w*(p.y-b.y),y:(b.vy||0)+w*(p.x-b.x)};}
function impulseAt(b,p,x,y){if(!b||b.static)return;const m=inverseMass(b);b.vx+=x*m;b.vy+=y*m;b.angularMotion=true;b.angularVelocity=(b.angularVelocity||0)+((p.x-b.x)*y-(p.y-b.y)*x)*inverseInertia(b);}
function contactImpulse(a,b,p,nx,ny,depth,key){
 const ia=inverseMass(a),ib=inverseMass(b),aa=inverseInertia(a),ab=inverseInertia(b);
 const rx=p.x-a.x,ry=p.y-a.y,sx=b?p.x-b.x:0,sy=b?p.y-b.y:0;
 const an=rx*ny-ry*nx,bn=sx*ny-sy*nx,tx=-ny,ty=nx,at=rx*ty-ry*tx,bt=sx*ty-sy*tx;
 const normalMass=ia+ib+an*an*aa+bn*bn*ab,tangentMass=ia+ib+at*at*aa+bt*bt*ab;
 let cache=rigidContacts.get(key);
 if(!cache||cache.nx*nx+cache.ny*ny<.98||Math.hypot(cache.x-p.x,cache.y-p.y)>3)cache={normal:0,tangent:0,step:rigidStep};
 if(cache.step!==rigidStep){cache.normal*=RIGID_CONFIG.warmFactor;cache.tangent*=RIGID_CONFIG.warmFactor;const x=nx*cache.normal+tx*cache.tangent,y=ny*cache.normal+ty*cache.tangent;impulseAt(a,p,-x,-y);impulseAt(b,p,x,y);}
 cache.step=rigidStep;cache.nx=nx;cache.ny=ny;cache.x=p.x;cache.y=p.y;
 let va=velocityAt(a,p),vb=velocityAt(b,p),speed=(vb.x-va.x)*nx+(vb.y-va.y)*ny;
 const oldNormal=cache.normal;cache.normal=Math.max(0,oldNormal-speed/normalMass);const j=cache.normal-oldNormal;
 impulseAt(a,p,-nx*j,-ny*j);impulseAt(b,p,nx*j,ny*j);
 va=velocityAt(a,p);vb=velocityAt(b,p);speed=(vb.x-va.x)*tx+(vb.y-va.y)*ty;
 const mu=Math.min(.8,RIGID_CONFIG.friction*Math.sqrt((a.resistance||1)*(b?.resistance||1))),limit=mu*cache.normal,oldTangent=cache.tangent;
 cache.tangent=Math.max(-limit,Math.min(limit,oldTangent-speed/tangentMass));const jt=cache.tangent-oldTangent;
 impulseAt(a,p,-tx*jt,-ty*jt);impulseAt(b,p,tx*jt,ty*jt);
 rigidContacts.set(key,cache);
 // Split position correction: fix penetration without injecting spin energy.
 const correction=Math.min(RIGID_CONFIG.maxCorrection,RIGID_CONFIG.positionRate*Math.max(0,depth-RIGID_CONFIG.positionSlop))/normalMass;
 a.x-=nx*correction*ia;a.y-=ny*correction*ia;if(a.polygon)a.angle-=correction*an*aa;
 if(b&&!b.static){b.x+=nx*correction*ib;b.y+=ny*correction*ib;if(b.polygon)b.angle+=correction*bn*ab;}
}
function localAnchor(body,p){const angle=body?.angle||0,x=p.x-(body?.x||0),y=p.y-(body?.y||0),c=Math.cos(angle),s=Math.sin(angle);return {x:c*x+s*y,y:-s*x+c*y};}
function worldAnchor(body,p){const angle=body?.angle||0,c=Math.cos(angle),s=Math.sin(angle);return {x:(body?.x||0)+p.x*c-p.y*s,y:(body?.y||0)+p.x*s+p.y*c};}
function addConstraint(a,b,p,nx,ny,depth,key){
 rigidConstraints.push({a,b,nx,ny,key,localA:localAnchor(a,{x:p.x+nx*depth/2,y:p.y+ny*depth/2}),localB:localAnchor(b,{x:p.x-nx*depth/2,y:p.y-ny*depth/2})});
}
function solveRigidContacts(bodies,shelfY,shelfSpeed){
 if(rigidConstraints===null)buildRigidConstraints(bodies,shelfY,shelfSpeed);
 for(const c of rigidConstraints){
  const a=worldAnchor(c.a,c.localA),b=worldAnchor(c.b,c.localB),depth=(a.x-b.x)*c.nx+(a.y-b.y)*c.ny;
  if(depth<-.5)continue;
  contactImpulse(c.a,c.b,{x:(a.x+b.x)/2,y:(a.y+b.y)/2},c.nx,c.ny,depth,c.key);
 }
}
function buildRigidConstraints(bodies,shelfY,shelfSpeed){
 rigidConstraints=[];
 for(const body of bodies){
  body.rigidInverseMass=1/(body.load||body.mass||1);
  if(body.polygon&&!body.unitInertia)body.unitInertia=polygonProperties(body.polygon).inertia;
  body.rigidInverseInertia=body.rigidInverseMass/(body.polygon?body.unitInertia:radiusOf(body)**2/2);
 }
 const cellSize=Math.max(32,...bodies.map(b=>radiusOf(b)*2)),grid=new Map(),indices=new Map();
 bodies.forEach((b,index)=>{indices.set(b,index);if(b.falling)return;const key=Math.floor(b.x/cellSize)+','+Math.floor(b.y/cellSize);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(b);});
 for(let i=0;i<bodies.length;i++){
  const a=bodies[i];if(!a.polygon||a.falling)continue;
  const candidates=[],gx=Math.floor(a.x/cellSize),gy=Math.floor(a.y/cellSize);
  for(let x=gx-1;x<=gx+1;x++)for(let y=gy-1;y<=gy+1;y++)candidates.push(...(grid.get(x+','+y)||[]));
  candidates.sort((a,b)=>indices.get(a)-indices.get(b));
  for(const b of candidates){
   const j=indices.get(b);if(a===b||b.falling||(b.polygon&&j<i)||Math.abs(a.z-b.z)>=THICKNESS-.3)continue;
   const c=shapeContact(a,b);if(!c)continue;
   const points=contactManifold(a,b,c),key=rigidId(a)+':'+rigidId(b);
   points.forEach((p,index)=>addConstraint(a,b,p,c.nx,c.ny,c.depth,key+':'+index));
  }
  // Walls and moving pusher are kinematic surfaces in the same solver.
  const walls=[{axis:'x',limit:LEFT,sign:-1,name:'left',speed:0},{axis:'x',limit:RIGHT,sign:1,name:'right',speed:0},
   {axis:'y',limit:a.z<SHELF_HEIGHT-1?shelfY:BACK,sign:-1,name:a.z<SHELF_HEIGHT-1?'pusher':'back',speed:a.z<SHELF_HEIGHT-1?shelfSpeed:0}];
  for(const wall of walls){
   const vertices=worldVertices(a),nx=wall.axis==='x'?wall.sign:0,ny=wall.axis==='y'?wall.sign:0;
   const extreme=wall.sign<0?Math.min(...vertices.map(v=>v[wall.axis])):Math.max(...vertices.map(v=>v[wall.axis]));
   const depth=wall.sign<0?wall.limit-extreme:extreme-wall.limit;if(depth<-.02)continue;
   const points=vertices.filter(v=>Math.abs(v[wall.axis]-extreme)<.2).sort((p,q)=>wall.axis==='x'?p.y-q.y:p.x-q.x);
   const contacts=points.length>1?[points[0],points.at(-1)]:points;
   const surface={x:0,y:0,vx:0,vy:wall.axis==='y'?wall.speed:0,static:true};
   contacts.forEach((p,index)=>addConstraint(a,surface,p,nx,ny,Math.max(0,depth),rigidId(a)+':'+wall.name+':'+index));
  }
 }
}
