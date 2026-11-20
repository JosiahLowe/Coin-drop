const {chromium}=require('playwright'),fs=require('fs');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{for(const width of [320,390,1280]){
const p=await browser.newPage({viewport:{width,height:844},hasTouch:true});await p.route('http://test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1)||'index.html';return r.fulfill({body:fs.readFileSync(__dirname+'/../'+f),contentType:f.endsWith('.js')?'application/javascript':'text/html'});});await p.addInitScript(()=>requestAnimationFrame=()=>0);await p.goto('http://test/');
console.log(await p.evaluate(()=>{
 const check=(v,m)=>{if(!v)throw Error(m);},bounds={left:dungeon.left,right:dungeon.right,floor:dungeon.floor};
 const trace=(hz,side,random=()=>.5)=>{const b=new Bat(side,bounds,BAT_CONFIG,random),states=new Set(),dirs=new Set();let last={x:b.x,y:b.y},low=0,turn=false,lastDY=0;
 for(let i=0;i<hz*40;i++){
  // Deliberately hostile proxy: accessing player coordinates would fail.
  b.update(1/hz,new Proxy({}, {get(){throw Error('Bat read player');}}));states.add(b.state);
  check(b.x>=b.left-1e-7&&b.x<=b.right+1e-7&&b.y>=b.ceiling-1e-7&&b.y<=b.floor-BAT_CONFIG.minHeight+1e-7,'Flight bounds');
  check(Math.hypot(b.x-last.x,b.y-last.y)<240/hz,'Flight snapped');
  if(b.state==='SWOOP'){dirs.add(b.moveDirection);low=Math.max(low,b.y);const dy=b.y-last.y;if(lastDY>0&&dy<0)turn=true;lastDY=dy;}
  last={x:b.x,y:b.y};
 }
 check(states.size===5&&states.has('CEILING_CRAWL')&&turn&&low>95,'Full readable cycle');return {x:b.x,y:b.y,state:b.state,dirs:[...dirs]};};
 for(const side of [-1,1]){const b=new Bat(side,bounds);check(b.state==='CEILING_CRAWL'&&b.y===b.ceiling&&b.x===(side>0?b.right:b.left)&&!b.canContact,'Ceiling side spawn');const before=b.x;b.update(.1);check(side>0?b.x<before:b.x>before,'Crawl inward');trace(120,side);}
 const slow=trace(30,-1),fast=trace(120,-1);check(Math.abs(slow.x-fast.x)<1e-6&&Math.abs(slow.y-fast.y)<1e-6&&slow.state===fast.state,'Frame-rate flight');
 let counter=0;const both=trace(120,-1,()=>counter++%2?.9:.1);check(both.dirs.length===2,'Swoop direction variation');
 // Spawn entry ignores the knight even when he stands at that edge.
 for(const side of [-1,1]){dungeon.x=side>0?dungeon.right:dungeon.left;const a=combat.spawnEnemy(side,{type:'bat'});dungeon.x=230;const b=combat.spawnEnemy(side,{type:'bat'});check(a.x===b.x&&a.y===b.y,'Player-dependent spawn');}
 combat.restart();combat.enemies=[];let b=combat.spawnEnemy(-1,{type:'bat'});
 // Put its own flight at its low point, directly into the existing sword path.
 b.x=dungeon.x+27;b.y=dungeon.floor-26;b.enter('FLUTTER',1);combat.enemies=[b];
 const before={coins:coins.length,queue:pendingCoinDrops.length,loot:loot.pending.length,pickups:combat.powerups.pickups.length};combat.powerups.random=()=>0;loot.random=()=>0;combat.update(STEP);
 check(b.hp===0&&b.defeated&&!combat.enemies.includes(b),'One sword hit kill');combat.defeatEnemy(b);
 check(coins.length===before.coins&&pendingCoinDrops.length===before.queue&&loot.pending.length===before.loot&&combat.powerups.pickups.length===before.pickups,'Bat death rewarded loot');
 // Airborne body collision uses armor and creates a bat-linked black coin.
 b=combat.spawnEnemy(-1,{type:'bat'});b.x=dungeon.x-5;b.y=dungeon.floor-28;b.enter('FLUTTER',1);combat.enemies=[b];combat.health.invulnerable=0;combat.runLoot.armor=1;score=2;combat.update(STEP);
 check(score===1&&combat.runLoot.armor===0&&combat.health.hearts===3,'Bat armor/penalty');const black=coins.find(c=>c.revenge?.type==='bat');check(black,'Bat revenge identity');combat.update(STEP);check(score===1,'Bat repeat hit');
 combat.enemies=[];black.falling=true;black.y=EDGE+1;black.z=-66;const point=runScore,balance=score,clock=JSON.stringify(combat.waves);simulate(STEP);
 b=combat.enemies[0];check(b instanceof Bat&&b.revenge&&b.hp===1&&b.state==='CEILING_CRAWL'&&b.y===b.ceiling,'Revenge bat entry');check(score===balance&&runScore===point&&JSON.stringify(combat.waves)===clock,'Revenge rewards/stage');
 b.x=dungeon.x-5;b.y=dungeon.floor-28;b.enter('FLUTTER',1);combat.health.invulnerable=0;combat.update(STEP);check(combat.health.hearts===2&&coins.some(c=>c.revenge?.type==='bat'),'Bat revenge chain/contact damage');
 setPaused(true);const snapshot=JSON.stringify(b);combat.update(100);frame(9999999);check(JSON.stringify(b)===snapshot,'Pause flight');setPaused(false);frame(99999999);check(JSON.stringify(b)===snapshot,'Resume catchup');
 combat.restart();check(!combat.enemies.some(e=>e.type==='bat'),'Stage 1 bat');combat.waves.advance();combat.health.invulnerable=100;combat.update(STEP);check(combat.enemies.filter(e=>e.type==='bat').length===1,'Stage 2 intro');
 for(let i=0;i<2400;i++)combat.update(STEP);check(combat.enemies.filter(e=>e.type==='bat').length<=1,'Repeated regular bat');
 combat.enemies=[];combat.update(STEP);check(!combat.enemies.some(e=>e.type==='bat'),'Intro bat repeated after death');
 // Mobile-size view shows the three wing poses and ceiling crawler.
 combat.enemies=[-1,1].map(side=>new Bat(side,bounds));const flutter=new Bat(-1,bounds);flutter.x=230;flutter.y=60;flutter.enter('FLUTTER',1);combat.enemies.push(flutter);dungeon.draw();draw();
 return {width:innerWidth,passed:true};
}));await p.screenshot({path:`/tmp/bat-${width}.png`});await p.close();}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
